import Link from "next/link";
import Reveal from "@/components/Reveal";

export function PublicFooter() {
  return (
    <Reveal variant="fade">
      <footer className="site-footer">
        <div className="footer-inner public-footer-inner home-content">
          <div className="footer-brand-block">
            <Link className="brand-link" href="/" aria-label="PunjabSkillUp home">
              <span className="brand" aria-label="PunjabSkillUp">
                Punjab<span>Skill</span>Up
              </span>
            </Link>
            <p className="footer-tagline">
              Skills for Punjab. Learn online with AI study help.
            </p>
          </div>
          <nav className="footer-link-group" aria-label="Topics">
            <h2>Topics</h2>
            <Link href="/topics/ai-and-ml">AI and ML courses</Link>
            <Link href="/topics/web-development">Web development courses</Link>
          </nav>
          <nav className="footer-link-group" aria-label="Company">
            <h2>Company</h2>
            <Link href="/about">About</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/teach">Teach with us</Link>
            <Link href="/contact">Contact</Link>
          </nav>
          <nav className="footer-link-group" aria-label="Legal">
            <h2>Legal</h2>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </nav>
        </div>
        <div className="footer-bottom home-content">PunjabSkillUp</div>
      </footer>
    </Reveal>
  );
}
