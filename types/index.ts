export interface DataPoint {
  value: number;
  timestamp: number;
  isSpike?: boolean;
  total?: number;
}

export interface MemoryDataPoint extends DataPoint {
  totalMemory: number;
}

export interface Container {
  id: string;
  name: string;
  rawName: string;
  cpuUsage: DataPoint[];
  ramUsage: MemoryDataPoint[];
  networkRxBytes: DataPoint[];
  networkTxBytes: DataPoint[];
  status: "running" | "stopped" | "restarting" | "exited";
  uptime: number;
  finishedAt?: number;
  totalRxBytes: number;
  totalTxBytes: number;
  blockRead: number;
  blockWrite: number;
}

export interface ResourceData {
  cpu: DataPoint[];
  network: DataPoint[];
  memory: MemoryDataPoint[];
  disk: DataPoint[];
  cpuPerCore?: DataPoint[];
}

export interface SystemInfoResponse {
  resourceData: ResourceData;
  coolifyDiskUsage: DataPoint;
  uptime: number;
  cpuCores: number;
  totalRAM: number;
  totalDisk: number;
  runningContainers: number;
  cpuInfo: {
    modelName: string;
    cores: number;
    threads: number;
    mhz: number;
    cacheSize: number;
    cpuTimes: {
      user: number;
      system: number;
      idle: number;
      nice: number;
      iowait: number;
      irq: number;
      softirq: number;
      steal: number;
      guest: number;
      guestNice: number;
    };
    cpuPercentages: {
      user: number;
      system: number;
      idle: number;
    };
  };
  memoryInfo: {
    total: number;
    available: number;
    used: number;
    free: number;
    usedPercent: number;
    buffers: number;
    cached: number;
    swapTotal: number;
    swapUsed: number;
    swapFree: number;
    swapUsedPercent: number;
  };
  diskInfo: {
    path: string;
    total: number;
    free: number;
    used: number;
    usedPercent: number;
  };
  networkInfo: {
    totalBytesSent: number;
    totalBytesRecv: number;
  };
  bytesRecvPerSecond: number;
  bytesSentPerSecond: number;
  cpuPerCore?: number[];
}

export interface ContainerNameMapping {
  key: string;
  value: string;
}

export interface CombinedData {
  systemInfo: SystemInfoResponse;
  containers: Container[];
  containerNames: ContainerNameMapping[];
}
