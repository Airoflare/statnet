package metrics

// DataPoint represents a single data point for a resource
type DataPoint struct {
	Value     float64 `json:"value"`
	Timestamp int64   `json:"timestamp"`
	IsSpike   bool    `json:"isSpike,omitempty"`
	Total     float64 `json:"total,omitempty"` // New field for total capacity
}

// Custom DataPoint for Memory to include TotalMemory
type MemoryDataPoint struct {
	Value       float64 `json:"value"`
	Timestamp   int64   `json:"timestamp"`
	IsSpike     bool    `json:"isSpike,omitempty"`
	TotalMemory float64 `json:"totalMemory"`
}

// ResourceData holds various system resource metrics
type ResourceData struct {
	CPU        []DataPoint       `json:"cpu"`
	Network    []DataPoint       `json:"network"`
	Memory     []MemoryDataPoint `json:"memory"` // Use custom type here
	Disk       []DataPoint       `json:"disk"`
	CPUPerCore []DataPoint       `json:"cpuPerCore,omitempty"` // Per-core CPU usage
}

// SystemInfoResponse combines resource data
type SystemInfoResponse struct {
	ResourceData       ResourceData           `json:"resourceData"`
	CoolifyDiskUsage   DataPoint              `json:"coolifyDiskUsage"`
	Uptime             uint64                 `json:"uptime"`
	CPUCores           int32                  `json:"cpuCores"`
	TotalRAM           float64                `json:"totalRAM"`
	TotalDisk          float64                `json:"totalDisk"`
	RunningContainers  int                    `json:"runningContainers"`
	CPUInfo            map[string]interface{} `json:"cpuInfo"`
	MemoryInfo         map[string]interface{} `json:"memoryInfo"`
	DiskInfo           map[string]interface{} `json:"diskInfo"`
	NetworkInfo        map[string]interface{} `json:"networkInfo"`
	BytesRecvPerSecond float64                `json:"bytesRecvPerSecond"`
	BytesSentPerSecond float64                `json:"bytesSentPerSecond"`
	CPUPerCore         []float64              `json:"cpuPerCore,omitempty"`
}

// DockerContainer represents a simplified Docker container
type DockerContainer struct {
	ID             string            `json:"id,omitempty"` // Add ID for mapping historical data
	Name           string            `json:"name"`
	RawName        string            `json:"rawName"`
	Status         string            `json:"status"`
	CPUUsage       []DataPoint       `json:"cpuUsage"`
	RAMUsage       []MemoryDataPoint `json:"ramUsage"` // Use MemoryDataPoint for RAM to include total memory if needed
	NetworkRxBytes []DataPoint       `json:"networkRxBytes"`
	NetworkTxBytes []DataPoint       `json:"networkTxBytes"`
	Uptime         uint64            `json:"uptime"` // Uptime in seconds
	FinishedAt     int64             `json:"finishedAt,omitempty"`
	TotalRxBytes   uint64            `json:"totalRxBytes"`
	TotalTxBytes   uint64            `json:"totalTxBytes"`
	BlockRead      uint64            `json:"blockRead"`
	BlockWrite     uint64            `json:"blockWrite"`
}

type ContainerNameMapping struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// DockerStats represents relevant parts of Docker container stats
type DockerStats struct {
	CPUStats struct {
		CPUUsage struct {
			TotalUsage  uint64   `json:"total_usage"`
			PercpuUsage []uint64 `json:"percpu_usage"`
		} `json:"cpu_usage"`
		SystemCPUUsage uint64 `json:"system_cpu_usage"`
	} `json:"cpu_stats"`
	PreCPUStats struct {
		CPUUsage struct {
			TotalUsage uint64 `json:"total_usage"`
		} `json:"cpu_usage"`
		SystemCPUUsage uint64 `json:"system_cpu_usage"`
	} `json:"precpu_stats"`
	MemoryStats struct {
		Usage uint64 `json:"usage"`
		Limit uint64 `json:"limit"`
	} `json:"memory_stats"`
	BlkioStats struct {
		IoServiceBytesRecursive []struct {
			Major uint64 `json:"major"`
			Minor uint64 `json:"minor"`
			Op    string `json:"op"`
			Value uint64 `json:"value"`
		} `json:"io_service_bytes_recursive"`
	} `json:"blkio_stats"`
	Networks map[string]struct {
		RxBytes uint64 `json:"rx_bytes"`
		TxBytes uint64 `json:"tx_bytes"`
	} `json:"networks"`
}

// DockerContainerJSON represents relevant parts of Docker container JSON
type DockerContainerJSON struct {
	ID    string   `json:"Id"`
	Names []string `json:"Names"`
	State string   `json:"State"`
}

// DetailedContainerJSON represents the full JSON response for a single container
type DetailedContainerJSON struct {
	ID    string `json:"Id"`
	Name  string `json:"Name"`
	State struct {
		Status     string `json:"Status"`
		Running    bool   `json:"Running"`
		Paused     bool   `json:"Paused"`
		Restarting bool   `json:"Restarting"`
		OOMKilled  bool   `json:"OOMKilled"`
		Dead       bool   `json:"Dead"`
		Pid        int    `json:"Pid"`
		ExitCode   int    `json:"ExitCode"`
		Error      string `json:"Error"`
		StartedAt  string `json:"StartedAt"`
		FinishedAt string `json:"FinishedAt"`
	} `json:"State"`
	Created string `json:"Created"`
}

// CombinedData combines system and container data for WebSocket communication
type CombinedData struct {
	SystemInfo     SystemInfoResponse     `json:"systemInfo"`
	Containers     []DockerContainer      `json:"containers"`
	ContainerNames []ContainerNameMapping `json:"containerNames"`
}
