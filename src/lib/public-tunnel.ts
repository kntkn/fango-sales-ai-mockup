import 'server-only';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const LOCK_PATH = path.join(process.cwd(), 'data', 'public-tunnel.json');
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const SPAWN_TIMEOUT_MS = 30_000;

type Lock = { url: string; pid: number; port: number; startedAt: number };

function readLock(): Lock | null {
  try {
    return JSON.parse(fs.readFileSync(LOCK_PATH, 'utf-8')) as Lock;
  } catch {
    return null;
  }
}

function writeLock(lock: Lock): void {
  fs.mkdirSync(path.dirname(LOCK_PATH), { recursive: true });
  fs.writeFileSync(LOCK_PATH, JSON.stringify(lock, null, 2));
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
}

async function probeTunnel(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal });
    clearTimeout(t);
    return res.ok || res.status === 404 || res.status === 405;
  } catch {
    return false;
  }
}

function spawnTunnel(port: number): Promise<Lock> {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${port}`], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true,
      });
    } catch (err) {
      reject(err);
      return;
    }

    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try {
          child.kill();
        } catch {
          /* ignore */
        }
        reject(new Error('cloudflared did not report a URL within 30s'));
      }
    }, SPAWN_TIMEOUT_MS);

    const onData = (buf: Buffer) => {
      if (resolved) return;
      const m = buf.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (!m) return;
      resolved = true;
      clearTimeout(timer);
      const lock: Lock = {
        url: m[0],
        pid: child.pid ?? 0,
        port,
        startedAt: Date.now(),
      };
      child.stdout?.removeAllListeners('data');
      child.stderr?.removeAllListeners('data');
      child.unref();
      resolve(lock);
    };

    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.on('error', (err) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      reject(err);
    });
    child.on('exit', (code) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      reject(new Error(`cloudflared exited early (code=${code})`));
    });
  });
}

let inflight: Promise<Lock> | null = null;

/**
 * Returns a public HTTPS URL that routes to this Next.js server.
 *
 * Order:
 *   1. PUBLIC_BASE_URL env var (explicit override, trailing slash stripped).
 *   2. Inbound request headers (x-forwarded-host / x-forwarded-proto) when
 *      they refer to a non-local host — already-public deploys take no tunnel.
 *   3. Persisted cloudflared tunnel (data/public-tunnel.json) if still alive.
 *   4. Spawn a fresh `cloudflared tunnel --url` for `port` and persist.
 *
 * The quick-tunnel URL is ephemeral (rotates whenever cloudflared respawns)
 * but LINE only needs it long enough to fetch the image once, so a tunnel
 * lifetime of minutes-to-hours is sufficient.
 */
export async function getPublicBaseUrl(req: Request, port: number): Promise<string> {
  const envUrl = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '');
  if (envUrl) return envUrl;

  const fwdHost = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const fwdProto = req.headers.get('x-forwarded-proto') ?? 'https';
  if (
    fwdHost &&
    !fwdHost.startsWith('localhost') &&
    !fwdHost.startsWith('127.0.0.1') &&
    !fwdHost.match(/^\d+\.\d+\.\d+\.\d+/)
  ) {
    return `${fwdProto}://${fwdHost}`;
  }

  const existing = readLock();
  if (
    existing &&
    existing.port === port &&
    isPidAlive(existing.pid) &&
    Date.now() - existing.startedAt < MAX_AGE_MS &&
    (await probeTunnel(existing.url))
  ) {
    return existing.url;
  }

  if (!inflight) {
    inflight = spawnTunnel(port)
      .then((lock) => {
        writeLock(lock);
        return lock;
      })
      .finally(() => {
        inflight = null;
      });
  }
  const fresh = await inflight;
  return fresh.url;
}
