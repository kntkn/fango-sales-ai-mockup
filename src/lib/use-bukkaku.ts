"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type {
  BukkakuState,
  BukkakuProgress,
  BukkakuProperty,
  BukkakuResult,
  VacancyHit,
} from "./types-bukkaku";

const WS_URL =
  process.env.NEXT_PUBLIC_BUKKAKU_WS_URL ?? "ws://localhost:3001";

const initialProgress: BukkakuProgress = {
  reins: { current: 0, total: 0, reinsId: "" },
  bukaku: { completed: 0, total: 0, found: 0, remainingSeconds: 0 },
  properties: [],
  results: [],
  vacancies: [],
  failedReinsIds: [],
  error: null,
};

export const initialBukkakuState: BukkakuState = {
  status: "idle",
  progress: initialProgress,
};

type Action =
  | { type: "connect" }
  | { type: "pipeline_start"; totalIds: number }
  | { type: "reins_progress"; current: number; total: number; reinsId: string }
  | { type: "property_fetched"; property: BukkakuProperty }
  | { type: "reins_error"; reinsId: string }
  | { type: "reins_complete" }
  | { type: "bukaku_progress"; completed: number; total: number; found: number; remainingSeconds: number }
  | { type: "bukaku_result"; result: BukkakuResult }
  | { type: "vacancy_found"; vacancy: VacancyHit }
  | { type: "pipeline_complete" }
  | { type: "error"; message: string }
  | { type: "cancelled" }
  | { type: "reset" };

function reducer(state: BukkakuState, action: Action): BukkakuState {
  switch (action.type) {
    case "connect":
      return { ...initialBukkakuState, status: "connecting" };

    case "pipeline_start":
      return {
        ...state,
        status: "reins_fetching",
        progress: {
          ...state.progress,
          reins: { ...state.progress.reins, total: action.totalIds },
        },
      };

    case "reins_progress":
      return {
        ...state,
        progress: {
          ...state.progress,
          reins: {
            current: action.current,
            total: action.total,
            reinsId: action.reinsId,
          },
        },
      };

    case "property_fetched":
      return {
        ...state,
        progress: {
          ...state.progress,
          properties: [...state.progress.properties, action.property],
        },
      };

    case "reins_error":
      return {
        ...state,
        progress: {
          ...state.progress,
          failedReinsIds: [...state.progress.failedReinsIds, action.reinsId],
        },
      };

    case "reins_complete":
      return {
        ...state,
        status: state.progress.properties.length > 0 ? "bukaku_running" : "complete",
        progress: {
          ...state.progress,
          reins: { ...state.progress.reins, current: state.progress.reins.total },
        },
      };

    case "bukaku_progress":
      return {
        ...state,
        progress: {
          ...state.progress,
          bukaku: {
            completed: action.completed,
            total: action.total,
            found: action.found,
            remainingSeconds: action.remainingSeconds,
          },
        },
      };

    case "bukaku_result":
      return {
        ...state,
        progress: {
          ...state.progress,
          results: [...state.progress.results, action.result],
        },
      };

    case "vacancy_found":
      return {
        ...state,
        progress: {
          ...state.progress,
          vacancies: [...state.progress.vacancies, action.vacancy],
        },
      };

    case "pipeline_complete":
      return { ...state, status: "complete" };

    case "error":
      return {
        ...state,
        status: "error",
        progress: { ...state.progress, error: action.message },
      };

    case "cancelled":
      return { ...state, status: "cancelled" };

    case "reset":
      return initialBukkakuState;

    default:
      return state;
  }
}

function parseMessageToAction(msg: {
  type: string;
  [key: string]: unknown;
}): Action | null {
  switch (msg.type) {
    case "pipeline_start":
      return { type: "pipeline_start", totalIds: msg.totalIds as number };
    case "reins_progress":
      return {
        type: "reins_progress",
        current: msg.current as number,
        total: msg.total as number,
        reinsId: msg.reinsId as string,
      };
    case "property_fetched":
      return {
        type: "property_fetched",
        property: {
          property_name: (msg.property_name as string) ?? "",
          room_number: (msg.room_number as string) ?? "",
          management_company: (msg.management_company as string) ?? "",
          management_phone: (msg.management_phone as string) ?? "",
          address: (msg.address as string) ?? "",
          rent: (msg.rent as string) ?? "",
          reins_id: msg.reins_id as string,
          maisoku_path: (msg.maisoku_path as string | null) ?? null,
          maisoku_url: (msg.maisoku_url as string | null) ?? null,
        },
      };
    case "reins_error":
      return { type: "reins_error", reinsId: msg.reinsId as string };
    case "reins_complete":
      return { type: "reins_complete" };
    case "bukaku_progress":
      return {
        type: "bukaku_progress",
        completed: msg.completed as number,
        total: msg.total as number,
        found: msg.found as number,
        remainingSeconds: msg.remainingSeconds as number,
      };
    case "bukaku_result":
      return {
        type: "bukaku_result",
        result: {
          property: msg.property as BukkakuProperty,
          found: msg.found as boolean,
          hits: (msg.hits as BukkakuResult["hits"]) || [],
          results: (msg.results as BukkakuResult["results"]) || [],
          platformId: (msg.platformId as string) || "",
          strategy: (msg.strategy as string) || "",
          needs_manual_check: Boolean(msg.needs_manual_check),
        },
      };
    case "vacancy_found":
      return {
        type: "vacancy_found",
        vacancy: {
          property: msg.property as BukkakuProperty,
          platformId: msg.platformId as string,
          name: msg.name as string,
          room: msg.room as string,
        },
      };
    case "pipeline_complete":
      return { type: "pipeline_complete" };
    case "error":
      return { type: "error", message: msg.message as string };
    case "cancelled":
      return { type: "cancelled" };
    default:
      return null;
  }
}

export interface BukkakuStore {
  states: Record<string, BukkakuState>;
  getState: (conversationId: string) => BukkakuState;
  start: (conversationId: string, reinsIds: string[]) => void;
  cancel: (conversationId: string) => void;
  reset: (conversationId: string) => void;
}

export function useBukkakuStore(): BukkakuStore {
  const [states, setStates] = useState<Record<string, BukkakuState>>({});
  const wsRef = useRef<Record<string, WebSocket>>({});
  const doneRef = useRef<Record<string, boolean>>({});

  const dispatch = useCallback((conversationId: string, action: Action) => {
    setStates((prev) => ({
      ...prev,
      [conversationId]: reducer(prev[conversationId] ?? initialBukkakuState, action),
    }));
  }, []);

  const closeWs = useCallback((conversationId: string) => {
    const ws = wsRef.current[conversationId];
    if (!ws) return;
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    if (
      ws.readyState === WebSocket.OPEN ||
      ws.readyState === WebSocket.CONNECTING
    ) {
      ws.close();
    }
    delete wsRef.current[conversationId];
  }, []);

  const start = useCallback(
    (conversationId: string, reinsIds: string[]) => {
      closeWs(conversationId);
      doneRef.current[conversationId] = false;
      dispatch(conversationId, { type: "connect" });

      const ws = new WebSocket(WS_URL);
      wsRef.current[conversationId] = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "start_reins_bukaku", reinsIds }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const action = parseMessageToAction(msg);
          if (action) {
            dispatch(conversationId, action);
          }
          if (msg.type === "pipeline_complete") {
            doneRef.current[conversationId] = true;
            closeWs(conversationId);
          } else if (msg.type === "error") {
            doneRef.current[conversationId] = true;
            closeWs(conversationId);
          } else if (msg.type === "cancelled") {
            doneRef.current[conversationId] = true;
            closeWs(conversationId);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        if (!doneRef.current[conversationId]) {
          doneRef.current[conversationId] = true;
          dispatch(conversationId, {
            type: "error",
            message:
              "物確サーバーに接続できません。サーバーが起動しているか確認してください。",
          });
        }
      };

      ws.onclose = () => {
        if (!doneRef.current[conversationId]) {
          doneRef.current[conversationId] = true;
          dispatch(conversationId, {
            type: "error",
            message: "物確サーバーとの接続が切れました。",
          });
        }
      };
    },
    [closeWs, dispatch],
  );

  const cancel = useCallback((conversationId: string) => {
    const ws = wsRef.current[conversationId];
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "cancel_pipeline" }));
    }
  }, []);

  const reset = useCallback(
    (conversationId: string) => {
      closeWs(conversationId);
      setStates((prev) => {
        const next = { ...prev };
        delete next[conversationId];
        return next;
      });
    },
    [closeWs],
  );

  const getState = useCallback(
    (conversationId: string): BukkakuState =>
      states[conversationId] ?? initialBukkakuState,
    [states],
  );

  useEffect(() => {
    const connections = wsRef.current;
    return () => {
      for (const cid of Object.keys(connections)) {
        const ws = connections[cid];
        if (
          ws &&
          (ws.readyState === WebSocket.OPEN ||
            ws.readyState === WebSocket.CONNECTING)
        ) {
          ws.onopen = null;
          ws.onmessage = null;
          ws.onerror = null;
          ws.onclose = null;
          ws.close();
        }
      }
    };
  }, []);

  return { states, getState, start, cancel, reset };
}
