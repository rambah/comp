'use client';
import { Button } from '@trycompai/design-system';
import { useState } from 'react';
import { EditableSOAFields } from './EditableSOAFields';

type Props = Parameters<typeof EditableSOAFields>[0];
export function SOAJustification(props: Props) {
  const [expanded, setExpanded] = useState(false);
  const long = (props.justification?.length ?? 0) > 300;
  return (
    <div className="space-y-2">
      <p
        className={`whitespace-pre-wrap break-words text-sm leading-7 ${!props.justification ? 'text-muted-foreground' : ''} ${long && !expanded ? 'line-clamp-4' : ''}`}
      >
        {props.justification || 'No justification yet. Add the reasoning for this control.'}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {long && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            {expanded ? 'Show less' : 'Read full justification'}
          </Button>
        )}
        <EditableSOAFields {...props} trigger="justification" />
      </div>
    </div>
  );
}
