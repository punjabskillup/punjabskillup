import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/json-ld";
import { ContactForm } from "@/components/contact-form";
import { PublicPageShell } from "@/components/public-page-shell";
import { publicMetadata } from "@/lib/seo";

const title = "Contact PunjabSkillUp";
const description =
  "Questions about courses, teaching or your account? Get in touch with the PunjabSkillUp team.";

export const metadata: Metadata = publicMetadata(title, description, "/contact");

export default function ContactPage() {
  return (
    <PublicPageShell>
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: title, path: "/contact" }]} />
      <article className="public-content">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span aria-hidden="true">/</span><span>Contact</span>
        </nav>
        <header className="public-heading">
          <span className="eyebrow">WE’RE HERE TO HELP</span>
          <h1>Contact PunjabSkillUp</h1>
          <p>Send a note about learning, teaching, or using your account.</p>
        </header>
        <div className="contact-layout">
          <ContactForm />
          <aside className="contact-aside">
            <h2>Prefer email?</h2>
            {/* TODO: Replace the placeholder support address with the active support email. */}
            <p>Email <a href="mailto:support@YOUR-DOMAIN">support@YOUR-DOMAIN</a> (TODO: update this address).</p>
          </aside>
        </div>
      </article>
    </PublicPageShell>
  );
}
