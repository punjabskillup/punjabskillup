import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import {
  BenefitsSection,
  PopularCoursesSection,
  StudySmarterSection,
  TeachBand,
} from "@/components/home-sections";
import { PublicFooter } from "@/components/public-footer";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, publicMetadata } from "@/lib/seo";

const homeTitle = "PunjabSkillUp: Learn Skills Online with AI Study Help";
const homeDescription =
  "Learn practical skills online with PunjabSkillUp. Video courses in AI and web development, with an AI study helper in every lecture.";

export const dynamic = "force-dynamic";

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

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (user && !error) {
    redirect("/explore");
  }

  return (
    <main>
      {homeStructuredData.map((data) => (
        <JsonLd key={data["@type"]} data={data} />
      ))}
      <div className="home-hero-frame">
        <Navbar />
        <Hero />
      </div>
      <BenefitsSection />
      <PopularCoursesSection />
      <StudySmarterSection />
      <TeachBand />
      <PublicFooter />
    </main>
  );
}
