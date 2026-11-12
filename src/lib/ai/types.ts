export type Source = {
  chunkIndex: number;
  content: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
};

export type QuizQuestion = {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
};
