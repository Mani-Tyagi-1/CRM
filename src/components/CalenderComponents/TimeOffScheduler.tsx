import React from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import {
  addResourceToTimeoffCell,
  removeResourceFromTimeoffCell,
} from "../../services/timeoffschedular";
import { db } from "../../lib/firebase";

export type ItemType = "person" | "machine" | "tool";
export type CalendarItem = {
  startDate: Date;
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
  scrollRef: React.RefObject<HTMLDivElement>;
  data: CalendarData;
  onDragStart: DragStartFn;
  onDrop: DropFn;
  uid: string | null; // <-- add this!
  onRemoveResource: (cellKey: string, item: CalendarItem) => void; // <-- add this!
  onResize: (
    section: "vacation" | "sick" | "service",
    itemName: string,
    itemType: ItemType,
    edge: "left" | "right",
    dayDelta: number
  ) => void;
}

// helpers
const itemExists = (
  arr: CalendarItem[] | undefined,
  name: string,
  type: ItemType
) => !!arr?.some((i) => i.name === name && i.type === type);


// ---- Helper: collect all unavailable resource names ----
export function getAllUnavailableResourceNames(data: CalendarData): string[] {
  const names = new Set<string>();
  for (const k of Object.keys(data)) {
    // Only consider vacation-*, sick-*, service-*
    if (
      k.startsWith("vacation-") ||
      k.startsWith("sick-") ||
      k.startsWith("service-")
    ) {
      (data[k] || []).forEach((it) => names.add(it.name));
    }
  }
  return Array.from(names);
}

const TimeOffScheduler: React.FC<Props> = ({
  weekDays,
  scrollRef,
  data,
  onDragStart,
  onDrop,
  uid,
  onRemoveResource,
  onResize,
}) => {
  const [collapsed, setCollapsed] = React.useState({
    vacation: false,
    sick: false,
    service: false,
  });
  const [open, setOpen] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const OPEN_MAX_PX = 260;
  const localScrollRef = React.useRef<HTMLDivElement>(null);
  
    React.useEffect(() => {
      const gridEl = scrollRef.current;
      const footerEl = localScrollRef.current;
      if (!gridEl || !footerEl) return;

      const sync = () => (footerEl.scrollLeft = gridEl.scrollLeft);
      gridEl.addEventListener("scroll", sync);
      return () => gridEl.removeEventListener("scroll", sync);
    }, [scrollRef]);

  const CELL_MIN_WIDTH = 160; // or whatever your cell width is

  function startResize(
    e: React.MouseEvent<HTMLDivElement>,
    edge: "left" | "right",
    section: "vacation" | "sick" | "service",
    itemName: string,
    itemType: ItemType
  ) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const cellEl =
      (e.currentTarget.parentElement?.parentElement as HTMLElement) || null;
    const cellWidth = cellEl ? cellEl.offsetWidth : CELL_MIN_WIDTH;

    const onMouseMove = (mv: MouseEvent) => mv.preventDefault();

    const onMouseUp = (up: MouseEvent) => {
      const diffX = up.clientX - startX;
      const dayDelta =
        edge === "right"
          ? Math.round(diffX / cellWidth)
          : Math.round(-diffX / cellWidth);

      onResize(section, itemName, itemType, edge, dayDelta);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  function renderResizeHandles(
    section: "vacation" | "sick" | "service",
    itemName: string,
    itemType: ItemType
  ) {
    return (
      <>
        <div
          className="absolute left-0 top-0 h-full w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 z-20"
          onMouseDown={(e) =>
            startResize(e, "left", section, itemName, itemType)
          }
        />
        <div
          className="absolute right-0 top-0 h-full w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 z-20"
          onMouseDown={(e) =>
            startResize(e, "right", section, itemName, itemType)
          }
        />
      </>
    );
  }


  const unavailableCount = React.useMemo(() => {
    return getAllUnavailableResourceNames(data).length;
  }, [data]);

  // Show error message for 2 seconds
  React.useEffect(() => {
    if (errorMsg) {
      const timeout = setTimeout(() => setErrorMsg(null), 2000);
      return () => clearTimeout(timeout);
    }
  }, [errorMsg]);

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropHere = async (
    e: React.DragEvent<HTMLDivElement>,
    targetKey: string
  ) => {
    e.preventDefault();
    onDrop(targetKey); // local state update

    console.log("In the handleDropHere function")

    // Get the resource details (you may need to adapt this depending on how your drag works)
    const draggedName = e.dataTransfer.getData("text/plain");
    //  let itemType = e.dataTransfer.getData("application/x-item-type");
    let droppedItem: CalendarItem | undefined;
    for (const items of Object.values(data)) {
      const found = items.find((it) => it.name === draggedName);
      if (found) {
        droppedItem = found;
        break;
      }
    }
    if (!droppedItem) return; 

    // Save to Firebase
    if (uid) {
      await addResourceToTimeoffCell(db, uid, targetKey, droppedItem);
    }
  };

  // --- NEW: Only allow person in Vacation section ---
  const handleDropVacation = async (
    e: React.DragEvent<HTMLDivElement>,
    targetKey: string
  ) => {
    e.preventDefault();

    let itemType =
      e.dataTransfer.getData("application/x-item-type") ||
      e.dataTransfer.getData("text/item-type");
    const draggedName = e.dataTransfer.getData("text/plain");
    let droppedItem: CalendarItem | undefined;

    if (!itemType) {
      for (const items of Object.values(data)) {
        const found = items.find((it) => it.name === draggedName);
        if (found) {
          itemType = found.type;
          droppedItem = found;
          break;
        }
      }
    } else {
      for (const items of Object.values(data)) {
        const found = items.find((it) => it.name === draggedName);
        if (found) {
          droppedItem = found;
          break;
        }
      }
    }

    if (itemType !== "person") {
      setErrorMsg("Only employees can be added to the Vacation section.");
      return;
    }

    onDrop(targetKey);
    if (uid && droppedItem) {
      await addResourceToTimeoffCell(db, uid, targetKey, droppedItem);
    }
  };

  // --- NEW: Only allow person in Sick section ---
  const handleDropSick = async (
    e: React.DragEvent<HTMLDivElement>,
    targetKey: string
  ) => {
    e.preventDefault();

    let itemType =
      e.dataTransfer.getData("application/x-item-type") ||
      e.dataTransfer.getData("text/item-type");
    const draggedName = e.dataTransfer.getData("text/plain");
    let droppedItem: CalendarItem | undefined;

    if (!itemType) {
      for (const items of Object.values(data)) {
        const found = items.find((it) => it.name === draggedName);
        if (found) {
          itemType = found.type;
          droppedItem = found;
          break;
        }
      }
    } else {
      for (const items of Object.values(data)) {
        const found = items.find((it) => it.name === draggedName);
        if (found) {
          droppedItem = found;
          break;
        }
      }
    }

    if (itemType !== "person") {
      setErrorMsg("Only employees can be added to the Sick section.");
      return;
    }

    onDrop(targetKey);
    if (uid && droppedItem) {
      await addResourceToTimeoffCell(db, uid, targetKey, droppedItem);
    }
  };

  // This handles the drop for service (machines only) and supports drags from contract cells!
  const handleDropService = async (
    e: React.DragEvent<HTMLDivElement>,
    targetKey: string
  ) => {
    e.preventDefault();

    // 1. Try to get type from dataTransfer
    let itemType =
      e.dataTransfer.getData("application/x-item-type") ||
      e.dataTransfer.getData("text/item-type");

    // Get the resource name
    const draggedName = e.dataTransfer.getData("text/plain");
    let droppedItem: CalendarItem | undefined;

    // 2. If not found, get name and look up type from data
    if (!itemType) {
      for (const items of Object.values(data)) {
        const found = items.find((it) => it.name === draggedName);
        if (found) {
          itemType = found.type;
          droppedItem = found;
          break;
        }
      }
    } else {
      // Even if itemType is set, let's get the actual item (if possible)
      for (const items of Object.values(data)) {
        const found = items.find((it) => it.name === draggedName);
        if (found) {
          droppedItem = found;
          break;
        }
      }
    }

    // Extract date from targetKey
    let dropDate = "";
    console.log(dropDate);
    const m = targetKey.match(/^service-(\d{4}-\d{2}-\d{2})$/);
    if (m) {
      dropDate = m[1];
    }

    // Print info
    // console.log(`Dropped resource:`, {
    //   name: draggedName,
    //   type: itemType,
    //   dateFromTargetKey: dropDate,
    //   resourceStartDate: droppedItem?.startDate,
    //   fullResource: droppedItem,
    // });

    if (
      itemType !== "machine" &&
      itemType !== "tool" &&
      itemType !== "machines"
    ) {
      setErrorMsg("Only machines can be added to the Service section.");
      return;
    }

    onDrop(targetKey); // local state update

    // Save to Firebase
    if (uid && droppedItem) {
      await addResourceToTimeoffCell(db, uid, targetKey, droppedItem);
    }
  };

  const handleItemDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    itemName: string,
    sourceKey: string,
    itemType: ItemType
  ) => {
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", itemName);
      e.dataTransfer.setData("application/x-item-type", itemType);
    } catch {}
    onDragStart(itemName, sourceKey, itemType);
  };

async function handleRemoveTimeOffResource(cellKeyL: any, item: any) {
  onRemoveResource(cellKeyL, item);

  if (!uid) return;
  try {
    console.log("Removing from Firebase:", cellKeyL, item);
    await removeResourceFromTimeoffCell(db, uid, cellKeyL, item);
  } catch (err) {
    console.error("Failed to remove resource from Firebase:", err);
  }
}


  // ---- Row: accepts an optional customDropHandler for Service ----
  const Row = ({
    label,
    rowKeyPrefix,
    isCollapsed,
    onToggle,
    customDropHandler,
  }: {
    label: "Vacation" | "Sick" | "Service";
    rowKeyPrefix: "vacation" | "sick" | "service";
    isCollapsed: boolean;
    onToggle: () => void;
    customDropHandler?: (
      e: React.DragEvent<HTMLDivElement>,
      targetKey: string
    ) => void;
  }) => (
    <div className="w-full">
      <div
        className="flex flex-col items-start gap-x-2"
        style={{
          gridTemplateColumns: `120px repeat(${weekDays.length}, minmax(120px, 1fr))`,
        }}
      >
        <div className="py-1.5 pr-2">
          <button
            type="button"
            onClick={onToggle}
            className="text-[13px] font-medium text-gray-800 inline-flex items-center gap-1"
            aria-label={`Toggle ${label}`}
          >
            {label}
            {isCollapsed ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>
        </div>

        <div className="flex gap-1">

        {weekDays.map(({ key }, weekIdx) => {
          const cellKey = `${rowKeyPrefix}-${key}`;
          return (
            <div
              key={cellKey}
              className="px-2 py-2 w-40 min-h-24"
              onDragOver={handleDragOver}
              onDrop={
                customDropHandler
                  ? (e) => customDropHandler(e, cellKey)
                  : (e) => handleDropHere(e, cellKey)
              }
            >
              {!isCollapsed && (
                <div className="flex flex-wrap gap-2">
                  {data[cellKey]?.map((item, idx) => {
                    // Compute joinsLeft and joinsRight for this item
                    const prevCellKey =
                      weekIdx > 0
                        ? `${rowKeyPrefix}-${weekDays[weekIdx - 1].key}`
                        : "";
                    const nextCellKey =
                      weekIdx < weekDays.length - 1
                        ? `${rowKeyPrefix}-${weekDays[weekIdx + 1].key}`
                        : "";

                    const joinsLeft = itemExists(
                      data[prevCellKey],
                      item.name,
                      item.type
                    );
                    const joinsRight = itemExists(
                      data[nextCellKey],
                      item.name,
                      item.type
                    );

                    return (
                      <div
                        key={`${cellKey}-${item.type}-${item.name}-timeoff-${idx}-${weekIdx}`}
                        draggable
                        style={
                          { WebkitUserDrag: "element" } as React.CSSProperties
                        }
                        onDragStart={(e) =>
                          handleItemDragStart(e, item.name, cellKey, item.type)
                        }
                        className={[
                          "relative flex items-center gap-1 px-2 py-2 w-full justify-center rounded-lg text-xs font-medium select-none cursor-grab active:cursor-grabbing group",
                          "shadow-[0_1px_0_rgba(0,0,0,0.03)] ",
                          item.type === "person"
                            ? "bg-sky-100 text-sky-700 ring-sky-200"
                            : item.type === "machine"
                            ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                            : "bg-amber-50 text-amber-800 ring-amber-200",
                          joinsLeft ? "-ml-5 border-l-0 rounded-l-none" : "",
                          joinsRight ? "rounded-r-none" : "",
                        ].join(" ")}
                        title={item.note || ""}
                      >
                        {renderResizeHandles(
                          rowKeyPrefix,
                          item.name,
                          item.type
                        )}
                        <span>{item.name}</span>
                        {!joinsRight && (
                            <button
                              type="button"
                              className="absolute -right-2 -top-1 p-[1px] rounded-full text-red-500 bg-white/80 hover:bg-red-100 transition"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveTimeOffResource(cellKey, item);
                              }}
                              title="Remove"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className={open ? "h-36" : "h-14"} />

      {/* ═════ Fixed footer bar ═════ */}
      <div className="fixed left-64 right-0 bottom-0 z-40">
        <div className="border-t border-rose-200 bg-rose-50/90">
          {/* Toggle button */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-full text-center py-2 text-[13px] font-medium text-rose-600 hover:text-rose-700 inline-flex items-center justify-center gap-1"
          >
            {getAllUnavailableResourceNames(data).length} unavailable resources
            {open ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {/* Collapsible body (vertical) */}
          <div
            className="transition-[max-height] duration-300 ease-in-out overflow-y-auto"
            style={{ maxHeight: open ? OPEN_MAX_PX : 0 }}
          >
            {/* Horizontal scroll container (sync’ed) */}
            <div
              ref={localScrollRef}
              className="overflow-x-auto scrollbar-hide"
            >
              <div className="px-3 pb-3 min-w-max">
                <div className="rounded-xl bg-rose-50 ring-1 ring-rose-200/60 px-3 py-2">
                  {/* ───────── Rows ───────── */}
                  <Row
                    label="Vacation"
                    rowKeyPrefix="vacation"
                    isCollapsed={collapsed.vacation}
                    onToggle={() =>
                      setCollapsed((s) => ({ ...s, vacation: !s.vacation }))
                    }
                    customDropHandler={handleDropVacation}
                  />
                  <div className="h-2" />
                  <Row
                    label="Sick"
                    rowKeyPrefix="sick"
                    isCollapsed={collapsed.sick}
                    onToggle={() =>
                      setCollapsed((s) => ({ ...s, sick: !s.sick }))
                    }
                    customDropHandler={handleDropSick}
                  />
                  <div className="h-2" />
                  <Row
                    label="Service"
                    rowKeyPrefix="service"
                    isCollapsed={collapsed.service}
                    onToggle={() =>
                      setCollapsed((s) => ({ ...s, service: !s.service }))
                    }
                    customDropHandler={handleDropService}
                  />
                </div>

                {/* Error bubble */}
                {errorMsg && (
                  <div className="fixed left-1/2 -translate-x-1/2 bottom-16 z-50">
                    <div className="px-4 py-2 bg-red-600 text-white rounded-xl shadow-lg text-sm font-semibold">
                      {errorMsg}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enable native drag image for Chromium */}
      <style>{`[draggable="true"]{ -webkit-user-drag: element !important; }`}</style>
    </>
  );
};

export default TimeOffScheduler;
