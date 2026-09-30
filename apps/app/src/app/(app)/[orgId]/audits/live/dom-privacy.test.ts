import { describe, expect, it } from 'vitest';
import { auditBlockSelector } from './dom-privacy';

describe('Workspace-only live capture', () => {
  it('allows audit drafts and portal dialogs but blocks other application surfaces and secrets', () => {
    document.body.innerHTML = `<main><nav id="outside">Private navigation</nav><section data-audit-workspace><textarea id="notes">Audit draft</textarea><input id="secret" type="password" value="never-share"><div data-audit-live-private id="private">Private controls</div></section></main><div><div role="dialog" data-audit-live-surface><input id="question" value="Evidence request"></div></div>`;
    expect(document.querySelector('#outside')!.matches(auditBlockSelector)).toBe(true);
    expect(document.querySelector('#secret')!.matches(auditBlockSelector)).toBe(true);
    expect(document.querySelector('#private')!.matches(auditBlockSelector)).toBe(true);
    expect(document.querySelector('#notes')!.matches(auditBlockSelector)).toBe(false);
    expect(document.querySelector('#question')!.matches(auditBlockSelector)).toBe(false);
    document.body.innerHTML = '';
  });
});
