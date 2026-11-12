import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AI_CONFIG, getGeminiApiKey } from "@/lib/ai/config";

const FRIENDLY_RATE_LIMIT_MESSAGE =
  "The AI is busy right now. Please wait a moment and try again.";
const DAILY_LIMIT_MESSAGE =
  "You’ve reached today’s AI request limit. Please come back tomorrow.";

export type LectureAccess = {
  userId: string;
  lectureId: string;
  courseId: string;
};

export type LectureAccessResult =
  | { access: LectureAccess; response: null }
  | { access: null; response: NextResponse };

export class GeminiRateLimitError extends Error {
  constructor() {
    super(FRIENDLY_RATE_LIMIT_MESSAGE);
    this.name = "GeminiRateLimitError";
  }
}

export async function requireEnrolledLecture(
  lectureId: string,
): Promise<LectureAccessResult> {
  let sessionClient: Awaited<ReturnType<typeof createSessionClient>>;
  try {
    sessionClient = await createSessionClient();
  } catch (error) {
    console.error(
      "Could not initialize Supabase authentication:",
      error instanceof Error ? error.message : "Unknown configuration error",
    );
    return {
      access: null,
      response: NextResponse.json(
        { error: "Lecture AI is not configured yet. Please try again later." },
        { status: 503 },
      ),
    };
  }

  let user: Awaited<ReturnType<typeof sessionClient.auth.getUser>>["data"]["user"];
  let authError: Awaited<ReturnType<typeof sessionClient.auth.getUser>>["error"];
  try {
    const result = await sessionClient.auth.getUser();
    user = result.data.user;
    authError = result.error;
  } catch (error) {
    console.error(
      "Could not verify the lecture AI session:",
      error instanceof Error ? error.message : "Unknown authentication error",
    );
    return {
      access: null,
      response: NextResponse.json(
        { error: "We could not verify your session. Please try again." },
        { status: 503 },
      ),
    };
  }

  if (authError || !user) {
    return {
      access: null,
      response: NextResponse.json({ error: "Please sign in to use lecture AI." }, { status: 401 }),
    };
  }

  const { data: lecture, error: lectureError } = await sessionClient
    .from("lectures")
    .select("id,course_id")
    .eq("id", lectureId)
    .maybeSingle();

  if (lectureError) {
    console.error("Could not verify lecture access:", lectureError.message);
    return {
      access: null,
      response: NextResponse.json({ error: "We could not verify access to this lecture." }, { status: 500 }),
    };
  }

  if (!lecture) {
    return {
      access: null,
      response: NextResponse.json({ error: "Lecture not found." }, { status: 404 }),
    };
  }

  const { data: enrollment, error: enrollmentError } = await sessionClient
    .from("enrollments")
    .select("course_id")
    .eq("course_id", lecture.course_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (enrollmentError) {
    console.error("Could not verify course enrollment:", enrollmentError.message);
    return {
      access: null,
      response: NextResponse.json({ error: "We could not verify your course enrollment." }, { status: 500 }),
    };
  }

  if (!enrollment) {
    return {
      access: null,
      response: NextResponse.json({ error: "Enroll in this course to use lecture AI." }, { status: 403 }),
    };
  }

  return {
    access: { userId: user.id, lectureId, courseId: lecture.course_id },
    response: null,
  };
}

export function verifySameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return null;
  }

  try {
    if (new URL(origin).origin === request.nextUrl.origin) {
      return null;
    }
  } catch {
    // Treat malformed origins as cross-origin.
  }

  return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
}

export async function consumeDailyAiRequest(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_ai_request", {
    p_user_id: userId,
    p_daily_limit: AI_CONFIG.dailyRequestLimit,
  });

  if (error) {
    console.error("Could not apply AI rate limit:", error.message);
    throw new Error("We could not check your AI usage. Please try again.");
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (
    !result ||
    typeof result !== "object" ||
    !("allowed" in result) ||
    typeof result.allowed !== "boolean"
  ) {
    throw new Error("We could not check your AI usage. Please try again.");
  }

  return {
    allowed: result.allowed,
    message: DAILY_LIMIT_MESSAGE,
  };
}

export function chunkTranscript(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const chunkSize = Math.max(
    1,
    Math.floor(AI_CONFIG.chunkTokens / AI_CONFIG.estimatedTokensPerWord),
  );
  const overlap = Math.floor(
    AI_CONFIG.chunkOverlapTokens / AI_CONFIG.estimatedTokensPerWord,
  );
  const step = Math.max(1, chunkSize - overlap);
  const chunks: { content: string; chunk_index: number }[] = [];

  for (let start = 0; start < words.length; start += step) {
    const content = words.slice(start, start + chunkSize).join(" ");
    if (content) {
      chunks.push({ content, chunk_index: chunks.length });
    }
    if (start + chunkSize >= words.length) {
      break;
    }
  }

  return chunks;
}

type GeminiPart = { text?: string };
type GeminiResponse = {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
};

async function fetchGemini(
  model: string,
  method: string,
  body: unknown,
  options: { stream?: boolean; signal?: AbortSignal } = {},
) {
  const apiKey = getGeminiApiKey();
  const streamQuery = options.stream ? "&alt=sse" : "";
  const url = `${AI_CONFIG.apiBaseUrl}/models/${model}:${method}?key=${encodeURIComponent(apiKey)}${streamQuery}`;
  let response: Response | null = null;

  for (let attempt = 0; attempt < AI_CONFIG.rateLimitRetryAttempts; attempt += 1) {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: options.signal,
      cache: "no-store",
    });

    if (response.status !== 429) {
      break;
    }

    if (attempt + 1 < AI_CONFIG.rateLimitRetryAttempts) {
      const delay =
        AI_CONFIG.rateLimitBaseDelayMs * 2 ** attempt +
        Math.floor(Math.random() * AI_CONFIG.rateLimitBaseDelayMs / 2);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  if (!response) {
    throw new Error("Gemini did not return a response.");
  }
  if (response.status === 429) {
    await response.body?.cancel();
    throw new GeminiRateLimitError();
  }
  if (!response.ok) {
    const bodyText = await response.text();
    console.error("Gemini API request failed:", response.status, bodyText.slice(0, 1000));
    throw new Error("The AI service could not complete this request. Please try again.");
  }
  return response;
}

export async function generateGeminiText(
  prompt: string,
  options: { json?: boolean; signal?: AbortSignal } = {},
) {
  const response = await fetchGemini(
    AI_CONFIG.models.generation,
    "generateContent",
    {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: options.json ? { responseMimeType: "application/json" } : undefined,
    },
    { signal: options.signal },
  );
  const result = (await response.json()) as GeminiResponse;
  const text = result.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("The AI returned an empty response. Please try again.");
  }
  return text;
}

export type TextEmbedding = {
  values: number[];
};

export async function embedTexts(texts: string[]) {
  if (texts.length === 0) {
    return [];
  }

  const apiKey = getGeminiApiKey();
  const embeddings: TextEmbedding[] = [];
  const batchSize = 100;

  for (let start = 0; start < texts.length; start += batchSize) {
    const requests = texts.slice(start, start + batchSize).map((text) => ({
      model: `models/${AI_CONFIG.models.embedding}`,
      content: { parts: [{ text }] },
      outputDimensionality: AI_CONFIG.embeddingDimensions,
    }));
    const url = `${AI_CONFIG.apiBaseUrl}/models/${AI_CONFIG.models.embedding}:batchEmbedContents?key=${encodeURIComponent(apiKey)}`;
    let response: Response | null = null;

    for (let attempt = 0; attempt < AI_CONFIG.rateLimitRetryAttempts; attempt += 1) {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests }),
        cache: "no-store",
      });
      if (response.status !== 429) {
        break;
      }
      if (attempt + 1 < AI_CONFIG.rateLimitRetryAttempts) {
        const delay =
          AI_CONFIG.rateLimitBaseDelayMs * 2 ** attempt +
          Math.floor(Math.random() * AI_CONFIG.rateLimitBaseDelayMs / 2);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    if (response?.status === 429) {
      await response.body?.cancel();
      throw new GeminiRateLimitError();
    }
    if (!response?.ok) {
      const bodyText = response ? await response.text() : "";
      console.error("Gemini embedding request failed:", response?.status, bodyText.slice(0, 1000));
      throw new Error("The AI could not process the transcript. Please try again.");
    }

    const result = (await response.json()) as { embeddings?: TextEmbedding[] };
    if (!result.embeddings || result.embeddings.length !== requests.length) {
      throw new Error("The AI returned incomplete transcript embeddings.");
    }
    if (
      result.embeddings.some(
        (embedding) =>
          embedding.values.length !== AI_CONFIG.embeddingDimensions ||
          embedding.values.some((value) => !Number.isFinite(value)),
      )
    ) {
      throw new Error("The AI returned invalid transcript embeddings.");
    }
    embeddings.push(...result.embeddings);
  }

  return embeddings;
}

export async function streamGeminiText(
  prompt: string,
  onText: (text: string) => void,
  signal?: AbortSignal,
) {
  const response = await fetchGemini(
    AI_CONFIG.models.generation,
    "streamGenerateContent",
    { contents: [{ role: "user", parts: [{ text: prompt }] }] },
    { stream: true, signal },
  );
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("The AI stream could not be started.");
  }

  const decoder = new TextDecoder();
  let pending = "";

  while (true) {
    const { done, value } = await reader.read();
    pending += decoder.decode(value, { stream: !done });
    const events = pending.split(/\r?\n\r?\n/);
    pending = events.pop() ?? "";

    for (const event of events) {
      const data = event
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n");
      if (!data || data === "[DONE]") {
        continue;
      }
      try {
        const result = JSON.parse(data) as GeminiResponse;
        const text = result.candidates?.[0]?.content?.parts
          ?.map((part) => part.text ?? "")
          .join("");
        if (text) {
          onText(text);
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          console.error("Could not parse a Gemini stream event.");
        } else {
          throw error;
        }
      }
    }
    if (done) {
      if (pending.trim()) {
        const data = pending
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("\n");
        if (data && data !== "[DONE]") {
          try {
            const result = JSON.parse(data) as GeminiResponse;
            const text = result.candidates?.[0]?.content?.parts
              ?.map((part) => part.text ?? "")
              .join("");
            if (text) {
              onText(text);
            }
          } catch (error) {
            if (!(error instanceof SyntaxError)) {
              throw error;
            }
            console.error("Could not parse the final Gemini stream event.");
          }
        }
      }
      break;
    }
  }
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof GeminiRateLimitError) {
    return NextResponse.json({ error: FRIENDLY_RATE_LIMIT_MESSAGE }, { status: 429 });
  }
  const message =
    error instanceof Error ? error.message : "The AI request failed. Please try again.";
  console.error("AI route failed:", message);
  return NextResponse.json({ error: message }, { status: 500 });
}

export function parseJsonValue(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}
