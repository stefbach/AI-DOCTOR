import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Removes control characters and backticks from a string to prevent
 * prompt injection or command execution.
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") return ""
  return input.replace(/[\u0000-\u001F\u007F`]/g, "")
}

/**
 * Recursively sanitizes all string properties within an object or array.
 */
export function sanitizeObject<T>(data: T): T {
  if (typeof data === "string") {
    return sanitizeInput(data) as unknown as T
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeObject(item)) as unknown as T
  }
  if (data && typeof data === "object") {
    const result: any = {}
    for (const [key, value] of Object.entries(data)) {
      result[key] = sanitizeObject(value as any)
    }
    return result
  }
  return data
}
