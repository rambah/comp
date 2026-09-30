'use client';
import { TableCell, TableRow } from '@trycompai/design-system';
import { EditableSOAFields } from './EditableSOAFields';
import { SOAJustification } from './SOAJustification';
import { resolveSoaDisplay } from './soa-display';
import type {
  SOAFieldSavePayload,
  SOAProcessedResult,
  SOATableAnswerData,
} from './soa-field-types';

export type SOAQuestion = {
  id: string;
  text: string;
  columnMapping: {
    closure: string;
    title: string;
    control_objective: string | null;
    isApplicable: boolean | null;
    justification?: string | null;
  };
};
export interface SOATableRowProps {
  question: SOAQuestion;
  columns?: { name: string; type: 'string' | 'boolean' | 'text' }[];
  answerData?: SOATableAnswerData;
  questionStatus?: string;
  processedResult?: SOAProcessedResult;
  isFullyRemote: boolean;
  documentId: string;
  isPendingApproval: boolean;
  organizationId: string;
  onUpdate?: (payload: SOAFieldSavePayload) => void;
}
export function useSOARow(props: SOATableRowProps) {
  const { displayIsApplicable, justificationValue } = resolveSoaDisplay({
    answerData: props.answerData,
    processedResult: props.processedResult,
    isFullyRemote: props.isFullyRemote,
    isControl7: (props.question.columnMapping.closure || '').startsWith('7.'),
  });
  return {
    documentId: props.documentId,
    questionId: props.question.id,
    organizationId: props.organizationId,
    isPendingApproval: props.isPendingApproval,
    isApplicable: displayIsApplicable,
    justification: justificationValue,
    onUpdate: props.onUpdate,
    controlLabel: `${props.question.columnMapping.closure} · ${props.question.columnMapping.title}`,
    controlObjective: props.question.columnMapping.control_objective,
  };
}
export function SOAControlTitle({ question }: { question: SOAQuestion }) {
  return (
    <div className="space-y-3">
      <span className="inline-flex rounded-md bg-muted px-2 py-1 font-mono text-xs font-medium">
        {question.columnMapping.closure}
      </span>
      <p className="text-sm font-semibold leading-6">{question.columnMapping.title}</p>
      {question.columnMapping.control_objective && (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer rounded-sm text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Control objective
          </summary>
          <p className="mt-2 leading-6">{question.columnMapping.control_objective}</p>
        </details>
      )}
    </div>
  );
}
export function SOATableRow(props: SOATableRowProps) {
  const fields = useSOARow(props);
  const processing = props.questionStatus === 'processing';
  return (
    <TableRow>
      <TableCell style={{ verticalAlign: 'top' }}>
        <div className="whitespace-normal py-3">
          <SOAControlTitle question={props.question} />
        </div>
      </TableCell>
      <TableCell style={{ verticalAlign: 'top' }}>
        <div className="whitespace-normal py-3">
          {processing ? (
            <p role="status" className="text-sm text-muted-foreground">
              Generating…
            </p>
          ) : (
            <EditableSOAFields {...fields} />
          )}
        </div>
      </TableCell>
      <TableCell style={{ verticalAlign: 'top' }}>
        <div className="whitespace-normal py-3">
          {processing ? (
            <p className="text-sm text-muted-foreground">Researching this control…</p>
          ) : (
            <SOAJustification {...fields} />
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
