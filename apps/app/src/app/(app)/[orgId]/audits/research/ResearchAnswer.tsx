'use client';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@trycompai/design-system';
import { Document } from '@trycompai/design-system/icons';
import { createContext, useContext, type ComponentProps } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './research-markdown.css';
import type { ResearchCitation } from './research-types';
const SourceContext = createContext<{
  citations: ResearchCitation[];
  onSource: (source: ResearchCitation) => void;
}>({ citations: [], onSource: () => undefined });
function CitationLink({ href, children }: ComponentProps<'a'>) {
  const { citations, onSource } = useContext(SourceContext);
  const source = citations.find((c) => href === `#source-${c.label}`);
  return source ? (
    <Button
      variant="link"
      size="xs"
      onClick={() => onSource(source)}
      aria-label={`Open source ${source.label}: ${source.title}`}
      iconLeft={<Document size={12} />}
    >
      {children}
    </Button>
  ) : (
    <span>{children}</span>
  );
}
// Stable component identities preserve focus, selection and table scroll during polling.
const components: Components = {
  img: () => null,
  a: CitationLink,
  thead: ({ children }) => <TableHeader>{children}</TableHeader>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow>{children}</TableRow>,
  th: ({ children }) => <TableHead>{children}</TableHead>,
  td: ({ children }) => <TableCell>{children}</TableCell>,
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border">
      <Table>{children}</Table>
    </div>
  ),
  pre: ({ children }) => <pre className="overflow-x-auto whitespace-pre-wrap">{children}</pre>,
};
export function ResearchAnswer({
  text,
  citations,
  onSource,
}: {
  text: string;
  citations: ResearchCitation[];
  onSource: (source: ResearchCitation) => void;
}) {
  return (
    <SourceContext.Provider value={{ citations, onSource }}>
      <div className="audit-research-markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={components}>
          {text}
        </ReactMarkdown>
      </div>
    </SourceContext.Provider>
  );
}
