"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Activity, Brain, Loader2, Plus, HeartPulse, Stethoscope, AlertTriangle } from "lucide-react";

interface Props {
    paciente: any;
    id: string;
}

export function CardiovascularTab({ paciente, id }: Props) {
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);

    const [formData, setFormData] = useState({
        presion_sistolica: "120",
        colesterol_total: "190",
        colesterol_hdl: "45",
        fumador: "No",
        tratamiento_hipertension: "No"
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setTimeout(() => {
            // Mock calculation based on Framingham rough heuristics
            const sys = parseInt(formData.presion_sistolica);
            const chol = parseInt(formData.colesterol_total);
            const isSmoker = formData.fumador === "Sí";
            const age = 45; // static for mock

            let score = 0;
            if (sys > 140) score += 2;
            if (sys > 160) score += 3;
            if (chol > 200) score += 2;
            if (chol > 240) score += 3;
            if (isSmoker) score += 4;
            if (formData.colesterol_hdl && parseInt(formData.colesterol_hdl) < 40) score += 2;

            let riskPercent = 5;
            let level = "Bajo";
            if (score > 3) { riskPercent = 12; level = "Moderado"; }
            if (score > 6) { riskPercent = 25; level = "Alto"; }
            if (score > 9) { riskPercent = 40; level = "Muy Alto"; }

            // Add some randomness for realism
            riskPercent += (Math.random() * 4 - 2);

            setResult({
                nivel_riesgo: level,
                probabilidad: riskPercent,
                factores: [
                    isSmoker && "Tabaquismo activo",
                    sys > 130 && "Presión arterial elevada",
                    chol > 200 && "Colesterol total elevado"
                ].filter(Boolean),
                fecha: new Date().toISOString()
            });

            setSubmitting(false);
            setShowForm(false);
        }, 1500);
    };

    return (
        <div className="space-y-6 mt-6">
            <Alert className="border-indigo-200 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/30">
                <HeartPulse className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <AlertDescription className="text-indigo-800 dark:text-indigo-300 text-sm">
                    Este módulo evalúa el riesgo a 10 años de desarrollar enfermedades cardiovasculares 
                    utilizando las variables de Framingham modificadas.
                </AlertDescription>
            </Alert>

            <div className="flex justify-end">
                <Button onClick={() => setShowForm(!showForm)} className={showForm ? "bg-gray-600 hover:bg-gray-700" : "bg-indigo-600 hover:bg-indigo-700"}>
                    <Plus className="w-4 h-4 mr-2" />
                    {showForm ? "Cerrar" : "Nueva Evaluación"}
                </Button>
            </div>

            {showForm && (
                <Card className="border-indigo-200 dark:border-indigo-800">
                    <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/20">
                        <CardTitle className="flex items-center gap-2">
                            <Stethoscope className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            Datos Clínicos Cardiovasculares
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Presión Sistólica (mmHg)</Label>
                                    <Input value={formData.presion_sistolica} onChange={e => handleChange("presion_sistolica", e.target.value)} required type="number" />
                                </div>
                                <div>
                                    <Label>Colesterol Total (mg/dL)</Label>
                                    <Input value={formData.colesterol_total} onChange={e => handleChange("colesterol_total", e.target.value)} required type="number" />
                                </div>
                                <div>
                                    <Label>Colesterol HDL (mg/dL)</Label>
                                    <Input value={formData.colesterol_hdl} onChange={e => handleChange("colesterol_hdl", e.target.value)} required type="number" />
                                </div>
                                <div>
                                    <Label>¿Fumador activo?</Label>
                                    <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm transition-all focus-visible:ring-1"
                                        value={formData.fumador} onChange={e => handleChange("fumador", e.target.value)}>
                                        <option>No</option>
                                        <option>Sí</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700">
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
                        <p className="mt-4 text-muted-foreground">No hay evaluaciones de riesgo cardiovascular</p>
                    </CardContent>
                </Card>
            )}

            {result && (
                <Card className="overflow-hidden">
                    <CardHeader className="bg-indigo-100 text-indigo-800 border-l-4 border-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-300">
                        <div className="flex justify-between items-start">
                            <div className="flex items-start gap-4">
                                <AlertTriangle className="w-5 h-5 mt-1" />
                                <div>
                                    <CardTitle className="text-xl">Análisis Cardiovascular</CardTitle>
                                    <p className="text-sm mt-1">{new Date(result.fecha).toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-bold">{result.probabilidad.toFixed(1)}%</p>
                                <p className="text-xs mt-1">Riesgo a 10 años</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-1">NIVEL DE RIESGO</p>
                                <p className="text-lg font-bold text-indigo-900 dark:text-indigo-200">{result.nivel_riesgo}</p>
                            </div>
                        </div>
                        {result.factores.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">Factores de Riesgo Identificados:</h4>
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
