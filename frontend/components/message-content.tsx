"use client"

import { memo, useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { vs2015 } from "react-syntax-highlighter/dist/esm/styles/hljs"

interface MessageContentProps {
  content: string
}

export const MessageContent = memo(({ content }: MessageContentProps) => {
  // Detect system theme for SSR/CSR compatibility
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
      const listener = (e: MediaQueryListEvent) => setIsDark(e.matches);
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", listener);
      return () => window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", listener);
    }
  }, []);
  return (
    <ReactMarkdown
      components={{
        code({ node, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "")
          return match ? (
            <div className="relative">
              <div
                className={
                  "flex items-center justify-between px-4 py-2 rounded-t-lg border-b bg-gray-100 border-gray-200 dark:bg-[#2f2f2f] dark:border-[#404040]"
                }
              >
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {match[1]}
                </span>
                <div className="flex gap-2">
                  <button className="text-xs text-gray-600 hover:text-gray-900 hover:text-opacity-80 dark:text-gray-400 dark:hover:text-white dark:hover:text-opacity-80">
                    Copy
                  </button>
                  <button className="text-xs text-gray-600 hover:text-gray-900 hover:text-opacity-80 dark:text-gray-400 dark:hover:text-white dark:hover:text-opacity-80">
                    Edit
                  </button>
                </div>
              </div>
              <SyntaxHighlighter
                style={isDark ? vscDarkPlus : vs2015}
                language={match[1]}
                PreTag="div"
                className="!mt-0 !rounded-t-none !bg-gray-50 dark:!bg-[#1e1e1e]"
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            </div>
          ) : (
            <code
              className="px-1.5 py-0.5 rounded text-sm font-mono bg-gray-100 text-gray-800 dark:bg-[#2f2f2f] dark:text-[#e6db74]"
              {...props}
            >
              {children}
            </code>
          )
        },
        p: ({ children }) => (
          <p className="last:mb-0 leading-relaxed">{children}</p>
        ),
        ul: ({ children }) => <ul className="list-disc pl-6 mb-4 text-gray-800 dark:text-gray-100">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 text-gray-800 dark:text-gray-100">{children}</ol>,
        li: ({ children }) => <li className="mb-2 ml-2 text-gray-800 dark:text-gray-100">{children}</li>,
        h1: ({ children }) => <h1 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold mb-2 text-gray-900 dark:text-white">{children}</h3>,
        strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
        em: ({ children }) => <em className="italic text-gray-600 dark:text-gray-200">{children}</em>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gray-300 pl-4 my-4 text-gray-600 italic dark:border-[#404040] dark:text-gray-300">{children}</blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
})

MessageContent.displayName = "MessageContent"
