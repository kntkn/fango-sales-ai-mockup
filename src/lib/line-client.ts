import crypto from 'crypto';

function secret() {
  const s = process.env.LINE_CHANNEL_SECRET;
  if (!s) throw new Error('LINE_CHANNEL_SECRET not set');
  return s;
}

function token() {
  const t = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!t) throw new Error('LINE_CHANNEL_ACCESS_TOKEN not set');
  return t;
}

export function validateSignature(rawBody: string, signature: string): boolean {
  if (!signature) return false;
  const digest = crypto.createHmac('sha256', secret()).update(rawBody).digest('base64');
  const a = Buffer.from(digest);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function pushMessage(userId: string, text: string): Promise<void> {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: 'text', text }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LINE push error: ${res.status} ${err}`);
  }
}

export async function getUserProfile(
  userId: string,
): Promise<{ displayName: string; pictureUrl?: string }> {
  const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) return { displayName: `LINE ${userId.slice(1, 7)}` };
  return res.json() as Promise<{ displayName: string; pictureUrl?: string }>;
}
