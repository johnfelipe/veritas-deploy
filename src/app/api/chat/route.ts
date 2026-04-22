import { NextRequest } from "next/server";
import { GoogleGenerativeAI, SchemaType, FunctionResponsePart } from "@google/generative-ai";
import { db } from "@/lib/db";
import { reports } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { logAction } from "@/lib/audit";
import { askQuestion } from "@/lib/rag";
import { geocodeAddress } from "@/lib/geocode";
import {
  getOrCreateConversation,
  updateConversation,
  buildChatSystemPrompt,
  ChatMessage,
  ExtractedReportData,
} from "@/lib/conversation";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Tool execution handlers
async function executeFileReport(args: {
  type: string;
  description: string;
  address: string;
}): Promise<{ success: boolean; reportId?: string; error?: string }> {
  try {
    // Geocode the address
    let latitude = 6.2676;
    let longitude = -75.5685;

    try {
      const geocoded = await geocodeAddress(args.address);
      if (geocoded) {
        latitude = geocoded.lat;
        longitude = geocoded.lng;
      }
    } catch {
      // Use default coordinates for Universidad de Antioquia (Ciudad Universitaria)
    }

    const reportId = uuidv4();
    const now = new Date();

    await db.insert(reports).values({
      id: reportId,
      type: args.type as
        | "pothole"
        | "noise"
        | "parking"
        | "graffiti"
        | "streetlight"
        | "sidewalk"
        | "other",
      description: args.description,
      address: args.address,
      latitude,
      longitude,
      status: "new",
      severity: "medium",
      createdAt: now,
      updatedAt: now,
    });

    // Log to audit chain
    await logAction("report", {
      reportId,
      type: args.type,
      source: "chatbot",
    });

    return { success: true, reportId };
  } catch (error) {
    console.error("Error filing report:", error);
    return { success: false, error: "Failed to file report" };
  }
}

async function executeSearchKnowledgeBase(
  args: { query: string },
  language: "en" | "fr" = "fr"
): Promise<{ answer: string; hasSource: boolean }> {
  try {
    const result = await askQuestion(args.query, language);
    return {
      answer: result.answer,
      hasSource: result.hasReliableSource,
    };
  } catch (error) {
    console.error("Error searching knowledge base:", error);
    const fallback =
      language === "en"
        ? "I couldn't search the knowledge base at this time. Please try again."
        : "No pude consultar la base de conocimiento en este momento. Por favor intenta de nuevo.";
    return {
      answer: fallback,
      hasSource: false,
    };
  }
}

async function executeGetReportStatus(args: {
  reportId: string;
}): Promise<{ found: boolean; status?: string; type?: string }> {
  try {
    const result = await db
      .select()
      .from(reports)
      .where(eq(reports.id, args.reportId))
      .limit(1);

    if (result.length === 0) {
      return { found: false };
    }

    return {
      found: true,
      status: result[0].status,
      type: result[0].type,
    };
  } catch (error) {
    console.error("Error getting report status:", error);
    return { found: false };
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      message,
      sessionId,
      clearHistory,
      language: rawLanguage,
    } = await request.json();
    const language: "en" | "fr" = rawLanguage === "en" ? "en" : "fr";

    if (!message || !sessionId) {
      return new Response(
        JSON.stringify({ error: "Message and sessionId are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get or create conversation
    const conversation = await getOrCreateConversation(sessionId);

    // Clear history if requested
    if (clearHistory) {
      conversation.messages = [];
    }

    // Add user message to conversation
    const userMessage: ChatMessage = {
      role: "user",
      content: message,
      timestamp: Date.now(),
    };
    conversation.messages.push(userMessage);

    // Build the chat with function declarations
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: buildChatSystemPrompt(language),
      tools: [
        {
          functionDeclarations: [
            {
              name: "file_report",
              description:
                "File a new civic issue report when the user wants to report a problem",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  type: {
                    type: SchemaType.STRING,
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
                    type: SchemaType.STRING,
                    description: "Detailed description of the issue",
                  },
                  address: {
                    type: SchemaType.STRING,
                    description: "The address or location of the issue",
                  },
                },
                required: ["type", "description", "address"],
              },
            },
            {
              name: "search_knowledge_base",
              description:
                "Search city documents to answer questions about services, bylaws, policies",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  query: {
                    type: SchemaType.STRING,
                    description: "The search query",
                  },
                },
                required: ["query"],
              },
            },
            {
              name: "get_report_status",
              description: "Check the status of a previously filed report",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  reportId: {
                    type: SchemaType.STRING,
                    description: "The report ID to check",
                  },
                },
                required: ["reportId"],
              },
            },
          ],
        },
      ],
    });

    // Convert conversation history to Gemini format
    const chatHistory = conversation.messages.slice(0, -1).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Start chat with history
    const chat = model.startChat({
      history: chatHistory as Array<{
        role: "user" | "model";
        parts: Array<{ text: string }>;
      }>,
    });

    // Send message and get response
    let response = await chat.sendMessage(message);
    let result = response.response;

    // Handle function calls
    let functionCalls = result.functionCalls();
    let finalResponse = "";
    let filedReportId: string | undefined;

    while (functionCalls && functionCalls.length > 0) {
      const functionResponses: FunctionResponsePart[] = [];

      for (const call of functionCalls) {
        let functionResult: object;

        switch (call.name) {
          case "file_report":
            const reportResult = await executeFileReport(
              call.args as {
                type: string;
                description: string;
                address: string;
              }
            );
            functionResult = reportResult;
            if (reportResult.success) {
              filedReportId = reportResult.reportId;
            }
            break;

          case "search_knowledge_base":
            functionResult = await executeSearchKnowledgeBase(
              call.args as { query: string },
              language
            );
            break;

          case "get_report_status":
            functionResult = await executeGetReportStatus(
              call.args as { reportId: string }
            );
            break;

          default:
            functionResult = { error: "Unknown function" };
        }

        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: functionResult,
          },
        });
      }

      // Send function results back to get final response
      response = await chat.sendMessage(functionResponses);
      result = response.response;
      functionCalls = result.functionCalls();
    }

    finalResponse = result.text();

    // Add assistant message to conversation
    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: finalResponse,
      timestamp: Date.now(),
    };
    conversation.messages.push(assistantMessage);

    // Determine intent from conversation
    let intent: "question" | "report" | "follow_up" | undefined;
    if (filedReportId) {
      intent = "report";
    } else if (
      message.toLowerCase().includes("report") ||
      message.toLowerCase().includes("problem")
    ) {
      intent = "report";
    } else {
      intent = "question";
    }

    // Update conversation in database
    await updateConversation(
      conversation.id,
      conversation.messages,
      intent,
      conversation.extractedData
    );

    // Log to audit chain
    await logAction("qa", {
      source: "chatbot",
      sessionId,
      messageCount: conversation.messages.length,
    });

    return new Response(
      JSON.stringify({
        response: finalResponse,
        filedReportId,
        messageCount: conversation.messages.length,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process message",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
