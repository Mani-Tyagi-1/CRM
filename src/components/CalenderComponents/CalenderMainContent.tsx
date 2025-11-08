import React, { useRef } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

import ContractScheduler, {
  CalendarData as ContractData,
  ItemType as ContractItemType,
  CalendarItem as ContractCalendarItem,
} from "../CalenderComponents/ContractScheduler";

type SOItem = { id: string; soNumber: string };

export type TimelineContract = {
  id: string;
  title: string;
  soList: SOItem[];
  startDate: string | null;
  endDate: string | null;
};

type Props = {
  timelineDays: { key: string; day: string; date: Date; isToday: boolean }[];
  headerLabel: string;
  setHeaderLabel: React.Dispatch<React.SetStateAction<string>>;
  setStartOffsetDays: React.Dispatch<React.SetStateAction<number>>;
  setSidebarSearch: React.Dispatch<React.SetStateAction<string>>;
  scrollRef: React.RefObject<HTMLDivElement | null>;

  contracts: TimelineContract[];
  contractData: ContractData;
  soToContractMap: Record<string, string>;

  onContractItemDragStart: (
    contractId: string,
    name: string,
    sourceKey: string,
    type: ContractItemType,
    meta?: { childrenSnapshot?: ContractCalendarItem[]; childOf?: string }
  ) => void;
  onContractDrop: (contractId: string, targetKey: string) => void;
  onContractDropToMachine: (
    contractId: string,
    targetKey: string,
    machineName: string
  ) => void;
  handleResize: (
    contractId: string,
    soId: string,
    itemName: string,
    itemType: ContractItemType,
    edge: "left" | "right",
    dayDelta: number
  ) => void;
  allUnavailableResourceNames: string[];

  onAreaDrop: (anchorIso: string) => void;
  isDraggingContract: boolean;

  activeContractId: string | null;
  rangeWithinWeek?: { startIdx: number; days: number };
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
  contracts,
  contractData,
  soToContractMap,
  onContractItemDragStart,
  onContractDrop,
  onContractDropToMachine,
  handleResize,
  allUnavailableResourceNames,
  activeContractId,
  rangeWithinWeek,
}) => {
  const CELL_MIN_WIDTH = 180;

  const getNumberOfDaysInRange = (startISO: string, endISO: string) => {
    const startDate = new Date(startISO);
    const endDate = new Date(endISO);
    const timeDiff = endDate.getTime() - startDate.getTime();
    return timeDiff / (1000 * 3600 * 24) + 1;
  };

  // const shiftedTimelineDays = timelineDays.map((d) => {
  //   const newDate = new Date(d.date);
  //   newDate.setDate(newDate.getDate() + 1);
  //   const weekday = newDate.toLocaleDateString(undefined, {
  //     weekday: "short",
  //   });
  //   const date = newDate.getDate();
  //   const month = newDate.getMonth() + 1;
  //   return {
  //     ...d,
  //     key: newDate.toISOString().slice(0, 10),
  //     day: `${weekday} ${date}.${month}.`,
  //     date: newDate,
  //     isToday:
  //       newDate.getFullYear() === new Date().getFullYear() &&
  //       newDate.getMonth() === new Date().getMonth() &&
  //       newDate.getDate() === new Date().getDate(),
  //   };
  // });

  const rulerRef = React.useRef<HTMLDivElement>(null);
  const dayRefs = useRef<(HTMLDivElement | null)[]>([]);

  const contractDataByContract = React.useMemo(() => {
    const slices: Record<string, ContractData> = {};
    Object.entries(contractData).forEach(([cellKey, items]) => {
      const match = cellKey.match(/^(.+)-(\d{4}-\d{2}-\d{2})$/);
      if (!match) return;
      const soId = match[1];
      const contractId = soToContractMap[soId];
      if (!contractId) return;
      if (!slices[contractId]) slices[contractId] = {};
      slices[contractId][cellKey] = items;
    });
    contracts.forEach((contract) => {
      if (!slices[contract.id]) slices[contract.id] = {};
    });
    return slices;
  }, [contracts, contractData, soToContractMap]);

  const activeContractRange = React.useMemo(() => {
    if (!activeContractId) return null;
    const active = contracts.find((c) => c.id === activeContractId);
    if (!active || !active.startDate || !active.endDate) return null;
    return { startISO: active.startDate, endISO: active.endDate };
  }, [activeContractId, contracts]);

  React.useEffect(() => {
    if (!activeContractRange || !scrollRef.current || !timelineDays.length)
      return;
    const startIdx = timelineDays.findIndex(
      (d) => d.key === activeContractRange.startISO
    );
    if (startIdx > -1 && dayRefs.current[startIdx]) {
      const dayElement = dayRefs.current[startIdx];
      if (scrollRef.current && dayElement) {
        scrollRef.current.scrollLeft =
          dayElement.offsetLeft -
          scrollRef.current.clientWidth / 2 +
          dayElement.clientWidth / 2;
      }
    }
  }, [activeContractRange, timelineDays, scrollRef]);

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
    const todayIndex = timelineDays.findIndex((d) => d.isToday);
    if (todayIndex > -1 && dayRefs.current[todayIndex]) {
      const el = dayRefs.current[todayIndex] as HTMLDivElement;
      container.scrollLeft =
        el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2;
    }
    handleScroll();

    return () => container.removeEventListener("scroll", handleScroll);
  }, [timelineDays, setHeaderLabel, scrollRef]);

  const handleAreaDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleAreaDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    let anchorIso = timelineDays[0]?.key;
    const x = e.clientX;
    dayRefs.current.forEach((el, idx) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right) anchorIso = timelineDays[idx].key;
    });
    if (anchorIso) onAreaDrop(anchorIso);
  };

  const numberOfDays = activeContractRange
    ? getNumberOfDaysInRange(
        activeContractRange.startISO,
        activeContractRange.endISO
      )
    : 0;

  const marginLeftClass = numberOfDays % 2 !== 0 ? "ml-[-178px]" : "ml-0";

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
                className="h-9 w-full pl-9 pr-3 rounded-full text-sm placeholder:text-gray-400 bg-gray-50 ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-200"
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
              {timelineDays.map((d, i) => (
                <div
                  key={`${d.key}-${i}`}
                  ref={(el) => {
                    dayRefs.current[i] = el;
                  }}
                  className={[
                    "p-1 text-center text-[13px]",
                    i > 0 ? "border-l border-gray-400" : "",
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

        <div className={`${marginLeftClass}`}>
          {contracts.length === 0 ? (
            <div className="px-6 py-4 text-sm text-gray-500">
              No contracts scheduled. Drag a contract from the sidebar to get
              started.
            </div>
          ) : (
            contracts.map((contract) => {
              const dataSlice = contractDataByContract[contract.id] || {};
              const scheduledStart = contract.startDate || undefined;
              const scheduledEnd = contract.endDate || undefined;
              // console.log(dataSlice);
              // console.log(scheduledStart, scheduledEnd);
              return (
                <div key={contract.id} className="mb-8">
                  <div className="px-6 pb-2 text-base font-semibold text-gray-700">
                    {contract.title}
                  </div>
                  <ContractScheduler
                    data={dataSlice}
                    soList={contract.soList}
                    contractId={contract.id}
                    contractName={contract.title}
                    onDragStart={(name, sourceKey, type, meta) =>
                      onContractItemDragStart(
                        contract.id,
                        name,
                        sourceKey,
                        type,
                        meta
                      )
                    }
                    onDrop={(targetKey) =>
                      onContractDrop(contract.id, targetKey)
                    }
                    onDropToMachine={(targetKey, machineName) =>
                      onContractDropToMachine(
                        contract.id,
                        targetKey,
                        machineName
                      )
                    }
                    unavailableResourceNames={allUnavailableResourceNames}
                    onResize={(soId, itemName, itemType, edge, dayDelta) =>
                      handleResize(
                        contract.id,
                        soId,
                        itemName,
                        itemType,
                        edge,
                        dayDelta
                      )
                    }
                    rangeWithinWeek={
                      contract.id === activeContractId
                        ? rangeWithinWeek
                        : undefined
                    }
                    timelineDays={timelineDays}
                    scheduledStartISO={scheduledStart}
                    scheduledEndISO={scheduledEnd}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarMainContent;
