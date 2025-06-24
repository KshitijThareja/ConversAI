"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useTheme } from "next-themes"
import { useUser } from "@clerk/nextjs"

interface SettingsModalProps {
  children: React.ReactNode
}

export function SettingsModal({ children }: SettingsModalProps) {
  const [open, setOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const { user } = useUser()
  const userId = user?.id
  const [memoriesModal, setMemoriesModal] = useState(false)
  const [memories, setMemories] = useState<any[]>([])
  const [loadingMemories, setLoadingMemories] = useState(false)

  const handleThemeChange = (value: string) => {
    setTheme(value)
  }

  const fetchMemories = () => {
    if (!userId) return
    setLoadingMemories(true)
    fetch(`/api/memories/${userId}`)
      .then(res => res.json())
      .then(data => {
        console.log("Memories data:", data)
        setMemories(Array.isArray(data.memories) ? data.memories : [])
      })
      .catch(error => {
        console.error("Error fetching memories:", error)
        setMemories([])
      })
      .finally(() => setLoadingMemories(false))
  }

  const handleDeleteMemory = async (id: string) => {
    if (!userId) return
    await fetch(`/api/memories/${userId}?id=${id}`, { method: 'DELETE' })
    setMemories(memories.filter(m => m.id !== id))
  }

  useEffect(() => {
    if (memoriesModal) fetchMemories()
  }, [memoriesModal, userId])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#2f2f2f] border-gray-200 dark:border-[#404040]">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Theme Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Theme</h3>
              <RadioGroup value={theme} onValueChange={handleThemeChange} className="space-y-3">
                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#404040] transition-colors">
                  <RadioGroupItem value="light" id="light" className="border-gray-300 dark:border-gray-600 radio-small" />
                  <Label htmlFor="light" className="flex items-center gap-3 cursor-pointer flex-1">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Light</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Use light theme</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#404040] transition-colors">
                  <RadioGroupItem value="dark" id="dark" className="border-gray-300 dark:border-gray-600 radio-small" />
                  <Label htmlFor="dark" className="flex items-center gap-3 cursor-pointer flex-1">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Dark</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Use dark theme</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#404040] transition-colors">
                  <RadioGroupItem value="system" id="system" className="border-gray-300 dark:border-gray-600 radio-small" />
                  <Label htmlFor="system" className="flex items-center gap-3 cursor-pointer flex-1">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">System</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Use system settings</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Memory Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Memory</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#404040] transition-colors">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Memory management</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Manage your memories</div>
                </div>
                <Button onClick={() => setMemoriesModal(true)} className="ml-4 px-4 py-2 rounded bg-[#35363a] hover:bg-[#444654] text-white font-medium transition-colors">Manage Memories</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-[#404040]">
          <Button
            onClick={() => setOpen(false)}
            className="bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
          >
            Done
          </Button>
        </div>
      </DialogContent>

      {/* Memory Management Modal */}
      <Dialog open={memoriesModal} onOpenChange={setMemoriesModal}>
        <DialogContent className="max-w-xl bg-white dark:bg-[#2f2f2f] border-gray-200 dark:border-[#404040]">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              Memories
            </DialogTitle>
          </DialogHeader>
          {loadingMemories ? (
            <div className="text-gray-400">Loading memories...</div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {memories.length === 0 && <div className="text-gray-400">No memories found.</div>}
              {Array.isArray(memories) && memories.map(memory => (
                <div key={memory.id} className="flex items-center justify-between dark:bg-[#232324] border border-[#35363a] rounded-lg px-4 py-3">
                  <div className="truncate max-w-xs text-gray-900 dark:text-white">
                    {memory.memory}
                  </div>
                  <Button onClick={() => handleDeleteMemory(memory.id)} className="ml-4 text-red-400 hover:text-red-600 transition-colors" variant="ghost">
                    <span className="material-symbols-rounded">delete</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}