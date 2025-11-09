import React, { useEffect, useState } from "react";
import { ChevronDown, Info, File } from "lucide-react";
import EditContractForm from "../pages/EditContract";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../../lib/firebase";

/* ---------- Types ---------- */
export type ItemType = "person" | "machine" | "tool";

export type CalendarItem = {
  endDate: any;
  startDate: any;
  name: string;
  type: ItemType;
  color?: string;
  note?: string;
  children?: CalendarItem[];
  assignedDates?: string[];
  __parent?: string;
};

export type CalendarData = Record<string, CalendarItem[]>;

/* resize callback */
export type ResizeFn = (
  soId: string,
  itemName: string,
  itemType: ItemType,
  edge: "left" | "right",
  dayDelta: number
) => void;

/* drag-and-drop signatures */
type ContractDragMeta = {
  childrenSnapshot?: CalendarItem[];
  childOf?: string;
};
type DragStartFn = (
  name: string,
  soId: string,
  type: ItemType,
  meta?: ContractDragMeta
) => void;
type DropFn = (targetKey: string) => void;
type DropToMachineFn = (targetKey: string, machineName: string) => void;

type WeekDay = { key: string; label: string; date: string };

/* ---------- Props ---------- */
interface Props {
  contractId?: string;
  contractName?: string;
  soList: { id: string; soNumber: string }[];
  data: CalendarData;
  onDragStart: DragStartFn;
  onDrop: DropFn;
  onDropToMachine: DropToMachineFn;
  onResize: ResizeFn;
  onMachineInfo?: (cellKey: string, machineName: string) => void;
  unavailableResourceNames?: string[];
  onUnavailableDrop?: (name: string) => void;
  rangeWithinWeek?: { startIdx: number; days: number };
  timelineDays?: { key: string; day: string; date: Date; isToday: boolean }[];
  scheduledStartISO?: string | null;
  scheduledEndISO?: string | null;
}

/* ---------- Helpers ---------- */
// const itemExists = (
//   arr: CalendarItem[] | undefined,
//   name: string,
//   type: ItemType
// ) => !!arr?.some((i) => i.name === name && i.type === type);

/* ---------- Helpers ---------- */
const getResourceSOCountByDate = (
  soList: any[],
  data: Record<string, CalendarItem[]>
) => {
  const countMap: Record<string, Record<string, number>> = {}; // { dateKey: { resourceName: count } }

  soList.forEach(({ id: soId }) => {
    Object.keys(data).forEach((cellKey) => {
      // Only check keys that belong to this SO
      if (cellKey.startsWith(soId + "-")) {
        const [, dateKey] = cellKey.split(`${soId}-`);
        const items = data[cellKey] || [];
        items.forEach((item) => {
          if (item.type === "person" || item.type === "machine") {
            countMap[dateKey] = countMap[dateKey] || {};
            countMap[dateKey][item.name] =
              (countMap[dateKey][item.name] || 0) + 1;
          }
        });
      }
    });
  });

  return countMap;
};

// New: Find spans of each resource across consecutive days
type ResourceSpan = {
  item: CalendarItem;
  type: ItemType;
  startIdx: number;
  endIdx: number;
  cellKeys: string[];
  dayKeys: string[];
  machineParent?: string; // for children inside machines
};

function findSpans(
  itemsPerDay: CalendarItem[][],
  weekDates: WeekDay[],
  soId: string,
  itemType: ItemType,
  parentMachineName?: string
) {
  const spans: ResourceSpan[] = [];
  const visited: Record<string, boolean> = {};

  for (let d = 0; d < weekDates.length; d++) {
    const items = itemsPerDay[d] || [];
    items.forEach((item) => {
      if (item.type !== itemType) return;
      // If inside a machine, only count those with the same parent machine
      if (parentMachineName && item["__parent"] !== parentMachineName) return;

      const spanKey = `${itemType}|${item.name}|${
        parentMachineName || ""
      }|${d}`;
      if (visited[spanKey]) return;

      // Start new span
      let end = d;
      const cellKeys = [`${soId}-${weekDates[d].key}`];
      const dayKeys = [weekDates[d].key];

      // Check consecutive
      for (let j = d + 1; j < weekDates.length; j++) {
        const nextItems = itemsPerDay[j] || [];
        const found = nextItems.find(
          (next) =>
            next.type === itemType &&
            next.name === item.name &&
            (!parentMachineName || next["__parent"] === parentMachineName)
        );
        if (!found) break;
        end = j;
        cellKeys.push(`${soId}-${weekDates[j].key}`);
        dayKeys.push(weekDates[j].key);
        visited[`${itemType}|${item.name}|${parentMachineName || ""}|${j}`] =
          true;
      }

      spans.push({
        item,
        type: itemType,
        startIdx: d,
        endIdx: end,
        cellKeys,
        dayKeys,
        machineParent: parentMachineName,
      });

      // Mark as visited
      for (let k = d; k <= end; k++) {
        visited[`${itemType}|${item.name}|${parentMachineName || ""}|${k}`] =
          true;
      }
    });
  }
  return spans;
}

/* ---------- Component ---------- */
const ContractScheduler: React.FC<Props> = ({
  contractId,
  contractName,
  soList,
  data,
  onDragStart,
  onDrop,
  onDropToMachine,
  onResize,
  onMachineInfo,
  unavailableResourceNames = [],
  onUnavailableDrop,
  timelineDays = [],
  scheduledStartISO,
  scheduledEndISO,
}) => {
  const resourceSOCountByDate = React.useMemo(() => {
    return getResourceSOCountByDate(soList, data);
  }, [soList, data]);

  // notes
  const [hoveredResource, setHoveredResource] = React.useState<{
    cellKey: string;
    name: string;
    type: ItemType;
    note?: string;
  } | null>(null);

  const [showNoteModal, setShowNoteModal] = React.useState(false);
  const [noteInput, setNoteInput] = React.useState("");
    const [editingContractId, setEditingContractId] = useState<string | null>(
      null
  );
  const [uid, setUid] = useState<string | null>(null);
  
  useEffect(() => {
    const authUnsub = onAuthStateChanged(auth, async (user: User | null) => {
    
      if (!user) {
        setUid(null);
        return;
      }
      setUid(user.uid);
    })
    return () => authUnsub();
  }, []);

  const handleSaveNote = () => {
    if (hoveredResource) {
      // You'll likely want to update your `data` here (lift up state/update parent, etc)
      // For demo, just close modal
      setShowNoteModal(false);
      setHoveredResource(null);
      setNoteInput("");
      alert("Note saved!");
    }
  };

  const [collapsedRows, setCollapsedRows] = React.useState<
    Record<string, boolean>
  >({});

  const toggleRow = (rowKey: string) =>
    setCollapsedRows((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }));

  const CELL_MIN_WIDTH = 180;

  // const getScheduledDays = (): WeekDay[] => {
  //   if (!scheduledStartISO || !scheduledEndISO || timelineDays.length === 0) {
  //     return [];
  //   }

  //   const scheduledDays: WeekDay[] = [];

  //   for (const timelineDay of timelineDays) {
  //     // Only include days within the scheduled range
  //     if (
  //       timelineDay.key >= scheduledStartISO &&
  //       timelineDay.key <= scheduledEndISO
  //     ) {
  //       scheduledDays.push({
  //         key: timelineDay.key,
  //         label: timelineDay.day.slice(0, 3), // "Mon", "Tue", etc.
  //         date: timelineDay.date.getDate().toString(),
  //       });
  //     }
  //   }

  //   return scheduledDays;
  // };

  /*  A. build one helper from the global timeline -------------------- */
  const weekDays: WeekDay[] = React.useMemo(
    () =>
      timelineDays.map((d) => ({
        key: d.key,
        label: d.day.slice(0, 3), // "Mon", "Tue" …
        date: d.date.getDate().toString(),
      })),
    [timelineDays]
  );

  /* ---------- Resize logic (unchanged) ---------- */
  const startResize = (
    e: React.MouseEvent<HTMLDivElement>,
    edge: "left" | "right",
    soId: string,
    itemName: string,
    itemType: ItemType
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    /* the handle’s parent is the chip itself */
    const chipEl = e.currentTarget.parentElement as HTMLElement; // 👈 NEW
    const cols =
      (parseInt(chipEl.style.gridColumnEnd) || 0) -
        (parseInt(chipEl.style.gridColumnStart) || 0) || 1; // 👈 NEW
    const cellWidth = chipEl.offsetWidth / cols || CELL_MIN_WIDTH;

    const onMouseMove = (mv: MouseEvent) => mv.preventDefault();

    const onMouseUp = (up: MouseEvent) => {
      const diffX = up.clientX - startX;
      const dayDelta =
        edge === "right"
          ? Math.round(diffX / cellWidth)
          : Math.round(-diffX / cellWidth);
      onResize(soId, itemName, itemType, edge, dayDelta);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  /* ---------- Styling helpers ---------- */
  const chipCls = (t: ItemType, joinsLeft = false, joinsRight = false) =>
    [
      "px-2 py-1.5 rounded-md text-xs cursor-move hover:shadow-sm transition-all duration-200 relative group",
      t === "person"
        ? "bg-blue-100 text-blue-800 border-blue-300/50"
        : t === "tool"
        ? "bg-amber-50 text-amber-800 border-amber-300/60"
        : "bg-green-100 text-green-800 border-green-300/50",
      joinsLeft ? "-ml-7 border-l-0 rounded-l-none" : "",
      joinsRight ? "rounded-r-none" : "",
      "flex items-center",
    ].join(" ");

  const machineContainerCls = (joinsLeft = false, joinsRight = false) =>
    [
      "relative bg-green-50  border-green-200/70 group",
      joinsLeft ? "-ml-7 border-l-0 rounded-l-none" : "rounded-l-lg",
      joinsRight ? "rounded-r-none" : "rounded-r-lg",
    ].join(" ");

  const renderResizeHandles = (
    soId: string,
    itemName: string,
    type: ItemType
  ) => (
    <>
      <div
        className="absolute left-0 top-0 h-full w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 z-20 pointer-events-auto"
        onMouseDown={(e) => {
          e.stopPropagation();
          startResize(e, "left", soId, itemName, type);
        }}
      />
      <div
        className="absolute right-0 top-0 h-full w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 z-20 pointer-events-auto"
        onMouseDown={(e) => {
          e.stopPropagation();
          startResize(e, "right", soId, itemName, type);
        }}
      />
    </>
  );

  /* ---------- Drag-and-drop handlers ---------- */
  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    targetKey: string
  ) => {
    e.preventDefault();
    let draggedName = "";
    try {
      draggedName = e.dataTransfer.getData("text/plain");
    } catch {}
    if (
      draggedName &&
      unavailableResourceNames.includes(draggedName) &&
      onUnavailableDrop
    ) {
      onUnavailableDrop(draggedName);
      return;
    }
    onDrop(targetKey);
  };

  const handleDropToMachine = (
    e: React.DragEvent<HTMLDivElement>,
    targetKey: string,
    machineName: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    let draggedName = "";
    try {
      draggedName = e.dataTransfer.getData("text/plain");
    } catch {}
    if (
      draggedName &&
      unavailableResourceNames.includes(draggedName) &&
      onUnavailableDrop
    ) {
      onUnavailableDrop(draggedName);
      return;
    }
    onDropToMachine(targetKey, machineName);
  };

  /* ---------- Row renderer: Per SO ---------- */
  const renderSORow = (soId: string, soNumber: string) => {
    const days = visibleDays;   
    const isCollapsed = !!collapsedRows[soId];

    // Gather items for each cell/day in this SO
    const itemsPerDay: CalendarItem[][] = days.map((day) => {
      const cellKey = `${soId}-${day.key}`;
      return data[cellKey] || [];
    });

    // For machine children: attach __parent property so we can span children chips too
    const machineChildrenPerDay: { [machineName: string]: CalendarItem[][] } =
      {};
    days.forEach((day, dayIdx) => {
      const cellKey = `${soId}-${day.key}`;
      const cellItems = data[cellKey] || [];
      const machines = cellItems.filter((i) => i.type === "machine");
      machines.forEach((m) => {
        if (!machineChildrenPerDay[m.name])
          machineChildrenPerDay[m.name] = days.map(() => []);
        // Only include children whose span covers this day
        const childrenWithParent = (m.children || [])
          .filter((c) => {
            // If assignedDates exists, only show if current day is in assignedDates
            if (Array.isArray(c.assignedDates)) {
              return c.assignedDates.includes(day.key);
            }
            // fallback, include all if no assignedDates
            return true;
          })
          .map((c) => ({
            ...c,
            __parent: m.name,
          }));
        machineChildrenPerDay[m.name][dayIdx] = childrenWithParent;
      });
    });

    // Find all resource spans (person/tool/machine)
    const personSpans = findSpans(itemsPerDay, days, soId, "person");
    const toolSpans = findSpans(itemsPerDay, days, soId, "tool");
    const machineSpans = findSpans(itemsPerDay, days, soId, "machine");

    // For machine children, find their spans within machine context
    const machineChildrenSpans: { [machine: string]: ResourceSpan[] } = {};
    Object.entries(machineChildrenPerDay).forEach(
      ([machineName, childrenItemsPerDay]) => {
        machineChildrenSpans[machineName] = findSpans(
          childrenItemsPerDay,
          days,
          soId,
          "person",
          machineName
        );
      }
    );

    // For grid overlays: collect all spanning chips with their type, start/end, etc.
    type ChipToRender = ResourceSpan & {
      isMachineChild?: boolean;
      machineName?: string;
    };
    const chipsToRender: ChipToRender[] = [
      ...machineSpans,
      ...personSpans,
      ...toolSpans,
      ...Object.entries(machineChildrenSpans).flatMap(([machineName, arr]) =>
        arr.map((s) => ({ ...s, isMachineChild: true, machineName }))
      ),
    ];

    // Helper for rendering chips (either normal or inside machines)
    function renderChip(
      span: ChipToRender,
      idx: number,
      cellKeyFirst: string,
      parentStartIdx?: number // pass this when rendering inside a machine chip
    ) {
      // Machine child (employee inside a machine)
      if (span.isMachineChild) {
        const c = span.item;

        // Calculate grid columns relative to parent machine's span
        const gridStart =
          parentStartIdx !== undefined
            ? span.startIdx - parentStartIdx + 1
            : span.startIdx + 1;
        const gridEnd =
          parentStartIdx !== undefined
            ? span.endIdx - parentStartIdx + 2
            : span.endIdx + 2;

        // Always use global count for this resource on the date
        const dateKey = days[span.startIdx].key;
        const globalCount = resourceSOCountByDate[dateKey]?.[c.name];
        const showCount = globalCount > 1 ? globalCount : null;

        return (
          <div
            key={`machinechild-chip-${span.machineName}-${c.type}-${c.name}-${idx}`}
            className={chipCls(c.type)}
            style={{
              gridColumnStart: gridStart,
              gridColumnEnd: gridEnd,
              position: "relative",
              zIndex: 2,
              marginTop: 2,
              marginBottom: 2,
              // Set maxWidth based on whether the resource spans a single day or multiple days
              maxWidth: span.startIdx === span.endIdx ? "80%" : "85%",
            }}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", c.name);
              e.dataTransfer.setData("application/x-item-type", c.type);
              onDragStart(c.name, cellKeyFirst, c.type, {
                childOf: span.machineName,
              });
            }}
            title={c.note || ""}
          >
            <div className="font-medium flex justify-center items-center gap-2 w-full">
              {showCount && (
                <span className="text-[10px] bg-blue-200 text-blue-900 font-semibold px-1.5 py-0.5 rounded-full">
                  {showCount}
                </span>
              )}
              <span className="mx-auto">{c.name}</span>
              {c.note && (
                <File className="ml-1 inline-block text-blue-500" size={16} />
              )}
            </div>
            {c.note && <div className="text-xs opacity-75 mt-1">{c.note}</div>}
          </div>
        );
      }

      // Person, tool, or machine chip
      const resource = span.item;
      //  const isPerson = resource.type === "person";
      const isMachine = resource.type === "machine";

      // Machine chip: renders children grid inside itself
      if (isMachine) {
        const machineCount =
          resourceSOCountByDate[weekDays[span.startIdx].key]?.[resource.name];
        return (
          <div
            key={`span-chip-machine-${resource.name}-${idx}`}
            className={machineContainerCls()}
            style={{
              gridColumnStart: span.startIdx + 1,
              gridColumnEnd: span.endIdx + 2,
              position: "relative",
              zIndex: 2,
              marginTop: 2,
              marginBottom: 2,
              maxWidth: "90%",
            }}
          >
            {renderResizeHandles(soId, resource.name, "machine")}
            <div
              className="px-2 py-1.5 pr-7 text-xs font-medium text-green-900 cursor-move select-none flex items-center"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", resource.name);
                e.dataTransfer.setData("application/x-item-type", "machine");
                onDragStart(resource.name, cellKeyFirst, "machine", {
                  childrenSnapshot: resource.children
                    ? [...resource.children]
                    : [],
                });
              }}
              title={resource.note || ""}
            >
              {machineCount > 1 && (
                <span className="text-[10px] bg-green-200 text-green-900 font-semibold px-1.5 py-0.5 rounded-full mr-2">
                  {machineCount}
                </span>
              )}
              {resource.name}
            </div>
            <button
              type="button"
              aria-label="Machine info"
              draggable={false}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMachineInfo?.(cellKeyFirst, resource.name);
              }}
              className="absolute top-1.5 right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-green-700"
              title="Machine details"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
            {/* Children grid: pass parentStartIdx for local positioning */}
            <div
              className="px-2 pb-2 pt-1 min-h-[40px] border-dashed border-2 border-transparent hover:border-green-300 transition-colors duration-200 grid relative"
              style={{
                gridTemplateColumns: `repeat(${days.length}, minmax(${CELL_MIN_WIDTH}px, 1fr))`,
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) =>
                handleDropToMachine(e, cellKeyFirst, resource.name)
              }
            >
              {chipsToRender
                .filter(
                  (childSpan) =>
                    childSpan.isMachineChild &&
                    childSpan.machineName === resource.name &&
                    childSpan.startIdx >= span.startIdx &&
                    childSpan.endIdx <= span.endIdx
                )
                .map((childSpan, cidx) =>
                  renderChip(
                    childSpan,
                    cidx,
                    `${soId}-${weekDays[childSpan.startIdx].key}`,
                    span.startIdx
                  )
                )}
              {(resource.children || []).length === 0 && (
                <div className="text-[11px] text-green-700/70 py-1 text-center italic">
                  {/* Drop employees here */}
                </div>
              )}
            </div>
          </div>
        );
      }

      // Regular chip (person or tool)
      const name = resource.name;
      const dateKey = weekDays[span.startIdx].key;
      const globalCount = resourceSOCountByDate[dateKey]?.[name];
      const showCount = globalCount > 1 ? globalCount : null;

      return (
        <div
          key={`span-chip-${resource.type}-${resource.name}-${idx}`}
          className={chipCls(resource.type)}
          style={{
            gridColumnStart: span.startIdx + 1,
            gridColumnEnd: span.endIdx + 2,
            position: "relative",
            zIndex: 2,
            marginTop: 2,
            marginBottom: 2,
            maxWidth: span.startIdx === span.endIdx ? "90%" : "100%",
          }}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", resource.name);
            e.dataTransfer.setData("application/x-item-type", resource.type);
            onDragStart(resource.name, cellKeyFirst, resource.type);
          }}
          title={resource.note || ""}
        >
          {renderResizeHandles(soId, resource.name, resource.type)}
          <div className="font-medium flex justify-center items-center gap-2 w-full">
            {showCount && (
              <span className="text-[10px] bg-blue-200 text-blue-900 font-semibold px-1.5 py-0.5 rounded-full">
                {showCount}
              </span>
            )}
            <span className="mx-auto">{resource.name}</span>
            {resource.note && (
              <File className="ml-1 inline-block text-blue-500" size={16} />
            )}
          </div>
        </div>
      );
    }

    // To overlay chips on grid, use CSS grid and render chips as direct children with gridColumnStart/End
    return (
      <div>
        {/* Row header: collapsible */}
        <div className="p-1">
          <button
            type="button"
            onClick={() => toggleRow(soId)}
            className="text-xs text-gray-500 flex items-center hover:text-gray-700 select-none"
            aria-expanded={!isCollapsed}
            aria-controls={`${soId}-grid`}
            title={isCollapsed ? "Expand row" : "Collapse row"}
          >
            <span>{soNumber}</span>
            <ChevronDown
              size={12}
              className={`ml-1 transition-transform duration-200 ${
                isCollapsed ? "-rotate-90" : "rotate-0"
              }`}
            />
          </button>
        </div>

        {/* Days */}
        {!isCollapsed && days.length > 0 && (
          <div
            id={`${soId}-grid`}
            className="grid relative"
            style={{
              gridTemplateColumns: `repeat(${visibleDays.length}, minmax(${CELL_MIN_WIDTH}px, 1fr))`,
            }}
          >
            {/* Day drop cells (these serve as drop targets & backgrounds) */}
            {visibleDays.map((day, dayIdx) => {
              const cellKey = `${soId}-${day.key}`;
              // Determine if the current day is within the scheduled range
              const inRange = dayIdx >= startIdx && dayIdx <= endIdx;
              // Find any machine in this cell (to render machine+children "inside" cell)
              // const items = data[cellKey] || [];
              // const machines = items.filter((i) => i.type === "machine");

              return (
                <div
                  key={cellKey}
                  className={[
                    "p-3 hover:bg-gray-25  min-h-[20px] relative",
                    inRange ? "bg-blue-50/40" : "",
                  ].join(" ")}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => handleDrop(e, cellKey)}
                >
                  {/* If there is a machine for this cell, render the machine container */}
                  {/* No machine chip rendering here. Just the drop cell contents. */}
                </div>
              );
            })}
            {/* Overlay resource chips for persons/tools, spanning columns */}
            {chipsToRender
              .filter((span) => !span.isMachineChild)
              .map((span, idx) => {
                // Only render the chip on the first day of its span
                if (span.startIdx >= 0 && days[span.startIdx]) {
                  return renderChip(
                    span,
                    idx,
                    `${soId}-${days[span.startIdx].key}`
                  );
                }
                return null;
              })}
          </div>
        )}
      </div>
    );
  };

  /* ---------- Render all SO rows ---------- */
  if (!contractId || !contractName) {
    return (
      <div className="w-full text-center text-gray-500 py-16">
        <div className="space-y-3">
          <div className="text-lg font-medium">No Contract Scheduled</div>
        </div>
      </div>
    );
  }

  // Determine which SOs to render
  const sosToRender =
    soList.length > 0
      ? soList
      : [
          {
            id: `${contractId}__default`,
            soNumber: contractName || "Contract",
          },
        ];

  /*  B. where does this contract start / end in that ruler? ---------- */
  const startIdx = scheduledStartISO
    ? weekDays.findIndex((d) => d.key === scheduledStartISO)
    : -1; // -1  ⇒  “not yet scheduled”

  const endIdx = scheduledEndISO
    ? weekDays.findIndex((d) => d.key === scheduledEndISO)
    : -1;

  /*  C. reject unscheduled rows early (optional) --------------------- */
  if (startIdx === -1 || endIdx === -1) {
    return (
      <div className="text-sm text-gray-500 italic px-3 py-4">
        Select a date range for this contract
      </div>
    );
  }
  /*  D. compute geometry for the row --------------------------------- */
  const offsetPx = startIdx * CELL_MIN_WIDTH;
  const contractDays = endIdx - startIdx + 1;
  const containerWidthPx = contractDays * CELL_MIN_WIDTH;

  /*  E. slice the period we really need for the chips ---------------- */
  const visibleDays = weekDays.slice(startIdx, endIdx + 1);


  return (
    <div
      className=" absolute bg-white border border-gray-200 rounded-lg shadow-sm min-h-[200px]"
      style={{
        width: containerWidthPx,
        left: offsetPx,
        top: 0,
      }}
    >
      {/* Show contract name at top from prop */}
      <div className="flex items-center justify-between text-lg font-semibold px-3 py-2 border-b border-gray-200 bg-gray-50">
        <span>{contractName}</span>
        <button
          type="button"
          aria-label="Contract info"
          className="ml-2 text-slate-400 hover:text-slate-700 rounded-full p-1 transition"
          onClick={() => setEditingContractId(contractId)}
          title="Contract details"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>

      <div className="p-2">
        {weekDays.length > 0 ? (
          sosToRender.map((so, soIdx) => (
            <div
              key={`${so.id}-so-${soIdx}`}
              className=" border-b border-gray-100 last:border-b-0 py-2"
            >
              {renderSORow(so.id, so.soNumber)}
            </div>
          ))
        ) : (
          <div className="text-sm text-gray-500 italic px-3 py-4 text-center">
            {scheduledStartISO && scheduledEndISO
              ? "No days in the scheduled range"
              : "Please select a date range for this contract"}
          </div>
        )}

        {/* Show loading state if no SOs and still fetching */}
        {soList.length === 0 && contractId && weekDays.length > 0 && (
          <div className="text-sm text-gray-500 italic px-3 py-2 text-center">
            Loading SOs...
          </div>
        )}
      </div>

      {showNoteModal && hoveredResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-gray-50  border border-gray-200 rounded-xl shadow-2xl w-full max-w-sm px-6 py-5 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-semibold text-gray-700 flex items-center gap-2">
                <File className="w-5 h-5 text-blue-500" />
                Note for{" "}
                <span className="ml-1 font-bold text-blue-800">
                  {hoveredResource.name}
                </span>
              </div>
              <button
                className="rounded-full p-1 hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition"
                onClick={() => {
                  setShowNoteModal(false);
                  setHoveredResource(null);
                  setNoteInput("");
                }}
                aria-label="Close"
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 18 18">
                  <path
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    d="M5 5l8 8M13 5l-8 8"
                  />
                </svg>
              </button>
            </div>
            <textarea
              className="w-full min-h-[80px] max-h-40 resize-none rounded-md border border-gray-200 bg-white p-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition placeholder-gray-400"
              rows={4}
              placeholder="Write a quick note for this employee..."
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end mt-5 gap-2">
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setHoveredResource(null);
                  setNoteInput("");
                }}
                className="px-3 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                className="px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm font-semibold shadow-sm transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {editingContractId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border p-0 w-full max-w-4xl flex flex-col relative">
            <button
              className="absolute right-3 top-2 text-lg hover:bg-gray-100 rounded-full px-2 py-1 transition"
              onClick={() => setEditingContractId(null)}
              tabIndex={0}
            >
              ×
            </button>
            <EditContractForm
              companyId={uid!}
              contractId={editingContractId}
              onUpdated={() => setEditingContractId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractScheduler;
