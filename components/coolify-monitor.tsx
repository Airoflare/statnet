"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Sparkles, Cog, ArrowDownUp, Layers, Database, ChevronDown } from "lucide-react"
import { ResourceCard } from "@/components/ui/resource-display"
import { useWebSocket } from "@/components/websocket-provider"
import { Container, ResourceData } from "@/types"
import { formatDiskSize, formatMemorySize, formatNetworkSpeed } from "@/lib/formatters"
import { ContainerItem } from "./container-item"
import ContainerCard from "./container-card"
import { Separator } from "@/components/ui/separator"

export default function CoolifyMonitor() {
  const { combinedData } = useWebSocket();
  const [resourceData, setResourceData] = useState<ResourceData>({
    cpu: [{ value: 0, timestamp: Date.now() - 1000 }, { value: 0, timestamp: Date.now() }],
    network: [{ value: 0, timestamp: Date.now() - 1000 }, { value: 0, timestamp: Date.now() }],
    memory: [{ value: 0, timestamp: Date.now() - 1000, totalMemory: 0 }, { value: 0, timestamp: Date.now(), totalMemory: 0 }],
    disk: [{ value: 0, timestamp: Date.now() - 1000 }, { value: 0, timestamp: Date.now() }],
  })

  const [coolifyContainers, setCoolifyContainers] = useState<Container[]>([])
  const [totalMemory, setTotalMemory] = useState(0);

  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (!combinedData || !combinedData.containers || !combinedData.systemInfo || !combinedData.systemInfo.resourceData) {
      return;
    }

    const maxPoints = 7; // Keep last 8 data points for the graph

    // Filter Coolify containers
    const filteredContainers = combinedData.containers.filter((container: Container) =>
      (container.name || '').toLowerCase().includes("coolify")
    );

    // Sort filtered containers by status, then by name, then by ID
    const sortedCoolifyContainers = [...filteredContainers].sort((a, b) => {
      const statusOrder = { running: 0, restarting: 1, stopped: 2, exited: 3 };
      const statusComparison = statusOrder[a.status] - statusOrder[b.status];
      if (statusComparison !== 0) {
        return statusComparison;
      }
      const nameComparison = a.name.localeCompare(b.name);
      if (nameComparison !== 0) {
        return nameComparison;
      }
      return a.id.localeCompare(b.id);
    });
    

    setCoolifyContainers(sortedCoolifyContainers);

    // Calculate combined CPU, RAM, and Network for Coolify containers
    const currentCoolifyCpu = filteredContainers.reduce((sum, c) => sum + (c.cpuUsage[c.cpuUsage.length - 1]?.value || 0), 0);
    const currentCoolifyRam = filteredContainers.reduce((sum, c) => sum + (c.ramUsage[c.ramUsage.length - 1]?.value || 0), 0);
    const currentCoolifyNetworkRx = filteredContainers.reduce((sum, c) => sum + (c.networkRxBytes[c.networkRxBytes.length - 1]?.value || 0), 0);
    const currentCoolifyNetworkTx = filteredContainers.reduce((sum, c) => sum + (c.networkTxBytes[c.networkTxBytes.length - 1]?.value || 0), 0);
    const currentCoolifyNetwork = currentCoolifyNetworkRx + currentCoolifyNetworkTx;

    if (combinedData.systemInfo.resourceData.memory && combinedData.systemInfo.resourceData.memory.length > 0) {
      setTotalMemory(combinedData.systemInfo.resourceData.memory[0].totalMemory);
    }

    // Update resource data with Coolify-specific metrics
    setResourceData(prev => ({
      cpu: [...prev.cpu, { value: currentCoolifyCpu, timestamp: Date.now() }].slice(-maxPoints),
      network: [...prev.network, { value: currentCoolifyNetwork, timestamp: Date.now() }].slice(-maxPoints), // Updated line
      memory: [...prev.memory, { value: currentCoolifyRam, timestamp: Date.now(), totalMemory: combinedData.systemInfo.resourceData.memory[0].totalMemory }].slice(-maxPoints),
      disk: [...prev.disk, { ...combinedData.systemInfo.coolifyDiskUsage }].slice(-maxPoints), // Use coolifyDiskUsage
    }));
  }, [combinedData]);

  const currentCpu = resourceData.cpu[resourceData.cpu.length - 1]?.value || 0
  const currentNetwork = resourceData.network[resourceData.network.length - 1]?.value || 0
  const currentMemory = resourceData.memory[resourceData.memory.length - 1]?.value || 0
  const currentDisk = resourceData.disk[resourceData.disk.length - 1]?.value || 0

  const maxNetworkValue = Math.max(...resourceData.network.map(d => d.value), 1) * 1.2;

  // Determine the max value for the disk graph based on total server disk
  const diskGraphMaxValue = combinedData?.systemInfo.resourceData.disk[0]?.total || 10000; // Default to 10GB if total is not available

  return (
    <motion.div
      className="flex flex-col items-center justify-start min-h-[calc(100vh-3.5rem)] p-4 space-y-4 pt-20"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {coolifyContainers.length > 0 ? (
        <>
          <Card className="w-full max-w-2xl bg-background/95 backdrop-blur-sm border border-border shadow-lg">
            <motion.div
              className="p-3 cursor-pointer"
              onClick={() => setIsExpanded(!isExpanded)}
              whileHover={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-4 h-4 text-muted-foreground`} />
                  <span className="text-sm font-medium">Coolify Overview</span>
                  
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
                <ResourceCard icon={Cog} label="Compute" value={currentCpu} data={resourceData.cpu} color="#1e90ff" maxValue={100} />
                <ResourceCard
                  icon={ArrowDownUp}
                  label="Network"
                  value={currentNetwork}
                  data={resourceData.network}
                  color="#8b5cf6"
                  unit=""
                  valueDisplay={formatNetworkSpeed(currentNetwork)}
                  maxValue={Math.max(...resourceData.network.map(d => d.value), 1) * 1.5}
                />
                <ResourceCard
                  icon={Layers}
                  label="Memory"
                  value={currentMemory}
                  data={resourceData.memory.map(d => ({ value: d.value, timestamp: d.timestamp }))}
                  color="#00ced1"
                  unit=""
                  valueDisplay={formatMemorySize(currentMemory)}
                  maxValue={totalMemory}
                />
                <ResourceCard
                  icon={Database}
                  label="Disk"
                  value={currentDisk}
                  data={resourceData.disk}
                  color="#f59e0b"
                  unit=""
                  valueDisplay={formatDiskSize(currentDisk)}
                  maxValue={diskGraphMaxValue}
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
                    <div className="space-y-1 mt-4">
                      <span className="text-xs font-medium text-muted-foreground">Coolify Containers</span>
                      <div className="mt-1 space-y-1">
                        {coolifyContainers.map((container, index) => (
                          <ContainerItem container={container} index={index} key={container.id} />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Display individual coolify container cards */}
          <motion.div
            className="flex flex-col items-center justify-start w-full space-y-4 pt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {coolifyContainers.map((container) => (
              <ContainerCard key={container.id} container={container} />
            ))}
          </motion.div>
        </>
      ) : (
        <motion.div
          className="flex flex-col items-center justify-center w-full p-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Coolify Containers Found</h3>
          <p className="text-sm text-muted-foreground">
            There are currently no Coolify containers to display.
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}