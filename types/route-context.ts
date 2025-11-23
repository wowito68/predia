import type { JWTPayload } from "@/lib/auth"

export interface RouteContext {
    params?: Record<string, string>
    user: JWTPayload
}

export interface DynamicRouteContext {
    params: { id: string }
    user: JWTPayload
}

export interface PatientRouteContext {
    params: { id: string }
    user: JWTPayload
}

export interface HistoryRouteContext {
    params: { pacienteId: string }
    user: JWTPayload
}
