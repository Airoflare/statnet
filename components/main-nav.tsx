"use client"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Fan, Package, Sparkles, Sun, Moon, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

import { useState } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Menu, X } from "lucide-react"

export default function MainNav() {
  const [isOpen, setIsOpen] = useState(false)
  const isMobile = useIsMobile()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const currentPage = searchParams.get("page") || "system"

  const navItems = [
    { name: "System", icon: Fan, param: "system" },
    { name: "Containers", icon: Package, param: "containers" },
    { name: "Coolify", icon: Sparkles, param: "coolify" },
  ]

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  if (isMobile) {
    return (
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between px-4 md:px-6">
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
            <div className="flex items-center space-x-2">
           <Button variant="ghost" size="icon" onClick={toggleTheme}>
             <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
             <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
             <span className="sr-only">Toggle theme</span>
           </Button>
           <Button variant="ghost" size="icon" onClick={() => router.push('/?page=settings')}>
             <Settings className="h-[1.2rem] w-[1.2rem]" />
             <span className="sr-only">Settings</span>
           </Button>
               </div>
        </div>
        {isOpen && (
          <div className="container px-4 pb-4 md:px-6">
             <div className="flex flex-col space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.param}
                    href={`/?page=${item.param}`}
                    scroll={false}
                    className={cn(
                      "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
                      currentPage === item.param ? "bg-muted" : ""
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                ))}
              </div>
          </div>
        )}
      </nav>
    )
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="container flex h-14 items-center justify-between px-4 md:px-6">

        {/* Center: Nav items + theme toggle */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center space-x-2">
          <div className="flex h-10 items-center space-x-4 rounded-full bg-muted p-1 text-muted-foreground">
            {navItems.map((item) => (
              <Link
                key={item.param}
                href={`/?page=${item.param}`}
                scroll={false}
                className={cn(
                  "relative flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors hover:bg-background hover:text-foreground",
                  currentPage === item.param ? "text-foreground bg-white dark:bg-black" : "",
                )}
              >
                <item.icon className="w-4 h-4 mr-2" />
                {item.name}
              </Link>
            ))}
          </div>
          <Button variant="ghost" size="icon" onClick={() => router.push('/?page=settings')}>
            <Settings className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">Settings</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </nav>
  )
}
