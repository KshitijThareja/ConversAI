import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { MessagePart } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts a preview string from a message content (string or MessagePart[]).
 * - If string: returns first 20 chars with "..." if truncated.
 * - If MessagePart[]: returns first text part (up to 20 chars), or file name if only file, or empty string.
 */
export function getMessagePreviewText(content: string | MessagePart[]): string {
  if (typeof content === "string") {
    const trimmed = content.trim()
    if (trimmed.length <= 20) return trimmed
    return trimmed.slice(0, 20) + "..."
  }
  if (Array.isArray(content)) {
    const textPart = content.find((p) => p.type === "text") as { type: 'text'; text: string } | undefined
    if (textPart) {
      const text = textPart.text.trim()
      if (text.length <= 20) return text
      return text.slice(0, 20) + "..."
    }
    const filePart = content.find((p) => p.type === "file") as { type: 'file'; name: string } | undefined
    if (filePart) {
      const fileName = filePart.name
      if (fileName.length <= 20) return `[File] ${fileName}`
      return `[File] ${fileName.slice(0, 17)}...`
    }
  }
  return ""
}
