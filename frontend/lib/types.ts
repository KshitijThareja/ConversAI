export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  edited?: boolean
  originalContent?: string
  attachments?: Attachment[]
}

export interface Attachment {
  id: string
  name: string
  type: string
  url: string
  size: number
  [key: string]: any
}

export interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
  userId: string
}

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
}
