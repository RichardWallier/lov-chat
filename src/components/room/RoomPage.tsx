'use client';

import { useCallStore } from '@/store/callStore';
import { StatusPill } from '@/components/ui/StatusPill';
import { PingBadge } from '@/components/ui/PingBadge';
import { ParticipantGrid } from './ParticipantGrid';
import { CallControls } from './CallControls';

export function RoomPage() {
  const status = useCallStore((s) => s.status);
  const isMuted = useCallStore((s) => s.isMuted);
  const ping = useCallStore((s) => s.ping);
  const localStream = useCallStore((s) => s.localStream);
  const participants = useCallStore((s) => s.participants);
  const join = useCallStore((s) => s.join);
  const leave = useCallStore((s) => s.leave);
  const toggleMute = useCallStore((s) => s.toggleMute);

  return (
    <main className="relative flex min-h-screen flex-col bg-bg-base text-text-primary">
      <header className="flex items-center justify-between px-6 py-5">
        <StatusPill status={status} />
        <PingBadge ping={ping} />
      </header>

      <section className="flex flex-1 items-center justify-center px-6 pb-36">
        <ParticipantGrid
          participants={participants}
          isMuted={isMuted}
          localStream={localStream}
        />
      </section>

      <CallControls
        status={status}
        isMuted={isMuted}
        onJoin={() => {
          void join();
        }}
        onLeave={leave}
        onToggleMute={toggleMute}
      />

      {/* Hidden host for remote <audio> elements managed by SFUClient. */}
      <div id="audio-container" className="hidden" aria-hidden="true" />
    </main>
  );
}
