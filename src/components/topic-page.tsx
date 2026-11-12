import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/json-ld";
import { PublicPageShell } from "@/components/public-page-shell";
import { SignInTrigger } from "@/components/navbar";
import Reveal from "@/components/Reveal";

export type TopicPageContent = {
  title: string;
  path: string;
  intro: string;
  learning: string[];
  audience: string;
  faqs: { question: string; answer: string }[];
};

export function TopicPage({ content }: { content: TopicPageContent }) {
  return (
    <PublicPageShell>
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: content.title, path: content.path }]} />
      <article className="public-content topic-content">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span>{content.title}</span>
        </nav>
        <Reveal variant="up">
          <header className="public-heading">
            <span className="eyebrow">EXPLORE A TOPIC</span>
            <h1>{content.title}</h1>
            <p>{content.intro}</p>
          </header>
        </Reveal>
        <Reveal variant="up" delay={80}>
          <section className="public-section" aria-labelledby="topic-learning-heading">
            <h2 id="topic-learning-heading">What you will learn</h2>
            <ul className="public-check-list">
              {content.learning.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        </Reveal>
        <Reveal variant="up" delay={160}>
          <section className="public-section" aria-labelledby="topic-audience-heading">
            <h2 id="topic-audience-heading">Who it is for</h2>
            <p>{content.audience}</p>
          </section>
        </Reveal>
        <Reveal variant="up" delay={240} threshold={0.01}>
          <section className="public-section" aria-labelledby="topic-faq-heading">
            <h2 id="topic-faq-heading">Frequently asked questions</h2>
            <div className="public-faq-list">
              {content.faqs.map(({ question, answer }, index) => (
                <Reveal variant="up" delay={index * 80} key={question}>
                  <article className="public-faq-item">
                    <h3>{question}</h3>
                    <p>{answer}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>
        </Reveal>
        <Reveal variant="up" delay={320}>
          <div className="public-cta">
            <SignInTrigger className="primary-button">Join free to view courses</SignInTrigger>
          </div>
        </Reveal>
      </article>
    </PublicPageShell>
  );
}
