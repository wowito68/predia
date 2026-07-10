"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CalendarDays, AlertTriangle, ClipboardList } from "lucide-react";

interface StatsWidgetProps {
    stats: {
        totalPacientes: number;
        consultasHoy?: number;
        alertasActivas?: number;
        citasPendientes?: number;
    } | null;
}

export function StatsWidget({ stats }: StatsWidgetProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full">
            <Card className="relative overflow-hidden group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Pacientes</CardTitle>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="text-3xl font-bold tracking-tight">{stats?.totalPacientes || 0}</div>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">Población clínica activa</p>
                </CardContent>
            </Card>

            <Card className="relative overflow-hidden group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Consultas Hoy</CardTitle>
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <ClipboardList className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="text-3xl font-bold tracking-tight">{stats?.consultasHoy ?? 0}</div>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">Atención registrada hoy</p>
                </CardContent>
            </Card>

            <Card className="relative overflow-hidden group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Alertas Activas</CardTitle>
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{stats?.alertasActivas ?? 0}</div>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">Pacientes que requieren atención</p>
                </CardContent>
            </Card>

            <Card className="relative overflow-hidden group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Citas Pendientes</CardTitle>
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <CalendarDays className="h-4 w-4 text-primary" />
                    </div>
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="text-3xl font-bold tracking-tight">{stats?.citasPendientes ?? 0}</div>
                    <div className="flex items-center text-xs mt-1 text-muted-foreground font-medium">
                        <span>Programadas próximamente</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
