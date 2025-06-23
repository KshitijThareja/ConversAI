"use client"

import { memo } from "react"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { useTheme } from "next-themes"
import { vs2015 } from "react-syntax-highlighter/dist/esm/styles/hljs"

interface MessageContentProps {
  content: string
}

export const MessageContent = memo(({ content }: MessageContentProps) => {
  const { theme } = useTheme()
  return (
    <ReactMarkdown
      components={{
        code({ node, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "")
          return match ? (
            <div className="relative">
              <div
                className={`flex items-center justify-between px-4 py-2 rounded-t-lg border-b ${
                  theme === "dark" ? "bg-[#2f2f2f] border-[#404040]" : "bg-gray-100 border-gray-200"
                }`}
              >
                <span className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  {match[1]}
                </span>
                <div className="flex gap-2">
                  <button
                    className={`text-xs hover:text-opacity-80 ${
                      theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Copy
                  </button>
                  <button
                    className={`text-xs hover:text-opacity-80 ${
                      theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Edit
                  </button>
                </div>
              </div>
              <SyntaxHighlighter
                style={theme === "dark" ? vscDarkPlus : vs2015}
                language={match[1]}
                PreTag="div"
                className={`!mt-0 !rounded-t-none ${theme === "dark" ? "!bg-[#1e1e1e]" : "!bg-gray-50"}`}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            </div>
          ) : (
            <code
              className={`px-1.5 py-0.5 rounded text-sm font-mono ${
                theme === "dark" ? "bg-[#2f2f2f] text-[#e6db74]" : "bg-gray-100 text-gray-800"
              }`}
              {...props}
            >
              {children}
            </code>
          )
        },
        p: ({ children }) => (
          <p className={`last:mb-0 leading-relaxed`}>
            {children}
          </p>
        ),
        ul: ({ children }) => <ul className="list-disc pl-6 mb-4 text-gray-100">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 text-gray-100">{children}</ol>,
        li: ({ children }) => <li className="mb-2">{children}</li>,
        h1: ({ children }) => <h1 className="text-xl font-semibold mb-4 text-white">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-semibold mb-3 text-white">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold mb-2 text-white">{children}</h3>,
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        em: ({ children }) => <em className="italic text-gray-200">{children}</em>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-[#404040] pl-4 my-4 text-gray-300 italic">{children}</blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
})

MessageContent.displayName = "MessageContent"
