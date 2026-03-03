"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MedicalHeader } from "@/components/medical-header";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WidgetGrid } from "@/components/dashboard/widget-grid";

interface DashboardStats {
  totalPacientes: number;
  prediccionesHoy: number;
  riesgoAlto: number;
  precision: number;
  consultasHoy?: number;
  alertasActivas?: number;
  citasPendientes?: number;
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

const REFRESH_INTERVAL_MS = 60_000; // 60 segundos

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = useCallback(async (token: string, signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/dashboard/stats", {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });

      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
        setError(null);
        setLastUpdated(new Date());
      } else {
        throw new Error(data.error || "Error al cargar estadísticas");
      }
    } catch (err: any) {
      if (err.name === "AbortError") return; // Cancelación intencional
      console.error("Error al cargar estadísticas:", err);
      setError("No se pudieron cargar las estadísticas. Verifica la conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const authenticated = localStorage.getItem("authenticated");

    if (!token || !authenticated) {
      router.push("/login");
      return;
    }

    const controller = new AbortController();

    // Carga inicial
    fetchStats(token, controller.signal);

    // Auto-refresh cada 60 segundos
    const interval = setInterval(() => {
      fetchStats(token, controller.signal);
    }, REFRESH_INTERVAL_MS);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [router, fetchStats]);

  const handleManualRefresh = () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoading(true);
    fetchStats(token);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MedicalHeader />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-80" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
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
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Panel de Control Clínico</h1>
            <p className="mt-2 text-muted-foreground">
              Gestión integral de tu actividad clínica
              {lastUpdated && (
                <span className="ml-2 text-xs text-muted-foreground/60">
                  · Actualizado {lastUpdated.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            className="mt-1 text-muted-foreground"
            title="Actualizar estadísticas"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Actualizar
          </Button>
        </div>

        {/* Banner de error visible */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-300">
              {error}
              <Button
                variant="link"
                size="sm"
                onClick={handleManualRefresh}
                className="ml-2 p-0 h-auto text-red-700 dark:text-red-400 underline"
              >
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <WidgetGrid stats={stats} />
      </main>
    </div>
  );
}
