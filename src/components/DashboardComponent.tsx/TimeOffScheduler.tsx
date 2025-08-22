import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export type ItemType = "person" | "machine";
export type CalendarItem = {
  name: string;
  type: ItemType;
  color?: string;
  note?: string;
};
export type CalendarData = Record<string, CalendarItem[]>;
type DragStartFn = (name: string, sourceKey: string, type: ItemType) => void;
type DropFn = (targetKey: string) => void;

type WeekDay = { day: string; key: string };

interface Props {
  weekDays: WeekDay[];
  data: CalendarData; // controlled by parent
  onDragStart: DragStartFn; // bubble to parent
  onDrop: DropFn; // bubble to parent
}

/**
 * Sticky Time-Off footer (Vacation + Sick) — controlled
 * - Icon removed from pills (prevents any chance of intercepting drag)
 * - No backdrop-blur on the container (avoids Chromium/WebKit drag issues)
 * - Adds WebKit drag hint + setDragImage for robust dragstart
 */
const TimeOffScheduler: React.FC<Props> = ({
  weekDays,
  data,
  onDragStart,
  onDrop,
}) => {
  const [collapsed, setCollapsed] = useState({ vacation: false, sick: false });
  const [open, setOpen] = useState(false);

  // Count unique names across Vacation & Sick
  const unavailableCount = useMemo(() => {
    const names = new Set<string>();
    Object.entries(data).forEach(([key, items]) => {
      if (!key.startsWith("vacation-") && !key.startsWith("sick-")) return;
      items?.forEach((it) => names.add(it.name));
    });
    return names.size;
  }, [data]);

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
  };

 const handleItemDragStart = (
   e: React.DragEvent<HTMLDivElement>,
   itemName: string,
   sourceKey: string,
   itemType: ItemType
 ) => {
   // Make Chromium/WebKit reliably start the drag:
   e.dataTransfer.effectAllowed = "move";
   try {
     e.dataTransfer.setData("text/plain", itemName);
     e.dataTransfer.setData("application/x-item-type", itemType);
   } catch {}
   onDragStart(itemName, sourceKey, itemType);
 };

  const Row = ({
    label,
    rowKeyPrefix,
    isCollapsed,
    onToggle,
  }: {
    label: "Vacation" | "Sick";
    rowKeyPrefix: "vacation" | "sick";
    isCollapsed: boolean;
    onToggle: () => void;
  }) => (
    <div className="w-full">
      <div className="grid grid-cols-8 ">
        {/* label / toggle */}
        <div className="py-2 pr-3 flex items-start">
          <button
            type="button"
            onClick={onToggle}
            className="text-sm font-medium text-gray-800 inline-flex items-center gap-1"
            aria-label={`Toggle ${label}`}
          >
            {label}
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            )}
          </button>
        </div>

        {/* day cells */}
        {weekDays.map(({ key }) => {
          const cellKey = `${rowKeyPrefix}-${key}`;
          return (
            <div
              key={cellKey}
              className="p-2 min-h-14"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropHere(e, cellKey)}
            >
              {!isCollapsed && (
                <div className="flex flex-wrap gap-2">
                  {data[cellKey]?.map((item, idx) => (
                    <div
                      key={`${cellKey}-${item.name}-${idx}`}
                      draggable
                      style={{ WebkitUserDrag: "element" }}
                      onDragStart={(e) =>
                        handleItemDragStart(e, item.name, cellKey, item.type)
                      }
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium cursor-grab active:cursor-grabbing select-none hover:shadow-sm transition ${
                        item.type === "person"
                          ? "bg-blue-100 text-blue-800 ring-1 ring-blue-200"
                          : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                      }`}
                      title={item.note || ""}
                    >
                      <span>{item.name}</span>
                      {/* Icon removed */}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* spacer so main content isn't hidden */}
      <div className="h-40" />

      {/* sticky footer (no backdrop-blur) */}
      <div className="fixed left-64 right-0 bottom-0 z-40">
        <div className="border-t border-red-200 bg-red-50/85">
          {/* header */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-full text-center py-2 text-sm font-medium text-red-600 hover:text-red-700 inline-flex items-center justify-center gap-1"
          >
            {unavailableCount} unavailable resources
            {open ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {/* content */}
          {open && (
            <div className="px-3 py-3">
              <div className="rounded-xl bg-red-50 ring-1 ring-red-200/60 px-3 py-2">
                <Row
                  label="Vacation"
                  rowKeyPrefix="vacation"
                  isCollapsed={collapsed.vacation}
                  onToggle={() =>
                    setCollapsed((s) => ({ ...s, vacation: !s.vacation }))
                  }
                />
                <div className="h-2" />
                <Row
                  label="Sick"
                  rowKeyPrefix="sick"
                  isCollapsed={collapsed.sick}
                  onToggle={() =>
                    setCollapsed((s) => ({ ...s, sick: !s.sick }))
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Local override in case a global reset disables dragging */}
      <style>{`
        [draggable="true"] { -webkit-user-drag: element !important; }
      `}</style>
    </>
  );
};

export default TimeOffScheduler;
