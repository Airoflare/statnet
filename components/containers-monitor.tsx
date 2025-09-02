"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Package, Cog, Layers, ChevronDown, ArrowDown, ArrowUp } from "lucide-react"
import { ResourceCard } from "@/components/ui/resource-display"
import { useWebSocket } from "@/components/websocket-provider"
import { Container, DataPoint } from "@/types"
import { formatMemorySize, formatNetworkSpeed } from "@/lib/formatters"
import { ContainerItem } from "@/components/container-item"
import ContainerCard from "@/components/container-card"

export default function ContainersMonitor() {
  const { combinedData } = useWebSocket()
  const [totalCpuData, setTotalCpuData] = useState<DataPoint[]>([])
  const [totalRamData, setTotalRamData] = useState<DataPoint[]>([])
  const [totalNetworkRxData, setTotalNetworkRxData] = useState<DataPoint[]>([])
  const [totalNetworkTxData, setTotalNetworkTxData] = useState<DataPoint[]>([])
  const [containers, setContainers] = useState<Container[]>([])
  
  const [totalMemory, setTotalMemory] = useState(0);

  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const maxPoints = 7;
    const now = Date.now();
    
    // Initialize with proper default values if empty
    if (totalCpuData.length === 0) {
      setTotalCpuData([
        { value: 0, timestamp: now - 1000 },
        { value: 0, timestamp: now }
      ]);
    }
    if (totalRamData.length === 0) {
      setTotalRamData([
        { value: 0, timestamp: now - 1000 },
        { value: 0, timestamp: now }
      ]);
    }
    if (totalNetworkRxData.length === 0) {
      setTotalNetworkRxData([
        { value: 0, timestamp: now - 1000 },
        { value: 0, timestamp: now }
      ]);
    }
    if (totalNetworkTxData.length === 0) {
      setTotalNetworkTxData([
        { value: 0, timestamp: now - 1000 },
        { value: 0, timestamp: now }
      ]);
    }

    if (!combinedData || !combinedData.containers) {
      // Set default values if no data (Safe fallback)
      setContainers([]);
      setTotalCpuData(prev => [...prev].slice(-maxPoints));
      setTotalRamData(prev => [...prev].slice(-maxPoints));
      setTotalNetworkRxData(prev => [...prev].slice(-maxPoints));
      setTotalNetworkTxData(prev => [...prev].slice(-maxPoints));
      return;
    }

    // Sort containers: running first (by RAM usage), then others by name
    const sortedContainers = [...combinedData.containers].sort((a, b) => {
      // Prioritize running containers
      const aIsRunning = a.status === "running";
      const bIsRunning = b.status === "running";

      if (aIsRunning && !bIsRunning) return -1; // a comes before b
      if (!aIsRunning && bIsRunning) return 1; // b comes before a

      // If both are running, sort by RAM usage (descending)
      if (aIsRunning && bIsRunning) {
        const aRam = a.ramUsage?.length > 0 ? a.ramUsage[a.ramUsage.length - 1]?.value || 0 : 0;
        const bRam = b.ramUsage?.length > 0 ? b.ramUsage[b.ramUsage.length - 1]?.value || 0 : 0;
        if (aRam !== bRam) {
          return bRam - aRam;
        }
      }

      // Sort by name as fallback
      return (a.name || '').localeCompare(b.name || '');
    });

    setContainers(sortedContainers);

    // Calculate totals
    const currentTotalCpu = combinedData.containers.reduce((sum, c) => 
      sum + ((c.cpuUsage && c.cpuUsage.length > 0) ? (c.cpuUsage[c.cpuUsage.length - 1]?.value || 0) : 0), 0);
    
    const currentTotalRam = combinedData.containers.reduce((sum, c) => 
      sum + ((c.ramUsage && c.ramUsage.length > 0) ? (c.ramUsage[c.ramUsage.length - 1]?.value || 0) : 0), 0);
    
    const currentTotalNetworkRx = combinedData.containers.reduce((sum, c) => 
      sum + ((c.networkRxBytes && c.networkRxBytes.length > 0) ? (c.networkRxBytes[c.networkRxBytes.length - 1]?.value || 0) : 0), 0);
    
    const currentTotalNetworkTx = combinedData.containers.reduce((sum, c) => 
      sum + ((c.networkTxBytes && c.networkTxBytes.length > 0) ? (c.networkTxBytes[c.networkTxBytes.length - 1]?.value || 0) : 0), 0);

    setTotalCpuData(prev => [...prev, { value: currentTotalCpu, timestamp: Date.now() }].slice(-maxPoints));
    setTotalRamData(prev => [...prev, { value: currentTotalRam, timestamp: Date.now() }].slice(-maxPoints));
    setTotalNetworkRxData(prev => [...prev, { value: currentTotalNetworkRx, timestamp: Date.now() }].slice(-maxPoints));
    setTotalNetworkTxData(prev => [...prev, { value: currentTotalNetworkTx, timestamp: Date.now() }].slice(-maxPoints));

    // Update total system memory for scaling
    if (combinedData.systemInfo?.resourceData?.memory?.[0]?.totalMemory) {
      setTotalMemory(combinedData.systemInfo.resourceData.memory[0].totalMemory);
    }
  }, [combinedData, totalCpuData.length, totalRamData.length, totalNetworkRxData.length, totalNetworkTxData.length]);

  // Safe data access
  const currentTotalCpu = totalCpuData[totalCpuData.length - 1]?.value ?? 0;
  const currentTotalRam = totalRamData[totalRamData.length - 1]?.value ?? 0;
  const currentTotalNetworkRx = totalNetworkRxData[totalNetworkRxData.length - 1]?.value ?? 0;
  const currentTotalNetworkTx = totalNetworkTxData[totalNetworkTxData.length - 1]?.value ?? 0;

  // Ensure data arrays are never null for ResourceCard components
  const safeNetworkRxData = totalNetworkRxData || [];
  const safeNetworkTxData = totalNetworkTxData || [];
  const safeCpuData = totalCpuData || [];
  const safeRamData = totalRamData || [];

  const formattedTotalRamValue = formatMemorySize(currentTotalRam);

  return (
    <motion.div
      className="flex flex-col items-center justify-start min-h-[calc(100vh-3.5rem)] p-4 space-y-4 pt-20"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {(combinedData?.containers?.length ?? 0) > 0 && (
        <Card className="w-full max-w-2xl bg-background/95 backdrop-blur-sm border border-border shadow-lg">
          <motion.div
            className="p-3 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
            whileHover={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package className={`w-4 h-4 text-muted-foreground`} />
                <span className="text-sm font-medium">Containers Overview</span>
                
              </div>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="text-muted-foreground"
              >
                <ChevronDown className="h-4 w-4"/>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <ResourceCard icon={Cog} label="Compute" value={currentTotalCpu} data={safeCpuData} color="#1e90ff" maxValue={100} />
              <ResourceCard
                icon={Layers}
                label="Memory"
                value={currentTotalRam}
                data={safeRamData}
                color="#00ced1"
                valueDisplay={formattedTotalRamValue}
                maxValue={totalMemory || 1}
              />
              <ResourceCard
                icon={ArrowDown}
                label="Inbound"
                value={currentTotalNetworkRx}
                data={safeNetworkRxData}
                color="#8b5cf6"
                unit="B/s"
                valueDisplay={formatNetworkSpeed(currentTotalNetworkRx)}
                maxValue={Math.max(...safeNetworkRxData.map(d => d?.value ?? 0), ...safeNetworkTxData.map(d => d?.value ?? 0), 1)}
              />
              <ResourceCard
                icon={ArrowUp}
                label="Outbound"
                value={currentTotalNetworkTx}
                data={safeNetworkTxData}
                color="#8b5cf6"
                unit="B/s"
                valueDisplay={formatNetworkSpeed(currentTotalNetworkTx)}
                maxValue={Math.max(...safeNetworkRxData.map(d => d?.value ?? 0), ...safeNetworkTxData.map(d => d?.value ?? 0), 1)}
              />
            </div>
          </motion.div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-3 border-t border-border">
                  <div className="mt-3 mb-2">
                    <span className="text-xs font-medium text-muted-foreground">All Containers</span>
                    <div className="mt-1 space-y-1">
                      {containers.map((container, index) => (
                        <ContainerItem container={container} index={index} key={container.id} />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}

      {/* Display individual container cards with safety checks */}
      {(combinedData?.containers || []).length > 0 ? (
        <motion.div
          className="flex flex-col items-center justify-start w-full space-y-4 pt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {(combinedData?.containers || [])
            .sort((a, b) => {
              const statusOrder = { "running": 0, "restarting": 1, "stopped": 2, "exited": 3 };
              const statusComparison = (statusOrder[a?.status] ?? 999) - (statusOrder[b?.status] ?? 999);
              if (statusComparison !== 0) {
                return statusComparison;
              }
              return ((a?.name || '') || '').localeCompare((b?.name || '') || '');
            })
            .map((container) => (
              <ContainerCard 
                key={container?.id || Math.random().toString()} 
                container={container} 
              />
            ))}
        </motion.div>
      ) : (
        <motion.div
          className="flex flex-col items-center justify-center w-full p-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Package className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Containers Found</h3>
          <p className="text-sm text-muted-foreground">
            There are currently no Docker containers to display.
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}