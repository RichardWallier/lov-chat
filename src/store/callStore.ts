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
  isLocalSpeaking: false,
  ping: null,
  localStream: null,
  participants: [],

  join: async (roomId: string) => {
    // Guard on live status, NOT on `client`: a failed/dropped connection leaves
    // `client` set but the socket dead. Only block while actually connecting or
    // connected — otherwise a Join after a failure would be silently ignored.
    const { status } = get();
    if (status === 'connecting' || status === 'connected') return;

    // Release any dead client left over from a previous failed/dropped attempt
    // so we start clean. disconnect() is idempotent and silences late callbacks.
    client?.disconnect();
    client = null;

    set({
      status: 'connecting',
      ping: null,
      localStream: null,
      participants: [],
      isMuted: false,
      isLocalSpeaking: false,
    });

    const sfu = new SFUClient({
      // Room ID is a path segment on the SFU: /ws/{roomID}. encodeURIComponent
      // keeps arbitrary room names (spaces, slashes) from breaking the URL.
      wsUrl: `${env.apiWsUrl}/ws/${encodeURIComponent(roomId)}`,
      onStatusChange: (status: ConnectionStatus) => {
        // 'failed' is terminal and never recovers on its own. Release the client
        // here so the next Join starts fresh, and reset the call state. Doing
        // this also silences the 'disconnected' that the socket close fires
        // right after, so the UI settles on "failed" instead of flipping.
        if (status === 'failed') {
          client?.disconnect();
          client = null;
          set({
            status,
            ping: null,
            localStream: null,
            participants: [],
            isMuted: false,
            isLocalSpeaking: false,
          });
          return;
        }
        set(status === 'connected' ? { status } : { status, ping: null });
      },
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
      onLocalSpeakingChange: (isLocalSpeaking: boolean) =>
        set({ isLocalSpeaking }),
      onPing: (ms: number) => set({ ping: ms }),
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
        ping: null,
        localStream: null,
        participants: [],
        isMuted: false,
        isLocalSpeaking: false,
      });
    }
  },

  leave: () => {
    client?.disconnect();
    client = null;
    set({
      status: 'disconnected',
      ping: null,
      localStream: null,
      participants: [],
      isMuted: false,
      isLocalSpeaking: false,
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
