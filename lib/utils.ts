import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes.
 * @param inputs - Class values to be merged.
 * @returns A string of merged class names.
 */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

/**
 * Validates the input object to ensure it has the required fields and correct types.
 * @param input - The input object to validate.
 * @returns An object containing a boolean `isValid` and an array of `errors`.
 */
export const validateInput = (input: unknown): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Check if input is an object
    if (typeof input !== "object" || input === null) {
        errors.push("Invalid input. Expected an object.");
        return { isValid: false, errors };
    }

    // Type assertion to ensure input is treated as an object with optional properties
    const inputObj = input as { message?: unknown; userId?: unknown };

    // Validate 'message' field
    if (typeof inputObj.message !== "string") {
        errors.push("Invalid input type. 'message' must be a string.");
    } else if (!inputObj.message.trim()) {
        errors.push("Empty input field. 'message' must not be empty.");
    }

    // Validate 'userId' field
    if (typeof inputObj.userId !== "string") {
        errors.push("Invalid input type. 'userId' must be a string.");
    } else if (!inputObj.userId.trim()) {
        errors.push("Empty input field. 'userId' must not be empty.");
    }

    return { isValid: errors.length === 0, errors };
};