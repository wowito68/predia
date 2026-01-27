import { NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { writeFile } from "fs/promises";

// Initialize OpenAI only if key exists
const apiKey = process.env.OPENAI_API_KEY;
// const openai = apiKey ? new OpenAI({ apiKey }) : null;

export async function POST(request: Request) {
    try {
        if (!apiKey) {
            // Return a mock response if no key is present, to allow UI testing without cost/setup
            await new Promise(resolve => setTimeout(resolve, 1500)); // Fake delay
            return NextResponse.json({
                text: "[MODO DEMO - SIN API KEY] Paciente refiere fatiga crónica y visión borrosa. Se recomienda hemoglobina glicosilada.",
                isMock: true
            });
        }

        const openai = new OpenAI({ apiKey });

        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json(
                { error: "File is required." },
                { status: 400 }
            );
        }

        // Convert File to Buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Save temporarily to disk (OpenAI node SDK often requires a file path or ReadStream, 
        // though it can take a File object from fetch API, but safe to save to /tmp in node env)
        const tempFilePath = path.join("/tmp", `upload_${Date.now()}.webm`);
        await writeFile(tempFilePath, buffer);

        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: "whisper-1",
            language: "es", // Optimize for Spanish medical dictation
        });

        // Clean up temp file
        fs.unlinkSync(tempFilePath);

        return NextResponse.json({ text: transcription.text });
    } catch (error: any) {
        console.error("Transcription error:", error);
        return NextResponse.json(
            { error: error.message || "Error processing audio" },
            { status: 500 }
        );
    }
}
