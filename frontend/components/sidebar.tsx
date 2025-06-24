"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  Plus,
  Search,
  SidebarIcon,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  Edit3,
  X,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Chat } from "@/lib/types"
import { useSidebar } from "@/contexts/sidebar-context"
import { useUser } from "@clerk/nextjs"
import { SearchModal } from "./search-modal"
import { getMessagePreviewText } from "@/lib/utils"

interface SidebarProps {
  currentChatId?: string
  onChatSelect: (chatId: string) => void
  onNewChat: () => void
  refreshTrigger?: number
}

function SidebarContent({ 
  currentChatId, 
  onChatSelect, 
  onNewChat, 
  refreshTrigger,
  chats,
  setChats,
  isLoading,
  userId
}: SidebarProps & {
  chats: Chat[]
  setChats: (chats: Chat[] | ((prev: Chat[]) => Chat[])) => void
  isLoading: boolean
  userId: string
}) {
  const [renamingChat, setRenamingChat] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const { isOpen, isMobile, toggleSidebar, closeSidebar } = useSidebar()

  const handleNewChat = async () => {
    onNewChat()
    if (isMobile) closeSidebar()
  }

  const handleChatSelect = (chatId: string) => {
    onChatSelect(chatId)
    if (isMobile) closeSidebar()
  }

  const deleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chat?chatId=${chatId}&userId=${userId}`, { method: "DELETE" })
      if (response.ok) {
        setChats((prev) => prev.filter((chat) => chat.id !== chatId))
        if (currentChatId === chatId) {
          onNewChat()
        }
      } else {
        console.error("Failed to delete chat")
      }
    } catch (error) {
      console.error("Failed to delete chat:", error)
    }
  }

  const startRename = (chat: Chat) => {
    setRenamingChat(chat.id)
    setNewTitle(chat.title)
  }

  const handleRename = async () => {
    if (!renamingChat || !newTitle.trim()) return

    try {
      const response = await fetch(`/api/chat?chatId=${renamingChat}&userId=${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename", title: newTitle.trim() })
      })

      if (response.ok) {
        setChats((prev) => 
          prev.map((chat) => 
            chat.id === renamingChat 
              ? { ...chat, title: newTitle.trim() }
              : chat
          )
        )
        setRenamingChat(null)
        setNewTitle("")
      } else {
        console.error("Failed to rename chat")
      }
    } catch (error) {
      console.error("Failed to rename chat:", error)
    }
  }

  const cancelRename = () => {
    setRenamingChat(null)
    setNewTitle("")
  }

  return (
    <aside className={`h-full flex flex-col bg-gray-50 ${isOpen ? "dark:bg-[#171717]" : "dark:bg-[#212121]"} text-gray-900 dark:text-white`} role="complementary" aria-label="Chat navigation sidebar">
      <header className="flex justify-between items-center p-3" role="banner">
        <div className="flex items-center gap-2 pl-1">
          <div className="w-6 h-6 bg-gray-900 dark:bg-white rounded-sm flex items-center justify-center" role="img" aria-label="ConversAI logo">
            <div className="w-4 h-4 bg-white dark:bg-black rounded-sm"></div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={toggleSidebar} 
            className="place-items-center w-10 h-10 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f]"
            aria-label="Toggle sidebar"
          >
            {isMobile ? (isOpen ? <SidebarIcon className="w-4 h-4 hidden" /> : <SidebarIcon className="w-4 h-4" />) : <SidebarIcon className="mt-2 w-6 h-6 m-auto" />}
          </button>
          {isMobile && (
            <Button
              size="sm"
              variant="ghost"
              onClick={closeSidebar}
              className="h-8 w-8 p-0 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f] md:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </header>

      <nav className="p-2 pl-0 space-y-1" role="navigation" aria-label="Chat actions">
        <Button
          onClick={handleNewChat}
          className="w-full justify-start bg-transparent hover:bg-gray-100 dark:hover:bg-[#2f2f2f] text-gray-900 dark:text-white border-0 h-10"
          aria-label="Start new chat"
        >
          <Plus className="w-4 h-4 mr-3" />
          New chat
        </Button>
        <SearchModal
          chats={chats}
          currentChatId={currentChatId}
          onChatSelect={handleChatSelect}
          onNewChat={onNewChat}
          trigger={
            <Button 
              className="w-full justify-start bg-transparent hover:bg-gray-100 dark:hover:bg-[#2f2f2f] text-gray-900 dark:text-white border-0 h-10"
              aria-label="Search chats"
            >
              <Search className="w-4 h-4 mr-3" />
              Search chats
            </Button>
          }
        />
      </nav>

      <section className="flex-1 overflow-hidden" role="region" aria-label="Chat history">
        <div className="px-3 py-2">
          <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Chats</h2>
        </div>
        <ScrollArea className="flex-1 px-2" role="region" aria-label="Chat list">
          <div className="space-y-1 pb-4" role="list" aria-label="Chat history">
            {isLoading ? (
              <div className="text-center text-gray-400 py-4 text-sm" role="status" aria-live="polite">Loading...</div>
            ) : (
              [...chats]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((chat) => (
                  <div
                    key={chat.id}
                    className={`group flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2f2f2f] transition-colors ${currentChatId === chat.id ? "bg-gray-100 dark:bg-[#2f2f2f]" : ""}`}
                    role="listitem"
                    aria-label={`Chat: ${getMessagePreviewText(chat.title)}`}
                    aria-current={currentChatId === chat.id ? "true" : undefined}
                    onClick={() => handleChatSelect(chat.id)}
                  >
                    <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
                    <span className="flex-1 truncate text-sm text-gray-700 dark:text-gray-200">{getMessagePreviewText(chat.title)}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#404040]"
                          aria-label={`More options for chat: ${getMessagePreviewText(chat.title)}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-3 h-3" aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white dark:bg-[#2f2f2f] border-gray-200 dark:border-[#404040]" role="menu">
                        <DropdownMenuItem 
                          onClick={() => startRename(chat)} 
                          className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#404040]"
                          role="menuitem"
                        >
                          <Edit3 className="w-4 h-4 mr-2" aria-hidden="true" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteChat(chat.id)} className="text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-[#404040]" role="menuitem">
                          <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
            )}
          </div>
        </ScrollArea>
      </section>

      {/* Rename Dialog */}
      <Dialog open={!!renamingChat} onOpenChange={cancelRename}>
        <DialogContent className="bg-white dark:bg-[#2f2f2f] border-gray-200 dark:border-[#404040]">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Rename Chat</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter new title"
              className="bg-gray-100 dark:bg-[#404040] border-gray-300 dark:border-[#404040] text-gray-900 dark:text-white"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRename()
                } else if (e.key === "Escape") {
                  cancelRename()
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelRename} className="border-gray-300 dark:border-[#404040] text-gray-600 dark:text-gray-400">
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!newTitle.trim()} className="bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200">
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}

export function Sidebar(props: SidebarProps) {
  const [chats, setChats] = useState<Chat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { isOpen, isMobile, toggleSidebar } = useSidebar()
  const { user } = useUser()
  const userId = user?.id || "default-user"

  const fetchChats = async () => {
    try {
      const response = await fetch(`/api/chat?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setChats(data || [])
      }
    } catch (error) {
      console.error("Failed to fetch chats:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchChats()
  }, [userId, props.refreshTrigger])

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={toggleSidebar}>
        <SheetContent side="left" className="w-[280px] p-0 bg-gray-50 dark:bg-[#171717] border-gray-200 dark:border-[#2f2f2f]">
          <SidebarContent {...props} chats={chats} setChats={setChats} isLoading={isLoading} userId={userId} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div className={`transition-all duration-300 ease-in-out border-r border-gray-200 dark:border-[#2f2f2f] ${isOpen ? "w-[250px]" : "w-[55px]"} overflow-hidden flex flex-col`}>
      {isOpen ? (
        <div className="w-[250px] h-full">
          <SidebarContent {...props} chats={chats} setChats={setChats} isLoading={isLoading} userId={userId} />
        </div>
      ) : (
        <SidebarCollapsed {...props} chats={chats} />
      )}
    </div>
  )
}

function SidebarCollapsed(props: SidebarProps & { chats: Chat[] }) {
  const { toggleSidebar } = useSidebar()

  return (
    <div className="w-[55px] h-full flex flex-col items-center py-2">
      <div className="relative w-10 h-10 mt-1 flex items-center justify-center group cursor-pointer" onClick={toggleSidebar}>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-10 h-10 rounded-md text-gray-900 dark:text-white bg-gray-100 dark:bg-[#2f2f2f]">
          <SidebarIcon className="w-6 h-6" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity duration-200">
          <div className="w-6 h-6 bg-gray-900 dark:bg-white rounded-sm flex items-center justify-center">
            <div className="w-4 h-4 bg-white dark:bg-black rounded-sm" />
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center mt-4 gap-2">
        <Button size="sm" variant="ghost" className="h-10 w-10 p-0 text-gray-400 hover:text-white" onClick={props.onNewChat}>
          <Plus className="w-6 h-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f]" />
        </Button>
        <SearchModal
          chats={props.chats}
          currentChatId={props.currentChatId}
          onChatSelect={props.onChatSelect}
          onNewChat={props.onNewChat}
          trigger={
            <Button size="sm" variant="ghost" className="h-10 w-10 p-0 text-gray-400 hover:text-white">
              <Search className="w-6 h-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f]" />
            </Button>
          }
        />
      </div>
    </div>
  )
}