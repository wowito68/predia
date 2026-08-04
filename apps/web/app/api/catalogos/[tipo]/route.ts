import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// Mapeo seguro de los nombres de catálogos permitidos a los modelos de Prisma
const catalogMap: Record<string, string> = {
  vacunas: "catalogoVacuna",
  patologias: "catalogoPatologia",
  medicamentos: "catalogoMedicamento",
  alergias: "catalogoAlergia",
};

const createCatalogEntrySchema = z.object({
  nombre: z.string().trim().min(2).max(200),
}).strict();

function authenticate(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return token ? verifyToken(token) : null;
}

export async function GET(request: NextRequest, context: { params: Promise<{ tipo: string }> }) {
  try {
    if (!authenticate(request)) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }
    const params = await context.params;
    const { tipo } = params;
    const modelName = catalogMap[tipo.toLowerCase()];

    if (!modelName) {
      return NextResponse.json({ success: false, error: "Catálogo no encontrado" }, { status: 404 });
    }

    // @ts-ignore - Prisma dynamic model access
    const data = await prisma[modelName].findMany({
      orderBy: { fecha_registro: 'desc' },
      take: 200 // Limitar resultados iniciales por rendimiento
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error(`Error fetching catalog [${context.params}]:`, error);
    return NextResponse.json({ success: false, error: "Error interno del servidor al obtener catálogo" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ tipo: string }> }) {
  try {
    if (!authenticate(request)) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }
    const params = await context.params;
    const { tipo } = params;
    const modelName = catalogMap[tipo.toLowerCase()];

    if (!modelName) {
      return NextResponse.json({ success: false, error: "Catálogo no encontrado" }, { status: 404 });
    }

    const validation = createCatalogEntrySchema.safeParse(await request.json());
    if (!validation.success) {
        return NextResponse.json(
          { success: false, error: "Datos inválidos", details: validation.error.errors },
          { status: 400 },
        );
    }
    const targetKey = "nombre";
    const originalValue = validation.data.nombre;
    
    // Normalización: Capitalizar primera letra de cada palabra
    const normalizedValue = originalValue
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Buscar si existe (simulando case insensitive con el valor exacto normalizado)
    // @ts-ignore
    const existing = await prisma[modelName].findFirst({
        where: {
            [targetKey]: {
                equals: normalizedValue
            }
        }
    });

    if (existing) {
        return NextResponse.json({ success: true, data: existing, duplicated: true });
    }

    // Crear nuevo elemento
    // @ts-ignore
    const nuevoElemento = await prisma[modelName].create({
      data: {
        [targetKey]: normalizedValue
      }
    });

    return NextResponse.json({ success: true, data: nuevoElemento });
  } catch (error) {
    console.error("Error creating catalog entry:", error);
    return NextResponse.json({ success: false, error: "Error al guardar o elemento duplicado en la base de datos" }, { status: 500 });
  }
}
