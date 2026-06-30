import type { ConnectionStatus, RemoteParticipant } from '@/types/call';

/**
 * SFU client: ONE PeerConnection to the server. The server drives negotiation —
 * it sends the offer, we answer. We never call createOffer().
 *
 * Protocol envelope: { event, data } where `data` is a JSON string.
 *   server -> us:  "offer", "candidate"
 *   us -> server:  "answer", "candidate"
 *
 * Mirrors api/test-client.html and the Go SFUService wire format.
 */

export interface SFUClientOptions {
  wsUrl: string;
  onStatusChange: (status: ConnectionStatus) => void;
  onLocalStream: (stream: MediaStream) => void;
  onParticipantJoined: (participant: RemoteParticipant) => void;
  onParticipantLeft: (id: string) => void;
  onSpeakingChange: (id: string, isSpeaking: boolean) => void;
  onPing: (ms: number) => void;
}

interface WSMessage {
  event: string;
  data: string;
}

interface SpeakingMonitor {
  context: AudioContext;
  intervalId: ReturnType<typeof setInterval>;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const AUDIO_CONTAINER_ID = 'audio-container';
// RMS over the 0..255 frequency data; ~15 reliably separates speech from idle noise.
const SPEAKING_THRESHOLD = 15;
const SPEAKING_POLL_MS = 100;

function isWSMessage(value: unknown): value is WSMessage {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.event === 'string' && typeof record.data === 'string';
}

export class SFUClient {
  private readonly options: SFUClientOptions;

  private pc: RTCPeerConnection | null = null;
  private ws: WebSocket | null = null;
  private localStream: MediaStream | null = null;

  // True once we deliberately tear down, so late socket/peer callbacks stay silent.
  private closing = false;

  // ICE candidates that arrive before the offer is applied are buffered, then
  // flushed after setRemoteDescription (addIceCandidate throws if called too early).
  private readonly pendingCandidates: RTCIceCandidateInit[] = [];

  private readonly audioElements = new Map<string, HTMLAudioElement>();
  private readonly speakingMonitors = new Map<string, SpeakingMonitor>();

  // Polls the active ICE candidate pair's round-trip time for the latency badge.
  private latencyIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(options: SFUClientOptions) {
    this.options = options;
  }

  async connect(): Promise<void> {
    if (typeof window === 'undefined') return;
    this.closing = false;

    // 1. Mic only — audio-only SFU. Throws if the user denies access.
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    this.localStream = stream;
    this.options.onLocalStream(stream);

    // 2. One PeerConnection to the SFU. Push our mic track up.
    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.pc = pc;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    // 3. Trickle our ICE candidates to the server.
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.send({ event: 'candidate', data: JSON.stringify(event.candidate) });
      }
    };

    // 4. The server fans out every other participant's audio as remote tracks.
    pc.ontrack = (event) => this.handleTrack(event);

    pc.onconnectionstatechange = () => {
      if (this.closing || !this.pc) return;
      switch (this.pc.connectionState) {
        case 'connecting':
          this.options.onStatusChange('connecting');
          break;
        case 'connected':
          this.options.onStatusChange('connected');
          break;
        case 'disconnected':
          this.options.onStatusChange('disconnected');
          break;
        case 'failed':
          this.options.onStatusChange('failed');
          break;
        default:
          break;
      }
    };

    // 5. Open signaling. No "join" message — the server starts offering on connect.
    const ws = new WebSocket(this.options.wsUrl);
    this.ws = ws;
    ws.onmessage = (event) => {
      void this.handleMessage(event);
    };
    ws.onerror = () => {
      if (!this.closing) this.options.onStatusChange('failed');
    };
    ws.onclose = () => {
      if (!this.closing) this.options.onStatusChange('disconnected');
    };

    // 6. Report real media RTT (UDP path to the SFU) for the latency badge.
    this.startLatencyPolling();
  }

  disconnect(): void {
    // SFU has no "leave" message — closing the socket lets the server detect the
    // drop and clean up our peer.
    this.closing = true;

    if (this.latencyIntervalId !== null) {
      clearInterval(this.latencyIntervalId);
      this.latencyIntervalId = null;
    }

    this.stopAllSpeakingDetection();

    if (this.pc) {
      this.pc.onicecandidate = null;
      this.pc.ontrack = null;
      this.pc.onconnectionstatechange = null;
      this.pc.close();
      this.pc = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.ws) {
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.onopen = null;
      this.ws.close();
      this.ws = null;
    }

    this.pendingCandidates.length = 0;

    for (const element of this.audioElements.values()) {
      element.srcObject = null;
      element.remove();
    }
    this.audioElements.clear();
  }

  // Every few seconds, read the negotiated candidate pair's RTT and report it.
  // This is the real audio-path latency (UDP, direct to the SFU) — not the
  // signaling/WebSocket path, which detours through nginx + Cloudflare.
  private startLatencyPolling(): void {
    const POLL_MS = 3000;
    this.latencyIntervalId = setInterval(() => {
      void this.pollLatency();
    }, POLL_MS);
  }

  private async pollLatency(): Promise<void> {
    const pc = this.pc;
    if (!pc) return;
    try {
      const stats = await pc.getStats();
      stats.forEach((report) => {
        if (report.type !== 'candidate-pair') return;
        const pair = report as RTCIceCandidatePairStats;
        if (
          pair.state === 'succeeded' &&
          typeof pair.currentRoundTripTime === 'number'
        ) {
          this.options.onPing(Math.round(pair.currentRoundTripTime * 1000));
        }
      });
    } catch {
      // getStats can reject while the connection is tearing down — ignore.
    }
  }

  private send(message: WSMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private async handleMessage(event: MessageEvent<unknown>): Promise<void> {
    const pc = this.pc;
    if (!pc) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(typeof event.data === 'string' ? event.data : '');
    } catch {
      return;
    }
    if (!isWSMessage(parsed)) return;

    if (parsed.event === 'offer') {
      const offer = JSON.parse(parsed.data) as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(offer);

      // Flush any candidates that arrived before the offer.
      for (const candidate of this.pendingCandidates.splice(0)) {
        try {
          await pc.addIceCandidate(candidate);
        } catch {
          // A stale candidate is non-fatal — keep negotiating.
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (pc.localDescription) {
        this.send({ event: 'answer', data: JSON.stringify(pc.localDescription) });
      }
    } else if (parsed.event === 'candidate') {
      const candidate = JSON.parse(parsed.data) as RTCIceCandidateInit;
      if (!pc.remoteDescription) {
        this.pendingCandidates.push(candidate); // too early — buffer it
        return;
      }
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // Ignore candidates the peer connection rejects.
      }
    }
  }

  private handleTrack(event: RTCTrackEvent): void {
    const stream = event.streams[0];
    if (!stream) return;
    const id = stream.id;

    let element = this.audioElements.get(id);
    if (!element) {
      element = document.createElement('audio');
      element.autoplay = true;
      this.audioElements.set(id, element);
      this.getAudioContainer()?.appendChild(element);
      this.options.onParticipantJoined({ id, stream, isSpeaking: false });
      this.startSpeakingDetection(stream, id);
    }
    element.srcObject = stream;

    // When a participant leaves, the server removes their track → drop everything.
    stream.onremovetrack = () => this.removeRemoteStream(id);
  }

  private removeRemoteStream(id: string): void {
    const element = this.audioElements.get(id);
    if (element) {
      element.srcObject = null;
      element.remove();
      this.audioElements.delete(id);
    }
    this.stopSpeakingDetection(id);
    this.options.onParticipantLeft(id);
  }

  private getAudioContainer(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    return document.getElementById(AUDIO_CONTAINER_ID);
  }

  private startSpeakingDetection(stream: MediaStream, id: string): void {
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    let speaking = false;

    const intervalId = setInterval(() => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (const value of data) sum += value * value;
      const rms = Math.sqrt(sum / data.length);

      const next = rms > SPEAKING_THRESHOLD;
      if (next !== speaking) {
        speaking = next;
        this.options.onSpeakingChange(id, next);
      }
    }, SPEAKING_POLL_MS);

    this.speakingMonitors.set(id, { context, intervalId });
  }

  private stopSpeakingDetection(id: string): void {
    const monitor = this.speakingMonitors.get(id);
    if (!monitor) return;
    clearInterval(monitor.intervalId);
    void monitor.context.close();
    this.speakingMonitors.delete(id);
  }

  private stopAllSpeakingDetection(): void {
    for (const id of [...this.speakingMonitors.keys()]) {
      this.stopSpeakingDetection(id);
    }
  }
}
