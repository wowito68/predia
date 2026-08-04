import { prisma } from "@/lib/prisma"

export async function logAudit(
    id_usuario: number,
    accion: string,
    detalles?: string,
    resultado: string = "exito"
) {
    try {
        await prisma.auditoria.create({
            data: {
                id_usuario,
                accion,
                detalles,
                resultado,
                fecha_registro: new Date()
            }
        })
    } catch (error) {
        // Fallor silencioso para no interrumpir flujo principal, pero loguear error
        console.error("Error al registrar auditoría:", error)
    }
}
