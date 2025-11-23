import type { NextResponse } from "next/server"

export const CORS_HEADERS: Record<string, string> = {
    "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
}

export function setCorsHeaders(response: NextResponse): NextResponse {
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value)
    })
    return response
}

export function corsOptionsResponse() {
    return new Response(null, {
        status: 200,
        headers: CORS_HEADERS,
    })
}
