import { ProfessorImage } from "@/components/professor-image";
import HeroCarousel from "@/components/HeroCarousel";
import { SignInTrigger } from "@/components/navbar";

export function Hero() {
  return (
    <section className="hero-section" aria-label="Learn with PunjabSkillUp">
      <div className="hero-container">
        <div className="hero-screen">
          <HeroCarousel />
        </div>

        <div className="hero-mobile-copy">
          <p>
            Practical video courses from experienced instructors.
          </p>
          <div className="hero-actions">
            <SignInTrigger className="hero-cta">Explore courses</SignInTrigger>
            <span>Free to join</span>
          </div>
        </div>

        <ProfessorImage />
      </div>
    </section>
  );
}
