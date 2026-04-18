import { generateText } from "./gemini";
import {
  findSimilarDocuments,
  hasRelevantContext,
  formatDocumentsForContext,
  type SimilarDocument,
} from "./embeddings";
import type { Language } from "@/components/LanguageSelector";

export interface RAGSource {
  id: number;
  title: string;
  url: string;
  excerpt: string;
  similarity: number;
}

export interface RAGResponse {
  answer: string;
  sources: RAGSource[];
  confidence: "high" | "medium" | "low" | "none";
  hasReliableSource: boolean;
}

// Language names for the prompt
const languageNames: Record<Language, string> = {
  en: "English",
  fr: "Spanish",
};

// Build the RAG prompt
function buildRAGPrompt(
  question: string,
  context: string,
  language: Language
): string {
  const langName = languageNames[language];

  return `You are an information assistant for the Universidad de Antioquia (UdeA), Medellín, Colombia. Answer ONLY using the provided sources.
If the sources don't contain enough information, say "I cannot find reliable information about this."

SOURCES:
${context}

USER QUESTION: ${question}

Respond with:
1. A clear answer (1-4 paragraphs max)
2. Actionable next steps as bullets (if applicable)
3. For each claim, cite the source as [Source N]

IMPORTANT:
- Never invent information. If unsure, recommend contacting Universidad de Antioquia directly.
- Keep the answer focused and practical.
- Respond in ${langName}.`;
}

// Build fallback response when no sources found
function buildFallbackResponse(language: Language): string {
  const fallbacks: Record<Language, string> = {
    en: "I cannot find reliable information about this topic in my sources. For accurate information, please contact Universidad de Antioquia directly:\n\n- **Phone**: +57 (604) 219 8332\n- **Website**: udea.edu.co\n- **In Person**: Ciudad Universitaria, Calle 67 No. 53-108, Medellín",
    fr: "No encuentro información confiable sobre este tema en mis fuentes. Para información precisa, por favor contacta a la Universidad de Antioquia directamente:\n\n- **Teléfono**: +57 (604) 219 8332\n- **Sitio web**: udea.edu.co\n- **Presencial**: Ciudad Universitaria, Calle 67 No. 53-108, Medellín",
  };

  return fallbacks[language] || fallbacks.en;
}

// Main RAG function
export async function askQuestion(
  question: string,
  language: Language = "en"
): Promise<RAGResponse> {
  // Find similar documents
  const similarDocs = await findSimilarDocuments(question, 5, 0.3);

  // Check if we have reliable sources
  if (!hasRelevantContext(similarDocs, 0.4)) {
    return {
      answer: buildFallbackResponse(language),
      sources: [],
      confidence: "none",
      hasReliableSource: false,
    };
  }

  // Format context
  const context = formatDocumentsForContext(similarDocs);

  // Build and send prompt
  const prompt = buildRAGPrompt(question, context, language);
  const answer = await generateText(prompt);

  // Extract sources
  const sources: RAGSource[] = similarDocs.map(({ document, similarity }, index) => ({
    id: index + 1,
    title: document.title,
    url: document.url,
    excerpt: document.content.slice(0, 200) + "...",
    similarity,
  }));

  // Determine confidence based on similarity scores
  const maxSimilarity = similarDocs[0]?.similarity || 0;
  let confidence: RAGResponse["confidence"];
  if (maxSimilarity >= 0.7) {
    confidence = "high";
  } else if (maxSimilarity >= 0.5) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    answer,
    sources,
    confidence,
    hasReliableSource: true,
  };
}
