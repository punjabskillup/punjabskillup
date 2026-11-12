import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/json-ld";
import { PublicPageShell } from "@/components/public-page-shell";
import { SignInTrigger } from "@/components/navbar";
import Reveal from "@/components/Reveal";
import { publicMetadata } from "@/lib/seo";

const title = "Teach on PunjabSkillUp";
const description =
  "Upload your lectures and reach learners across Punjab. Learn how to become an instructor on PunjabSkillUp.";

export const metadata: Metadata = publicMetadata(title, description, "/teach");

export default function TeachPage() {
  return (
    <PublicPageShell>
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: title, path: "/teach" }]} />
      <article className="public-content">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span aria-hidden="true">/</span><span>Teach</span>
        </nav>
        <Reveal variant="up">
          <header className="public-heading">
            <span className="eyebrow">FOR INSTRUCTORS</span>
            <h1>Teach on PunjabSkillUp</h1>
            <p>Share what you know with learners looking for clear, practical lessons.</p>
          </header>
        </Reveal>
        <Reveal variant="up" delay={80}>
          <section className="public-section">
            <h2>Why teach here?</h2>
            <p>
              Bring your experience to a learning space focused on practical skills and
              learners across Punjab. Organise your knowledge into focused lessons and
              help people study at a time and pace that works for them.
            </p>
          </section>
        </Reveal>
        <Reveal variant="up" delay={160}>
          <section className="public-section">
            <h2>How uploading works</h2>
            <p>
              Start by creating an account and requesting instructor access. In the
              instructor workspace, add a course description and thumbnail, then arrange
              your lectures in a clear sequence. Review your lesson details before
              publishing so learners know what each course covers.
            </p>
          </section>
        </Reveal>
        <Reveal variant="up" delay={240} className="public-cta">
          <div>
            <SignInTrigger className="primary-button">Become an instructor</SignInTrigger>
          </div>
        </Reveal>
      </article>
    </PublicPageShell>
  );
}
