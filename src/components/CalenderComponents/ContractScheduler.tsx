import React from "react";
import { ChevronDown, Info, File } from "lucide-react";



/* ---------- Types ---------- */
export type ItemType = "person" | "machine" | "tool";

export type CalendarItem = {
  name: string;
  type: ItemType;
  color?: string;
  note?: string;
  children?: CalendarItem[];
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
const itemExists = (
  arr: CalendarItem[] | undefined,
  name: string,
  type: ItemType
) => !!arr?.some((i) => i.name === name && i.type === type);

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

  // notes
  const [hoveredResource, setHoveredResource] = React.useState<{
    cellKey: string;
    name: string;
    type: ItemType;
    note?: string;
  } | null>(null);

  const [showNoteModal, setShowNoteModal] = React.useState(false);
  const [noteInput, setNoteInput] = React.useState("");
  // const hoverTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Helper to save note (replace this with a prop callback to update parent state if needed)
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

  /* ---------- Dynamic days based on scheduled range ---------- */
  // Dynamic days based on scheduled range
  const getScheduledDays = (): WeekDay[] => {
    if (!scheduledStartISO || !scheduledEndISO || timelineDays.length === 0) {
      return [];
    }

    const scheduledDays: WeekDay[] = [];

    for (const timelineDay of timelineDays) {
      // Only include days within the scheduled range
      if (
        timelineDay.key >= scheduledStartISO &&
        timelineDay.key <= scheduledEndISO
      ) {
        scheduledDays.push({
          key: timelineDay.key,
          label: timelineDay.day.slice(0, 3), // "Mon", "Tue", etc.
          date: timelineDay.date.getDate().toString(),
        });
      }
    }

    return scheduledDays;
  };

const weekDays: WeekDay[] = getScheduledDays();

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
      if (dayDelta > 0) {
        onResize(soId, itemName, itemType, edge, dayDelta);
      }
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
        className="absolute left-0 top-0 h-full w-1 cursor-ew-resize opacity-0 group-hover:opacity-100"
        onMouseDown={(e) => startResize(e, "left", soId, itemName, type)}
      />
      <div
        className="absolute right-0 top-0 h-full w-1 cursor-ew-resize opacity-0 group-hover:opacity-100"
        onMouseDown={(e) => startResize(e, "right", soId, itemName, type)}
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
    // console.log("handleDrop", targetKey);
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
    e.stopPropagation(); // 👈 prevents the parent cell's onDrop from firing
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
    const weekDates = weekDays; // always Mon-Sun
    const isCollapsed = !!collapsedRows[soId];

    // Find the indices of the scheduled start and end dates in the timelineDays array
    const startIdx = timelineDays.findIndex((d) => d.key === scheduledStartISO);
    const endIdx = timelineDays.findIndex((d) => d.key === scheduledEndISO);

    // console.log("renderSORow", soId, soNumber, startIdx, endIdx);

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
        {!isCollapsed && weekDates.length > 0 && (
          <div
            id={`${soId}-grid`}
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${weekDates.length}, minmax(${CELL_MIN_WIDTH}px, 1fr))`,
            }}
          >
            {weekDates.map((day, dayIdx) => {
              const cellKey = `${soId}-${day.key}`; // SO-specific!
              // console.log("cellKey", cellKey);
              const items = data[cellKey] || [];
              const machines = items.filter((i) => i.type === "machine");
              const others = items.filter((i) => i.type !== "machine");

              // Determine if the current day is within the scheduled range
              const inRange = dayIdx >= startIdx && dayIdx <= endIdx;

              return (
                <div
                  key={cellKey}
                  className={[
                    "p-3 hover:bg-gray-25 transition-colors border border-transparent hover:border-gray-200 hover:border-dashed min-h-[80px]",
                    inRange ? "bg-blue-50/40" : "", // Highlight if in range
                  ].join(" ")}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => handleDrop(e, cellKey)}
                >
                  <div className="space-y-2">
                    {/* Render machines */}
                    {machines.map((m, midx) => {
                      const prevCellKey =
                        dayIdx > 0
                          ? `${soId}-${weekDates[dayIdx - 1].key}`
                          : "";
                      const nextCellKey =
                        dayIdx < weekDates.length - 1
                          ? `${soId}-${weekDates[dayIdx + 1].key}`
                          : "";

                      const joinsLeft = itemExists(
                        data[prevCellKey],
                        m.name,
                        "machine"
                      );
                      const joinsRight = itemExists(
                        data[nextCellKey],
                        m.name,
                        "machine"
                      );

                      return (
                        <div
                          key={`${cellKey}-machine-${m.name}-${midx}-${dayIdx}`}
                          className={machineContainerCls(joinsLeft, joinsRight)}
                        >
                          {renderResizeHandles(soId, m.name, "machine")}
                          <div
                            className="px-2 py-1.5 pr-7 text-xs font-medium text-green-900 cursor-move select-none"
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", m.name);
                              e.dataTransfer.setData(
                                "application/x-item-type",
                                "machine"
                              );
                              onDragStart(m.name, cellKey, "machine", {
                                childrenSnapshot: m.children
                                  ? [...m.children]
                                  : [],
                              });
                            }}
                            title={m.note || ""}
                          >
                            {m.name}
                          </div>
                          <button
                            type="button"
                            aria-label="Machine info"
                            draggable={false}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onMachineInfo?.(cellKey, m.name);
                            }}
                            className="absolute top-1.5 right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-green-700"
                            title="Machine details"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                          {/* Machine children */}
                          <div
                            className="px-2 pb-2 pt-1 min-h-[40px] border-dashed border-2 border-transparent hover:border-green-300 transition-colors duration-200"
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.dataTransfer.dropEffect = "move";
                            }}
                            onDrop={(e) =>
                              handleDropToMachine(e, cellKey, m.name)
                            }
                          >
                            <div className="grid grid-cols-1 gap-2">
                              {(m.children || []).map((c, cidx) => (
                                <div
                                  key={`${cellKey}-${m.name}-child-${c.type}-${c.name}-${cidx}-${dayIdx}`}
                                  className={chipCls(c.type)}
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData(
                                      "text/plain",
                                      m.name
                                    );
                                    e.dataTransfer.setData(
                                      "application/x-item-type",
                                      "machine"
                                    );
                                    onDragStart(c.name, cellKey, c.type, {
                                      childOf: m.name,
                                    });
                                  }}
                                  title={c.note || ""}
                                >
                                  {c.name}
                                </div>
                              ))}
                              {(m.children || []).length === 0 && (
                                <div className="text-[11px] text-green-700/70 py-1 text-center italic">
                                  Drop employees here
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Render non-machine resources */}
                    {others.map((item, idx) => {
                      // Only for "person" (employee)
                      if (item.type === "person") {
                        const prevCellKey =
                          dayIdx > 0
                            ? `${soId}-${weekDates[dayIdx - 1].key}`
                            : "";
                        const nextCellKey =
                          dayIdx < weekDates.length - 1
                            ? `${soId}-${weekDates[dayIdx + 1].key}`
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
                            key={`${cellKey}-${item.type}-${item.name}-nonmachine-${idx}-${dayIdx}`}
                            className={chipCls(
                              item.type,
                              joinsLeft,
                              joinsRight
                            )}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", item.name);
                              e.dataTransfer.setData(
                                "application/x-item-type",
                                item.type
                              );
                              onDragStart(item.name, cellKey, item.type);
                            }}
                            title={item.note || ""}
                            // ---- Hover logic for note modal ----
                            // onMouseEnter={() => {
                            //   hoverTimerRef.current = setTimeout(() => {
                            //     setHoveredResource({
                            //       cellKey,
                            //       name: item.name,
                            //       type: item.type,
                            //       note: item.note,
                            //     });
                            //     setNoteInput(item.note || "");
                            //     setShowNoteModal(true);
                            //   }, 2000); // 2 seconds
                            // }}
                            // onMouseLeave={() => {
                            //   if (hoverTimerRef.current) {
                            //     clearTimeout(hoverTimerRef.current);
                            //     hoverTimerRef.current = null;
                            //   }
                            // }}
                          >
                            {renderResizeHandles(soId, item.name, item.type)}
                            <div className="font-medium flex items-center">
                              {item.name}
                              {/* Show file icon if note exists */}
                              {item.note && (
                                <File
                                  className="ml-1 inline-block text-blue-500"
                                  size={16}
                                  // title="Employee note attached"
                                />
                              )}
                            </div>
                            {item.note && (
                              <div className="text-xs opacity-75 mt-1">
                                {item.note}
                              </div>
                            )}
                          </div>
                        );
                      }

                      // Render non-person items (machine/tool) as before:
                      const prevCellKey =
                        dayIdx > 0
                          ? `${soId}-${weekDates[dayIdx - 1].key}`
                          : "";
                      const nextCellKey =
                        dayIdx < weekDates.length - 1
                          ? `${soId}-${weekDates[dayIdx + 1].key}`
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
                          key={`${cellKey}-${item.type}-${item.name}-nonmachine-${idx}-${dayIdx}`}
                          className={chipCls(item.type, joinsLeft, joinsRight)}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", item.name);
                            e.dataTransfer.setData(
                              "application/x-item-type",
                              item.type
                            );
                            onDragStart(item.name, cellKey, item.type);
                          }}
                          title={item.note || ""}
                        >
                          {renderResizeHandles(soId, item.name, item.type)}
                          <div className="font-medium">{item.name}</div>
                          {item.note && (
                            <div className="text-xs opacity-75 mt-1">
                              {item.note}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Show placeholder if cell is empty */}
                    {machines.length === 0 && others.length === 0 && (
                      <div className="text-xs text-gray-400 italic py-4 text-center"></div>
                    )}
                  </div>
                </div>
              );
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

  const containerWidthPx = weekDays.length * CELL_MIN_WIDTH;
    

  return (
    <div
      className=" mx-auto bg-white border border-gray-200 rounded-lg shadow-sm min-h-[200px]"
      style={{
        width: containerWidthPx,
        minWidth: 360, // tweak as you like
      }}
    >
      {/* Show contract name at top from prop */}
      <div className="text-lg font-semibold px-3 py-2 border-b border-gray-200 bg-gray-50">
        {contractName}
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
    </div>
  );
};


export default ContractScheduler;
