"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, AlertTriangle, Activity } from "lucide-react";

interface StatsWidgetProps {
    stats: {
        totalPacientes: number;
        prediccionesHoy: number;
        riesgoAlto: number;
        precision: number;
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
                    <CardTitle className="text-sm font-medium">Evaluaciones Hoy</CardTitle>
                    <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.prediccionesHoy || 0}</div>
                    <p className="text-xs text-muted-foreground">Análisis realizados</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Riesgo Alto</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats?.riesgoAlto || 0}</div>
                    <p className="text-xs text-muted-foreground">Requieren seguimiento</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Precisión IA</CardTitle>
                    <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{(stats?.precision || 97.89).toFixed(2)}%</div>
                    <p className="text-xs text-muted-foreground">Modelo entrenado</p>
                </CardContent>
            </Card>
        </div>
    );
}
