import type { NextRequest } from "next/server"

interface RateLimitStore {
    [key: string]: { count: number; resetTime: number }
}

const store: RateLimitStore = {}

export function checkRateLimit(
    identifier: string,
    limit: number = 60,
    window: number = 60000 // 1 minuto por defecto
): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now()
    const key = `${identifier}:${Math.floor(now / window)}`

    if (!store[key]) {
        store[key] = { count: 0, resetTime: now + window }
    }

    const bucket = store[key]

    // Limpiar buckets antiguos
    Object.keys(store).forEach(k => {
        if (store[k].resetTime < now) {
            delete store[k]
        }
    })

    if (bucket.count >= limit) {
        return {
            allowed: false,
            remaining: 0,
            resetIn: bucket.resetTime - now,
        }
    }

    bucket.count++

    return {
        allowed: true,
        remaining: limit - bucket.count,
        resetIn: bucket.resetTime - now,
    }
}

export function getClientIp(request: NextRequest): string {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        request.headers.get("x-real-ip") ||
        "unknown"
    )
}
