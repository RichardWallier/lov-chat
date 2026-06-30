import type { ConnectionStatus } from '@/types/call';

interface StatusConfig {
  label: string;
  dot: string;
  text: string;
}

const STATUS_CONFIG: Record<ConnectionStatus, StatusConfig> = {
  idle: { label: 'Idle', dot: 'bg-muted', text: 'text-text-secondary' },
  connecting: { label: 'Connecting…', dot: 'bg-warning', text: 'text-warning' },
  connected: { label: 'In Call', dot: 'bg-success', text: 'text-success' },
  disconnected: { label: 'Disconnected', dot: 'bg-muted', text: 'text-text-secondary' },
  failed: { label: 'Connection Failed', dot: 'bg-danger', text: 'text-danger' },
};

export function StatusPill({ status }: { status: ConnectionStatus }) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-pill bg-bg-elevated px-3 py-1.5 text-sm font-medium ${config.text}`}
    >
      <span className={`h-2 w-2 rounded-pill ${config.dot}`} aria-hidden="true" />
      {config.label}
    </span>
  );
}
