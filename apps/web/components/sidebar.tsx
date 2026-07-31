"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import {
  Stethoscope, Home, Users, AlertTriangle, BarChart3,
  LogOut, User, CalendarDays, Settings, ChevronLeft, ChevronRight, Moon, Sun
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const NAV_ITEMS_ALL = [
  { href: "/dashboard", label: "Inicio", icon: Home, roles: ["Administrador", "Médico", "Enfermero"] },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, roles: ["Administrador", "Médico", "Enfermero"] },
  { href: "/pacientes", label: "Pacientes", icon: Users, roles: ["Administrador", "Médico", "Enfermero"] },
  { href: "/alertas", label: "Alertas Clínicas", icon: AlertTriangle, roles: ["Administrador", "Médico", "Enfermero"] },
  { href: "/analitica", label: "Analítica", icon: BarChart3, roles: ["Administrador", "Médico"] },
  { href: "/configuracion", label: "Configuración", icon: Settings, roles: ["Administrador", "Médico"] },
]

export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: any) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [userName, setUserName] = useState("Usuario")
  const [userRole, setUserRole] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const storedUser = localStorage.getItem("user")
    const storedRole = localStorage.getItem("userRole")
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        setUserName(user.nombre ? `${user.nombre} ${user.apellido_paterno || ''}`.trim() : user.username || "Usuario")
        const parsedRole = user.rol || user.rol_nombre
        if (parsedRole && !storedRole) {
          setUserRole(parsedRole)
          localStorage.setItem("userRole", parsedRole)
        }
      } catch (err) {}
    }
    if (storedRole) setUserRole(storedRole)
  }, [])

  const handleLogout = async () => {
    localStorage.clear()
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {})
    router.push("/login")
  }

  const navItems = NAV_ITEMS_ALL.filter(item => !userRole || item.roles.includes(userRole))

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return (
    <>
      <div 
        className={`fixed inset-0 z-40 bg-black/80 lg:hidden transition-opacity ${mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMobileOpen(false)}
      />
      
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border transition-all duration-300 ease-in-out lg:translate-x-0 ${mobileOpen ? "translate-x-0 w-64" : "-translate-x-full lg:w-fit"} ${collapsed ? "lg:w-[80px]" : "lg:w-64"} print:hidden`}>
        {/* Header Logo */}
        <div className={`flex items-center justify-between h-16 shrink-0 border-b border-border px-4 ${collapsed ? "lg:justify-center lg:px-0" : ""}`}>
          <Link href="/dashboard" className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 shrink-0 bg-primary rounded-md flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            {(!collapsed || mobileOpen) && <span className="text-xl font-bold tracking-tight text-foreground whitespace-nowrap">Predia</span>}
          </Link>
          <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors">
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-hide">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 group ${isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <item.icon className={`w-5 h-5 shrink-0 ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                {(!collapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Footer (User & Actions) */}
        <div className="p-3 border-t border-border mt-auto">
          {(!collapsed || mobileOpen) ? (
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-3 px-2 py-1">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-semibold truncate">{userName}</span>
                  <span className="text-xs text-muted-foreground truncate">{userRole || "Cargando..."}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 mt-2">
                {mounted && (
                  <Button variant="outline" size="icon" onClick={toggleTheme} className="w-10 shrink-0 text-muted-foreground hover:text-foreground">
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </Button>
                )}
                <Button variant="ghost" className="flex-1 justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Salir
                </Button>
              </div>
            </div>
          ) : (
             <div className="flex flex-col items-center space-y-4 py-2">
                <Button variant="ghost" size="icon" onClick={handleLogout} className="text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30">
                  <LogOut className="w-5 h-5" />
                </Button>
                {mounted && (
                  <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted">
                    {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </Button>
                )}
             </div>
          )}
        </div>
      </aside>
    </>
  )
}
