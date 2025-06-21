"use client"

import { useState } from "react"
import { ChatInterface } from "@/components/chat-interface"
import { Sidebar } from "@/components/sidebar"
import { SidebarProvider } from "@/contexts/sidebar-context"
import "./globals.css";

export default function ChatPage() {
  const [currentChatId, setCurrentChatId] = useState<string>()

  // Mock user ID - in production, get from auth
  const userId = "user-123"

  const handleChatSelect = (chatId: string) => {
    setCurrentChatId(chatId)
  }

  const handleNewChat = () => {
    setCurrentChatId(undefined)
  }

  return (
      <SidebarProvider>
        <div className="flex h-screen bg-white dark:bg-[#212121] text-gray-900 dark:text-white overflow-hidden">
          <Sidebar
            userId={userId}
            currentChatId={currentChatId}
            onChatSelect={handleChatSelect}
            onNewChat={handleNewChat}
          />

          <div className="flex-1 flex flex-col min-w-0">
            <ChatInterface chatId={currentChatId} userId={userId} />
          </div>
        </div>
      </SidebarProvider>
  )
}
