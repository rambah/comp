'use client';
import {
  Button,
  Card,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@trycompai/design-system';
import { useState } from 'react';
import { SOAMobileRow } from './SOAMobileRow';
import { SOATableRow, type SOAQuestion } from './SOATableRow';
import { resolveSoaDisplay } from './soa-display';
import type {
  SOAFieldSavePayload,
  SOAProcessedResult,
  SOATableAnswerData,
} from './soa-field-types';
export type { SOATableAnswerData };

interface SOATableProps {
  columns: { name: string; type: 'string' | 'boolean' | 'text' }[];
  questions: SOAQuestion[];
  answersMap: Map<string, SOATableAnswerData>;
  questionStatuses: Map<string, string>;
  processedResults: Map<string, SOAProcessedResult>;
  isFullyRemote: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  documentId: string;
  isPendingApproval: boolean;
  organizationId: string;
  onAnswerUpdate?: (questionId: string, payload: SOAFieldSavePayload) => void;
}
const chapters = [
  ['5', 'Organizational'],
  ['6', 'People'],
  ['7', 'Physical'],
  ['8', 'Technological'],
];
export function SOATable(props: SOATableProps) {
  const [search, setSearch] = useState('');
  const [chapter, setChapter] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const { questions, answersMap, processedResults, questionStatuses, isFullyRemote } = props;
  const query = search.trim().toLocaleLowerCase();
  const filtered = questions.filter((question) => {
    const mapping = question.columnMapping;
    const display = resolveSoaDisplay({
      answerData: answersMap.get(question.id),
      processedResult: processedResults.get(question.id),
      isFullyRemote,
      isControl7: (mapping.closure || '').startsWith('7.'),
    });
    const matchesSearch = [
      mapping.closure,
      mapping.title,
      mapping.control_objective,
      display.justificationValue,
    ].some((value) => value?.toLocaleLowerCase().includes(query));
    const matchesStatus =
      status === 'all' ||
      (status === 'yes' && display.displayIsApplicable === true) ||
      (status === 'no' && display.displayIsApplicable === false) ||
      (status === 'missing' && !display.justificationValue?.trim());
    return (
      matchesSearch &&
      matchesStatus &&
      (chapter === 'all' || (mapping.closure || '').startsWith(`${chapter}.`))
    );
  });
  const pageSize = props.isExpanded ? Math.max(1, filtered.length) : 10;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const displayed = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rowProps = (question: SOAQuestion) => ({
    question,
    answerData: answersMap.get(question.id),
    processedResult: processedResults.get(question.id),
    questionStatus: questionStatuses.get(question.id),
    isFullyRemote,
    documentId: props.documentId,
    isPendingApproval: props.isPendingApproval,
    organizationId: props.organizationId,
    onUpdate: (payload: SOAFieldSavePayload) => props.onAnswerUpdate?.(question.id, payload),
  });
  const handleReset = () => {
    setSearch('');
    setChapter('all');
    setStatus('all');
    setPage(1);
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1 space-y-1.5">
          <label htmlFor="soa-search" className="text-xs font-medium">
            Search controls
          </label>
          <Input
            id="soa-search"
            placeholder="Control number, title or justification…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-full space-y-1.5 sm:w-48">
          <label htmlFor="soa-chapter" className="text-xs font-medium">
            Chapter
          </label>
          <Select
            value={chapter}
            onValueChange={(value) => {
              setChapter(value ?? 'all');
              setPage(1);
            }}
          >
            <SelectTrigger id="soa-chapter">
              <SelectValue>
                {chapter === 'all'
                  ? 'All chapters'
                  : `${chapter} · ${chapters.find(([id]) => id === chapter)?.[1] ?? ''}`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All chapters</SelectItem>
              {chapters.map(([id, label]) => (
                <SelectItem key={id} value={id}>
                  {id} · {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full space-y-1.5 sm:w-48">
          <label htmlFor="soa-status" className="text-xs font-medium">
            Filter
          </label>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value ?? 'all');
              setPage(1);
            }}
          >
            <SelectTrigger id="soa-status">
              <SelectValue>
                {
                  {
                    all: 'All controls',
                    yes: 'Applicable',
                    no: 'Not applicable',
                    missing: 'Missing justification',
                  }[status]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All controls</SelectItem>
              <SelectItem value="yes">Applicable</SelectItem>
              <SelectItem value="no">Not applicable</SelectItem>
              <SelectItem value="missing">Missing justification</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(search || chapter !== 'all' || status !== 'all') && (
          <Button variant="ghost" onClick={handleReset}>
            Clear filters
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground" role="status">
        {filtered.length} of {questions.length} controls
        {props.isPendingApproval
          ? ' · Editing is locked while approval is pending.'
          : ' · Open a justification to review or edit it.'}
      </p>
      <Card>
        {filtered.length === 0 ? (
          <div className="space-y-3 p-10 text-center">
            <p>No controls match your filters.</p>
            <Button variant="outline" onClick={handleReset}>
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            <div className="hidden lg:block">
              <Table style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '55%' }} />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead>Control</TableHead>
                    <TableHead>Applicable</TableHead>
                    <TableHead>Justification</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayed.map((question) => (
                    <SOATableRow key={question.id} {...rowProps(question)} />
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="divide-y divide-border lg:hidden">
              {displayed.map((question) => (
                <SOAMobileRow key={question.id} {...rowProps(question)} />
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
              <p className="text-xs text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {filtered.length > 10 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      props.onToggleExpand();
                      setPage(1);
                    }}
                  >
                    {props.isExpanded ? 'Show 10 per page' : 'Show all'}
                  </Button>
                )}
                {!props.isExpanded && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage === 1}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-xs tabular-nums">
                      {currentPage} / {pageCount}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage === pageCount}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      Next
                    </Button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
