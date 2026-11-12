"use client";

import { useEffect, useRef, useState } from "react";
import { AiRequestError } from "@/lib/ai/errors";
import { postAiJson } from "@/lib/ai/client";
import type { QuizQuestion } from "@/lib/ai/types";

export function LectureQuizTab({
  active,
  lectureId,
  transcriptVersion,
  onTranscriptMissing,
}: {
  active: boolean;
  lectureId: string;
  transcriptVersion: number;
  onTranscriptMissing: () => void;
}) {
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [status, setStatus] = useState<"idle" | "loaded" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const requestRef = useRef<{
    key: string;
    promise: Promise<{ questions: QuizQuestion[] }>;
  } | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    let cancelled = false;
    const requestKey = `${lectureId}:${transcriptVersion}:${retryKey}`;
    if (requestRef.current?.key !== requestKey) {
      requestRef.current = {
        key: requestKey,
        promise: postAiJson<{ questions: QuizQuestion[] }>("/api/ai/quiz", {
          lecture_id: lectureId,
        }),
      };
    }

    requestRef.current.promise
      .then((data) => {
        if (!cancelled) {
          setQuiz(data.questions);
          setStatus("loaded");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          if (error instanceof AiRequestError && error.status === 409) {
            onTranscriptMissing();
          }
          setErrorMessage(error instanceof Error ? error.message : "The quiz could not be loaded.");
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [active, lectureId, onTranscriptMissing, retryKey, transcriptVersion]);

  function retry() {
    requestRef.current = null;
    setQuiz([]);
    setAnswers({});
    setSubmitted(false);
    setCurrentQuestion(0);
    setErrorMessage("");
    setStatus("idle");
    setRetryKey((current) => current + 1);
  }

  function resetAttempt() {
    setAnswers({});
    setSubmitted(false);
    setCurrentQuestion(0);
  }

  const score = quiz.reduce(
    (total, question, index) =>
      total + (answers[index] === question.correctIndex ? 1 : 0),
    0,
  );

  return (
    <div className="ai-quiz-content ai-tab-content" hidden={!active}>
      {status === "idle" && (
        <div className="ai-loading-skeleton ai-quiz-skeleton" aria-label="Creating your quiz" aria-busy="true">
          <span className="ai-skeleton-line ai-skeleton-line-wide" />
          <span className="ai-skeleton-line ai-skeleton-line-medium" />
          <span className="ai-quiz-skeleton-option" />
          <span className="ai-quiz-skeleton-option" />
          <span className="ai-quiz-skeleton-option" />
          <span className="ai-quiz-skeleton-option" />
        </div>
      )}
      {status === "error" && (
        <div className="ai-inline-error" role="alert">
          <p>{errorMessage}</p>
          <button className="ai-retry-button" type="button" onClick={retry}>Try again</button>
        </div>
      )}
      {status === "loaded" && (
        <>
          {submitted && (
            <p className="ai-quiz-score" role="status">
              You got {score} out of {quiz.length} correct.
            </p>
          )}
          <ol className="ai-quiz-list">
            {quiz.slice(currentQuestion, currentQuestion + 1).map((item) => {
              const index = currentQuestion;
              return (
                <li className="ai-quiz-question" key={`${index}-${item.question}`}>
                  <fieldset>
                    <legend>{index + 1}. {item.question}</legend>
                    {item.options.map((option, optionIndex) => (
                      <label
                        className={[
                          "ai-quiz-option",
                          submitted && optionIndex === item.correctIndex ? " is-correct" : "",
                          submitted &&
                          answers[index] === optionIndex &&
                          optionIndex !== item.correctIndex
                            ? " is-incorrect"
                            : "",
                        ].join("")}
                        key={option}
                      >
                        <input
                          type="radio"
                          name={`quiz-question-${index}`}
                          value={optionIndex}
                          checked={answers[index] === optionIndex}
                          disabled={submitted}
                          onChange={() =>
                            setAnswers((current) => ({ ...current, [index]: optionIndex }))
                          }
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </fieldset>
                  {submitted && (
                    <p className="ai-quiz-explanation">
                      <strong>{answers[index] === item.correctIndex ? "Correct. " : "Review: "}</strong>
                      {item.explanation}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
          <nav className="ai-quiz-progress" aria-label="Quiz question progress">
            {quiz.map((item, index) => (
              <button
                className={`ai-quiz-progress-dot${index === currentQuestion ? " is-active" : ""}${answers[index] !== undefined ? " is-answered" : ""}`}
                key={`${index}-${item.question}`}
                type="button"
                aria-label={`Go to question ${index + 1}`}
                aria-current={index === currentQuestion ? "step" : undefined}
                onClick={() => setCurrentQuestion(index)}
              />
            ))}
          </nav>
          <div className="ai-quiz-navigation">
            <button
              className="ai-quiz-nav-button"
              type="button"
              disabled={currentQuestion === 0}
              onClick={() => setCurrentQuestion((index) => index - 1)}
            >
              Previous
            </button>
            {currentQuestion < quiz.length - 1 ? (
              <button
                className="ai-quiz-nav-button ai-quiz-nav-next"
                type="button"
                onClick={() => setCurrentQuestion((index) => index + 1)}
              >
                Next question
              </button>
            ) : null}
          </div>
          {!submitted ? (
            <button
              className="ai-submit-quiz"
              type="button"
              disabled={Object.keys(answers).length !== quiz.length}
              onClick={() => setSubmitted(true)}
            >
              Check answers
            </button>
          ) : (
            <button className="ai-retry-button" type="button" onClick={resetAttempt}>
              Reset quiz
            </button>
          )}
        </>
      )}
    </div>
  );
}
