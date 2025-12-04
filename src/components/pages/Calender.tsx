// ===================== Calender.tsx =====================
import React, { useMemo, useState, useEffect, useRef } from "react";
import Sidebar from "../CalenderComponents/SideBar";
import CalendarMainContent, {
  TimelineContract,
} from "../CalenderComponents/CalenderMainContent";

import {
  CalendarData as ContractData,
  ItemType as ContractItemType,
  CalendarItem as ContractCalendarItem,
} from "../CalenderComponents/ContractScheduler";

import TimeOffScheduler, {
  CalendarData as TimeOffData,
  ItemType as TimeOffItemType,
} from "../CalenderComponents/TimeOffScheduler";

import { auth, db } from "../../lib/firebase";
import {
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  collection,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import {
  addResourceToTimeoffCell,
  removeResourceFromTimeoffCell,
} from "../../services/timeoffschedular";
import { fetchAllContracts } from "../../services/fetchAllContracts";
import { parseContracts } from "../../utils/parsedContracts";
import { DateRange } from "react-day-picker";

/* ------------------------------------------------------------------ */
/* Firestore path helpers                                              */
/* ------------------------------------------------------------------ */
const resourceDoc = (
  uid: string,
  contractId: string,
  soId: string,
  resId: string
) =>
  doc(
    db,
    "companies",
    uid,
    "contracts",
    contractId,
    "so",
    soId,
    "resources",
    resId
  );

const machineEmployeeDoc = (
  uid: string,
  contractId: string,
  soId: string,
  machineId: string,
  employeeId: string
) =>
  doc(
    db,
    "companies",
    uid,
    "contracts",
    contractId,
    "so",
    soId,
    "resources",
    machineId,
    "resources",
    employeeId
  );

/* little util to split the old cellKey (`{soId}-{yyyy-mm-dd}`) */
const splitCellKey = (cellKey: string) => {
  const match = cellKey.match(/^(.+)-(\d{4}-\d{2}-\d{2})$/);
  if (!match) throw new Error(`Invalid cellKey: ${cellKey}`);
  return { soId: match[1], dateIso: match[2] };
};

type Category = "employee" | "machine";

/* ---------- Drag payload ---------- */
type DragPayload =
  | {
      /*  resources (person / machine / tool) – existing shape */
      name: string;
      type: "person" | "machine" | "tool";
      source: {
        zone: "sidebar" | "contract" | "timeoff";
        id: string;
        contractId?: string;
      };
      meta?: {
        childrenSnapshot?: ContractCalendarItem[];
        childOf?: string;
      };
    }
  | {
      /*  whole contract row dragged from SidebarContracts */
      contractId: string;
      title: string;
      soList: { id: string; soNumber?: string }[];
      source: { zone: "sidebar"; id: string };
    }
  | null;

/* keep for resize helpers further below */
const dayOrder = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/* ---------- NEW: scheduled contract rows ---------- */
type ScheduledContract = {
  id: string;
  title: string;
  soList: { id: string; soNumber: string }[];
  anchorDateKey: string; // ISO date string of the cell we dropped on
};

/* ---------- helper to assign / remove dates in resource docs ---------- */
const assignResourceToDate = async ({
  uid,
  contractId,
  soId,
  resourceName,
  resourceType,
  dateIso,
}: {
  uid: string;
  contractId: string;
  soId: string;
  resourceName: string;
  resourceType: string;
  dateIso: string;
}) => {
  const ref = resourceDoc(uid, contractId, soId, resourceName);
  await setDoc(
    ref,
    {
      name: resourceName,
      type: resourceType,
      assignedDates: arrayUnion(dateIso),
    },
    { merge: true }
  );
};

const removeResourceFromDate = async ({
  uid,
  contractId,
  soId,
  resourceName,
  dateIso,
}: {
  uid: string;
  contractId: string;
  soId: string;
  resourceName: string;
  dateIso: string;
}) => {
  const ref = resourceDoc(uid, contractId, soId, resourceName);

  // Remove the date from assignedDates
  await updateDoc(ref, {
    assignedDates: arrayRemove(dateIso),
  });

  // After removing, check if assignedDates is now empty
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    if (!data.assignedDates || data.assignedDates.length === 0) {
      // No more assignments left, remove the document
      await deleteDoc(ref);
    }
  }
};

const Calender: React.FC = () => {
  const DAYS_WINDOW = 2000; // large window to simulate infinite past/future

  const [activeDateRange, setActiveDateRange] = useState<
    DateRange | undefined
  >();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [resourceCounts, setResourceCounts] = useState<Record<string, number>>(
    {}
  );
  const [contractsUpdateTrigger, setContractsUpdateTrigger] = useState(0);

  React.useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      const raw = await fetchAllContracts();
      const parsed = parseContracts(raw); // ← NEW
      setResourceCounts(parsed.resourceMaxSimultaneous); // ← NEW
    } catch (err) {
      console.error(err);
    }
  };

  /* ---------- date helpers ---------- */
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const addDays = (d: Date, n: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };
  const getMonday = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0..6
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  };

  /* ---------- timeline ---------- */
  const [startOffsetDays, setStartOffsetDays] = useState(0);

  const timelineStart = useMemo(() => {
    const monday = getMonday(new Date());
    monday.setDate(monday.getDate() + startOffsetDays);
    return monday;
  }, [startOffsetDays]);

  const [resourceIndex, setResourceIndex] = useState<
    Record<
      string,
      { category: string; id: string; type: "employee" | "machine" }
    >
  >({});

  const toDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const normalizeDateValue = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === "string") {
      return value.slice(0, 10);
    }
    if (value instanceof Date) {
      return toDateKey(value);
    }
    if (
      typeof value === "object" &&
      value !== null &&
      typeof value.seconds === "number"
    ) {
      const millis =
        value.seconds * 1000 +
        (typeof value.nanoseconds === "number"
          ? value.nanoseconds / 1_000_000
          : 0);
      return toDateKey(new Date(millis));
    }
    return null;
  };

  const timelineDays = React.useMemo(() => {
    const today = startOfDay(new Date());
    const half = Math.floor(DAYS_WINDOW / 2);
    const first = addDays(today, startOffsetDays - half);
    return Array.from({ length: DAYS_WINDOW }, (_, i) => {
      const date = addDays(first, i);
      const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
      const d = date.getDate();
      const m = date.getMonth() + 1;
      return {
        key: toDateKey(date), // <--- FIXED! Always local
        day: `${weekday} ${d}.${m}.`,
        date,
        isToday: date.getTime() === today.getTime(),
      };
    });
  }, [startOffsetDays]);

  const formatRangeHeader = (start: Date) =>
    `${start.toLocaleString(undefined, {
      month: "long",
    })} ${start.getFullYear()}`;

  const [headerLabel, setHeaderLabel] = useState(() =>
    formatRangeHeader(timelineStart)
  );

  /* ---------- sidebar ---------- */
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [sidebarSearch, setSidebarSearch] = useState("");

  /* ---------- contract-scheduler state ---------- */
  const [contractData, setContractData] = useState<ContractData>({});
  const [contractsById, setContractsById] = useState<
    Record<string, TimelineContract>
  >({});
  const [soToContractMap, setSoToContractMap] = useState<
    Record<string, string>
  >({});
  const soToContractMapRef = useRef<Record<string, string>>({});
  const contractResourceUnsubsRef = useRef<Record<string, () => void>>({});
  const getContractIdForSo = (soId: string) =>
    soToContractMapRef.current[soId] ?? null;
  const [_scheduledContracts, setScheduledContracts] = useState<
    ScheduledContract[]
  >([]);
  const [activeContractId, setActiveContractId] = useState<string | null>(null);

  /* ------------------------------------------------------------------ */
  /* NEW: MAPPING CONTRACT RESOURCES TO DATES                           */
  /* Used to prevent Time Off drops on specific active days             */
  /* ------------------------------------------------------------------ */
 

  const contractUsageByDate = useMemo(() => {
    const usage: Record<string, Set<string>> = {};

    Object.keys(contractData).forEach((key) => {
      const match = key.match(/^(.+)-(\d{4}-\d{2}-\d{2})$/);
      if (match) {
        const dateIso = match[2];
        const items = contractData[key];
        items.forEach((item) => {
          if (!usage[item.name]) usage[item.name] = new Set();
          usage[item.name].add(dateIso);
        });
      }
    });
    return usage;
  }, [contractData]);

  const isResourceOnContractDate = (name: string, dateIso: string) => {
    return contractUsageByDate[name]?.has(dateIso) ?? false;
  };

  /* ---------- date range modal ---------- */
  type PendingTarget =
    | { kind: "contract-cell"; contractId: string; targetKey: string }
    | {
        kind: "contract-machine";
        contractId: string;
        targetKey: string;
        machineName: string;
      }
    | { kind: "contract-area"; contractId: string; anchorIso: string }
    | { kind: "timeoff-cell"; targetKey: string }
    | null;
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<PendingTarget>(null);
  const [rangeStart, setRangeStart] = useState<string>("");
  const [rangeEnd, setRangeEnd] = useState<string>("");
  const [rangeWithinWeek, setRangeWithinWeek] = useState<
    { startIdx: number; days: number } | undefined
  >(undefined);
  const [pendingDragged, setPendingDragged] = useState<DragPayload>(null);
  const [uid, setUid] = useState<string | null>(null);

  const timelineContracts = useMemo(
    () => Object.values(contractsById),
    [contractsById]
  );

  /* ---------- auth ---------- */
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) =>
      setUid(user?.uid ?? null)
    );
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    soToContractMapRef.current = soToContractMap;
  }, [soToContractMap]);

  useEffect(() => {
    if (!uid) return;

    const subscribeToContractResources = (contractId: string) => {
      let soResourceUnsubs: Record<string, () => void> = {};
      const soColRef = collection(
        db,
        "companies",
        uid,
        "contracts",
        contractId,
        "so"
      );

      const unsubSO = onSnapshot(soColRef, (soSnap) => {
        const soList = soSnap.docs.map((soDoc) => ({
          id: soDoc.id,
          soNumber: soDoc.get("soNumber") || soDoc.id,
        }));

        setContractsById((prev) => {
          const prevEntry = prev[contractId];
          const nextEntry: TimelineContract = {
            id: contractId,
            title: prevEntry?.title ?? "Contract",
            startDate: prevEntry?.startDate ?? null,
            endDate: prevEntry?.endDate ?? null,
            soList,
          };
          return { ...prev, [contractId]: nextEntry };
        });

        setSoToContractMap((prev) => {
          const next = { ...prev };
          Object.entries(next).forEach(([soId, cid]) => {
            if (cid === contractId && !soList.some((so) => so.id === soId)) {
              delete next[soId];
            }
          });
          soList.forEach(({ id }) => {
            next[id] = contractId;
          });
          soToContractMapRef.current = next;
          return next;
        });

        const currentSoIds = new Set(soList.map((so) => so.id));
        Object.keys(soResourceUnsubs).forEach((soId) => {
          if (!currentSoIds.has(soId)) {
            soResourceUnsubs[soId]?.();
            delete soResourceUnsubs[soId];
            setContractData((prev) => {
              const next = { ...prev };
              Object.keys(next).forEach((cellKey) => {
                if (cellKey.startsWith(`${soId}-`)) delete next[cellKey];
              });
              return next;
            });
          }
        });

        currentSoIds.forEach((soId) => {
          if (soResourceUnsubs[soId]) return;
          const resColRef = collection(
            db,
            "companies",
            uid,
            "contracts",
            contractId,
            "so",
            soId,
            "resources"
          );

          soResourceUnsubs[soId] = onSnapshot(resColRef, (resSnap) => {
            const tasks: Promise<{
              rd: any;
              machineChildren?: ContractCalendarItem[];
            }>[] = [];

            resSnap.forEach((resDoc) => {
              const rd = resDoc.data();
              if (rd.type === "machine") {
                tasks.push(
                  getDocs(
                    collection(
                      db,
                      "companies",
                      uid,
                      "contracts",
                      contractId,
                      "so",
                      soId,
                      "resources",
                      rd.name,
                      "resources"
                    )
                  ).then((machineResSnap) => {
                    const machineChildren: ContractCalendarItem[] = [];
                    machineResSnap.forEach((empDoc) => {
                      const emp = empDoc.data();
                      (emp.assignedDates || []).forEach((dateIso: string) => {
                        machineChildren.push({
                          name: emp.name,
                          type: emp.type,
                          color: contractColorFor(emp.type),
                          assignedDates: emp.assignedDates,
                          startDate: dateIso,
                          endDate: dateIso,
                        });
                      });
                    });
                    return { rd, machineChildren };
                  })
                );
              } else {
                tasks.push(Promise.resolve({ rd }));
              }
            });

            Promise.all(tasks).then((results) => {
              setContractData((prev) => {
                const next: ContractData = { ...prev };
                Object.keys(next).forEach((cellKey) => {
                  if (cellKey.startsWith(`${soId}-`)) delete next[cellKey];
                });

                results.forEach(({ rd, machineChildren }) => {
                  const dates: string[] =
                    rd.assignedDates || (rd.date ? [rd.date] : []);
                  dates.forEach((dateIso: string) => {
                    const cellKey = `${soId}-${dateIso}`;
                    const entry: ContractCalendarItem = {
                      name: rd.name,
                      type: rd.type,
                      color: contractColorFor(rd.type),
                      startDate: dateIso,
                      endDate: dateIso,
                      ...(machineChildren && { children: machineChildren }),
                    };
                    next[cellKey] = [...(next[cellKey] || []), entry];
                  });
                });
                return next;
              });
            });
          });
        });
      });

      return () => {
        unsubSO();
        Object.values(soResourceUnsubs).forEach((fn) => fn());
      };
    };

    const contractsColRef = collection(db, "companies", uid, "contracts");
    const unsubContracts = onSnapshot(contractsColRef, (contractsSnap) => {
      const seenIds = new Set<string>();
      const metaUpdates: Record<
        string,
        { title: string; start: string | null; end: string | null }
      > = {};

      contractsSnap.forEach((contractDoc) => {
        const data = contractDoc.data() as any;
        const contractId = contractDoc.id;
        seenIds.add(contractId);
        metaUpdates[contractId] = {
          title: data.name || data.title || "Contract",
          start: normalizeDateValue(data.startDate),
          end: normalizeDateValue(data.endDate),
        };
        if (!contractResourceUnsubsRef.current[contractId]) {
          contractResourceUnsubsRef.current[contractId] =
            subscribeToContractResources(contractId);
        }
      });

      setContractsById((prev) => {
        const next: Record<string, TimelineContract> = {};
        Object.entries(metaUpdates).forEach(([contractId, meta]) => {
          const prevEntry = prev[contractId];
          next[contractId] = {
            id: contractId,
            title: meta.title,
            startDate: meta.start,
            endDate: meta.end,
            soList: prevEntry?.soList ?? [],
          };
        });
        return next;
      });

      Object.keys(contractResourceUnsubsRef.current).forEach((contractId) => {
        if (!seenIds.has(contractId)) {
          contractResourceUnsubsRef.current[contractId]?.();
          delete contractResourceUnsubsRef.current[contractId];
        }
      });

      setContractsById((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((contractId) => {
          if (!seenIds.has(contractId)) {
            delete next[contractId];
          }
        });
        return next;
      });

      setSoToContractMap((prev) => {
        const next = { ...prev };
        Object.entries(next).forEach(([soId, contractId]) => {
          if (!seenIds.has(contractId)) {
            delete next[soId];
          }
        });
        soToContractMapRef.current = next;
        return next;
      });

      setContractData((prev) => {
        const next = { ...prev };
        Object.entries(next).forEach(([cellKey]) => {
          const { soId } = splitCellKey(cellKey);
          const contractId = soToContractMapRef.current[soId];
          if (contractId && !seenIds.has(contractId)) {
            delete next[cellKey];
          }
        });
        return next;
      });
    });

    return () => {
      unsubContracts();
      Object.values(contractResourceUnsubsRef.current).forEach((fn) => fn());
      contractResourceUnsubsRef.current = {};
    };
  }, [uid]);

  /* ---------- time-off logic (unchanged) ---------- */
  const initialTimeOffData: TimeOffData = useMemo(() => {
    const base: TimeOffData = {};
    timelineDays.forEach(({ key }) => {
      base[`vacation-${key}`] = [];
      base[`sick-${key}`] = [];
    });
    return base;
  }, [timelineDays]);

  const [timeOffData, setTimeOffData] =
    useState<TimeOffData>(initialTimeOffData);

  const onRemoveResource = (cellKey: string, item: { name: string }) => {
    setTimeOffData((prev) => {
      const next = { ...prev };
      next[cellKey] = (next[cellKey] || []).filter((i) => i.name !== item.name);
      return next;
    });
  };

  const allUnavailableResourceNames = useMemo(() => {
    const names: string[] = [];
    Object.entries(timeOffData).forEach(([key, items]) => {
      if (key.startsWith("vacation-") || key.startsWith("sick-")) {
        items.forEach((it) => {
          if (!names.includes(it.name)) names.push(it.name);
        });
      }
    });
    return names;
  }, [timeOffData]);

  useEffect(() => {
    setTimeOffData((prev) => {
      const next = { ...prev };
      timelineDays.forEach(({ key }) => {
        const vKey = `vacation-${key}`;
        const sKey = `sick-${key}`;
        if (!next[vKey]) next[vKey] = [];
        if (!next[sKey]) next[sKey] = [];
      });
      return next;
    });
  }, [timelineDays]);

  useEffect(() => {
    if (!uid) return;
    const colRef = collection(db, "companies", uid, "timeoff");
    const unsubscribe = onSnapshot(colRef, (snap) => {
      const next: TimeOffData = {};
      snap.forEach((d) => {
        next[d.id] = d.data().items || [];
      });
      setTimeOffData(next);
    });
    return () => unsubscribe();
  }, [uid]);

  /* ---------- drag-and-drop ---------- */
  const [dragged, setDragged] = useState<DragPayload>(null);

  const stripFromItems = (
    items: ContractCalendarItem[],
    name: string
  ): ContractCalendarItem[] =>
    items
      .filter((it) => it.name !== name)
      .map((it) =>
        it.type === "machine" && it.children?.length
          ? { ...it, children: stripFromItems(it.children, name) }
          : it
      );

  const contractColorFor = (t: ContractItemType) =>
    t === "person"
      ? "bg-blue-100 text-blue-800"
      : t === "tool"
      ? "bg-amber-50 text-amber-800"
      : "bg-green-100 text-green-800";

  const timeOffColorFor = (t: TimeOffItemType) =>
    t === "person"
      ? "bg-blue-100 text-blue-800 ring-1 ring-blue-200"
      : "bg-amber-50 text-amber-700 ring-1 ring-amber-200";

  /* ------------------------------------------------------------------ */
  /* Helpers to locate & delete a contiguous span                       */
  /* ------------------------------------------------------------------ */
  function getContiguousTimeOffDates(
    section: any,
    resourceName: string,
    anchorDateIso: any,
    days: any[],
    timeOffData: TimeOffData
  ) {
    const idx = days.findIndex((d) => d.key === anchorDateIso);
    if (idx === -1) return [];

    const present = (i: number) =>
      (timeOffData[`${section}-${days[i].key}`] || []).some(
        (item) => item.name === resourceName
      );

    let start = idx;
    let end = idx;
    while (start > 0 && present(start - 1)) start--;
    while (end < days.length - 1 && present(end + 1)) end++;
    return days.slice(start, end + 1).map((d) => d.key);
  }

  const collectContiguousDates = (
    soId: string,
    resourceName: string,
    resourceType: ContractItemType,
    anchorIso: string,
    days: { key: string }[],
    data: ContractData
  ): string[] => {
    const anchorIdx = days.findIndex((d) => d.key === anchorIso);
    if (anchorIdx === -1) return [anchorIso];

    const isOnDay = (idx: number) => {
      const cellKey = `${soId}-${days[idx].key}`;
      return (data[cellKey] || []).some(
        (it) => it.name === resourceName && it.type === resourceType
      );
    };

    const span: string[] = [anchorIso];
    for (let i = anchorIdx - 1; i >= 0 && isOnDay(i); i--) {
      span.unshift(days[i].key);
    }
    for (let i = anchorIdx + 1; i < days.length && isOnDay(i); i++) {
      span.push(days[i].key);
    }
    return span;
  };

  const removeResourceFromDateRange = async ({
    uid,
    contractId,
    soId,
    resourceName,
    dateIsos,
  }: {
    uid: string;
    contractId: string;
    soId: string;
    resourceName: string;
    dateIsos: string[];
  }) => {
    setContractData((prev) => {
      const next: ContractData = { ...prev };
      dateIsos.forEach((dIso) => {
        const k = `${soId}-${dIso}`;
        next[k] = (next[k] || []).filter((i) => i.name !== resourceName);
        if (!next[k].length) delete next[k];
      });
      return next;
    });

    const ref = resourceDoc(uid, contractId, soId, resourceName);
    await updateDoc(ref, { assignedDates: arrayRemove(...dateIsos) });

    const snap = await getDoc(ref);
    if (!snap.exists() || !(snap.data().assignedDates || []).length) {
      await deleteDoc(ref);
    }
  };

  const removeNestedEmployeeFromDateRange = async ({
    uid,
    contractId,
    soId,
    machineName,
    employeeName,
  }: {
    uid: string;
    contractId: string;
    soId: string;
    machineName: string;
    employeeName: string;
  }) => {
    const ref = doc(
      db,
      "companies",
      uid,
      "contracts",
      contractId,
      "so",
      soId,
      "resources",
      machineName,
      "resources",
      employeeName
    );
    try {
      await deleteDoc(ref);
    } catch (e) {
      console.error("Error deleting nested employee:", e);
    }
  };

  /* ---------- CENTRAL moveTo ---------- */
  const moveTo = async (target: {
    zone: "sidebar" | "contract" | "timeoff";
    id: string;
    contractId?: string;
    assignToMachine?: { machineName: string } | null;
  }) => {
    console.log("running");
    console.log("moveTo", target);

    if (!dragged) return;

    if ("contractId" in dragged && target.zone === "contract") {
      let anchorIso = timelineDays[0].key;
      if (target.id === "area") {
        anchorIso = timelineDays[0].key;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(target.id)) {
        anchorIso = target.id;
      } else {
        const m = target.id.match(
          /^(?:.+?)(?:-week(\d+))?-(mon|tue|wed|thu|fri|sat|sun)$/
        );
        if (m) {
          const weekIdx = m[1] ? parseInt(m[1], 10) : 0;
          const dayIdx = dayOrder.indexOf(m[2] as (typeof dayOrder)[number]);
          const globalIdx = weekIdx * 7 + dayIdx;
          if (timelineDays[globalIdx]) anchorIso = timelineDays[globalIdx].key;
        }
      }

      setScheduledContracts((prev) =>
        prev.some((c) => c.id === dragged.contractId)
          ? prev
          : [
              ...prev,
              {
                id: dragged.contractId,
                title: dragged.title,
                soList: dragged.soList.map((s) => ({
                  id: s.id,
                  soNumber: s.soNumber ?? "",
                })),
                anchorDateKey: anchorIso,
              },
            ]
      );

      const contractMeta = contractsById[dragged.contractId];
      const rangeStartIso = contractMeta?.startDate ?? anchorIso;
      const rangeEndIso = contractMeta?.endDate ?? anchorIso;

      const startDate = new Date(rangeStartIso);
      const endDate = new Date(rangeEndIso);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        startDate.setTime(new Date(anchorIso).getTime());
        endDate.setTime(startDate.getTime());
      }

      setContractData((prev) => {
        const next: ContractData = { ...prev };
        const sosToProcess =
          dragged.soList.length > 0
            ? dragged.soList
            : [
                {
                  id: `${dragged.contractId}__default`,
                  soNumber: dragged.title || "Contract",
                },
              ];

        sosToProcess.forEach((so) => {
          const currentDate = new Date(startDate);

          while (currentDate <= endDate) {
            const isoDate = toDateKey(currentDate);
            const cellKey = `${so.id}-${isoDate}`;
            if (!next[cellKey]) next[cellKey] = [];
            currentDate.setDate(currentDate.getDate() + 1);
          }
        });
        return next;
      });

      setContractsById((prev) => {
        const prevEntry = prev[dragged.contractId];
        const updated: TimelineContract = {
          id: dragged.contractId,
          title: dragged.title,
          startDate: prevEntry?.startDate ?? rangeStartIso,
          endDate: prevEntry?.endDate ?? rangeEndIso,
          soList: prevEntry?.soList?.length
            ? prevEntry.soList
            : dragged.soList.map((so) => ({
                id: so.id,
                soNumber: so.soNumber ?? "",
              })),
        };
        return { ...prev, [dragged.contractId]: updated };
      });

      setSoToContractMap((prev) => {
        const next = { ...prev };
        dragged.soList.forEach((so) => {
          next[so.id] = dragged.contractId;
        });
        soToContractMapRef.current = next;
        return next;
      });

      setActiveContractId(dragged.contractId);

      if (uid) {
        const calendarRef = doc(
          db,
          "companies",
          uid,
          "calendar",
          "activeContract"
        );
        setDoc(calendarRef, {
          contractId: dragged.contractId,
          contractTitle: dragged.title,
          startDate: contractMeta?.startDate ?? null,
          endDate: contractMeta?.endDate ?? null,
          updatedAt: new Date().toISOString(),
        }).catch((e) =>
          console.error(
            "[Calendar] active contract save failed (direct drop)",
            e
          )
        );
      }

      setDragged(null);
      return;
    }

    if (!dragged || !("name" in dragged)) return;
    const draggedItem = dragged;
    const itemToAdd: ContractCalendarItem = {
      name: draggedItem.name,
      type: draggedItem.type,
      color: contractColorFor(draggedItem.type),
      startDate: undefined,
      endDate: undefined,
    };

    /* remove from old location (state + firestore) */
    if (draggedItem.source.zone === "contract") {
      const { soId, dateIso } = splitCellKey(draggedItem.source.id);
      const sourceContractId =
        draggedItem.source.contractId ?? getContractIdForSo(soId);
      const span = collectContiguousDates(
        soId,
        draggedItem.name,
        draggedItem.type,
        dateIso,
        timelineDays,
        contractData
      );

      if (!uid || !sourceContractId) return;
      if (draggedItem.meta?.childOf) {
        await removeNestedEmployeeFromDateRange({
          uid,
          contractId: sourceContractId,
          soId,
          machineName: draggedItem.meta.childOf,
          employeeName: draggedItem.name,
        });
      } else {
        await removeResourceFromDateRange({
          uid,
          contractId: sourceContractId,
          soId,
          resourceName: draggedItem.name,
          dateIsos: span,
        });
      }

      setContractData((prev) => {
        const newState = { ...prev };
        if (draggedItem.meta?.childOf) {
          for (const cellKey in newState) {
            const day = newState[cellKey] as ContractCalendarItem[];
            const machineIdx = day.findIndex(
              (it) =>
                it.type === "machine" && it.name === draggedItem.meta!.childOf
            );
            if (machineIdx !== -1) {
              const machine = { ...day[machineIdx] } as ContractCalendarItem & {
                children?: ContractCalendarItem[];
              };
              const children = machine.children ? [...machine.children] : [];
              const newChildren = children.filter(
                (c) => c.name !== draggedItem.name
              );
              machine.children = newChildren;
              const nextDay = [...day];
              nextDay[machineIdx] = machine;
              newState[cellKey] = nextDay;
            }
          }
          return newState;
        } else {
          const next = { ...prev };
          next[draggedItem.source.id] = stripFromItems(
            next[draggedItem.source.id] || [],
            draggedItem.name
          );
          return next;
        }
      });
    }

    // Add to target zone
    if (target.zone === "contract") {
      const targetContractId = target.contractId;
      const { dateIso } = splitCellKey(target.id);

      const sections = ["vacation", "sick", "service"];
      const isUnavailable = sections.some((section) =>
        (timeOffData[`${section}-${dateIso}`] || []).some(
          (item) => item.name === draggedItem.name
        )
      );

      if (isUnavailable) {
        setModalResourceName(draggedItem.name);
        setShowUnavailableModal(true);
        setDragged(null);
        return;
      }

      if (target.assignToMachine) {
        attachToMachine(
          target.id,
          target.assignToMachine.machineName,
          itemToAdd
        );
        const { soId } = splitCellKey(target.id);
        const resolvedContractId = targetContractId ?? getContractIdForSo(soId);
        if (uid && resolvedContractId) {
          const next = { ...contractData };
          setContractData(next);
          attachToMachine(
            target.id,
            target.assignToMachine.machineName,
            itemToAdd
          );

          const machineRef = resourceDoc(
            uid,
            resolvedContractId,
            soId,
            target.assignToMachine!.machineName
          );

          try {
            await setDoc(machineRef, { type: "machine" }, { merge: true });
            const empRef = machineEmployeeDoc(
              uid,
              resolvedContractId,
              soId,
              target.assignToMachine!.machineName,
              draggedItem.name
            );
            await setDoc(
              empRef,
              { type: draggedItem.type, name: draggedItem.name },
              { merge: true }
            );
            if (draggedItem.source.zone === "contract") {
              const srcKey = draggedItem.source.id;
              const srcItems = next[srcKey] || [];
              const srcRef = doc(
                db,
                "companies",
                uid,
                "contracts",
                resolvedContractId,
                "schedule",
                srcKey
              );
              await setDoc(srcRef, { items: srcItems } as any, { merge: true });
            }
          } catch (error) {
            console.error("Error updating Firebase:", error);
          }
        }
        if (resolvedContractId) {
          setActiveContractId(resolvedContractId);
        }
      } else {
        /* NORMAL CELL */
        const { soId, dateIso } = splitCellKey(target.id);
        const resolvedContractId = targetContractId ?? getContractIdForSo(soId);
        if (!resolvedContractId) {
          console.warn("No contract mapping for", soId);
          setDragged(null);
          return;
        }
        setContractData((prev) => {
          const cur = prev[target.id] || [];
          if (
            cur.some(
              (it) => it.name === itemToAdd.name && it.type === itemToAdd.type
            )
          )
            return prev;
          return { ...prev, [target.id]: [...cur, itemToAdd] };
        });

        if (uid && resolvedContractId) {
          await assignResourceToDate({
            uid,
            contractId: resolvedContractId,
            soId,
            resourceName: draggedItem.name,
            resourceType: draggedItem.type,
            dateIso,
          });
          setContractsUpdateTrigger((p) => p + 1);
        }
        setActiveContractId(resolvedContractId);
      }
    }

    if (dragged.source.zone === "timeoff" && target.zone === "sidebar") {
      const match = dragged.source.id.match(
        /^(vacation|sick|service)-(\d{4}-\d{2}-\d{2})$/
      );
      if (!match) return;
      const [, section, dateIso] = match;

      const span = getContiguousTimeOffDates(
        section,
        dragged.name,
        dateIso,
        timelineDays,
        timeOffData
      );

      setTimeOffData((prev) => {
        const next = { ...prev };
        span.forEach((iso) => {
          const key = `${section}-${iso}`;
          next[key] = (next[key] || []).filter(
            (item) => item.name !== dragged.name
          );
          if (!next[key].length) delete next[key];
        });
        return next;
      });

      if (uid) {
        await Promise.all(
          span.map((iso) => {
            const key = `${section}-${iso}`;
            const resourceArray = timeOffData[key] || [];
            const toRemove = resourceArray.find(
              (item) => item.name === dragged.name && item.type === dragged.type
            );
            if (!toRemove) return Promise.resolve();
            return removeResourceFromTimeoffCell(
              db,
              uid,
              key,
              toRemove
            );
          })
        );
      }
      setDragged(null);
      return;
    } else if (target.zone === "timeoff") {
      const match = target.id.match(
        /^(vacation|sick|service)-(\d{4}-\d{2}-\d{2})$/
      );

      let correctStartDate = new Date();
      if (match) {
         // Correctly use local parser
         correctStartDate = parseLocalMidnight(match[2]);

      }

      const timeOffItem = {
        startDate: correctStartDate,
        name: draggedItem.name,
        type: draggedItem.type as TimeOffItemType,
        color: timeOffColorFor(draggedItem.type as TimeOffItemType),
      };

      setTimeOffData((prev) => {
        const cur = prev[target.id] || [];
        if (
          cur.some(
            (it) => it.name === timeOffItem.name && it.type === timeOffItem.type
          )
        ) {
          return prev;
        }
        return { ...prev, [target.id]: [...cur, timeOffItem] };
      });

      if (uid) {
        await addResourceToTimeoffCell(db, uid, target.id, timeOffItem);
      }
    }
    loadContracts();
    setDragged(null);
  };

  const handleAreaDrop = React.useCallback(
    (anchorIso: string) => {
      /* 1️⃣ contract rows → show range modal */
      if (dragged && "contractId" in dragged) {
        setPendingTarget({
          kind: "contract-area",
          contractId: dragged.contractId,
          anchorIso,
        });
        setPendingDragged(dragged);
        setShowRangeModal(true);
        return;
      }
      /* 2️⃣ everything else → immediate move */
      if (dragged && "name" in dragged) return;
      moveTo({ zone: "contract", id: anchorIso });
    },
    [dragged] // <- deps
  );

  const isDraggingContract = !!(dragged && "contractId" in dragged);

  /* ---------- helpers for attachToMachine (unchanged) ---------- */
  const attachToMachine = (
    cellKey: string,
    machineName: string,
    item: ContractCalendarItem
  ) => {
    setContractData((prev) => {
      const cur = prev[cellKey] || [];
      const next = cur.map((it) => {
        if (it.type === "machine" && it.name === machineName) {
          const children = it.children ? [...it.children] : [];
          if (!children.some((c) => c.name === item.name)) children.push(item);
          return { ...it, children } as ContractCalendarItem;
        }
        return it;
      });
      return { ...prev, [cellKey]: next };
    });
  };

  const handleResize = (
    contractId: string,
    soId: string,
    itemName: string,
    itemType: ContractItemType,
    edge: "left" | "right",
    dayDelta: number
  ) => {
    const contractMeta = contractsById[contractId];
    if (
      !contractMeta?.startDate ||
      !contractMeta?.endDate ||
      !timelineDays.length
    )
      return;
    if (dayDelta === 0) return;

    // Find all days this resource is scheduled for this SO
    const scheduledDays = timelineDays
      .map((day, idx) => ({
        ...day,
        idx,
        cellKey: `${soId}-${day.key}`,
        hasItem: (contractData[`${soId}-${day.key}`] || []).some(
          (i) => i.name === itemName && i.type === itemType
        ),
      }))
      .filter((d) => d.hasItem);

    if (!scheduledDays.length) return;

    let startIdx = scheduledDays[0].idx;
    let endIdx = scheduledDays[scheduledDays.length - 1].idx;

    if (edge === "left") {
      if (dayDelta > 0) {
        for (let i = 1; i <= dayDelta; i++) {
          const idx = startIdx - i;
          if (idx < 0) continue;
          const cellKey = `${soId}-${timelineDays[idx].key}`;
          setContractData((prev) => {
            const cur = prev[cellKey] || [];
            if (
              !cur.some((it) => it.name === itemName && it.type === itemType)
            ) {
              const updated = {
                ...prev,
                [cellKey]: [
                  ...cur,
                  {
                    name: itemName,
                    type: itemType,
                    color: contractColorFor(itemType),
                    startDate: timelineDays[idx].key,
                    endDate: timelineDays[idx].key,
                  },
                ],
              };
              if (uid) {
                assignResourceToDate({
                  uid,
                  contractId,
                  soId,
                  resourceName: itemName,
                  resourceType: itemType,
                  dateIso: timelineDays[idx].key,
                }).catch(() => {});
              }
              return updated;
            }
            return prev;
          });
        }
      }
      else if (dayDelta < 0) {
        for (let i = 0; i < Math.abs(dayDelta); i++) {
          const idx = startIdx + i;
          if (idx > endIdx) continue;
          const cellKey = `${soId}-${timelineDays[idx].key}`;
          setContractData((prev) => {
            const cur = prev[cellKey] || [];
            if (
              cur.some((it) => it.name === itemName && it.type === itemType)
            ) {
              const updated = {
                ...prev,
                [cellKey]: cur.filter(
                  (it) => !(it.name === itemName && it.type === itemType)
                ),
              };
              if (uid) {
                removeResourceFromDate({
                  uid,
                  contractId,
                  soId,
                  resourceName: itemName,
                  dateIso: timelineDays[idx].key,
                }).catch(() => {});
              }
              return updated;
            }
            return prev;
          });
        }
      }
    } else if (edge === "right") {
      if (dayDelta > 0) {
        for (let i = 1; i <= dayDelta; i++) {
          const idx = endIdx + i;
          if (idx >= timelineDays.length) continue;
          const cellKey = `${soId}-${timelineDays[idx].key}`;
          setContractData((prev) => {
            const cur = prev[cellKey] || [];
            if (
              !cur.some((it) => it.name === itemName && it.type === itemType)
            ) {
              const newItem: ContractCalendarItem = {
                name: itemName,
                type: itemType,
                startDate: undefined,
                endDate: undefined,
              };
              const updated = {
                ...prev,
                [cellKey]: [...cur, newItem],
              };
              if (uid) {
                assignResourceToDate({
                  uid,
                  contractId,
                  soId,
                  resourceName: itemName,
                  resourceType: itemType,
                  dateIso: timelineDays[idx].key,
                }).catch(() => {});
              }
              return updated;
            }
            return prev;
          });
        }
      }
      else if (dayDelta < 0) {
        for (let i = 0; i < Math.abs(dayDelta); i++) {
          const idx = endIdx - i;
          if (idx < startIdx) continue;
          const cellKey = `${soId}-${timelineDays[idx].key}`;
          setContractData((prev) => {
            const cur = prev[cellKey] || [];
            if (
              cur.some((it) => it.name === itemName && it.type === itemType)
            ) {
              const updated = {
                ...prev,
                [cellKey]: cur.filter(
                  (it) => !(it.name === itemName && it.type === itemType)
                ),
              };
              if (uid) {
                removeResourceFromDate({
                  uid,
                  contractId,
                  soId,
                  resourceName: itemName,
                  dateIso: timelineDays[idx].key,
                }).catch(() => {});
              }
              return updated;
            }
            return prev;
          });
        }
      }
    }
  };

  const handleTimeoffResize = (
    section: "vacation" | "sick" | "service",
    itemName: string,
    itemType: TimeOffItemType,
    edge: "left" | "right",
    dayDelta: number
  ) => {
    if (dayDelta === 0) return;

    const scheduledDays = timelineDays
      .map((day, idx) => ({
        ...day,
        idx,
        cellKey: `${section}-${day.key}`,
        hasItem: (timeOffData[`${section}-${day.key}`] || []).some(
          (i) => i.name === itemName && i.type === itemType
        ),
      }))
      .filter((d) => d.hasItem);

    if (!scheduledDays.length) return;

    let startIdx = scheduledDays[0].idx;
    let endIdx = scheduledDays[scheduledDays.length - 1].idx;

    if (edge === "left") {
      if (dayDelta > 0) {
        for (let i = 1; i <= dayDelta; i++) {
          const idx = startIdx - i;
          if (idx < 0) continue;
          const cellKey = `${section}-${timelineDays[idx].key}`;
          setTimeOffData((prev) => {
            const cur = prev[cellKey] || [];
            if (
              !cur.some((it) => it.name === itemName && it.type === itemType)
            ) {
              return {
                ...prev,
                [cellKey]: [
                  ...cur,
                  {
                    startDate: new Date(timelineDays[idx].key),
                    name: itemName,
                    type: itemType,
                  },
                ],
              };
            }
            return prev;
          });
          if (uid)
            addResourceToTimeoffCell(db, uid, cellKey, {
              startDate: new Date(timelineDays[idx].key),
              name: itemName,
              type: itemType,
            });
        }
      }
      else if (dayDelta < 0) {
        for (let i = 0; i < Math.abs(dayDelta); i++) {
          const idx = startIdx + i;
          if (idx > endIdx) continue;
          const cellKey = `${section}-${timelineDays[idx].key}`;
          setTimeOffData((prev) => {
            const cur = prev[cellKey] || [];
            if (
              cur.some((it) => it.name === itemName && it.type === itemType)
            ) {
              return {
                ...prev,
                [cellKey]: cur.filter(
                  (it) => !(it.name === itemName && it.type === itemType)
                ),
              };
            }
            return prev;
          });
          if (uid)
            removeResourceFromTimeoffCell(db, uid, cellKey, {
              name: itemName,
              type: itemType,
            });
        }
      }
    }
    else if (edge === "right") {
      if (dayDelta > 0) {
        for (let i = 1; i <= dayDelta; i++) {
          const idx = endIdx + i;
          if (idx >= timelineDays.length) continue;
          const cellKey = `${section}-${timelineDays[idx].key}`;
          setTimeOffData((prev) => {
            const cur = prev[cellKey] || [];
            if (
              !cur.some((it) => it.name === itemName && it.type === itemType)
            ) {
              return {
                ...prev,
                [cellKey]: [
                  ...cur,
                  {
                    startDate: new Date(timelineDays[idx].key),
                    name: itemName,
                    type: itemType,
                  },
                ],
              };
            }
            return prev;
          });
          if (uid)
            addResourceToTimeoffCell(db, uid, cellKey, {
              startDate: new Date(timelineDays[idx].key),
              name: itemName,
              type: itemType,
            });
        }
      }
      else if (dayDelta < 0) {
        for (let i = 0; i < Math.abs(dayDelta); i++) {
          const idx = endIdx - i;
          if (idx < startIdx) continue;
          const cellKey = `${section}-${timelineDays[idx].key}`;
          setTimeOffData((prev) => {
            const cur = prev[cellKey] || [];
            if (
              cur.some((it) => it.name === itemName && it.type === itemType)
            ) {
              return {
                ...prev,
                [cellKey]: cur.filter(
                  (it) => !(it.name === itemName && it.type === itemType)
                ),
              };
            }
            return prev;
          });
          if (uid)
            removeResourceFromTimeoffCell(db, uid, cellKey, {
              name: itemName,
              type: itemType,
            });
        }
      }
    }
  };

  /* ---------- MODAL (unchanged) ---------- */
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);
  const [modalResourceName, setModalResourceName] = useState<string | null>(
    null
  );

  /* ---------- sidebar drag start ---------- */
  const handleSidebarDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    name: string,
    category: Category,
    section: string
  ) => {
    const t: "person" | "machine" | "tool" =
      category === "employee"
        ? "person"
        : section === "tools"
        ? "tool"
        : "machine";

    setDragged({
      name,
      type: t,
      source: { zone: "sidebar", id: `${category}:${section}` },
    });
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", name);
      e.dataTransfer.setData("application/x-item-type", t);
    } catch {}
  };

  /* ---------- contract / time-off drag-starts ---------- */
  const onContractItemDragStart = (
    contractId: string,
    name: string,
    sourceKey: string,
    type: ContractItemType,
    meta?: { childrenSnapshot?: ContractCalendarItem[]; childOf?: string }
  ) =>
    setDragged({
      name,
      type,
      source: { zone: "contract", id: sourceKey, contractId },
      meta,
    });

  const onTimeOffItemDragStart = (
    name: string,
    sourceKey: string,
    type: TimeOffItemType
  ) => {
    setTimeout(() => {
      setDragged({ name, type, source: { zone: "timeoff", id: sourceKey } });
    }, 0);
  };

  /* ---------- drop helpers ---------- */
  const allowDrop = (e: React.DragEvent<HTMLElement>) => e.preventDefault();

  /* ---------- contract-grid drop TARGETS ---------- */

  // Make this async
  const onContractDrop = async (contractId: string, targetKey: string) => {
    setActiveContractId(contractId);

    if (dragged && "name" in dragged) {

      const dateMatch = targetKey.match(/\d{4}-\d{2}-\d{2}$/);
      const dateIso = dateMatch ? dateMatch[0] : null;

      if (dateIso) {
        const sections = ["vacation", "sick", "service"];
        const isUnavailable = sections.some((section) =>
          (timeOffData[`${section}-${dateIso}`] || []).some(
            (item) => item.name === dragged.name
          )
        );

        if (isUnavailable) {
          setModalResourceName(dragged.name);
          setShowUnavailableModal(true);
          setDragged(null);
          return; // Stop here, do not open Range Modal
        }
      }
      /* pre-fill the modal with the day we dropped on */
      const iso = targetKey.match(/\d{4}-\d{2}-\d{2}$/)?.[0] ?? "";
      setRangeStart(iso);
      setRangeEnd(iso);

      setPendingTarget({ kind: "contract-cell", contractId, targetKey });
      setPendingDragged(dragged);
      setShowRangeModal(true);
      return;
    }

    // Await moveTo so DB finishes BEFORE trigger updates
    await moveTo({ zone: "contract", id: targetKey, contractId });
    loadContracts();

    // Now trigger sidebar update
    setContractsUpdateTrigger((prev) => prev + 1);
  };

  // Make this async
  const onContractDropToMachine = async (
    contractId: string,
    targetKey: string,
    machineName: string
  ) => {
    setActiveContractId(contractId);
    if (dragged && "name" in dragged) {

      const dateMatch = targetKey.match(/\d{4}-\d{2}-\d{2}$/);
      const dateIso = dateMatch ? dateMatch[0] : null;

      if (dateIso) {
        const sections = ["vacation", "sick", "service"];
        const isUnavailable = sections.some((section) =>
          (timeOffData[`${section}-${dateIso}`] || []).some(
            (item) => item.name === dragged.name
          )
        );

        if (isUnavailable) {
          setModalResourceName(dragged.name);
          setShowUnavailableModal(true);
          setDragged(null);
          return; // Stop here
        }
      }

      const iso = targetKey.match(/\d{4}-\d{2}-\d{2}$/)?.[0] ?? "";
      setRangeStart(iso);
      setRangeEnd(iso);

      setPendingTarget({
        kind: "contract-machine",
        contractId,
        targetKey,
        machineName,
      });
      setPendingDragged(dragged);
      setShowRangeModal(true);
      return;
    }

    // Await moveTo here
    await moveTo({
      zone: "contract",
      id: targetKey,
      contractId,
      assignToMachine: { machineName },
    });

    setContractsUpdateTrigger((prev) => prev + 1);
  };

  // Make this async
  const onTimeOffDrop = async (targetKey: string) => {
    if (dragged && "name" in dragged) {
      const iso = targetKey.match(/\d{4}-\d{2}-\d{2}$/)?.[0] ?? "";
      console.log("targetKey", targetKey);
      console.log("Pre-filling range modal for time-off at", iso);
      setRangeStart(iso);
      setRangeEnd(iso);
      setPendingTarget({ kind: "timeoff-cell", targetKey });
      setPendingDragged(dragged);
      setShowRangeModal(true);
      return;
    }

    // Await moveTo here
    await moveTo({ zone: "timeoff", id: targetKey });

    setContractsUpdateTrigger((prev) => prev + 1);
  };

  /* ---------- sidebar drop targets ---------- */

  const onDropToEmployeeSection = async (section: string) => {
    await moveTo({ zone: "sidebar", id: `employee:${section}` });
    setContractsUpdateTrigger((prev) => prev + 1);
  };

  const onDropToMachineSection = async (section: string) => {
    await moveTo({ zone: "sidebar", id: `machine:${section}` });
    setContractsUpdateTrigger((prev) => prev + 1);
  };

  const toggleSection = (section: string) =>
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));

  // ---------- RANGE MODAL HANDLER ---------- //

  // Persist contract and calendar info to Firestore
  const persistContractRange = async (
    contractId: string,
    contractTitle: string,
    anchorIso: string,
    startISO: string,
    endISO: string
  ) => {
    if (!uid) return;
    try {
      const contractRef = doc(db, "companies", uid, "contracts", contractId);
      await setDoc(
        contractRef,
        {
          startDate: startISO,
          endDate: endISO,
          anchorDate: anchorIso,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      const calendarRef = doc(
        db,
        "companies",
        uid,
        "calendar",
        "activeContract"
      );
      await setDoc(calendarRef, {
        contractId,
        contractTitle,
        startDate: startISO,
        endDate: endISO,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Persist contract range failed", e);
    }
  };

  // Create empty cells for each SO for the given contract and date range (in memory and Firestore)
  const createContractCells = async (
    contractId: string,
    soList: { id: string; soNumber: string }[],
    start: Date,
    end: Date
  ) => {
    setContractData((prev) => {
      const next: ContractData = { ...prev };
      const sosToProcess =
        soList.length > 0
          ? soList
          : [
              {
                id: `${contractId}__default`,
                soNumber: "Contract",
              },
            ];
      sosToProcess.forEach((so) => {
        let currentDate = new Date(start);
        while (currentDate <= end) {
          const isoDate = toDateKey(currentDate);
          const cellKey = `${so.id}-${isoDate}`;
          // Only add a new cell if it doesn't already exist (don't overwrite)
          if (!(cellKey in next)) {
            next[cellKey] = [];
            // Also persist to Firestore only if creating a new cell
            if (uid) {
              const scheduleRef = doc(
                db,
                "companies",
                uid,
                "contracts",
                contractId,
                "schedule",
                cellKey
              );
              setDoc(scheduleRef, { items: [] }).catch(() => {});
            }
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });
      return next;
    });
  };

  /* ------------------------------------------------------------------ */
  /* FIXED: Loop over range using LOCAL dates to avoid UTC-midnight     */
  /*        off-by-one errors.                                          */
  /* ------------------------------------------------------------------ */
  const parseDateForIteration = (isoDate: string): Date => {
    const [y, m, d] = isoDate.split("-").map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  };

  // 2. STANDARD PARSER FOR DATA (Object Payload)
  // Initializes at 00:00 AM (Midnight) for the stored Data Object.
  const parseLocalMidnight = (isoDate: string): Date => {
    const [y, m, d] = isoDate.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0);
  };

   function getAllDateIsosInRange(startISO: string, endISO: string) {
     const arr = [];
     // Use the Noon parser for safe loop
     let current = parseDateForIteration(startISO);
     const end = parseDateForIteration(endISO);

     // Add safeguards to loop
     while (current <= end) {
       arr.push(toDateKey(current)); // toDateKey works fine with Noon dates
       current.setDate(current.getDate() + 1);
     }
     return arr;
   }

  const handleRangeApply = async () => {
    if (!rangeStart || !rangeEnd) return;

    // Use raw ISO strings
    const startISO = rangeStart;
    const endISO = rangeEnd;

    const start = parseLocalMidnight(startISO);
    const end = parseLocalMidnight(endISO);

    // Validate order
    if (startISO > endISO) return;

    // fmt(start) -> startISO basically

    const weekDays = timelineDays.filter(
      (d) => d.key >= startISO && d.key <= endISO
    );

    // Whole contract row drop with range
    if (
      pendingTarget?.kind === "contract-area" &&
      pendingDragged &&
      "contractId" in pendingDragged
    ) {
      const contractId = pendingTarget.contractId;
      setActiveContractId(contractId);
      setContractsById((prev) => {
        const prevEntry = prev[contractId];
        const soList = prevEntry?.soList?.length
          ? prevEntry.soList
          : pendingDragged.soList.map((so) => ({
              id: so.id,
              soNumber: so.soNumber || "Contract",
            }));
        return {
          ...prev,
          [contractId]: {
            id: contractId,
            title: prevEntry?.title ?? pendingDragged.title,
            startDate: startISO,
            endDate: endISO,
            soList,
          },
        };
      });

      setSoToContractMap((prev) => {
        const next = { ...prev };
        pendingDragged.soList.forEach((so) => {
          next[so.id] = contractId;
        });
        soToContractMapRef.current = next;
        return next;
      });

      // Persist range and contract info
      await persistContractRange(
        contractId,
        pendingDragged.title,
        pendingTarget.anchorIso,
        startISO,
        endISO
      );

      // Create empty cells in local state & Firestore
      await createContractCells(
        contractId,
        pendingDragged.soList.map((so) => ({
          id: so.id,
          soNumber: so.soNumber || "Contract",
        })),
        start,
        end
      );

      // Auto-scroll calendar to start date
      const startIdx = timelineDays.findIndex((d) => d.key === startISO);
      if (startIdx !== -1) {
        setStartOffsetDays(startIdx - Math.floor(timelineDays.length / 2));
      }
      setRangeWithinWeek(undefined);
    }
    // Bulk scheduling resources for date range in a row
    else if (
      pendingTarget?.kind === "contract-cell" &&
      pendingDragged &&
      "name" in pendingDragged
    ) {
      const base = pendingTarget.targetKey.match(/^(.*)-\d{4}-\d{2}-\d{2}$/);
      if (!base) return;
      const soId = base[1];
      const contractId = pendingTarget.contractId;
      if (!contractId) return;

      const item: ContractCalendarItem = {
        name: pendingDragged.name,
        type: pendingDragged.type,
        color: contractColorFor(pendingDragged.type),
        endDate: undefined,
        startDate: undefined,
      };

      setContractData((prev) => {
        const next: ContractData = { ...prev };
        weekDays.forEach(({ key }) => {
          if (key < startISO || key > endISO) return;
          const cellKey = `${soId}-${key}`;
          const current = next[cellKey] || [];
          if (!current.some((i) => i.name === item.name)) {
            next[cellKey] = [...current, item];
          }
        });
        return next;
      });

      // persist to Firestore
      if (uid) {
        const { soId } = splitCellKey(pendingTarget.targetKey);
        const resourceRef = resourceDoc(
          uid,
          contractId,
          soId,
          pendingDragged.name
        );

        const newDates = getAllDateIsosInRange(startISO, endISO);

        // 1. fetch current dates (if doc exists)
        let currentDates: string[] = [];
        const snap = await getDoc(resourceRef);
        if (snap.exists()) {
          currentDates = snap.data().assignedDates || [];
        }

        // 2. build the union (deduplicated)
        const union = Array.from(new Set([...currentDates, ...newDates]));

        // 3. write back **once**
        await setDoc(
          resourceRef,
          {
            type: pendingDragged.type,
            name: pendingDragged.name,
            colour: contractColorFor(pendingDragged.type),
            assignedDates: union,
          },
          { merge: true }
        );
        loadContracts();
      }
    } else if (
      pendingTarget?.kind === "contract-machine" &&
      pendingDragged &&
      "name" in pendingDragged
    ) {
      const { machineName, targetKey } = pendingTarget;
      const base = targetKey.match(/^(.*)-\d{4}-\d{2}-\d{2}$/);
      if (!base) return;
      const soId = base[1];
      const contractId = pendingTarget.contractId;
      if (!contractId) return;

      const item: ContractCalendarItem = {
        name: pendingDragged.name,
        type: pendingDragged.type,
        color: contractColorFor(pendingDragged.type),
        endDate: undefined,
        startDate: undefined,
      };

      timelineDays.forEach(({ key }) => {
        if (key < startISO || key > endISO) return;
        const cellKey = `${soId}-${key}`;

        /* update React state */
        attachToMachine(cellKey, machineName, item);
      });

      // Persist to Firestore: assign all dates in the range
      if (uid) {
        // 1. ensure machine doc exists
        const machineRef = resourceDoc(uid, contractId, soId, machineName);
        setDoc(
          machineRef,
          { type: "machine", name: machineName },
          { merge: true }
        ).catch(() => {});

        // 2. assign the employee to this machine for the date range
        const assignedDates = getAllDateIsosInRange(startISO, endISO);

        const empRef = machineEmployeeDoc(
          uid,
          contractId,
          soId,
          machineName,
          item.name
        );
        setDoc(
          empRef,
          {
            type: item.type,
            name: item.name,
            colour: contractColorFor(item.type),
            assignedDates,
          },
          { merge: true }
        ).catch(() => {});
        loadContracts();
      }
    } else if (
      pendingTarget?.kind === "timeoff-cell" &&
      pendingDragged &&
      "name" in pendingDragged
    ) {
      /* figure out section + build one item prototype */
      const m = pendingTarget.targetKey.match(
        /^(vacation|sick|service)-\d{4}-\d{2}-\d{2}$/
      );
      if (!m) return;
      const section = m[1] as "vacation" | "sick" | "service";

      const timeOffItem = {
        // FIX: Ensure Local Time Object creation
        startDate: parseLocalMidnight(startISO),
        name: pendingDragged.name,
        type: pendingDragged.type as TimeOffItemType,
        color: timeOffColorFor(pendingDragged.type as TimeOffItemType),
      };

      setTimeOffData((prev) => {
        const next = { ...prev };
        weekDays.forEach(({ key }) => {
          if (key < startISO || key > endISO) return;
          const cellKey = `${section}-${key}`;
          const cur = next[cellKey] || [];
          if (!cur.some((it) => it.name === timeOffItem.name)) {
            next[cellKey] = [...cur, timeOffItem];
          }
        });
        return next;
      });

      /* persist each day to Firestore */
      if (uid) {
        const allDates = getAllDateIsosInRange(startISO, endISO);
        await Promise.all(
          allDates.map((dateIso) =>
            addResourceToTimeoffCell(
              db,
              uid,
              `${section}-${dateIso}`,
              timeOffItem
            )
          )
        );
      }
    }

    setContractsUpdateTrigger((prev) => prev + 1);

    // Clean up modal and pending state
    setShowRangeModal(false);
    setPendingTarget(null);
    setPendingDragged(null);
    setRangeStart("");
    setRangeEnd("");
  };

  /* ---------- MAIN JSX ---------- */
  return (
    <div className="flex h-screen bg-gray-50">
      {/* ---------- SIDEBAR ---------- */}
      <Sidebar
        expandedSections={expandedSections}
        setExpandedSections={setExpandedSections}
        sidebarSearch={sidebarSearch}
        setSidebarSearch={setSidebarSearch}
        allowDrop={allowDrop}
        onDropToEmployeeSection={onDropToEmployeeSection}
        onDropToMachineSection={onDropToMachineSection}
        handleSidebarDragStart={handleSidebarDragStart}
        onContractDragStart={({ contractId, title, soList }) =>
          setDragged({
            contractId,
            title,
            soList,
            source: { zone: "sidebar", id: contractId },
          })
        }
        onContractDragEnd={() => setDragged(null)}
        toggleSection={toggleSection}
        onResourceIndexChange={setResourceIndex}
        dateRange={activeDateRange}
        setDateRange={setActiveDateRange}
        contractsUpdatedTrigger={contractsUpdateTrigger}
      />

      {/* ---------- MAIN CONTENT ---------- */}

      <CalendarMainContent
        timelineDays={timelineDays}
        scrollRef={scrollRef}
        headerLabel={headerLabel}
        setHeaderLabel={setHeaderLabel}
        setStartOffsetDays={setStartOffsetDays}
        setSidebarSearch={setSidebarSearch}
        contracts={timelineContracts}
        contractData={contractData}
        soToContractMap={soToContractMap}
        onContractItemDragStart={onContractItemDragStart}
        onContractDrop={onContractDrop}
        onContractDropToMachine={onContractDropToMachine}
        allUnavailableResourceNames={allUnavailableResourceNames}
        handleResize={handleResize}
        onAreaDrop={handleAreaDrop}
        isDraggingContract={isDraggingContract}
        activeContractId={activeContractId}
        rangeWithinWeek={rangeWithinWeek}
        resourceIndex={resourceIndex}
        resourceCounts={resourceCounts}
        // activeDateRange={activeDateRange}
        setActiveDateRange={setActiveDateRange}
      />

      {/* ---------- Time-off footer ---------- */}
      <TimeOffScheduler
        weekDays={timelineDays}
        data={timeOffData}
        scrollRef={scrollRef}
        onDragStart={onTimeOffItemDragStart}
        onDrop={onTimeOffDrop}
        uid={uid}
        onRemoveResource={onRemoveResource}
        onResize={handleTimeoffResize}
        checkContractConflict={isResourceOnContractDate}
      />

      {/* ---------- Unavailable modal ---------- */}
      {showUnavailableModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-lg px-8 py-6 min-w-[300px] max-w-xs flex flex-col items-center">
            <div className="text-gray-800 text-[15px] mb-4 font-medium text-center">
              {modalResourceName
                ? `"${modalResourceName}" is marked as unavailable (vacation or sick).`
                : "This resource is marked as unavailable (vacation or sick)."}
              <br />
              Please remove from unavailable resources before scheduling.
            </div>
            <button
              className="mt-2 px-5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-[14px]"
              onClick={() => setShowUnavailableModal(false)}
              autoFocus
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* ---------- Date range modal ---------- */}
      {showRangeModal && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-lg px-6 py-5 min-w-[320px] max-w-sm">
            <div className="text-gray-800 text-[15px] mb-3 font-semibold text-center">
              Select start and end dates
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-sm text-gray-700">Start date</label>
              <input
                type="date"
                className="px-2 py-1.5 border border-gray-300 rounded-md"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
              />
              <label className="text-sm text-gray-700">End date</label>
              <input
                type="date"
                className="px-2 py-1.5 border border-gray-300 rounded-md"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="px-4 py-1.5 rounded-md bg-gray-100 text-gray-700"
                onClick={() => {
                  setShowRangeModal(false);
                  setPendingTarget(null);
                  setRangeStart("");
                  setRangeEnd("");
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-1.5 rounded-md bg-blue-600 text-white"
                onClick={handleRangeApply}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calender;