"use client"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Stethoscope, Home, UserPlus, Users, History, HelpCircle, LogOut, User } from "lucide-react"

export function MedicalHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const [userName, setUserName] = useState("Usuario")

  useEffect(() => {
    // Leer usuario de localStorage
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

    // Llamar al endpoint de logout para limpiar la cookie
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
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">PREDIA</span>
            </Link>

            <nav className="hidden md:flex space-x-6">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>{userName}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900 bg-transparent"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Salir
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
