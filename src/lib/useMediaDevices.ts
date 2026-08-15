'use client';

import { useCallback, useEffect, useState } from 'react';

export interface MediaDevices {
  inputs: MediaDeviceInfo[];
  outputs: MediaDeviceInfo[];
  // Device labels are blank until the mic permission has been granted at
  // least once in this session — browsers hide them from unprivileged code.
  hasLabels: boolean;
  // Prompts for mic access purely to unlock device labels (immediately stops
  // the resulting track — this isn't meant to open a call).
  requestPermission: () => Promise<void>;
}

/**
 * Lists available audio input (mic) and output (speaker) devices, refreshing
 * whenever devices are plugged/unplugged. Output devices (`audiooutput`) are
 * only exposed by browsers that support the Audio Output Devices API
 * (Chrome/Edge; not Safari/Firefox as of writing) — `outputs` is simply empty
 * elsewhere and the UI should hide that picker.
 */
export function useMediaDevices(): MediaDevices {
  const [inputs, setInputs] = useState<MediaDeviceInfo[]>([]);
  const [outputs, setOutputs] = useState<MediaDeviceInfo[]>([]);
  const [hasLabels, setHasLabels] = useState(false);

  const refresh = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    setInputs(devices.filter((d) => d.kind === 'audioinput'));
    setOutputs(devices.filter((d) => d.kind === 'audiooutput'));
    setHasLabels(devices.some((d) => d.label !== ''));
  }, []);

  useEffect(() => {
    void refresh();
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;
    navigator.mediaDevices.addEventListener('devicechange', refresh);
    return () => navigator.mediaDevices.removeEventListener('devicechange', refresh);
  }, [refresh]);

  const requestPermission = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    await refresh();
  }, [refresh]);

  return { inputs, outputs, hasLabels, requestPermission };
}
