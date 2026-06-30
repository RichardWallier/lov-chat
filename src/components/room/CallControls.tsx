import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import type { ConnectionStatus } from '@/types/call';

interface CallControlsProps {
  status: ConnectionStatus;
  isMuted: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onToggleMute: () => void;
}

export function CallControls({
  status,
  isMuted,
  onJoin,
  onLeave,
  onToggleMute,
}: CallControlsProps) {
  const inCall = status === 'connecting' || status === 'connected';
  const muteDisabled = status !== 'connected';

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 flex justify-center pb-8">
      <div className="pointer-events-auto flex items-center gap-3 rounded-pill border border-border bg-bg-elevated p-2 shadow-xl">
        <button
          type="button"
          onClick={onToggleMute}
          disabled={muteDisabled}
          aria-pressed={isMuted}
          aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          className={`flex h-12 w-12 items-center justify-center rounded-pill text-text-primary transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            isMuted ? 'bg-muted' : 'bg-bg-surface enabled:hover:bg-bg-overlay'
          }`}
        >
          {isMuted ? (
            <MicOff className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Mic className="h-5 w-5" aria-hidden="true" />
          )}
        </button>

        {inCall ? (
          <button
            type="button"
            onClick={onLeave}
            className="flex h-12 items-center gap-2 rounded-pill bg-danger px-6 font-medium text-text-primary transition-opacity hover:opacity-90"
          >
            <PhoneOff className="h-5 w-5" aria-hidden="true" />
            Leave
          </button>
        ) : (
          <button
            type="button"
            onClick={onJoin}
            className="flex h-12 items-center gap-2 rounded-pill bg-brand px-6 font-medium text-text-primary transition-colors hover:bg-brand-hover"
          >
            <Phone className="h-5 w-5" aria-hidden="true" />
            Join
          </button>
        )}
      </div>
    </div>
  );
}
