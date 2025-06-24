"use client"

import { useState, useEffect, useCallback } from "react"
import { ChatInterface } from "@/components/chat-interface"
import { Sidebar } from "@/components/sidebar"
import { SidebarProvider } from "@/contexts/sidebar-context"
import type { Message } from "@/lib/types"
import { useUser } from "@clerk/nextjs"
import "./globals.css"

export default function ChatPage() {
  const [currentChatId, setCurrentChatId] = useState<string>()
  const [initialMessages, setInitialMessages] = useState<Message[]>([])
  const [refreshSidebar, setRefreshSidebar] = useState(0)
  const { user } = useUser()
  const userId = user?.id || "default-user"

  const handleChatSelect = (chatId: string) => {
    setCurrentChatId(chatId)
  }

  const handleNewChat = () => {
    setCurrentChatId(undefined)
    setInitialMessages([])
  }

  const handleMessageSent = useCallback(() => {
    setRefreshSidebar(prev => prev + 1)
  }, [])

  const handleChatIdUpdate = useCallback((newChatId: string) => {
    setCurrentChatId(newChatId)
  }, [])

  useEffect(() => {
    if (currentChatId && refreshSidebar > 0) {
      fetch(`/api/chat?chatId=${currentChatId}&userId=${userId}`)
        .then((res) => {
          if (!res.ok) {
            setCurrentChatId(undefined)
            setInitialMessages([])
          }
        })
        .catch((err) => {
          console.error("Failed to verify chat exists:", err)
          setCurrentChatId(undefined)
          setInitialMessages([])
        })
    }
  }, [refreshSidebar, currentChatId, userId])

  useEffect(() => {
    if (currentChatId) {
      fetch(`/api/chat?chatId=${currentChatId}&userId=${userId}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`)
          }
          return res.json()
        })
        .then((data) => {
          console.log("Fetched chat data:", data)
          setInitialMessages(data.messages || [])
        })
        .catch((err) => {
          console.error("Failed to fetch chat history:", err)
          setInitialMessages([])
        })
    } else {
      setInitialMessages([])
    }
  }, [currentChatId, userId])

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-white dark:bg-[#212121] text-gray-900 dark:text-white overflow-hidden">
        <Sidebar 
          currentChatId={currentChatId} 
          onChatSelect={handleChatSelect} 
          onNewChat={handleNewChat}
          refreshTrigger={refreshSidebar}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <ChatInterface 
            chatId={currentChatId} 
            initialMessages={initialMessages}
            onMessageSent={handleMessageSent}
            onChatIdUpdate={handleChatIdUpdate}
          />
        </div>
      </div>
    </SidebarProvider>
  )
}