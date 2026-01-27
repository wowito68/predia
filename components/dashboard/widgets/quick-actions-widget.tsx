"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, TrendingUp } from "lucide-react";

export function QuickActionsWidget() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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

            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
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
    );
}
