/* utils/parseContracts.ts -------------------------------------------------- */
import {
  CalendarData,
  CalendarItem,
  ItemType,
} from "../components/CalenderComponents/ContractScheduler";

import { TimelineContract } from "../components/CalenderComponents/CalenderMainContent";
import { fetchAllContracts } from "../services/fetchAllContracts";

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
  resourceMaxSimultaneous: Record<string, number>;
};

const pushItem = (
  store: CalendarData,
  key: string,
  base: Partial<CalendarItem>
) => {
  if (!store[key]) store[key] = [];
  store[key]!.push(base as CalendarItem);
};

/* --- HELPER: Split a list of dates into contiguous blocks --- */
// e.g. ["2025-11-05", "2025-11-08"] -> [{start: "05", end:"05"}, {start:"08", end:"08"}]
// e.g. ["2025-11-03", "2025-11-04", "2025-11-05"] -> [{start: "03", end:"05"}]
const getContiguousRanges = (dates: string[]) => {
  if (!dates.length) return [];
  
  // Sort temporally
  const sorted = [...dates].sort();
  const ranges: { startDate: string; endDate: string }[] = [];

  let rangeStart = sorted[0];
  let prevDate = new Date(sorted[0]);

  for (let i = 1; i < sorted.length; i++) {
    const currString = sorted[i];
    const currDate = new Date(currString);

    // Calc difference in days. 
    // We treat > 1.1 days as a gap (handles slight DST shifts safely)
    const diffTime = currDate.getTime() - prevDate.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);

    if (diffDays > 1.1) {
      // Gap detected. Push previous range and start new.
      ranges.push({ startDate: rangeStart, endDate: sorted[i - 1] });
      rangeStart = currString;
    }
    
    prevDate = currDate;
  }

  // Push the final range
  ranges.push({ startDate: rangeStart, endDate: sorted[sorted.length - 1] });
  return ranges;
};


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
    /* --- 1 a.  high-level contract timeline slice --- */
    contracts.push({
      id: c.id,
      title: c.name,
      startDate: c.startDate ? iso(c.startDate) : null,
      endDate: c.endDate ? iso(c.endDate) : null,
      soList: c.so.map((s: any) => ({ id: s.id, soNumber: s.soNumber ?? "" })),
    });

    /* --- 1 b.  SO-level data & global resource-count bookkeeping --- */
    c.so.forEach((so: any) => {
      soToContractMap[so.id] = c.id;

      const register = (res: any, dateISO: string, parentMachine?: string) => {
        /* A. feed ContractScheduler (Calendar Items) */
        pushItem(contractData, `${so.id}-${dateISO}`, {
          startDate: dateISO,
          endDate: dateISO,
          name: res.name,
          type: res.type as ItemType,
          color: res.colour,
          ...(parentMachine ? { __parent: parentMachine } : {}),
        });

        /* B. collect <date -> resource -> SO-IDs> */
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

  /* --- 1 c.  collapse the sets (SO IDs) into numbers --- */
  const resourceSOCountByDate: Record<string, Record<string, number>> = {};
  Object.entries(resourceSOSetByDate).forEach(([date, resObj]) => {
    resourceSOCountByDate[date] = {};
    Object.entries(resObj).forEach(
      ([resName, soSet]) => (resourceSOCountByDate[date][resName] = soSet.size)
    );
  });

  /* --- 1 d. REAL CHIP ASSIGNMENT COLLECTION --- */

  type ChipAssignment = {
    soId: string;
    resourceName: string;
    startDate: string;
    endDate: string;
  };

  const chipAssignments: ChipAssignment[] = [];

  function collectChips(resArr: any[], soId: string) {
    resArr.forEach((res: any) => {
      // 1. Separate separate stored assignments for the resource
      if (res.assignedDates && res.assignedDates.length > 0) {
        
        // **NEW LOGIC HERE**: Group only contiguous dates together
        const contiguousRanges = getContiguousRanges(res.assignedDates);

        contiguousRanges.forEach(range => {
           chipAssignments.push({
             soId,
             resourceName: res.name,
             startDate: range.startDate,
             endDate: range.endDate,
           });
        });
      }

      // 2. Recurse for nested
      if (res.nestedResources?.length) {
        collectChips(res.nestedResources, soId);
      }
    });
  }

  // Populate chipAssignments from raw data
  raw.forEach((contract) =>
    contract.so.forEach((so: { resources: any[]; id: string }) =>
      collectChips(so.resources, so.id)
    )
  );

  /* --- 1 e. Calculate Overlaps --- */
  const resourceMaxSimultaneous: Record<string, number> = {};

  chipAssignments.forEach((assign) => {
    // Grab every assignment of *the same resource* globally
    const sameResourceGlobal = chipAssignments.filter(
      (a) => a.resourceName === assign.resourceName
    );

    const overlapCount = sameResourceGlobal.filter(
      (other) => 
        other.startDate <= assign.endDate && 
        other.endDate >= assign.startDate
    ).length;

    const uniqueKey = `${assign.soId}-${assign.resourceName}-${assign.startDate}-${assign.endDate}`;
    
    resourceMaxSimultaneous[uniqueKey] = overlapCount;
  });

  return {
    contracts,
    contractData,
    soToContractMap,
    resourceSOCountByDate,
    resourceMaxSimultaneous,
  };
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

export const getActiveResources = async (): Promise<string[]> => {
  const contracts = await fetchAllContracts();

  const activeResources: Set<string> = new Set();

  // Extract resource names from each contract and their SOs
  contracts.forEach((contract) => {
    contract.so.forEach((so) => {
      so.resources.forEach((resource) => {
        activeResources.add(resource.name);
        // Include nested resources
        resource.nestedResources.forEach((nestedResource) => {
          activeResources.add(nestedResource.name);
        });
      });
    });
  });

  return Array.from(activeResources);
};


// utils/resourceAvailability.ts



export function getResourceAvailability(
  assignedDates: string[],
  range: { from: Date; to: Date }
): { percentage: number; freeDays: number; totalDays: number } {
  // Build all dates in the range as local YYYY-MM-DD
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // console.log("CHECK availability", { assignedDates, range });

  const dayMs = 24 * 60 * 60 * 1000;
  const allRangeDays: string[] = [];
  let cur = new Date(range.from);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(range.to);
  end.setHours(0, 0, 0, 0);
  while (cur <= end) {
    allRangeDays.push(formatLocalDate(cur)); // LOCAL DATE!
    cur = new Date(cur.getTime() + dayMs);
  }

  // Count days in range NOT present in assignedDates
  const assignedSet = new Set(assignedDates); // For O(1) lookup
  const freeDays = allRangeDays.filter(
    (dateStr) => !assignedSet.has(dateStr)
  ).length;
  const totalDays = allRangeDays.length;
  const percentage =
    totalDays > 0 ? Math.round((freeDays / totalDays) * 100) : 0;

  // console.log("Range days", allRangeDays);
  // console.log("Assigned set", assignedSet);

  return { percentage, freeDays, totalDays };
}

