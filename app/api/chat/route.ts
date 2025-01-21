import { NextResponse } from "next/server";
import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";

// Initialize the Generative AI model
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

// Session management
const userSessions: { [userId: string]: ChatSession } = {};
const sessionLastAccessed: { [userId: string]: number } = {};

// Constants
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Interface definitions
interface ChatResponse {
    message: string;
    conversationId: string;
    timestamp: string;
}

interface ErrorResponse {
    error: string;
    code?: string;
    timestamp: string;
}

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
const cleanupSessions = () => {
    const now = Date.now();
    Object.keys(sessionLastAccessed).forEach(userId => {
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
            return NextResponse.json({
                error: "Invalid content type. Expected application/json",
                code: "INVALID_CONTENT_TYPE",
                timestamp: new Date().toISOString()
            }, { status: 415 });
        }

        // Parse and validate request body
        let body;
        try {
            body = await req.json();
        } catch (error) {
            console.error("JSON parsing error:", error);
            return NextResponse.json({
                error: "Invalid JSON format in request body",
                code: "INVALID_JSON",
                timestamp: new Date().toISOString()
            }, { status: 400 });
        }

        // Validate request body structure
        if (!body || typeof body !== "object") {
            return NextResponse.json({
                error: "Invalid request format",
                code: "INVALID_REQUEST",
                timestamp: new Date().toISOString()
            }, { status: 400 });
        }

        // Validate input types
        if (typeof body.message !== "string" || typeof body.userId !== "string") {
            return NextResponse.json({
                error: "Invalid input types. 'message' and 'userId' must be strings.",
                code: "INVALID_INPUT_TYPE",
                timestamp: new Date().toISOString()
            }, { status: 400 });
        }

        const message = body.message.trim();
        const userId = body.userId.trim();

        // Validate non-empty inputs
        if (!message || !userId) {
            return NextResponse.json({
                error: "Empty input fields. 'message' and 'userId' must not be empty.",
                code: "EMPTY_INPUT",
                timestamp: new Date().toISOString()
            }, { status: 400 });
        }

        // Manage chat session
        let chat = userSessions[userId];
        if (!chat) {
            chat = model.startChat({
                history: [],
                generationConfig: { maxOutputTokens: 1000 }
            });
            userSessions[userId] = chat;
        }
        sessionLastAccessed[userId] = Date.now();

        // Process request with timeout
        const result = await Promise.race([
            chat.sendMessage(message),
            new Promise<never>((_, reject) => 
                setTimeout(() => reject(new TimeoutError()), REQUEST_TIMEOUT)
            )
        ]);

        // Validate API response structure
        if (typeof result !== "object" || 
            !result?.response || 
            typeof result.response.text !== "function") {
            throw new InvalidAPIResponseError("Unexpected response structure from API");
        }

        const aiMessage = result.response.text();

        // Validate response content
        if (!aiMessage || typeof aiMessage !== "string") {
            throw new InvalidAPIResponseError("Empty or invalid response content");
        }

        // Return successful response
        return NextResponse.json({
            message: aiMessage,
            conversationId: userId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("Error processing request:", error);

        const errorResponse: ErrorResponse = {
            error: "An unexpected error occurred.",
            code: "INTERNAL_ERROR",
            timestamp: new Date().toISOString()
        };

        let statusCode = 500;

        if (error instanceof TimeoutError) {
            errorResponse.error = "Request timed out. Please try again.";
            errorResponse.code = "TIMEOUT";
            statusCode = 408;
        } else if (error instanceof InvalidAPIResponseError) {
            errorResponse.error = error.message;
            errorResponse.code = "INVALID_API_RESPONSE";
            statusCode = 502;
        } else if (error instanceof Error) {
            if ("code" in error) {
                switch (error.code) {
                    case "429":
                        errorResponse.error = "Too many requests. Please wait before trying again.";
                        errorResponse.code = "RATE_LIMIT_EXCEEDED";
                        statusCode = 429;
                        break;
                    case "500":
                        errorResponse.error = "Internal server error. Please try again later.";
                        errorResponse.code = "SERVER_ERROR";
                        statusCode = 502;
                        break;
                }
            }
            
            if (error.name === "ResponseError") {
                errorResponse.error = "API response error. Please check your request.";
                errorResponse.code = "API_ERROR";
                statusCode = 502;
            }
        }

        return NextResponse.json(errorResponse, { status: statusCode });
    }
}