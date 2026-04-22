import 'server-only';
import { notion, CUSTOMER_DS_ID } from './notion';

const SECTION_MARKER = '💬 チャットログ';
const MAX_TEXT_CHUNK = 1900;

export type ChatDirection = 'USER' | 'STAFF';

export interface ChatMessage {
  lineUserId: string;
  direction: ChatDirection;
  senderName?: string;
  text: string;
  messageType?: string;
  timestamp?: number | string;
}

interface PageState {
  sectionInitialized: boolean;
  lastDate: string | null;
}

const pageStateCache = new Map<string, PageState>();

function toJst(d: Date): Date {
  return new Date(d.getTime() + 9 * 60 * 60 * 1000);
}

function fmtDate(d: Date): string {
  return toJst(d).toISOString().slice(0, 10);
}

function fmtTime(d: Date): string {
  return toJst(d).toISOString().slice(11, 19);
}

function dayOfWeek(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
}

function chunkText(text: string, size = MAX_TEXT_CHUNK): string[] {
  if (!text) return [''];
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    out.push(text.slice(i, i + size));
  }
  return out;
}

type NotionPage = {
  id: string;
  properties?: Record<string, { title?: Array<{ plain_text?: string }> }>;
};

async function findCustomerByLineUserId(
  lineUserId: string,
): Promise<{ pageId: string; customerName: string } | null> {
  const res = await notion.dataSources.query({
    data_source_id: CUSTOMER_DS_ID,
    filter: {
      property: 'LINE userId',
      rich_text: { equals: lineUserId },
    },
    page_size: 1,
  } as never);
  const page = (res.results as unknown as NotionPage[])[0];
  if (!page) return null;
  const title = page.properties?.['氏名']?.title ?? [];
  const customerName = title.map((t) => t.plain_text ?? '').join('');
  return { pageId: page.id, customerName };
}

type Block =
  | {
      type: 'heading_2';
      heading_2?: { rich_text?: Array<{ plain_text?: string }> };
    }
  | {
      type: 'heading_3';
      heading_3?: { rich_text?: Array<{ plain_text?: string }> };
    }
  | { type: string };

async function loadPageState(pageId: string): Promise<PageState> {
  const cached = pageStateCache.get(pageId);
  if (cached) return cached;

  const state: PageState = { sectionInitialized: false, lastDate: null };
  let cursor: string | undefined;

  for (;;) {
    const res = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const block of res.results as unknown as Block[]) {
      if (block.type === 'heading_2') {
        const b = block as { heading_2?: { rich_text?: Array<{ plain_text?: string }> } };
        const text = (b.heading_2?.rich_text ?? [])
          .map((r) => r.plain_text ?? '')
          .join('');
        if (text.includes(SECTION_MARKER)) state.sectionInitialized = true;
      } else if (block.type === 'heading_3') {
        const b = block as { heading_3?: { rich_text?: Array<{ plain_text?: string }> } };
        const text = (b.heading_3?.rich_text ?? [])
          .map((r) => r.plain_text ?? '')
          .join('');
        const m = text.match(/^(\d{4}-\d{2}-\d{2})/);
        if (m) state.lastDate = m[1];
      }
    }
    if (!res.has_more) break;
    cursor = res.next_cursor ?? undefined;
  }

  pageStateCache.set(pageId, state);
  return state;
}

function parseTimestamp(ts: number | string | undefined): Date {
  if (ts === undefined) return new Date();
  if (typeof ts === 'number') return new Date(ts);
  return new Date(ts);
}

export async function appendChatMessage(
  msg: ChatMessage,
): Promise<{ ok: boolean; pageId?: string; reason?: string }> {
  const customer = await findCustomerByLineUserId(msg.lineUserId);
  if (!customer) return { ok: false, reason: 'customer_not_found' };
  const { pageId, customerName } = customer;

  const ts = parseTimestamp(msg.timestamp);
  const dateStr = fmtDate(ts);
  const timeStr = fmtTime(ts);

  const senderName =
    msg.senderName ??
    (msg.direction === 'USER' ? customerName || '顧客' : 'Staff');

  const state = await loadPageState(pageId);
  const blocks: unknown[] = [];

  if (!state.sectionInitialized) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: SECTION_MARKER } }],
      },
    });
  }

  if (state.lastDate !== dateStr) {
    blocks.push({
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [
          {
            type: 'text',
            text: { content: `${dateStr} (${dayOfWeek(dateStr)})` },
          },
        ],
      },
    });
  }

  const dirIcon = msg.direction === 'USER' ? '👤' : '🏢';
  const headerLine = `[${timeStr}] ${dirIcon} ${msg.direction} — ${senderName}`;
  const typeLabel =
    msg.messageType && msg.messageType !== 'text'
      ? `[${msg.messageType.toUpperCase()}] `
      : '';
  const body = typeLabel + (msg.text ?? '');

  const richText: unknown[] = [
    {
      type: 'text',
      text: { content: headerLine },
      annotations: { bold: true },
    },
    { type: 'text', text: { content: '\n' } },
  ];
  for (const chunk of chunkText(body)) {
    richText.push({ type: 'text', text: { content: chunk } });
  }

  blocks.push({
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: richText },
  });

  await notion.blocks.children.append({
    block_id: pageId,
    children: blocks as never,
  });

  state.sectionInitialized = true;
  state.lastDate = dateStr;

  return { ok: true, pageId };
}
