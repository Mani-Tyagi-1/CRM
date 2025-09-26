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
import { ChevronDown, ChevronUp, FileText } from "lucide-react";

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
}

// ---- Helper: collect all unavailable resource names ----
export function getAllUnavailableResourceNames(data: CalendarData): string[] {
  const names = new Set<string>();
  for (const k of Object.keys(data)) {
    // Only consider vacation-* and sick-*
    if (k.startsWith("vacation-") || k.startsWith("sick-")) {
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
}) => {
  const [collapsed, setCollapsed] = React.useState({
    vacation: false,
    sick: false,
  });
  const [open, setOpen] = React.useState(false);
  const OPEN_MAX_PX = 220;

  const unavailableCount = React.useMemo(() => {
    return getAllUnavailableResourceNames(data).length;
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

        {weekDays.map(({ key }) => {
          const cellKey = `${rowKeyPrefix}-${key}`;
          return (
            <div
              key={cellKey}
              className="px-6 py-6 min-h-24"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropHere(e, cellKey)}
            >
              {!isCollapsed && (
                <div className="flex flex-wrap gap-2">
                  {data[cellKey]?.map((item, idx) => (
                    <div
                      key={`${cellKey}-${item.name}-${idx}`}
                      draggable
                      style={
                        { WebkitUserDrag: "element" } as React.CSSProperties
                      }
                      onDragStart={(e) =>
                        handleItemDragStart(e, item.name, cellKey, item.type)
                      }
                      className={[
                        "inline-flex items-center gap-1 px-7  py-3 rounded-2xl text-xs font-medium select-none cursor-grab active:cursor-grabbing",
                        "shadow-[0_1px_0_rgba(0,0,0,0.03)] ring-1",
                        item.type === "person"
                          ? "bg-sky-100 text-sky-800 ring-sky-200"
                          : "bg-amber-50 text-amber-800 ring-amber-200",
                      ].join(" ")}
                      title={item.note || ""}
                    >
                      <span>{item.name}</span>
                      {item.type === "person" && (
                        <FileText className="h-3.5 w-3.5 text-sky-600/80 pointer-events-none" />
                      )}
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
      <div className={open ? "h-28" : "h-14"} />
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
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`[draggable="true"]{ -webkit-user-drag: element !important; }`}</style>
    </>
  );
};

export default TimeOffScheduler;
