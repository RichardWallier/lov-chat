export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed';

export interface RemoteParticipant {
  id: string; // stream.id
  stream: MediaStream;
  isSpeaking: boolean;
}

export interface CallState {
  status: ConnectionStatus;
  isMuted: boolean;
  isLocalSpeaking: boolean; // our own voice-activity, for the "You" card
  ping: number | null; // media-path RTT in ms; null until connected
  localStream: MediaStream | null;
  participants: RemoteParticipant[];
}

export interface CallActions {
  join: (roomId: string) => Promise<void>;
  leave: () => void;
  toggleMute: () => void;
}
