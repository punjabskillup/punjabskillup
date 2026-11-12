"use client";

import { useCallback, useState, type KeyboardEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { LectureAskTab } from "@/components/lecture-ask-tab";
import { LectureQuizTab } from "@/components/lecture-quiz-tab";
import { LectureSummaryTab } from "@/components/lecture-summary-tab";
import { LectureTranscriptUpload } from "@/components/lecture-transcript-upload";
import { IconBadge } from "@/components/ui/icon-badge";

const tabs = ["Summary", "Ask", "Quiz"] as const;
type StudyTab = (typeof tabs)[number];

export function AiStudyPanel({ lectureId }: { lectureId: string }) {
  const searchParams = useSearchParams();
  const queryTab = searchParams.get("tab")?.toLowerCase();
  const initialTab =
    tabs.find((tab) => tab.toLowerCase() === queryTab) ?? "Summary";
  const [activeTab, setActiveTab] = useState<StudyTab>(initialTab);
  const [transcriptMissing, setTranscriptMissing] = useState(false);
  const [transcriptVersion, setTranscriptVersion] = useState(0);
  const [transcriptSaved, setTranscriptSaved] = useState(false);

  const handleTranscriptMissing = useCallback(() => {
    setTranscriptSaved(false);
    setTranscriptMissing(true);
  }, []);

  const handleTranscriptUploaded = useCallback(() => {
    setTranscriptMissing(false);
    setTranscriptSaved(true);
    setTranscriptVersion((version) => version + 1);
  }, []);

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const currentIndex = tabs.indexOf(activeTab);
    const nextTab = tabs[(currentIndex + direction + tabs.length) % tabs.length];
    setActiveTab(nextTab);
    document.getElementById(`tab-${nextTab.toLowerCase()}`)?.focus();
  }

  return (
    <section className="ai-study-panel" aria-label="AI study tools">
      <div className="ai-panel-heading">
        <div>
          <span className="eyebrow">YOUR STUDY PARTNER</span>
          <h2>Lecture AI</h2>
        </div>
        <IconBadge tone="primary" className="ai-panel-mark">
          <Sparkles className="lucide-icon" strokeWidth={1.8} />
        </IconBadge>
      </div>
      <div className="ai-tabs" role="tablist" aria-label="AI study tools">
        {tabs.map((tab) => (
          <button
            key={tab}
            id={`tab-${tab.toLowerCase()}`}
            className={`ai-tab${activeTab === tab ? " is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls="ai-tab-panel"
            tabIndex={activeTab === tab ? 0 : -1}
            onClick={() => setActiveTab(tab)}
            onKeyDown={handleTabKeyDown}
          >
            {tab}
          </button>
        ))}
      </div>
      <div
        className="ai-tab-panel"
        id="ai-tab-panel"
        role="tabpanel"
        aria-labelledby={`tab-${activeTab.toLowerCase()}`}
        tabIndex={0}
      >
        <LectureSummaryTab
          key={`summary-${transcriptVersion}`}
          active={activeTab === "Summary"}
          lectureId={lectureId}
          transcriptVersion={transcriptVersion}
          onTranscriptMissing={handleTranscriptMissing}
        />
        <LectureAskTab
          key={`ask-${transcriptVersion}`}
          active={activeTab === "Ask"}
          lectureId={lectureId}
          onTranscriptMissing={handleTranscriptMissing}
        />
        <LectureQuizTab
          key={`quiz-${transcriptVersion}`}
          active={activeTab === "Quiz"}
          lectureId={lectureId}
          transcriptVersion={transcriptVersion}
          onTranscriptMissing={handleTranscriptMissing}
        />
      </div>
      {transcriptMissing && (
        <LectureTranscriptUpload
          lectureId={lectureId}
          onUploaded={handleTranscriptUploaded}
        />
      )}
      {transcriptSaved && (
        <p className="ai-upload-success" role="status">
          Transcript saved. Your lecture AI is ready.
        </p>
      )}
    </section>
  );
}
