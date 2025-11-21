package monitor

import (
	"encoding/json"
	"log"
	"os"
	"sync"
	"time"

	"backend/pkg/docker"
	"backend/pkg/metrics"
	"backend/pkg/system"
)

const (
	collectionInterval = 1 * time.Second // How often to collect metrics
)

// Monitor holds the latest system and container data and protects it with a mutex
type Monitor struct {
	mu             sync.RWMutex
	combinedData   metrics.CombinedData
	containerNames []metrics.ContainerNameMapping
}

// NewMonitor creates and initializes a new Monitor instance
func NewMonitor() *Monitor {
	monitor := &Monitor{}

	// Read container names from mounted file
	if data, err := os.ReadFile("/app/container-names.json"); err == nil {
		if err := json.Unmarshal(data, &monitor.containerNames); err != nil {
			log.Printf("Error parsing container-names.json: %v", err)
		}
	} else {
		log.Printf("Error reading container-names.json: %v", err)
	}

	return monitor
}

// StartCollection begins the periodic data collection
func (m *Monitor) StartCollection() {
	ticker := time.NewTicker(collectionInterval)
	defer ticker.Stop()

	for range ticker.C {
		containers, err := docker.GetDockerContainers()
		if err != nil {
			log.Printf("Error getting Docker containers: %v", err)
			// Continue with system info even if container data fails
			containers = []metrics.DockerContainer{} // Set to empty slice instead of nil
		}

		runningContainers := 0
		for _, c := range containers {
			if c.Status == "running" {
				runningContainers++
			}
		}

		systemInfo, err := system.GetSystemInfo(runningContainers)
		if err != nil {
			log.Printf("Error getting system info: %v", err)
			// Continue even if system info fails
		}

		// Update the combined data in a thread-safe manner
		m.mu.Lock()
		m.combinedData = metrics.CombinedData{
			SystemInfo:     systemInfo,
			Containers:     containers,
			ContainerNames: m.containerNames,
		}
		m.mu.Unlock()
	}
}

// GetCombinedData returns the latest combined data in a thread-safe manner
func (m *Monitor) GetCombinedData() metrics.CombinedData {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.combinedData
}
