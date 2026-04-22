'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SalesAgent } from './types';

const AGENTS_KEY = 'fango.agents.v1';
const ASSIGNMENT_KEY = 'fango.agent-assignment.v1';

const SEED_AGENTS: SalesAgent[] = [
  { id: 'a1', name: '大木' },
  { id: 'a2', name: '後藤' },
  { id: 'a3', name: '本多' },
];

function readAgents(): SalesAgent[] {
  if (typeof window === 'undefined') return SEED_AGENTS;
  try {
    const raw = window.localStorage.getItem(AGENTS_KEY);
    if (!raw) return SEED_AGENTS;
    const parsed = JSON.parse(raw) as SalesAgent[];
    if (!Array.isArray(parsed) || parsed.length === 0) return SEED_AGENTS;
    return parsed.filter((a) => a && typeof a.id === 'string' && typeof a.name === 'string');
  } catch {
    return SEED_AGENTS;
  }
}

function writeAgents(agents: SalesAgent[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AGENTS_KEY, JSON.stringify(agents));
  } catch {
    /* quota / privacy mode — silent */
  }
}

function readAssignments(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(ASSIGNMENT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAssignments(map: Record<string, string>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ASSIGNMENT_KEY, JSON.stringify(map));
  } catch {
    /* silent */
  }
}

function randomId() {
  return `a_${Math.random().toString(36).slice(2, 9)}`;
}

export function useAgents() {
  const [agents, setAgentsState] = useState<SalesAgent[]>(SEED_AGENTS);
  const [assignments, setAssignmentsState] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Intentional: hydrate from localStorage after mount to avoid SSR mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAgentsState(readAgents());
    setAssignmentsState(readAssignments());
    setHydrated(true);
  }, []);

  const persistAgents = useCallback((next: SalesAgent[]) => {
    setAgentsState(next);
    writeAgents(next);
  }, []);

  const persistAssignments = useCallback((next: Record<string, string>) => {
    setAssignmentsState(next);
    writeAssignments(next);
  }, []);

  const addAgent = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      persistAgents([...agents, { id: randomId(), name: trimmed }]);
    },
    [agents, persistAgents],
  );

  const removeAgent = useCallback(
    (id: string) => {
      persistAgents(agents.filter((a) => a.id !== id));
      const nextAssign = { ...assignments };
      let changed = false;
      for (const k of Object.keys(nextAssign)) {
        if (nextAssign[k] === id) {
          delete nextAssign[k];
          changed = true;
        }
      }
      if (changed) persistAssignments(nextAssign);
    },
    [agents, assignments, persistAgents, persistAssignments],
  );

  const renameAgent = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      persistAgents(agents.map((a) => (a.id === id ? { ...a, name: trimmed } : a)));
    },
    [agents, persistAgents],
  );

  const reorderAgents = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      if (fromIndex < 0 || fromIndex >= agents.length) return;
      if (toIndex < 0 || toIndex >= agents.length) return;
      const next = [...agents];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      persistAgents(next);
    },
    [agents, persistAgents],
  );

  const assignAgent = useCallback(
    (conversationId: string, agentId: string | null) => {
      const next = { ...assignments };
      if (agentId) next[conversationId] = agentId;
      else delete next[conversationId];
      persistAssignments(next);
    },
    [assignments, persistAssignments],
  );

  const defaultAgentId = agents[0]?.id ?? null;

  const getAssignedAgentId = useCallback(
    (conversationId: string): string | null => {
      const assigned = assignments[conversationId];
      if (assigned && agents.some((a) => a.id === assigned)) return assigned;
      return defaultAgentId;
    },
    [agents, assignments, defaultAgentId],
  );

  return {
    agents,
    assignments,
    hydrated,
    addAgent,
    removeAgent,
    renameAgent,
    reorderAgents,
    assignAgent,
    getAssignedAgentId,
    defaultAgentId,
  };
}
