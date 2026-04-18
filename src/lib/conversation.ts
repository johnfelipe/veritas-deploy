import { db } from "./db";
import { chatSessions } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface ExtractedReportData {
  type?: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface ConversationContext {
  id: string;
  sessionId: string;
  messages: ChatMessage[];
  intent?: "question" | "report" | "follow_up";
  extractedData?: ExtractedReportData;
}

// Get or create a conversation for a session
export async function getOrCreateConversation(
  sessionId: string
): Promise<ConversationContext> {
  const existing = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.sessionId, sessionId))
    .limit(1);

  if (existing.length > 0) {
    const session = existing[0];
    return {
      id: session.id,
      sessionId: session.sessionId,
      messages: JSON.parse(session.messages) as ChatMessage[],
      intent: session.intent as "question" | "report" | "follow_up" | undefined,
      extractedData: session.extractedData
        ? JSON.parse(session.extractedData)
        : undefined,
    };
  }

  // Create new conversation
  const id = uuidv4();
  const now = new Date();

  await db.insert(chatSessions).values({
    id,
    sessionId,
    messages: JSON.stringify([]),
    intent: null,
    extractedData: null,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id,
    sessionId,
    messages: [],
  };
}

// Update conversation with new message and data
export async function updateConversation(
  conversationId: string,
  messages: ChatMessage[],
  intent?: string,
  extractedData?: ExtractedReportData
): Promise<void> {
  await db
    .update(chatSessions)
    .set({
      messages: JSON.stringify(messages),
      intent: intent || null,
      extractedData: extractedData ? JSON.stringify(extractedData) : null,
      updatedAt: new Date(),
    })
    .where(eq(chatSessions.id, conversationId));
}

// Clear conversation
export async function clearConversation(sessionId: string): Promise<void> {
  await db.delete(chatSessions).where(eq(chatSessions.sessionId, sessionId));
}

// Build the system prompt for the chatbot
export function buildChatSystemPrompt(): string {
  return `You are Veritas, an AI assistant for the Universidad de Antioquia (UdeA), Medellín, Colombia. You help students, staff and visitors:

1. Answer questions about university services, reglamentos, programs, and policies
2. Help file campus issue reports (potholes in internal roads, graffiti, streetlights, noise, parking, damaged sidewalks)
3. Check on the status of previously filed reports

When helping with reports, you should:
- Ask clarifying questions to gather: issue type, location (e.g. "Bloque 9", "Biblioteca Central"), description
- Be conversational and friendly
- Once you have enough info, offer to file the report
- You can respond in Spanish or English depending on the user's language

Available issue types: pothole, noise, parking, graffiti, streetlight, sidewalk, other

You have access to these tools:
- file_report: Create a new campus issue report
- search_knowledge_base: Search UdeA documents for answers
- get_report_status: Check status of a report by ID

Always be helpful, concise, and professional. If you don't know something, direct users to contact Universidad de Antioquia directly at udea.edu.co.`;
}

// Define the tools for function calling
export const chatTools = [
  {
    name: "file_report",
    description:
      "File a new civic issue report. Use this when the user wants to report a problem like a pothole, graffiti, broken streetlight, etc.",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: [
            "pothole",
            "noise",
            "parking",
            "graffiti",
            "streetlight",
            "sidewalk",
            "other",
          ],
          description: "The type of civic issue",
        },
        description: {
          type: "string",
          description: "Detailed description of the issue",
        },
        address: {
          type: "string",
          description:
            "The address or campus location of the issue (e.g., 'Bloque 9, Ciudad Universitaria, Universidad de Antioquia, Medellín')",
        },
      },
      required: ["type", "description", "address"],
    },
  },
  {
    name: "search_knowledge_base",
    description:
      "Search the city's knowledge base to answer questions about services, bylaws, and policies",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_report_status",
    description: "Check the status of a previously filed report using its ID",
    parameters: {
      type: "object",
      properties: {
        reportId: {
          type: "string",
          description: "The report ID to check",
        },
      },
      required: ["reportId"],
    },
  },
];
