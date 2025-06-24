import { NextRequest, NextResponse } from "next/server"
import { MemoryClient } from "mem0ai"

console.log("Memory client initialized")

const memory = new MemoryClient({ apiKey: process.env.MEM0_API_KEY! })

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  console.log("Fetching memories for user:", userId)
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }
  try {
    const result = await memory.getAll({ user_id: userId })
    console.log("Memories fetched successfully:", result)
    const memories = result || []
    console.log("Processed memories:", memories)
    return NextResponse.json({ memories })
  } catch (error) {
    console.log("Failed to fetch memories:", error)
    return NextResponse.json({ error: "Failed to fetch memories" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const { searchParams } = new URL(req.url)
  console.log("Search params:", searchParams)
  const id = searchParams.get("id")
  console.log("Deleting memory:", id)
  if (!userId || !id) {
    return NextResponse.json({ error: "Missing userId or id" }, { status: 400 })
  }
  try {
    await memory.delete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete memory" }, { status: 500 })
  }
}
