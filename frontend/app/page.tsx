"use client"

import { useState, useEffect, useCallback } from "react"
import { ChatInterface } from "@/components/chat-interface"
import { Sidebar } from "@/components/sidebar"
import { SidebarProvider } from "@/contexts/sidebar-context"
import type { Message } from "@/lib/types"
import { useUser, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { MessageSquare, LogIn } from "lucide-react"
import "./globals.css"

export default function ChatPage() {
  const [currentChatId, setCurrentChatId] = useState<string>()
  const [initialMessages, setInitialMessages] = useState<Message[]>([])
  const [refreshSidebar, setRefreshSidebar] = useState(0)
  const { user, isLoaded } = useUser()
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

  if (!isLoaded) {
    return (
      <div className="flex h-screen bg-white dark:bg-[#212121] text-gray-900 dark:text-white overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-white dark:bg-[#212121] text-gray-900 dark:text-white overflow-hidden">
        <SignedIn>
          <Sidebar 
            currentChatId={currentChatId} 
            onChatSelect={handleChatSelect} 
            onNewChat={handleNewChat}
            refreshTrigger={refreshSidebar}
          />
        </SignedIn>
        <div className="flex-1 flex flex-col min-w-0">
          <SignedIn>
            <ChatInterface 
              chatId={currentChatId} 
              initialMessages={initialMessages}
              onMessageSent={handleMessageSent}
              onChatIdUpdate={handleChatIdUpdate}
            />
          </SignedIn>
          <SignedOut>
            <div className="flex flex-col h-full bg-white dark:bg-[#212121]">
              <header className="flex items-center justify-between p-3 md:p-4" role="banner">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-900 dark:bg-white rounded-sm flex items-center justify-center" role="img" aria-label="ConversAI logo">
                    <div className="w-4 h-4 bg-white dark:bg-black rounded-sm"></div>
                  </div>
                  <h1 className="text-gray-900 dark:text-white font-medium text-lg">ConversAI</h1>
                </div>
              </header>
              <main className="flex-1 flex flex-col items-center justify-center px-4 pb-24" role="main">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-[#2f2f2f] rounded-full flex items-center justify-center mx-auto mb-6">
                    <MessageSquare className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                  </div>
                  <h2 className="text-xl md:text-3xl font-medium text-gray-900 dark:text-white mb-4">
                    Welcome to ConversAI
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 max-w-md">
                    Your intelligent conversation companion. Sign in to start chatting and explore your conversation history.
                  </p>
                  <SignInButton>
                    <Button 
                      size="lg" 
                      className="bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 px-8 py-3 text-lg"
                      aria-label="Sign in to start chatting"
                    >
                      <LogIn className="w-5 h-5 mr-2" />
                      Sign In to Start Chatting
                    </Button>
                  </SignInButton>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    By signing in, you agree to our{" "}
                    <button className="underline hover:text-gray-400" aria-label="View terms of service">Terms of Service</button>
                    {" "}and{" "}
                    <button className="underline hover:text-gray-400" aria-label="View privacy policy">Privacy Policy</button>
                  </p>
                </div>
              </main>
            </div>
          </SignedOut>
        </div>
      </div>
    </SidebarProvider>
  )
}