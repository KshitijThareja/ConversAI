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
  
  for (const chat of chats) {
    if (chat.messages && Array.isArray(chat.messages)) {
      const cleanedMessages = chat.messages.filter(hasNonEmptyContent)
      
      if (cleanedMessages.length !== chat.messages.length) {
        await collection.updateOne(
          { _id: chat._id },
          { $set: { messages: cleanedMessages } }
        )
      }
    }
  }
  
  return chats
}

async function saveMessage(userId: string, chatId: string, message: any) {
  const db = await connectToDatabase()
  const collection = db.collection("chats")
  const existingChat = await collection.findOne({ userId, chatId })
  const finalChatId = chatId === "default" || !chatId ? `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : chatId
  
  const messageWithId = {
    ...message,
    id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date()
  }

  if (!existingChat && message.role === "user") {
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
        $push: { messages: messageWithId }
      },
      { upsert: true }
    )
    return finalChatId
  } else {
    await collection.updateOne(
      { userId, chatId: finalChatId },
      { $push: { messages: messageWithId } },
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

  const chat = await collection.findOne({ userId, chatId })
  if (!chat || !chat.messages || !chat.messages[messageIndex]) {
    throw new Error("Message not found")
  }
  
  const originalContent = chat.messages[messageIndex].originalContent || chat.messages[messageIndex].content
  
  const newVersion: any = {
    id: `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    messages: [...chat.messages],
    createdAt: new Date(),
    isCurrent: false
  }
  
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
  
  const chat = await collection.findOne({ userId, chatId })
  if (!chat || !chat.messages || !chat.messages[messageIndex]) {
    throw new Error("Message not found")
  }
  
  const messagesUpToIndex = chat.messages.slice(0, messageIndex + 1)
  
  const result = await collection.updateOne(
    { userId, chatId },
    { $set: { messages: messagesUpToIndex } }
  )
  
  return result.modifiedCount > 0
}

async function switchToVersion(userId: string, chatId: string, versionId: string) {
  const db = await connectToDatabase()
  const collection = db.collection("chats")
  
  const chat = await collection.findOne({ userId, chatId })
  if (!chat || !chat.versions) {
    throw new Error("Chat or versions not found")
  }
  
  const version = chat.versions.find((v: any) => v.id === versionId)
  if (!version) {
    throw new Error("Version not found")
  }
  
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
      const chats = await getChatHistory(userId, chatId)
      const chat = chats[0]
      if (!chat) {
        return new NextResponse(JSON.stringify({ error: "Chat not found" }), { status: 404 })
      }
      
      return new NextResponse(JSON.stringify({ 
        id: chat.chatId || chat._id?.toString(),
        title: chat.title || (chat.messages?.[0]?.content?.slice(0, 30) || "Untitled Chat"),
        messages: (chat.messages || []).map((msg: any, idx: number) => ({
          ...msg,
          id: msg.id || `msg_${idx}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        })),
        versions: chat.versions || [],
        currentVersionId: chat.currentVersionId || null
      }), { 
        headers: { "Content-Type": "application/json" } 
      })
    } else {
      const chats = await getChatHistory(userId)
      const chatList = chats.map(chat => ({
        id: chat.chatId || chat._id?.toString(),
        title: chat.title || (chat.messages?.[0]?.content?.slice(0, 30) || "Untitled Chat"),
        createdAt: chat.createdAt
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
    const { messages, chatId, userId } = await req.json()

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

    if (
      !lastDbMessage ||
      lastDbMessage.content !== userMessage.content ||
      lastDbMessage.role !== userMessage.role
    ) {
      actualChatId = await saveMessage(userId, chatId, userMessage);
    } else {
    }

    const history = await getChatHistory(userId, actualChatId)
    
    const cleanedHistory = history.map(chat => ({
      ...chat,
      messages: chat.messages?.filter(hasNonEmptyContent) || []
    }))
    
    const allMessages = [...(cleanedHistory[0]?.messages || []), ...messages]
    const trimmedMessages = trimMessagesToTokenLimit(allMessages, MAX_TOKENS)

    if (trimmedMessages.length > 0) {
      try {
        const geminiMessages = trimmedMessages.map((msg: any) => {
          let contentString = '';
          if (typeof msg.content === 'string') {
            contentString = msg.content;
          } else if (Array.isArray(msg.content)) {
            const textParts = msg.content.filter((part: any) => part.type === 'text').map((part: any) => part.text).join(' ');
            const fileParts = msg.content.filter((part: any) => part.type === 'file');
            let fileString = '';
            if (fileParts.length > 0) {
              fileString = fileParts.map((file: any) => `[file attached: ${file.name || 'unnamed file'}]`).join(' ');
            }
            contentString = [textParts, fileString].filter(Boolean).join(' ');
          }
          return {
            role: msg.role,
            content: contentString,
          };
        });
        
        if (geminiMessages.length > 0) {
          await mem0.add(geminiMessages, { user_id: userId })
        }
      } catch (error) {
        console.error('Error saving to mem0:', error)
      }
    }
    
    let memoryContext = '';
    try {
      const userMemories = await mem0.getAll({ user_id: userId });
      if (Array.isArray(userMemories) && userMemories.length > 0) {
        memoryContext = userMemories.map((mem: any) => mem.memory).filter(Boolean).join('\n');
      }
    } catch (err) {
      console.error('Error fetching user memory for context:', err);
    }

    type RoleType = 'user' | 'assistant' | 'system';
    let contextMessages: { role: RoleType; content: string }[] = [];
    if (memoryContext) {
      contextMessages.push({ role: 'system', content: `User memory/context:\n${memoryContext}` });
    }
    contextMessages = contextMessages.concat(
      trimmedMessages
        .filter(msg => hasNonEmptyContent(msg) && msg.role && (msg.role === 'user' || msg.role === 'assistant'))
        .map(msg => {
          let role: RoleType = (msg.role === 'user' || msg.role === 'assistant') ? msg.role : 'user';
          if (typeof msg.content === 'string') {
            return { role, content: msg.content };
          }
          if (Array.isArray(msg.content)) {
            const textParts = msg.content.filter((part: any) => part.type === 'text');
            const fileParts = msg.content.filter((part: any) => part.type === 'file');
            let content = textParts.map((part: any) => part.text).join('\n');
            if (!content && fileParts.length > 0) {
              content = 'Please analyze the attached file(s).';
            }
            if (fileParts.length > 0) {
              content += '\n' + fileParts.map((file: any) => `[file attached: ${file.name || 'unnamed file'}]`).join(' ');
            }
            return { role, content };
          }
          return { role, content: String(msg.content) };
        })
    );

    if (contextMessages.length === 0) {
      return new NextResponse("Hello! I'm here to help. How can I assist you today?", {
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      })
    }
    
    try {
      const { textStream } = await streamText({
        model: google("gemini-2.0-flash"),
        messages: contextMessages,
        maxTokens: 4096,
      })
      

      let fullResponse = ""
      const assistantMessageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const stream = new ReadableStream({
        async start(controller) {
          try {
            let chunkCount = 0
            for await (const chunk of textStream) {
              chunkCount++
              fullResponse += chunk
              controller.enqueue(new TextEncoder().encode(chunk))
            }
            controller.close()
            
            await saveMessage(userId, actualChatId, {
              id: assistantMessageId,
              role: "assistant",
              content: fullResponse,
              createdAt: new Date(),
            })
          } catch (error) {
            console.error("Error in streaming:", error)
            controller.error(error)
          }
        },
      })

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

    if (action === "removeLastAssistant") {
      const db = await connectToDatabase();
      const collection = db.collection("chats");
      const chat = await collection.findOne({ userId, chatId });
      if (!chat || !Array.isArray(chat.messages) || chat.messages.length === 0) {
        return new NextResponse(JSON.stringify({ error: "Chat or messages not found" }), { status: 404 })
      }
      let lastIdx = chat.messages.length - 1;
      while (lastIdx >= 0 && chat.messages[lastIdx].role !== "assistant") {
        lastIdx--;
      }
      if (lastIdx === -1) {
        return new NextResponse(JSON.stringify({ error: "No assistant message to remove" }), { status: 400 })
      }
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

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function hasNonEmptyContent(msg: any): boolean {
  if (!msg.content) return false;
  if (typeof msg.content === 'string') {
    return msg.content.trim() !== '';
  }
  if (Array.isArray(msg.content)) {
    const hasText = msg.content.some(
      (part: any) => part.type === 'text' && part.text && part.text.trim() !== ''
    );
    const hasFile = msg.content.some(
      (part: any) => part.type === 'file'
    );
    return hasText || hasFile;
  }
  return false;
}