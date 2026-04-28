import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const MESSAGES_FILE = path.join(DATA_DIR, 'line-messages.json');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'line-customers.json');

export type LineMessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'sticker'
  | 'location';

export type LineMessage = {
  id: string;
  lineUserId: string;
  direction: 'incoming' | 'outgoing';
  text: string;
  timestamp: string;
  type?: LineMessageType;
  // attachment bookkeeping (for non-text customer messages)
  attachmentFile?: string;   // filename on disk under data/attachments/
  previewFile?: string;      // optional preview variant (outgoing image only)
  contentType?: string;      // MIME
  fileName?: string;         // original LINE file name (type === 'file')
  fileSize?: number;
  // sticker metadata
  stickerId?: string;
  packageId?: string;
  // location
  latitude?: number;
  longitude?: number;
  address?: string;
  // quote / reply
  // quoteToken: token that *this* message can be quoted by (later push/reply).
  //   - incoming: provided on event.message.quoteToken for text/sticker/image/video
  //   - outgoing: returned from push/reply API's sentMessages[].quoteToken
  quoteToken?: string;
  // quotedMessageId: id of the message this one quotes (reply-to link).
  //   - incoming: present when the user replied to a prior message
  //   - outgoing: set by the staff-side reply flow (the quoted message's id)
  quotedMessageId?: string;
};

export type LineCustomer = {
  lineUserId: string;
  displayName: string;
  aliasName?: string;
  pictureUrl?: string;
  createdAt: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  lastMessageDirection?: 'incoming' | 'outgoing';
};

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function atomicWrite(filePath: string, data: unknown) {
  ensureDir();
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath);
}

type MessagesMap = Record<string, LineMessage[]>;

function readMessages(): MessagesMap {
  if (!fs.existsSync(MESSAGES_FILE)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf-8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as MessagesMap)
      : {};
  } catch (err) {
    console.error('[line-store] corrupt messages file, starting empty:', err);
    return {};
  }
}

export function getMessages(lineUserId: string): LineMessage[] {
  return readMessages()[lineUserId] ?? [];
}

export function addMessage(msg: LineMessage): void {
  const map = readMessages();
  if (!map[msg.lineUserId]) map[msg.lineUserId] = [];
  map[msg.lineUserId].push(msg);
  atomicWrite(MESSAGES_FILE, map);
}

export function getAllMessages(): LineMessage[] {
  const map = readMessages();
  const out: LineMessage[] = [];
  for (const arr of Object.values(map)) out.push(...arr);
  return out;
}

/**
 * O(n) across all messages but only touched by `/api/line/content`. Kept as a
 * single helper so the route layer doesn't reimplement the scan. When the
 * store outgrows a few thousand messages, swap this for an id→message Map
 * built lazily.
 */
export function getMessageById(messageId: string): LineMessage | undefined {
  const map = readMessages();
  for (const arr of Object.values(map)) {
    for (const m of arr) if (m.id === messageId) return m;
  }
  return undefined;
}

export function updateMessageAttachment(
  lineUserId: string,
  messageId: string,
  patch: Partial<Pick<LineMessage, 'attachmentFile' | 'contentType' | 'fileSize'>>,
): void {
  const map = readMessages();
  const arr = map[lineUserId];
  if (!arr) return;
  const idx = arr.findIndex((m) => m.id === messageId);
  if (idx < 0) return;
  arr[idx] = { ...arr[idx], ...patch };
  atomicWrite(MESSAGES_FILE, map);
}

// Set the quoteToken on an existing outgoing message once the LINE push
// response comes back (the push API returns sentMessages[].quoteToken, which
// we persist so future messages can quote this one).
export function updateMessageQuoteToken(
  lineUserId: string,
  messageId: string,
  quoteToken: string,
): void {
  const map = readMessages();
  const arr = map[lineUserId];
  if (!arr) return;
  const idx = arr.findIndex((m) => m.id === messageId);
  if (idx < 0) return;
  arr[idx] = { ...arr[idx], quoteToken };
  atomicWrite(MESSAGES_FILE, map);
}

function readCustomers(): LineCustomer[] {
  if (!fs.existsSync(CUSTOMERS_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(CUSTOMERS_FILE, 'utf-8'));
    return Array.isArray(parsed) ? (parsed as LineCustomer[]) : [];
  } catch (err) {
    console.error('[line-store] corrupt customers file, starting empty:', err);
    return [];
  }
}

export function getCustomers(): LineCustomer[] {
  const msgMap = readMessages();
  const customers = readCustomers().map((c) => {
    if (c.lastMessageDirection) return c;
    const msgs = msgMap[c.lineUserId] ?? [];
    const last = msgs[msgs.length - 1];
    return last ? { ...c, lastMessageDirection: last.direction } : c;
  });
  return customers.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
}

export function findCustomer(lineUserId: string): LineCustomer | undefined {
  return readCustomers().find((c) => c.lineUserId === lineUserId);
}

export function upsertCustomer(c: LineCustomer): void {
  const list = readCustomers();
  const idx = list.findIndex((x) => x.lineUserId === c.lineUserId);
  if (idx >= 0) list[idx] = { ...list[idx], ...c };
  else list.push(c);
  atomicWrite(CUSTOMERS_FILE, list);
}
