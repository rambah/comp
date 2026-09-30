import { describe, expect, it } from 'vitest';
import { buildEvidenceIndex, comparableEvidence, evidenceEntries } from './audit-evidence';
import { testAudit, testCheck, testEvidence } from './audit-test-fixtures';

describe('Evidence navigation and exports', () => {
  it('keeps every evidence link and its parent check, sorted newest first', () => {
    const audit = testAudit([
      testCheck({
        evidenceLinks: [testEvidence({ id: 'older', createdAt: '2026-09-20T12:00:00Z' })],
      }),
      testCheck({ id: 'c2', evidenceLinks: [testEvidence({ id: 'newer', controlId: 'c2' })] }),
    ]);
    expect(evidenceEntries(audit).map((e) => [e.evidence.id, e.check.id])).toEqual([
      ['newer', 'c2'],
      ['older', 'c1'],
    ]);
    expect(audit.controls[0].id).toBe('c1');
  });
  it('compares only different retained text versions of the same typed source', () => {
    const entry = { evidence: testEvidence(), check: testCheck() };
    const candidates = [
      testEvidence({ id: 'v1', versionLabel: 'v1' }),
      testEvidence({ id: 'same' }),
      testEvidence({ id: 'other', sourceId: 'd2', versionLabel: 'v1' }),
      testEvidence({ id: 'policy', sourceType: 'policy', versionLabel: 'v1' }),
      testEvidence({ id: 'pdf', versionLabel: 'v0', snapshot: { pdfOnly: true, content: 'Text' } }),
      testEvidence({ id: 'empty', versionLabel: 'v0', snapshot: {} }),
    ];
    expect(
      comparableEvidence({
        entry,
        entries: candidates.map((evidence) => ({ evidence, check: testCheck() })),
      }).map((e) => e.evidence.id),
    ).toEqual(['v1']);
    expect(
      comparableEvidence({
        entry: { ...entry, evidence: testEvidence({ sourceType: 'attachment' }) },
        entries: [entry],
      }),
    ).toEqual([]);
  });
  it('exports exact source/version identifiers while escaping CSV and spreadsheet formulas', () => {
    const output = buildEvidenceIndex(
      testAudit([
        testCheck({
          evidenceLinks: [
            testEvidence({
              title: '=HYPERLINK("bad")',
              capturedBy: 'Name, with comma',
              versionLabel: 'v2\nretained',
            }),
          ],
        }),
      ]),
    );
    expect(output).toContain('"\'=HYPERLINK(""bad"")"');
    expect(output).toContain('"Name, with comma"');
    expect(output).toContain('"v2\nretained"');
    expect(output).toContain('"d1","e1"');
  });
});
