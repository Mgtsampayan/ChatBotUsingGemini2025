import { NextResponse } from "next/server";
import { GoogleGenerativeAI, ChatSession, GenerateContentResult } from "@google/generative-ai";

// Initialize the Generative AI model
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

// Object to store chat sessions for each user (in-memory storage for demonstration purposes)
const userSessions: { [userId: string]: ChatSession } = {};

// Enhanced interface definitions
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

// Add session cleanup utility
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const cleanupSessions = () => {
    const now = Date.now();
    Object.entries(userSessions).forEach(([userId, session]) => {
        if ((session as any).lastAccessed && now - (session as any).lastAccessed > SESSION_TIMEOUT) {
            delete userSessions[userId];
        }
    });
};

export async function POST(req: Request): Promise<NextResponse<ErrorResponse | ChatResponse>> {
    try {
        // Periodic cleanup of inactive sessions
        cleanupSessions();
        
        const body = await req.json();

        // Enhanced input validation
        if (!body?.message?.trim() || !body?.userId?.trim()) {
            return NextResponse.json({
                error: "Missing or invalid request body. Must include non-empty 'message' and 'userId' fields.",
                code: 'INVALID_INPUT',
                timestamp: new Date().toISOString()
            }, { status: 400 });
        }

        const message = String(body.message).trim();
        const userId = String(body.userId).trim();

        // Retrieve or create a chat session for the user
        let chat = userSessions[userId];
        if (!chat) {
            chat = model.startChat();
            userSessions[userId] = chat;
        }
        
        // Update session last accessed time
        (chat as any).lastAccessed = Date.now();

        // Send the user's message to the model with timeout
        const result = await Promise.race([
            chat.sendMessage(message),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), 30000)
            )
        ]) as GenerateContentResult;

        const aiMessage = result.response.text();

        // Return enhanced response
        return NextResponse.json({
            message: aiMessage,
            conversationId: userId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("Error processing request:", error);

        const errorResponse: ErrorResponse = {
            error: "An unexpected error occurred.",
            code: 'INTERNAL_ERROR',
            timestamp: new Date().toISOString()
        };

        let statusCode = 500;

        if (error instanceof Error) {
            if (error.message.includes("429")) {
                errorResponse.error = "Too many requests. Please wait a while before trying again.";
                errorResponse.code = 'RATE_LIMIT_EXCEEDED';
                statusCode = 429;
            } else if (error.message === 'Request timeout') {
                errorResponse.error = "Request timed out. Please try again.";
                errorResponse.code = 'TIMEOUT';
                statusCode = 408;
            }
        }

        return NextResponse.json(errorResponse, { status: statusCode });
    }
}