import type { RemoteParticipant } from '@/types/call';
import { ParticipantCard } from './ParticipantCard';

interface ParticipantGridProps {
  participants: RemoteParticipant[];
  isMuted: boolean;
  isLocalSpeaking: boolean;
  localStream: MediaStream | null;
}

export function ParticipantGrid({
  participants,
  isMuted,
  isLocalSpeaking,
  localStream,
}: ParticipantGridProps) {
  const hasLocalAudio = localStream !== null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <ParticipantCard
        label="You"
        isSpeaking={!isMuted && isLocalSpeaking}
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
