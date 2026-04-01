import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"
import { logAudit } from "@/lib/audit"

// GET - Listar recetas
export async function GET(request: NextRequest) {
    try {
        const token = request.headers.get("authorization")?.replace("Bearer ", "")
        if (!token) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })

        const user = await verifyToken(token)
        if (!user) return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const id_paciente = searchParams.get("id_paciente")

        const where: any = {}
        if (id_paciente) where.id_paciente = parseInt(id_paciente)

        const recetas = await prisma.receta.findMany({
            where,
            include: {
                usuario: { select: { nombre: true, apellido_paterno: true } },
                paciente: { select: { nombre: true, apellido_paterno: true } }
            },
            orderBy: { fecha_emicion: "desc" }
        })

        return NextResponse.json({ success: true, data: recetas })
    } catch (error) {
        console.error("Error al obtener recetas:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}

// POST - Crear receta
export async function POST(request: NextRequest) {
    try {
        const token = request.headers.get("authorization")?.replace("Bearer ", "")
        if (!token) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })

        const user = await verifyToken(token)
        if (!user) return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 })

        const body = await request.json()
        const { id_paciente, id_consulta, medicamentos, instrucciones } = body

        // Validar campos requeridos
        if (!id_paciente || !medicamentos) {
            return NextResponse.json(
                { success: false, error: "Faltan campos requeridos: id_paciente y medicamentos son obligatorios" },
                { status: 400 }
            )
        }

        const paciente = await prisma.paciente.findUnique({
            where: { id_paciente: parseInt(id_paciente) },
            select: { nombre: true, apellido_paterno: true, fecha_nacimiento: true, genero: true }
        });

        const datos_paciente = JSON.stringify(paciente || {});
        const datos_medico = JSON.stringify({
            nombre: (user as any).nombre,
            apellido_paterno: (user as any).apellido_paterno,
            especialidad: (user as any).especialidad,
            cedula_profesional: (user as any).cedula_profesional
        });

        let consultaId = null;
        if (id_consulta) {
            const consulta = await prisma.consultaMedica.findFirst({
                where: {
                    id_consulta: parseInt(id_consulta),
                    id_paciente: parseInt(id_paciente),
                },
                select: { id_consulta: true },
            });
            if (!consulta) {
                return NextResponse.json(
                    { success: false, error: "La consulta indicada no existe o no pertenece al paciente especificado" },
                    { status: 404 }
                );
            }
            consultaId = consulta.id_consulta;
        }

        const receta = await prisma.receta.create({
            data: {
                id_paciente: parseInt(id_paciente),
                id_usuario: user.id_usuario,
                id_consulta: consultaId,
                medicamentos: typeof medicamentos === 'string' ? medicamentos : JSON.stringify(medicamentos),
                instrucciones: instrucciones || null,
                datos_medico,
                datos_paciente
            }
        })

        // Auditoría
        await logAudit(
            user.id_usuario,
            "CREAR_RECETA",
            `Receta creada para paciente ${id_paciente}${consultaId ? ` en consulta ${consultaId}` : ''} con ID ${receta.id_receta}`
        )

        return NextResponse.json({ success: true, data: receta }, { status: 201 })
    } catch (error) {
        console.error("Error al crear receta:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}
