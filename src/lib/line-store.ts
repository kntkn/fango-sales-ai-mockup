import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const MESSAGES_FILE = path.join(DATA_DIR, 'line-messages.json');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'line-customers.json');

export type LineMessage = {
  id: string;
  lineUserId: string;
  direction: 'incoming' | 'outgoing';
  text: string;
  timestamp: string;
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
  return JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf-8'));
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

function readCustomers(): LineCustomer[] {
  if (!fs.existsSync(CUSTOMERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(CUSTOMERS_FILE, 'utf-8'));
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
