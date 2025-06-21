"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import {
  Plus,
  Search,
  SidebarOpen,
  SidebarClose,
  SidebarIcon,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  Edit3,
  User,
  X,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Chat } from "@/lib/types"
import { useSidebar } from "@/contexts/sidebar-context"

interface SidebarProps {
  userId: string
  currentChatId?: string
  onChatSelect: (chatId: string) => void
  onNewChat: () => void
}

function SidebarContent({ userId, currentChatId, onChatSelect, onNewChat }: SidebarProps) {
  const [chats, setChats] = useState<Chat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { isOpen, isMobile, toggleSidebar, closeSidebar } = useSidebar()

  // Mock chat data to match the screenshot
  const mockChats = [
    "AI Mind vs Machine",
    "MPI Setup Guide",
    "Fixing SSH service failure",
    "Research Papers for Call Graphs",
    "HTML div centering results",
    "Code Conflict Resolution",
    "FormData Async Iterable Issue",
    "PPA Release Error Fix",
    "useRef Hook Explained",
    "Full-stack Stock Analysis",
    "Stock Price Charting App",
    "Cover Letter Enhancement",
    "New chat",
    "Ignore TS Build Errors",
    "Tech Quiz Answers",
    "Vite alias configuration fix",
  ]

  useEffect(() => {
    // Simulate loading chats
    setTimeout(() => {
      const simulatedChats = mockChats.map((title, index) => ({
        id: `chat-${index}`,
        title,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        userId,
      }))
      setChats(simulatedChats)
      setIsLoading(false)
    }, 500)
  }, [userId])

  const handleNewChat = async () => {
    onNewChat()
    if (isMobile) {
      closeSidebar()
    }
  }

  const handleChatSelect = (chatId: string) => {
    onChatSelect(chatId)
    if (isMobile) {
      closeSidebar()
    }
  }

  const deleteChat = async (chatId: string) => {
    setChats((prev) => prev.filter((chat) => chat.id !== chatId))
  }

  return (
    <div className={`h-full flex flex-col bg-gray-50 ${isOpen ? "dark:bg-[#171717]" : "dark:bg-[#212121]"} text-gray-900 dark:text-white`}>
      <div className="flex justify-between items-center p-3">
        <div className="flex items-center gap-2 pl-1">
          <div className="w-6 h-6 bg-gray-900 dark:bg-white rounded-sm flex items-center justify-center">
            <div className="w-4 h-4 bg-white dark:bg-black rounded-sm"></div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div onClick={toggleSidebar} className="place-items-center w-10 h-10 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f]">
          {isMobile ? (
              isOpen ? <SidebarIcon className="w-4 h-4 hidden" /> : <SidebarIcon className="w-4 h-4" />
            ) : (
              <SidebarIcon className="mt-2 w-6 h-6 m-auto" />
            )}
          </div>
          {isMobile && (
            <Button
              size="sm"
              variant="ghost"
              onClick={closeSidebar}
              className="h-8 w-8 p-0 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f] md:hidden"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <div className="p-2 pl-0 space-y-1">
        <Button
          onClick={handleNewChat}
          className="w-full justify-start bg-transparent hover:bg-gray-100 dark:hover:bg-[#2f2f2f] text-gray-900 dark:text-white border-0 h-10"
        >
          <Plus className="w-4 h-4 mr-3" />
          New chat
        </Button>

        <Button className="w-full justify-start bg-transparent hover:bg-gray-100 dark:hover:bg-[#2f2f2f] text-gray-900 dark:text-white border-0 h-10">
          <Search className="w-4 h-4 mr-3" />
          Search chats
        </Button>
      </div>

      {/* Chats Section */}
      <div className="flex-1 overflow-hidden">
        <div className="px-3 py-2">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Chats</h3>
        </div>

        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1 pb-4">
            {isLoading ? (
              <div className="text-center text-gray-400 py-4 text-sm">Loading...</div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2f2f2f] transition-colors ${
                    currentChatId === chat.id ? "bg-gray-100 dark:bg-[#2f2f2f]" : ""
                  }`}
                  onClick={() => handleChatSelect(chat.id)}
                >
                  <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="flex-1 truncate text-sm text-gray-700 dark:text-gray-200">{chat.title}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#404040]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-white dark:bg-[#2f2f2f] border-gray-200 dark:border-[#404040]"
                    >
                      <DropdownMenuItem className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#404040]">
                        <Edit3 className="w-4 h-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteChat(chat.id)}
                        className="text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-[#404040]"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-200 dark:border-[#2f2f2f] space-y-1">
        <Button className="w-full justify-start bg-transparent hover:bg-gray-100 dark:hover:bg-[#2f2f2f] text-gray-900 dark:text-white border-0 h-10">
          <User className="w-4 h-4 mr-3" />
          <span className="text-sm">User</span>
        </Button>
      </div>
    </div>
  )
}

export function Sidebar(props: SidebarProps) {
  const { isOpen, isMobile, toggleSidebar } = useSidebar()
  const [isHovered, setIsHovered] = useState(false)

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={toggleSidebar}>
        <SheetContent
          side="left"
          className="w-[280px] p-0 bg-gray-50 dark:bg-[#171717] border-gray-200 dark:border-[#2f2f2f]"
        >
          <SidebarContent {...props} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      className={`transition-all duration-300 ease-in-out border-r border-gray-200 dark:border-[#2f2f2f] ${
        isOpen ? "w-[300px]" : "w-[55px]"
      } overflow-hidden flex flex-col`}
    >
      {isOpen ? (
        <div className="w-[300px] h-full">
          <SidebarContent {...props} />
        </div>
      ) : (
        <div className="w-[55px] h-full flex flex-col items-center py-2">
          {!isOpen && (
            <div
              className="relative w-10 h-10 mt-1 flex items-center justify-center group cursor-pointer"
              onClick={toggleSidebar}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-10 h-10 rounded-md text-gray-900 dark:text-white bg-gray-100 dark:bg-[#2f2f2f]">
                <SidebarIcon className="w-6 h-6" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity duration-200">
                <div className="w-6 h-6 bg-gray-900 dark:bg-white rounded-sm flex items-center justify-center">
                  <div className="w-4 h-4 bg-white dark:bg-black rounded-sm" />
                </div>
              </div>
            </div>
          )}
          <div className="flex flex-col items-center mt-4">
            <Button size="sm" variant="ghost" className="h-10 w-10 p-0 text-gray-400 hover:text-white">
              <Plus className="w-6 h-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f]" />
            </Button>
            <Button size="sm" variant="ghost" className="h-10 w-10 p-0 text-gray-400 hover:text-white">
              <Search className="w-6 h-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f]" />
            </Button>
          </div>
          <div className="flex flex-col items-center space-y-4 mt-auto">
            <Button size="sm" variant="ghost" className="h-10 w-10 p-0 text-gray-400 hover:text-white">
              <User className="w-6 h-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f]" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}