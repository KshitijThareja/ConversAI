import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    const db = await getDatabase()
    const chatsCollection = db.collection("chats")

    const chats = await chatsCollection.find({ userId }).sort({ updatedAt: -1 }).toArray()

    return NextResponse.json(chats)
  } catch (error) {
    console.error("Get chats error:", error)
    return NextResponse.json({ error: "Failed to fetch chats" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, userId } = await req.json()

    const db = await getDatabase()
    const chatsCollection = db.collection("chats")

    const newChat = {
      id: crypto.randomUUID(),
      title: title || "New Chat",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      userId,
    }

    await chatsCollection.insertOne(newChat)

    return NextResponse.json(newChat)
  } catch (error) {
    console.error("Create chat error:", error)
    return NextResponse.json({ error: "Failed to create chat" }, { status: 500 })
  }
}
