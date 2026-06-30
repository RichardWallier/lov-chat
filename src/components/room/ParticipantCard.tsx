import { MicOff, User } from 'lucide-react';

interface ParticipantCardProps {
  label: string; // "You" or "Participant"
  isSpeaking: boolean;
  isMuted?: boolean; // only for local card
  isLocal?: boolean;
}

export function ParticipantCard({
  label,
  isSpeaking,
  isMuted = false,
  isLocal = false,
}: ParticipantCardProps) {
  return (
    <div
      data-local={isLocal || undefined}
      className="flex w-40 flex-col items-center gap-4 rounded-card bg-bg-surface p-6"
    >
      <div className="relative">
        <div
          className={`flex h-20 w-20 items-center justify-center rounded-pill bg-bg-overlay ring-4 transition-colors ${
            isSpeaking ? 'animate-pulse ring-ring-speaking' : 'ring-transparent'
          }`}
        >
          <User className="h-9 w-9 text-text-secondary" aria-hidden="true" />
        </div>

        {isMuted && (
          <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-pill bg-danger ring-4 ring-bg-surface">
            <MicOff className="h-4 w-4 text-text-primary" aria-hidden="true" />
          </span>
        )}
      </div>

      <span className="text-sm text-text-secondary">{label}</span>
    </div>
  );
}
