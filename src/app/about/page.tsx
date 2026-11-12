import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/json-ld";
import { PublicPageShell } from "@/components/public-page-shell";
import Reveal from "@/components/Reveal";
import { publicMetadata } from "@/lib/seo";

const title = "About PunjabSkillUp";
const description =
  "PunjabSkillUp is an online learning platform for Punjab. Learn from experienced instructors and study smarter with AI summaries, answers and quizzes.";

export const metadata: Metadata = publicMetadata(title, description, "/about");

export default function AboutPage() {
  return (
    <PublicPageShell>
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: title, path: "/about" }]} />
      <article className="public-content">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span aria-hidden="true">/</span><span>About</span>
        </nav>
        <Reveal variant="up">
          <header className="public-heading">
            <span className="eyebrow">ABOUT US</span>
            <h1>About PunjabSkillUp</h1>
            <p>Practical online learning, built with learners and instructors in mind.</p>
          </header>
        </Reveal>
        <div className="public-prose">
          <Reveal variant="up" delay={80}>
            <p>
              PunjabSkillUp is for people in Punjab and beyond who want to build practical
              skills at a pace that fits their lives. Whether you are beginning with a
              subject, returning to learning, or looking for a clearer way to practise,
              the platform brings lessons and study support together in one place.
            </p>
          </Reveal>
          <Reveal variant="up" delay={160}>
            <p>
              Instructors share focused video lessons that learners can watch on their
              own schedule and on the device they have available. Learners can move
              through a course one lecture at a time, revisit useful explanations, and
              continue learning from where they left off. The aim is to make useful
              knowledge approachable without making the learning experience complicated.
            </p>
          </Reveal>
          <Reveal variant="up" delay={240} threshold={0.01}>
            <section className="public-section">
              <h2>Study support in each lecture</h2>
              <p>
                The AI study helper can summarise a lecture, answer questions using the
                lesson context, and offer a quiz for practice. It is designed to support
                your learning, not replace your instructor or your own judgement. You
                remain in control of how you use each explanation and what you choose to
                study next.
              </p>
            </section>
          </Reveal>
          <Reveal variant="up" delay={320}>
            <p>
              PunjabSkillUp is being shaped around clear teaching, useful practice, and
              access for a wide range of learners. We want learning to feel relevant to
              everyday goals and welcoming to people at different stages.
            </p>
          </Reveal>
        </div>
      </article>
    </PublicPageShell>
  );
}
