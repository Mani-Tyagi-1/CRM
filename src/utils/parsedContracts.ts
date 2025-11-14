/* utils/parseContracts.ts -------------------------------------------------- */
import {
  CalendarData,
  CalendarItem,
  ItemType,
} from "../components/CalenderComponents/ContractScheduler";

import { TimelineContract } from "../components/CalenderComponents/CalenderMainContent";

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
