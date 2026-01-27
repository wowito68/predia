"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Mic, MicOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface VoiceInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    onTranscription: (text: string) => void
    label?: string
}

export function VoiceInput({ onTranscription, label, className, ...props }: VoiceInputProps) {
    const [isListening, setIsListening] = useState(false)
    const [isSupported, setIsSupported] = useState(false)
    const recognitionRef = useRef<any>(null)

    useEffect(() => {
        if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            setIsSupported(true)
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
            recognitionRef.current = new SpeechRecognition()
            recognitionRef.current.continuous = true
            recognitionRef.current.interimResults = true
            recognitionRef.current.lang = 'es-ES'

            recognitionRef.current.onresult = (event: any) => {
                let interimTranscript = ''
                let finalTranscript = ''

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript
                    } else {
                        interimTranscript += event.results[i][0].transcript
                    }
                }

                if (finalTranscript) {
                    onTranscription(finalTranscript)
                }
            }

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error', event.error)
                setIsListening(false)
                toast.error("Error en el reconocimiento de voz")
            }

            recognitionRef.current.onend = () => {
                // Si queremos que siga escuchando, lo reiniciamos, pero por UX mejor que pare
                // setIsListening(false) 
            }
        }
    }, [onTranscription])

    const toggleListening = () => {
        if (!isSupported) {
            toast.error("Tu navegador no soporta dictado por voz")
            return
        }

        if (isListening) {
            recognitionRef.current.stop()
            setIsListening(false)
            toast.success("Dictado finalizado")
        } else {
            recognitionRef.current.start()
            setIsListening(true)
            toast.info("Escuchando... hable ahora")
        }
    }

    return (
        <div className="relative">
            <Textarea
                {...props}
                className={`pr-12 min-h-[100px] ${isListening ? 'border-red-400 ring-1 ring-red-400' : ''} ${className}`}
            />
            <div className="absolute top-2 right-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                size="icon"
                                variant={isListening ? "destructive" : "secondary"}
                                className={`h-8 w-8 transition-all ${isListening ? 'animate-pulse' : ''}`}
                                onClick={toggleListening}
                            >
                                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{isListening ? "Detener dictado" : "Iniciar dictado por voz (IA)"}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            {isListening && (
                <span className="absolute bottom-2 right-2 text-[10px] text-red-500 font-medium flex items-center bg-white/80 dark:bg-slate-950/80 px-1 rounded backdrop-blur-sm border border-red-200 dark:border-red-900/30">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Grabando...
                </span>
            )}
        </div>
    )
}
