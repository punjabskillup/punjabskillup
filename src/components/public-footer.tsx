import Link from "next/link";
import Reveal from "@/components/Reveal";

export function PublicFooter() {
  return (
    <Reveal variant="fade">
      <footer className="site-footer">
        <div className="footer-inner public-footer-inner">
          <div className="footer-brand-block">
            <Link className="brand-link" href="/" aria-label="PunjabSkillUp home">
              <span className="brand" aria-label="PunjabSkillUp">
                Punjab<span>Skill</span>Up
              </span>
            </Link>
            <span className="footer-tagline">Skills for Punjab.</span>
          </div>
          <nav className="footer-link-group" aria-label="Topics">
            <h2>Topics</h2>
            <Link href="/topics/ai-and-ml">AI and ML courses</Link>
            <Link href="/topics/web-development">Web development courses</Link>
          </nav>
          <nav className="footer-link-group" aria-label="Company">
            <h2>Company</h2>
            <Link href="/about">About PunjabSkillUp</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/teach">Teach with us</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </nav>
        </div>
      </footer>
    </Reveal>
  );
}
