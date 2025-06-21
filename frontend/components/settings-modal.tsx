"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Settings } from "lucide-react"
import { useTheme } from "next-themes"

interface SettingsModalProps {
  children: React.ReactNode
}

export function SettingsModal({ children }: SettingsModalProps) {
  const [open, setOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  const handleThemeChange = (value: string) => {
    setTheme(value)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#2f2f2f] border-gray-200 dark:border-[#404040]">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
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
                  <RadioGroupItem value="light" id="light" className="border-gray-300 dark:border-gray-600" />
                  <Label htmlFor="light" className="flex items-center gap-3 cursor-pointer flex-1">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Light</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Use light theme</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#404040] transition-colors">
                  <RadioGroupItem value="dark" id="dark" className="border-gray-300 dark:border-gray-600" />
                  <Label htmlFor="dark" className="flex items-center gap-3 cursor-pointer flex-1">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Dark</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Use dark theme</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#404040] transition-colors">
                  <RadioGroupItem value="system" id="system" className="border-gray-300 dark:border-gray-600" />
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

          {/* Other Settings Sections */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">General</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#404040] transition-colors">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Data controls</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Manage your data and privacy</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#404040] transition-colors">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Beta features</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Try experimental features</div>
                </div>
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
    </Dialog>
  )
}