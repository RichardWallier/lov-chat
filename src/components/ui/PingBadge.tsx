// Placeholder latency badge — not wired yet. Always rendered grayed out.
export function PingBadge({ ping }: { ping: number | null }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-pill bg-bg-elevated px-3 py-1.5 text-sm font-medium text-text-muted"
      title="Latency — not implemented yet"
    >
      {ping === null ? '— ms' : `${ping} ms`}
    </span>
  );
}
