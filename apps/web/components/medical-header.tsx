"use client"
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Stethoscope, Home, Users, AlertTriangle, BarChart3, LogOut, User, Menu, X, CalendarDays, Settings } from "lucide-react"

// Items de navegación según rol
const NAV_ITEMS_ALL = [
  { href: "/dashboard", label: "Inicio", icon: Home, roles: ["Administrador", "Médico", "Enfermero"] },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, roles: ["Administrador", "Médico", "Enfermero"] },
  { href: "/pacientes", label: "Pacientes", icon: Users, roles: ["Administrador", "Médico", "Enfermero"] },
  { href: "/alertas", label: "Alertas Clínicas", icon: AlertTriangle, roles: ["Administrador", "Médico", "Enfermero"] },
  { href: "/analitica", label: "Analítica", icon: BarChart3, roles: ["Administrador", "Médico"] },
  { href: "/configuracion", label: "Configuración", icon: Settings, roles: ["Administrador", "Médico"] },
]

const ROL_BADGE_STYLES: Record<string, string> = {
  Administrador: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800",
  Médico: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  Enfermero: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
}

export function MedicalHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const [userName, setUserName] = useState("Usuario")
  const [userRole, setUserRole] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    const storedRole = localStorage.getItem("userRole")
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        const displayName = user.nombre
          ? `${user.nombre} ${user.apellido_paterno || ''}`.trim()
          : user.username || "Usuario"
        setUserName(displayName)
      } catch (err) {
        console.error("Error parsing user:", err)
      }
    }
    if (storedRole) {
      setUserRole(storedRole)
    }
  }, [])

  const navItems = NAV_ITEMS_ALL.filter(item =>
    !userRole || item.roles.includes(userRole)
  )

  const handleLogout = async () => {
    localStorage.removeItem("authenticated")
    localStorage.removeItem("userRole")
    localStorage.removeItem("token")
    localStorage.removeItem("user")

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      })
    } catch (err) {
      console.error("Error en logout:", err)
    }

    router.push("/login")
  }

  return (
    <header className="bg-card border-b border-border shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo y nombre */}
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">Predia</span>
            </Link>

            {/* Navegación Desktop */}
            <nav className="hidden lg:flex space-x-1 ml-8">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Usuario, Rol Badge, Theme Toggle y Logout - Desktop */}
          <div className="hidden md:flex items-center space-x-3">
            <ThemeToggle />
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{userName}</span>
              </div>
              {userRole && (
                <Badge
                  variant="outline"
                  className={`text-xs font-medium ${ROL_BADGE_STYLES[userRole] || "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
                >
                  {userRole}
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Salir
            </Button>
          </div>

          {/* Botón Hamburguesa - Móvil */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Menú Móvil */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${isActive
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}

              {/* Usuario, Rol Badge, Theme Toggle y Logout en móvil */}
              <div className="pt-4 mt-4 border-t border-border">
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1.5 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{userName}</span>
                    </div>
                    {userRole && (
                      <Badge
                        variant="outline"
                        className={`text-xs font-medium ${ROL_BADGE_STYLES[userRole] || ""}`}
                      >
                        {userRole}
                      </Badge>
                    )}
                  </div>
                  <ThemeToggle />
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  )
}
