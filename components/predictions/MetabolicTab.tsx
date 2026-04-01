"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Activity, Brain, Loader2, Plus, BarChart3, AlertTriangle, CheckCircle } from "lucide-react";

interface Props {
    paciente: any;
    id: string;
}

export function MetabolicTab({ paciente, id }: Props) {
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);

    const [formData, setFormData] = useState({
        cintura: "95",
        trigliceridos: "160",
        hdl: "35",
        presion_sistolica: "135",
        glucosa_ayunas: "105"
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setTimeout(() => {
            // Mock calculation based on ATP III criteria for Metabolic Syndrome
            const isMale = paciente?.genero === "M" || true; // rough fallback
            let criteriaCount = 0;
            let factores = [];

            if ((isMale && parseInt(formData.cintura) > 102) || (!isMale && parseInt(formData.cintura) > 88)) {
                criteriaCount++;
                factores.push("Obesidad abdominal detectada");
            }
            if (parseInt(formData.trigliceridos) >= 150) {
                criteriaCount++;
                factores.push("Triglicéridos elevados");
            }
            if ((isMale && parseInt(formData.hdl) < 40) || (!isMale && parseInt(formData.hdl) < 50)) {
                criteriaCount++;
                factores.push("HDL Colesterol bajo");
            }
            if (parseInt(formData.presion_sistolica) >= 130) {
                criteriaCount++;
                factores.push("Presión arterial limítrofe/alta");
            }
            if (parseInt(formData.glucosa_ayunas) >= 100) {
                criteriaCount++;
                factores.push("Glucosa alterada en ayunas");
            }

            const hasSyndrome = criteriaCount >= 3;

            setResult({
                resultado: hasSyndrome ? "Positivo (Síndrome Metabólico)" : "Negativo",
                criterios_cumplidos: criteriaCount,
                factores: factores,
                fecha: new Date().toISOString()
            });

            setSubmitting(false);
            setShowForm(false);
        }, 1500);
    };

    return (
        <div className="space-y-6 mt-6">
            <Alert className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30">
                <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <AlertDescription className="text-emerald-800 dark:text-emerald-300 text-sm">
                    Este módulo evalúa la presencia de Síndrome Metabólico utilizando los criterios diagnósticos ATP III, combinando factores lipídicos, de presión y glucémicos.
                </AlertDescription>
            </Alert>

            <div className="flex justify-end">
                <Button onClick={() => setShowForm(!showForm)} className={showForm ? "bg-gray-600 hover:bg-gray-700" : "bg-emerald-600 hover:bg-emerald-700"}>
                    <Plus className="w-4 h-4 mr-2" />
                    {showForm ? "Cerrar" : "Nueva Evaluación"}
                </Button>
            </div>

            {showForm && (
                <Card className="border-emerald-200 dark:border-emerald-800">
                    <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/20">
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            Criterios ATP III Relacionados
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Circunferencia de Cintura (cm)</Label>
                                    <Input value={formData.cintura} onChange={e => handleChange("cintura", e.target.value)} required type="number" />
                                </div>
                                <div>
                                    <Label>Triglicéridos en Ayunas (mg/dL)</Label>
                                    <Input value={formData.trigliceridos} onChange={e => handleChange("trigliceridos", e.target.value)} required type="number" />
                                </div>
                                <div>
                                    <Label>Colesterol HDL (mg/dL)</Label>
                                    <Input value={formData.hdl} onChange={e => handleChange("hdl", e.target.value)} required type="number" />
                                </div>
                                <div>
                                    <Label>Presión Arterial Sistólica (mmHg)</Label>
                                    <Input value={formData.presion_sistolica} onChange={e => handleChange("presion_sistolica", e.target.value)} required type="number" />
                                </div>
                                <div>
                                    <Label>Glucosa en Ayunas (mg/dL)</Label>
                                    <Input value={formData.glucosa_ayunas} onChange={e => handleChange("glucosa_ayunas", e.target.value)} required type="number" />
                                </div>
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Brain className="w-4 h-4 mr-2" />}
                                    Ejecutar Análisis
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {!result && !showForm && (
                <Card>
                    <CardContent className="pt-6 text-center py-12">
                        <Activity className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
                        <p className="mt-4 text-muted-foreground">No hay evaluaciones de síndrome metabólico registradas</p>
                    </CardContent>
                </Card>
            )}

            {result && (
                <Card className="overflow-hidden">
                    <CardHeader className={`${result.criterios_cumplidos >= 3 ? "bg-red-100 text-red-800 border-red-500" : "bg-green-100 text-green-800 border-green-500"} border-l-4 dark:bg-opacity-30`}>
                        <div className="flex justify-between items-start">
                            <div className="flex items-start gap-4">
                                {result.criterios_cumplidos >= 3 ? <AlertTriangle className="w-5 h-5 mt-1" /> : <CheckCircle className="w-5 h-5 mt-1" />}
                                <div>
                                    <CardTitle className="text-xl">Diagnóstico Clínico Predictivo</CardTitle>
                                    <p className="text-sm mt-1">{new Date(result.fecha).toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-bold">{result.criterios_cumplidos} / 5</p>
                                <p className="text-xs mt-1">Criterios Positivos</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                                <p className="text-xs text-muted-foreground font-semibold mb-1">RESULTADO</p>
                                <p className="text-lg font-bold text-foreground">{result.resultado}</p>
                            </div>
                        </div>
                        {result.factores.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">Criterios Diagnosticados:</h4>
                                <ul className="space-y-2">
                                    {result.factores.map((factor: string, i: number) => (
                                        <li key={i} className="flex gap-3">
                                            <span className="text-red-500 font-bold">•</span>
                                            <span className="text-foreground">{factor}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
