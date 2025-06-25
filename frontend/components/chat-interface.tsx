"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Edit3, X, Copy, RefreshCw, Plus, Settings, ArrowUp, FileText } from "lucide-react"
import type { Message, Attachment, ChatMessage, MessagePart } from "@/lib/types"
import { MessageContent } from "./message-content"
import { SettingsModal } from "./settings-modal"
import { useSidebar } from "@/contexts/sidebar-context"
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs"
import { FileUpload } from "./file-upload"
import { v4 as uuidv4 } from 'uuid'

interface ChatInterfaceProps {
  chatId?: string
  initialMessages?: Message[]
  onMessageSent?: () => void
  onChatIdUpdate?: (newChatId: string) => void
}

const HamburgerIcon = () => (
  <svg
    data-rtl-flip="true"
    className="icon-lg mx-2"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M11.6663 12.6686L11.801 12.6823C12.1038 12.7445 12.3313 13.0125 12.3313 13.3337C12.3311 13.6547 12.1038 13.9229 11.801 13.985L11.6663 13.9987H3.33325C2.96609 13.9987 2.66839 13.7008 2.66821 13.3337C2.66821 12.9664 2.96598 12.6686 3.33325 12.6686H11.6663ZM16.6663 6.00163L16.801 6.0153C17.1038 6.07747 17.3313 6.34546 17.3313 6.66667C17.3313 6.98788 17.1038 7.25586 16.801 7.31803L16.6663 7.33171H3.33325C2.96598 7.33171 2.66821 7.03394 2.66821 6.66667C2.66821 6.2994 2.96598 6.00163 3.33325 6.00163H16.6663Z"
      stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
  </svg>
)

export function ChatInterface({ chatId, initialMessages = [], onMessageSent, onChatIdUpdate }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages as ChatMessage[])
  const [input, setInput] = useState("")
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toggleSidebar, isOpen, isMobile } = useSidebar()
  const { user } = useUser()
  const userId = user?.id || "default-user"
  const [pendingParts, setPendingParts] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      const scrollHeight = textareaRef.current.scrollHeight
      const maxHeight = 200
      textareaRef.current.style.height = Math.min(scrollHeight, maxHeight) + "px"
      textareaRef.current.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden"
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    adjustTextareaHeight()
  }, [input])

  useEffect(() => {
    const withIds = (initialMessages as ChatMessage[]).map((msg, idx) => ({
      ...msg,
      id: msg.id || `fallback-${idx}`
    }))
    setMessages(withIds)
  }, [initialMessages])

  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId)
    setEditContent(content)
  }

  const handleSaveEdit = async (messageId: string) => {
    const messageIndex = messages.findIndex((m) => m.id === messageId)
    if (messageIndex === -1) return

    setIsLoading(true)
    try {
      const patchRes = await fetch(`/api/chat?chatId=${chatId}&userId=${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateMessage", messageIndex, newContent: editContent }),
      })
      if (!patchRes.ok) throw new Error("Failed to update message")

      const trimRes = await fetch(`/api/chat?chatId=${chatId}&userId=${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerateFromMessage", messageIndex }),
      })
      if (!trimRes.ok) throw new Error("Failed to trim chat after edit")

      const getRes = await fetch(`/api/chat?chatId=${chatId}&userId=${userId}`)
      if (!getRes.ok) throw new Error("Failed to fetch updated chat")
      const chatData = await getRes.json()
      const trimmedMessages = chatData.messages || []
      setMessages(trimmedMessages as ChatMessage[])

      setIsLoading(true)
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: trimmedMessages, chatId, userId }),
      })
      if (!response.ok) throw new Error("Failed to regenerate assistant response")

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body reader available")
      const decoder = new TextDecoder()
      let fullResponse = ""
      const assistantMessageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      setMessages((prev) => [
        ...trimmedMessages,
        { id: assistantMessageId, role: "assistant", content: "", timestamp: new Date() }
      ] as ChatMessage[])
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        fullResponse += chunk
        setMessages((prev) =>
          prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: fullResponse }
              : msg
          )
        )
      }
      onMessageSent?.()
      setEditingMessageId(null)
      setEditContent("")
    } catch (error) {
      console.error("Error during message edit/regeneration:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditContent("")
  }

  const handleFileUpload = async (files: FileList) => {
    setUploading(true)
    const fileParts = await Promise.all(
      Array.from(files).map(async (file) => {
        const arrayBuffer = await file.arrayBuffer()
        return {
          type: 'file',
          data: Array.from(new Uint8Array(arrayBuffer)),
          mimeType: file.type,
          name: file.name,
        }
      })
    )
    setPendingParts((prev) => [...prev, ...fileParts])
    setUploading(false)
  }

  const removeAttachment = (attachmentId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() && pendingParts.length === 0) return
    const textPart = input.trim() ? [{ type: 'text', text: input.trim() }] : []
    const content = [...textPart, ...pendingParts]
    const newUserMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: "user",
      content: content as any,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newUserMessage] as ChatMessage[])
    setInput("")
    setPendingParts([])
    setIsLoading(true)
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content }],
          chatId,
          userId,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("API error:", errorText)
        throw new Error(`Failed to send message: ${response.status} ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response body reader available")
      }

      const decoder = new TextDecoder()
      let fullResponse = ""

      const assistantMessageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { ...newUserMessage, content: content } as ChatMessage,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          timestamp: new Date()
        } as ChatMessage
      ])

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        const chunk = decoder.decode(value)
        fullResponse += chunk

        setMessages((prev) =>
          prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: fullResponse }
              : msg
          )
        )
      }

      onMessageSent?.()

      if (!chatId && onChatIdUpdate) {
        try {
          const chatResponse = await fetch(`/api/chat?userId=${userId}`)
          if (chatResponse.ok) {
            const chats = await chatResponse.json()
            if (chats.length > 0) {
              const latestChat = chats[0]
              onChatIdUpdate(latestChat.id)
            }
          }
        } catch (error) {
          console.error("Failed to get new chat ID:", error)
        }
      }
    } catch (error) {
      console.error("Error:", error)
      setMessages((prev) => prev.filter(msg => msg.id !== `msg-${Date.now() + 1}-${Math.random().toString(36).substr(2, 9)}`))
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleRegenerateLastAssistant = async () => {
    const lastUserIndex = [...messages].reverse().findIndex(m => m.role === "user")
    if (lastUserIndex === -1) return
    const userIdx = messages.length - 1 - lastUserIndex
    if (messages.length < 2 || messages[messages.length - 1].role !== "assistant" || messages[messages.length - 2].role !== "user") return
    setIsLoading(true)
    try {
      await fetch(`/api/chat?chatId=${chatId}&userId=${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "removeLastAssistant" }),
      })
      const getRes = await fetch(`/api/chat?chatId=${chatId}&userId=${userId}`)
      if (!getRes.ok) throw new Error("Failed to fetch updated chat")
      const chatData = await getRes.json()
      const trimmedMessages = chatData.messages || []
      setMessages(trimmedMessages as ChatMessage[])
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: trimmedMessages, chatId, userId }),
      })
      if (!response.ok) throw new Error("Failed to regenerate assistant response")
      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body reader available")
      const decoder = new TextDecoder()
      let fullResponse = ""
      const assistantMessageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const uniqueAssistantId2 = `msg-${Date.now() + 1}-${Math.random().toString(36).substr(2, 9)}`
      setMessages((prev) => [
        ...trimmedMessages,
        { id: assistantMessageId, role: "assistant", content: "", timestamp: new Date() }
      ] as ChatMessage[])
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        fullResponse += chunk
        setMessages((prev) =>
          prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: fullResponse }
              : msg
          )
        )
      }
      onMessageSent?.()
    } catch (error) {
      console.error("Error during regeneration:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-[#212121]" role="main" aria-label="ConversAI Chat Interface">
        <header className="flex items-center justify-between p-3 md:p-4" role="banner">
          <div className="flex items-center gap-2">
            {(!isOpen && isMobile) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleSidebar}
                className="h-8 w-8 p-0 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f] mr-2"
                aria-label="Toggle sidebar menu"
              >
                <HamburgerIcon />
              </Button>
            )}
            <h1 className="text-gray-900 dark:text-white font-medium text-lg">ConversAI</h1>
          </div>
          <div className="flex items-center gap-2">
            <SignedIn>
              <SettingsModal>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f] h-8 w-8 p-0"
                  aria-label="Open settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </SettingsModal>
              <Avatar className="w-8 h-8">
                <UserButton />
              </Avatar>
            </SignedIn>
            <SignedOut>
              <SignInButton>
                <Button size="sm" variant="outline" className="py-2 text-gray-800 dark:text-white dark:border-gray-400 dark:hover:border-white dark:bg-[#212121]">
                  Sign in
                </Button>
              </SignInButton>
            </SignedOut>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-4 pb-24" role="main">
          <div className="text-center mb-4">
            <h2 className="text-xl md:text-3xl font-medium text-gray-900 dark:text-white mb-8">
              What's on your mind today?
            </h2>
          </div>
          <div className="w-full max-w-3xl">
            <form onSubmit={handleSubmit} className="relative" role="form" aria-label="New message form">
              <div className="flex flex-col bg-gray-100 dark:bg-[#2f2f2f] rounded-2xl md:rounded-3xl overflow-hidden">
                <div className="flex flex-row gap-2">
                  {pendingParts.map((part, idx) => (
                    <div key={part.name || idx} className="relative inline-block align-top">
                      {/* Close icon */}
                      <button
                        className="absolute -top-0 -right-2 z-10 bg-white dark:bg-[#232324] rounded-full p-0.5 shadow hover:bg-gray-200 dark:hover:bg-[#333] transition"
                        onClick={() => setPendingParts(pendingParts.filter((_, i) => i !== idx))}
                        type="button"
                        aria-label={`Remove file ${part.name}`}
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                      {/* Badge */}
                      {part.mimeType?.startsWith("image/") ? (
                        <div className="flex items-center gap-2 rounded-xl border bg-white dark:bg-[#232324] p-2 mt-1 pr-4 shadow-sm w-[180px]" role="img" aria-label={`Image file: ${part.name}`}>
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 overflow-hidden">
                            <img
                              src={URL.createObjectURL(new Blob([new Uint8Array(part.data)], { type: part.mimeType }))}
                              alt={part.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold truncate max-w-[100px]">{part.name}</span>
                            <span className="text-[10px] text-gray-500">{part.mimeType.split('/')[1]?.toUpperCase()}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-xl border bg-white dark:bg-[#232324] p-2 pr-4 shadow-sm" role="img" aria-label={`File: ${part.name}`}>
                          <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${part.mimeType.includes('pdf') ? 'bg-pink-100' : 'bg-blue-100'}`}>
                            <span className={`material-symbols-rounded ${part.mimeType.includes('pdf') ? 'text-pink-500' : 'text-blue-500'} text-2xl`}>
                              <FileText />
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold truncate max-w-[120px]">{part.name}</span>
                            <span className="text-[10px] text-gray-500">{part.mimeType.split('/')[1]?.toUpperCase()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything"
                  aria-label="Message input"
                  aria-describedby="message-input-help"
                  className="w-full bg-transparent border-0 resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 p-4 pb-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit(e)
                    }
                  }}
                />
                <div className="flex items-center justify-between p-2">
                  <div className="flex items-center gap-2">
                    <FileUpload onUpload={files => handleFileUpload(files as FileList)}>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 md:px-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#404040] rounded-lg text-xs md:text-sm"
                        aria-label="Add file attachment"
                      >
                        <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      </Button>
                    </FileUpload>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="submit"
                      disabled={isLoading || (!input.trim() && pendingParts.length === 0)}
                      size="sm"
                      className="h-8 w-8 p-0 bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-full disabled:opacity-50"
                      aria-label="Send message"
                      aria-describedby={isLoading ? "loading-status" : undefined}
                    >
                      <ArrowUp className="w-3 h-3 md:w-4 md:h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </form>
            <div id="message-input-help" className="sr-only">
              Type your message here. Press Enter to send, or Shift+Enter for a new line.
            </div>
            {isLoading && (
              <div id="loading-status" className="sr-only" aria-live="polite">
                Sending message...
              </div>
            )}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#212121]" role="main" aria-label="ConversAI Chat Interface">
      <header className="flex items-center justify-between p-3 md:p-4" role="banner">
        <div className="flex items-center gap-2">
          {(!isOpen && isMobile) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleSidebar}
              className="h-8 w-8 p-0 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f] mr-2"
              aria-label="Toggle sidebar menu"
            >
              <HamburgerIcon />
            </Button>
          )}
          <h1 className="text-gray-900 dark:text-white font-medium text-lg">ConversAI</h1>
        </div>
        <div className="flex items-center gap-2">
          <SettingsModal>
            <Button
              size="sm"
              variant="ghost"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f] h-8 w-8 p-0"
              aria-label="Open settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </SettingsModal>
          <Avatar className="w-8 h-8">
            <UserButton />
          </Avatar>
        </div>
      </header>
      <ScrollArea className="flex-1" role="region" aria-label="Chat messages">
        <div className="max-w-3xl mx-auto py-4 md:py-6 px-3 md:px-4 space-y-4 md:space-y-6" role="log" aria-live="polite" aria-label="Message list">
          {messages.map((message, index) => {
            const isUser = message.role === "user"
            const isAssistant = message.role === "assistant"
            const isEditing = editingMessageId === message.id
            return (
              <div key={message.id ? String(message.id) : `fallback-${index}`}
                className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
                role="article"
                aria-label={`${isUser ? 'Your message' : 'Assistant message'} ${index + 1}`}
              >
                <div className={`group relative ${isUser ? "ml-auto" : "mr-auto"}`}>
                  {/* Message content */}
                  <div className="flex flex-col">
                    {isEditing && isUser ? (
                      <div className="flex flex-col gap-2 bg-gray-100 dark:bg-[#303030] rounded-2xl p-3" role="form" aria-label="Edit message">
                        <Textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          className="w-full bg-transparent border-0 resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 min-h-[52px]"
                          aria-label="Edit message content"
                          autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            disabled={isLoading}
                            aria-label="Cancel editing"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(message.id)}
                            disabled={isLoading || !editContent.trim()}
                            className="bg-gray-900 dark:bg-white text-white dark:text-black"
                            aria-label="Save edited message"
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : Array.isArray(message.content)
                      ? message.content.filter((part: MessagePart) => part.type === 'text').map((part: MessagePart, idx: number) => (
                        <div
                          key={idx}
                          className={`px-5 py-3 ${isUser ? "bg-gray-100 dark:bg-[#303030] text-gray-900 dark:text-white rounded-2xl rounded-br-md" : "text-gray-900 dark:text-white"}`}
                          style={{ background: isAssistant ? "none" : undefined }}
                          role="text"
                        >
                          <MessageContent content={part.type === 'text' ? part.text : ''} />
                        </div>
                      ))
                      : (
                        <div
                          className={`px-5 py-3 ${isUser ? "bg-gray-100 dark:bg-[#303030] text-gray-900 dark:text-white rounded-2xl rounded-br-md" : "text-gray-900 dark:text-white"}`}
                          style={{ background: isAssistant ? "none" : undefined }}
                          role="text"
                        >
                          <MessageContent content={message.content as string} />
                        </div>
                      )}

                    {/* File/image badges below the message bubble */}
                    {Array.isArray(message.content) && message.content.some((p: MessagePart) => p.type === 'file' && p.mimeType && (p.mimeType.startsWith('image/') || p.mimeType)) && (
                      <div className="flex flex-wrap gap-2 mt-2 justify-end" role="group" aria-label="Message attachments">
                        {message.content.filter((part: MessagePart) => part.type === 'file' && part.mimeType && (part.mimeType.startsWith('image/') || part.mimeType)).map((part: any, idx: number) =>
                          part.type === 'file' && part.mimeType && part.mimeType.startsWith('image/') ? (
                            <div key={idx} className="flex items-center gap-2 rounded-xl border bg-white dark:bg-[#232324] p-2 pr-4 shadow-sm w-[180px]" role="img" aria-label={`Image attachment: ${part.name}`}>
                              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 overflow-hidden">
                                <img
                                  src={URL.createObjectURL(new Blob([new Uint8Array(part.data)], { type: part.mimeType }))}
                                  alt={part.name}
                                  className="w-10 h-10 object-cover rounded"
                                />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-semibold truncate max-w-[100px]">{part.name}</span>
                                <span className="text-[10px] text-gray-500">{part.mimeType.split('/')[1]?.toUpperCase()}</span>
                              </div>
                            </div>
                          ) : (
                            <div key={idx} className="flex items-center gap-2 rounded-xl border bg-white dark:bg-[#232324] p-2 pr-4 shadow-sm" role="img" aria-label={`File attachment: ${part.name}`}>
                              <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${part.mimeType?.includes('pdf') ? 'bg-pink-100' : 'bg-blue-100'}`}>
                                <span className={`material-symbols-rounded ${part.mimeType?.includes('pdf') ? 'text-pink-500' : 'text-blue-500'} text-2xl`}>
                                  <FileText />
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold truncate max-w-[120px]">{part.name}</span>
                                <span className="text-[10px] text-gray-500">{part.mimeType?.split('/')[1]?.toUpperCase()}</span>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* Copy and Edit buttons - positioned below message and only visible on hover */}
                  {isUser && (
                    <div className="flex gap-1 mt-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200" role="group" aria-label="Message actions">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                        onClick={() => copyToClipboard(Array.isArray(message.content) ? message.content.filter((p: any) => p.type === 'text').map((p: any) => p.text).join("\n") : message.content as string)}
                        aria-label="Copy message to clipboard"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                        onClick={() => handleEditMessage(message.id, Array.isArray(message.content) ? message.content.filter((p: any) => p.type === 'text').map((p: any) => p.text).join("\n") : message.content as string)}
                        aria-label="Edit message"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  {isAssistant && (
                    <div className="flex gap-1 mt-2 ml-4" role="group" aria-label="Assistant message actions">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-gray-400 hover:text-black dark:hover:text-white"
                        onClick={() => copyToClipboard(Array.isArray(message.content) ? message.content.filter((p: any) => p.type === 'text').map((p: any) => p.text).join("\n") : message.content)}
                        aria-label="Copy assistant message to clipboard"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      {index === messages.length - 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-gray-400 hover:text-black dark:hover:text-white"
                          onClick={handleRegenerateLastAssistant}
                          aria-label="Regenerate assistant response"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {isLoading && (
            <div className="flex gap-3 md:gap-4" role="status" aria-live="polite" aria-label="Assistant is typing">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} aria-hidden="true" />
        </div>
      </ScrollArea>
      <footer className="p-3 md:p-4" role="contentinfo">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative" role="form" aria-label="Send message form">
            <div className="flex flex-col bg-gray-100 dark:bg-[#2f2f2f] rounded-2xl md:rounded-3xl border border-gray-300 dark:border-[#404040] overflow-hidden">
              <div className="flex flex-row gap-2">
                {pendingParts.map((part, idx) => (
                  <div key={part.name || idx} className="relative inline-block align-top">
                    {/* Close icon */}
                    <button
                      className="absolute -top-0 -right-2 z-10 bg-white dark:bg-[#232324] rounded-full p-0.5 shadow hover:bg-gray-200 dark:hover:bg-[#333] transition"
                      onClick={() => setPendingParts(pendingParts.filter((_, i) => i !== idx))}
                      type="button"
                      aria-label={`Remove file ${part.name}`}
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                    {/* Badge */}
                    {part.mimeType?.startsWith("image/") ? (
                      <div className="flex items-center gap-2 rounded-xl border bg-white dark:bg-[#232324] p-2 mt-1 pr-4 shadow-sm w-[180px]" role="img" aria-label={`Image file: ${part.name}`}>
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 overflow-hidden">
                          <img
                            src={URL.createObjectURL(new Blob([new Uint8Array(part.data)], { type: part.mimeType }))}
                            alt={part.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold truncate max-w-[100px]">{part.name}</span>
                          <span className="text-[10px] text-gray-500">{part.mimeType.split('/')[1]?.toUpperCase()}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-xl border bg-white dark:bg-[#232324] p-2 pr-4 shadow-sm" role="img" aria-label={`File: ${part.name}`}>
                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${part.mimeType.includes('pdf') ? 'bg-pink-100' : 'bg-blue-100'}`}>
                          <span className={`material-symbols-rounded ${part.mimeType.includes('pdf') ? 'text-pink-500' : 'text-blue-500'} text-2xl`}>
                            <FileText />
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold truncate max-w-[120px]">{part.name}</span>
                          <span className="text-[10px] text-gray-500">{part.mimeType.split('/')[1]?.toUpperCase()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything"
                aria-label="Type your message"
                aria-describedby="message-input-help"
                className="w-full bg-transparent border-0 resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 p-4 min-h-[52px] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
              />
              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2">
                  <FileUpload onUpload={files => handleFileUpload(files as FileList)}>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 md:px-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#404040] rounded-lg text-xs md:text-sm"
                      aria-label="Add file attachment"
                    >
                      <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                    </Button>
                  </FileUpload>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={isLoading || (!input.trim() && pendingParts.length === 0)}
                    size="sm"
                    className="h-8 w-8 p-0 bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-full disabled:opacity-50"
                    aria-label="Send message"
                    aria-describedby={isLoading ? "loading-status" : undefined}
                  >
                    <ArrowUp className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </form>
          <div id="message-input-help" className="sr-only">
            Type your message here. Press Enter to send, or Shift+Enter for a new line.
          </div>
          {isLoading && (
            <div id="loading-status" className="sr-only" aria-live="polite">
              Sending message...
            </div>
          )}
          <div className="text-center mt-3">
            <p className="text-xs text-gray-500" role="contentinfo">
              ConversAI can make mistakes. Check important info.{" "}
              <button className="underline hover:text-gray-400" aria-label="View cookie preferences">See Cookie Preferences.</button>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}