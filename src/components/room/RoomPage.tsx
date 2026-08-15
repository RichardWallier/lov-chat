'use client';

import { useState } from 'react';
import { useCallStore } from '@/store/callStore';
import { StatusPill } from '@/components/ui/StatusPill';
import { PingBadge } from '@/components/ui/PingBadge';
import { ParticipantGrid } from './ParticipantGrid';
import { CallControls } from './CallControls';
import { DeviceSettings } from './DeviceSettings';

export function RoomPage() {
  const status = useCallStore((s) => s.status);
  const isMuted = useCallStore((s) => s.isMuted);
  const isLocalSpeaking = useCallStore((s) => s.isLocalSpeaking);
  const ping = useCallStore((s) => s.ping);
  const localStream = useCallStore((s) => s.localStream);
  const participants = useCallStore((s) => s.participants);
  const audioInputId = useCallStore((s) => s.audioInputId);
  const audioOutputId = useCallStore((s) => s.audioOutputId);
  const join = useCallStore((s) => s.join);
  const leave = useCallStore((s) => s.leave);
  const toggleMute = useCallStore((s) => s.toggleMute);
  const setAudioInput = useCallStore((s) => s.setAudioInput);
  const setAudioOutput = useCallStore((s) => s.setAudioOutput);

  const [roomId, setRoomId] = useState('global');
  const inCall = status === 'connecting' || status === 'connected';
  const trimmedRoomId = roomId.trim();

  return (
    <main className="relative flex min-h-screen flex-col bg-bg-base text-text-primary">
      <header className="flex items-center justify-between gap-3 px-6 py-5">
        <StatusPill status={status} />
        <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          disabled={inCall}
          placeholder="room id"
          aria-label="Room ID"
          className="w-40 rounded-pill border border-border bg-bg-surface px-4 py-1.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="flex items-center gap-3">
          <PingBadge ping={ping} />
          <DeviceSettings
            audioInputId={audioInputId}
            audioOutputId={audioOutputId}
            onAudioInputChange={(id) => {
              void setAudioInput(id);
            }}
            onAudioOutputChange={(id) => {
              void setAudioOutput(id);
            }}
          />
        </div>
      </header>

      <section className="flex flex-1 items-center justify-center px-6 pb-36">
        <ParticipantGrid
          participants={participants}
          isMuted={isMuted}
          isLocalSpeaking={isLocalSpeaking}
          localStream={localStream}
        />
      </section>

      <CallControls
        status={status}
        isMuted={isMuted}
        joinDisabled={trimmedRoomId === ''}
        onJoin={() => {
          void join(trimmedRoomId);
        }}
        onLeave={leave}
        onToggleMute={toggleMute}
      />

      {/* Hidden host for remote <audio> elements managed by SFUClient. */}
      <div id="audio-container" className="hidden" aria-hidden="true" />
    </main>
  );
}
