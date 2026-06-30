import type { RemoteParticipant } from '@/types/call';
import { ParticipantCard } from './ParticipantCard';

interface ParticipantGridProps {
  participants: RemoteParticipant[];
  isMuted: boolean;
  localStream: MediaStream | null;
}

export function ParticipantGrid({
  participants,
  isMuted,
  localStream,
}: ParticipantGridProps) {
  const hasLocalAudio = localStream !== null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <ParticipantCard
        label="You"
        isSpeaking={false}
        isMuted={hasLocalAudio && isMuted}
        isLocal
      />

      {participants.map((participant) => (
        <ParticipantCard
          key={participant.id}
          label="Participant"
          isSpeaking={participant.isSpeaking}
        />
      ))}
    </div>
  );
}
