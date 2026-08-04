import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { unlink, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import { verifyToken } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Initialize OpenAI only if key exists
const apiKey = process.env.OPENAI_API_KEY;
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const AUDIO_TYPES = new Set([
    "audio/m4a",
    "audio/mp4",
    "audio/mpeg",
    "audio/wav",
    "audio/webm",
    "audio/x-m4a",
    "video/webm",
]);

export async function POST(request: NextRequest) {
    let tempFilePath: string | null = null;
    try {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        const user = token ? verifyToken(token) : null;
        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }
        if (!["Médico", "Administrador"].includes(user.rol)) {
            return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
        }

        const { allowed, resetIn } = checkRateLimit(`voice:${user.id_usuario}:${getClientIp(request)}`, 10, 5 * 60 * 1000);
        if (!allowed) {
            return NextResponse.json(
                { error: "Límite de transcripciones alcanzado" },
                { status: 429, headers: { "Retry-After": Math.ceil(resetIn / 1000).toString() } },
            );
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json(
                { error: "El archivo de audio es obligatorio" },
                { status: 400 }
            );
        }
        if (file.size <= 0 || file.size > MAX_AUDIO_BYTES) {
            return NextResponse.json({ error: "El audio debe pesar entre 1 byte y 10 MB" }, { status: 413 });
        }
        if (!AUDIO_TYPES.has(file.type.toLowerCase())) {
            return NextResponse.json({ error: "Formato de audio no permitido" }, { status: 415 });
        }

        if (!apiKey) {
            await new Promise(resolve => setTimeout(resolve, 500));
            return NextResponse.json({
                text: "[MODO DEMO - SIN API KEY] Paciente refiere fatiga crónica y visión borrosa. Se recomienda hemoglobina glicosilada.",
                isMock: true
            });
        }

        const openai = new OpenAI({ apiKey });

        // Convert File to Buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Save temporarily to disk (OpenAI node SDK often requires a file path or ReadStream, 
        // though it can take a File object from fetch API, but safe to save to /tmp in node env)
        tempFilePath = path.join("/tmp", `predia-audio-${randomUUID()}.webm`);
        await writeFile(tempFilePath, buffer);

        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: "whisper-1",
            language: "es", // Optimize for Spanish medical dictation
        });

        return NextResponse.json({ text: transcription.text });
    } catch (error) {
        console.error("Transcription error:", error);
        return NextResponse.json(
            { error: "No se pudo procesar la transcripción" },
            { status: 500 }
        );
    } finally {
        if (tempFilePath) await unlink(tempFilePath).catch(() => undefined);
    }
}
