"use client"

import type React from "react"

import { useRef, useState } from "react"
import type { Attachment } from "@/lib/types"

interface FileUploadProps {
  onUpload: (files: FileList) => void | Promise<void>
  children: React.ReactNode
}

export function FileUpload({ onUpload, children }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileSelect = async (files: FileList) => {
    if (!files.length) return

    setIsUploading(true)
    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      return response.json()
    })

    try {
      const attachments = await Promise.all(uploadPromises)
      onUpload(files)
    } catch (error) {
      console.error("Upload error:", error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt"
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
        className="hidden"
      />
      <div onClick={handleClick} className="cursor-pointer">
        {children}
      </div>
    </>
  )
}
