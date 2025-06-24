"use client"

import { useState, useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Search, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Chat } from "@/lib/types"
import { getMessagePreviewText } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

interface SearchModalProps {
  chats: Chat[]
  currentChatId?: string
  onChatSelect: (chatId: string) => void
  onNewChat: () => void
  trigger: React.ReactNode
}

export function SearchModal({ chats, currentChatId, onChatSelect, onNewChat, trigger }: SearchModalProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const now = new Date()
  const isMobile = useIsMobile()

  const categorizeChats = (chats: Chat[]) => {
    const categories = {
      today: [] as Chat[],
      thisWeek: [] as Chat[],
      thisMonth: [] as Chat[],
      older: [] as Chat[],
    }

    chats.forEach((chat) => {
      const chatDate = new Date(chat.createdAt)
      const diffTime = Math.abs(now.getTime() - chatDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays === 0) {
        categories.today.push(chat)
      } else if (diffDays <= 7) {
        categories.thisWeek.push(chat)
      } else if (diffDays <= 30) {
        categories.thisMonth.push(chat)
      } else {
        categories.older.push(chat)
      }
    })

    return categories
  }

  const filteredChats = chats.filter(chat =>
    chat.title.includes(searchQuery.toLowerCase())
  )
  const categorizedChats = categorizeChats(filteredChats)

  // Full page search for mobile
  if (isMobile && searchOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-[#2f2f2f] flex flex-col" role="dialog" aria-labelledby="search-title" aria-modal="true">
        <header className="p-4" role="banner">
          <div className="flex items-center border-b border-gray-200 dark:border-[#424242] pb-4" role="search">
            <div className="relative flex-1">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                aria-label="Search chats"
                aria-describedby="search-help"
                className="w-full bg-transparent border-none text-lg h-12 pr-3 placeholder:text-gray-400 focus:outline-none focus:border-none focus:ring-0 focus:ring-offset-0 rounded-lg"
              />
            </div>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => setSearchOpen(false)} 
              className="ml-1"
              aria-label="Close search"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </header>
        <main className="flex-1 px-4 pb-4" role="main">
          <ScrollArea className="h-full" role="region" aria-label="Search results">
            <Button
              onClick={() => {
                onNewChat()
                setSearchOpen(false)
              }}
              className="w-full justify-start mb-2 bg-transparent hover:bg-gray-100 dark:hover:bg-[#424242] text-gray-900 dark:text-white border-0 h-10"
              aria-label="Start new chat"
            >
              <Plus className="w-4 h-4 mr-3" />
              New Chat
            </Button>
            <div role="list" aria-label="Search results by category">
              {Object.entries(categorizedChats).map(([category, chatsInCategory]) => (
                chatsInCategory.length > 0 && (
                  <div key={category} role="group" aria-labelledby={`category-${category}`}>
                    <h4 id={`category-${category}`} className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 py-1">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </h4>
                    <div role="list" aria-label={`${category} chats`}>
                      {chatsInCategory.map((chat) => (
                        <div
                          key={chat.id}
                          className={`p-2 hover:bg-gray-100 dark:hover:bg-[#424242] rounded-md cursor-pointer ${currentChatId === chat.id ? "bg-gray-100 dark:bg-[#2f2f2f]" : ""}`}
                          role="listitem"
                          aria-label={`Chat: ${getMessagePreviewText(chat.title)}`}
                          aria-current={currentChatId === chat.id ? "true" : undefined}
                          onClick={() => {
                            onChatSelect(chat.id)
                            setSearchOpen(false)
                          }}
                        >
                          <span className="text-sm text-gray-700 dark:text-gray-200">{getMessagePreviewText(chat.title)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
            {Object.values(categorizedChats).every(chats => chats.length === 0) && (
              <div className="text-center text-gray-500 py-4" role="status">No chats found</div>
            )}
            <div id="search-help" className="sr-only">
              Search through your chat history. Results are grouped by time period.
            </div>
          </ScrollArea>
        </main>
      </div>
    )
  }

  // Modal for desktop
  return (
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogTitle id="search-title" className="sr-only">Search Chats</DialogTitle>
      <DialogContent hideClose={true} className="sm:max-w-[425px] md:max-w-[600px] md:h-[450px] border-2 bg-gray-50 dark:bg-[#2f2f2f]" role="dialog" aria-labelledby="search-title">
        <header className="flex items-center border-b border-gray-200 dark:border-[#424242] pb-4 px-1" role="search">
          <div className="relative flex-1">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              aria-label="Search chats"
              aria-describedby="search-help"
              className="w-full bg-transparent border-none text-lg h-12 pr-3 placeholder:text-gray-400 focus:outline-none focus:border-none focus:ring-0 focus:ring-offset-0 rounded-lg"
            />
          </div>
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => setSearchOpen(false)} 
            className="ml-1"
            aria-label="Close search"
          >
            <X className="w-6 h-6" />
          </Button>
        </header>
        <main className="grid gap-4 py-4" role="main">
          <ScrollArea className="h-[300px]" role="region" aria-label="Search results">
            <Button
              onClick={() => {
                onNewChat()
                setSearchOpen(false)
              }}
              className="w-full justify-start mb-2 bg-transparent hover:bg-gray-100 dark:hover:bg-[#424242] text-gray-900 dark:text-white border-0 h-10"
              aria-label="Start new chat"
            >
              <Plus className="w-4 h-4 mr-3" />
              New Chat
            </Button>
            <div role="list" aria-label="Search results by category">
              {Object.entries(categorizedChats).map(([category, chatsInCategory]) => (
                chatsInCategory.length > 0 && (
                  <div key={category} role="group" aria-labelledby={`category-${category}`}>
                    <h4 id={`category-${category}`} className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 py-1">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </h4>
                    <div role="list" aria-label={`${category} chats`}>
                      {chatsInCategory.map((chat) => (
                        <div
                          key={chat.id}
                          className={`p-2 hover:bg-gray-100 dark:hover:bg-[#424242] rounded-md cursor-pointer ${currentChatId === chat.id ? "bg-gray-100 dark:bg-[#2f2f2f]" : ""}`}
                          role="listitem"
                          aria-label={`Chat: ${getMessagePreviewText(chat.title)}`}
                          aria-current={currentChatId === chat.id ? "true" : undefined}
                          onClick={() => {
                            onChatSelect(chat.id)
                            setSearchOpen(false)
                          }}
                        >
                          <span className="text-sm text-gray-700 dark:text-gray-200">{getMessagePreviewText(chat.title)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
            {Object.values(categorizedChats).every(chats => chats.length === 0) && (
              <div className="text-center text-gray-500 py-4" role="status">No chats found</div>
            )}
            <div id="search-help" className="sr-only">
              Search through your chat history. Results are grouped by time period.
            </div>
          </ScrollArea>
        </main>
      </DialogContent>
    </Dialog>
  )
}