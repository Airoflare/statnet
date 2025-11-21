package docker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"backend/pkg/metrics"
)

const (
	dockerSocketPath = "/var/run/docker.sock"
	maxHistoryPoints = 60 // Keep last 60 data points for sparklines (1 minute at 1-second interval)
)

var (
	dockerClient *http.Client // Reusable Docker HTTP client

	// Historical data for containers
	containerCPUHistory       = make(map[string][]metrics.DataPoint)
	containerRAMHistory       = make(map[string][]metrics.MemoryDataPoint)
	containerNetworkRxHistory = make(map[string][]metrics.DataPoint)
	containerNetworkTxHistory = make(map[string][]metrics.DataPoint)

	// Previous total network bytes for rate calculation
	prevContainerRxBytes = make(map[string]uint64)
	prevContainerTxBytes = make(map[string]uint64)
	networkRateMutex     sync.Mutex // Mutex to protect prevContainerRxBytes and prevContainerTxBytes
)

func init() {
	// Initialize the reusable Docker HTTP client with timeouts and disabled keep-alives
	dockerClient = &http.Client{
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
				dialer := &net.Dialer{
					Timeout:   5 * time.Second,
					KeepAlive: 30 * time.Second,
				}
				dialCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
				defer cancel()
				return dialer.DialContext(dialCtx, "unix", dockerSocketPath)
			},
			TLSHandshakeTimeout:   5 * time.Second,
			ResponseHeaderTimeout: 5 * time.Second,
			ExpectContinueTimeout: 1 * time.Second,
			IdleConnTimeout:       90 * time.Second,
			MaxIdleConns:          100,
			MaxIdleConnsPerHost:   10,
			
		},
		Timeout: 10 * time.Second, // Overall request timeout
	}
}

// calculateNetworkRate calculates the network transfer rate in bytes per second
func calculateNetworkRate(containerID string, currentBytes uint64, isRx bool) float64 {
	networkRateMutex.Lock()
	defer networkRateMutex.Unlock()

	var prevBytes uint64
	if isRx {
		prevBytes = prevContainerRxBytes[containerID]
	} else {
		prevBytes = prevContainerTxBytes[containerID]
	}

	var rate float64
	if prevBytes > 0 && currentBytes >= prevBytes {
		rate = float64(currentBytes - prevBytes) // Assuming 1-second interval
	}

	if isRx {
		prevContainerRxBytes[containerID] = currentBytes
	} else {
		prevContainerTxBytes[containerID] = currentBytes
	}
	return rate
}

func GetDockerContainers() ([]metrics.DockerContainer, error) {
	resp, err := dockerClient.Get("http://unix/containers/json?all=true")
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker daemon: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("docker API returned status %d", resp.StatusCode)
	}

	var dockerContainersJSON []metrics.DockerContainerJSON
	if err := json.NewDecoder(resp.Body).Decode(&dockerContainersJSON); err != nil {
		return nil, fmt.Errorf("failed to decode Docker containers JSON: %w", err)
	}

	var (
		wg     sync.WaitGroup
		mu     sync.Mutex // Mutex for protecting history maps and result slice
		result []metrics.DockerContainer
	)

	timestamp := time.Now().UnixMilli()

	for _, dc := range dockerContainersJSON {
		wg.Add(1)
		go func(dc metrics.DockerContainerJSON) {
			defer wg.Done()

			// Get detailed container info for StartedAt and full status
			detailedContainer, err := getDetailedContainerInfo(context.Background(), dc.ID)
			if err != nil {
				log.Printf("Error getting detailed info for container %s: %v", dc.ID, err)
				mu.Lock()
				result = append(result, metrics.DockerContainer{
					ID:             dc.ID,
					Name:           getDisplayName(strings.TrimPrefix(dc.Names[0], "/")),
					Status:         dc.State,
					CPUUsage:       []metrics.DataPoint{{Value: 0, Timestamp: timestamp}},
					RAMUsage:       []metrics.MemoryDataPoint{{Value: 0, Timestamp: timestamp, TotalMemory: 0}},
					NetworkRxBytes: []metrics.DataPoint{{Value: 0, Timestamp: timestamp}},
					NetworkTxBytes: []metrics.DataPoint{{Value: 0, Timestamp: timestamp}},
					Uptime:         0,
					TotalRxBytes:   0,
					TotalTxBytes:   0,
					BlockRead:      0,
					BlockWrite:     0,
				})
				mu.Unlock()
				return
			}

			ctxStats, cancelStats := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancelStats()
			stats, err := getContainerStats(ctxStats, dc.ID)
			if err != nil {
				log.Printf("Error getting stats for container %s: %v", dc.ID, err)
				mu.Lock()
				result = append(result, metrics.DockerContainer{
					ID:             dc.ID,
					Name:           getDisplayName(strings.TrimPrefix(dc.Names[0], "/")),
					Status:         detailedContainer.State.Status,
					CPUUsage:       []metrics.DataPoint{{Value: 0, Timestamp: timestamp}},
					RAMUsage:       []metrics.MemoryDataPoint{{Value: 0, Timestamp: timestamp, TotalMemory: 0}},
					NetworkRxBytes: []metrics.DataPoint{{Value: 0, Timestamp: timestamp}},
					NetworkTxBytes: []metrics.DataPoint{{Value: 0, Timestamp: timestamp}},
					Uptime:         calculateContainerUptime(detailedContainer),
					TotalRxBytes:   0,
					TotalTxBytes:   0,
					BlockRead:      0,
					BlockWrite:     0,
				})
				mu.Unlock()
				return
			}

			cpuUsage := calculateCpuUsage(stats)
			ramUsage := calculateRamUsage(stats)
			
			// Calculate network rates
			currentTotalRxBytes, currentTotalTxBytes := calculateTotalNetworkUsage(stats)
			networkRxRate := calculateNetworkRate(dc.ID, currentTotalRxBytes, true)
			networkTxRate := calculateNetworkRate(dc.ID, currentTotalTxBytes, false)

			blockRead := calculateBlockIO(stats).readBytes
			blockWrite := calculateBlockIO(stats).writeBytes
			uptime := calculateContainerUptime(detailedContainer)
			finishedAt := calculateContainerFinishedAt(detailedContainer)

			mu.Lock()
			// Update historical CPU usage
			containerCPUHistory[dc.ID] = append(containerCPUHistory[dc.ID], metrics.DataPoint{Value: cpuUsage, Timestamp: timestamp})
			if len(containerCPUHistory[dc.ID]) > maxHistoryPoints {
				containerCPUHistory[dc.ID] = containerCPUHistory[dc.ID][1:]
			}

			// Update historical RAM usage
			containerRAMHistory[dc.ID] = append(containerRAMHistory[dc.ID], metrics.MemoryDataPoint{Value: ramUsage, Timestamp: timestamp, TotalMemory: float64(stats.MemoryStats.Limit) / (1024 * 1024)})
			if len(containerRAMHistory[dc.ID]) > maxHistoryPoints {
				containerRAMHistory[dc.ID] = containerRAMHistory[dc.ID][1:]
			}

			ramHistory := containerRAMHistory[dc.ID]
			if len(ramHistory) == 0 {
				ramHistory = []metrics.MemoryDataPoint{{Value: 0, Timestamp: timestamp, TotalMemory: 0}}
			}

			// Update historical Network Rx usage (now rate)
			containerNetworkRxHistory[dc.ID] = append(containerNetworkRxHistory[dc.ID], metrics.DataPoint{Value: networkRxRate, Timestamp: timestamp})
			if len(containerNetworkRxHistory[dc.ID]) > maxHistoryPoints {
				containerNetworkRxHistory[dc.ID] = containerNetworkRxHistory[dc.ID][1:]
			}

			// Update historical Network Tx usage (now rate)
			containerNetworkTxHistory[dc.ID] = append(containerNetworkTxHistory[dc.ID], metrics.DataPoint{Value: networkTxRate, Timestamp: timestamp})
			if len(containerNetworkTxHistory[dc.ID]) > maxHistoryPoints {
				containerNetworkTxHistory[dc.ID] = containerNetworkTxHistory[dc.ID][1:]
			}

			result = append(result, metrics.DockerContainer{
					ID:             dc.ID,
					Name:           getDisplayName(strings.TrimPrefix(dc.Names[0], "/")),
					Status:         detailedContainer.State.Status,
					CPUUsage:       containerCPUHistory[dc.ID],
					RAMUsage:       ramHistory,
					NetworkRxBytes: containerNetworkRxHistory[dc.ID],
					NetworkTxBytes: containerNetworkTxHistory[dc.ID],
					Uptime:         uptime,
					FinishedAt:     finishedAt,
					TotalRxBytes:   currentTotalRxBytes, // Still send total for detailed view
					TotalTxBytes:   currentTotalTxBytes, // Still send total for detailed view
					BlockRead:      blockRead,
					BlockWrite:     blockWrite,
				})
			mu.Unlock()
		}(dc)
	}

	wg.Wait()

	// Clean up historical data for containers that no longer exist
	mu.Lock()
	for id := range containerCPUHistory {
		found := false
		for _, dc := range dockerContainersJSON {
			if dc.ID == id {
				found = true
				break
			}
		}
		if !found {
			delete(containerCPUHistory, id)
			delete(containerRAMHistory, id)
			delete(containerNetworkRxHistory, id)
			delete(containerNetworkTxHistory, id)
			delete(prevContainerRxBytes, id) // Clean up previous bytes as well
			delete(prevContainerTxBytes, id) // Clean up previous bytes as well
		}
	}
	mu.Unlock()

	return result, nil
}

var containerNameMappings []struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

func init() {
	// Initialize the reusable Docker HTTP client with timeouts and disabled keep-alives
	dockerClient = &http.Client{
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
				dialer := &net.Dialer{
					Timeout:   5 * time.Second,
					KeepAlive: 30 * time.Second,
				}
				dialCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
				defer cancel()
				return dialer.DialContext(dialCtx, "unix", dockerSocketPath)
			},
			TLSHandshakeTimeout:   5 * time.Second,
			ResponseHeaderTimeout: 5 * time.Second,
			ExpectContinueTimeout: 1 * time.Second,
			IdleConnTimeout:       90 * time.Second,
			MaxIdleConns:          100,
			MaxIdleConnsPerHost:   10,
		},
		Timeout: 10 * time.Second, // Overall request timeout
	}

	// Load container name mappings from JSON file
	file, err := os.Open("container-names.json")
	if err != nil {
		log.Printf("Warning: Could not open container-names.json: %v.", err)
		return
	}
	defer file.Close()

	if err := json.NewDecoder(file).Decode(&containerNameMappings); err != nil {
		log.Printf("Warning: Could not decode container-names.json: %v.", err)
		return
	}
}

func getDisplayName(containerName string) string {
	for _, mapping := range containerNameMappings {
		if strings.Contains(containerName, mapping.Key) {
			return mapping.Value
		}
	}
	return containerName // Return original name if no mapping found
}

func getContainerStats(ctx context.Context, containerID string) (metrics.DockerStats, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", fmt.Sprintf("http://unix/containers/%s/stats?stream=false", containerID), nil)
	if err != nil {
		return metrics.DockerStats{}, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := dockerClient.Do(req)
	if err != nil {
		return metrics.DockerStats{}, fmt.Errorf("failed to get container stats: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return metrics.DockerStats{}, fmt.Errorf("docker stats API returned status %d", resp.StatusCode)
	}

	var stats metrics.DockerStats
	if err := json.NewDecoder(resp.Body).Decode(&stats); err != nil {
		return metrics.DockerStats{}, fmt.Errorf("failed to decode Docker stats JSON: %w", err)
	}
	return stats, nil
}

func calculateCpuUsage(stats metrics.DockerStats) float64 {
	cpuDelta := float64(stats.CPUStats.CPUUsage.TotalUsage - stats.PreCPUStats.CPUUsage.TotalUsage)
	systemDelta := float64(stats.CPUStats.SystemCPUUsage - stats.PreCPUStats.SystemCPUUsage)

	if systemDelta > 0 && cpuDelta > 0 {
		// Calculate CPU usage as a percentage of total host CPU capacity
		cpuPercent := (cpuDelta / systemDelta) * 100.0
		return math.Min(cpuPercent, 100.0) // Cap at 100%
	}
	return 0.0
}

func calculateRamUsage(stats metrics.DockerStats) float64 {
	return float64(stats.MemoryStats.Usage) / (1024 * 1024) // Convert bytes to MB
}

// calculateNetworkUsage is no longer needed as we calculate rate directly
// func calculateNetworkUsage(stats metrics.DockerStats) (float64, float64) {
// 	var rxBytes, txBytes uint64
// 	for _, net := range stats.Networks {
// 		rxBytes += net.RxBytes
// 		txBytes += net.TxBytes
// 	}
// 	return float64(rxBytes), float64(txBytes)
// }

func calculateTotalNetworkUsage(stats metrics.DockerStats) (uint64, uint64) {
	var totalRxBytes, totalTxBytes uint64
	for _, net := range stats.Networks {
		totalRxBytes += net.RxBytes
		totalTxBytes += net.TxBytes
	}
	return totalRxBytes, totalTxBytes
}

type BlockIO struct {
	readBytes  uint64
	writeBytes uint64
}

func calculateBlockIO(stats metrics.DockerStats) BlockIO {
	var readBytes, writeBytes uint64
	for _, entry := range stats.BlkioStats.IoServiceBytesRecursive {
		if entry.Op == "Read" {
			readBytes += entry.Value
		} else if entry.Op == "Write" {
			writeBytes += entry.Value
		}
	}
	return BlockIO{readBytes: readBytes, writeBytes: writeBytes}
}

func calculateContainerUptime(containerJSON metrics.DetailedContainerJSON) uint64 {
	if containerJSON.State.Status != "running" {
		return 0
	}

	startedAt, err := time.Parse(time.RFC3339Nano, containerJSON.State.StartedAt)
	if err != nil {
		log.Printf("Error parsing StartedAt timestamp for container %s: %v", containerJSON.ID, err)
		return 0
	}

	return uint64(time.Since(startedAt).Seconds())
}

func calculateContainerFinishedAt(containerJSON metrics.DetailedContainerJSON) int64 {
	if containerJSON.State.Status == "running" || containerJSON.State.FinishedAt == "0001-01-01T00:00:00Z" {
		return 0
	}

	finishedAt, err := time.Parse(time.RFC3339Nano, containerJSON.State.FinishedAt)
	if err != nil {
		log.Printf("Error parsing FinishedAt timestamp for container %s: %v", containerJSON.ID, err)
		return 0
	}

	return finishedAt.UnixMilli()
}

func getDetailedContainerInfo(ctx context.Context, containerID string) (metrics.DetailedContainerJSON, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", fmt.Sprintf("http://unix/containers/%s/json", containerID), nil)
	if err != nil {
		return metrics.DetailedContainerJSON{}, fmt.Errorf("failed to create request for detailed container info: %w", err)
	}

	resp, err := dockerClient.Do(req)
	if err != nil {
		return metrics.DetailedContainerJSON{}, fmt.Errorf("failed to get detailed container info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return metrics.DetailedContainerJSON{}, fmt.Errorf("docker detailed info API returned status %d", resp.StatusCode)
	}

	var detailedInfo metrics.DetailedContainerJSON
	if err := json.NewDecoder(resp.Body).Decode(&detailedInfo); err != nil {
		return metrics.DetailedContainerJSON{}, fmt.Errorf("failed to decode detailed container info JSON: %w", err)
	}
	return detailedInfo, nil
}