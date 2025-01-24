import { NextResponse } from "next/server";
import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";
import { handleError } from "@/lib/errorHandler";
import { validateInput } from "@/lib/utils";
import { ChatRequest, ChatResponse, ErrorResponse } from "../../types/types";

// Initialize the Generative AI model
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

// Session management
const userSessions: { [userId: string]: ChatSession } = {};
const sessionLastAccessed: { [userId: string]: number } = {};

// Constants
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Custom error classes
class TimeoutError extends Error {
    constructor() {
        super("Request timed out");
        this.name = "TimeoutError";
    }
}

class InvalidAPIResponseError extends Error {
    constructor(message: string = "Invalid API response") {
        super(message);
        this.name = "InvalidAPIResponseError";
    }
}

// Session cleanup utility
const cleanupSessions = (): void => {
    const now = Date.now();
    Object.keys(sessionLastAccessed).forEach((userId) => {
        if (now - sessionLastAccessed[userId] > SESSION_TIMEOUT) {
            delete userSessions[userId];
            delete sessionLastAccessed[userId];
        }
    });
};

export async function POST(req: Request): Promise<NextResponse<ChatResponse | ErrorResponse>> {
    try {
        // Clean up old sessions
        cleanupSessions();

        // Validate request content type
        const contentType = req.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
            return NextResponse.json(
                {
                    error: "Invalid content type. Expected application/json",
                    code: "INVALID_CONTENT_TYPE",
                    timestamp: new Date().toISOString(),
                },
                { status: 415 }
            );
        }

        // Parse and validate request body
        let body: ChatRequest;
        try {
            body = await req.json();
        } catch (error) {
            console.error("JSON parsing error:", error);
            return NextResponse.json(
                {
                    error: "Invalid JSON format in request body",
                    code: "INVALID_JSON",
                    timestamp: new Date().toISOString(),
                },
                { status: 400 }
            );
        }

        // Validate request body structure
        const { isValid, errors } = validateInput(body);
        if (!isValid) {
            return NextResponse.json(
                {
                    error: errors.join(", "),
                    code: "INVALID_INPUT",
                    timestamp: new Date().toISOString(),
                },
                { status: 400 }
            );
        }

        const { message, userId } = body;

        // Manage chat session
        let chat = userSessions[userId];
        if (!chat) {
            chat = model.startChat({
                history: [],
                generationConfig: { maxOutputTokens: 1000 },
            });
            userSessions[userId] = chat;
        }
        sessionLastAccessed[userId] = Date.now();

        // Process request with timeout
        const result = await Promise.race([
            chat.sendMessage(message),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new TimeoutError()), REQUEST_TIMEOUT)
            ),
        ]);

        // Validate API response structure
        if (
            typeof result !== "object" ||
            !("response" in result) ||
            typeof result.response.text !== "function"
        ) {
            throw new InvalidAPIResponseError("Unexpected response structure from API");
        }

        const aiMessage = await result.response.text();

        // Validate response content
        if (!aiMessage || typeof aiMessage !== "string") {
            throw new InvalidAPIResponseError("Empty or invalid response content");
        }

        // Return successful response
        return NextResponse.json({
            message: aiMessage,
            conversationId: userId,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return handleError(error) as NextResponse<ErrorResponse>;
    }
}