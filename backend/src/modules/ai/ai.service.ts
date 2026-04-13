import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env";
import { GeneratedRoadmapModel } from "../../models/generated-roadmap.model";

const gemini = env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(env.GEMINI_API_KEY)
  : null;

export async function generateRoadmap(userId: string, goal: string): Promise<string> {
  if (!gemini) {
    return "AI integration disabled. Set GEMINI_API_KEY to enable roadmap generation.";
  }

  const model = gemini.getGenerativeModel({ model: env.GEMINI_MODEL });
  const result = await model.generateContent([
    `
You are "StudentOS AI", an expert career and DSA mentor.

Your task is to generate a highly practical, structured 4-week roadmap for a student.

IMPORTANT RULES:
- Be concise, actionable, and realistic
- Do NOT give generic advice
- Focus on execution, not theory
- Each week must include specific tasks
- Assume the student can dedicate 2–4 hours daily

INPUT:
Goal: ${goal}

OUTPUT FORMAT (STRICT):

Week 1:
- Topics to Learn:
  - [specific topics]
- DSA Practice:
  - [number + type of problems, e.g., "10 Array problems (Easy/Medium)"]
- Tasks:
  - [clear actionable steps]
- Outcome:
  - [what the student should achieve]

Week 2:
(same structure)

Week 3:
(same structure)

Week 4:
(same structure)

FINAL SECTION:
- Key Focus Areas:
  - [3–5 bullet points]
- Common Mistakes to Avoid:
  - [3–5 bullet points]

ADDITIONAL INSTRUCTIONS:
- If the goal is DSA: include topics like arrays, graphs, DP, etc.
- If the goal is development: include projects, tech stack, and implementation steps
- Mix learning + practice + revision
- Progress difficulty each week
- Keep it realistic and student-friendly
`
  ]);
  const roadmap = result.response.text() || "No roadmap generated";

  await GeneratedRoadmapModel.create({
    userId,
    prompt: goal,
    roadmap
  });

  return roadmap;
}
