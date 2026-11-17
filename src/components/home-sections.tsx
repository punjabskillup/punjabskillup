import {
  BrainCircuit,
  Check,
  Gift,
  LockKeyhole,
  MonitorSmartphone,
  Video,
} from "lucide-react";
import Link from "next/link";
import { SignInTrigger } from "@/components/navbar";
import Reveal from "@/components/Reveal";

const benefits = [
  {
    icon: Video,
    title: "Video lessons",
    description: "Learn step by step from real instructors.",
  },
  {
    icon: MonitorSmartphone,
    title: "Learn anywhere",
    description: "Phone, tablet or laptop. Pick up where you left off.",
  },
  {
    icon: Gift,
    title: "Free to start",
    description: "Join for free and begin learning today.",
  },
  {
    icon: BrainCircuit,
    title: "AI study help",
    description: "Summaries, answers and quizzes in every course.",
  },
] as const;

const skeletonCards = ["rose", "grey", "grey", "rose"] as const;

export function BenefitsSection() {
  return (
    <section className="home-section benefits-section" aria-label="Learning benefits">
      <div className="home-content">
        <div className="benefit-card benefit-card-on-load">
          {benefits.map(({ icon: Icon, title, description }) => (
            <div className="benefit-item" key={title}>
              <Icon className="benefit-icon" aria-hidden="true" strokeWidth={1.8} />
              <div>
                <h2>{title}</h2>
                <p>{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PopularCoursesSection() {
  return (
    <section className="home-section courses-section" aria-labelledby="popular-courses-heading">
      <div className="home-content">
        <Reveal>
          <h2 className="popular-courses-heading" id="popular-courses-heading">
            Popular courses
          </h2>
        </Reveal>
        <Reveal className="popular-course-lock">
          <div className="course-skeleton-grid" aria-hidden="true">
            {skeletonCards.map((tone, index) => (
              <div className="course-skeleton-card" key={`${tone}-${index}`}>
                <span className={`course-skeleton-thumbnail course-skeleton-${tone}`} />
                <span className="course-skeleton-lines">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            ))}
          </div>
          <div className="popular-lock-overlay">
            <LockKeyhole className="popular-lock-icon" aria-hidden="true" strokeWidth={1.8} />
            <h3>Sign in to view courses</h3>
            <SignInTrigger className="popular-sign-in-button">
              Sign in or join free
            </SignInTrigger>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function StudySmarterSection() {
  return (
    <section className="study-section" aria-labelledby="study-heading">
      <div className="study-inner home-content">
        <Reveal variant="left" className="study-copy">
          <span className="study-eyebrow">STUDY SMARTER</span>
          <h2 id="study-heading">Stuck on a topic? Ask the lecture.</h2>
          <p>
            Every course includes an AI study helper built on your instructor&apos;s own
            lectures.
          </p>
          <ul className="study-benefits">
            <li><Check aria-hidden="true" />Summaries of every lecture</li>
            <li><Check aria-hidden="true" />Answers based on what was taught</li>
            <li><Check aria-hidden="true" />Quizzes to check what you learned</li>
          </ul>
        </Reveal>
        <Reveal variant="right" className="study-example">
          <div className="study-example-heading">
            <strong>Lecture helper</strong>
            <span>Example</span>
          </div>
          <p className="study-message study-message-user">Summarise this lecture</p>
          <p className="study-message study-message-answer">
            Here are the key points from this lesson…
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export function TeachBand() {
  return (
    <section className="teach-section home-content">
      <Reveal className="teach-card">
        <div>
          <h2>Share your skills. Teach on PunjabSkillUp.</h2>
          <p>Upload your lectures and reach learners across Punjab.</p>
        </div>
        <Link className="teach-button" href="/teach">
          Become an instructor
        </Link>
      </Reveal>
    </section>
  );
}
