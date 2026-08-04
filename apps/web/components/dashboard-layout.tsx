"use client"
import { useState } from "react"
import { Sidebar } from "./sidebar"
import { Menu } from "lucide-react"
import { NewConsultationModal } from "@/components/new-consultation-modal"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen} 
      />
      
      <main className={`flex-1 flex flex-col h-full min-w-0 overflow-y-auto transition-all duration-300 ease-in-out ${collapsed ? "lg:pl-[80px]" : "lg:pl-64"}`}>
        {/* Mobile Header (Hidden on Desktop) */}
        <header className="lg:hidden flex items-center justify-between h-16 px-4 border-b border-border bg-card shrink-0 print:hidden">
          <div className="flex items-center space-x-3">
             <div className="w-8 h-8 shrink-0 bg-primary rounded-md flex items-center justify-center">
                <div className="w-4 h-4 text-white" />
             </div>
             <span className="font-bold text-foreground">Predia</span>
          </div>
          <button 
            onClick={() => setMobileOpen(true)}
            className="p-2 -mr-2 rounded-md text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Content Wrapper */}
        <div className="flex-1 w-full mx-auto max-w-7xl animate-in fade-in duration-500">
          {children}
        </div>
      </main>
      <NewConsultationModal />
    </div>
  )
}
