import React, { useEffect, useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import EditContractForm from "../pages/EditContract";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useNavigate } from "react-router-dom";
import { StickyNote } from "lucide-react";


/* ---------- Types ---------- */
export type ItemType = "person" | "machine" | "tool";

export type CalendarItem = {
  endDate: any;
  startDate: any;
  name: string;
  type: ItemType;
  color?: string;
  children?: CalendarItem[];
  assignedDates?: string[];
  __parent?: string;
  workingRelation?: string;
  quickNote?: string;
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
  resourceIndex?: Record<
    string,
    {
      category: string;
      id: string;
      type: "employee" | "machine";
      workingRelation?: string;
      quickNote?: string;
    }
  >;
  globalResourceCounts: Record<string, number>;
}

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

const colourForWorkingRelation = (wr?: string) => {
  switch (wr) {
    case "full-time":
      return "bg-[#38BDF826]  text-[#0369A1]";
    case "part-time":
      return "bg-[#ECFDF5]  text-[#047857]";
    case "book-off-time":
      return "bg-[#FF7FF226] text-[#A1008C]";
    default:
      return "bg-gray-100 text-gray-600"; // fallback
  }
};

const badgeColorsForWorkingRelation = (wr?: string) => {
  switch (wr) {
    case "full-time":
      return {  text: "#0369A1" }; // light blue
    case "part-time":
      return {  text: "#047857" }; // light green
    case "book-off-time":
      return {  text: "#A1008C" }; // light pink
    default:
      return { bg: "#E5E7EB", text: "#4B5563" }; // gray fallback
  }
};


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
  // onMachineInfo,
  // unavailableResourceNames ,
  // onUnavailableDrop,
  timelineDays = [],
  scheduledStartISO,
  scheduledEndISO,
  resourceIndex,
  globalResourceCounts,
}) => {
  const resourceSOCountByDate = React.useMemo(
    () => globalResourceCounts,
    [globalResourceCounts]
  );

  // console.log("Resource Index",resourceIndex);

  const navigate = useNavigate();

   const [showErrorModal, setShowErrorModal] = useState(false);
   const [errorMessage, setErrorMessage] = useState("");


  const [noteHoverTimer, setNoteHoverTimer] = useState<NodeJS.Timeout | null>(
    null
  );
  const [noteModal, setNoteModal] = useState<null | { name: string; note: string }>(null);
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
    });
    return () => authUnsub();
  }, []);


  const [collapsedRows, setCollapsedRows] = React.useState<
    Record<string, boolean>
  >({});

  const toggleRow = (rowKey: string) =>
    setCollapsedRows((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }));

  const CELL_MIN_WIDTH = 180;


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
    onDropToMachine(targetKey, machineName);
  };


  const closeErrorModal = () => {
    setShowErrorModal(false);
    setErrorMessage(""); // Reset the error message
  };

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        // Check if the click is outside the modal content
        const modalContent = document.getElementById("errorModalContent");
        if (modalContent && !modalContent.contains(event.target as Node)) {
          closeErrorModal();
        }
      };

      if (showErrorModal) {
        // Add event listener when the modal is shown
        document.addEventListener("mousedown", handleClickOutside);
      } else {
        // Remove the event listener when the modal is closed
        document.removeEventListener("mousedown", handleClickOutside);
      }

      // Cleanup on component unmount
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [showErrorModal]);

  /** Invoked by every Info icon in a chip */
  const handleResourceInfo = (resourceName: string) => {
    const meta = resourceIndex?.[resourceName];
    if (!meta) return; // not found – silently ignore

    const { category, id, type } = meta;
    if (type === "employee") {
      navigate(`/employee-preview/${category}/${id}`);
    } else if (type === "machine") {
      navigate(`/machine-preview/${category}/${id}`);
    }
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

    const countAcrossSpan = (
      // span: { dayKeys: string[] },
      soId: string,
      resourceName: string,
      startDate: string,
      endDate: string
    ) => {
      const key = `${soId}-${resourceName}-${startDate}-${endDate}`;
      // console.log(span);
      return resourceSOCountByDate[key] ?? 1;
    };

    // Helper for rendering chips (either normal or inside machines)
    // Helper for rendering chips (either normal or inside machines)
    function renderChip(
      span: ChipToRender,
      idx: number,
      cellKeyFirst: string,
      parentStartIdx?: number // pass this when rendering inside a machine chip
    ) {
      // --- FIX STARTS HERE: DERIVE DATES FROM GRID INDICES ---
      // We use 'days' (visibleDays) because span.startIdx is an index into that array
      const sDate = days[span.startIdx].key;
      const eDate = days[span.endIdx].key;
      // -------------------------------------------------------

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

        // FIX: Use calculated sDate/eDate instead of c.startDate/c.endDate
        const maxCount = countAcrossSpan(soId, c.name, sDate, eDate);
        const showCount = maxCount > 1 ? maxCount : null;

        const note = resourceIndex?.[c.name]?.quickNote;

        return (
          <div
            key={`machinechild-chip-${span.machineName}-${c.type}-${c.name}-${idx}`}
            className={[
              "px-2 py-1 rounded-lg text-sm font-medium ",
              c.type === "person"
                ? colourForWorkingRelation(
                    resourceIndex?.[c.name]?.workingRelation
                  )
                : colourForWorkingRelation(c.type),
            ].join(" ")}
            style={{
              gridColumnStart: gridStart,
              gridColumnEnd: gridEnd,
              position: "relative",
              zIndex: 2,
              marginTop: 2,
              marginBottom: 2,
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
          >
            <div className="font-medium flex justify-center items-center gap-2 w-full">
              {showCount && (
                <span
                  className="text-[12px] font-semibold  rounded-full"
                  style={{
                    background: badgeColorsForWorkingRelation(
                      resourceIndex?.[c.name]?.workingRelation
                    ).bg,
                    color: badgeColorsForWorkingRelation(
                      resourceIndex?.[c.name]?.workingRelation
                    ).text,
                  }}
                >
                  {showCount}
                </span>
              )}

              <span className="mx-auto">{c.name}</span>
            </div>
            {/* ... rest of machine child note logic ... */}
            {note ? (
              <button
                type="button"
                aria-label="Quick note"
                className="absolute top-0.5 right-0.5 p-0.5 text-slate-600 hover:text-slate-800 cursor-pointer"
                draggable={false}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setNoteModal({ name: c.name, note });
                }}
                onMouseEnter={() => {
                  const timer = setTimeout(
                    () => setNoteModal({ name: c.name, note }),
                    1000
                  );
                  setNoteHoverTimer(timer);
                }}
                onMouseLeave={() => {
                  if (noteHoverTimer) {
                    clearTimeout(noteHoverTimer);
                    setNoteHoverTimer(null);
                  }
                }}
              >
                <StickyNote className="h-3.5 w-3.5" />
              </button>
            ) : (
              (c.type === "person" || c.type === "machine") && (
                <button
                  type="button"
                  aria-label={`${c.type} info`}
                  className="absolute top-0.5 right-0.5 p-0.5 text-slate-500 hover:text-slate-700 cursor-pointer"
                  draggable={false}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleResourceInfo(c.name);
                  }}
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              )
            )}
          </div>
        );
      }

      // Person, tool, or machine chip
      const resource = span.item;
      const isMachine = resource.type === "machine";

      // Machine chip
      if (isMachine) {
        // FIX: Use calculated sDate/eDate
        const machineCount = countAcrossSpan(soId, resource.name, sDate, eDate);

        return (
          <div
            key={`span-chip-machine-${resource.name}-${idx}`}
            className={machineContainerCls()}
            style={{
              background: "#FFFBEB",
              gridColumnStart: span.startIdx + 1,
              gridColumnEnd: span.endIdx + 2,
              position: "relative",
              zIndex: 2,
              marginTop: 2,
              marginBottom: 2,
              maxWidth: "90%",
            }}
          >
            {/* ... inside machine render logic (unchanged except variables) ... */}
            {renderResizeHandles(soId, resource.name, "machine")}
            <div
              className="px-2 py-1.5 pr-7 text-xs font-medium text-[#B45309] cursor-move select-none flex items-center"
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
            >
              {machineCount > 1 && (
                <span className="text-[12px] text-[#B45309] font-semibold px-1.5 py-0.5 rounded-full mr-2">
                  {machineCount}
                </span>
              )}
              {resource.name}
            </div>
            {/* ... rest of machine internal structure ... */}
            <button
              type="button"
              aria-label="Machine info"
              draggable={false}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleResourceInfo(resource.name);
              }}
              className="absolute cursor-pointer top-1.5 right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-500"
              title="Machine details"
            >
              <Info className="h-3.5 w-3.5" />
            </button>

            {/* Machine Drop Zone Grid */}
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
            </div>
          </div>
        );
      }

      // Regular chip (person or tool)
      const name = resource.name;

      // FIX: Use calculated sDate/eDate
      const maxCount = countAcrossSpan(soId, name, sDate, eDate);
      const showCount = maxCount > 1 ? maxCount : null;
      const note = resourceIndex?.[name]?.quickNote;

      return (
        <div
          key={`span-chip-${resource.type}-${resource.name}-${idx}`}
          className={[
            "px-2 py-1 rounded-lg text-sm font-medium ",
            resource.type === "person"
              ? colourForWorkingRelation(
                  resourceIndex?.[resource.name]?.workingRelation
                )
              : colourForWorkingRelation(resource.type),
          ].join(" ")}
          style={{
            gridColumnStart: span.startIdx + 1,
            gridColumnEnd: span.endIdx + 2,
            position: "relative",
            zIndex: 2,
            marginTop: 2,
            marginBottom: 2,
            height: "30px",
            maxWidth: span.startIdx === span.endIdx ? "90%" : "97%",
          }}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", resource.name);
            e.dataTransfer.setData("application/x-item-type", resource.type);
            onDragStart(resource.name, cellKeyFirst, resource.type);
          }}
        >
          {renderResizeHandles(soId, resource.name, resource.type)}
          <div className="font-medium flex justify-center items-center gap-2 w-full">
            {showCount && (
              <span
                className="text-[12px] font-semibold  rounded-full"
                style={{
                  background: badgeColorsForWorkingRelation(
                    resourceIndex?.[resource.name]?.workingRelation
                  ).bg,
                  color: badgeColorsForWorkingRelation(
                    resourceIndex?.[resource.name]?.workingRelation
                  ).text,
                }}
              >
                {showCount}
              </span>
            )}

            <span className="mx-auto">{resource.name}</span>
          </div>
          {/* ... Note and Info logic (unchanged) ... */}
          {note ? (
            <button
              type="button"
              aria-label="Quick note"
              className="absolute top-0.5 right-0.5 p-0.5 text-slate-600 hover:text-slate-800 cursor-pointer"
              draggable={false}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setNoteModal({ name, note });
              }}
              onMouseEnter={() => {
                const timer = setTimeout(
                  () => setNoteModal({ name, note }),
                  1000
                );
                setNoteHoverTimer(timer);
              }}
              onMouseLeave={() => {
                if (noteHoverTimer) {
                  clearTimeout(noteHoverTimer);
                  setNoteHoverTimer(null);
                }
              }}
            >
              <StickyNote className="h-3.5 w-3.5" />
            </button>
          ) : (
            (resource.type === "person" || resource.type === "machine") && (
              <button
                type="button"
                aria-label={`${resource.type} info`}
                className="absolute cursor-pointer top-0.5 right-0.5 p-0.5 text-slate-500 hover:text-blue-900"
                draggable={false}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleResourceInfo(resource.name);
                }}
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            )
          )}
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
            {soNumber !== "Default SO" && <span>{soNumber}</span>}
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
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              const gridRect = e.currentTarget.getBoundingClientRect();
              const relX = e.clientX - gridRect.left;
              const colWidth = gridRect.width / visibleDays.length;
              const colIdx = Math.floor(relX / colWidth);
              const dayKey = visibleDays[colIdx]?.key || visibleDays[0]?.key;
              if (dayKey) {
                handleDrop(e, `${soId}-${dayKey}`);
              }
            }}
          >
            {/* Day drop cells (these serve as drop targets & backgrounds) */}
            {visibleDays.map((day, dayIdx) => {
              const cellKey = `${soId}-${day.key}`;
              // Determine if the current day is within the scheduled range
              const inRange = dayIdx >= startIdx && dayIdx <= endIdx;

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
                ></div>
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
    <>
      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div
            id="errorModalContent"
            className="bg-red-50 p-6 rounded-xl shadow-xl w-96 max-w-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold text-red-600">Error</div>
              <button
                className="text-lg text-red-600"
                onClick={closeErrorModal}
                aria-label="Close error modal"
              >
                ×
              </button>
            </div>
            <div className="text-red-800 text-sm mb-4">{errorMessage}</div>
            <button
              onClick={closeErrorModal}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <div
        className=" absolute bg-white border border-gray-200 rounded-lg shadow-sm min-h-[200px]"
        style={{
          width: containerWidthPx,
          left: offsetPx,
          top: 0,
        }}
      >
        {/* Show contract name at top from prop */}
        <div className="flex items-center justify-between text-lg font-semibold px-3 py-2 border-b border-gray-200">
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

        {noteModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center "
            onClick={() => setNoteModal(null)} // <-- closes when backdrop is clicked
          >
            <div
              className="relative bg-[#F8FBFF] border border-blue-200 rounded-2xl shadow-xl w-[370px] max-w-full px-6 py-4"
              onClick={(e) => e.stopPropagation()} // <-- prevents close when clicking inside modal
            >
              {/* Top row: name and info button */}
              <div className="flex items-start justify-between mb-1">
                <div className="w-full flex flex-col items-center">
                  <div className="text-[20px] font-semibold text-blue-700 text-center">
                    {noteModal.name}
                  </div>
                </div>
                {/* Info + Close */}
                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={() => {
                      handleResourceInfo(noteModal.name);
                      setNoteModal(null);
                    }}
                    aria-label="Resource Info"
                    className="text-slate-600 hover:text-slate-900"
                  >
                    <Info className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Optionally add contract & status row here if needed */}
              {/* ... */}

              <hr className="border-blue-100 my-2" />

              <div className="text-[15px] text-gray-700 leading-relaxed whitespace-pre-line mb-1">
                {noteModal.note}
              </div>
            </div>
          </div>
        )}

        {editingContractId && (
          <div
            // 1. Add "p-6" to create padding (space) around the modal on top/bottom
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-6"
            // 2. Close when clicking the background
            onClick={() => setEditingContractId(null)}
          >
            <div
              // 3. Set max-height and overflow-y-auto to enable scrolling inside this container
              className="bg-white rounded-xl shadow-2xl border p-0 w-full max-w-4xl flex flex-col relative max-h-full overflow-y-auto"
              // 4. Prevent the background click from triggering when clicking inside the white box
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute right-3 top-2 text-lg hover:bg-gray-100 rounded-full px-2 py-1 transition z-10"
                onClick={() => setEditingContractId(null)}
                tabIndex={0}
              >
                ×
              </button>
              <EditContractForm
                companyId={uid!}
                contractId={editingContractId}
                onUpdated={() => setEditingContractId(null)}
                // We don't need 'onClose' prop if the parent wrapper handles the closing
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ContractScheduler;
