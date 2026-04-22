"use client";

import { useReducer, useRef, useCallback, useEffect } from "react";
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

const initialState: BukkakuState = {
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
      return { ...initialState, status: "connecting" };

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
      return initialState;

    default:
      return state;
  }
}

export function useBukkaku() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const wsRef = useRef<WebSocket | null>(null);
  const doneRef = useRef(false);

  const closeWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      if (
        wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING
      ) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
  }, []);

  const start = useCallback(
    (reinsIds: string[]) => {
      closeWs();
      doneRef.current = false;
      dispatch({ type: "connect" });

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "start_reins_bukaku", reinsIds }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case "pipeline_start":
              dispatch({ type: "pipeline_start", totalIds: msg.totalIds });
              break;
            case "reins_progress":
              dispatch({
                type: "reins_progress",
                current: msg.current,
                total: msg.total,
                reinsId: msg.reinsId,
              });
              break;
            case "property_fetched":
              dispatch({
                type: "property_fetched",
                property: {
                  property_name: msg.property_name,
                  room_number: msg.room_number,
                  management_company: msg.management_company,
                  address: msg.address,
                  rent: msg.rent,
                  reins_id: msg.reins_id,
                  maisoku_url: msg.maisoku_url,
                },
              });
              break;
            case "reins_error":
              dispatch({ type: "reins_error", reinsId: msg.reinsId });
              break;
            case "reins_complete":
              dispatch({ type: "reins_complete" });
              break;
            case "bukaku_progress":
              dispatch({
                type: "bukaku_progress",
                completed: msg.completed,
                total: msg.total,
                found: msg.found,
                remainingSeconds: msg.remainingSeconds,
              });
              break;
            case "bukaku_result":
              dispatch({
                type: "bukaku_result",
                result: {
                  property: msg.property,
                  found: msg.found,
                  hits: msg.hits || [],
                  results: msg.results || [],
                  platformId: msg.platformId || "",
                  strategy: msg.strategy || "",
                },
              });
              break;
            case "vacancy_found":
              dispatch({
                type: "vacancy_found",
                vacancy: {
                  property: msg.property,
                  platformId: msg.platformId,
                  name: msg.name,
                  room: msg.room,
                },
              });
              break;
            case "pipeline_complete":
              doneRef.current = true;
              dispatch({ type: "pipeline_complete" });
              closeWs();
              break;
            case "error":
              doneRef.current = true;
              dispatch({ type: "error", message: msg.message });
              closeWs();
              break;
            case "cancelled":
              doneRef.current = true;
              dispatch({ type: "cancelled" });
              closeWs();
              break;
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        if (!doneRef.current) {
          doneRef.current = true;
          dispatch({
            type: "error",
            message:
              "物確サーバーに接続できません。サーバーが起動しているか確認してください。",
          });
        }
      };

      ws.onclose = () => {
        if (!doneRef.current) {
          doneRef.current = true;
          dispatch({
            type: "error",
            message: "物確サーバーとの接続が切れました。",
          });
        }
      };
    },
    [closeWs]
  );

  const cancel = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "cancel_pipeline" }));
    }
  }, []);

  const reset = useCallback(() => {
    closeWs();
    dispatch({ type: "reset" });
  }, [closeWs]);

  useEffect(() => {
    return () => {
      closeWs();
    };
  }, [closeWs]);

  return { state, start, cancel, reset };
}
