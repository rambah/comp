import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuditDocumentReader, documentMatches } from './AuditDocumentReader';
describe('Captured document reader', () => {
  afterEach(() => vi.restoreAllMocks());
  it('matches literal text without treating punctuation as a regular expression', () => {
    expect(documentMatches({ text: '[Scope] and [scope]', query: '[scope]' })).toEqual([0, 12]);
    expect(documentMatches({ text: 'İ. Scope', query: 'scope' })).toEqual([3]);
    expect(documentMatches({ text: 'Scope', query: '   ' })).toEqual([]);
  });
  it('bounds highlight work for long documents', () => {
    expect(documentMatches({ text: 'a '.repeat(5000), query: 'a' })).toHaveLength(300);
  });
  it('navigates matches and preserves the original document text', () => {
    Element.prototype.scrollIntoView = vi.fn();
    const { container } = render(<AuditDocumentReader text="Scope one. Scope two." />);
    fireEvent.change(screen.getByLabelText('Find in captured document'), {
      target: { value: 'scope' },
    });
    expect(screen.getByRole('status').textContent).toBe('1 / 2');
    fireEvent.click(screen.getByRole('button', { name: 'Next match' }));
    expect(screen.getByRole('status').textContent).toBe('2 / 2');
    expect(container.querySelector('article')?.textContent).toBe('Scope one. Scope two.');
  });
});
