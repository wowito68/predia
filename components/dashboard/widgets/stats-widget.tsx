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
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Pacientes</CardTitle>
                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalPacientes || 0}</div>
                    <p className="text-xs text-muted-foreground">Registros activos</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Consultas Hoy</CardTitle>
                    <ClipboardList className="h-4 w-4 text-green-600 dark:text-green-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.consultasHoy ?? 0}</div>
                    <p className="text-xs text-muted-foreground">Atenciones del día</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Alertas Activas</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats?.alertasActivas ?? 0}</div>
                    <p className="text-xs text-muted-foreground">Requieren atención</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Citas Pendientes</CardTitle>
                    <CalendarDays className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.citasPendientes ?? 0}</div>
                    <p className="text-xs text-muted-foreground">Programadas próximamente</p>
                </CardContent>
            </Card>
        </div>
    );
}

