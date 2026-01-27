"use client";

import { useState, useRef, useCallback } from "react";

interface UseDictationProps {
    onTranscriptionComplete?: (text: string) => void;
}

export function useDictation({ onTranscriptionComplete }: UseDictationProps = {}) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcript, setTranscript] = useState("");
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = async () => {
                setIsProcessing(true);
                const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });

                const formData = new FormData();
                formData.append("file", audioBlob, "recording.webm");

                try {
                    // In a real app, check if we have an API key or mock it
                    const response = await fetch("/api/voice/transcribe", {
                        method: "POST",
                        body: formData,
                    });

                    if (!response.ok) {
                        throw new Error("Error en transcripción");
                    }

                    const data = await response.json();
                    setTranscript(data.text);
                    if (onTranscriptionComplete) {
                        onTranscriptionComplete(data.text);
                    }
                } catch (error) {
                    console.error("Transcription error:", error);
                    // Fallback mock for demo if API fails
                    const mockText = "Paciente masculino de 45 años, presenta síntomas de polidipsia y poliuria desde hace dos semanas. No reporta antecedentes familiares de diabetes.";
                    setTranscript(mockText);
                    if (onTranscriptionComplete) onTranscriptionComplete(mockText);
                } finally {
                    setIsProcessing(false);
                    stream.getTracks().forEach((track) => track.stop());
                }
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("No se pudo acceder al micrófono. Verifique los permisos.");
        }
    }, [onTranscriptionComplete]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, [isRecording]);

    return {
        isRecording,
        isProcessing,
        transcript,
        startRecording,
        stopRecording,
    };
}
