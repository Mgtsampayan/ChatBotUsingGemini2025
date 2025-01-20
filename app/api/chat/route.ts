import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Generative AI model outside the handler for reuse
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Input Validation
        if (!body || !body.message) {
            return NextResponse.json(
                {
                    error:
                        "Missing or invalid request body. Must include a 'message' field.",
                },
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
    } catch (error: any) {
        console.error("Error processing request:", error);

        let errorMessage = "An unexpected error occurred.";

        if (error instanceof Error && error.message.includes("429")) {
            errorMessage =
                "Too many requests. Please wait a while before trying again.";
        } else if (error?.response?.status) {
            errorMessage = `API Error: ${error.message} (Status: ${error?.response?.status})`;
        }

        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
