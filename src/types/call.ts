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
  // `null` means "browser default" — we never had (or lost) an explicit choice.
  audioInputId: string | null;
  audioOutputId: string | null;
}

export interface CallActions {
  join: (roomId: string) => Promise<void>;
  leave: () => void;
  toggleMute: () => void;
  // Switches the active mic. Safe to call before or during a call — during a
  // call it swaps the live track via replaceTrack instead of renegotiating.
  setAudioInput: (deviceId: string) => Promise<void>;
  // Switches the speaker remote audio is played through (setSinkId). Safe to
  // call before or during a call.
  setAudioOutput: (deviceId: string) => Promise<void>;
}
