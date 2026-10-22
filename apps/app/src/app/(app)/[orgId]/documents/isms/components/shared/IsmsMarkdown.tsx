'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Read-only formatting. Raw HTML and remote images never execute or load. */
export function IsmsMarkdown({ children }: { children: string }) {
  return (
    <div className="min-w-0 break-words text-sm leading-7 text-foreground [overflow-wrap:anywhere]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1: ({ children }) => (
            <h3 className="mb-2 mt-5 text-lg font-semibold first:mt-0">{children}</h3>
          ),
          h2: ({ children }) => (
            <h4 className="mb-2 mt-5 text-base font-semibold first:mt-0">{children}</h4>
          ),
          h3: ({ children }) => <h5 className="mb-2 mt-4 font-semibold first:mt-0">{children}</h5>,
          h4: ({ children }) => <h6 className="mb-2 mt-4 font-semibold first:mt-0">{children}</h6>,
          p: ({ children }) => (
            <p className="my-3 whitespace-pre-line first:mt-0 last:mb-0">{children}</p>
          ),
          ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-6">{children}</ol>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-primary/40 pl-4 text-muted-foreground">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) =>
            href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4"
              >
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
          img: ({ alt }) => <span className="text-muted-foreground">{alt || 'Image'}</span>,
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-md bg-muted p-3 text-xs">{children}</pre>
          ),
          code: ({ children }) => (
            <code className="rounded bg-muted px-1 py-0.5 text-[0.9em]">{children}</code>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border bg-muted px-3 py-2 align-top font-medium">{children}</th>
          ),
          td: ({ children }) => <td className="border px-3 py-2 align-top">{children}</td>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
