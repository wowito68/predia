"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface Alert {
    id: number;
    paciente: string;
    cedula: string;
    nivel_riesgo: string;
    probabilidad: number;
    fecha: string;
    tiempo_relativo: string;
}

interface RecentAlertsWidgetProps {
    alertas: Alert[];
}

export function RecentAlertsWidget({ alertas }: RecentAlertsWidgetProps) {
    if (!alertas || alertas.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-gray-400" />
                        <span>Alertas Recientes</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">No hay alertas recientes.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    <span>Alertas Recientes</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {alertas.map((alerta) => (
                        <div
                            key={alerta.id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${alerta.nivel_riesgo === "Muy Alto"
                                ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                                : "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800"
                                }`}
                        >
                            <div>
                                <p
                                    className={`font-medium ${alerta.nivel_riesgo === "Muy Alto"
                                        ? "text-red-900 dark:text-red-300"
                                        : "text-orange-900 dark:text-orange-300"
                                        }`}
                                >
                                    {alerta.paciente} - Cédula: {alerta.cedula}
                                </p>
                                <p
                                    className={`text-sm ${alerta.nivel_riesgo === "Muy Alto"
                                        ? "text-red-700 dark:text-red-400"
                                        : "text-orange-700 dark:text-orange-400"
                                        }`}
                                >
                                    Riesgo {alerta.nivel_riesgo.toLowerCase()} detectado - Probabilidad:{" "}
                                    {(alerta.probabilidad * 100).toFixed(1)}%
                                </p>
                            </div>
                            <span
                                className={`text-xs ${alerta.nivel_riesgo === "Muy Alto"
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-orange-600 dark:text-orange-400"
                                    }`}
                            >
                                {alerta.tiempo_relativo}
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
