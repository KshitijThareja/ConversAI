import { NextRequest, NextResponse } from "next/server"
import { MemoryClient } from "mem0ai"

const memory = new MemoryClient({ apiKey: process.env.MEM0_API_KEY! })

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }
  try {
    const result = await memory.getAll({ user_id: userId })
    const memories = result || []
    return NextResponse.json({ memories })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch memories" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
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
