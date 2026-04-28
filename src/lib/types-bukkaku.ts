export type BukkakuStatus =
  | "idle"
  | "connecting"
  | "reins_fetching"
  | "bukaku_running"
  | "complete"
  | "error"
  | "cancelled";

export type BukkakuProperty = {
  property_name: string;
  room_number: string;
  management_company: string;
  management_phone: string;
  address: string;
  rent: string;
  reins_id: string;
  maisoku_path: string | null;
  maisoku_url: string | null;
};

/** A single match inside a platform hit — this is where ad_percent lives. */
export type BukkakuMatch = {
  status?: string;
  has_ad?: boolean;
  ad_info?: string;
  ad_months?: string;
  /** Canonical AD as percentage string e.g. "0%", "100%", "200%". */
  ad_percent?: string;
  viewing_available?: boolean;
  url?: string;
};

export type BukkakuResultHit = {
  platformId: string;
  platform?: unknown;
  status?: string;
  success?: boolean;
  count?: number;
  results?: BukkakuMatch[];
  viewing_available?: boolean;
  ad_months?: string;
};

export type BukkakuResult = {
  property: BukkakuProperty;
  found: boolean;
  hits: BukkakuResultHit[];
  results: BukkakuMatch[];
  platformId: string;
  strategy: string;
  /** True when none of the platforms returned a hit — operator must phone-check. */
  needs_manual_check: boolean;
};

export type VacancyHit = {
  property: BukkakuProperty;
  platformId: string;
  name: string;
  room: string;
};

export type BukkakuProgress = {
  reins: { current: number; total: number; reinsId: string };
  bukaku: {
    completed: number;
    total: number;
    found: number;
    remainingSeconds: number;
  };
  properties: BukkakuProperty[];
  results: BukkakuResult[];
  vacancies: VacancyHit[];
  failedReinsIds: string[];
  error: string | null;
};

export type BukkakuState = {
  status: BukkakuStatus;
  progress: BukkakuProgress;
};
