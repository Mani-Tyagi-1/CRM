// ===================== Calender.tsx =====================
import React, { useMemo, useState, useEffect } from "react";
import { Plus } from "lucide-react";
import Sidebar from "../CalenderComponents/SideBar";
import CalendarMainContent from "../CalenderComponents/CalenderMainContent";

import {
  CalendarData as ContractData,
  ItemType as ContractItemType,
  CalendarItem as ContractCalendarItem,
} from "../CalenderComponents/ContractScheduler";

import TimeOffScheduler, {
  CalendarData as TimeOffData,
  ItemType as TimeOffItemType,
} from "../CalenderComponents/TimeOffScheduler";

import { useLocation, useNavigate } from "react-router-dom";
import { auth, db } from "../../lib/firebase";
import {
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  getDocs,
  collection,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
} from "firebase/firestore";
import {
  addResourceToTimeoffCell,
  removeResourceFromTimeoffCell,
} from "../../services/timeoffschedular";

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
      source: { zone: "sidebar" | "contract" | "timeoff"; id: string };
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
  const location = useLocation();
  const navigate = useNavigate();

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
        key: date.toISOString().slice(0, 10), // ISO date string
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
  const [_scheduledContracts, setScheduledContracts] = useState<
    ScheduledContract[]
  >([]);
  const [activeContractId, setActiveContractId] = useState<string | null>(null);
  const [activeContractTitle, setActiveContractTitle] = useState<string | null>(
    null
  );

  /* ---------- date range modal ---------- */
  type PendingTarget =
    | { kind: "contract-cell"; targetKey: string }
    | { kind: "contract-machine"; targetKey: string; machineName: string }
    | { kind: "contract-area"; anchorIso: string }
    | null;
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<PendingTarget>(null);
  const [rangeStart, setRangeStart] = useState<string>("");
  const [rangeEnd, setRangeEnd] = useState<string>("");
  const [rangeDisplayText, setRangeDisplayText] = useState<string>("");
  const [rangeWithinWeek, setRangeWithinWeek] = useState<
    { startIdx: number; days: number } | undefined
  >(undefined);
  const [pendingDragged, setPendingDragged] = useState<DragPayload>(null);
  const [scheduledStartISO, setScheduledStartISO] = useState<string | null>(
    null
  );
  const [scheduledEndISO, setScheduledEndISO] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  /* ---------- auth ---------- */
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) =>
      setUid(user?.uid ?? null)
    );
    return () => unsubAuth();
  }, []);

  /* ---------- load scheduled contract metadata ---------- */
  useEffect(() => {
    if (!uid) return;
    const loadScheduledContracts = async () => {
      const scheduledRef = doc(
        db,
        "companies",
        uid,
        "calendar",
        "activeContract"
      );
      const scheduledSnap = await getDoc(scheduledRef);
      if (!scheduledSnap.exists()) return;

      const scheduledData = scheduledSnap.data();
      if (!scheduledData.contractId) return;

      const contractRef = doc(
        db,
        "companies",
        uid,
        "contracts",
        scheduledData.contractId
      );
      const contractSnap = await getDoc(contractRef);
      if (!contractSnap.exists()) return;

      const cData = contractSnap.data() as any;
      setActiveContractId(scheduledData.contractId);
      setActiveContractTitle(
        cData.name || scheduledData.contractTitle || "Contract"
      );
      if (cData.startDate) setScheduledStartISO(cData.startDate);
      if (cData.endDate) setScheduledEndISO(cData.endDate);
      if (cData.startDate && cData.endDate && !rangeDisplayText) {
        setRangeDisplayText(`${cData.startDate} → ${cData.endDate}`);
      }
    };
    loadScheduledContracts().catch(console.error);
  }, [uid]);

  /* ---------- listen to contract meta (start/end dates) ---------- */
  useEffect(() => {
    if (!uid || !activeContractId) return;
    const ref = doc(db, "companies", uid, "contracts", activeContractId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const d = snap.data() as any;
      if (typeof d.startDate === "string") setScheduledStartISO(d.startDate);
      if (typeof d.endDate === "string") setScheduledEndISO(d.endDate);
      if (d.title && !activeContractTitle) setActiveContractTitle(d.title);
      if (d.startDate && d.endDate)
        setRangeDisplayText(`${d.startDate} → ${d.endDate}`);
    });
    return () => unsub();
  }, [uid, activeContractId]);

  /* ---------- CORE LISTENER:  /so/{soId}/resources ---------- */
  useEffect(() => {
    if (!uid || !activeContractId) return;
    let unsubSOs: (() => void) | null = null;

    // Subscribe to SO collection in real time
    const soColRef = collection(
      db,
      "companies",
      uid,
      "contracts",
      activeContractId,
      "so"
    );

    // Keep a reference to all sub-unsubs (for resources under each SO)
    let soResourceUnsubs: (() => void)[] = [];

    // This will subscribe to SOs and keep up-to-date if any are added/removed
    const unsubSOListener = onSnapshot(soColRef, (soSnap) => {
      // Clean up previous resource listeners
      soResourceUnsubs.forEach((fn) => fn());
      soResourceUnsubs = [];

      // Gather all SO ids
      const soIds: string[] = [];
      soSnap.forEach((soDoc) => {
        soIds.push(soDoc.id);
      });

      // Subscribe to each SO's resource subcollection
      soIds.forEach((soId) => {
        const resColRef = collection(
          db,
          "companies",
          uid,
          "contracts",
          activeContractId,
          "so",
          soId,
          "resources"
        );
        const resUnsub = onSnapshot(resColRef, (resSnap) => {
          setContractData((prev) => {
            const next: ContractData = { ...prev };
            resSnap.forEach((resDoc) => {
              const rd = resDoc.data();
              const dates: string[] = rd.assignedDates
                ? rd.assignedDates
                : rd.date
                ? [rd.date]
                : [];
              dates.forEach((dateIso) => {
                const cellKey = `${soId}-${dateIso}`;
                if (!next[cellKey]) next[cellKey] = [];
                if (
                  !next[cellKey].some(
                    (i) => i.name === rd.name && i.type === rd.type
                  )
                ) {
                  next[cellKey] = [
                    ...next[cellKey],
                    {
                      name: rd.name,
                      type: rd.type,
                      color: contractColorFor(rd.type),
                    },
                  ];
                }
              });
            });
            return next;
          });
        });
        soResourceUnsubs.push(resUnsub);
      });
    });

    unsubSOs = () => {
      unsubSOListener();
      soResourceUnsubs.forEach((fn) => fn());
    };

    return () => {
      unsubSOs?.();
    };
  }, [uid, activeContractId]);

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

  const stripEverywhere = (name: string) => {
    setContractData((prev) => {
      const next: ContractData = {};
      for (const k of Object.keys(prev))
        next[k] = stripFromItems(prev[k], name);
      return next;
    });
    setTimeOffData((prev) => {
      const next: TimeOffData = {};
      for (const k of Object.keys(prev)) {
        next[k] = (prev[k] || []).filter((it) => it.name !== name);
      }
      return next;
    });
  };

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

  /* ---------- CENTRAL moveTo ---------- */
  const moveTo = async (target: {
    zone: "sidebar" | "contract" | "timeoff";
    id: string;
    assignToMachine?: { machineName: string } | null;
  }) => {
    console.log("running");

    console.log("moveTo", target);

    if (!dragged) return;

    // Whole contract drop logic
    if ("contractId" in dragged && target.zone === "contract") {
      let anchorIso = timelineDays[0].key; // fallback to first visible day

      // If dropped on the background, use the first day
      if (target.id === "area") {
        anchorIso = timelineDays[0].key;
      } else {
        // Parse the cell key to get the ISO date
        const m = target.id.match(
          /^(?:.+?)(?:-week(\d+))?-(mon|tue|wed|thu|fri|sat|sun)$/
        );
        if (m) {
          const weekIdx = m[1] ? parseInt(m[1], 10) : 0; // week2 => 2
          const dayIdx = dayOrder.indexOf(m[2] as (typeof dayOrder)[number]);
          const globalIdx = weekIdx * 7 + dayIdx;
          if (timelineDays[globalIdx]) anchorIso = timelineDays[globalIdx].key;
        }
      }

      // Avoid duplicate contract if already added
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

      // Update contractData with cells for the date range
      const startDate = new Date(anchorIso);
      const endDate = new Date(anchorIso);

      // Use scheduled range if present
      if (scheduledStartISO && scheduledEndISO) {
        const savedStart = new Date(scheduledStartISO);
        const savedEnd = new Date(scheduledEndISO);
        if (!isNaN(savedStart.getTime()) && !isNaN(savedEnd.getTime())) {
          startDate.setTime(savedStart.getTime());
          endDate.setTime(savedEnd.getTime());
        }
      }

      setContractData((prev) => {
        const next: ContractData = { ...prev };

        // If contract has SOs, create cells for each SO
        // If no SOs, create cells for a default SO
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
            const isoDate = currentDate.toISOString().slice(0, 10);
            const cellKey = `${so.id}-${isoDate}`;
            if (!next[cellKey]) next[cellKey] = [];
            currentDate.setDate(currentDate.getDate() + 1);
          }
        });
        return next;
      });

      setActiveContractId(dragged.contractId); // Set active contract
      setActiveContractTitle(dragged.title); // Set contract title

      // Persist active contract to Firebase (for direct drops without range modal)
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
          startDate: scheduledStartISO || null,
          endDate: scheduledEndISO || null,
          updatedAt: new Date().toISOString(),
        }).catch((e) =>
          console.error(
            "[Calendar] active contract save failed (direct drop)",
            e
          )
        );
      }

      setDragged(null); // Clear the dragged contract state
      return;
    }

    // Handle regular resource drops (employees, machines, tools)
    if (!dragged || !("name" in dragged)) return;

    const draggedItem = dragged;
    const itemToAdd: ContractCalendarItem = {
      name: draggedItem.name,
      type: draggedItem.type,
      color: contractColorFor(draggedItem.type),
    };

    

    /* remove from old location (state + firestore) */
    if (draggedItem.source.zone === "contract") {
      const { soId, dateIso } = splitCellKey(draggedItem.source.id);
      if (uid && activeContractId) {
        await removeResourceFromDate({
          uid,
          contractId: activeContractId,
          soId,
          resourceName: draggedItem.name,
          dateIso,
        });
        console.log("removeResourceFromDate done");
      }
      stripEverywhere(draggedItem.name);
    }

    // Add to target zone
    if (target.zone === "contract") {
      if (target.assignToMachine) {
        // Add to a specific machine and persist
        attachToMachine(
          target.id,
          target.assignToMachine.machineName,
          itemToAdd
        );
        // Persist target cell after attach
        if (uid && activeContractId) {
          const next = { ...contractData };
          // const itemsForCell = next[target.id] || [];
          const { soId, dateIso } = splitCellKey(target.id);

          // First update the state
          setContractData(next);

          // Then handle the async operations
          const machineRef = resourceDoc(
            uid,
            activeContractId,
            soId,
            target.assignToMachine!.machineName
          );

          try {
            // create / update the machine document
            await setDoc(machineRef, { type: "machine" }, { merge: true });

            // write the employee under its sub-collection
            const empRef = machineEmployeeDoc(
              uid,
              activeContractId,
              soId,
              target.assignToMachine!.machineName,
              draggedItem.name
            );
            await setDoc(
              empRef,
              { type: draggedItem.type, name: draggedItem.name },
              { merge: true }
            );

            // If item originated from another contract cell, persist source cell
            if (draggedItem.source.zone === "contract") {
              const srcKey = draggedItem.source.id;
              const srcItems = next[srcKey] || [];
              const srcRef = doc(
                db,
                "companies",
                uid,
                "contracts",
                activeContractId,
                "schedule",
                srcKey
              );
              await setDoc(srcRef, { items: srcItems } as any, { merge: true });
            }
          } catch (error) {
            console.error("Error updating Firebase:", error);
          }
        }
      } else {
        /* NORMAL CELL */
        const { soId, dateIso } = splitCellKey(target.id);
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

        if (uid && activeContractId) {
          await assignResourceToDate({
            uid,
            contractId: activeContractId,
            soId,
            resourceName: draggedItem.name,
            resourceType: draggedItem.type,
            dateIso,
          });
        }
      }

    } 
    
    if (
      dragged &&
      dragged.source &&
      dragged.source.zone === "timeoff" &&
      target.zone === "sidebar"
    ) {
      // Find the full item from state BEFORE updating it!
      const items = timeOffData[dragged.source.id] || [];
      const fullItem = items.find(
        (it) => it.name === dragged.name && it.type === dragged.type
      );

      setTimeOffData((prev) => {
        const updated = { ...prev };
        if (!updated[dragged.source.id]) return prev;
        updated[dragged.source.id] = updated[dragged.source.id].filter(
          (it) => !(it.name === dragged.name && it.type === dragged.type)
        );
        if (updated[dragged.source.id].length === 0)
          delete updated[dragged.source.id];
        return updated;
      });

      if (uid && fullItem) {
        await removeResourceFromTimeoffCell(
          db,
          uid,
          dragged.source.id,
          fullItem
        );
        console.log("removed from timeoff from firebase");
      } else {
        console.warn("No full item to remove from Firestore");
      }
      setDragged(null);
      return;
    } else if (target.zone === "timeoff") {
      const timeOffItem = {
        startDate: new Date(),
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

      // NEW: Write to Firestore
      if (uid) {
        console.log("Uid for timeoff:", uid);
        await addResourceToTimeoffCell(db, uid, target.id, timeOffItem);
        console.log("Time-off item added to Firestore");
      }
    }
    setDragged(null);
  };

  // const handleAreaDrop = React.useCallback(
  //   (anchorIso: string) => {
  //     if (dragged && "contractId" in dragged) {
  //       setPendingTarget({ kind: "contract-area", anchorIso });
  //       setPendingDragged(dragged);
  //       setShowRangeModal(true);
  //       return;
  //     }
  //     moveTo({ zone: "contract", id: anchorIso });
  //   },
  //   [moveTo, dragged]
  // );

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

  /* ---------- RESIZE HANDLER (unchanged) ---------- */
  const handleResize = (
    sourceKey: string,
    itemName: string,
    itemType: ContractItemType,
    edge: "left" | "right",
    dayDelta: number
  ) => {
    if (dayDelta <= 0) return;

    const baseMatch = sourceKey.match(
      /^(.*?)(?:-week(\d+))?-(mon|tue|wed|thu|fri|sat|sun)$/
    );
    if (!baseMatch) return;
    const contractRoot = baseMatch[1];
    const weekIndex = baseMatch[2] ? parseInt(baseMatch[2], 10) - 1 : 0; // 0-based
    const dayKey = baseMatch[3] as (typeof dayOrder)[number];

    const startGlobalIdx = weekIndex * 7 + dayOrder.indexOf(dayKey);

    setContractData((prev) => {
      const next = { ...prev } as ContractData;
      const getRowKeyForWeek = (w: number) =>
        w === 0 ? contractRoot : `${contractRoot}-week${w + 1}`;

      const sourceItems = prev[sourceKey] || [];
      const original = sourceItems.find((it) => it.name === itemName);

      const buildItem = (): ContractCalendarItem =>
        original ?? {
          name: itemName,
          type: itemType,
          color: contractColorFor(itemType),
        };

       for (let i = 1; i <= dayDelta; i++) {
        const offset = edge === "right" ? i : -i;
        const globalIdx = startGlobalIdx + offset;
        if (globalIdx < 0) continue;
        const targetWeek = Math.floor(globalIdx / 7);
        const targetDayIdx = globalIdx % 7;
        const rowKey = getRowKeyForWeek(targetWeek);
        const cellKey = `${rowKey}-${dayOrder[targetDayIdx]}`;
        const cur = next[cellKey] || [];
        if (!cur.some((it) => it.name === itemName)) {
          next[cellKey] = [...cur, buildItem()];
          /* -- FIRESTORE sync for resize (add/remove date) -- */
          if (uid && activeContractId) {
            const { soId } = splitCellKey(cellKey);
            const dateIso = timelineDays[globalIdx].key;
            assignResourceToDate({
              uid,
              contractId: activeContractId,
              soId,
              resourceName: itemName,
              resourceType: itemType,
              dateIso,
            }).catch(() => {});
          }
        }
      }
      return next;
    });
  };

  /* ---------- MODAL (unchanged) ---------- */
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);
  const [modalResourceName, _setModalResourceName] = useState<string | null>(
    null
  );

  // const unavailableResourceNames = useMemo(() => {
  //   const names = new Set<string>();
  //   Object.entries(timeOffData).forEach(([key, items]) => {
  //     if (key.startsWith("vacation-") || key.startsWith("sick-")) {
  //       items.forEach((it) => names.add(it.name));
  //     }
  //   });
  //   return names;
  // }, [timeOffData]);

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
    name: string,
    sourceKey: string,
    type: ContractItemType,
    meta?: { childrenSnapshot?: ContractCalendarItem[]; childOf?: string }
  ) =>
    setDragged({
      name,
      type,
      source: { zone: "contract", id: sourceKey },
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
  const onContractDrop = (targetKey: string) => {
    // if a resource (person / machine / tool) is being dropped → open the modal

    console.log("inside the contract drop ", targetKey);

    if (dragged && "name" in dragged) {
      /* pre-fill the modal with the day we dropped on */
      const iso = targetKey.match(/\d{4}-\d{2}-\d{2}$/)?.[0] ?? "";
      setRangeStart(iso);
      setRangeEnd(iso);

      setPendingTarget({ kind: "contract-cell", targetKey });
      setPendingDragged(dragged);
      setShowRangeModal(true);
      return;
    }

    // anything else (e.g. whole-contract rows) keeps the old behaviour
    moveTo({ zone: "contract", id: targetKey });
  };

  const onContractDropToMachine = (targetKey: string, machineName: string) => {
    if (dragged && "name" in dragged) {
      const iso = targetKey.match(/\d{4}-\d{2}-\d{2}$/)?.[0] ?? "";
      setRangeStart(iso);
      setRangeEnd(iso);

      setPendingTarget({
        kind: "contract-machine",
        targetKey,
        machineName,
      });
      setPendingDragged(dragged);
      setShowRangeModal(true);
      return;
    }

    moveTo({
      zone: "contract",
      id: targetKey,
      assignToMachine: { machineName },
    });
  };

  const onTimeOffDrop = (targetKey: string) =>
    moveTo({ zone: "timeoff", id: targetKey });

  /* ---------- sidebar drop targets ---------- */
  const onDropToEmployeeSection = (section: string) =>
    moveTo({ zone: "sidebar", id: `employee:${section}` });
  const onDropToMachineSection = (section: string) =>
    moveTo({ zone: "sidebar", id: `machine:${section}` });

  const toggleSection = (section: string) =>
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));

  // ---------- RANGE MODAL HANDLER ---------- //
  // Format a date to YYYY-MM-DD
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

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
          const isoDate = fmt(currentDate);
          const cellKey = `${so.id}-${isoDate}`;
          if (!next[cellKey]) next[cellKey] = [];
          // Also persist to Firestore
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
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });
      return next;
    });
  };

function getAllDateIsosInRange(startISO: string, endISO: string) {
  const arr = [];
  let current = new Date(startISO);
  const end = new Date(endISO);

  while (current <= end) {
    arr.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return arr;
}


  const handleRangeApply = async () => {
    if (!rangeStart || !rangeEnd) return;

    // Parse and validate dates
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return;

    const startISO = fmt(start);
    const endISO = fmt(end);

    // console.log("handleRangeApply", startISO, endISO);
    // console.log("RangeDisplay Text", rangeDisplayText );

    setRangeDisplayText(`${startISO} → ${endISO}`);

    // console.log("RangeDisplay after setting  Text", rangeDisplayText);

    // Whole contract row drop with range
    if (
      pendingTarget?.kind === "contract-area" &&
      pendingDragged &&
      "contractId" in pendingDragged
    ) {
      setActiveContractId(pendingDragged.contractId);
      setActiveContractTitle(pendingDragged.title);
      setScheduledStartISO(startISO);
      setScheduledEndISO(endISO);

      // Persist range and contract info
      await persistContractRange(
        pendingDragged.contractId,
        pendingDragged.title,
        pendingTarget.anchorIso,
        startISO,
        endISO
      );

      // Create empty cells in local state & Firestore
      await createContractCells(
        pendingDragged.contractId,
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
    // ── resource dropped on a CELL ─────────────────────────────────────────
    /* ───────────── 2 A. resource dropped on a CELL ───────────── */
    else if (
      pendingTarget?.kind === "contract-cell" &&
      pendingDragged &&
      "name" in pendingDragged
    ) {
      const base = pendingTarget.targetKey.match(/^(.*)-\d{4}-\d{2}-\d{2}$/);
      if (!base) return; // could not parse key
      const soId = base[1];

      // build the item once
      const item: ContractCalendarItem = {
        name: pendingDragged.name,
        type: pendingDragged.type,
        color: contractColorFor(pendingDragged.type),
      };

      setContractData((prev) => {
        const next: ContractData = { ...prev };
        timelineDays.forEach(({ key }) => {
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
    if (uid && activeContractId) {
      const { soId } = splitCellKey(pendingTarget.targetKey);
      const assignedDates = getAllDateIsosInRange(startISO, endISO);

      const resourceRef = resourceDoc(
        uid,
        activeContractId,
        soId,
        pendingDragged.name
      );
      await setDoc(
        resourceRef,
        {
          type: pendingDragged.type,
          name: pendingDragged.name,
          colour: contractColorFor(pendingDragged.type),
          assignedDates, // <-- full array, not arrayUnion!
        },
        { merge: true }
      );
    }

    } else if (
      /* ───────────── 2 B. resource dropped INSIDE A MACHINE ───────────── */
      pendingTarget?.kind === "contract-machine" &&
      pendingDragged &&
      "name" in pendingDragged
    ) {
      const { machineName, targetKey } = pendingTarget;
      const base = targetKey.match(/^(.*)-\d{4}-\d{2}-\d{2}$/);
      if (!base) return;
      const soId = base[1];

      const item: ContractCalendarItem = {
        name: pendingDragged.name,
        type: pendingDragged.type,
        color: contractColorFor(pendingDragged.type),
      };

      timelineDays.forEach(({ key }) => {
        if (key < startISO || key > endISO) return;
        const cellKey = `${soId}-${key}`;

        /* update React state */
        attachToMachine(cellKey, machineName, item);
      });

      // Persist to Firestore: assign all dates in the range
      if (uid && activeContractId) {
        // 1. ensure machine doc exists
        const machineRef = resourceDoc(
          uid,
          activeContractId,
          soId,
          machineName
        );
        setDoc(
          machineRef,
          { type: "machine", name: machineName },
          { merge: true }
        ).catch(() => {});

        // 2. assign the employee to this machine for the date range
        const assignedDates = getAllDateIsosInRange(startISO, endISO);

        const empRef = machineEmployeeDoc(
          uid,
          activeContractId,
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
            assignedDates, // <-- full range array
          },
          { merge: true }
        ).catch(() => {});
      }

    }

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
      />

      {/* ---------- MAIN CONTENT ---------- */}

      <CalendarMainContent
        timelineDays={timelineDays}
        headerLabel={headerLabel}
        setHeaderLabel={setHeaderLabel}
        setStartOffsetDays={setStartOffsetDays}
        contractData={contractData}
        setContractData={setContractData}
        onContractItemDragStart={onContractItemDragStart}
        onContractDrop={onContractDrop}
        onContractDropToMachine={onContractDropToMachine}
        allUnavailableResourceNames={allUnavailableResourceNames}
        handleResize={handleResize}
        timeOffData={timeOffData}
        onTimeOffItemDragStart={onTimeOffItemDragStart}
        onTimeOffDrop={onTimeOffDrop}
        setSidebarSearch={setSidebarSearch}
        // onAreaDrop={handleAreaDrop}
        isDraggingContract={isDraggingContract}
        activeContractId={activeContractId}
        activeContractTitle={activeContractTitle || undefined}
        rangeWithinWeek={rangeWithinWeek}
        scheduledStartISO={scheduledStartISO}
        scheduledEndISO={scheduledEndISO}
      />

      {/* ---------- Time-off footer ---------- */}
      <TimeOffScheduler
        weekDays={timelineDays}
        data={timeOffData}
        onDragStart={onTimeOffItemDragStart}
        onDrop={onTimeOffDrop}
        uid={uid}
        onRemoveResource={onRemoveResource}
      />

      {/* ---------- Floating “Add contract” button ---------- */}
      <button
        className="fixed z-100 bottom-6 right-6 bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:bg-gray-800"
        onClick={() =>
          navigate("/add-contract", { state: { backgroundLocation: location } })
        }
      >
        <Plus className="h-4 w-4" />
        Add contract
      </button>

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
