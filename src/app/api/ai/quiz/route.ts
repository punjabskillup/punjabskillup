import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiErrorResponse, consumeDailyAiRequest, generateGeminiText, parseJsonValue, requireEnrolledLecture, verifySameOrigin } from "@/lib/ai/server";
import { createAdminClient } from "@/lib/supabase/admin";

const requestSchema = z.object({ lecture_id: z.string().uuid() });
const questionSchema = z.object({
  question: z.string().trim().min(1),
  options: z.tuple([
    z.string().trim().min(1),
    z.string().trim().min(1),
    z.string().trim().min(1),
    z.string().trim().min(1),
  ]),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(1),
}).strict();
const quizSchema = z.object({
  questions: z.array(questionSchema).length(5),
}).strict();
const validatedQuizSchema = quizSchema.superRefine((quiz, context) => {
  quiz.questions.forEach((question, index) => {
    if (new Set(question.options.map((option) => option.toLocaleLowerCase())).size !== 4) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["questions", index, "options"],
        message: "Options must be distinct.",
      });
    }
  });
});

type Quiz = z.infer<typeof validatedQuizSchema>;

async function generateQuiz(transcript: string, language: string) {
  let validationMessage = "";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const correction =
      attempt === 0
        ? ""
        : `\nYour previous response did not match the required schema: ${validationMessage}. Return valid JSON only.`;
    const raw = await generateGeminiText(
      `Create exactly five useful multiple-choice questions from the lecture transcript below. Write the quiz in ${language}. Return strict JSON with exactly this shape: {"questions":[{"question":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}]}. Each question must have exactly four distinct options, one correctIndex from 0 to 3, and an explanation grounded in the transcript. Do not include markdown or extra fields. Do not ask anything the transcript does not answer.${correction}\n\nTRANSCRIPT:\n${transcript}`,
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

    const parsed = validatedQuizSchema.safeParse(value);
    if (parsed.success) {
      return parsed.data;
    }
    validationMessage = parsed.error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
  }

  throw new Error("The AI could not create a valid quiz. Please try again.");
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
      console.error("Could not load lecture quiz data:", cacheError?.message, transcriptError?.message);
      return NextResponse.json({ error: "We could not load this lecture’s AI data." }, { status: 500 });
    }

    if (cache?.quiz) {
      const cachedQuiz = validatedQuizSchema.safeParse(parseJsonValue(cache.quiz));
      if (cachedQuiz.success) {
        return NextResponse.json({ ...cachedQuiz.data, cached: true });
      }
    }
    if (!transcript) {
      return NextResponse.json(
        { error: "A transcript has not been added for this lecture yet." },
        { status: 409 },
      );
    }

    const quiz: Quiz = await generateQuiz(transcript.full_text, transcript.language);
    const { error: saveError } = await admin.rpc("cache_lecture_ai", {
      p_lecture_id: parsed.data.lecture_id,
      p_summary: null,
      p_quiz: quiz,
    });
    if (saveError) {
      console.error("Could not cache lecture quiz:", saveError.message);
      return NextResponse.json({ error: "The quiz was generated but could not be saved." }, { status: 500 });
    }

    return NextResponse.json({ ...quiz, cached: false });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
