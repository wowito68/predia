"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MedicalHeader } from "@/components/medical-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, TrendingUp, AlertTriangle, Activity, Calendar, Loader2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton";
import { WidgetGrid } from "@/components/dashboard/widget-grid";

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
          <h1 className="text-3xl font-bold text-foreground">Panel de Control Clínico</h1>
          <p className="mt-2 text-muted-foreground">Gestión integral de tu actividad clínica</p>
        </div>

        <WidgetGrid stats={stats} />
      </main>
    </div>
  );
}
