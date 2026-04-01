"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, ClipboardList, CalendarDays, Brain, Lock } from "lucide-react";

export function QuickActionsWidget() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
            <Card className="h-full">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2 text-base">
                        <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <span>Nuevo Paciente</span>
                    </CardTitle>
                    <CardDescription className="text-xs">Registrar un nuevo paciente</CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/nuevo-paciente">
                        <Button className="w-full" size="sm">Registrar</Button>
                    </Link>
                </CardContent>
            </Card>

            <Card className="h-full">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2 text-base">
                        <ClipboardList className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <span>Nueva Consulta</span>
                    </CardTitle>
                    <CardDescription className="text-xs">Iniciar atención médica</CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/pacientes">
                        <Button variant="outline" className="w-full" size="sm">Iniciar</Button>
                    </Link>
                </CardContent>
            </Card>

            <Card className="h-full">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2 text-base">
                        <CalendarDays className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <span>Ver Agenda</span>
                    </CardTitle>
                    <CardDescription className="text-xs">Citas programadas</CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/agenda">
                        <Button variant="outline" className="w-full" size="sm">Abrir</Button>
                    </Link>
                </CardContent>
            </Card>

            <Card className="h-full border-dashed border-primary/20 dark:border-primary/30 bg-primary/5 dark:bg-primary/5">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2 text-base">
                        <Brain className="w-5 h-5 text-primary" />
                        <span>IA Predictiva</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Análisis de riesgos
                        <span className="ml-1 inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary dark:bg-primary/20">
                            Premium
                        </span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Link href="/pacientes">
                        <Button variant="outline" className="w-full border-primary/20 text-primary hover:bg-primary/10" size="sm">
                            Evaluar Paciente
                        </Button>
                    </Link>
                    <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
                        <Lock className="w-3 h-3" />
                        Requiere historial clínico previo
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
