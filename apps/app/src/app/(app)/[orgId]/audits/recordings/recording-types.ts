export interface AuditRecording {
  id: string;
  auditorName: string;
  startedAt: string;
  lastEventAt: string;
  endedAt: string | null;
  expiresAt: string;
  state: string;
}
export interface RecordingManifest extends AuditRecording {
  chunks: { index: number; bytes: number }[];
}
export function durationLabel(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
