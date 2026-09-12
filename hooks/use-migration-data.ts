"use client";

import { useEffect, useState } from "react";
import type { MigrationData } from "@/lib/types";

interface DataState {
  data: MigrationData | null;
  error: boolean;
}

/** Loads the single dataset written by scripts/build-data.mjs. */
export function useMigrationData(): DataState {
  const [state, setState] = useState<DataState>({ data: null, error: false });

  useEffect(() => {
    let cancelled = false;
    fetch("data/migration.json")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<MigrationData>;
      })
      .then((data) => {
        if (!cancelled) setState({ data, error: false });
      })
      .catch(() => {
        if (!cancelled) setState({ data: null, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
