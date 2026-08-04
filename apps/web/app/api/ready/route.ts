import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      success: true,
      status: "ready",
      database: "ok",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Readiness check failed:", error)
    return NextResponse.json(
      { success: false, status: "not_ready", database: "error" },
      { status: 503 },
    )
  }
}

