'use client';
import { Badge, Button } from '@trycompai/design-system';
import { Checkmark, Copy, Renew, WatsonHealthAiResults } from '@trycompai/design-system/icons';
import { toast } from 'sonner';
import { ResearchAnswer } from './ResearchAnswer';
import { ResearchSources } from './ResearchSources';
import type { ResearchCitation, ResearchTurn } from './research-types';
export const RESEARCH_SUGGESTIONS = [
  {
    title: 'Prepare my next review',
    description: 'Turn the audit scope into focused questions.',
    prompt:
      'Review this audit’s scope, checks and evidence. Suggest my next five audit questions, with the sources I should inspect and any evidence gaps.',
  },
  {
    title: 'Connect the evidence',
    description: 'Compare policies with implementation records.',
    prompt:
      'Compare our published security policies with our SoA and implementation evidence. Show supported alignments, contradictions and unanswered questions in a table with sources.',
  },
  {
    title: 'Challenge a conclusion',
    description: 'Find what supports it and what is still missing.',
    prompt:
      'Review the current audit findings and conclusions. For each, identify supporting evidence, conflicting records and follow-up questions. Clearly separate facts from suggested auditor judgments.',
  },
];
export function ResearchConversation({
  turns,
  onSource,
  onSuggestion,
  onRetry,
  canAsk,
}: {
  turns: ResearchTurn[];
  onSource: (value: { turnId: string; citation: ResearchCitation }) => void;
  onSuggestion: (prompt: string) => void;
  onRetry: (prompt: string) => void;
  canAsk: boolean;
}) {
  const handleCopy = async (turn: ResearchTurn) => {
    try {
      await navigator.clipboard.writeText(
        `${turn.answer}\n\nSources\n${turn.citations.map((s) => `[${s.label}] ${s.title} — ${s.version}\n${s.url}`).join('\n')}`,
      );
      toast.success('Answer and source references copied');
    } catch {
      toast.error('Could not copy this answer');
    }
  };
  if (!turns.length)
    return (
      <div className="mx-auto max-w-3xl px-6 py-14">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
          <WatsonHealthAiResults size={26} />
        </div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Your evidence, connected
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">
          A research partner for every audit question.
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Find the right document. Compare what is written with what is evidenced. Follow every
          answer back to its source.
        </p>
        <div className="mt-8 grid gap-3">
          {RESEARCH_SUGGESTIONS.map((item, i) => (
            <button
              key={item.title}
              type="button"
              disabled={!canAsk}
              onClick={() => onSuggestion(item.prompt)}
              className="group flex gap-4 rounded-xl border bg-background p-4 text-left transition hover:border-primary/40 hover:shadow-sm disabled:opacity-50"
            >
              <span className="text-xs font-medium text-primary/60">0{i + 1}</span>
              <span>
                <span className="block text-sm font-medium">{item.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{item.description}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-5 text-xs leading-5 text-muted-foreground">
          Policies · ISMS documents · SoA · Risks · Vendors · Tasks · Audit evidence · Knowledge
          files
        </p>
      </div>
    );
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-5 py-7 md:px-8">
      {turns.map((turn) => (
        <article key={turn.id} className="space-y-5">
          <div className="ml-8 rounded-xl border bg-muted/40 px-5 py-4">
            <div className="mb-2 flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground">
              <span>{turn.authorName}</span>
              <time dateTime={turn.createdAt}>{new Date(turn.createdAt).toLocaleString()}</time>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6">{turn.prompt}</p>
          </div>
          <div className="rounded-xl border bg-background p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary/10 p-1.5 text-primary">
                  <WatsonHealthAiResults size={16} />
                </span>
                <span className="text-sm font-semibold">Comp AI</span>
                <Badge variant="outline">{turn.model}</Badge>
              </div>
              {turn.status === 'complete' && (
                <Button
                  variant="ghost"
                  size="xs"
                  iconLeft={<Copy size={13} />}
                  onClick={() => void handleCopy(turn)}
                >
                  Copy with sources
                </Button>
              )}
            </div>
            {turn.answer && (
              <ResearchAnswer
                text={turn.answer}
                citations={turn.citations}
                onSource={(citation) => onSource({ turnId: turn.id, citation })}
              />
            )}
            {turn.status === 'running' && (
              <div
                role="status"
                className="mt-4 flex items-center gap-2 rounded-lg bg-primary/5 p-3 text-xs text-primary"
              >
                <Renew size={14} />
                <span>{turn.progress}… You can leave this page; your answer will be saved.</span>
              </div>
            )}
            {turn.status === 'failed' && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs"
              >
                <p>{turn.progress}</p>
                {canAsk && (
                  <div className="mt-2">
                    <Button variant="outline" size="xs" onClick={() => onRetry(turn.prompt)}>
                      Retry research
                    </Button>
                  </div>
                )}
              </div>
            )}
            <ResearchSources
              sources={turn.citations}
              onSelect={(citation) => onSource({ turnId: turn.id, citation })}
            />
            {turn.status === 'complete' && (
              <div className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Checkmark size={13} />
                Saved · AI research, subject to auditor review
                {!turn.citations.length && ' · No organization sources cited'}
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
