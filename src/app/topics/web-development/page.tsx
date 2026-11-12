import type { Metadata } from "next";
import { TopicPage, type TopicPageContent } from "@/components/topic-page";
import { publicMetadata } from "@/lib/seo";

const description =
  "Learn HTML, CSS, JavaScript and modern frameworks step by step. Join PunjabSkillUp free to start your web development journey.";

export const metadata: Metadata = publicMetadata(
  "Web Development Courses | PunjabSkillUp",
  description,
  "/topics/web-development",
);

const content: TopicPageContent = {
  title: "Web development courses",
  path: "/topics/web-development",
  intro:
    "Learn how the web is built, from structuring a page to adding styles and interactive behaviour. Develop your understanding through step-by-step lessons and projects that bring the ideas together.",
  learning: [
    "Structure accessible pages with HTML",
    "Style responsive layouts with CSS",
    "Use JavaScript to add interaction and behaviour",
    "Understand how modern web frameworks organise applications",
    "Connect interface pieces into complete experiences",
    "Plan, build and refine practical web projects",
  ],
  audience:
    "This topic is for beginners exploring their first web page and learners who want to strengthen their front-end foundations. Follow the concepts in sequence and use each project to practise what you have learned.",
  faqs: [
    {
      question: "What should I learn first?",
      answer: "Start with HTML to understand page structure, then build on that foundation with CSS and JavaScript. Individual courses may suggest their own starting points.",
    },
    {
      question: "Do I need special software?",
      answer: "A modern web browser and a code editor are commonly used for practice. Check each course for any additional setup instructions.",
    },
    {
      question: "What does the AI study helper do?",
      answer: "It can summarise lecture material, answer questions using lesson context, and create quizzes to help you check your understanding.",
    },
  ],
};

export default function WebDevelopmentTopicPage() {
  return <TopicPage content={content} />;
}
