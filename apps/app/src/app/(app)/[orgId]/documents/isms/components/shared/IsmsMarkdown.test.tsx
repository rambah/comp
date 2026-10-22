import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { IsmsMarkdown } from './IsmsMarkdown';
import { IsmsMarkdownEditor } from './IsmsMarkdownEditor';

describe('ISMS Markdown', () => {
  it('renders auditor-readable headings, paragraphs, emphasis, lists and tables', () => {
    render(<IsmsMarkdown>{'## Decision\n\nResidual **8/25**.\n\n- First control\n- Second control\n\n| Owner | Status |\n| --- | --- |\n| Ramin | Open |'}</IsmsMarkdown>);
    expect(screen.getByRole('heading', {name:'Decision'})).toBeInTheDocument();
    expect(screen.getByText('8/25').tagName).toBe('STRONG');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
  it('blocks raw HTML, executable links and remote image loads', () => {
    const {container} = render(<IsmsMarkdown>{'<script>alert(1)</script>\n\n[unsafe](javascript:alert)\n\n![Evidence](https://tracker.example/pixel)\n\n[safe](https://example.com)'}</IsmsMarkdown>);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByRole('link',{name:'unsafe'})).toBeNull();
    expect(screen.getByRole('link',{name:'safe'})).toHaveAttribute('rel','noopener noreferrer');
  });
  it('formats selection and previews without submitting or rewriting saved content', () => {
    const submit = vi.fn();
    function Editor() {
      const [value, setValue] = useState('Control');
      return <form onSubmit={submit}><IsmsMarkdownEditor aria-label="Treatment" value={value} onChange={setValue}/></form>;
    }
    render(<Editor/>);
    const input=screen.getByRole('textbox',{name:'Treatment'}) as HTMLTextAreaElement;
    input.setSelectionRange(0,7);
    fireEvent.click(screen.getByRole('button',{name:'Bold: Treatment'}));
    expect(input.value).toBe('**Control**');
    fireEvent.click(screen.getByRole('button',{name:'Preview formatting: Treatment'}));
    expect(screen.getByText('Control').tagName).toBe('STRONG');
    expect(submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Edit text: Treatment'}));
    expect(screen.getByRole('textbox',{name:'Treatment'})).toHaveValue('**Control**');
  });
});
