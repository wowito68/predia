"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WidgetGrid } from "@/components/dashboard/widget-grid";
import { toast } from "sonner";

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
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    const authenticated = localStorage.getItem("authenticated");
    if (!t || !authenticated) {
      router.push("/login");
    } else {
      setToken(t);
    }
  }, [router]);

  const { data: stats, isLoading, error, refetch, dataUpdatedAt } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
      const data = await response.json();
      if (data.success) return data.data;
      throw new Error(data.error || "Error al cargar estadísticas");
    },
    enabled: !!token,
    staleTime: 60 * 1000 // Cache by 1 minute natively
  });

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const handleManualRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <DashboardLayout>
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
    </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>

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

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700 dark:text-red-300">
              Error al cargar estadísticas: {(error as Error).message}
            </AlertDescription>
          </Alert>
        )}

        {stats && <WidgetGrid stats={stats} />}
      </main>
    </DashboardLayout>
  );
}
