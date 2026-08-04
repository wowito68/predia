"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, ClipboardCopy } from "lucide-react";
import { toast } from "sonner";
import { useDictation } from "@/hooks/use-dictation";
import { Textarea } from "@/components/ui/textarea";

export function VoiceDictationWidget() {
    const [note, setNote] = useState("");

    const handleTranscription = (text: string) => {
        setNote((prev) => (prev ? prev + "\n" + text : text));
    };

    const { isRecording, isProcessing, startRecording, stopRecording } = useDictation({
        onTranscriptionComplete: handleTranscription,
    });

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <Mic className="w-5 h-5 text-primary" />
                    <span>Dictado Clínico IA</span>
                </CardTitle>
                <CardDescription>
                    Transcribe consultas y notas automáticamente
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-center">
                    {isRecording ? (
                        <Button
                            variant="destructive"
                            onClick={stopRecording}
                            className="w-full flex items-center justify-center gap-2 animate-pulse"
                        >
                            <MicOff className="w-4 h-4" /> Detener Grabación
                        </Button>
                    ) : (
                        <Button
                            variant="default"
                            onClick={startRecording}
                            disabled={isProcessing}
                            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                                </>
                            ) : (
                                <>
                                    <Mic className="w-4 h-4" /> Iniciar Dictado
                                </>
                            )}
                        </Button>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Notas Transcritas:</label>
                    <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Las notas aparecerán aquí..."
                        className="min-h-[100px] resize-none focus-visible:ring-primary"
                    />
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setNote("")}>
                        Limpiar
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        disabled={!note.trim()}
                        onClick={() => {
                            navigator.clipboard.writeText(note).then(() => {
                                toast.success("Notas copiadas al portapapeles");
                            }).catch(() => {
                                toast.error("Error al copiar");
                            });
                        }}
                    >
                        <ClipboardCopy className="w-4 h-4 mr-2" />
                        Copiar
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
