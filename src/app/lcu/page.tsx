'use client';

import { useEffect, useRef, useState } from 'react';

type Creds = {
  source: 'server' | 'picker';
  port: string;
  password: string;
  protocol: string;
  path?: string;
};

type CallResult = {
  ok: boolean;
  status?: number;
  body?: string;
  error?: string;
};

const ENDPOINT_PATH = '/lol-gameflow/v1/session';

function parseLockfileText(raw: string): Omit<Creds, 'source'> {
  const parts = raw.trim().split(':');
  return { port: parts[2] ?? '', password: parts[3] ?? '', protocol: parts[4] ?? '' };
}

export default function LcuTestPage() {
  const [creds, setCreds] = useState<Creds | null>(null);
  const [lookupState, setLookupState] = useState<'loading' | 'found' | 'not-found'>(
    'loading',
  );
  const [calling, setCalling] = useState(false);
  const [result, setResult] = useState<CallResult | null>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

  // 1) Try the server-side auto-scan first.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/lcu-lockfile', { cache: 'no-store' });
        if (!res.ok) throw new Error('not found');
        const data = (await res.json()) as Creds;
        if (!cancelled) {
          setCreds(data);
          setLookupState('found');
        }
      } catch {
        if (!cancelled) setLookupState('not-found');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The webkitdirectory/directory attributes aren't in React's typings, so set
  // them imperatively once the input exists.
  useEffect(() => {
    if (lookupState === 'not-found' && pickerRef.current) {
      pickerRef.current.setAttribute('webkitdirectory', '');
      pickerRef.current.setAttribute('directory', '');
    }
  }, [lookupState]);

  // 2) Fallback: user picks the "League of Legends" folder; read lockfile in-browser.
  async function handleFolderPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const lockfile = files.find((f) => f.name === 'lockfile');
    if (!lockfile) {
      setResult({ ok: false, error: 'No "lockfile" found in the selected folder.' });
      return;
    }
    const text = await lockfile.text();
    const parsed = parseLockfileText(text);
    if (!parsed.port || !parsed.password) {
      setResult({ ok: false, error: 'lockfile found but could not be parsed.' });
      return;
    }
    setCreds({ source: 'picker', ...parsed });
    setLookupState('found');
    setResult(null);
  }

  // 3) The actual test: raw browser fetch straight to the LCU.
  async function callLcu() {
    if (!creds) return;
    setCalling(true);
    setResult(null);

    const url = `https://127.0.0.1:${creds.port}${ENDPOINT_PATH}`;
    const auth = btoa(`riot:${creds.password}`);

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
      });
      const body = await res.text();
      setResult({ ok: res.ok, status: res.status, body });
    } catch (err) {
      // A CORS block or TLS rejection lands here as a generic TypeError.
      setResult({
        ok: false,
        error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      });
    } finally {
      setCalling(false);
    }
  }

  const certUrl = creds ? `https://127.0.0.1:${creds.port}` : null;

  return (
    <main className="min-h-screen bg-bg-base px-6 py-10 text-text-primary">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold">LCU browser test</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Calls <code className="text-text-primary">{ENDPOINT_PATH}</code> directly
            from the browser. We expect CORS/TLS to block it — that&apos;s the point.
          </p>
        </header>

        {/* Credentials status */}
        <section className="rounded-card border border-border bg-bg-surface p-4">
          <h2 className="mb-2 text-sm font-medium text-text-secondary">Credentials</h2>

          {lookupState === 'loading' && (
            <p className="text-sm text-text-muted">Scanning for lockfile…</p>
          )}

          {lookupState === 'found' && creds && (
            <div className="flex flex-col gap-1 text-sm">
              <span>
                Source:{' '}
                <span className="text-text-primary">
                  {creds.source === 'server' ? 'auto (server scan)' : 'folder picker'}
                </span>
              </span>
              {creds.path && (
                <span className="break-all text-text-muted">{creds.path}</span>
              )}
              <span>
                Port: <span className="text-text-primary">{creds.port}</span>
              </span>
              <span>
                Password:{' '}
                <span className="text-text-primary">
                  {creds.password.slice(0, 4)}…{`(${creds.password.length} chars)`}
                </span>
              </span>
            </div>
          )}

          {lookupState === 'not-found' && (
            <div className="flex flex-col gap-2 text-sm">
              <p className="text-warning">
                Couldn&apos;t auto-find the lockfile. Pick your{' '}
                <strong>League of Legends</strong> folder (the one containing the{' '}
                <code>lockfile</code>):
              </p>
              <input
                ref={pickerRef}
                type="file"
                onChange={handleFolderPicked}
                className="text-sm text-text-secondary file:mr-3 file:rounded-pill file:border-0 file:bg-brand file:px-4 file:py-1.5 file:text-text-primary hover:file:bg-brand-hover"
              />
            </div>
          )}
        </section>

        {/* Cert acceptance hint */}
        {certUrl && (
          <p className="text-xs text-text-muted">
            If the call fails on TLS, first open{' '}
            <a
              href={certUrl}
              target="_blank"
              rel="noreferrer"
              className="text-brand underline"
            >
              {certUrl}
            </a>{' '}
            once and accept the self-signed certificate.
          </p>
        )}

        {/* The test button */}
        <button
          onClick={callLcu}
          disabled={!creds || calling}
          className="w-fit rounded-pill bg-brand px-5 py-2 text-sm font-medium text-text-primary hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {calling ? 'Calling…' : 'Call LCU directly (browser fetch)'}
        </button>

        {/* Result */}
        {result && (
          <section className="rounded-card border border-border bg-bg-elevated p-4">
            <h2 className="mb-2 text-sm font-medium text-text-secondary">Result</h2>
            {result.error ? (
              <div className="text-sm">
                <p className="text-danger">Request failed: {result.error}</p>
                <p className="mt-2 text-text-muted">
                  A bare <code>TypeError: Failed to fetch</code> here is almost
                  certainly CORS (the LCU sends no{' '}
                  <code>Access-Control-Allow-Origin</code>) or an un-accepted TLS cert.
                </p>
              </div>
            ) : (
              <div className="text-sm">
                <p>
                  HTTP{' '}
                  <span className={result.ok ? 'text-success' : 'text-danger'}>
                    {result.status}
                  </span>
                </p>
                <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-all rounded bg-bg-base p-3 text-xs text-text-secondary">
                  {result.body}
                </pre>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
