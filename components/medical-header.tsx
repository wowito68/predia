"use client"
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Stethoscope, Home, UserPlus, Users, History, HelpCircle, LogOut, User, Menu, X } from "lucide-react"

export function MedicalHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const [userName, setUserName] = useState("Usuario")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
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
  }, [])

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

  const navItems = [
    { href: "/dashboard", label: "Inicio", icon: Home },
    { href: "/nuevo-paciente", label: "Nuevo Paciente", icon: UserPlus },
    { href: "/pacientes", label: "Pacientes", icon: Users },
    { href: "/historial", label: "Historial", icon: History },
    { href: "/ayuda", label: "Ayuda", icon: HelpCircle },
  ]

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo y nombre */}
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">PREDIA</span>
            </Link>

            {/* Navegación Desktop */}
            <nav className="hidden md:flex space-x-4 ml-8">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive 
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300" 
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Usuario, Theme Toggle y Logout - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle />
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
              <User className="w-4 h-4" />
              <span>{userName}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Salir
            </Button>
          </div>

          {/* Botón Hamburguesa - Móvil */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
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
          <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700">
            <nav className="flex flex-col space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                      isActive 
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300" 
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
              
              {/* Usuario, Theme Toggle y Logout en móvil */}
              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <User className="w-4 h-4" />
                    <span>{userName}</span>
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
      className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
