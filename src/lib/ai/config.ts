import "server-only";

export const AI_CONFIG = {
  models: {
    generation: "gemini-2.5-flash",
    embedding: "gemini-embedding-001",
  },
  dailyRequestLimit: 30,
  embeddingDimensions: 768,
  chunkTokens: 500,
  chunkOverlapTokens: 80,
  estimatedTokensPerWord: 1.3,
  maxTranscriptCharacters: 300_000,
  rateLimitRetryAttempts: 4,
  rateLimitBaseDelayMs: 1_000,
  apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
} as const;

export function getGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini is not configured. Set GEMINI_API_KEY on the server.");
  }
  return apiKey;
}
