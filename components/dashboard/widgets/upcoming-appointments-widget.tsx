"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Clock, Loader2 } from "lucide-react";

interface Cita {
    id_consulta: number;
    proxima_cita: string;
    motivo_consulta: string;
    paciente: {
        id_paciente: number;
        nombre: string;
        apellido_paterno: string;
        telefono?: string;
    };
    usuario: {
        nombre: string;
        apellido_paterno: string;
    };
}

export function UpcomingAppointmentsWidget() {
    const [citas, setCitas] = useState<Cita[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            setLoading(false);
            return;
        }

        const fetchCitas = async () => {
            try {
                const res = await fetch("/api/agenda", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (data.success) {
                    // Show at most 3 upcoming appointments
                    setCitas((data.data || []).slice(0, 3));
                }
            } catch (error) {
                console.error("Error loading appointments:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCitas();
    }, []);

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <CalendarDays className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span>Próximas Citas</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                ) : citas.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No hay citas programadas próximamente.</p>
                ) : (
                    <div className="space-y-3">
                        {citas.map((cita) => {
                            const fecha = new Date(cita.proxima_cita);
                            const hora = fecha.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
                            const dia = fecha.toLocaleDateString("es-ES", { day: "numeric", month: "short" });

                            return (
                                <div
                                    key={cita.id_consulta}
                                    className="flex items-center justify-between p-3 rounded-lg border border-purple-100 bg-purple-50/50 dark:border-purple-900 dark:bg-purple-900/10"
                                >
                                    <div>
                                        <p className="font-medium text-foreground text-sm">
                                            {cita.paciente.nombre} {cita.paciente.apellido_paterno}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {dia} · Dr. {cita.usuario.nombre} {cita.usuario.apellido_paterno}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-1 text-purple-600 dark:text-purple-400">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span className="text-sm font-medium">{hora}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
