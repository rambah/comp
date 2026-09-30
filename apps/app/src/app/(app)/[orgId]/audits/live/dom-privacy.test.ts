import { describe, expect, it } from 'vitest';
import { auditBlockSelector } from './dom-privacy';

describe('Application-wide live capture', () => {
  it('allows navigation, pages and dialogs while blocking secrets and private surfaces', () => {
    document.body.innerHTML = `<main><nav id="outside">Private navigation</nav><section data-audit-workspace><textarea id="notes">Audit draft</textarea><input id="secret" type="password" value="never-share"><div data-audit-live-private id="private">Private controls</div></section></main><div><div role="dialog" data-audit-live-surface><input id="question" value="Evidence request"></div></div>`;
    expect(document.querySelector('#outside')!.matches(auditBlockSelector)).toBe(false);
    expect(document.querySelector('#secret')!.matches(auditBlockSelector)).toBe(true);
    expect(document.querySelector('#private')!.matches(auditBlockSelector)).toBe(true);
    expect(document.querySelector('#notes')!.matches(auditBlockSelector)).toBe(false);
    expect(document.querySelector('#question')!.matches(auditBlockSelector)).toBe(false);
    document.body.innerHTML = '';
  });

  it('captures ordinary pages without requiring an audit workspace marker', () => {
    document.body.innerHTML =
      '<main><h1>Policies</h1><textarea>Unsaved draft</textarea></main><div role="dialog">Evidence preview</div>';
    for (const node of document.body.querySelectorAll('*')) {
      expect(node.matches(auditBlockSelector)).toBe(false);
    }
    document.body.innerHTML = '';
  });
});
