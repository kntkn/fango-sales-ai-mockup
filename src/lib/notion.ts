import 'server-only';
import { Client } from '@notionhq/client';

const token = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_CUSTOMER_DB_ID;
const DATA_SOURCE_ID = process.env.NOTION_CUSTOMER_DS_ID;

if (!token) throw new Error('NOTION_TOKEN is not set');
if (!DATABASE_ID) throw new Error('NOTION_CUSTOMER_DB_ID is not set');
if (!DATA_SOURCE_ID) throw new Error('NOTION_CUSTOMER_DS_ID is not set');

export const notion = new Client({ auth: token });
export const CUSTOMER_DB_ID = DATABASE_ID;
export const CUSTOMER_DS_ID = DATA_SOURCE_ID;

export type PropertyType = 'アパート' | 'マンション' | '一戸建て';

export interface NotionCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  inquiryDate: string | null;
  propertyName: string;
  propertyUrl: string;
  propertyCode: string;
  propertyType: PropertyType | null;
  location: string;
  station: string;
  layout: string;
  rentMan: number | null;
  areaM2: number | null;
  createdAt: string;
}

type AnyProp = Record<string, unknown>;

function text(prop: AnyProp | undefined): string {
  if (!prop) return '';
  const p = prop as { type?: string; title?: Array<{ plain_text?: string }>; rich_text?: Array<{ plain_text?: string }> };
  if (p.type === 'title') return p.title?.[0]?.plain_text ?? '';
  if (p.type === 'rich_text') return p.rich_text?.[0]?.plain_text ?? '';
  return '';
}

function email(prop: AnyProp | undefined): string {
  const p = prop as { email?: string | null };
  return p?.email ?? '';
}

function phone(prop: AnyProp | undefined): string {
  const p = prop as { phone_number?: string | null };
  return p?.phone_number ?? '';
}

function url(prop: AnyProp | undefined): string {
  const p = prop as { url?: string | null };
  return p?.url ?? '';
}

function dateStart(prop: AnyProp | undefined): string | null {
  const p = prop as { date?: { start?: string } | null };
  return p?.date?.start ?? null;
}

function number(prop: AnyProp | undefined): number | null {
  const p = prop as { number?: number | null };
  return p?.number ?? null;
}

function select(prop: AnyProp | undefined): string | null {
  const p = prop as { select?: { name?: string } | null };
  return p?.select?.name ?? null;
}

export function mapPageToCustomer(page: AnyProp): NotionCustomer {
  const pg = page as { id: string; created_time: string; properties: Record<string, AnyProp> };
  const p = pg.properties;
  const pt = select(p['物件種別']);
  return {
    id: pg.id,
    name: text(p['氏名']),
    email: email(p['Email']),
    phone: phone(p['電話番号']),
    inquiryDate: dateStart(p['反響日時']),
    propertyName: text(p['物件名']),
    propertyUrl: url(p['物件URL']),
    propertyCode: text(p['貴社物件コード']),
    propertyType: (pt === 'アパート' || pt === 'マンション' || pt === '一戸建て') ? pt : null,
    location: text(p['所在地']),
    station: text(p['最寄り駅']),
    layout: text(p['間取り']),
    rentMan: number(p['賃料(万円)']),
    areaM2: number(p['占有面積(m2)']),
    createdAt: pg.created_time,
  };
}

export async function listCustomers(): Promise<NotionCustomer[]> {
  const res = await notion.dataSources.query({
    data_source_id: CUSTOMER_DS_ID,
    page_size: 100,
  });
  const customers = res.results.map((r) => mapPageToCustomer(r as AnyProp));
  customers.sort((a, b) => {
    const ta = a.inquiryDate ?? a.createdAt;
    const tb = b.inquiryDate ?? b.createdAt;
    return tb.localeCompare(ta);
  });
  return customers;
}

export async function getCustomer(id: string): Promise<NotionCustomer | null> {
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    return mapPageToCustomer(page as AnyProp);
  } catch {
    return null;
  }
}

export interface CustomerUpdate {
  name?: string;
  email?: string | null;
  phone?: string | null;
  inquiryDate?: string | null;
  propertyName?: string;
  propertyUrl?: string | null;
  propertyCode?: string;
  propertyType?: PropertyType | null;
  location?: string;
  station?: string;
  layout?: string;
  rentMan?: number | null;
  areaM2?: number | null;
}

function buildUpdateProperties(u: CustomerUpdate): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  if (u.name !== undefined) props['氏名'] = { title: [{ text: { content: u.name } }] };
  if (u.email !== undefined) props['Email'] = { email: u.email || null };
  if (u.phone !== undefined) props['電話番号'] = { phone_number: u.phone || null };
  if (u.inquiryDate !== undefined) props['反響日時'] = u.inquiryDate ? { date: { start: u.inquiryDate } } : { date: null };
  if (u.propertyName !== undefined) props['物件名'] = { rich_text: [{ text: { content: u.propertyName } }] };
  if (u.propertyUrl !== undefined) props['物件URL'] = { url: u.propertyUrl || null };
  if (u.propertyCode !== undefined) props['貴社物件コード'] = { rich_text: [{ text: { content: u.propertyCode } }] };
  if (u.propertyType !== undefined) props['物件種別'] = u.propertyType ? { select: { name: u.propertyType } } : { select: null };
  if (u.location !== undefined) props['所在地'] = { rich_text: [{ text: { content: u.location } }] };
  if (u.station !== undefined) props['最寄り駅'] = { rich_text: [{ text: { content: u.station } }] };
  if (u.layout !== undefined) props['間取り'] = { rich_text: [{ text: { content: u.layout } }] };
  if (u.rentMan !== undefined) props['賃料(万円)'] = { number: u.rentMan };
  if (u.areaM2 !== undefined) props['占有面積(m2)'] = { number: u.areaM2 };
  return props;
}

export async function updateCustomer(id: string, u: CustomerUpdate): Promise<NotionCustomer | null> {
  const page = await notion.pages.update({
    page_id: id,
    properties: buildUpdateProperties(u) as never,
  });
  return mapPageToCustomer(page as AnyProp);
}

export async function createCustomer(u: CustomerUpdate & { name: string }): Promise<NotionCustomer> {
  const page = await notion.pages.create({
    parent: { data_source_id: CUSTOMER_DS_ID },
    properties: buildUpdateProperties(u) as never,
  });
  return mapPageToCustomer(page as AnyProp);
}
