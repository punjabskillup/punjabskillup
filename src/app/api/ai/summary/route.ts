import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  apiErrorResponse,
  consumeDailyAiRequest,
  generateGeminiText,
  parseJsonValue,
  requireEnrolledLecture,
  verifySameOrigin,
} from "@/lib/ai/server";
import { createAdminClient } from "@/lib/supabase/admin";

const requestSchema = z.object({ lecture_id: z.string().uuid() });
const summarySchema = z.object({
  keyPoints: z.array(z.string().trim().min(1)).length(5),
  takeaway: z.string().trim().min(1),
}).strict();

async function generateSummary(transcript: string, language: string) {
  let correction = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw = await generateGeminiText(
      `Summarise the lecture transcript in ${language}. Return strict JSON only with exactly this shape: {"keyPoints":["...","...","...","...","..."],"takeaway":"..."}. Include exactly five concise key points and one concise, single-line takeaway. Do not add facts that are not in the transcript.${correction}\n\nTRANSCRIPT:\n${transcript}`,
      { json: true },
    );
    let value = parseJsonValue(raw);
    if (!value) {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start >= 0 && end > start) {
        value = parseJsonValue(raw.slice(start, end + 1));
      }
    }

    const parsed = summarySchema.safeParse(value);
    if (parsed.success) {
      return `Key points:\n${parsed.data.keyPoints.map((point) => `- ${point}`).join("\n")}\nTakeaway: ${parsed.data.takeaway}`;
    }
    correction = `\nThe previous response was invalid: ${parsed.error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ")}. Return valid JSON only.`;
  }

  throw new Error("The AI could not create a valid summary. Please try again.");
}

export async function POST(request: NextRequest) {
  const originError = verifySameOrigin(request);
  if (originError) {
    return originError;
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide a valid lecture_id." }, { status: 400 });
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

    const admin = createAdminClient();
    const [{ data: cache, error: cacheError }, { data: transcript, error: transcriptError }] =
      await Promise.all([
        admin
          .from("lecture_ai")
          .select("summary,quiz")
          .eq("lecture_id", parsed.data.lecture_id)
          .maybeSingle(),
        admin
          .from("lecture_transcripts")
          .select("language,full_text")
          .eq("lecture_id", parsed.data.lecture_id)
          .maybeSingle(),
      ]);

    if (cacheError || transcriptError) {
      console.error("Could not load lecture AI data:", cacheError?.message, transcriptError?.message);
      return NextResponse.json({ error: "We could not load this lecture’s AI data." }, { status: 500 });
    }

    if (cache?.summary) {
      return NextResponse.json({ summary: cache.summary, cached: true });
    }
    if (!transcript) {
      return NextResponse.json(
        { error: "A transcript has not been added for this lecture yet." },
        { status: 409 },
      );
    }

    const summary = await generateSummary(transcript.full_text, transcript.language);

    const { error: saveError } = await admin.rpc("cache_lecture_ai", {
      p_lecture_id: parsed.data.lecture_id,
      p_summary: summary,
      p_quiz: null,
    });
    if (saveError) {
      console.error("Could not cache lecture summary:", saveError.message);
      return NextResponse.json({ error: "The summary was generated but could not be saved." }, { status: 500 });
    }

    return NextResponse.json({ summary, cached: false });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
