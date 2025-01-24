import { NextResponse } from "next/server";

// Define the ErrorResponse type
type ErrorResponse = {
    error: string;
    code: string;
    timestamp: string;
};

// Define custom error classes (if not already defined elsewhere)
class TimeoutError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "TimeoutError";
    }
}

class InvalidAPIResponseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InvalidAPIResponseError";
    }
}

// Main error handler function
export const handleError = (error: unknown): NextResponse => {
    console.error("Error processing request:", error);

    // Default error response
    const errorResponse: ErrorResponse = {
        error: "An unexpected error occurred.",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
    };

    let statusCode = 500;

    // Handle specific error types
    if (error instanceof TimeoutError) {
        errorResponse.error = "Request timed out. Please try again.";
        errorResponse.code = "TIMEOUT";
        statusCode = 408;
    } else if (error instanceof InvalidAPIResponseError) {
        errorResponse.error = error.message;
        errorResponse.code = "INVALID_API_RESPONSE";
        statusCode = 502;
    } else if (error instanceof Error) {
        // Handle errors with a `code` property
        if ("code" in error && typeof error.code === "string") {
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

        // Handle specific error names
        if (error.name === "ResponseError") {
            errorResponse.error = "API response error. Please check your request.";
            errorResponse.code = "API_ERROR";
            statusCode = 502;
        }
    }

    // Return the error response as a JSON response
    return NextResponse.json(errorResponse, { status: statusCode });
};