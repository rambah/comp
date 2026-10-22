import type { Prisma } from '@db';
/** Changes reopen the working audit; published version snapshots retain prior signatures. */
export async function reopenWorkingAudit({
  tx,
  auditId,
}: {
  tx: Prisma.TransactionClient;
  auditId: string;
}) {
  await tx.ismsAudit.update({
    where: { id: auditId },
    data: {
      status: 'in_progress',
      signoffAuditorName: null,
      signoffAuditorDate: null,
      signoffSpoName: null,
      signoffSpoDate: null,
      signoffTopMgmtName: null,
      signoffTopMgmtDate: null,
    },
  });
}
