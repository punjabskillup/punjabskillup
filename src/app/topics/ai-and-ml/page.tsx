import type { Metadata } from "next";
import { TopicPage, type TopicPageContent } from "@/components/topic-page";
import { publicMetadata } from "@/lib/seo";

const description =
  "Learn machine learning, Python and real-world AI skills with video lessons and an AI study helper. Join PunjabSkillUp free to explore courses.";

export const metadata: Metadata = publicMetadata(
  "AI and ML Courses | PunjabSkillUp",
  description,
  "/topics/ai-and-ml",
);

const content: TopicPageContent = {
  title: "AI and ML courses",
  path: "/topics/ai-and-ml",
  intro:
    "Build a practical understanding of artificial intelligence and machine learning, from core ideas to working with data and models. Learn through focused lessons and revisit concepts as you practise.",
  learning: [
    "Machine learning basics and common ways models learn from examples",
    "Python foundations for working with data and building simple programs",
    "Preparing, exploring and handling data responsibly",
    "Choosing an approach for a straightforward learning problem",
    "Building, testing and using machine learning models",
    "Interpreting results and recognising the limits of a model",
  ],
  audience:
    "These lessons are for curious beginners and developing practitioners who want a clearer path into AI and machine learning. You can start with the fundamentals and build your confidence step by step.",
  faqs: [
    {
      question: "Do I need prior machine learning experience?",
      answer: "No prior machine learning experience is needed to begin with the introductory ideas. Each learner should check individual course prerequisites before starting.",
    },
    {
      question: "Will I use Python?",
      answer: "Python is one of the practical topics covered in this area. Course lessons explain which tools and setup are needed for their activities.",
    },
    {
      question: "How can the AI study helper help?",
      answer: "You can use it to review a lecture summary, ask questions grounded in the lesson, or practise with a quiz based on what was taught.",
    },
  ],
};

export default function AiAndMlTopicPage() {
  return <TopicPage content={content} />;
}
