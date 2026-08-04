import { NextResponse } from "next/server"

export function validateNumericId(id: string | undefined): number | null {
    if (!id) return null

    const parsed = parseInt(id, 10)
    if (isNaN(parsed) || parsed <= 0) return null

    return parsed
}

export function parseIdParam(params: Record<string, string>, key: string) {
    const id = validateNumericId(params[key])

    if (!id) {
        return {
            error: `${key} inválido`,
            status: 400,
        }
    }

    return { id }
}
