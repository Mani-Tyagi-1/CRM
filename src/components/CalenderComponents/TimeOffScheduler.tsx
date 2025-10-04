// import React, { useMemo, useState } from "react";
// import { ChevronDown, ChevronUp, FileText } from "lucide-react";

// export type ItemType = "person" | "machine";
// export type CalendarItem = {
//   name: string;
//   type: ItemType;
//   color?: string;
//   note?: string;
// };
// export type CalendarData = Record<string, CalendarItem[]>;
// type DragStartFn = (name: string, sourceKey: string, type: ItemType) => void;
// type DropFn = (targetKey: string) => void;

// type WeekDay = { day: string; key: string };

// interface Props {
//   weekDays: WeekDay[];
//   data: CalendarData;
//   onDragStart: DragStartFn;
//   onDrop: DropFn;
// }

// const TimeOffScheduler: React.FC<Props> = ({
//   weekDays,
//   data,
//   onDragStart,
//   onDrop,
// }) => {
//   const [collapsed, setCollapsed] = useState({ vacation: false, sick: false });
//   const [open, setOpen] = useState(false);

//   // how tall the open panel should be (adjust if you need even smaller)
//   const OPEN_MAX_PX = 220;

//   const unavailableCount = useMemo(() => {
//     const names = new Set<string>();
//     Object.entries(data).forEach(([key, items]) => {
//       if (!key.startsWith("vacation-") && !key.startsWith("sick-")) return;
//       items?.forEach((it) => names.add(it.name));
//     });
//     return names.size;
//   }, [data]);

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
//   };

//   const handleItemDragStart = (
//     e: React.DragEvent<HTMLDivElement>,
//     itemName: string,
//     sourceKey: string,
//     itemType: ItemType
//   ) => {
//     e.dataTransfer.effectAllowed = "move";
//     try {
//       e.dataTransfer.setData("text/plain", itemName);
//       e.dataTransfer.setData("application/x-item-type", itemType);
//     } catch {}
//     onDragStart(itemName, sourceKey, itemType);
//   };

//   const Row = ({
//     label,
//     rowKeyPrefix,
//     isCollapsed,
//     onToggle,
//   }: {
//     label: "Vacation" | "Sick";
//     rowKeyPrefix: "vacation" | "sick";
//     isCollapsed: boolean;
//     onToggle: () => void;
//   }) => (
//     <div className="w-full">
//       {/* label + 7 day columns (label column fixed ~120px for look-alike layout) */}
//       <div
//         className="grid items-start gap-x-2"
//         style={{
//           gridTemplateColumns: `120px repeat(${weekDays.length}, minmax(120px, 1fr))`,
//         }}
//       >
//         {/* label / toggle */}
//         <div className="py-1.5 pr-2">
//           <button
//             type="button"
//             onClick={onToggle}
//             className="text-[13px] font-medium text-gray-800 inline-flex items-center gap-1"
//             aria-label={`Toggle ${label}`}
//           >
//             {label}
//             {isCollapsed ? (
//               <ChevronUp className="h-4 w-4 text-gray-500" />
//             ) : (
//               <ChevronDown className="h-4 w-4 text-gray-500" />
//             )}
//           </button>
//         </div>

//         {/* day cells */}
//         {weekDays.map(({ key }) => {
//           const cellKey = `${rowKeyPrefix}-${key}`;
//           return (
//             <div
//               key={cellKey}
//               className="p-2 min-h-12"
//               onDragOver={handleDragOver}
//               onDrop={(e) => handleDropHere(e, cellKey)}
//             >
//               {!isCollapsed && (
//                 <div className="flex flex-wrap gap-2">
//                   {data[cellKey]?.map((item, idx) => (
//                     <div
//                       key={`${cellKey}-${item.name}-${idx}`}
//                       draggable
//                       style={{ WebkitUserDrag: "element" }}
//                       onDragStart={(e) =>
//                         handleItemDragStart(e, item.name, cellKey, item.type)
//                       }
//                       className={[
//                         "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium select-none cursor-grab active:cursor-grabbing",
//                         "shadow-[0_1px_0_rgba(0,0,0,0.03)] ring-1",
//                         item.type === "person"
//                           ? "bg-sky-100 text-sky-800 ring-sky-200"
//                           : "bg-amber-50 text-amber-800 ring-amber-200",
//                       ].join(" ")}
//                       title={item.note || ""}
//                     >
//                       <span>{item.name}</span>
//                       {/* tiny doc icon like the screenshot; doesn't intercept drag */}
//                       {item.type === "person" && (
//                         <FileText className="h-3.5 w-3.5 text-sky-600/80 pointer-events-none" />
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );

//   return (
//     <>
//       {/* spacer so the fixed footer doesn't cover content; smaller when open */}
//       <div className={open ? "h-28" : "h-14"} />

//       {/* sticky footer */}
//       <div className="fixed left-64 right-0 bottom-0 z-40">
//         <div className="border-t border-rose-200 bg-rose-50/90">
//           {/* header */}
//           <button
//             type="button"
//             onClick={() => setOpen((v) => !v)}
//             className="w-full text-center py-2 text-[13px] font-medium text-rose-600 hover:text-rose-700 inline-flex items-center justify-center gap-1"
//           >
//             {unavailableCount} unavailable resources
//             {open ? (
//               <ChevronUp className="h-4 w-4" />
//             ) : (
//               <ChevronDown className="h-4 w-4" />
//             )}
//           </button>

//           {/* content — animate height, allow internal scroll */}
//           <div
//             className="transition-[max-height] duration-300 ease-in-out overflow-y-auto"
//             style={{ maxHeight: open ? OPEN_MAX_PX : 0 }}
//           >
//             <div className="px-3 pb-3">
//               <div className="rounded-xl bg-rose-50 ring-1 ring-rose-200/60 px-3 py-2">
//                 <Row
//                   label="Vacation"
//                   rowKeyPrefix="vacation"
//                   isCollapsed={collapsed.vacation}
//                   onToggle={() =>
//                     setCollapsed((s) => ({ ...s, vacation: !s.vacation }))
//                   }
//                 />
//                 <div className="h-2" />
//                 <Row
//                   label="Sick"
//                   rowKeyPrefix="sick"
//                   isCollapsed={collapsed.sick}
//                   onToggle={() =>
//                     setCollapsed((s) => ({ ...s, sick: !s.sick }))
//                   }
//                 />
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Local override in case a global reset disables dragging */}
//       <style>{`[draggable="true"]{ -webkit-user-drag: element !important; }`}</style>
//     </>
//   );
// };

// export default TimeOffScheduler;



import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { addResourceToTimeoffCell, removeResourceFromTimeoffCell } from "../../services/timeoffschedular";
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
  data: CalendarData;
  onDragStart: DragStartFn;
  onDrop: DropFn;
  uid: string | null; // <-- add this!
  onRemoveResource: (cellKey: string, item: CalendarItem) => void; // <-- add this!
}

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
  data,
  onDragStart,
  onDrop,
  uid,
  onRemoveResource,
}) => {
  const [collapsed, setCollapsed] = React.useState({
    vacation: false,
    sick: false,
    service: false,
  });
  const [open, setOpen] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const OPEN_MAX_PX = 260;

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
   if (!droppedItem) return; // can't save to Firebase if no info

   // Save to Firebase
   if (uid) {
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
    const m = targetKey.match(/^service-(\d{4}-\d{2}-\d{2})$/);
    if (m) {
      dropDate = m[1];
    }

    // Print info
    console.log(`Dropped resource:`, {
      name: draggedName,
      type: itemType,
      dateFromTargetKey: dropDate,
      resourceStartDate: droppedItem?.startDate,
      fullResource: droppedItem,
    });

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

  async function handleRemoveTimeOffResource(cellKeyL:any, item:any) {
    // Remove from UI state (call parent function)
    onRemoveResource(cellKeyL, item);

    // Remove from Firebase
    if (!uid) return;
    await removeResourceFromTimeoffCell(db, uid, cellKeyL, item);
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
        className="grid items-start gap-x-2"
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
        {weekDays.map(({ key }, weekIdx) => {
          const cellKey = `${rowKeyPrefix}-${key}`;
          return (
            <div
              key={cellKey}
              className="px-6 py-6 min-h-24"
              onDragOver={handleDragOver}
              onDrop={
                customDropHandler
                  ? (e) => customDropHandler(e, cellKey)
                  : (e) => handleDropHere(e, cellKey)
              }
            >
              {!isCollapsed && (
                <div className="flex flex-wrap gap-2">
                  {data[cellKey]?.map((item, idx) => (
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
                        "inline-flex items-center gap-1 px-7 py-3 rounded-2xl text-xs font-medium select-none cursor-grab active:cursor-grabbing",
                        "shadow-[0_1px_0_rgba(0,0,0,0.03)] ring-1",
                        item.type === "person"
                          ? "bg-sky-100 text-sky-800 ring-sky-200"
                          : item.type === "machine"
                          ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                          : "bg-amber-50 text-amber-800 ring-amber-200",
                      ].join(" ")}
                      title={item.note || ""}
                    >
                      <span>{item.name}</span>
                      <button
                        type="button"
                        className="absolute right-1.5 top-1.5 p-1 rounded-full opacity-0 group-hover:opacity-100 bg-white/80 hover:bg-red-100 transition"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTimeOffResource(cellKey, item);
                        }}
                        title="Remove"
                      >
                        {/* Use your favorite icon or just ✕ */}
                        <svg
                          viewBox="0 0 16 16"
                          className="w-3.5 h-3.5 text-red-500"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path d="M4 4l8 8m0-8l-8 8" />
                        </svg>
                      </button>
                      {/* {item.type === "person" && (
                        <FileText className="h-3.5 w-3.5 text-sky-600/80 pointer-events-none" />
                      )} */}
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
      <div className={open ? "h-36" : "h-14"} />
      <div className="fixed left-64 right-0 bottom-0 z-40">
        <div className="border-t border-rose-200 bg-rose-50/90">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-full text-center py-2 text-[13px] font-medium text-rose-600 hover:text-rose-700 inline-flex items-center justify-center gap-1"
          >
            {unavailableCount} unavailable resources
            {open ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <div
            className="transition-[max-height] duration-300 ease-in-out overflow-y-auto"
            style={{ maxHeight: open ? OPEN_MAX_PX : 0 }}
          >
            <div className="px-3 pb-3">
              <div className="rounded-xl bg-rose-50 ring-1 ring-rose-200/60 px-3 py-2">
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
              {/* Error message for service */}
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
      <style>{`[draggable="true"]{ -webkit-user-drag: element !important; }`}</style>
    </>
  );
};

export default TimeOffScheduler;
