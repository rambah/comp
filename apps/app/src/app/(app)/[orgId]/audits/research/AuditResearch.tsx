'use client';
import { usePermissions } from '@/hooks/use-permissions';
import { Badge, Button, Input } from '@trycompai/design-system';
import {
  Add,
  Chat,
  Checkmark,
  Search,
  WatsonHealthAiResults,
} from '@trycompai/design-system/icons';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ResearchComposer } from './ResearchComposer';
import { ResearchConversation } from './ResearchConversation';
import { ResearchSourceDialog } from './ResearchSources';
import { RESEARCH_READ_RESOURCES } from './research-types';
import { useAuditResearch } from './useAuditResearch';
export function AuditResearch(props: {
  organizationId: string;
  auditId: string;
  canEdit: boolean;
  following: boolean;
  threadId: string | null;
  sourceKey: string | null;
  onThread: (id: string | null) => void;
  onSource: (key: string | null) => void;
}) {
  const { hasPermission } = usePermissions();
  if (!RESEARCH_READ_RESOURCES.every((resource) => hasPermission(resource, 'read')))
    return (
      <div className="rounded-xl border p-8 text-sm text-muted-foreground">
        Research requires read access to all audit source categories. Ask an administrator to review
        your permissions.
      </div>
    );
  return <ResearchWorkspace {...props} />;
}
function ResearchWorkspace({
  organizationId,
  auditId,
  canEdit,
  following,
  threadId,
  sourceKey,
  onThread,
  onSource,
}: Parameters<typeof AuditResearch>[0]) {
  const scroll = useRef<HTMLDivElement>(null);
  const followTail = useRef(true);
  const submitting = useRef(false);
  const state = useAuditResearch({ organizationId, auditId, threadId });
  const [query, setQuery] = useState('');
  const [suggestion, setSuggestion] = useState<{ text: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const topics = state.topics.data;
  const turns = state.turns;
  useEffect(() => {
    if (!following && followTail.current && scroll.current)
      scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [turns, following]);
  const running = turns.some((turn) => turn.status === 'running');
  const canAsk = canEdit && !following && !!topics?.available;
  const selectedSource =
    turns
      .flatMap((turn) =>
        turn.citations.map((citation) => ({ key: `${turn.id}:${citation.label}`, citation })),
      )
      .find((s) => s.key === sourceKey)?.citation ?? null;
  const handleAsk = async (prompt: string) => {
    if (submitting.current) throw new Error('A question is already being submitted');
    submitting.current = true;
    followTail.current = true;
    try {
      let id = threadId;
      if (!id) {
        id = await state.create(prompt.slice(0, 100));
        onThread(id);
      }
      await state.ask({ id, prompt });
      setSuggestion(null);
    } catch (error) {
      setSuggestion({ text: prompt });
      toast.error(error instanceof Error ? error.message : 'Research could not start');
      throw error;
    } finally {
      submitting.current = false;
    }
  };
  const handleNew = () => {
    onThread(null);
    onSource(null);
    setSuggestion(null);
  };
  return (
    <div className="audit-surface overflow-hidden">
      <div className="audit-focus-card flex flex-wrap items-center justify-between gap-4 border-b px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-primary/15 bg-background p-2.5 text-primary">
            <WatsonHealthAiResults size={22} />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight">Audit research</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Grounded in your evidence. Connected to your audit.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{topics?.model.label ?? 'Loading model…'}</Badge>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Checkmark size={13} />
            History saved
          </span>
        </div>
      </div>
      <div className="grid min-h-96 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="border-b bg-muted/15 p-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Research topics
            </span>
            <Button
              variant="outline"
              size="xs"
              iconLeft={<Add size={13} />}
              disabled={!canAsk || creating}
              onClick={handleNew}
            >
              New
            </Button>
          </div>
          <div className="mt-4">
            <Input
              aria-label="Search research topics"
              placeholder="Find a conversation…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="mt-3 max-h-40 space-y-1 overflow-y-auto lg:max-h-96">
            {!threadId && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/5 p-3 text-xs font-medium text-primary">
                <Chat size={14} />
                New conversation
              </div>
            )}
            {topics?.threads
              .filter((t) => t.title.toLowerCase().includes(query.toLowerCase()))
              .map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  disabled={following || state.sending || creating}
                  onClick={() => {
                    onThread(topic.id);
                    onSource(null);
                    setSuggestion(null);
                  }}
                  className={`w-full rounded-lg border p-3 text-left transition ${threadId === topic.id ? 'border-primary/20 bg-primary/5' : 'border-transparent hover:bg-muted/60'}`}
                >
                  <span className="line-clamp-2 text-xs font-medium leading-5">{topic.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {topic._count.turns} {topic._count.turns === 1 ? 'question' : 'questions'} ·{' '}
                    {new Date(topic.updatedAt).toLocaleDateString()}
                  </span>
                </button>
              ))}
            {topics && !topics.threads.length && (
              <p className="px-1 py-4 text-xs leading-5 text-muted-foreground">
                Your first question creates a topic. Conversations stay available across visits.
              </p>
            )}
          </div>
          <div className="mt-5 hidden rounded-xl border bg-background p-4 text-xs leading-5 text-muted-foreground lg:block">
            <Search size={16} />
            <p className="mt-2">
              Searches and reads accessible Comp records. Sources include a captured excerpt and
              version so you can check the reasoning.
            </p>
          </div>
        </aside>
        <div className="flex min-w-0 flex-col">
          {(state.topics.error || state.conversation.error) && (
            <div role="alert" className="m-4 rounded-lg border border-destructive/30 p-3 text-sm">
              Unable to load saved research.{' '}
              <Button
                variant="link"
                onClick={() => {
                  void state.topics.mutate();
                  void state.conversation.mutate();
                }}
              >
                Try again
              </Button>
            </div>
          )}
          {topics && !topics.available && (
            <div role="status" className="m-4 rounded-lg border p-3 text-sm">
              Research AI is not configured yet. Saved conversations are still available.
            </div>
          )}
          <div
            className="min-h-[380px] flex-1 overflow-y-auto lg:max-h-[650px]"
            ref={scroll}
            onScroll={() => {
              const el = scroll.current;
              if (el) followTail.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            }}
            data-audit-live-target="research-conversation"
          >
            {state.olderCursor && (
              <div className="p-3 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void state
                      .loadOlder()
                      .catch(() => toast.error('Could not load earlier messages'));
                  }}
                >
                  Load earlier messages
                </Button>
              </div>
            )}
            {threadId && state.conversation.isLoading ? (
              <div className="p-8 text-sm text-muted-foreground">Loading saved conversation…</div>
            ) : (
              <ResearchConversation
                turns={turns}
                canAsk={canAsk && !running}
                onSuggestion={(text) => setSuggestion({ text })}
                onSource={({ turnId, citation }) => {
                  if (!following) onSource(`${turnId}:${citation.label}`);
                }}
                onRetry={(prompt) => {
                  void handleAsk(prompt).catch(() => undefined);
                }}
              />
            )}
          </div>
          <ResearchComposer
            key={threadId ?? 'new'}
            disabled={!canAsk || !!state.conversation.error || creating}
            running={running}
            sending={state.sending}
            suggestion={suggestion}
            onAsk={async (prompt) => {
              setCreating(true);
              try {
                await handleAsk(prompt);
              } finally {
                setCreating(false);
              }
            }}
          />
        </div>
      </div>
      <ResearchSourceDialog
        source={selectedSource}
        threadId={threadId}
        turnId={sourceKey?.split(':')[0] ?? null}
        organizationId={organizationId}
        onClose={() => {
          if (!following) onSource(null);
        }}
      />
    </div>
  );
}
