"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MedicalHeader } from "@/components/medical-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, TrendingUp, AlertTriangle, Activity, Calendar, Loader2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalPacientes: number;
  prediccionesHoy: number;
  riesgoAlto: number;
  precision: number;
  alertas: Array<{
    id: number;
    paciente: string;
    cedula: string;
    nivel_riesgo: string;
    probabilidad: number;
    fecha: string;
    tiempo_relativo: string;
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const authenticated = localStorage.getItem("authenticated");

    if (!token || !authenticated) {
      router.push("/login");
      return;
    }

    fetchStats(token);
  }, [router]);

  const fetchStats = async (token: string) => {
    try {
      const response = await fetch("/api/dashboard/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Error al cargar estadísticas");

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Error al cargar estadísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MedicalHeader />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Skeleton del título */}
          <div className="mb-8">
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-80" />
          </div>

          {/* Skeleton de las estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Skeleton de acciones rápidas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MedicalHeader />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Panel de Control</h1>
          <p className="mt-2 text-muted-foreground">Sistema de apoyo para diagnóstico temprano de diabetes</p>
        </div>

        {/* Estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pacientes</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalPacientes || 0}</div>
              <p className="text-xs text-muted-foreground">Registros activos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Evaluaciones Hoy</CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.prediccionesHoy || 0}</div>
              <p className="text-xs text-muted-foreground">Análisis realizados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Riesgo Alto</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats?.riesgoAlto || 0}</div>
              <p className="text-xs text-muted-foreground">Requieren seguimiento</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Precisión IA</CardTitle>
              <Activity className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats?.precision || 97.89).toFixed(2)}%</div>
              <p className="text-xs text-muted-foreground">Modelo entrenado</p>
            </CardContent>
          </Card>
        </div>

        {/* Acciones rápidas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span>Nuevo Análisis</span>
              </CardTitle>
              <CardDescription>Evaluar un nuevo paciente con el modelo de IA</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/nuevo-paciente">
                <Button className="w-full">Iniciar Evaluación</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span>Ver Historial</span>
              </CardTitle>
              <CardDescription>Revisar predicciones y análisis previos</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/historial">
                <Button variant="outline" className="w-full">Ver Historial Completo</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Alertas recientes */}
        {stats?.alertas && stats.alertas.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <span>Alertas Recientes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.alertas.map((alerta) => (
                  <div
                    key={alerta.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${alerta.nivel_riesgo === "Muy Alto"
                        ? "bg-red-50 border-red-200"
                        : "bg-orange-50 border-orange-200"
                      }`}
                  >
                    <div>
                      <p className={`font-medium ${alerta.nivel_riesgo === "Muy Alto" ? "text-red-900" : "text-orange-900"}`}>
                        {alerta.paciente} - Cédula: {alerta.cedula}
                      </p>
                      <p className={`text-sm ${alerta.nivel_riesgo === "Muy Alto" ? "text-red-700" : "text-orange-700"}`}>
                        Riesgo {alerta.nivel_riesgo.toLowerCase()} detectado - Probabilidad: {(alerta.probabilidad * 100).toFixed(1)}%
                      </p>
                    </div>
                    <span className={`text-xs ${alerta.nivel_riesgo === "Muy Alto" ? "text-red-600" : "text-orange-600"}`}>
                      {alerta.tiempo_relativo}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
