// app/api/modelo-ia/metrics/route.ts
import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export const GET = async (request: NextRequest) => {
    try {
        const modeloResult = await query<{
            version: string
            accuracy: number
            n_samples_train: number
            n_samples_test: number
            fecha_entrenamiento: string
        }>(
            "SELECT version, accuracy, n_samples_train, n_samples_test, fecha_entrenamiento FROM modelo_ia WHERE activo = TRUE LIMIT 1"
        )

        if (modeloResult.length === 0) {
            return NextResponse.json({
                success: false,
                error: "No hay modelo activo"
            }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            data: modeloResult[0]
        })
    } catch (error) {
        console.error("Error al obtener métricas del modelo:", error)
        return NextResponse.json(
            { success: false, error: "Error al obtener métricas" },
            { status: 500 }
        )
    }
}
