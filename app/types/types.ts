// types.ts
export interface ChatRequest {
    message: string;
    userId: string;
}

export interface ChatResponse {
    message: string;
    conversationId: string;
    timestamp: string;
}

export interface ErrorResponse {
    error: string;
    code?: string;
    timestamp: string;
}