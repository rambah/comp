'use client';
import { EditableSOAFields } from './EditableSOAFields';
import { SOAJustification } from './SOAJustification';
import { SOAControlTitle, useSOARow, type SOATableRowProps } from './SOATableRow';

export function SOAMobileRow(props: SOATableRowProps) {
  const fields = useSOARow(props);
  return (
    <article className="space-y-5 p-5">
      <SOAControlTitle question={props.question} />
      {props.questionStatus === 'processing' ? (
        <p role="status">Generating…</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium text-muted-foreground">Applicability</span>
            <EditableSOAFields {...fields} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Justification</p>
            <SOAJustification {...fields} />
          </div>
        </>
      )}
    </article>
  );
}
