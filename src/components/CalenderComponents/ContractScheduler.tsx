import React from "react";
import { ChevronDown } from "lucide-react";

export type ItemType = "person" | "machine";

export type CalendarItem = {
  name: string;
  type: ItemType;
  color?: string; // color is optional; parent can decide
  note?: string;
};

export type CalendarData = Record<string, CalendarItem[]>;

type DragStartFn = (name: string, sourceKey: string, type: ItemType) => void;
type DropFn = (targetKey: string) => void;

type DraggedItem = { name: string; type: ItemType } | null;

type WeekDay = { key: string; label: string; date: string };

interface Props {
  data: CalendarData;
  onDragStart: DragStartFn;
  onDrop: DropFn;
}

const ContractScheduler: React.FC<Props> = ({ data, onDragStart, onDrop }) => {
  const [draggedItem, setDraggedItem] = React.useState<DraggedItem>(null);
  const [draggedFrom, setDraggedFrom] = React.useState<string | null>(null);

  // NEW: per-row collapsed state
  const [collapsedRows, setCollapsedRows] = React.useState<
    Record<string, boolean>
  >({});

  const toggleRow = (rowKey: string) =>
    setCollapsedRows((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }));

  const weekDays: WeekDay[] = [
    { key: "mon", label: "Mon", date: "21" },
    { key: "tue", label: "Tue", date: "22" },
    { key: "wed", label: "Wed", date: "23" },
    { key: "thu", label: "Thu", date: "24" },
    { key: "fri", label: "Fri", date: "25" },
    { key: "sat", label: "Sat", date: "26" },
    { key: "sun", label: "Sun", date: "27" },
  ];

  const handleItemDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    itemName: string,
    sourceKey: string,
    itemType: ItemType
  ) => {
    setDraggedItem({ name: itemName, type: itemType });
    setDraggedFrom(sourceKey);
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", itemName);
      e.dataTransfer.setData("application/x-item-type", itemType);
    } catch {}
    onDragStart(itemName, sourceKey, itemType);
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropHere = (
    e: React.DragEvent<HTMLDivElement>,
    targetKey: string
  ) => {
    e.preventDefault();
    onDrop(targetKey);
    setDraggedItem(null);
    setDraggedFrom(null);
  };

  const getWeekDates = (weekOffset = 0): WeekDay[] =>
    weekDays.map((day, index) => ({
      ...day,
      date: String(21 + index + weekOffset * 7),
    }));

  const renderWeekRow = (
    weekKey: string,
    weekOffset = 0,
    showHeader = true
  ) => {
    const weekDates = getWeekDates(weekOffset);
    const isCollapsed = !!collapsedRows[weekKey];

    return (
      <div className="grid grid-row-2">
        {/* Left header cell with toggle */}
        <div className="p-1">
          <button
            type="button"
            onClick={() => toggleRow(weekKey)}
            className="text-xs text-gray-500 flex items-center hover:text-gray-700 select-none"
            aria-expanded={!isCollapsed}
            aria-controls={`${weekKey}-grid`}
            title={isCollapsed ? "Expand row" : "Collapse row"}
          >
            <span>SO1165</span>
            <ChevronDown
              size={12}
              className={`ml-1 transition-transform duration-200 ${
                isCollapsed ? "-rotate-90" : "rotate-0"
              }`}
            />
          </button>
        </div>

        {/* Days grid (hidden when collapsed) */}
        {!isCollapsed && (
          <div id={`${weekKey}-grid`} className="grid grid-cols-4">
            {weekDates.map((day) => {
              const cellKey = `${weekKey}-${day.key}`;
              return (
                <div
                  key={cellKey}
                  className="p-3 hover:bg-gray-25 transition-colors"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropHere(e, cellKey)}
                >
                  <div className="space-y-2">
                    {data[cellKey]?.map((item, idx) => (
                      <div
                        key={`${cellKey}-${item.name}-${idx}`}
                        draggable
                        onDragStart={(e) =>
                          handleItemDragStart(e, item.name, cellKey, item.type)
                        }
                        className={`px-2 py-1.5 ${
                          item.type === "person"
                            ? "bg-blue-100 text-blue-800 border border-blue-300/50"
                            : "bg-green-100 text-green-800 border border-green-300/50"
                        } rounded-md text-xs cursor-move hover:shadow-sm transition-all duration-200`}
                        title={item.note || ""}
                      >
                        <div className="font-medium">{item.name}</div>
                        {item.note && (
                          <div className="text-xs opacity-75 mt-1">
                            {item.note}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full bg-gray-100 p-2">
      <div className="w-full p-3 max-w-4xl bg-white rounded-lg shadow-sm">
        <div className="text-lg font-semibold w-full border-b">
          Contract SO1165
        </div>
        <div className="bg-white">
          {renderWeekRow("SO1165", 0, true)}
          {renderWeekRow("SO1165-week2", 1, false)}
          {renderWeekRow("SO1165-week3", 2, false)}
        </div>
      </div>
    </div>
  );
};

export default ContractScheduler;
