import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// The lockfile read must happen on the server (Node), not the Edge runtime,
// because it touches the local filesystem.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// League always installs under a "Riot Games/League of Legends" folder, but the
// *drive* and sometimes the parent folder is user-selectable. Cover the common
// bases; the drive letter is prepended per-drive below on Windows.
const WINDOWS_SUBPATHS: readonly string[][] = [
  ['Riot Games', 'League of Legends', 'lockfile'],
  ['Program Files', 'Riot Games', 'League of Legends', 'lockfile'],
  ['Program Files (x86)', 'Riot Games', 'League of Legends', 'lockfile'],
  ['Games', 'Riot Games', 'League of Legends', 'lockfile'],
  ['Riot Games', 'Game', 'lockfile'],
];

function candidatePaths(): string[] {
  // Explicit override always wins (useful when the install is somewhere weird).
  const override = process.env.LCU_LOCKFILE_PATH;
  if (override) return [override];

  const paths: string[] = [];

  if (process.platform === 'win32') {
    // Scan every possible drive letter (C:, D:, E:, ...).
    for (let code = 'A'.charCodeAt(0); code <= 'Z'.charCodeAt(0); code++) {
      const drive = `${String.fromCharCode(code)}:\\`;
      for (const sub of WINDOWS_SUBPATHS) {
        paths.push(path.join(drive, ...sub));
      }
    }
  } else if (process.platform === 'darwin') {
    paths.push('/Applications/League of Legends.app/Contents/LoL/lockfile');
    paths.push(
      path.join(
        os.homedir(),
        'Applications',
        'League of Legends.app',
        'Contents',
        'LoL',
        'lockfile',
      ),
    );
  } else {
    // Linux (Lutris/Wine) best-effort.
    paths.push(
      path.join(
        os.homedir(),
        '.wine',
        'drive_c',
        'Riot Games',
        'League of Legends',
        'lockfile',
      ),
    );
  }

  return paths;
}

// Lockfile is a single line: LeagueClient:<pid>:<port>:<password>:<protocol>
function parseLockfile(raw: string) {
  const [name, pid, port, password, protocol] = raw.trim().split(':');
  return { name, pid, port, password, protocol };
}

export async function GET() {
  const candidates = candidatePaths();

  for (const filePath of candidates) {
    try {
      const raw = await readFile(filePath, 'utf8');
      const parsed = parseLockfile(raw);
      if (parsed.port && parsed.password) {
        return NextResponse.json({ source: 'server', path: filePath, ...parsed });
      }
    } catch {
      // Not at this path — keep scanning.
    }
  }

  return NextResponse.json(
    { error: 'lockfile-not-found', searchedCount: candidates.length },
    { status: 404 },
  );
}
