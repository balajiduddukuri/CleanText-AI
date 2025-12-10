import { GoogleGenAI } from "@google/genai";

// Initialize the API client
// Note: In a production client-side app, you would proxy this or use a user-provided key.
// Per instructions, we assume process.env.API_KEY is available.
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateSampleMarkdown = async (): Promise<string> => {
  if (!apiKey) {
    console.warn("No API Key found. Returning static sample.");
    return `# Sample Project Alpha

**Status:** In Progress
*Priority:* High

## Executive Summary
The **Project Alpha** initiative aims to reduce latency by 50%. 
> "Speed is a feature." - Tech Lead

### Key Components
1. **Frontend:** React + Tailwind
2. **Backend:** Node.js API
3. **Database:** PostgreSQL

## Code Example
To start the server, run:
\`\`\`bash
npm install
npm start
\`\`\`

Visit [Our Dashboard](https://dashboard.example.com) for metrics.

---
*Generated for testing purposes.*`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Generate a complex snippet of Markdown text (about 150 words) that includes: bold, italic, headings, a code block, a blockquote, a list, a table, and a link. Make the content about a fictional futuristic sci-fi technology.",
    });
    return response.text || '';
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate sample markdown.");
  }
};

export const smartPolishText = async (text: string): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing. Cannot perform AI polish.");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an expert copy editor. I will provide text that was stripped from Markdown. It may have awkward spacing, missing transitions, or residual artifacts. 
      
      Your task:
      1. Improve flow and readability.
      2. Fix punctuation and capitalization.
      3. Do NOT add new information.
      4. Keep the tone close to the original.
      5. Return ONLY the polished plain text.

      Input Text:
      ${text}`,
    });
    return response.text || text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};