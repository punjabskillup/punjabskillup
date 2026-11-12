import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/json-ld";
import { PublicPageShell } from "@/components/public-page-shell";
import { publicMetadata } from "@/lib/seo";

const title = "Privacy Policy | PunjabSkillUp";
const description = "Learn what information PunjabSkillUp uses for accounts, learning features and contact requests, and how to ask about your data.";

export const metadata: Metadata = publicMetadata(title, description, "/privacy");

export default function PrivacyPage() {
  return (
    <PublicPageShell>
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: title, path: "/privacy" }]} />
      <article className="public-content">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span>Privacy</span></nav>
        <header className="public-heading"><span className="eyebrow">POLICIES</span><h1>Privacy Policy</h1><p>How information is used to provide PunjabSkillUp.</p></header>
        <div className="public-prose">
          <p>PunjabSkillUp uses account information, such as your email and profile details, to provide sign-in and learning features. Course progress and enrollment information may be used to show your learning space.</p>
          <h2>Learning and contact information</h2>
          <p>When you use AI study features, the information needed to answer a question or create lesson support is processed to provide that feature. Messages submitted through the contact form include the name, email address and message you provide.</p>
          <h2>Service providers and choices</h2>
          <p>Service providers help operate authentication, storage and learning features. They process information as needed to provide those services. You can contact the PunjabSkillUp team to ask about your account or information.</p>
          <h2>Policy review</h2>
          <p>This starter policy must be reviewed and updated with the final service-provider, retention and legal details before public launch.</p>
        </div>
      </article>
    </PublicPageShell>
  );
}
