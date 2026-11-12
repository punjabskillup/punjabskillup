import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { AI_CONFIG } from "@/lib/ai/config";
import {
  apiErrorResponse,
  chunkTranscript,
  consumeDailyAiRequest,
  embedTexts,
  requireEnrolledLecture,
  verifySameOrigin,
} from "@/lib/ai/server";
import { createAdminClient } from "@/lib/supabase/admin";

const requestSchema = z.object({
  lecture_id: z.string().uuid(),
  transcript: z.string().trim().min(1).max(AI_CONFIG.maxTranscriptCharacters),
  language: z.string().trim().min(1).max(40).default("English"),
});

export async function POST(request: NextRequest) {
  const originError = verifySameOrigin(request);
  if (originError) {
    return originError;
  }

  const formData = request.headers.get("content-type")?.includes("multipart/form-data");
  let input: unknown;

  try {
    if (formData) {
      const data = await request.formData();
      const file = data.get("file");
      const transcriptValue = data.get("transcript");
      let transcript =
        typeof transcriptValue === "string" ? transcriptValue : "";

      if (file instanceof File && file.size > 0) {
        if (file.size > AI_CONFIG.maxTranscriptCharacters * 4) {
          return NextResponse.json({ error: "The transcript file is too large." }, { status: 413 });
        }
        if (!file.name.toLowerCase().endsWith(".txt") && file.type !== "text/plain") {
          return NextResponse.json(
            { error: "Upload a plain-text transcript file (.txt)." },
            { status: 415 },
          );
        }
        transcript = await file.text();
      }

      // TODO: replace this paste/text-file adapter with a Whisper or Gemini audio transcription provider.
      input = {
        lecture_id: data.get("lecture_id"),
        transcript,
        language: data.get("language") || "English",
      };
    } else {
      input = await request.json();
    }
  } catch {
    return NextResponse.json(
      { error: "Send a JSON body or a plain-text transcript file." },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provide a lecture_id, transcript text, and a valid language." },
      { status: 400 },
    );
  }

  const accessResult = await requireEnrolledLecture(parsed.data.lecture_id);
  if (!accessResult.access) {
    return accessResult.response;
  }

  try {
    const usage = await consumeDailyAiRequest(accessResult.access.userId);
    if (!usage.allowed) {
      return NextResponse.json({ error: usage.message }, { status: 429 });
    }

    const chunks = chunkTranscript(parsed.data.transcript);
    if (chunks.length === 0) {
      return NextResponse.json({ error: "The transcript does not contain any text." }, { status: 400 });
    }

    const embeddings = await embedTexts(chunks.map((chunk) => chunk.content));
    const admin = createAdminClient();
    const { error } = await admin.rpc("replace_lecture_transcript", {
      p_lecture_id: parsed.data.lecture_id,
      p_language: parsed.data.language,
      p_full_text: parsed.data.transcript,
      p_chunks: chunks.map((chunk, index) => ({
        ...chunk,
        embedding: embeddings[index]?.values,
      })),
    });

    if (error) {
      console.error("Could not save lecture transcript:", error.message);
      return NextResponse.json(
        { error: "We processed the transcript but could not save it. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, chunks: chunks.length });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
