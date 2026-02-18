"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { MedicalHeader } from "@/components/medical-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    User, Settings, FileText, Moon, Sun, Shield, Info, ChevronRight, Stethoscope
} from "lucide-react"
import { useTheme } from "next-themes"

interface UserData {
    id_usuario?: number
    username?: string
    nombre?: string
    apellido_paterno?: string
    apellido_materno?: string
    email?: string
    rol?: string
}

export default function ConfiguracionPage() {
    const router = useRouter()
    const { theme, setTheme } = useTheme()
    const [user, setUser] = useState<UserData | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const token = localStorage.getItem("token")
        if (!token) {
            router.push("/login")
            return
        }

        const stored = localStorage.getItem("user")
        if (stored) {
            try {
                setUser(JSON.parse(stored))
            } catch (e) {
                console.error("Error parsing user:", e)
            }
        }
    }, [router])

    const displayName = user
        ? `${user.nombre || ""} ${user.apellido_paterno || ""} ${user.apellido_materno || ""}`.trim()
        : "Usuario"

    return (
        <div className="min-h-screen bg-background">
            <MedicalHeader />

            <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">Configuración</h1>
                    <p className="mt-2 text-muted-foreground">Preferencias del sistema y perfil médico</p>
                </div>

                <div className="space-y-6">
                    {/* Perfil Médico */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                <span>Perfil Médico</span>
                            </CardTitle>
                            <CardDescription>Información de tu cuenta</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-muted-foreground">Nombre completo</label>
                                    <p className="font-medium text-foreground">{displayName}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground">Usuario</label>
                                    <p className="font-medium text-foreground">{user?.username || "—"}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground">Email</label>
                                    <p className="font-medium text-foreground">{user?.email || "No registrado"}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground">Rol</label>
                                    <Badge variant="outline" className="mt-1">
                                        <Shield className="w-3 h-3 mr-1" />
                                        {user?.rol || "Médico"}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tema */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                <span>Preferencias</span>
                            </CardTitle>
                            <CardDescription>Personaliza la apariencia del sistema</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-foreground">Tema de la interfaz</p>
                                    <p className="text-sm text-muted-foreground">Alternar entre modo claro y oscuro</p>
                                </div>
                                {mounted && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                        className="flex items-center gap-2"
                                    >
                                        {theme === "dark" ? (
                                            <>
                                                <Sun className="w-4 h-4" />
                                                Modo Claro
                                            </>
                                        ) : (
                                            <>
                                                <Moon className="w-4 h-4" />
                                                Modo Oscuro
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Plantillas */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                                <span>Plantillas Clínicas</span>
                            </CardTitle>
                            <CardDescription>Gestiona plantillas para consultas y notas</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/configuracion/plantillas">
                                <Button variant="outline" className="w-full sm:w-auto flex items-center gap-2">
                                    Gestionar Plantillas
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Acerca del Sistema */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Info className="w-5 h-5 text-muted-foreground" />
                                <span>Acerca del Sistema</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Sistema</span>
                                    <div className="flex items-center gap-2">
                                        <Stethoscope className="w-4 h-4 text-blue-600" />
                                        <span className="font-medium text-foreground">PREDIA</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Versión</span>
                                    <span className="font-medium text-foreground">1.0.0</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Tipo</span>
                                    <span className="font-medium text-foreground">Plataforma Clínica Integral</span>
                                </div>
                                <p className="text-xs text-muted-foreground border-t pt-3 mt-3">
                                    PREDIA es un sistema de gestión de historiales clínicos con módulos de inteligencia artificial como herramientas de apoyo a la decisión médica. La IA no sustituye el criterio clínico profesional.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
