import 'server-only';

/**
 * Reject hostnames that would let a caller pivot via this server into internal
 * networks or cloud-metadata endpoints. Used by every endpoint that fetches a
 * user-supplied URL.
 */
export function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h === '0.0.0.0') return true;
  // IPv6 loopback / link-local / unique-local
  if (h === '::1' || h === '[::1]') return true;
  if (h.startsWith('[fc') || h.startsWith('[fd') || h.startsWith('[fe80')) return true;
  // IPv4 loopback / RFC1918 / link-local / CGNAT
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  return false;
}
