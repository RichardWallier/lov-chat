import { create } from 'zustand';
import { SFUClient } from '@/lib/webrtc';
import { env } from '@/lib/env';
import type {
  CallState,
  CallActions,
  RemoteParticipant,
  ConnectionStatus,
} from '@/types/call';

// Non-serialisable transport object lives outside the store, in a module-level ref.
let client: SFUClient | null = null;

type Store = CallState & CallActions;

export const useCallStore = create<Store>()((set, get) => ({
  status: 'idle',
  isMuted: false,
  ping: null,
  localStream: null,
  participants: [],

  join: async () => {
    if (client) return;
    set({ status: 'connecting' });

    const sfu = new SFUClient({
      wsUrl: `${env.apiWsUrl}/ws`,
      onStatusChange: (status: ConnectionStatus) => set({ status }),
      onLocalStream: (localStream: MediaStream) => set({ localStream }),
      onParticipantJoined: (p: RemoteParticipant) =>
        set((s) => ({ participants: [...s.participants, p] })),
      onParticipantLeft: (id: string) =>
        set((s) => ({ participants: s.participants.filter((p) => p.id !== id) })),
      onSpeakingChange: (id: string, isSpeaking: boolean) =>
        set((s) => ({
          participants: s.participants.map((p) =>
            p.id === id ? { ...p, isSpeaking } : p,
          ),
        })),
    });
    client = sfu;

    try {
      await sfu.connect();
    } catch {
      // Mic denied or signaling failed — reset so the user can retry.
      sfu.disconnect();
      client = null;
      set({
        status: 'failed',
        localStream: null,
        participants: [],
        isMuted: false,
      });
    }
  },

  leave: () => {
    client?.disconnect();
    client = null;
    set({
      status: 'disconnected',
      localStream: null,
      participants: [],
      isMuted: false,
    });
  },

  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (!localStream) return;
    const next = !isMuted;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    set({ isMuted: next });
  },
}));
