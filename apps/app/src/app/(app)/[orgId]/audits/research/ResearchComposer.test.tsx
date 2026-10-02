import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResearchComposer } from './ResearchComposer';
describe('research composer', () => {
  it('submits a question and clears only after successful acceptance', async () => {
    const onAsk = vi.fn().mockResolvedValue(undefined);
    render(
      <ResearchComposer
        disabled={false}
        running={false}
        sending={false}
        suggestion={null}
        onAsk={onAsk}
      />,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Compare the evidence' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ask Comp AI' }));
    await waitFor(() => expect(onAsk).toHaveBeenCalledWith('Compare the evidence'));
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue(''));
  });
  it('preserves the prompt after a network failure', async () => {
    render(
      <ResearchComposer
        disabled={false}
        running={false}
        sending={false}
        suggestion={{ text: 'My question' }}
        onAsk={vi.fn().mockRejectedValue(new Error('Network'))}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ask Comp AI' }));
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue('My question'));
  });
  it('blocks duplicate submissions during running work', () => {
    render(
      <ResearchComposer
        disabled={false}
        running
        sending={false}
        suggestion={null}
        onAsk={vi.fn()}
      />,
    );
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Researching' })).toBeDisabled();
  });
});
