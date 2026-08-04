import { NextResponse } from "next/server"

const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0f766e"/>
  <path d="M32 13v38M13 32h38" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
  <circle cx="32" cy="32" r="23" fill="none" stroke="#99f6e4" stroke-width="4"/>
</svg>`

export function GET() {
  return new NextResponse(icon, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  })
}
