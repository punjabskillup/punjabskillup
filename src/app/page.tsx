import { Suspense } from "react";
import RisingArrow from "@/components/RisingArrow";
import Link from "next/link";
import {
  BrainCircuit,
  Check,
  CodeXml,
  Gift,
  LockKeyhole,
  Megaphone,
  MessageCircle,
  MonitorSmartphone,
  Video,
} from "lucide-react";
import { AuthFeedback } from "@/components/auth-feedback";
import { HeroTiltCard } from "@/components/hero-tilt-card";
import { JsonLd } from "@/components/json-ld";
import { Navbar, SignInTrigger } from "@/components/navbar";
import { PublicFooter } from "@/components/public-footer";
import Reveal from "@/components/Reveal";
import { GlassCard } from "@/components/ui/glass-card";
import { IconBadge } from "@/components/ui/icon-badge";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Metadata } from "next";
import { absoluteUrl, publicMetadata } from "@/lib/seo";

const homeTitle = "PunjabSkillUp: Learn Skills Online with AI Study Help";
const homeDescription =
  "Learn practical skills online with PunjabSkillUp. Video courses in AI and web development, with an AI study helper in every lecture.";

export const metadata: Metadata = publicMetadata(homeTitle, homeDescription, "/");

const homeStructuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "PunjabSkillUp",
    alternateName: ["Punjab Skill Up", "punjabskillup"],
    url: absoluteUrl("/"),
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PunjabSkillUp",
    url: absoluteUrl("/"),
    logo: absoluteUrl("/icon.png"),
    description: homeDescription,
    // TODO: Add PunjabSkillUp's official social profile URLs here.
    sameAs: [],
  },
];

const benefits = [
  {
    icon: Video,
    tone: "primary",
    title: "Video lessons",
    description: "Learn from clear, practical courses.",
  },
  {
    icon: MonitorSmartphone,
    tone: "primary",
    title: "Learn anywhere",
    description: "Pick up on any device, at your pace.",
  },
  {
    icon: Gift,
    tone: "primary",
    title: "Free to start",
    description: "Create an account and explore for free.",
  },
  {
    icon: BrainCircuit,
    tone: "teal",
    title: "AI study help",
    description: "Get support as you work through lessons.",
  },
] as const;

const courseSkeletons = ["blue", "teal", "saffron", "rose"] as const;

function NeuralNetwork() {
  return (
    <svg
      className="hero-network"
      viewBox="0 0 160 90"
      aria-hidden="true"
    >
      <g className="hero-network-lines">
        <path d="M16 16 72 9M16 16 72 33M16 16 72 57M16 16 72 81M16 45 72 9M16 45 72 33M16 45 72 57M16 45 72 81M16 74 72 9M16 74 72 33M16 74 72 57M16 74 72 81M80 9 144 29M80 9 144 61M80 33 144 29M80 33 144 61M80 57 144 29M80 57 144 61M80 81 144 29M80 81 144 61" />
      </g>
      <g className="hero-network-nodes">
        <circle className="n n-1" cx="16" cy="16" r="5" />
        <circle className="n n-2" cx="16" cy="45" r="5" />
        <circle className="n n-3" cx="16" cy="74" r="5" />
        <circle className="n n-4" cx="80" cy="9" r="5" />
        <circle className="n n-5" cx="80" cy="57" r="5" />
        <circle className="n n-6" cx="80" cy="81" r="5" />
        <circle className="n n-7" cx="144" cy="29" r="5" />
        <circle className="n n-8" cx="144" cy="61" r="5" />
      </g>
      <circle className="hero-network-node-saffron n n-9" cx="80" cy="33" r="5" />
    </svg>
  );
}

function WebIllustration() {
  return (
    <svg className="hero-card-illustration hero-web-illustration" viewBox="0 0 84 56" aria-hidden="true">
      <rect x="3" y="5" width="78" height="46" rx="8" fill="rgba(255,255,255,.92)" />
      <circle cx="13" cy="14" r="2.5" fill="#F07878" />
      <circle cx="21" cy="14" r="2.5" fill="#F2B84B" />
      <circle cx="29" cy="14" r="2.5" fill="#59B89D" />
      <rect className="cl cl-1" x="13" y="25" width="38" height="4" rx="2" fill="#2347D5" />
      <rect className="cl cl-2" x="13" y="33" width="54" height="4" rx="2" fill="#0F766E" />
      <rect className="cl cl-3" x="13" y="41" width="31" height="4" rx="2" fill="#D98400" />
    </svg>
  );
}

function MarketingIllustration() {
  return (
    <svg className="hero-card-illustration hero-marketing-illustration" viewBox="0 0 76 48" aria-hidden="true">
      <rect className="b b-1" x="7" y="28" width="11" height="15" rx="4" fill="#FFD27A" />
      <rect className="b b-2" x="24" y="19" width="11" height="24" rx="4" fill="#F6B94F" />
      <rect className="b b-3" x="41" y="11" width="11" height="32" rx="4" fill="#E99C24" />
      <rect className="b b-4" x="58" y="4" width="11" height="39" rx="4" fill="#D98400" />
    </svg>
  );
}

function SpokenIllustration() {
  return (
    <svg className="hero-card-illustration hero-spoken-illustration" viewBox="0 0 112 48" aria-hidden="true">
      <rect className="wv wv-1" x="5" y="20" width="7" height="8" rx="3.5" fill="#C2386A" />
      <rect className="wv wv-2" x="19" y="14" width="7" height="20" rx="3.5" fill="#D94E80" />
      <rect className="wv wv-3" x="33" y="8" width="7" height="32" rx="3.5" fill="#E56D98" />
      <rect className="wv wv-4" x="47" y="3" width="7" height="42" rx="3.5" fill="#C2386A" />
      <rect className="wv wv-5" x="61" y="7" width="7" height="34" rx="3.5" fill="#DA4F81" />
      <rect className="wv wv-6" x="75" y="12" width="7" height="24" rx="3.5" fill="#EA739B" />
      <rect className="wv wv-7" x="89" y="16" width="7" height="16" rx="3.5" fill="#D94E80" />
      <rect className="wv wv-8" x="103" y="19" width="7" height="10" rx="3.5" fill="#C2386A" />
    </svg>
  );
}

function HeroCourseCards() {
  return (
    <div className="hero-bento-grid">
      <HeroTiltCard className="hero-card-ai" href="/topics/ai-and-ml" label="Explore AI and ML courses">
        <IconBadge tone="teal">
          <BrainCircuit className="lucide-icon" strokeWidth={1.8} />
        </IconBadge>
        <NeuralNetwork />
        <div className="hero-card-copy">
          <h2>AI and ML</h2>
          <p>Machine learning, Python and real-world AI skills</p>
        </div>
      </HeroTiltCard>
      <HeroTiltCard className="hero-card-web" href="/topics/web-development" label="Explore web development courses">
        <div className="hero-card-topline">
          <IconBadge tone="primary">
            <CodeXml className="lucide-icon" strokeWidth={1.8} />
          </IconBadge>
          <WebIllustration />
        </div>
        <div className="hero-card-copy">
          <h2>Web Development</h2>
          <p>HTML, CSS, JavaScript and modern frameworks</p>
        </div>
      </HeroTiltCard>
      <HeroTiltCard className="hero-card-marketing">
        <div className="hero-card-topline">
          <IconBadge tone="saffron">
            <Megaphone className="lucide-icon" strokeWidth={1.8} />
          </IconBadge>
          <MarketingIllustration />
        </div>
        <div className="hero-card-copy">
          <h2>Digital Marketing</h2>
          <p>SEO, social media and online ads</p>
        </div>
      </HeroTiltCard>
      <HeroTiltCard className="hero-card-spoken">
        <IconBadge tone="rose">
          <MessageCircle className="lucide-icon" strokeWidth={1.8} />
        </IconBadge>
        <div className="hero-card-copy">
          <h2>Spoken English</h2>
          <p>Speak with confidence at work and in interviews</p>
        </div>
        <SpokenIllustration />
      </HeroTiltCard>
    </div>
  );
}

function BenefitStrip() {
  return (
    <section className="benefits-section content-wrap" aria-label="Learning benefits">
      <Reveal variant="up" className="benefits-card">
        {benefits.map(({ icon: Icon, tone, title, description }, index) => (
          <Reveal
            variant="up"
            delay={index * 100}
            className="benefit-item"
            key={title}
          >
            <IconBadge tone={tone}>
              <Icon className="lucide-icon" strokeWidth={1.8} />
            </IconBadge>
            <div>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
          </Reveal>
        ))}
      </Reveal>
    </section>
  );
}

function PopularCourses() {
  return (
    <section className="popular-section content-wrap" aria-label="Popular courses">
      <Reveal variant="up">
        <SectionHeading
          className="popular-heading"
          eyebrow="START LEARNING"
          title="Popular courses"
        />
      </Reveal>
      <div className="popular-course-lock">
        <div className="course-skeleton-grid" aria-hidden="true">
          {courseSkeletons.map((tone, index) => (
            <Reveal
              variant="up"
              delay={(index + 1) * 100}
              className="course-skeleton-card"
              key={tone}
            >
              <span className={`course-skeleton-thumbnail course-skeleton-${tone}`} />
              <span className="course-skeleton-lines">
                <i />
                <i />
                <i />
              </span>
            </Reveal>
          ))}
        </div>
        <div className="popular-lock-overlay">
          <IconBadge tone="primary" className="popular-lock-icon">
            <LockKeyhole className="lucide-icon" strokeWidth={1.8} />
          </IconBadge>
          <h2 id="popular-heading">Sign in to view courses</h2>
          <p>Join free to explore practical courses and start learning.</p>
          <SignInTrigger className="popular-sign-in-button">
            Sign in or join free
          </SignInTrigger>
        </div>
      </div>
    </section>
  );
}

function StudySmarter() {
  return (
    <section className="study-section" aria-labelledby="study-heading">
      <div className="study-inner content-wrap">
        <Reveal variant="left" className="study-copy" threshold={0.01}>
          <span className="study-eyebrow">LEARN WITH CONFIDENCE</span>
          <h2 id="study-heading">Stuck on a topic? Ask the lecture.</h2>
          <p>
            Get help with the ideas that matter, grounded in what your instructor
            taught.
          </p>
          <ul className="study-benefits">
            <li>
              <Check aria-hidden="true" />
              <Reveal variant="up" delay={0}>Summaries of every lecture</Reveal>
            </li>
            <li>
              <Check aria-hidden="true" />
              <Reveal variant="up" delay={100}>Answers based on what was taught</Reveal>
            </li>
            <li>
              <Check aria-hidden="true" />
              <Reveal variant="up" delay={200}>Quizzes to check what you learned</Reveal>
            </li>
          </ul>
          <nav className="study-topic-links" aria-label="Explore learning topics">
            <Link href="/topics/ai-and-ml">AI and ML courses</Link>
            <Link href="/topics/web-development">Web development courses</Link>
          </nav>
        </Reveal>
        <Reveal variant="right" delay={150} threshold={0.01}>
          <GlassCard className="study-example" aria-label="Example lecture question">
            <div className="study-example-heading">
              <IconBadge tone="teal">
                <MessageCircle className="lucide-icon" strokeWidth={1.8} />
              </IconBadge>
              <div>
                <strong>Ask the lecture</strong>
                <span>Study help, based on your lesson</span>
              </div>
              <span className="study-example-label">Example</span>
            </div>
            <p className="study-message study-message-user">
              What is the main idea from this lesson?
            </p>
            <p className="study-message study-message-answer">
              It explains how consistent practice helps turn new skills into habits.
            </p>
          </GlassCard>
        </Reveal>
      </div>
    </section>
  );
}

function TeachBand() {
  return (
    <section className="teach-section content-wrap" aria-labelledby="teach-heading">
      <Reveal variant="scale">
        <div className="teach-card">
          <div>
            <span className="teach-eyebrow">FOR INSTRUCTORS</span>
            <h2 id="teach-heading">Share your skills. Teach on PunjabSkillUp.</h2>
            <p>Help more people build practical skills for what comes next.</p>
          </div>
          <Link className="teach-button" href="/instructor">
            Become an instructor
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

export default function Home() {
  return (
    <main>
      {homeStructuredData.map((data) => <JsonLd key={data["@type"]} data={data} />)}
      <Navbar />

      <section className="hero-section bg-hero relative overflow-hidden isolate">
        <RisingArrow />
        <div className="hero-mobile-orbs lg:hidden" aria-hidden="true">
          <span className="hero-orb hero-orb-saffron-one" />
          <span className="hero-orb hero-orb-teal" />
          <span className="hero-orb hero-orb-blue" />
          <span className="hero-orb hero-orb-pink" />
          <span className="hero-orb hero-orb-saffron-two" />
        </div>
        <div className="hero-inner relative z-10 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="hero-copy">
            <Suspense fallback={null}>
              <AuthFeedback />
            </Suspense>
            <h1>Learn skills that move your career forward</h1>
            <p className="hero-description">
              Practical video courses from experienced instructors. Learn at your own pace,
              on any device.
            </p>
            <div className="hero-action">
              <SignInTrigger className="hero-cta">Explore courses</SignInTrigger>
              <span className="hero-desktop-note">Free to join</span>
              <span className="hero-mobile-note">
                Free to join. Already a member?{" "}
                <SignInTrigger className="hero-sign-in">Sign in</SignInTrigger>
              </span>
            </div>
          </div>
          <HeroCourseCards />
        </div>
      </section>

      <BenefitStrip />
      <PopularCourses />
      <StudySmarter />
      <TeachBand />

      <PublicFooter />
    </main>
  );
}
