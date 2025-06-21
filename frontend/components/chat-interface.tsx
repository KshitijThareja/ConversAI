"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Send, Edit3, Check, X, Copy, RefreshCw, Mic, Plus, Settings, Menu, ArrowUp } from "lucide-react"
import type { Message, Attachment } from "@/lib/types"
import { MessageContent } from "./message-content"
import { SettingsModal } from "./settings-modal"
import { useSidebar } from "@/contexts/sidebar-context"
import { useUser, SignedIn, SignedOut, UserButton, SignInButton, SignUpButton } from "@clerk/nextjs"

interface ChatInterfaceProps {
  chatId?: string
  userId: string
  initialMessages?: Message[]
}

export function ChatInterface({ chatId, userId, initialMessages = [] }: ChatInterfaceProps) {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toggleSidebar, isOpen, isMobile } = useSidebar()
  const { user } = useUser()
  const { messages, input, handleInputChange, handleSubmit, isLoading, reload, setMessages } = useChat({
    api: "/api/chat",
    body: { chatId, userId },
    initialMessages: initialMessages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
    })),
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      const maxHeight = 200
      textareaRef.current.style.height = Math.min(scrollHeight, maxHeight) + 'px'
      textareaRef.current.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden'
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    adjustTextareaHeight()
  }, [input])

  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId)
    setEditContent(content)
  }

  const handleSaveEdit = async (messageId: string) => {
    const messageIndex = messages.findIndex((m) => m.id === messageId)
    if (messageIndex === -1) return

    const updatedMessages = [...messages]
    updatedMessages[messageIndex] = {
      ...updatedMessages[messageIndex],
      content: editContent,
    }

    const messagesToKeep = updatedMessages.slice(0, messageIndex + 1)
    setMessages(messagesToKeep)

    if (messages[messageIndex].role === "user") {
      await reload()
    }

    setEditingMessageId(null)
    setEditContent("")
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditContent("")
  }

  const handleFileUpload = (newAttachments: Attachment[]) => {
    setAttachments((prev) => [...prev, ...newAttachments])
  }

  const removeAttachment = (attachmentId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() && attachments.length === 0) return

    let messageContent = input
    if (attachments.length > 0) {
      const attachmentText = attachments.map((att) => `[Attachment: ${att.name} (${att.type})]`).join("\n")
      messageContent = `${input}\n\n${attachmentText}`
    }

    handleSubmit(e, {
      data: attachments.length > 0 ? { attachments } : undefined,
    })

    setAttachments([])
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // Show welcome screen when no messages
  if (messages.length === 0) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-[#212121]">
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 md:pb-0">
          <div className="flex items-center gap-2">
            {(!isOpen && isMobile) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleSidebar}
                className="h-8 w-8 p-0 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f] mr-2"
              >
                <Menu className="w-4 h-4" />
              </Button>
            )}
            <span className="text-gray-900 dark:text-white font-medium text-lg">ConversAI</span>
          </div>
          <div className="flex items-center gap-2">
            <SignedIn>
              <Button
                size="sm"
                variant="ghost"
                className="hidden sm:flex text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f]"
              >
                Share
              </Button>
              <SettingsModal>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f] h-8 w-8 p-0"
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
        </div>

        {/* Welcome Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-24">
          <div className="text-center mb-4">
            <h1 className="text-xl md:text-3xl font-medium text-gray-900 dark:text-white mb-8">
              What's on your mind today?
            </h1>
          </div>

          {/* Input Area */}
          <div className="w-full max-w-3xl">
            <form onSubmit={handleFormSubmit} className="relative">
              <div className="flex flex-col bg-gray-100 dark:bg-[#2f2f2f] rounded-2xl md:rounded-3xl overflow-hidden">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask anything"
                  className="w-full bg-transparent border-0 resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 p-4 pb-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleFormSubmit(e)
                    }
                  }}
                />
                <div className="flex items-center justify-between p-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 md:px-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#404040] rounded-lg text-xs md:text-sm"
                    >
                      <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#404040] rounded-lg"
                    >
                      <Mic className="w-3 h-3 md:w-4 md:h-4" />
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      size="sm"
                      className="h-8 w-8 p-0 bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-full disabled:opacity-50"
                    >
                      <ArrowUp className="w-3 h-3 md:w-4 md:h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#212121]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-gray-200 dark:border-[#2f2f2f]">
        <div className="flex items-center gap-2">
          {(!isOpen && isMobile) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleSidebar}
              className="h-8 w-8 p-0 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f] mr-2"
            >
              <Menu className="w-4 h-4" />
            </Button>
          )}
          <span className="text-gray-900 dark:text-white font-medium">ConversAI</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="hidden sm:flex text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f]"
          >
            Share
          </Button>
          <SettingsModal>
            <Button
              size="sm"
              variant="ghost"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f] h-8 w-8 p-0"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </SettingsModal>
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-gray-200 dark:bg-[#2f2f2f] text-gray-900 dark:text-white text-xs">
              {user?.firstName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto py-4 md:py-6 px-3 md:px-4 space-y-4 md:space-y-6">
          {messages.map((message, index) => (
            <div key={message.id} className="group">
              <div className="flex gap-3 md:gap-4">
                {message.role === "assistant" && (
                  <Avatar className="w-6 h-6 md:w-8 md:h-8 mt-1 flex-shrink-0">
                    <AvatarFallback className="bg-[#10a37f] text-white text-xs font-bold">AI</AvatarFallback>
                  </Avatar>
                )}

                <div className="flex-1 min-w-0">
                  {editingMessageId === message.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[100px] resize-none bg-gray-100 dark:bg-[#2f2f2f] border-gray-300 dark:border-[#404040] text-gray-900 dark:text-white"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(message.id)}
                          className="h-8 bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          className="h-8 border-gray-300 dark:border-[#404040] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f]"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="text-gray-900 dark:text-white">
                        <MessageContent content={message.content} />
                      </div>

                      {/* Message Actions */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-2 flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 md:h-8 md:w-8 p-0 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f]"
                          onClick={() => copyToClipboard(message.content)}
                        >
                          <Copy className="w-3 h-3 md:w-4 md:h-4" />
                        </Button>
                        {message.role === "user" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 md:h-8 md:w-8 p-0 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f]"
                            onClick={() => handleEditMessage(message.id, message.content)}
                          >
                            <Edit3 className="w-3 h-3 md:w-4 md:h-4" />
                          </Button>
                        )}
                        {message.role === "assistant" && index === messages.length - 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 md:h-8 md:w-8 p-0 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f]"
                            onClick={() => reload()}
                          >
                            <RefreshCw className="w-3 h-3 md:w-4 md:h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {message.role === "user" && (
                  <Avatar className="w-6 h-6 md:w-8 md:h-8 mt-1 flex-shrink-0">
                    <AvatarFallback className="bg-gray-200 dark:bg-[#2f2f2f] text-gray-900 dark:text-white text-xs">
                      {user?.firstName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 md:gap-4">
              <Avatar className="w-6 h-6 md:w-8 md:h-8 mt-1 flex-shrink-0">
                <AvatarFallback className="bg-[#10a37f] text-white text-xs font-bold">AI</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-3 md:p-4 border-t border-gray-200 dark:border-[#2f2f2f]">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleFormSubmit} className="relative">
            <div className="flex flex-col bg-gray-100 dark:bg-[#2f2f2f] rounded-2xl md:rounded-3xl border border-gray-300 dark:border-[#404040] overflow-hidden">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                placeholder="Ask anything"
                className="w-full bg-transparent border-0 resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 p-4 min-h-[52px] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleFormSubmit(e)
                  }
                }}
              />
              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 md:px-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#404040] rounded-lg text-xs md:text-sm"
                  >
                    <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#404040] rounded-lg"
                  >
                    <Mic className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    size="sm"
                    className="h-8 w-8 p-0 bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-full disabled:opacity-50"
                  >
                    <ArrowUp className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </form>

          {/* Footer disclaimer */}
          <div className="text-center mt-3">
            <p className="text-xs text-gray-500">
              ConversAI can make mistakes. Check important info.{" "}
              <button className="underline hover:text-gray-400">See Cookie Preferences.</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
