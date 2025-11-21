"use client"

import { useSearchParams } from "next/navigation"
import MainNav from "@/components/main-nav"
import SystemOverview from "@/components/system-overview"
import ContainersMonitor from "@/components/containers-monitor"
import CoolifyMonitor from "@/components/coolify-monitor"
import Settings from "@/components/settings"
import CpuInfoCard from "@/components/cpu-info-card"
import MemoryInfoCard from "@/components/memory-info-card"
import NetworkInfoCard from "@/components/network-info-card"
import DiskInfoCard from "@/components/disk-info-card"

import { useWebSocket } from "@/components/websocket-provider"
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"

export default function Page() {
  const searchParams = useSearchParams()
  const currentPage = searchParams.get("page") || "system"
  const { combinedData } = useWebSocket()

  const renderContent = () => {
    switch (currentPage) {
      case "system":
        return (
          <>
            <SystemOverview />
            <CpuInfoCard />
            <MemoryInfoCard />
            <NetworkInfoCard />
            <DiskInfoCard />
          </>
        )
      case "containers":
        return <ContainersMonitor />
      case "coolify":
        return <CoolifyMonitor />
      case "settings":
        return <Settings />

      default:
        return <SystemOverview />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      {renderContent()}
    </div>
  )
}
