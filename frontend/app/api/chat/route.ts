import { openai } from "@ai-sdk/openai"
import { streamText, convertToCoreMessages } from "ai"
import { getDatabase } from "@/lib/mongodb"
import type { NextRequest } from "next/server"

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { messages, chatId, userId } = await req.json()

    const db = await getDatabase()
    const chatsCollection = db.collection("chats")

    // Convert messages to core format for AI SDK
    const coreMessages = convertToCoreMessages(messages)

    // Handle context window - keep last 20 messages for context
    const contextMessages = coreMessages.slice(-20)

    const result = streamText({
      model: openai("gpt-4o"),
      messages: contextMessages,
      system: `You are ChatGPT, a helpful AI assistant created by OpenAI. You are knowledgeable, helpful, and aim to provide accurate and useful responses to user queries.`,
      temperature: 0.7,
      maxTokens: 4000,
    })

    // Save chat to database
    if (chatId && userId) {
      await chatsCollection.updateOne(
        { id: chatId, userId },
        {
          $set: {
            messages: messages,
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      )
    }

    return result.toDataStreamResponse()
  } catch (error) {
    console.error("Chat API error:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
