"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MedicalHeader } from "@/components/medical-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, TrendingUp, AlertTriangle, Activity, Calendar, Loader2 } from "lucide-react";

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
      <div className="min-h-screen bg-gray-50">
        <MedicalHeader />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MedicalHeader />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Panel de Control</h1>
          <p className="mt-2 text-gray-600">Sistema de apoyo para diagnóstico temprano de diabetes</p>
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
              <p className="text-xs text-gray-600">Registros activos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Evaluaciones Hoy</CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.prediccionesHoy || 0}</div>
              <p className="text-xs text-gray-600">Análisis realizados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Riesgo Alto</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats?.riesgoAlto || 0}</div>
              <p className="text-xs text-gray-600">Requieren seguimiento</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Precisión IA</CardTitle>
              <Activity className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
             <div className="text-2xl font-bold">{(stats?.precision || 97.89).toFixed(2)}%</div>
              <p className="text-xs text-gray-600">Modelo entrenado</p>
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
                <Button className="w-full bg-blue-600 hover:bg-blue-700">Iniciar Evaluación</Button>
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
                      <p
                        className={`font-medium ${alerta.nivel_riesgo === "Muy Alto" ? "text-red-900" : "text-orange-900"
                          }`}
                      >
                        {alerta.paciente} - Cédula: {alerta.cedula}
                      </p>
                      <p
                        className={`text-sm ${alerta.nivel_riesgo === "Muy Alto" ? "text-red-700" : "text-orange-700"
                          }`}
                      >
                        Riesgo {alerta.nivel_riesgo.toLowerCase()} detectado - Probabilidad: {(alerta.probabilidad * 100).toFixed(1)}%
                      </p>
                    </div>
                    <span
                      className={`text-xs ${alerta.nivel_riesgo === "Muy Alto" ? "text-red-600" : "text-orange-600"
                        }`}
                    >
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
