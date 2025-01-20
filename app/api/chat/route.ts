import { NextResponse } from "next/server";
import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";

// Initialize the Generative AI model
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

// Object to store chat sessions for each user (in-memory storage for demonstration purposes)
const userSessions: { [userId: string]: ChatSession } = {};

interface ErrorResponse {
    error: string;
}

export async function POST(req: Request): Promise<NextResponse<ErrorResponse | { message: string }>> {
    try {
        const body = await req.json();

        // Input Validation
        if (!body || typeof body !== 'object' || !('message' in body) || !('userId' in body)) {
            return NextResponse.json(
                { error: "Missing or invalid request body. Must include 'message' and 'userId' fields." },
                { status: 400 }
            );
        }

        const message = String(body.message).trim();
        const userId = String(body.userId).trim();

        if (!message || !userId) {
            return NextResponse.json(
                { error: "Message and userId cannot be empty or whitespace only." },
                { status: 400 }
            );
        }

        // Retrieve or create a chat session for the user
        let chat = userSessions[userId];
        if (!chat) {
            chat = model.startChat();
            userSessions[userId] = chat;
        }

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

        if (error instanceof Error) {
            errorMessage = error.message;

            if (error.message.includes("429")) {
                errorMessage = "Too many requests. Please wait a while before trying again.";
                statusCode = 429;
            }
        }

        return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }
}