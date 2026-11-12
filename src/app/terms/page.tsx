import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/json-ld";
import { PublicPageShell } from "@/components/public-page-shell";
import { publicMetadata } from "@/lib/seo";

const title = "Terms of Use | PunjabSkillUp";
const description = "Read the terms for using PunjabSkillUp, including account responsibilities, learning content and acceptable platform use.";

export const metadata: Metadata = publicMetadata(title, description, "/terms");

export default function TermsPage() {
  return (
    <PublicPageShell>
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: title, path: "/terms" }]} />
      <article className="public-content">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span>Terms</span></nav>
        <header className="public-heading"><span className="eyebrow">POLICIES</span><h1>Terms of Use</h1><p>Guidelines for using PunjabSkillUp.</p></header>
        <div className="public-prose">
          <p>By accessing PunjabSkillUp, you agree to use the platform lawfully and respectfully. Keep your account credentials secure and provide accurate information when creating an account or contacting us.</p>
          <h2>Learning content</h2>
          <p>Lessons and study tools are provided for learning and practice. Respect the rights of instructors and other users; do not copy, redistribute, or misuse content without permission or a lawful basis.</p>
          <h2>Acceptable use</h2>
          <p>Do not attempt to disrupt the service, access another person’s account, submit harmful or unlawful material, or interfere with platform security. We may limit access when needed to protect users and the service.</p>
          <h2>Service changes</h2>
          <p>Features may change as PunjabSkillUp develops. These terms should be reviewed and replaced with approved legal terms before public launch.</p>
        </div>
      </article>
    </PublicPageShell>
  );
}
