"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCcw } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global Error Boundary caught:", error)
  }, [error])

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4 flex-col text-center">
      <div className="rounded-full bg-destructive/10 p-4 mb-6">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight mb-2">Algo salió mal</h2>
      <p className="text-muted-foreground max-w-[500px] mb-8">
        No pudimos cargar esta sección de la plataforma. Ha ocurrido un error inesperado de red o de sistema.
      </p>
      <Button onClick={() => reset()} size="lg" className="min-w-[200px]">
        <RefreshCcw className="mr-2 h-4 w-4" />
        Reintentar carga
      </Button>
    </div>
  )
}
