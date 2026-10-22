import { act, fireEvent, within } from '@testing-library/react';
import { AppShell } from '@trycompai/design-system';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { HydratedAIChatTrigger } from './HydratedAIChatTrigger';

describe('AI chat trigger hydration', () => {
  it('hydrates Linux server markup on a Mac and still opens the chat', async () => {
    const platform = vi.spyOn(navigator, 'platform', 'get');
    const recoverableError = vi.fn();
    const view = (
      <AppShell>
        <HydratedAIChatTrigger />
      </AppShell>
    );
    const container = document.createElement('div');
    document.body.append(container);
    platform.mockReturnValue('Linux x86_64');
    container.innerHTML = renderToString(view);
    platform.mockReturnValue('MacIntel');
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, view, { onRecoverableError: recoverableError });
      });
      const trigger = within(container).getByRole('button', { name: 'Open AI Chat' });
      expect(trigger).toHaveTextContent('⌘J');
      expect(recoverableError).not.toHaveBeenCalled();
      fireEvent.click(trigger);
      expect(within(container).getByRole('button', { name: 'Close AI Chat' })).toBeInTheDocument();
    } finally {
      await act(async () => root?.unmount());
      container.remove();
      platform.mockRestore();
    }
  });
});
