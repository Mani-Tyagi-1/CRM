// CalendarMainContent.tsx
import React from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import ContractScheduler, {
  CalendarData as ContractData,
  ItemType as ContractItemType,
  CalendarItem as ContractCalendarItem,
} from "../CalenderComponents/ContractScheduler";
import TimeOffScheduler, {
  CalendarData as TimeOffData,
  ItemType as TimeOffItemType,
} from "../CalenderComponents/TimeOffScheduler";

type Props = {
  timelineDays: { key: string; day: string; date: Date; isToday: boolean }[];
  headerLabel: string;
  setStartOffsetDays: React.Dispatch<React.SetStateAction<number>>;
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
  allUnavailableResourceNames: string[];
  handleResize: (
    sourceKey: string,
    itemName: string,
    itemType: ContractItemType,
    edge: "left" | "right",
    dayDelta: number
  ) => void;
  timeOffData: TimeOffData;
  onTimeOffItemDragStart: (
    name: string,
    sourceKey: string,
    type: TimeOffItemType
  ) => void;
  onTimeOffDrop: (targetKey: string) => void;
  setSidebarSearch: React.Dispatch<React.SetStateAction<string>>;
};

const CalendarMainContent: React.FC<Props> = ({
  timelineDays,
  headerLabel,
  setStartOffsetDays,
  contractData,
//   setContractData,
  onContractItemDragStart,
  onContractDrop,
  onContractDropToMachine,
  allUnavailableResourceNames,
  handleResize,
  timeOffData,
  onTimeOffItemDragStart,
  onTimeOffDrop,
  setSidebarSearch,
}) => (
  <div className="flex-1 overflow-x-auto pb-48 bg-gray-100">
    <div className="min-w-max">
      {/* HEADER */}
      <div className="bg-white w-screen-[calc(100%-256px]  px-6 py-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div>
            <h1 className="text-[22px] leading-6 font-semibold tracking-tight">
              {headerLabel}
            </h1>
          </div>
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
          <div className="justify-self-end relative flex items-center gap-0">
            <div className="inline-flex items-stretch rounded-lg overflow-hidden ring-1 ring-gray-200 bg-white mr-7">
              <button
                className="px-2 py-2 hover:bg-gray-50"
                onClick={() => setStartOffsetDays((d) => d - 1)}
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
              >
                <ChevronRight className="h-4 w-4 text-gray-800" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* WEEK RULER */}
      <div className="bg-white">
        <div className="">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${timelineDays.length}, minmax(120px, 1fr))`,
            }}
          >
            {timelineDays.map((d, _i) => (
              <div
                key={d.key}
                className={`p-1 text-center text-[13px] ${
                  d.isToday ? "text-black font-semibold" : "text-gray-600"
                }`}
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

        <ContractScheduler
          data={contractData}
          onDragStart={onContractItemDragStart}
          onDrop={onContractDrop}
          onDropToMachine={onContractDropToMachine}
          unavailableResourceNames={allUnavailableResourceNames}
          onResize={handleResize}
        />
      </div>
    </div>
    {/* Sticky Vacation/Sick footer */}
    <TimeOffScheduler
      weekDays={timelineDays}
      data={timeOffData}
      onDragStart={onTimeOffItemDragStart}
      onDrop={onTimeOffDrop}
    />
  </div>
);

export default CalendarMainContent;
