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
      const cleanedMessages = chat.messages.filter(hasNonEmptyContent)
      
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
  
  // Check if this chat already exists in the database
  const existingChat = await collection.findOne({ userId, chatId })
  
  // If this is a new chat (no chatId or chatId is "default"), create a unique chatId
  const finalChatId = chatId === "default" || !chatId ? `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : chatId
  
  // If this is the first message in a new chat (no existing chat found)
  if (!existingChat && message.role === "user") {
    // Extract text content for title, handling both string and MessagePart[] formats
    let titleText = ""
    if (typeof message.content === 'string') {
      titleText = message.content
    } else if (Array.isArray(message.content)) {
      const textParts = message.content.filter((part: any) => part.type === 'text')
      titleText = textParts.map((part: any) => part.text).join(' ')
    }
    
    const title = titleText.slice(0, 50) + (titleText.length > 50 ? "..." : "")
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

async function deleteChat(userId: string, chatId: string) {
  const db = await connectToDatabase()
  const collection = db.collection("chats")
  
  const result = await collection.deleteOne({ userId, chatId })
  return result.deletedCount > 0
}

async function renameChat(userId: string, chatId: string, newTitle: string) {
  const db = await connectToDatabase()
  const collection = db.collection("chats")
  
  const result = await collection.updateOne(
    { userId, chatId },
    { $set: { title: newTitle } }
  )
  return result.modifiedCount > 0
}

async function updateMessage(userId: string, chatId: string, messageIndex: number, newContent: string) {
  const db = await connectToDatabase()
  const collection = db.collection("chats")
  
  // Get the current chat to find the message
  const chat = await collection.findOne({ userId, chatId })
  if (!chat || !chat.messages || !chat.messages[messageIndex]) {
    throw new Error("Message not found")
  }
  
  // Store original content if not already stored
  const originalContent = chat.messages[messageIndex].originalContent || chat.messages[messageIndex].content
  
  // Create a new version before making changes
  const newVersion: any = {
    id: `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    messages: [...chat.messages],
    createdAt: new Date(),
    isCurrent: false
  }
  
  // Update the message
  const result = await collection.updateOne(
    { userId, chatId },
    { 
      $set: { 
        [`messages.${messageIndex}.content`]: newContent,
        [`messages.${messageIndex}.edited`]: true,
        [`messages.${messageIndex}.originalContent`]: originalContent,
        currentVersionId: newVersion.id
      },
      $push: { versions: newVersion }
    }
  )
  
  return result.modifiedCount > 0
}

async function regenerateFromMessage(userId: string, chatId: string, messageIndex: number) {
  const db = await connectToDatabase()
  const collection = db.collection("chats")
  
  // Get the current chat
  const chat = await collection.findOne({ userId, chatId })
  if (!chat || !chat.messages || !chat.messages[messageIndex]) {
    throw new Error("Message not found")
  }
  
  // Get messages up to the specified message (inclusive)
  const messagesUpToIndex = chat.messages.slice(0, messageIndex + 1)
  
  // Remove any subsequent messages (they will be regenerated)
  const result = await collection.updateOne(
    { userId, chatId },
    { $set: { messages: messagesUpToIndex } }
  )
  
  return result.modifiedCount > 0
}

async function switchToVersion(userId: string, chatId: string, versionId: string) {
  const db = await connectToDatabase()
  const collection = db.collection("chats")
  
  // Get the chat and find the specified version
  const chat = await collection.findOne({ userId, chatId })
  if (!chat || !chat.versions) {
    throw new Error("Chat or versions not found")
  }
  
  const version = chat.versions.find((v: any) => v.id === versionId)
  if (!version) {
    throw new Error("Version not found")
  }
  
  // Update the chat to use this version and mark it as current
  const result = await collection.updateOne(
    { userId, chatId },
    { 
      $set: { 
        messages: version.messages,
        currentVersionId: versionId
      },
      $unset: { "versions.$[].isCurrent": "" }
    },
    {
      arrayFilters: [{ "version.id": versionId }]
    }
  )
  
  // Update the isCurrent flag for the selected version
  await collection.updateOne(
    { userId, chatId, "versions.id": versionId },
    { $set: { "versions.$.isCurrent": true } }
  )
  
  return result.modifiedCount > 0
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
        messages: chat.messages || [],
        versions: chat.versions || [],
        currentVersionId: chat.currentVersionId || null
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

    // Save the user message only if it's new (not already present at that index)
    let actualChatId = chatId;
    const db = await connectToDatabase();
    const collection = db.collection("chats");
    const chat = await collection.findOne({ userId, chatId });
    let lastIndex = -1;
    let lastDbMessage = null;
    if (chat && Array.isArray(chat.messages) && chat.messages.length > 0) {
      lastIndex = chat.messages.length - 1;
      lastDbMessage = chat.messages[lastIndex];
    }
    const userMessage = messages[messages.length - 1];

    // Only save if the last message is not already present in the DB
    if (
      !lastDbMessage ||
      lastDbMessage.content !== userMessage.content ||
      lastDbMessage.role !== userMessage.role
    ) {
      actualChatId = await saveMessage(userId, chatId, userMessage);
      console.log("Saved user message, chatId:", actualChatId);
    } else {
      console.log("User message already present, skipping save.");
    }

    // Fetch chat history and manage context window
    const history = await getChatHistory(userId, actualChatId)
    console.log("Chat history fetched:", history.length)
    
    // Clean up empty messages from the loaded history
    const cleanedHistory = history.map(chat => ({
      ...chat,
      messages: chat.messages?.filter(hasNonEmptyContent) || []
    }))
    
    const allMessages = [...(cleanedHistory[0]?.messages || []), ...messages]
    console.log("All messages after cleanup:", allMessages.length)
    const trimmedMessages = trimMessagesToTokenLimit(allMessages, MAX_TOKENS)
    console.log("Trimmed messages:", trimmedMessages.length)

    // Save new message to memory with mem0
    if (trimmedMessages.length > 0) {
      try {
        const geminiMessages = trimmedMessages.map((msg: any) => ({
          role: msg.role,
          content: Array.isArray(msg.content)
            ? msg.content.map((part: any) =>
                part.type === 'file'
                  ? { ...part, data: new Uint8Array(part.data) }
                  : part
              )
            : msg.content,
        }))
        
        if (geminiMessages.length > 0) {
          await mem0.add(geminiMessages, { user_id: userId })
          console.log("Saved to mem0")
        }
      } catch (error) {
        console.error('Error saving to mem0:', error)
        // Continue execution even if mem0 fails
      }
    }

    console.log("About to call streamText with messages:", trimmedMessages)
    
    // Convert messages to proper format for Vercel AI SDK
    const validMessagesForAPI = trimmedMessages
      .filter(msg => 
        hasNonEmptyContent(msg) &&
        msg.role && (msg.role === 'user' || msg.role === 'assistant')
      )
      .map(msg => {
        if (typeof msg.content === 'string') {
          return { role: msg.role, content: msg.content }
        }
        
        if (Array.isArray(msg.content)) {
          // Convert MessagePart[] to proper format for Vercel AI SDK
          const textParts = msg.content.filter((part: any) => part.type === 'text')
          const fileParts = msg.content.filter((part: any) => part.type === 'file')
          
          let content = textParts.map((part: any) => part.text).join('\n')
          if (!content && fileParts.length > 0) {
            content = "Please analyze the attached file(s)."
          }
          
          // Add file attachments if any
          if (fileParts.length > 0) {
            const attachments = fileParts.map((part: any) => ({
              type: 'file',
              data: new Uint8Array(part.data),
              mimeType: part.mimeType,
              name: part.name
            }))
            console.log(`Message with ${fileParts.length} file attachments:`, {
              role: msg.role,
              content,
              attachments: attachments.map((a: any) => ({ name: a.name, mimeType: a.mimeType, dataLength: a.data.length }))
            })
            // For Vercel AI SDK, use the content array format
            const contentArray = [
              { type: 'text', text: content },
              ...attachments
            ]
            return { 
              role: msg.role, 
              content: contentArray
            }
          }
          
          return { role: msg.role, content }
        }
        
        return { role: msg.role, content: msg.content }
      })
    
    console.log("Valid messages for API:", validMessagesForAPI.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content.slice(0, 100) : 'Array content',
      hasAttachments: !!(msg as any).attachments
    })))
    
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

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const chatId = searchParams.get("chatId")
    
    if (!userId || !chatId) {
      return new NextResponse(JSON.stringify({ error: "Missing userId or chatId" }), { status: 400 })
    }

    const success = await deleteChat(userId, chatId)
    
    if (!success) {
      return new NextResponse(JSON.stringify({ error: "Chat not found" }), { status: 404 })
    }
    
    return new NextResponse(JSON.stringify({ success: true }), { 
      headers: { "Content-Type": "application/json" } 
    })
  } catch (error) {
    console.error("Error in DELETE /api/chat:", error)
    return new NextResponse(JSON.stringify({ error: "Internal server error" }), { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const chatId = searchParams.get("chatId")
    const { title, messageIndex, newContent, action, versionId } = await req.json()
    
    if (!userId || !chatId) {
      return new NextResponse(JSON.stringify({ error: "Missing userId or chatId" }), { status: 400 })
    }

    if (action === "rename" && title) {
      const success = await renameChat(userId, chatId, title)
      
      if (!success) {
        return new NextResponse(JSON.stringify({ error: "Chat not found" }), { status: 404 })
      }
      
      return new NextResponse(JSON.stringify({ success: true }), { 
        headers: { "Content-Type": "application/json" } 
      })
    }
    
    if (action === "updateMessage" && typeof messageIndex === "number" && newContent) {
      const success = await updateMessage(userId, chatId, messageIndex, newContent)
      
      if (!success) {
        return new NextResponse(JSON.stringify({ error: "Message not found" }), { status: 404 })
      }
      
      // Return the updated chat data
      const db = await connectToDatabase()
      const collection = db.collection("chats")
      const updatedChat = await collection.findOne({ userId, chatId })
      
      return new NextResponse(JSON.stringify({ 
        success: true, 
        chat: updatedChat 
      }), { 
        headers: { "Content-Type": "application/json" } 
      })
    }
    
    if (action === "regenerateFromMessage" && typeof messageIndex === "number") {
      const success = await regenerateFromMessage(userId, chatId, messageIndex)
      
      if (!success) {
        return new NextResponse(JSON.stringify({ error: "Message not found" }), { status: 404 })
      }
      
      return new NextResponse(JSON.stringify({ success: true }), { 
        headers: { "Content-Type": "application/json" } 
      })
    }

    // NEW: Remove the last assistant message
    if (action === "removeLastAssistant") {
      const db = await connectToDatabase();
      const collection = db.collection("chats");
      const chat = await collection.findOne({ userId, chatId });
      if (!chat || !Array.isArray(chat.messages) || chat.messages.length === 0) {
        return new NextResponse(JSON.stringify({ error: "Chat or messages not found" }), { status: 404 })
      }
      // Find the last assistant message
      let lastIdx = chat.messages.length - 1;
      while (lastIdx >= 0 && chat.messages[lastIdx].role !== "assistant") {
        lastIdx--;
      }
      if (lastIdx === -1) {
        return new NextResponse(JSON.stringify({ error: "No assistant message to remove" }), { status: 400 })
      }
      // Remove the last assistant message
      const newMessages = chat.messages.slice(0, lastIdx).concat(chat.messages.slice(lastIdx + 1));
      await collection.updateOne(
        { userId, chatId },
        { $set: { messages: newMessages } }
      );
      return new NextResponse(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
    }
    
    if (action === "switchVersion" && versionId) {
      const success = await switchToVersion(userId, chatId, versionId)
      
      if (!success) {
        return new NextResponse(JSON.stringify({ error: "Version not found" }), { status: 404 })
      }
      
      // Return the updated chat data
      const db = await connectToDatabase()
      const collection = db.collection("chats")
      const updatedChat = await collection.findOne({ userId, chatId })
      
      return new NextResponse(JSON.stringify({ 
        success: true, 
        chat: updatedChat 
      }), { 
        headers: { "Content-Type": "application/json" } 
      })
    }
    
    return new NextResponse(JSON.stringify({ error: "Invalid action" }), { status: 400 })
  } catch (error) {
    console.error("Error in PATCH /api/chat:", error)
    return new NextResponse(JSON.stringify({ error: "Internal server error" }), { status: 500 })
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

// Helper to check if a message has non-empty content (string or MessagePart[])
function hasNonEmptyContent(msg: any): boolean {
  if (!msg.content) return false;
  if (typeof msg.content === 'string') {
    return msg.content.trim() !== '';
  }
  if (Array.isArray(msg.content)) {
    // Check for text content
    const hasText = msg.content.some(
      (part: any) => part.type === 'text' && part.text && part.text.trim() !== ''
    );
    // Check for file content
    const hasFile = msg.content.some(
      (part: any) => part.type === 'file'
    );
    return hasText || hasFile;
  }
  return false;
}