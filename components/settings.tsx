"use client"

import { useState, useEffect } from "react"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Settings as SettingsIcon } from "lucide-react"

export default function Settings() {
  const [sortOption, setSortOption] = useState("name-asc")
  const [showCoolifyOnContainers, setShowCoolifyOnContainers] = useState(true)

  useEffect(() => {
    const defaultSort = "resource"
    const defaultShow = false
    const savedSort = localStorage.getItem("containerSort") || defaultSort
    setSortOption(savedSort)
    localStorage.setItem("containerSort", savedSort)

    const savedShowStr = localStorage.getItem("showCoolifyOnContainers")
    const savedShow = savedShowStr === null ? defaultShow : savedShowStr === "true"
    setShowCoolifyOnContainers(savedShow)
    localStorage.setItem("showCoolifyOnContainers", savedShow.toString())
  }, [])

  const handleSortChange = (value: string) => {
    setSortOption(value)
    localStorage.setItem("containerSort", value)
  }

  const handleToggleChange = (checked: boolean) => {
    setShowCoolifyOnContainers(checked)
    localStorage.setItem("showCoolifyOnContainers", checked.toString())
  }

  const sortOptions = [
    { value: "name-asc", label: "Name A-Z" },
    { value: "name-desc", label: "Name Z-A" },
    { value: "resource", label: "Resource usage" },
    { value: "container-names-order", label: "Container names.json file content order" }
  ]

  return (
    <motion.div
      className="flex flex-col items-center justify-start min-h-[calc(100vh-3.5rem)] p-4 space-y-4 pt-20"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <Card className="w-full max-w-2xl bg-background/95 backdrop-blur-sm border border-border shadow-lg p-6">
        <div className="flex items-center gap-2 mb-3">
          <SettingsIcon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Settings</span>
        </div>

        <div className="space-y-8">
          <div className="space-y-2">
            <Label htmlFor="sort-select">Container Sorting</Label>
            <p className="text-sm text-muted-foreground">
              Choose how containers are sorted on the Containers and Coolify pages.
            </p>
            <Select value={sortOption} onValueChange={handleSortChange}>
              <SelectTrigger id="sort-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coolify-toggle">Show Coolify Containers on Containers Page</Label>
            <p className="text-sm text-muted-foreground">
              Toggle whether Coolify containers are displayed on the main Containers page.
            </p>
            <Switch
              id="coolify-toggle"
              checked={showCoolifyOnContainers}
              onCheckedChange={handleToggleChange}
            />
          </div>
        </div>
      </Card>
    </motion.div>
  )
}