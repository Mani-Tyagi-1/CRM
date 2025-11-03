import React, { useRef } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import {
  collection,
  DocumentData,
  QueryDocumentSnapshot,
  onSnapshot,
} from "firebase/firestore";
import { db, auth } from "../../lib/firebase";

import ContractScheduler, {
  CalendarData as ContractData,
  ItemType as ContractItemType,
  CalendarItem as ContractCalendarItem,
} from "../CalenderComponents/ContractScheduler";

import {
  CalendarData as TimeOffData,
  ItemType as TimeOffItemType,
} from "../CalenderComponents/TimeOffScheduler";

// ----------- Types -------------
type SOItem = { id: string; soNumber: string };

type Props = {
  timelineDays: { key: string; day: string; date: Date; isToday: boolean }[];
  headerLabel: string;
  setHeaderLabel: React.Dispatch<React.SetStateAction<string>>;
  setStartOffsetDays: React.Dispatch<React.SetStateAction<number>>;
  setSidebarSearch: React.Dispatch<React.SetStateAction<string>>;
  scrollRef: React.RefObject<HTMLDivElement | null>;

  // Contract scheduling props
  contractData: ContractData;
  setContractData: React.Dispatch<React.SetStateAction<ContractData>>;
  onContractItemDragStart: (
    name: string,
    sourceKey: string,
    type: ContractItemType,
    meta?: { childrenSnapshot?: ContractCalendarItem[]; childOf?: string }
  ) => void;
  onContractDrop: (targetKey: string) => void;
  onContractDropToMachine: (targetKey: string, machineName: string) => void;
  handleResize: (
    sourceKey: string,
    itemName: string,
    itemType: ContractItemType,
    edge: "left" | "right",
    dayDelta: number
  ) => void;
  allUnavailableResourceNames: string[];

  // Time-off
  timeOffData: TimeOffData;
  onTimeOffItemDragStart: (
    name: string,
    sourceKey: string,
    type: TimeOffItemType
  ) => void;
  onTimeOffDrop: (targetKey: string) => void;
  onAreaDrop: (anchorIso: string) => void;
  isDraggingContract: boolean;

  // *** NEW: the contract currently being scheduled ***
  activeContractId: string | null;
  activeContractTitle?: string;
  rangeWithinWeek?: { startIdx: number; days: number };
  scheduledStartISO?: string | null;
  scheduledEndISO?: string | null;
};



const CalendarMainContent: React.FC<Props> = ({
  timelineDays,
  headerLabel,
  scrollRef,
  onAreaDrop,
  isDraggingContract,
  setHeaderLabel,
  setStartOffsetDays,
  setSidebarSearch,
  contractData,
  onContractItemDragStart,
  onContractDrop,
  onContractDropToMachine,
  handleResize,
  allUnavailableResourceNames,
  activeContractId, // <-- passed from parent!
  activeContractTitle,
  rangeWithinWeek,
  scheduledStartISO,
  scheduledEndISO,
}) => {
  const CELL_MIN_WIDTH = 180;


  // Add this helper function in the component before the return statement

  // Helper function to calculate days between two dates (inclusive)
  const getNumberOfDaysInRange = (startISO: string, endISO: string) => {
    const startDate = new Date(startISO);
    const endDate = new Date(endISO);

    // Calculate the time difference between the two dates
    const timeDiff = endDate.getTime() - startDate.getTime();

    // Convert the time difference to days and add 1 to include both the start and end date
    const dayCount = timeDiff / (1000 * 3600 * 24) + 1;
    return dayCount;
  };

  // Create a shifted version of timelineDays (move each day -2 days back)
  const shiftedTimelineDays = timelineDays.map((d) => ({
    ...d,
    key: (() => {
      // Add 2 days to the date and generate new key
      const newDate = new Date(d.date);
      newDate.setDate(newDate.getDate() + 1);
      return newDate.toISOString().slice(0, 10); // "YYYY-MM-DD"
    })(),
    day: (() => {
      const newDate = new Date(d.date);
      newDate.setDate(newDate.getDate() + 1);

      const weekday = newDate.toLocaleDateString(undefined, {
        weekday: "short",
      });
      const date = newDate.getDate(); // 1 - 31
      const month = newDate.getMonth() + 1; // 0-index to 1-index

      return `${weekday} ${date}.${month}.`;
    })(),
    date: (() => {
      const newDate = new Date(d.date);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    })(),
    isToday: (() => {
      const newDate = new Date(d.date);
      newDate.setDate(newDate.getDate() + 1);
      const today = new Date();
      return (
        newDate.getFullYear() === today.getFullYear() &&
        newDate.getMonth() === today.getMonth() &&
        newDate.getDate() === today.getDate()
      );
    })(),
  }));

  const rulerRef = React.useRef<HTMLDivElement>(null);
  // const mainScrollRef = React.useRef<HTMLDivElement>(null);
  const dayRefs = useRef<(HTMLDivElement | null)[]>([]);

  // ====== SO LIST STATE ======
  const [soList, setSOList] = React.useState<SOItem[]>([]);
  const [uid, setUid] = React.useState<string | null>(null);

  // Get uid (if using Firebase Auth)
  React.useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setUid(user?.uid ?? null);
    });
    return () => unsub();
  }, []);

  React.useEffect(() => {
    if (!scheduledStartISO || !scrollRef.current || !timelineDays.length)
      return;

    // Find the day element corresponding to the scheduled start date
    const startIdx = timelineDays.findIndex((d) => d.key === scheduledStartISO);
    if (startIdx > -1 && dayRefs.current[startIdx]) {
      // Adjust the scroll position to center the start date
      const dayElement = dayRefs.current[startIdx];
      if (scrollRef.current) {
        scrollRef.current.scrollLeft =
          dayElement.offsetLeft -
          scrollRef.current.clientWidth / 2 +
          dayElement.clientWidth / 2;
      }
    }
  }, [scheduledStartISO, timelineDays]);

  // Fetch SOs when contract changes (needs uid)
  React.useEffect(() => {
    if (!activeContractId || !uid) {
      setSOList([]);
      return;
    }

    const soCol = collection(
      db,
      "companies",
      uid,
      "contracts",
      activeContractId,
      "so"
    );

    // Subscribe to SO changes in real time!
    const unsub = onSnapshot(
      soCol,
      (soSnap) => {
        const soArr: SOItem[] = [];
        soSnap.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          soArr.push({ id: doc.id, soNumber: doc.get("soNumber") || doc.id });
        });
        setSOList(soArr);
      },
      (error) => {
        console.error("Error fetching SOs:", error);
        setSOList([]);
      }
    );

    // Clean up subscription on unmount/contract change
    return () => unsub();
  }, [activeContractId, uid]);

  // ----- Timeline scroll logic (same as before) -----
  React.useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect();
      let foundIndex = 0;
      for (let i = 0; i < dayRefs.current.length; i++) {
        const el = dayRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.right > containerRect.left) {
          foundIndex = i;
          break;
        }
      }
      const visibleDay = timelineDays[foundIndex];
      if (visibleDay) {
        const month = visibleDay.date.toLocaleString(undefined, {
          month: "long",
        });
        const year = visibleDay.date.getFullYear();
        setHeaderLabel(`${month} ${year}`);
      }
    };

    container.addEventListener("scroll", handleScroll);
    // center on today on mount
    const todayIndex = timelineDays.findIndex((d) => d.isToday);
    if (todayIndex > -1 && dayRefs.current[todayIndex]) {
      const el = dayRefs.current[todayIndex] as HTMLDivElement;
      container.scrollLeft =
        el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2;
    }
    handleScroll();

    return () => container.removeEventListener("scroll", handleScroll);
  }, [timelineDays, setHeaderLabel]);

  // ----- Drag-and-drop area for contracts and resources -----
  const handleAreaDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    // Allow dropping for both contracts and resources
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleAreaDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    /* figure out which column (day) we landed on */
    let anchorIso = timelineDays[0].key;
    const x = e.clientX;
    dayRefs.current.forEach((el, idx) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right) anchorIso = timelineDays[idx].key;
    });

    /* bubble up to Calendar */
    onAreaDrop?.(anchorIso);
  };

  // Calculate the number of days in the contract range
  const numberOfDays =
    scheduledStartISO && scheduledEndISO
      ? getNumberOfDaysInRange(scheduledStartISO, scheduledEndISO)
      : 0;

  // Conditional margin-left based on the number of days (odd/even)
  const marginLeftClass = numberOfDays % 2 !== 0 ? "ml-[-178px]" : "ml-0";

  // ---------- UI -----------
  return (
    <div
      ref={scrollRef}
      className={`flex-1 overflow-x-auto pb-48 transition-colors duration-200 ${
        isDraggingContract ? "bg-blue-50" : "bg-gray-100"
      }`}
      onDragOver={handleAreaDragOver}
      onDrop={handleAreaDrop}
    >
      <div className="min-w-max ">
        {/* ---------- HEADER BAR ---------- */}
        <div className="bg-white w-[calc(100vw-256px)] px-6 py-3 sticky top-0 left-0 z-20">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <h1 className="text-[22px] leading-6 font-semibold tracking-tight">
              {headerLabel}
            </h1>
            <div className="justify-self-center w-80 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                className="h-9 w-full pl-9 pr-3 rounded-full text-sm placeholder:text-gray-400
                  bg-gray-50 ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-200"
                onChange={(e) => setSidebarSearch(e.target.value)}
              />
            </div>
            <div className="justify-self-end flex items-center gap-3">
              <div className="inline-flex items-stretch rounded-lg overflow-hidden ring-1 ring-gray-200 bg-white mr-7">
                <button
                  className="px-2 py-2 hover:bg-gray-50"
                  onClick={() => setStartOffsetDays((d) => d - 1)}
                  title="Previous day"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-800" />
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium border-x border-gray-200 hover:bg-gray-50"
                  onClick={() => setStartOffsetDays(0)}
                >
                  Today
                </button>
                <button
                  className="px-2 py-2 hover:bg-gray-50"
                  onClick={() => setStartOffsetDays((d) => d + 1)}
                  title="Next day"
                >
                  <ChevronRight className="h-4 w-4 text-gray-800" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- DATE RULER ---------- */}
        <div className="bg-white border-b border-gray-200">
          <div
            className="overflow-x-auto scrollbar-hide"
            ref={rulerRef}
            onWheel={(e) => {
              e.preventDefault();
              if (rulerRef.current)
                rulerRef.current.scrollBy({
                  left: e.deltaY,
                  behavior: "smooth",
                });
            }}
          >
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${timelineDays.length}, minmax(${CELL_MIN_WIDTH}px, 1fr))`,
              }}
            >
              {shiftedTimelineDays.map((d, i) => (
                <div
                  key={d.key}
                  ref={(el) => {
                    dayRefs.current[i] = el;
                  }}
                  className={[
                    "p-1 text-center text-[13px]",
                    i > 0 ? "border-l border-gray-400" : "", // <--- border between columns, except first
                    d.isToday ? "text-black font-semibold" : "text-gray-600",
                  ].join(" ")}
                  title={d.date.toLocaleDateString()}
                >
                  <div>{d.day}</div>
                  {d.isToday && (
                    <div className="mx-auto mt-1 h-[3px] w-8 rounded-full bg-black" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ---------- CONTRACT SCHEDULER GRID ---------- */}
        <div className={`${marginLeftClass}`}>
          <ContractScheduler
            data={contractData}
            soList={soList}
            contractId={activeContractId || undefined}
            contractName={activeContractTitle || undefined}
            onDragStart={onContractItemDragStart}
            onDrop={onContractDrop}
            onDropToMachine={onContractDropToMachine}
            unavailableResourceNames={allUnavailableResourceNames}
            onResize={handleResize}
            rangeWithinWeek={rangeWithinWeek}
            timelineDays={timelineDays}
            scheduledStartISO={scheduledStartISO}
            scheduledEndISO={scheduledEndISO}
          />
        </div>
      </div>
    </div>
  );
};

export default CalendarMainContent;
