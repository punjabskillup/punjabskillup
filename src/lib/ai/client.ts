import { AiRequestError } from "@/lib/ai/errors";

export async function getAiApiError(response: Response) {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return new AiRequestError(
    data?.error ?? "The request could not be completed. Please try again.",
    response.status,
  );
}

export async function postAiJson<T>(url: string, payload: object) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await getAiApiError(response);
  }
  return (await response.json()) as T;
}
