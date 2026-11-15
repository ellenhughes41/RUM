import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import dayjs, { Dayjs } from "dayjs";

export interface FilterState {
  dateRange: [Dayjs, Dayjs];
  search: string;
  statuses: string[];
  priorities: string[];
  clients: string[];
  claimStates: string[];
  quickFilters: string[]; // "under2h" | "overdue" | "decidedThisPeriod"
}

const DATE_FMT = "YYYY-MM-DD";

export function getDefaultFilters(): FilterState {
  const end = dayjs().endOf("day");
  const start = end.subtract(3, "month").startOf("day");
  return {
    dateRange: [start, end],
    search: "",
    statuses: [],
    priorities: [],
    clients: [],
    claimStates: [],
    quickFilters: [],
  };
}

function parseList(v: string | null): string[] {
  if (!v) return [];
  return v.split(",").filter(Boolean);
}

export function useFilterState() {
  const [params, setParams] = useSearchParams();
  const defaults = useMemo(getDefaultFilters, []);

  const filters: FilterState = useMemo(() => {
    const from = params.get("from");
    const to = params.get("to");
    return {
      dateRange: [
        from ? dayjs(from) : defaults.dateRange[0],
        to ? dayjs(to) : defaults.dateRange[1],
      ],
      search: params.get("q") ?? "",
      statuses: parseList(params.get("statuses")),
      priorities: parseList(params.get("priorities")),
      clients: parseList(params.get("clients")),
      claimStates: parseList(params.get("claimStates")),
      quickFilters: parseList(params.get("quick")),
    };
  }, [params, defaults]);

  const update = useCallback(
    (patch: Partial<FilterState>) => {
      const next = new URLSearchParams(params);
      const apply = (key: string, value: string | undefined) => {
        if (!value) next.delete(key);
        else next.set(key, value);
      };
      const merged: FilterState = { ...filters, ...patch };
      apply("from", merged.dateRange[0].format(DATE_FMT));
      apply("to", merged.dateRange[1].format(DATE_FMT));
      apply("q", merged.search || undefined);
      apply("statuses", merged.statuses.length ? merged.statuses.join(",") : undefined);
      apply("priorities", merged.priorities.length ? merged.priorities.join(",") : undefined);
      apply("clients", merged.clients.length ? merged.clients.join(",") : undefined);
      apply("claimStates", merged.claimStates.length ? merged.claimStates.join(",") : undefined);
      apply("quick", merged.quickFilters.length ? merged.quickFilters.join(",") : undefined);
      setParams(next, { replace: true });
    },
    [params, setParams, filters]
  );

  const reset = useCallback(() => {
    setParams(new URLSearchParams(), { replace: true });
  }, [setParams]);

  return { filters, update, reset, defaults };
}
