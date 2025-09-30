// import React from "react";
// import { ChevronDown, X } from "lucide-react";

// export type ItemType = "person" | "machine" | "tool";

// export type CalendarItem = {
//   id: string; // NEW: stable id
//   name: string;
//   type: ItemType;
//   color?: string;
//   note?: string;
//   parentId?: string | null; // NEW: if assigned under a machine
// };

// export type CalendarData = Record<string, CalendarItem[]>;

// type WeekDay = { key: string; label: string; date: string };

// // Existing (kept for backward compat):
// type DragStartFn = (name: string, sourceKey: string, type: ItemType) => void;
// type DropFn = (targetKey: string) => void;

// // NEW: richer drag + drop signals (optional props)
// type GroupDragStartFn = (
//   machine: CalendarItem,
//   children: CalendarItem[],
//   sourceKey: string
// ) => void;

// type DropOnMachineFn = (targetKey: string, machineId: string) => void;
// type UnassignChildFn = (cellKey: string, childId: string) => void;


// interface Props {
//   data: CalendarData;
//   onDragStart: DragStartFn;
//   onDrop: DropFn;

//   // NEW (optional)
//   onGroupDragStart?: GroupDragStartFn;
//   onDropOnMachine?: DropOnMachineFn;
//   onUnassignChild?: UnassignChildFn;
// }

// const ContractScheduler: React.FC<Props> = ({
//   data,
//   onDragStart,
//   onDrop,
//   onGroupDragStart,
//   onDropOnMachine,
//   onUnassignChild, // ⬅️ NEW
// }) => {
//   const [collapsedRows, setCollapsedRows] = React.useState<
//     Record<string, boolean>
//   >({});

//   const toggleRow = (rowKey: string) =>
//     setCollapsedRows((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }));

//   const weekDays: WeekDay[] = [
//     { key: "mon", label: "Mon", date: "21" },
//     { key: "tue", label: "Tue", date: "22" },
//     { key: "wed", label: "Wed", date: "23" },
//     { key: "thu", label: "Thu", date: "24" },
//     { key: "fri", label: "Fri", date: "25" },
//     { key: "sat", label: "Sat", date: "26" },
//     { key: "sun", label: "Sun", date: "27" },
//   ];

//   const handleItemDragStart = (
//     e: React.DragEvent<HTMLDivElement>,
//     item: CalendarItem,
//     sourceKey: string
//   ) => {
//     // Keep the old callback so parent logic still works
//     onDragStart(item.name, sourceKey, item.type);

//     // Also set some useful drag payload for cross-app UIs
//     try {
//       e.dataTransfer.effectAllowed = "move";
//       e.dataTransfer.setData(
//         "text/plain",
//         JSON.stringify({
//           kind: "item",
//           id: item.id,
//           name: item.name,
//           type: item.type,
//           sourceKey,
//         })
//       );
//     } catch {}
//   };

//   const handleGroupDragStart = (
//     e: React.DragEvent<HTMLDivElement>,
//     machine: CalendarItem,
//     sourceKey: string,
//     children: CalendarItem[]
//   ) => {
//     if (onGroupDragStart) onGroupDragStart(machine, children, sourceKey);
//     try {
//       e.dataTransfer.effectAllowed = "move";
//       e.dataTransfer.setData(
//         "text/plain",
//         JSON.stringify({
//           kind: "group",
//           machineId: machine.id,
//           sourceKey,
//           childIds: children.map((c) => c.id),
//         })
//       );
//     } catch {}
//   };

//   const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
//     e.preventDefault();
//     e.dataTransfer.dropEffect = "move";
//   };

//   const handleDropToCell = (
//     e: React.DragEvent<HTMLDivElement>,
//     targetKey: string
//   ) => {
//     e.preventDefault();
//     onDrop(targetKey);
//   };

//   const handleDropOnMachine = (
//     e: React.DragEvent<HTMLDivElement>,
//     targetKey: string,
//     machineId: string
//   ) => {
//     e.preventDefault();
//     if (onDropOnMachine) onDropOnMachine(targetKey, machineId);
//   };

//   const getWeekDates = (weekOffset = 0): WeekDay[] =>
//     weekDays.map((day, index) => ({
//       ...day,
//       date: String(21 + index + weekOffset * 7),
//     }));

//   // Render helpers for cell content ------------------------------------------
//    const renderCell = (cellKey: string) => {
//      const items = data[cellKey] || [];

//      const machines = items.filter((i) => i.type === "machine");
//      const childrenByParent = new Map<string, CalendarItem[]>();
//      for (const it of items) {
//        if (it.parentId) {
//          if (!childrenByParent.has(it.parentId))
//            childrenByParent.set(it.parentId, []);
//          childrenByParent.get(it.parentId)!.push(it);
//        }
//      }
//      const loose = items.filter((i) => i.type !== "machine" && !i.parentId);

//      return (
//        <div className="space-y-2">
//          {machines.map((m) => {
//            const kids = childrenByParent.get(m.id) || [];
//            return (
//              <div
//                key={`${cellKey}-${m.id}`}
//                className="rounded-md border border-green-300/60 bg-green-50 px-2 py-1.5 shadow-[inset_0_1px_0_#0000000d] cursor-move"
//                draggable
//                onDragStart={(e) => handleGroupDragStart(e, m, cellKey, kids)}
//                onDragOver={handleDragOver}
//                onDrop={(e) => handleDropOnMachine(e, cellKey, m.id)}
//                title={m.note || "Machine group"}
//              >
//                <div className="text-green-800 font-medium text-xs">
//                  {m.name}
//                </div>

//                {kids.length > 0 && (
//                  <div className="mt-1 space-y-1">
//                    {kids.map((c) => (
//                      <div
//                        key={`${cellKey}-${c.id}`}
//                        className={`relative ml-2 px-2 py-1 rounded-md text-[11px] leading-[14px] border cursor-move
//                         ${
//                           c.type === "person"
//                             ? "bg-blue-100 text-blue-800 border-blue-300/50"
//                             : "bg-amber-100 text-amber-800 border-amber-300/60"
//                         }`}
//                        draggable
//                        onDragStart={(e) => handleItemDragStart(e, c, cellKey)}
//                        title={c.note || ""}
//                      >
//                        {/* child label */}
//                        {c.name}

//                        {/* 🔗 Unlink control */}
//                        {onUnassignChild && (
//                          <button
//                            type="button"
//                            title="Unassign from machine"
//                            aria-label="Unassign from machine"
//                            className="absolute right-1 top-1 inline-flex items-center justify-center rounded hover:bg-white/70 ring-1 ring-transparent hover:ring-black/10"
//                            style={{ width: 16, height: 16 }}
//                            onClick={(e) => {
//                              e.preventDefault();
//                              e.stopPropagation(); // don't start a drag
//                              onUnassignChild(cellKey, c.id);
//                            }}
//                            draggable={false}
//                          >
//                            <X size={12} />
//                          </button>
//                        )}
//                      </div>
//                    ))}
//                  </div>
//                )}
//              </div>
//            );
//          })}

//          {loose.map((it) => (
//            <div
//              key={`${cellKey}-${it.id}`}
//              className={`px-2 py-1.5 rounded-md text-xs border cursor-move
//               ${
//                 it.type === "person"
//                   ? "bg-blue-100 text-blue-800 border-blue-300/50"
//                   : it.type === "tool"
//                   ? "bg-orange-100 text-orange-800 border-orange-300/60"
//                   : "bg-green-100 text-green-800 border-green-300/50"
//               }`}
//              draggable
//              onDragStart={(e) => handleItemDragStart(e, it, cellKey)}
//              title={it.note || ""}
//            >
//              <div className="font-medium">{it.name}</div>
//            </div>
//          ))}
//        </div>
//      );
//    };


//   const renderWeekRow = (
//     weekKey: string,
//     weekOffset = 0,
//     showHeader = true
//   ) => {
//     const weekDates = getWeekDates(weekOffset);
//     const isCollapsed = !!collapsedRows[weekKey];

//     return (
//       <div className="grid grid-row-2">
//         {/* Left header cell with toggle */}
//         <div className="p-1">
//           <button
//             type="button"
//             onClick={() => toggleRow(weekKey)}
//             className="text-xs text-gray-500 flex items-center hover:text-gray-700 select-none"
//             aria-expanded={!isCollapsed}
//             aria-controls={`${weekKey}-grid`}
//             title={isCollapsed ? "Expand row" : "Collapse row"}
//           >
//             <span>{weekKey}</span>
//             <ChevronDown
//               size={12}
//               className={`ml-1 transition-transform duration-200 ${
//                 isCollapsed ? "-rotate-90" : "rotate-0"
//               }`}
//             />
//           </button>
//         </div>

//         {/* Days grid (hidden when collapsed) */}
//         {!isCollapsed && (
//           <div id={`${weekKey}-grid`} className="grid grid-cols-4">
//             {weekDates.map((day) => {
//               const cellKey = `${weekKey}-${day.key}`;
//               return (
//                 <div
//                   key={cellKey}
//                   className="p-3 hover:bg-gray-25 transition-colors"
//                   onDragOver={handleDragOver}
//                   onDrop={(e) => handleDropToCell(e, cellKey)}
//                 >
//                   {renderCell(cellKey)}
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>
//     );
//   };

//   return (
//     <div className="w-full bg-gray-100 p-2">
//       <div className="w-full p-3 max-w-4xl bg-white rounded-lg shadow-sm">
//         <div className="text-lg font-semibold w-full border-b">
//           Contract SO1165
//         </div>
//         <div className="bg-white">
//           {renderWeekRow("SO1165", 0, true)}
//           {renderWeekRow("SO1165-week2", 1, false)}
//           {renderWeekRow("SO1165-week3", 2, false)}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ContractScheduler;


// import React from "react";
// import { ChevronDown, Info } from "lucide-react";

// /** tools are first-class so machines can act as containers */
// export type ItemType = "person" | "machine" | "tool";

// export type CalendarItem = {
//   name: string;
//   type: ItemType;
//   color?: string;
//   note?: string;
//   /** only used when type === "machine" */
//   children?: CalendarItem[];
// };

// export type CalendarData = Record<string, CalendarItem[]>;

// type ContractDragMeta = {
//   childrenSnapshot?: CalendarItem[]; // when dragging a machine, include its children
//   childOf?: string; // when dragging a child out of a machine
// };

// type DragStartFn = (
//   name: string,
//   sourceKey: string,
//   type: ItemType,
//   meta?: ContractDragMeta
// ) => void;

// type DropFn = (targetKey: string) => void;
// /** drop directly onto a machine (assign resource to it) */
// type DropToMachineFn = (targetKey: string, machineName: string) => void;

// type DraggedItem = { name: string; type: ItemType } | null;

// type WeekDay = { key: string; label: string; date: string };

// interface Props {
//   data: CalendarData;
//   onDragStart: DragStartFn;
//   onDrop: DropFn;
//   onDropToMachine: DropToMachineFn;
//   /** OPTIONAL: click callback for the small info icon on machine cards */
//   onMachineInfo?: (cellKey: string, machineName: string) => void;
// }

// const ContractScheduler: React.FC<Props> = ({
//   data,
//   onDragStart,
//   onDrop,
//   onDropToMachine,
//   onMachineInfo,
// }) => {
//   const [_draggedItem, setDraggedItem] = React.useState<DraggedItem>(null);
//   const [_draggedFrom, setDraggedFrom] = React.useState<string | null>(null);

//   const [collapsedRows, setCollapsedRows] = React.useState<
//     Record<string, boolean>
//   >({});

//   const toggleRow = (rowKey: string) =>
//     setCollapsedRows((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }));

//   const weekDays: WeekDay[] = [
//     { key: "mon", label: "Mon", date: "21" },
//     { key: "tue", label: "Tue", date: "22" },
//     { key: "wed", label: "Wed", date: "23" },
//     { key: "thu", label: "Thu", date: "24" },
//     { key: "fri", label: "Fri", date: "25" },
//     { key: "sat", label: "Sat", date: "26" },
//     { key: "sun", label: "Sun", date: "27" },
//   ];

//   const handleItemDragStart = (
//     e: React.DragEvent<HTMLDivElement>,
//     itemName: string,
//     sourceKey: string,
//     itemType: ItemType,
//     meta?: ContractDragMeta
//   ) => {
//     setDraggedItem({ name: itemName, type: itemType });
//     setDraggedFrom(sourceKey);
//     e.dataTransfer.effectAllowed = "move";
//     try {
//       e.dataTransfer.setData("text/plain", itemName);
//       e.dataTransfer.setData("application/x-item-type", itemType);
//     } catch {}
//     onDragStart(itemName, sourceKey, itemType, meta);
//   };

//   const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
//     e.preventDefault();
//     e.dataTransfer.dropEffect = "move";
//   };

//   const handleDropHere = (
//     e: React.DragEvent<HTMLDivElement>,
//     targetKey: string
//   ) => {
//     e.preventDefault();
//     onDrop(targetKey);
//     setDraggedItem(null);
//     setDraggedFrom(null);
//   };

//   const getWeekDates = (weekOffset = 0): WeekDay[] =>
//     weekDays.map((day, index) => ({
//       ...day,
//       date: String(21 + index + weekOffset * 7),
//     }));

//   /** chip styling */
//   const chipCls = (t: ItemType) =>
//     [
//       "px-2 py-1.5 rounded-md text-xs cursor-move hover:shadow-sm transition-all duration-200 border",
//       t === "person"
//         ? "bg-blue-100 text-blue-800 border-blue-300/50"
//         : t === "tool"
//         ? "bg-amber-50 text-amber-800 border-amber-300/60"
//         : "bg-green-100 text-green-800 border-green-300/50",
//     ].join(" ");

//   const renderWeekRow = (
//     weekKey: string,
//     weekOffset = 0,
//     // showHeader = true
//   ) => {
//     const weekDates = getWeekDates(weekOffset);
//     const isCollapsed = !!collapsedRows[weekKey];

//     return (
//       <div className="grid grid-row-2">
//         {/* Left header cell with toggle */}
//         <div className="p-1">
//           <button
//             type="button"
//             onClick={() => toggleRow(weekKey)}
//             className="text-xs text-gray-500 flex items-center hover:text-gray-700 select-none"
//             aria-expanded={!isCollapsed}
//             aria-controls={`${weekKey}-grid`}
//             title={isCollapsed ? "Expand row" : "Collapse row"}
//           >
//             <span>SO1165</span>
//             <ChevronDown
//               size={12}
//               className={`ml-1 transition-transform duration-200 ${
//                 isCollapsed ? "-rotate-90" : "rotate-0"
//               }`}
//             />
//           </button>
//         </div>

//         {/* Days grid (hidden when collapsed) */}
//         {!isCollapsed && (
//           <div id={`${weekKey}-grid`} className="grid grid-cols-4">
//             {weekDates.map((day) => {
//               const cellKey = `${weekKey}-${day.key}`;
//               const items = data[cellKey] || [];
//               const machines = items.filter((i) => i.type === "machine");
//               const others = items.filter((i) => i.type !== "machine");

//               return (
//                 <div
//                   key={cellKey}
//                   className="p-3 hover:bg-gray-25 transition-colors"
//                   onDragOver={handleDragOver}
//                   onDrop={(e) => handleDropHere(e, cellKey)}
//                 >
//                   <div className="space-y-2">
//                     {/* machines with their own droppable interior */}
//                     {machines.map((m, midx) => (
//                       <div
//                         key={`${cellKey}-${m.name}-${midx}`}
//                         className="relative rounded-lg bg-green-50 border border-green-200/70"
//                       >
//                         {/* MACHINE HEADER (draggable) + INFO ICON */}
//                         <div
//                           className="px-2 py-1.5 pr-7 text-xs font-medium text-green-900 cursor-move select-none"
//                           draggable
//                           onDragStart={(e) =>
//                             handleItemDragStart(e, m.name, cellKey, "machine", {
//                               childrenSnapshot: m.children
//                                 ? [...m.children]
//                                 : [],
//                             })
//                           }
//                           title={m.note || ""}
//                         >
//                           {m.name}
//                         </div>

//                         {/* top-right icon */}
//                         <button
//                           type="button"
//                           aria-label="Machine info"
//                           draggable={false}
//                           onMouseDown={(e) => e.stopPropagation()}
//                           onClick={(e) => {
//                             e.preventDefault();
//                             e.stopPropagation();
//                             onMachineInfo?.(cellKey, m.name);
//                           }}
//                           className="absolute top-1.5 right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full  text-green-700  "
//                           title="Machine details"
//                         >
//                           <Info className="h-3.5 w-3.5" />
//                         </button>

//                         {/* INNER DROPPABLE for assigning resources */}
//                         <div
//                           className="px-2 pb-2 pt-1"
//                           onDragOver={(e) => {
//                             e.preventDefault();
//                             e.stopPropagation(); // keep cell onDrop from firing
//                             e.dataTransfer.dropEffect = "move";
//                           }}
//                           onDrop={(e) => {
//                             e.preventDefault();
//                             e.stopPropagation();
//                             onDropToMachine(cellKey, m.name);
//                           }}
//                         >
//                           {/* stacked children, one per row */}
//                           <div className="grid grid-cols-1 gap-2">
//                             {(m.children || []).map((c, cidx) => (
//                               <div
//                                 key={`${cellKey}-${m.name}-child-${c.name}-${cidx}`}
//                                 className={[
//                                   "w-full px-3 py-1 rounded-md text-[13px] font-medium text-center",
//                                   "cursor-move border transition-all duration-200",
//                                   c.type === "person"
//                                     ? "bg-blue-100 text-blue-800 border-blue-300/50"
//                                     : c.type === "tool"
//                                     ? "bg-amber-100 text-amber-800 border-amber-300/60"
//                                     : "bg-green-100 text-green-800 border-green-300/50",
//                                 ].join(" ")}
//                                 draggable
//                                 onDragStart={(e) =>
//                                   handleItemDragStart(
//                                     e,
//                                     c.name,
//                                     cellKey,
//                                     c.type,
//                                     { childOf: m.name }
//                                   )
//                                 }
//                                 title={c.note || ""}
//                               >
//                                 {c.name}
//                               </div>
//                             ))}
//                             {(m.children || []).length === 0 && (
//                               <div className="text-[11px] text-green-700/70 py-1 text-center">
//                                 {/* Drop people/tools here */}
//                               </div>
//                             )}
//                           </div>
//                         </div>
//                       </div>
//                     ))}

//                     {/* top-level items not assigned to a machine */}
//                     {others.map((item, idx) => (
//                       <div
//                         key={`${cellKey}-${item.name}-${idx}`}
//                         draggable
//                         onDragStart={(e) =>
//                           handleItemDragStart(e, item.name, cellKey, item.type)
//                         }
//                         className={chipCls(item.type)}
//                         title={item.note || ""}
//                       >
//                         <div className="font-medium">{item.name}</div>
//                         {item.note && (
//                           <div className="text-xs opacity-75 mt-1">
//                             {item.note}
//                           </div>
//                         )}
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>
//     );
//   };

//   return (
//     <div className="w-full bg-gray-100 p-2">
//       <div className="w-full p-3 max-w-4xl bg-white rounded-lg shadow-sm">
//         <div className="text-lg font-semibold w-full border-b">
//           Contract SO1165
//         </div>
//         <div className="bg-white">
//           {renderWeekRow("SO1165", 0)}
//           {renderWeekRow("SO1165-week2", 1)}
//           {renderWeekRow("SO1165-week3", 2)}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ContractScheduler;


import React from "react";
import { ChevronDown, Info } from "lucide-react";

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
}) => {
  const [collapsedRows, setCollapsedRows] = React.useState<
    Record<string, boolean>
  >({});

  const toggleRow = (rowKey: string) =>
    setCollapsedRows((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }));

  /* ---------- Static week-day ruler (Mon-Sun) ---------- */
  const weekDays: WeekDay[] = [
    { key: "mon", label: "Mon", date: "21" },
    { key: "tue", label: "Tue", date: "22" },
    { key: "wed", label: "Wed", date: "23" },
    { key: "thu", label: "Thu", date: "24" },
    { key: "fri", label: "Fri", date: "25" },
    { key: "sat", label: "Sat", date: "26" },
    { key: "sun", label: "Sun", date: "27" },
  ];

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
    const cellWidth = cellEl ? cellEl.offsetWidth : 120;

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
      "px-2 py-1.5 rounded-md text-xs cursor-move hover:shadow-sm transition-all duration-200 border relative group",
      t === "person"
        ? "bg-blue-100 text-blue-800 border-blue-300/50"
        : t === "tool"
        ? "bg-amber-50 text-amber-800 border-amber-300/60"
        : "bg-green-100 text-green-800 border-green-300/50",
      joinsLeft ? "-ml-6 border-l-0 rounded-l-none" : "",
      joinsRight ? "rounded-r-none" : "",
    ].join(" ");

  const machineContainerCls = (joinsLeft = false, joinsRight = false) =>
    [
      "relative bg-green-50 border border-green-200/70 group",
      joinsLeft ? "-ml-6 border-l-0 rounded-l-none" : "rounded-l-lg",
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
        {!isCollapsed && (
          <div id={`${soId}-grid`} className="grid grid-cols-7">
            {weekDates.map((day, dayIdx) => {
              const cellKey = `${soId}-${day.key}`; // SO-specific!
              const items = data[cellKey] || [];
              const machines = items.filter((i) => i.type === "machine");
              const others = items.filter((i) => i.type !== "machine");

              return (
                <div
                  key={cellKey}
                  className="p-3 hover:bg-gray-25 transition-colors"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => handleDrop(e, cellKey)}
                >
                  <div className="space-y-2">
                    {/* Machines */}
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
                          key={`${cellKey}-${m.name}-${midx}`}
                          className={machineContainerCls(joinsLeft, joinsRight)}
                        >
                          {renderResizeHandles(soId, m.name, "machine")}
                          <div
                            className="px-2 py-1.5 pr-7 text-xs font-medium text-green-900 cursor-move select-none"
                            draggable
                            onDragStart={(_e) =>
                              onDragStart(m.name, cellKey, "machine", {
                                childrenSnapshot: m.children
                                  ? [...m.children]
                                  : [],
                              })
                            }
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
                            className="px-2 pb-2 pt-1"
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
                                  key={`${cellKey}-${m.name}-child-${c.name}-${cidx}`}
                                  className={chipCls(c.type)}
                                  draggable
                                  onDragStart={(_e) =>
                                    onDragStart(c.name, cellKey, c.type, {
                                      childOf: m.name,
                                    })
                                  }
                                  title={c.note || ""}
                                >
                                  {c.name}
                                </div>
                              ))}
                              {(m.children || []).length === 0 && (
                                <div className="text-[11px] text-green-700/70 py-1 text-center" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Non-machine resources */}
                    {others.map((item, idx) => {
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
                          key={`${cellKey}-${item.name}-${idx}`}
                          className={chipCls(item.type, joinsLeft, joinsRight)}
                          draggable
                          onDragStart={(_e) =>
                            onDragStart(item.name, cellKey, item.type)
                          }
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
      <div className="w-full text-center text-gray-400 py-12">
        Contract not found.
      </div>
    );
  }
  return (
    <div className="w-full bg-gray-100 p-2">
      {/* Show contract name at top from prop */}
      <div className="text-lg font-semibold w-full border-b mb-4 px-3 py-2">
        {contractName}
      </div>
      {soList.map((so) => (
        <div
          key={so.id}
          className="w-full p-3 max-w-4xl bg-white rounded-lg shadow-sm mb-4"
        >
          {renderSORow(so.id, so.soNumber)}
        </div>
      ))}
      {soList.length === 0 && (
        <div className="text-sm text-gray-500 italic text-start px-40 py-12">
          No SOs in this contract yet.
        </div>
      )}
    </div>
  );
};

export default ContractScheduler;
