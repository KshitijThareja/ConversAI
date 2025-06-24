import { NextRequest, NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const files = formData.getAll("file") as File[]

  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 })
  }

  const uploadResults = await Promise.all(
    files.map(async (file) => {
      const uploadResponse = await new Promise(async (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "auto" },
          (error, result) => (error ? reject(error) : resolve(result))
        )
        stream.end(Buffer.from(await file.arrayBuffer()))
      })
      return {
        id: (uploadResponse as any).public_id,
        name: file.name,
        url: (uploadResponse as any).secure_url,
        type: file.type,
      }
    })
  )

  return NextResponse.json({ files: uploadResults })
}