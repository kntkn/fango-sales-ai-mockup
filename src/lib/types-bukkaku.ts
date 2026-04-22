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
  address: string;
  rent: string;
  reins_id: string;
  maisoku_url: string | null;
};

export type BukkakuResultHit = {
  platformId: string;
  status: string;
  viewing_available?: boolean;
  ad_months?: string;
};

export type BukkakuResult = {
  property: BukkakuProperty;
  found: boolean;
  hits: BukkakuResultHit[];
  results: BukkakuResultHit[];
  platformId: string;
  strategy: string;
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
