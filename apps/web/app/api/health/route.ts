import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    success: true,
    status: "ok",
    service: "predia-api",
    instance: process.env.PREDIA_INSTANCE_ID || process.env.HOSTNAME || "local-dev",
    timestamp: new Date().toISOString(),
  })
}

