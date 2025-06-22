import { NextRequest, NextResponse } from "next/server"
import { google } from "@ai-sdk/google"
import { streamText } from "ai"
import { MongoClient } from "mongodb"
import MemoryClient from "mem0ai"

const uri = process.env.MONGODB_URI!
const client = new MongoClient(uri)
const mem0 = new MemoryClient({ apiKey: process.env.MEM0_API_KEY! });

const MAX_TOKENS = 128000

async function connectToDatabase() {
  await client.connect()
  return client.db("chatdb")
}

async function getChatHistory(userId: string, chatId?: string) {
  const db = await connectToDatabase()
  const collection = db.collection("chats")
  const query = chatId ? { userId, chatId } : { userId }
  const chats = await collection.find(query).toArray()
  
  // Clean up empty messages from the database
  for (const chat of chats) {
    if (chat.messages && Array.isArray(chat.messages)) {
      const cleanedMessages = chat.messages.filter(msg => 
        msg.content && msg.content.trim() !== ''
      )
      
      if (cleanedMessages.length !== chat.messages.length) {
        await collection.updateOne(
          { _id: chat._id },
          { $set: { messages: cleanedMessages } }
        )
        console.log(`Cleaned up ${chat.messages.length - cleanedMessages.length} empty messages from chat ${chat.chatId}`)
      }
    }
  }
  
  return chats
}

async function saveMessage(userId: string, chatId: string, message: any) {
  const db = await connectToDatabase()
  const collection = db.collection("chats")
  
  // If this is a new chat (no chatId or chatId is "default"), create a unique chatId
  const finalChatId = chatId === "default" || !chatId ? `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : chatId
  
  // If this is the first message in a new chat, create the chat document
  if (message.role === "user" && (!chatId || chatId === "default")) {
    const title = message.content.slice(0, 50) + (message.content.length > 50 ? "..." : "")
    await collection.updateOne(
      { userId, chatId: finalChatId },
      { 
        $setOnInsert: { 
          userId, 
          chatId: finalChatId, 
          title,
          createdAt: new Date()
        },
        $push: { messages: { ...message, createdAt: new Date() } }
      },
      { upsert: true }
    )
    return finalChatId
  } else {
    // Add message to existing chat
    await collection.updateOne(
      { userId, chatId: finalChatId },
      { $push: { messages: { ...message, createdAt: new Date() } } },
      { upsert: true }
    )
    return finalChatId
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const chatId = searchParams.get("chatId")
    
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: "Missing userId" }), { status: 400 })
    }

    if (chatId) {
      // Fetch specific chat messages
      const chats = await getChatHistory(userId, chatId)
      const chat = chats[0]
      if (!chat) {
        return new NextResponse(JSON.stringify({ error: "Chat not found" }), { status: 404 })
      }
      
      // Return messages for the specific chat
      return new NextResponse(JSON.stringify({ 
        id: chat.chatId || chat._id?.toString(),
        title: chat.title || (chat.messages?.[0]?.content?.slice(0, 30) || "Untitled Chat"),
        messages: chat.messages || []
      }), { 
        headers: { "Content-Type": "application/json" } 
      })
    } else {
      // Fetch all chats for the user
      const chats = await getChatHistory(userId)
      // Return only id and title for sidebar
      const chatList = chats.map(chat => ({
        id: chat.chatId || chat._id?.toString(),
        title: chat.title || (chat.messages?.[0]?.content?.slice(0, 30) || "Untitled Chat")
      }))
      return new NextResponse(JSON.stringify(chatList), { 
        headers: { "Content-Type": "application/json" } 
      })
    }
  } catch (error) {
    console.error("Error in GET /api/chat:", error)
    return new NextResponse(JSON.stringify({ error: "Internal server error" }), { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("API route called")
    const { messages, chatId, userId } = await req.json()
    console.log("Request data:", { messages: messages?.length, chatId, userId })

    // Save the user message first to create/get the chat
    const userMessage = messages[messages.length - 1]
    const actualChatId = await saveMessage(userId, chatId, userMessage)
    console.log("Saved user message, chatId:", actualChatId)

    // Fetch chat history and manage context window
    const history = await getChatHistory(userId, actualChatId)
    console.log("Chat history fetched:", history.length)
    
    // Clean up empty messages from the loaded history
    const cleanedHistory = history.map(chat => ({
      ...chat,
      messages: chat.messages?.filter((msg: any) => msg.content && msg.content.trim() !== '') || []
    }))
    
    const allMessages = [...(cleanedHistory[0]?.messages || []), ...messages]
    console.log("All messages after cleanup:", allMessages.length)
    const trimmedMessages = trimMessagesToTokenLimit(allMessages, MAX_TOKENS)
    console.log("Trimmed messages:", trimmedMessages.length)

    // Save new message to memory with mem0
    if (trimmedMessages.length > 0) {
      try {
        const validMessages = trimmedMessages
          .filter(msg => msg && msg.role && msg.content && typeof msg.content === 'string')
          .map(msg => ({ 
            role: msg.role, 
            content: msg.content 
          }))
        
        if (validMessages.length > 0) {
          await mem0.add(validMessages, { user_id: userId })
          console.log("Saved to mem0")
        }
      } catch (error) {
        console.error('Error saving to mem0:', error)
        // Continue execution even if mem0 fails
      }
    }

    console.log("About to call streamText with messages:", trimmedMessages)
    
    // Filter out messages with empty content before sending to API
    const validMessagesForAPI = trimmedMessages.filter(msg => 
      msg.content && msg.content.trim() !== '' && 
      msg.role && (msg.role === 'user' || msg.role === 'assistant')
    )
    
    console.log("Valid messages for API:", validMessagesForAPI)
    
    // Check if we have any valid messages
    if (validMessagesForAPI.length === 0) {
      console.log("No valid messages found, returning default response")
      return new NextResponse("Hello! I'm here to help. How can I assist you today?", {
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      })
    }
    
    // Stream response using Gemini
    try {
      console.log("Google API Key configured:", !!process.env.GOOGLE_GENERATIVE_AI_API_KEY)
      
      const { textStream } = await streamText({
        model: google("gemini-2.0-flash"),
        messages: validMessagesForAPI,
        maxTokens: 4096,
      })
      
      console.log("streamText called successfully, creating stream")

      // Stream response to client and collect full response
      let fullResponse = ""
      const stream = new ReadableStream({
        async start(controller) {
          try {
            console.log("Stream start function called")
            let chunkCount = 0
            for await (const chunk of textStream) {
              chunkCount++
              console.log(`Received chunk ${chunkCount}:`, chunk)
              fullResponse += chunk
              controller.enqueue(new TextEncoder().encode(chunk))
            }
            console.log(`Streaming completed after ${chunkCount} chunks, fullResponse:`, fullResponse)
            controller.close()
            
            // Save full response after streaming is complete
            await saveMessage(userId, actualChatId, {
              role: "assistant",
              content: fullResponse,
              createdAt: new Date(),
            })
            console.log("Message saved to database")
          } catch (error) {
            console.error("Error in streaming:", error)
            controller.error(error)
          }
        },
      })

      console.log("Returning stream response")
      return new NextResponse(stream, {
        headers: { 
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        },
      })
    } catch (error) {
      console.error("Error calling streamText:", error)
      return new NextResponse("Sorry, I'm having trouble connecting to my AI service right now. Please try again later.", {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      })
    }
  } catch (error) {
    console.error("Error in POST handler:", error)
    return new NextResponse(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}

// Helper function to trim messages based on token limit
function trimMessagesToTokenLimit(messages: any[], maxTokens: number): any[] {
  let tokenCount = 0
  const trimmed = []

  for (let i = messages.length - 1; i >= 0; i--) {
    const messageTokens = estimateTokens(messages[i].content)
    if (tokenCount + messageTokens > maxTokens) break
    tokenCount += messageTokens
    trimmed.unshift(messages[i])
  }

  return trimmed
}

// Rough token estimation (simplified)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}