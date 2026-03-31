"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CalendarDays, AlertTriangle, ClipboardList, TrendingUp, TrendingDown } from "lucide-react";

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
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent dark:from-blue-500/10 transition-opacity opacity-0 group-hover:opacity-100" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Pacientes</CardTitle>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="text-3xl font-bold tracking-tight">{stats?.totalPacientes || 0}</div>
                    <div className="flex items-center text-xs mt-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        <span>+12.5%</span>
                        <span className="text-muted-foreground ml-1 font-normal">vs mes pasado</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent dark:from-green-500/10 transition-opacity opacity-0 group-hover:opacity-100" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Consultas Hoy</CardTitle>
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <ClipboardList className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="text-3xl font-bold tracking-tight">{stats?.consultasHoy ?? 0}</div>
                    <div className="flex items-center text-xs mt-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        <span>+4.2%</span>
                        <span className="text-muted-foreground ml-1 font-normal">vs ayer</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent dark:from-amber-500/10 transition-opacity opacity-0 group-hover:opacity-100" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Alertas Activas</CardTitle>
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{stats?.alertasActivas ?? 0}</div>
                    <div className="flex items-center text-xs mt-1 text-red-600 dark:text-red-400 font-medium">
                        <TrendingDown className="w-3 h-3 mr-1" />
                        <span>-2 previas</span>
                        <span className="text-muted-foreground ml-1 font-normal">requieren atención</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent dark:from-purple-500/10 transition-opacity opacity-0 group-hover:opacity-100" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Citas Pendientes</CardTitle>
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <CalendarDays className="h-4 w-4 text-purple-600 dark:text-purple-400" />
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
