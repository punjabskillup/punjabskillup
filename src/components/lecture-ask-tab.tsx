"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Sparkles } from "lucide-react";
import { AiRequestError } from "@/lib/ai/errors";
import { getAiApiError } from "@/lib/ai/client";
import type { ChatMessage, Source } from "@/lib/ai/types";
import { IconBadge } from "@/components/ui/icon-badge";

export function LectureAskTab({
  active,
  lectureId,
  onTranscriptMissing,
}: {
  active: boolean;
  lectureId: string;
  onTranscriptMissing: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, active]);

  async function askQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = question.trim();
    if (!prompt || isAsking) {
      return;
    }

    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();
    setQuestion("");
    setErrorMessage("");
    setIsAsking(true);
    setMessages((current) => [
      ...current,
      { id: userMessageId, role: "user", text: prompt },
      { id: assistantMessageId, role: "assistant", text: "" },
    ]);

    try {
      const response = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lecture_id: lectureId, question: prompt }),
      });
      if (!response.ok) {
        throw await getAiApiError(response);
      }
      if (!response.body) {
        throw new Error("The AI response stream could not be opened.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = "";
      let streamError: string | null = null;
      let receivedText = false;

      const handleEvent = (line: string) => {
        if (!line.trim()) {
          return;
        }
        const event = JSON.parse(line) as
          | { type: "sources"; sources: Source[] }
          | { type: "delta"; text: string }
          | { type: "done" }
          | { type: "error"; error: string };

        if (event.type === "sources") {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessageId
                ? { ...message, sources: event.sources }
                : message,
            ),
          );
        } else if (event.type === "delta") {
          receivedText = true;
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessageId
                ? { ...message, text: message.text + event.text }
                : message,
            ),
          );
        } else if (event.type === "error") {
          streamError = event.error;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        pending += decoder.decode(value, { stream: !done });
        const lines = pending.split(/\r?\n/);
        pending = lines.pop() ?? "";
        lines.forEach(handleEvent);
        if (done) {
          if (pending.trim()) {
            handleEvent(pending);
          }
          break;
        }
      }

      if (streamError) {
        throw new Error(streamError);
      }
      if (!receivedText) {
        throw new Error("The AI did not return an answer. Please try again.");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The AI could not answer right now.";
      if (error instanceof AiRequestError && error.status === 409) {
        onTranscriptMissing();
      }
      setErrorMessage(message);
      setMessages((current) =>
        current.filter(
          (item) => item.id !== assistantMessageId || Boolean(item.text),
        ),
      );
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <div className="ai-chat-content ai-tab-content" hidden={!active}>
      <div className="ai-chat-messages" aria-live="polite" aria-relevant="additions text">
        {messages.length === 0 && (
          <div className="ai-chat-empty">
            <IconBadge tone="primary" className="ai-empty-icon">
              <Sparkles className="lucide-icon" strokeWidth={1.8} />
            </IconBadge>
            <p>Ask a question about this lecture. I&apos;ll answer from its transcript.</p>
          </div>
        )}
        {messages.map((message) => (
          <article
            className={`ai-chat-message ai-chat-message-${message.role}`}
            key={message.id}
          >
            <span className="ai-message-label">
              {message.role === "user" ? "You" : "Lecture AI"}
            </span>
            <p>{message.text || (isAsking && message.role === "assistant" ? "Thinking..." : "")}</p>
            {message.role === "assistant" && message.sources && message.sources.length > 0 && (
              <div className="ai-sources">
                <span>
                  {message.sources.length} lecture {message.sources.length === 1 ? "source" : "sources"}
                </span>
                <ul>
                  {message.sources.map((source) => (
                    <li key={source.chunkIndex}>
                      <span>Lecture excerpt {source.chunkIndex + 1}</span>
                      <p>{source.content}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {errorMessage && <p className="ai-chat-error" role="alert">{errorMessage}</p>}
      <form className="ai-chat-form" onSubmit={askQuestion}>
        <label className="visually-hidden" htmlFor={`lecture-question-${lectureId}`}>
          Ask a question about this lecture
        </label>
        <textarea
          id={`lecture-question-${lectureId}`}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about this lecture..."
          maxLength={4000}
          rows={2}
          disabled={isAsking}
        />
        <button
          className="ai-send-button"
          type="submit"
          disabled={isAsking || !question.trim()}
        >
          {isAsking ? "Answering..." : "Ask"}
        </button>
      </form>
    </div>
  );
}
