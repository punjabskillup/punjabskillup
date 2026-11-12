import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/json-ld";
import { PublicPageShell } from "@/components/public-page-shell";
import Reveal from "@/components/Reveal";
import { publicMetadata } from "@/lib/seo";

const title = "How PunjabSkillUp Works";
const description =
  "Join free, pick a course, watch lectures and use the AI study helper for summaries, questions and quizzes. See how learning on PunjabSkillUp works.";

export const metadata: Metadata = publicMetadata(title, description, "/how-it-works");

const steps = [
  {
    title: "Join free",
    text: "Create an account to begin using PunjabSkillUp. Your account gives you a place to return to your learning.",
  },
  {
    title: "Pick a course",
    text: "Explore a topic that matches what you want to learn. Open lectures in order or revisit a lesson when you need a refresher.",
  },
  {
    title: "Learn with the AI study helper",
    text: "Ask about a lecture, review its summary, or try a quiz based on what was taught. Use the extra explanations to guide your practice.",
  },
];

export default function HowItWorksPage() {
  return (
    <PublicPageShell>
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: title, path: "/how-it-works" }]} />
      <article className="public-content">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span aria-hidden="true">/</span><span>How it works</span>
        </nav>
        <Reveal variant="up">
          <header className="public-heading">
            <span className="eyebrow">YOUR LEARNING JOURNEY</span>
            <h1>How PunjabSkillUp Works</h1>
            <p>A straightforward way to move from a question to a lesson and practice.</p>
          </header>
        </Reveal>
        <ol className="public-steps">
          {steps.map((step, index) => (
            <li key={step.title}>
              <Reveal variant="up" delay={(index + 1) * 80} className="public-step">
                <span className="public-step-number" aria-hidden="true">{index + 1}</span>
                <div><h2>{step.title}</h2><p>{step.text}</p></div>
              </Reveal>
            </li>
          ))}
        </ol>
      </article>
    </PublicPageShell>
  );
}
