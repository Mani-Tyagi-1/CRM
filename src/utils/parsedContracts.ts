/* utils/parseContracts.ts -------------------------------------------------- */
import {
  CalendarData,
  CalendarItem,
  ItemType,
} from "../components/CalenderComponents/ContractScheduler";

import { TimelineContract } from "../components/CalenderComponents/CalenderMainContent";

type ResourceAssignment = {
  resourceId: string; // "Employee test"
  resourceName: string; // "Employee test"
  type: string; // "person" or "machine"
  assignedDates: string[]; // ["2025-11-06", ...]  (ISO date)
  soIds: string[]; // All SO ids this resource is assigned on those dates
  contractIds: string[]; // All contract ids
};


export type Parsed = {
  contracts: TimelineContract[];
  contractData: CalendarData;
  soToContractMap: Record<string, string>;
  resourceSOCountByDate: Record<string, Record<string, number>>;
};

const pushItem = (
  store: CalendarData,
  key: string,
  base: Partial<CalendarItem>
) => {
  if (!store[key]) store[key] = [];
  store[key]!.push(base as CalendarItem);
};

/** Turn the raw Firestore contracts array into the three state slices that
 *  CalendarMainContent already expects + a fourth one: the global
 *  `resourceSOCountByDate` map.
 */
export const parseContracts = (raw: any[]): Parsed => {
  const contracts: TimelineContract[] = [];
  const contractData: CalendarData = {};
  const soToContractMap: Record<string, string> = {};
  const resourceSOSetByDate: Record<string, Record<string, Set<string>>> = {};

  const iso = (d: any) =>
    typeof d === "string"
      ? d
      : new Date(d.seconds * 1_000).toISOString().slice(0, 10);

  raw.forEach((c) => {
    /* --- 1 a.  high-level contract timeline slice ----------------------- */
    contracts.push({
      id: c.id,
      title: c.name,
      startDate: c.startDate ? iso(c.startDate) : null,
      endDate: c.endDate ? iso(c.endDate) : null,
      soList: c.so.map((s: any) => ({ id: s.id, soNumber: s.soNumber ?? "" })),
    });

    /* --- 1 b.  SO-level data & global resource-count bookkeeping --------- */
    c.so.forEach((so: any) => {
      soToContractMap[so.id] = c.id;

      const register = (res: any, dateISO: string, parentMachine?: string) => {
        /* A. feed ContractScheduler */
        pushItem(contractData, `${so.id}-${dateISO}`, {
          startDate: dateISO,
          endDate: dateISO,
          name: res.name,
          type: res.type as ItemType,
          color: res.colour,
          ...(parentMachine ? { __parent: parentMachine } : {}),
        });

        /* B. collect <date►resource►SO-IDs>  */
        resourceSOSetByDate[dateISO] ||= {};
        resourceSOSetByDate[dateISO][res.name] ||= new Set<string>();
        resourceSOSetByDate[dateISO][res.name].add(so.id);
      };

      const walk = (resArr: any[], parent?: string) =>
        resArr.forEach((r) => {
          (r.assignedDates ?? []).forEach((d: string) =>
            register(r, d, parent)
          );
          if (r.nestedResources?.length)
            walk(r.nestedResources, r.type === "machine" ? r.name : parent);
        });

      walk(so.resources);
    });
  });

  /* --- 1 c.  collapse the sets (SO IDs) ← into → numbers --------------- */
  const resourceSOCountByDate: Record<string, Record<string, number>> = {};
  Object.entries(resourceSOSetByDate).forEach(([date, resObj]) => {
    resourceSOCountByDate[date] = {};
    Object.entries(resObj).forEach(
      ([resName, soSet]) => (resourceSOCountByDate[date][resName] = soSet.size)
    );
  });

  return { contracts, contractData, soToContractMap, resourceSOCountByDate };
};

export function collectResourceAssignments(
  contractsRaw: any[]
): ResourceAssignment[] {
  type Tmp = Omit<
    ResourceAssignment,
    "assignedDates" | "soIds" | "contractIds"
  > & {
    assignedDates: Set<string>;
    soIds: Set<string>;
    contractIds: Set<string>;
  };

  const map = new Map<string, Tmp>();

  contractsRaw.forEach((contract) => {
    const contractId = contract.id;
    contract.so.forEach((so: any) => {
      const soId = so.id;
      function walk(resources: any[]) {
        resources.forEach((res: any) => {
          const id = res.id;
          if (!id) return;
          // Set up entry if not yet present
          if (!map.has(id)) {
            map.set(id, {
              resourceId: id,
              resourceName: res.name,
              type: res.type,
              assignedDates: new Set<string>(),
              soIds: new Set<string>(),
              contractIds: new Set<string>(),
            });
          }
          const entry = map.get(id)!;
          (res.assignedDates ?? []).forEach((date: any) => {
            // Normalize date string to ISO (YYYY-MM-DD)
            const isoDate =
              typeof date === "string"
                ? date.slice(0, 10)
                : typeof date === "object" && date?.seconds
                ? new Date(date.seconds * 1000).toISOString().slice(0, 10)
                : "";
            if (isoDate) entry.assignedDates.add(isoDate);
          });
          entry.soIds.add(soId);
          entry.contractIds.add(contractId);

          // Dive into nestedResources
          if (res.nestedResources?.length) walk(res.nestedResources);
        });
      }
      walk(so.resources);
    });
  });

  // Flatten the map to array, turn Sets into arrays
  return Array.from(map.values()).map((e) => ({
    ...e,
    assignedDates: Array.from(e.assignedDates),
    soIds: Array.from(e.soIds),
    contractIds: Array.from(e.contractIds),
  }));
}

