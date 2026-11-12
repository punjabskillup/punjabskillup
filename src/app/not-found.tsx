import type { Metadata } from "next";
import Link from "next/link";
import { PublicPageShell } from "@/components/public-page-shell";

export const metadata: Metadata = {
  title: "Page not found | PunjabSkillUp",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <PublicPageShell>
      <section className="public-content not-found-content">
        <span className="eyebrow">404</span>
        <h1>We couldn’t find that page</h1>
        <p>The address may be outdated, or the page may have moved.</p>
        <Link className="primary-button" href="/">Return to the PunjabSkillUp homepage</Link>
      </section>
    </PublicPageShell>
  );
}
