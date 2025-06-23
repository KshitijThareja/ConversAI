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

export type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'file'; data: number[]; mimeType: string; name: string };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string | MessagePart[];
  timestamp: Date;
  edited?: boolean;
  originalContent?: string;
  attachments?: Attachment[];
}

interface FileUploadProps {
  onUpload: (files: FileList) => void | Promise<void>;
  children: React.ReactNode;
}
