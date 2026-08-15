'use client';

import { Mic, Settings2, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useMediaDevices } from '@/lib/useMediaDevices';

interface DeviceSettingsProps {
  audioInputId: string | null;
  audioOutputId: string | null;
  onAudioInputChange: (deviceId: string) => void;
  onAudioOutputChange: (deviceId: string) => void;
}

export function DeviceSettings({
  audioInputId,
  audioOutputId,
  onAudioInputChange,
  onAudioOutputChange,
}: DeviceSettingsProps) {
  const { inputs, outputs, hasLabels, requestPermission } = useMediaDevices();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Device labels need mic permission — ask as soon as the panel opens if we
  // don't have them yet, rather than forcing it on page load.
  useEffect(() => {
    if (open && !hasLabels) {
      void requestPermission();
    }
  }, [open, hasLabels, requestPermission]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Audio device settings"
        className="flex h-9 w-9 items-center justify-center rounded-pill bg-bg-elevated text-text-primary transition-colors hover:bg-bg-overlay"
      >
        <Settings2 className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-10 w-72 rounded-xl border border-border bg-bg-elevated p-4 shadow-xl">
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-text-secondary">
                <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                Microphone
              </span>
              <select
                value={audioInputId ?? ''}
                onChange={(e) => onAudioInputChange(e.target.value)}
                className="rounded-lg border border-border bg-bg-surface px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="" disabled>
                  {hasLabels ? 'Select a microphone' : 'Allow mic access to list devices'}
                </option>
                {inputs.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.slice(0, 6)}`}
                  </option>
                ))}
              </select>
            </label>

            {/* Output-device switching (setSinkId) isn't supported in every
                browser — e.g. Safari and Firefox don't expose 'audiooutput'
                devices at all, so this picker just doesn't render there. */}
            {outputs.length > 0 && (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="flex items-center gap-1.5 font-medium text-text-secondary">
                  <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Speaker
                </span>
                <select
                  value={audioOutputId ?? ''}
                  onChange={(e) => onAudioOutputChange(e.target.value)}
                  className="rounded-lg border border-border bg-bg-surface px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="" disabled>
                    Select a speaker
                  </option>
                  {outputs.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Speaker ${device.deviceId.slice(0, 6)}`}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
