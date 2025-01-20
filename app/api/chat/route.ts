import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Generative AI model outside the handler for reuse
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

interface ErrorResponse {
    error: string;
}

interface GeminiErrorResponse {
    response?: {
        status?: number;
    };
    message: string;
}

export async function POST(req: Request): Promise<NextResponse<ErrorResponse | { message: string }>> {
    try {
        const body = await req.json();

        // Input Validation
        if (!body || typeof body !== 'object' || !('message' in body)) {
            return NextResponse.json(
                { error: "Missing or invalid request body. Must include a 'message' field." },
                { status: 400 }
            );
        }

        const message = String(body.message).trim();
        if (!message) {
            return NextResponse.json(
                { error: "Message cannot be empty or whitespace only." },
                { status: 400 }
            );
        }

        // Initialize the chat session
        const chat = model.startChat();

        // Send the user's message to the model
        const result = await chat.sendMessage(message);
        const response = result.response;

        // Extract the response
        const aiMessage = response.text();

        // Return the response
        return NextResponse.json({ message: aiMessage });
    } catch (error) {
        console.error("Error processing request:", error);

        let errorMessage = "An unexpected error occurred.";
        let statusCode = 500;

        // Check if the error is an instance of Error
        if (error instanceof Error) {
            errorMessage = error.message;

            // Handle rate-limiting errors
            if (error.message.includes("429")) {
                errorMessage = "Too many requests. Please wait a while before trying again.";
                statusCode = 429;
            }
        }

        // Check if the error is a GeminiErrorResponse
        if (isGeminiErrorResponse(error)) {
            const geminiError = error as GeminiErrorResponse;
            errorMessage = `API Error: ${geminiError.message} (Status: ${geminiError.response?.status || 'Unknown'})`;
            statusCode = geminiError.response?.status || 500;
        }

        return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }
}

// Helper function to check if the error is a GeminiErrorResponse
function isGeminiErrorResponse(error: unknown): error is GeminiErrorResponse {
    return (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
    );
}