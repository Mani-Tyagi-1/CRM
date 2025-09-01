// import React, { useMemo, useState, useEffect } from "react";

// import {
//   Search,
//   ChevronLeft,
//   ChevronRight,
//   ChevronDown,
//   ChevronUp,
//   Plus,
//   Bell,
//   FileText,
//   Users,
//   Truck,
// } from "lucide-react";

// import ContractScheduler, {
//   CalendarData as ContractData,
//   ItemType as ContractItemType,
// } from "../CalenderComponents/ContractScheduler";

// import TimeOffScheduler, {
//   CalendarData as TimeOffData,
//   ItemType as TimeOffItemType,
// } from "../CalenderComponents/TimeOffScheduler";

// type Category = "employee" | "machine";

// type ExpandedSections = {
//   drivers: boolean;
//   engineers: boolean;
//   hand: boolean;
//   mechanics: boolean;
//   tap: boolean;
//   masters: boolean;
//   constructionLead: boolean;
//   machines: boolean;
// };

// type SidebarEmployees = {
//   drivers: string[];
//   engineers: string[];
//   hand: string[];
//   mechanics: string[];
//   tap: string[];
//   masters: string[];
//   constructionLead: string[];
// };

// type SidebarMachines = {
//   digger: string[];
//   loader: string[];
//   trailerTrucks: string[];
//   wheelers8: string[];
//   personalCars: string[];
//   tools: string[];
// };

// type DragPayload =
//   | {
//       kind: "item";
//       item: {
//         id?: string;
//         name: string;
//         type: "person" | "machine" | "tool";
//         parentId?: string | null;
//       };
//       source: { zone: "sidebar" | "contract" | "timeoff"; id: string };
//     }
//   | {
//       kind: "group";
//       machine: { id: string; name: string };
//       children: { id: string; name: string }[];
//       source: { zone: "contract"; id: string };
//     }
//   | null;



// const Dashboard: React.FC = () => {
//   const uid = () => Math.random().toString(36).slice(2);
//   // show 7 days only
//   const DAYS_TO_SHOW = 7;

//   const startOfDay = (d: Date) => {
//     const x = new Date(d);
//     x.setHours(0, 0, 0, 0);
//     return x;
//   };
//   const addDays = (d: Date, n: number) => {
//     const x = new Date(d);
//     x.setDate(x.getDate() + n);
//     return x;
//   };

//   // Get Monday (start of week) for a given date
//   const getMonday = (date: Date) => {
//     const d = new Date(date);
//     d.setHours(0, 0, 0, 0);
//     // JS: 0=Sun ... 6=Sat. We want Monday as start.
//     const day = d.getDay(); // 0..6
//     const diff = day === 0 ? -6 : 1 - day; // shift to Monday
//     d.setDate(d.getDate() + diff);
//     return d;
//   };

//   // Label like "Mon 18.8."
//   const formatDayLabel = (d: Date) => {
//     const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
//     const day = d.getDate();
//     const month = d.getMonth() + 1;
//     return `${weekday} ${day}.${month}.`;
//   };

//   // ---------- Flexible timeline controls ----------
//   // Show N days (default 28)
//   const [daysToShow, setDaysToShow] = useState(28);

//   // Start offset in days (0 = Monday of the current week)
//   const [startOffsetDays, setStartOffsetDays] = useState(0);

//   const isSameYMD = (a: Date, b: Date) =>
//     a.getFullYear() === b.getFullYear() &&
//     a.getMonth() === b.getMonth() &&
//     a.getDate() === b.getDate();

//   // "June 2025" or "Jun 2025 – Jul 2025" for arbitrary ranges
//   const formatRangeHeader = (start: Date, days: number) => {
//     const end = new Date(start);
//     end.setDate(end.getDate() + days - 1);

//     const sameMonth =
//       start.getMonth() === end.getMonth() &&
//       start.getFullYear() === end.getFullYear();

//     if (sameMonth) {
//       return `${start.toLocaleString(undefined, {
//         month: "long",
//       })} ${start.getFullYear()}`;
//     }
//     const startStr = `${start.toLocaleString(undefined, {
//       month: "short",
//     })} ${start.getFullYear()}`;
//     const endStr = `${end.toLocaleString(undefined, {
//       month: "short",
//     })} ${end.getFullYear()}`;
//     return `${startStr} – ${endStr}`;
//   };

//   // Timeline start (Monday-aligned) + offset in days
//   const timelineStart = useMemo(() => {
//     const monday = getMonday(new Date());
//     monday.setDate(monday.getDate() + startOffsetDays);
//     return monday;
//   }, [startOffsetDays]);

//   // Visible 7-day slice for the "calendar ruler" and time-off footer
//   const timelineDays = React.useMemo(() => {
//     const today = startOfDay(new Date());
//     const first = addDays(today, startOffsetDays);
//     return Array.from({ length: DAYS_TO_SHOW }, (_, i) => {
//       const date = addDays(first, i);
//       const weekday = date.toLocaleDateString(undefined, { weekday: "short" }); // Mon
//       const d = date.getDate();
//       const m = date.getMonth() + 1;
//       return {
//         key: date.toISOString().slice(0, 10),
//         day: `${weekday} ${d}.${m}.`,
//         date,
//         isToday: date.getTime() === today.getTime(),
//       };
//     });
//   }, [startOffsetDays]);

//   const headerLabel = useMemo(
//     () => formatRangeHeader(timelineStart, daysToShow),
//     [timelineStart, daysToShow]
//   );

//   // ---------- Sidebar open/close ----------
//   const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
//     drivers: true,
//     engineers: true,
//     hand: true,
//     mechanics: true,
//     tap: true,
//     masters: true,
//     constructionLead: true,
//     machines: true,
//   });

//   // ---------- Sidebar data ----------
//   const [sidebarEmployees, setSidebarEmployees] = useState<SidebarEmployees>({
//     drivers: ["John Doe", "John Dow", "Jordan Miles"],
//     engineers: ["Sarah Wilson", "Mike Johnson", "Emma Davis"],
//     hand: [],
//     mechanics: [],
//     tap: [],
//     masters: [],
//     constructionLead: [],
//   });

//   const [sidebarMachines, setSidebarMachines] = useState<SidebarMachines>({
//     digger: [],
//     loader: [],
//     trailerTrucks: [],
//     wheelers8: [],
//     personalCars: [],
//     tools: ["Hammer", "Wrench", "Jack"],
//   });

//   // ---------- Contract scheduler data (controlled) ----------
//   const [contractData, setContractData] = useState<ContractData>({
//     // Week 1
//     "SO1165-mon": [
//       {
//         id: "mA",
//         name: "Machine A",
//         type: "machine",
//         color: "bg-green-100 text-green-800",
//       },
//       {
//         id: "p1",
//         name: "John Smith",
//         type: "person",
//         parentId: "mA",
//         color: "bg-blue-100 text-blue-800",
//       },
//       {
//         id: "t1",
//         name: "Hammer",
//         type: "tool",
//         parentId: "mA",
//         color: "bg-orange-100 text-orange-800",
//       },
//     ],
//     "SO1165-tue": [
//       {
//         id: "p2",
//         name: "Sarah Wilson",
//         type: "person",
//         color: "bg-purple-100 text-purple-800",
//       },
//     ],
//     "SO1165-wed": [
//       {
//         id: "mB",
//         name: "Machine B",
//         type: "machine",
//         color: "bg-green-100 text-green-800",
//       },
//     ],
//     "SO1165-thu": [
//       {
//         id: "p3",
//         name: "Mike Johnson",
//         type: "person",
//         color: "bg-indigo-100 text-indigo-800",
//       },
//     ],
//     "SO1165-fri": [],
//     "SO1165-sat": [],
//     "SO1165-sun": [],

//     // Week 2
//     "SO1165-week2-mon": [
//       {
//         id: "p4",
//         name: "Emma Davis",
//         type: "person",
//         color: "bg-pink-100 text-pink-800",
//       },
//     ],
//     "SO1165-week2-tue": [],
//     "SO1165-week2-wed": [
//       {
//         id: "mC",
//         name: "Machine C",
//         type: "machine",
//         color: "bg-green-100 text-green-800",
//       },
//     ],
//     "SO1165-week2-thu": [],
//     "SO1165-week2-fri": [
//       {
//         id: "p5",
//         name: "Alex Brown",
//         type: "person",
//         color: "bg-teal-100 text-teal-800",
//       },
//     ],
//     "SO1165-week2-sat": [],
//     "SO1165-week2-sun": [],

//     // Week 3
//     "SO1165-week3-mon": [],
//     "SO1165-week3-tue": [
//       {
//         id: "mD",
//         name: "Machine D",
//         type: "machine",
//         color: "bg-green-100 text-green-800",
//       },
//     ],
//     "SO1165-week3-wed": [],
//     "SO1165-week3-thu": [
//       {
//         id: "p6",
//         name: "Lisa Garcia",
//         type: "person",
//         color: "bg-cyan-100 text-cyan-800",
//       },
//     ],
//     "SO1165-week3-fri": [],
//     "SO1165-week3-sat": [
//       {
//         id: "p7",
//         name: "Tom Wilson",
//         type: "person",
//         color: "bg-lime-100 text-lime-800",
//       },
//     ],
//     "SO1165-week3-sun": [],
//   });

//   // ---------- Time-off data (controlled, based on timelineDays) ----------
//   const initialTimeOffData: TimeOffData = useMemo(() => {
//     const base: TimeOffData = {};
//     // Pre-populate keys for visible days
//     timelineDays.forEach(({ key }) => {
//       base[`vacation-${key}`] = base[`vacation-${key}`] || [];
//       base[`sick-${key}`] = base[`sick-${key}`] || [];
//     });
//     return base;
//   }, [timelineDays]);

//   const [timeOffData, setTimeOffData] =
//     useState<TimeOffData>(initialTimeOffData);

//   useEffect(() => {
//     setTimeOffData((prev) => {
//       const next = { ...prev };
//       timelineDays.forEach(({ key }) => {
//         const vKey = `vacation-${key}`;
//         const sKey = `sick-${key}`;
//         if (!next[vKey]) next[vKey] = [];
//         if (!next[sKey]) next[sKey] = [];
//       });
//       return next;
//     });
//   }, [timelineDays]);

//   // ---------- Global drag payload ----------
//   const [dragged, setDragged] = useState<DragPayload>(null);

//   // Helpers to colorize when adding to a section
//   const contractColorFor = (t: ContractItemType) =>
//     t === "person"
//       ? "bg-blue-100 text-blue-800"
//       : "bg-green-100 text-green-800";
//   const timeOffColorFor = (t: TimeOffItemType) =>
//     t === "person"
//       ? "bg-blue-100 text-blue-800 ring-1 ring-blue-200"
//       : "bg-amber-50 text-amber-700 ring-1 ring-amber-200";

//   // Remove a name everywhere (sidebar + both schedulers)
//   const stripEverywhere = (name: string) => {
//     setSidebarEmployees((prev) => {
//       const next: SidebarEmployees = {
//         drivers: prev.drivers.filter((n) => n !== name),
//         engineers: prev.engineers.filter((n) => n !== name),
//         hand: prev.hand.filter((n) => n !== name),
//         mechanics: prev.mechanics.filter((n) => n !== name),
//         tap: prev.tap.filter((n) => n !== name),
//         masters: prev.masters.filter((n) => n !== name),
//         constructionLead: prev.constructionLead.filter((n) => n !== name),
//       };
//       return next;
//     });
//     setSidebarMachines((prev) => {
//       const next: SidebarMachines = {
//         digger: prev.digger.filter((n) => n !== name),
//         loader: prev.loader.filter((n) => n !== name),
//         trailerTrucks: prev.trailerTrucks.filter((n) => n !== name),
//         wheelers8: prev.wheelers8.filter((n) => n !== name),
//         personalCars: prev.personalCars.filter((n) => n !== name),
//         tools: prev.tools.filter((n) => n !== name),
//       };
//       return next;
//     });
//     setContractData((prev) => {
//       const next: ContractData = {};
//       for (const k of Object.keys(prev)) {
//         next[k] = (prev[k] || []).filter((it) => it.name !== name);
//       }
//       return next;
//     });
//     setTimeOffData((prev) => {
//       const next: TimeOffData = {};
//       for (const k of Object.keys(prev)) {
//         next[k] = (prev[k] || []).filter((it) => it.name !== name);
//       }
//       return next;
//     });
//   };

//   // Central move: place dragged into a target zone + id, ensuring uniqueness
//   const moveTo = (target: {
//     zone: "sidebar" | "contract" | "timeoff";
//     id: string;
//     sidebarCategory?: Category;
//   }) => {
//     if (!dragged) return;
//     const { name, type } = dragged;

//     // 1) remove everywhere (unique)
//     stripEverywhere(name);

//     // 2) add to the selected target
//     if (target.zone === "sidebar") {
//       const [cat, section] = target.id.split(":") as [
//         Category,
//         keyof SidebarEmployees & keyof SidebarMachines & string
//       ];
//       if (cat === "employee") {
//         setSidebarEmployees((prev) => {
//           const cur = prev[section as keyof SidebarEmployees] || [];
//           if (cur.includes(name)) return prev;
//           return { ...prev, [section]: [...cur, name] };
//         });
//       } else {
//         setSidebarMachines((prev) => {
//           const cur = prev[section as keyof SidebarMachines] || [];
//           if (cur.includes(name)) return prev;
//           return { ...prev, [section]: [...cur, name] };
//         });
//       }
//     } else if (target.zone === "contract") {
//       const cellKey = target.id;
//       setContractData((prev) => {
//         const cur = prev[cellKey] || [];
//         if (cur.some((it) => it.name === name)) return prev;
//         const item = { name, type, color: contractColorFor(type) };
//         return { ...prev, [cellKey]: [...cur, item] };
//       });
//     } else if (target.zone === "timeoff") {
//       const cellKey = target.id;
//       setTimeOffData((prev) => {
//         const cur = prev[cellKey] || [];
//         if (cur.some((it) => it.name === name)) return prev;
//         const item = { name, type, color: timeOffColorFor(type) };
//         return { ...prev, [cellKey]: [...cur, item] };
//       });
//     }

//     setDragged(null);
//   };

//   // ---------- Drag starts from Sidebar ----------
//  const handleSidebarDragStart = (
//    e: React.DragEvent<HTMLDivElement>,
//    name: string,
//    category: Category,
//    section: string
//  ) => {
//    // person for Employees; machine for Machines; tool specifically for the Tools section
//    const t: "person" | "machine" | "tool" =
//      category === "employee"
//        ? "person"
//        : section === "tools"
//        ? "tool"
//        : "machine";

//    setDragged({
//      kind: "item",
//      item: { name, type: t, parentId: null },
//      source: { zone: "sidebar", id: `${category}:${section}` },
//    });

//    e.dataTransfer.effectAllowed = "move";
//    try {
//      e.dataTransfer.setData("text/plain", name);
//      e.dataTransfer.setData("application/x-item-type", t);
//    } catch {}
//  };


//   const allowDrop = (e: React.DragEvent<HTMLElement>) => e.preventDefault();

//   // ---------- Contract callbacks ----------
//   // Contract: start dragging a single item (kept backward compatible)
//   const onContractItemDragStart = (
//     name: string,
//     sourceKey: string,
//     type: ContractItemType
//   ) => {
//     // find the full item by name in that cell (assuming names unique in a cell)
//     const it = (contractData[sourceKey] || []).find((x) => x.name === name);
//     setDragged({
//       kind: "item",
//       item: it
//         ? {
//             id: it.id,
//             name: it.name,
//             type: it.type as any,
//             parentId: it.parentId,
//           }
//         : { name, type, parentId: null },
//       source: { zone: "contract", id: sourceKey },
//     });
//   };

//   // NEW: start dragging the whole machine group
//   const onContractGroupDragStart = (
//     machine: { id: string; name: string },
//     children: { id: string; name: string }[],
//     sourceKey: string
//   ) => {
//     setDragged({
//       kind: "group",
//       machine,
//       children,
//       source: { zone: "contract", id: sourceKey },
//     });
//   };

//   // Drop onto bare cell
//   const onContractDrop = (targetKey: string) => {
//     if (!dragged) return;

//     if (dragged.kind === "group" && dragged.source.zone === "contract") {
//       const { source } = dragged;
//       const groupIds = new Set<string>([
//         dragged.machine.id,
//         ...dragged.children.map((c) => c.id),
//       ]);

//       setContractData((prev) => {
//         const next: ContractData = { ...prev };
//         // remove from source
//         const srcArr = (next[source.id] || []).filter(
//           (it) => !groupIds.has(it.id)
//         );
//         next[source.id] = srcArr;

//         // add to target
//         const moved = (prev[source.id] || []).filter((it) =>
//           groupIds.has(it.id)
//         );
//         next[targetKey] = [...(next[targetKey] || []), ...moved];
//         return next;
//       });
//       setDragged(null);
//       return;
//     }

//     if (dragged.kind === "item") {
//       const from = dragged.source;
//       // If from sidebar/timeoff, we create a new item
//       if (from.zone !== "contract") {
//         stripEverywhere(dragged.item.name);
//         setContractData((prev) => {
//           const cur = prev[targetKey] || [];
//           const newItem = {
//             id: uid(),
//             name: dragged.item.name,
//             type: dragged.item.type as ContractItemType,
//             color:
//               dragged.item.type === "person"
//                 ? "bg-blue-100 text-blue-800"
//                 : dragged.item.type === "tool"
//                 ? "bg-orange-100 text-orange-800"
//                 : "bg-green-100 text-green-800",
//             parentId: null, // dropping onto cell = loose
//           };
//           return { ...prev, [targetKey]: [...cur, newItem] };
//         });
//       } else {
//         // move within contract: remove from old cell, add to new cell, clear parentId
//         setContractData((prev) => {
//           const next: ContractData = { ...prev };
//           const it = (next[from.id] || []).find(
//             (x) => x.id === dragged.item.id
//           );
//           if (!it) return prev;
//           next[from.id] = (next[from.id] || []).filter((x) => x.id !== it.id);
//           next[targetKey] = [
//             ...(next[targetKey] || []),
//             { ...it, parentId: null },
//           ];
//           return next;
//         });
//       }
//       setDragged(null);
//     }
//   };

//   // NEW: drop onto a specific machine in a cell (assign under it)
//   const onContractDropOnMachine = (targetKey: string, machineId: string) => {
//     if (!dragged) return;

//     if (dragged.kind === "item") {
//       const from = dragged.source;

//       // Sidebar/timeoff -> create under machine
//       if (from.zone !== "contract") {
//         stripEverywhere(dragged.item.name);
//         setContractData((prev) => {
//           const cur = prev[targetKey] || [];
//           const newItem = {
//             id: uid(),
//             name: dragged.item.name,
//             type: dragged.item.type as ContractItemType,
//             color:
//               dragged.item.type === "person"
//                 ? "bg-blue-100 text-blue-800"
//                 : dragged.item.type === "tool"
//                 ? "bg-orange-100 text-orange-800"
//                 : "bg-green-100 text-green-800",
//             parentId: machineId,
//           };
//           return { ...prev, [targetKey]: [...cur, newItem] };
//         });
//         setDragged(null);
//         return;
//       }

//       // Contract -> reassign/move + set parentId
//       setContractData((prev) => {
//         const next: ContractData = { ...prev };

//         // find item in its source cell
//         const srcArr = next[from.id] || [];
//         const it = srcArr.find((x) => x.id === dragged.item.id);
//         if (!it) return prev;

//         // remove from source
//         next[from.id] = srcArr.filter((x) => x.id !== it.id);

//         // add to target with parentId=machineId
//         next[targetKey] = [
//           ...(next[targetKey] || []),
//           { ...it, parentId: machineId },
//         ];
//         return next;
//       });
//       setDragged(null);
//     }
//   };

//   // ⬅️ NEW: unassign a child from its machine (keeps it in the same day as a loose item)
//   const onContractUnassignChild = (cellKey: string, childId: string) => {
//     setContractData((prev) => {
//       const next: ContractData = { ...prev };
//       const arr = next[cellKey] || [];
//       next[cellKey] = arr.map((it) =>
//         it.id === childId ? { ...it, parentId: null } : it
//       );
//       return next;
//     });
//   };

//   // ---------- TimeOff callbacks ----------
//   const onTimeOffItemDragStart = (
//   name: string,
//   sourceKey: string,
//   type: TimeOffItemType
// ) => {
//   // defer to avoid interfering with native drag init
//   setTimeout(() => {
//     setDragged({
//       kind: "item",
//       item: { name, type: type as "person" | "machine", parentId: null },
//       source: { zone: "timeoff", id: sourceKey },
//     });
//   }, 0);
// };


//   const onTimeOffDrop = (targetKey: string) =>
//     moveTo({ zone: "timeoff", id: targetKey });

//   // ---------- Sidebar drop targets ----------
//   const onDropToEmployeeSection = (section: keyof SidebarEmployees) =>
//     moveTo({
//       zone: "sidebar",
//       id: `employee:${section}`,
//       sidebarCategory: "employee",
//     });

//   const onDropToMachineSection = (section: keyof SidebarMachines) =>
//     moveTo({
//       zone: "sidebar",
//       id: `machine:${section}`,
//       sidebarCategory: "machine",
//     });

//   // ---------- UI helpers ----------
//   const toggleSection = (section: keyof ExpandedSections) =>
//     setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));

//   return (
//     <div className="flex h-screen bg-gray-50">
//       {/* SIDEBAR */}
//       <div className="w-64 shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
//         {/* Header */}
//         <div className="sticky top-0 z-10 bg-white p-3 border-b border-gray-200">
//           <div className="flex items-center gap-0 mb-3">
//             <span className="text-sm font-medium">EuropeanCompany</span>
//             <span className="pt-1.5 rounded text-xs leading-none">
//               <svg
//                 width="20"
//                 height="20"
//                 viewBox="0 0 20 20"
//                 fill="none"
//                 xmlns="http://www.w3.org/2000/svg"
//               >
//                 <path
//                   d="M9.99967 16.6666C11.7678 16.6666 13.4635 15.9643 14.7137 14.714C15.964 13.4638 16.6663 11.7681 16.6663 9.99998C16.6663 8.23187 15.964 6.53618 14.7137 5.28593C13.4635 4.03569 11.7678 3.33331 9.99967 3.33331C8.23156 3.33331 6.53587 4.03569 5.28563 5.28593C4.03539 6.53618 3.33301 8.23187 3.33301 9.99998C3.33301 11.7681 4.03539 13.4638 5.28563 14.714C6.53587 15.9643 8.23156 16.6666 9.99967 16.6666Z"
//                   stroke="black"
//                   stroke-linecap="round"
//                   stroke-linejoin="round"
//                 />
//                 <path
//                   d="M9.99967 11.6666C10.4417 11.6666 10.8656 11.4911 11.1782 11.1785C11.4907 10.8659 11.6663 10.442 11.6663 9.99998C11.6663 9.55795 11.4907 9.13403 11.1782 8.82147C10.8656 8.50891 10.4417 8.33331 9.99967 8.33331C9.55765 8.33331 9.13372 8.50891 8.82116 8.82147C8.5086 9.13403 8.33301 9.55795 8.33301 9.99998C8.33301 10.442 8.5086 10.8659 8.82116 11.1785C9.13372 11.4911 9.55765 11.6666 9.99967 11.6666Z"
//                   stroke="black"
//                   stroke-linecap="round"
//                   stroke-linejoin="round"
//                 />
//                 <path
//                   d="M10 1.66669V3.33335"
//                   stroke="black"
//                   stroke-linecap="round"
//                   stroke-linejoin="round"
//                 />
//                 <path
//                   d="M10 18.3334V16.6667"
//                   stroke="black"
//                   stroke-linecap="round"
//                   stroke-linejoin="round"
//                 />
//                 <path
//                   d="M14.1663 17.2167L13.333 15.775"
//                   stroke="black"
//                   stroke-linecap="round"
//                   stroke-linejoin="round"
//                 />
//                 <path
//                   d="M9.16634 8.55833L5.83301 2.78333"
//                   stroke="black"
//                   stroke-linecap="round"
//                   stroke-linejoin="round"
//                 />
//                 <path
//                   d="M17.2171 14.1666L15.7754 13.3333"
//                   stroke="black"
//                   stroke-linecap="round"
//                   stroke-linejoin="round"
//                 />
//                 <path
//                   d="M2.7832 5.83331L4.22487 6.66665"
//                   stroke="black"
//                   stroke-linecap="round"
//                   stroke-linejoin="round"
//                 />
//                 <path
//                   d="M11.667 10H18.3337"
//                   stroke="black"
//                   stroke-linecap="round"
//                   stroke-linejoin="round"
//                 />
//                 <path
//                   d="M1.66699 10H3.33366"
//                   stroke="black"
//                   stroke-linecap="round"
//                   stroke-linejoin="round"
//                 />
//                 <path
//                   d="M17.2171 5.83331L15.7754 6.66665"
//                   stroke="black"
//                   stroke-linecap="round"
//                   stroke-linejoin="round"
//                 />
//                 <path
//                   d="M2.7832 14.1666L4.22487 13.3333"
//                   stroke="black"
//                   stroke-linecap="round"
//                   stroke-linejoin="round"
//                 />
//                 <path
//                   d="M14.1663 2.78333L13.333 4.22499"
//                   stroke="black"
//                   stroke-linecap="round"
//                   stroke-linejoin="round"
//                 />
//                 <path
//                   d="M9.16634 11.4417L5.83301 17.2167"
//                   stroke="black"
//                   stroke-linecap="round"
//                   stroke-linejoin="round"
//                 />
//               </svg>
//             </span>
//           </div>
//           <div className="relative">
//             <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
//             <input
//               type="text"
//               placeholder="Search"
//               className="w-full pl-8 pr-3 py-1.5 bg-gray-100 rounded-md text-sm outline-none"
//             />
//           </div>
//           {/* <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
//             <span className="bg-gray-100 px-2 py-0.5 rounded">
//               21. 3. - 24. 4.
//             </span>
//           </div> */}
//         </div>

//         {/* ================= EMPLOYEES ================= */}
//         <div className="border-b border-gray-200">
//           <div className="px-3 py-2 text-sm font-medium flex items-center gap-2">
//             <Users className="h-4 w-4 text-gray-600" />
//             Employees
//           </div>

//           {/* Outer rail for Employees */}
//           <div className="px-3 pb-2">
//             <div className="relative pl-4">
//               {/* outer vertical rail - no gaps */}
//               <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-px bg-gray-300"></div>

//               {/* ---- Drivers ---- */}
//               <div
//                 className="relative pl-1 py-1 text-sm text-gray-800 cursor-pointer flex items-center justify-between
//                    before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
//                 onClick={() => toggleSection("drivers")}
//               >
//                 <span>Drivers</span>
//                 {expandedSections.drivers ? (
//                   <ChevronUp className="h-3 w-3" />
//                 ) : (
//                   <ChevronDown className="h-3 w-3" />
//                 )}
//               </div>

//               {expandedSections.drivers && (
//                 <div
//                   className="relative ml-2 pl-4 pb-2 space-y-1
//                      before:absolute before:content-[''] before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-gray-300"
//                   onDragOver={allowDrop}
//                   onDrop={() => onDropToEmployeeSection("drivers")}
//                 >
//                   {sidebarEmployees.drivers.map((emp, idx) => (
//                     <div
//                       key={`drivers-${emp}-${idx}`}
//                       className="relative
//                          before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
//                     >
//                       <div
//                         draggable
//                         onDragStart={(e) =>
//                           handleSidebarDragStart(e, emp, "employee", "drivers")
//                         }
//                         className={[
//                           "px-3 py-1.5 rounded-md text-[11px] leading-[14px] font-semibold text-slate-700 shadow-sm cursor-move border-b-[2px] border-b",
//                           "bg-gradient-to-b ",
//                           idx === 0
//                             ? "from-sky-100 to-blue-50 border-blue-400"
//                             : idx === 1
//                             ? "from-emerald-100 to-green-50 border-green-400"
//                             : idx === 2
//                             ? "from-fuchsia-100 to-pink-100 border-pink-400"
//                             : "from-slate-100 to-rose-50 border-rose-400 text-slate-400",
//                         ].join(" ")}
//                       >
//                         {emp}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}

//               {/* ---- Engineers ---- */}
//               <div
//                 className="relative pl-1 py-1 text-sm text-gray-800 cursor-pointer flex items-center justify-between
//                    before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
//                 onClick={() => toggleSection("engineers")}
//               >
//                 <span>Engineers</span>
//                 {expandedSections.engineers ? (
//                   <ChevronUp className="h-3 w-3" />
//                 ) : (
//                   <ChevronDown className="h-3 w-3" />
//                 )}
//               </div>

//               {expandedSections.engineers && (
//                 <div
//                   className="relative ml-2 pl-4 pb-2 space-y-1
//                      before:absolute before:content-[''] before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-gray-300"
//                   onDragOver={allowDrop}
//                   onDrop={() => onDropToEmployeeSection("engineers")}
//                 >
//                   {sidebarEmployees.engineers.map((emp, idx) => (
//                     <div
//                       key={`engineers-${emp}-${idx}`}
//                       className="relative
//                          before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
//                     >
//                       <div
//                         draggable
//                         onDragStart={(e) =>
//                           handleSidebarDragStart(
//                             e,
//                             emp,
//                             "employee",
//                             "engineers"
//                           )
//                         }
//                         className={[
//                           "px-3 py-1.5 rounded-md text-[11px] leading-[14px] font-semibold text-slate-700 shadow-sm cursor-move border-b-[2px] border-b",
//                           "bg-gradient-to-b ",
//                           idx < 2
//                             ? "from-emerald-100 to-green-50 border-green-400"
//                             : "from-slate-100 to-rose-50 border-rose-400 text-slate-400",
//                         ].join(" ")}
//                       >
//                         {emp}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}

//               {/* Collapsed categories — elbows only */}
//               {["hand", "mechanics", "tap", "masters", "constructionLead"].map(
//                 (cat) => (
//                   <div key={cat}>
//                     <div
//                       className="relative pl-1 py-1 text-sm text-gray-800 cursor-pointer flex items-center justify-between
//                          before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
//                       onClick={() =>
//                         toggleSection(cat as keyof ExpandedSections)
//                       }
//                     >
//                       <span>
//                         {cat[0].toUpperCase() +
//                           cat.slice(1).replace(/([A-Z])/g, " $1")}
//                       </span>
//                       {expandedSections[cat as keyof ExpandedSections] ? (
//                         <ChevronUp className="h-3 w-3" />
//                       ) : (
//                         <ChevronDown className="h-3 w-3" />
//                       )}
//                     </div>

//                     {expandedSections[cat as keyof ExpandedSections] && (
//                       <div
//                         className="relative ml-2 pl-4 pb-2 space-y-1
//                            before:absolute before:content-[''] before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-gray-300"
//                         onDragOver={allowDrop}
//                         onDrop={() =>
//                           onDropToEmployeeSection(cat as keyof SidebarEmployees)
//                         }
//                       >
//                         {(
//                           sidebarEmployees[
//                             cat as keyof SidebarEmployees
//                           ] as string[]
//                         ).map((emp, idx) => (
//                           <div
//                             key={`${cat}-${emp}-${idx}`}
//                             className="relative
//                                  before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
//                           >
//                             <div
//                               draggable
//                               onDragStart={(e) =>
//                                 handleSidebarDragStart(e, emp, "employee", cat)
//                               }
//                               className="px-3 py-1.5 rounded-md text-[11px] leading-[14px] font-semibold text-slate-700 shadow-sm cursor-move
//                                    bg-gradient-to-b from-sky-100 to-blue-50 border border-blue-200"
//                             >
//                               {emp}
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     )}
//                   </div>
//                 )
//               )}
//             </div>
//           </div>
//         </div>

//         {/* ================= MACHINES ================= */}
//         <div className="px-3 py-2">
//           <div className="text-sm font-medium mb-1">
//             <Truck className="h-4 w-4 inline-block mr-1 text-gray-600" />
//             Machines
//           </div>

//           {/* Outer rail for Machines */}
//           <div className="relative pl-4">
//             <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-px bg-gray-300"></div>

//             {[
//               { key: "digger", label: "Digger" },
//               { key: "loader", label: "Loader" },
//               { key: "trailerTrucks", label: "Trailer trucks" },
//               { key: "wheelers8", label: "8 wheelers" },
//               { key: "personalCars", label: "Personal cars" },
//             ].map(({ key, label }) => (
//               <div
//                 key={key}
//                 className="relative pl-1 py-1 text-sm text-gray-900
//                    before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
//                 onDragOver={allowDrop}
//                 onDrop={() =>
//                   onDropToMachineSection(key as keyof SidebarMachines)
//                 }
//               >
//                 {label}
//               </div>
//             ))}

//             {/* Tools branch with inner rail + elbows + chips */}
//             <div
//               className="relative pl-1 py-1 text-sm text-gray-900
//                  before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
//             >
//               Tools
//             </div>

//             <div
//               className="relative ml-2 pl-4 pb-1 space-y-1
//                  before:absolute before:content-[''] before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-gray-300"
//               onDragOver={allowDrop}
//               onDrop={() => onDropToMachineSection("tools")}
//             >
//               {sidebarMachines.tools.map((tool, idx) => (
//                 <div
//                   key={`tools-${tool}-${idx}`}
//                   className="relative
//                      before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
//                 >
//                   <div
//                     draggable
//                     onDragStart={(e) =>
//                       handleSidebarDragStart(e, tool, "machine", "tools")
//                     }
//                     className="relative px-3 py-1.5 rounded-md text-[11px] leading-[14px] font-semibold text-slate-700 shadow-sm cursor-move
//                        bg-orange-100 border-b border-b-[2px] border-orange-200"
//                   >
//                     {tool}
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>

//         {/* Footer */}
//         <a href="/contracts">
//           <div className="px-3 py-2 border-t border-gray-200">
//             <div className="flex items-center gap-2">
//               <span className="text-sm font-medium">
//                 <FileText className="h-4 w-4 text-gray-600 inline-block mr-1" />
//                 Contracts
//               </span>
//             </div>
//           </div>
//         </a>
//       </div>

//       {/* Main Content */}
//       <div className="flex-1 overflow-x-auto pb-48 bg-gray-100">
//         <div className="min-w-max">
//           {/* ======= HEADER ======= */}
//           <div className="bg-white w-[79rem] border-b border-gray-200 px-6 py-3">
//             <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
//               {/* Left: Month / Year */}
//               <div>
//                 <h1 className="text-[22px] leading-6 font-semibold tracking-tight">
//                   {headerLabel}
//                 </h1>
//               </div>

//               {/* Center: Search pill */}
//               <div className="justify-self-center w-80 relative">
//                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
//                 <input
//                   type="text"
//                   placeholder="Search"
//                   className="h-9 w-full pl-9 pr-3 rounded-full text-sm placeholder:text-gray-400
//                    bg-gray-50 ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-200"
//                 />
//               </div>

//               {/* Right: segmented controls + floating badge */}
//               <div className="justify-self-end relative flex items-center gap-4">
//                 <div className="inline-flex items-stretch rounded-lg overflow-hidden ring-1 ring-gray-200 bg-white mr-7">
//                   <button
//                     className="px-2 py-2 hover:bg-gray-50"
//                     onClick={() => setStartOffsetDays((d) => d - 1)} // ← one day back
//                   >
//                     <ChevronLeft className="h-4 w-4 text-gray-800" />
//                   </button>

//                   <button
//                     className="px-4 py-2 text-sm font-medium border-x border-gray-200 hover:bg-gray-50"
//                     onClick={() => setStartOffsetDays(0)} // ← jump to today
//                   >
//                     Today
//                   </button>

//                   <button
//                     className="px-2 py-2 hover:bg-gray-50"
//                     onClick={() => setStartOffsetDays((d) => d + 1)} // ← one day forward
//                   >
//                     <ChevronRight className="h-4 w-4 text-gray-800" />
//                   </button>
//                 </div>

//                 {/* Floating red badge (top-right of the control) */}
//                 <button
//                   className="absolute top-0 -right-4 inline-flex items-center justify-center w-8 h-8 rounded-full bg-rose-500 text-white shadow-md"
//                   title="Notifications"
//                 >
//                   <Bell className="h-4 w-4" />
//                   <span
//                     className="absolute -top-1 -right-1 inline-flex items-center justify-center
//                          w-4 h-4 rounded-full bg-white text-rose-600 text-[10px] font-semibold"
//                   >
//                     2
//                   </span>
//                 </button>
//               </div>
//             </div>
//           </div>

//           {/* ======= WEEK ROW (under the header) ======= */}

//           <div className="bg-white">
//             <div className="border-b border-gray-200">
//               <div
//                 className="grid"
//                 style={{
//                   gridTemplateColumns: `repeat(${timelineDays.length}, minmax(120px, 1fr))`, // = 7 cols
//                 }}
//               >
//                 {timelineDays.map((d, i) => (
//                   <div
//                     key={d.key}
//                     className={`p-3 text-center text-[13px] ${
//                       i === 0 ? "" : "border-l border-gray-200"
//                     } ${
//                       d.isToday ? "text-black font-semibold" : "text-gray-600"
//                     }`}
//                     title={d.date.toLocaleDateString()}
//                   >
//                     <div>{d.day}</div>
//                     {d.isToday && (
//                       <div className="mx-auto mt-1 h-[3px] w-8 rounded-full bg-black" />
//                     )}
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {/* Calendar grid stays as-is */}
//             <ContractScheduler
//               data={contractData}
//               onDragStart={onContractItemDragStart}
//               onDrop={onContractDrop}
//               onGroupDragStart={onContractGroupDragStart}
//               onDropOnMachine={onContractDropOnMachine}
//               onUnassignChild={onContractUnassignChild} // ⬅️ NEW
//             />
//           </div>
//         </div>
//       </div>

//       {/* Sticky Vacation/Sick footer (controlled, uses same flexible timeline) */}
//       <TimeOffScheduler
//         weekDays={timelineDays}
//         data={timeOffData}
//         onDragStart={onTimeOffItemDragStart}
//         onDrop={onTimeOffDrop}
//       />

//       {/* Add Contract Button */}
//       <button className="fixed z-100 bottom-6 right-6 bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:bg-gray-800">
//         <Plus className="h-4 w-4" />
//         Add contract
//       </button>

//       {/* Range size quick picker (keep if you still want to vary days) */}
//       {/* <div className="fixed bottom-6 left-6">
//         <select
//           className="text-sm bg-white border border-gray-200 rounded px-3 py-2 shadow"
//           value={daysToShow}
//           onChange={(e) => setDaysToShow(parseInt(e.target.value, 10))}
//           title="Days visible"
//         >
//           <option value={7}>7 days</option>
//           <option value={14}>14 days</option>
//           <option value={21}>21 days</option>
//           <option value={28}>28 days</option>
//           <option value={60}>60 days</option>
//         </select>
//       </div> */}
//     </div>
//   );
// };

// export default Dashboard;



import React, { useMemo, useState, useEffect } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Bell,
  FileText,
  Users,
  Truck,
} from "lucide-react";

import ContractScheduler, {
  CalendarData as ContractData,
  ItemType as ContractItemType,
  CalendarItem as ContractCalendarItem,
} from "../CalenderComponents/ContractScheduler";

import TimeOffScheduler, {
  CalendarData as TimeOffData,
  ItemType as TimeOffItemType,
} from "../CalenderComponents/TimeOffScheduler";

type Category = "employee" | "machine";

type ExpandedSections = {
  drivers: boolean;
  engineers: boolean;
  hand: boolean;
  mechanics: boolean;
  tap: boolean;
  masters: boolean;
  constructionLead: boolean;
  machines: boolean;
};

type SidebarEmployees = {
  drivers: string[];
  engineers: string[];
  hand: string[];
  mechanics: string[];
  tap: string[];
  masters: string[];
  constructionLead: string[];
};

type SidebarMachines = {
  digger: string[];
  loader: string[];
  trailerTrucks: string[];
  wheelers8: string[];
  personalCars: string[];
  tools: string[];
};

/** carry meta so we can move machine-with-children or detach child-of-machine */
type DragPayload = {
  name: string;
  type: "person" | "machine" | "tool";
  source: { zone: "sidebar" | "contract" | "timeoff"; id: string };
  meta?: {
    childrenSnapshot?: ContractCalendarItem[];
    childOf?: string; // when dragging a child out of machine
  };
} | null;

const Dashboard: React.FC = () => {
  const DAYS_TO_SHOW = 7;

  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const addDays = (d: Date, n: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };

  const getMonday = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0..6
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  };

  // const formatDayLabel = (d: Date) => {
  //   const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
  //   const day = d.getDate();
  //   const month = d.getMonth() + 1;
  //   return `${weekday} ${day}.${month}.`;
  // };

  const [daysToShow, _setDaysToShow] = useState(28);
  const [startOffsetDays, setStartOffsetDays] = useState(0);

  // const isSameYMD = (a: Date, b: Date) =>
  //   a.getFullYear() === b.getFullYear() &&
  //   a.getMonth() === b.getMonth() &&
  //   a.getDate() === b.getDate();

  const formatRangeHeader = (start: Date, days: number) => {
    const end = new Date(start);
    end.setDate(end.getDate() + days - 1);
    const sameMonth =
      start.getMonth() === end.getMonth() &&
      start.getFullYear() === end.getFullYear();

    if (sameMonth) {
      return `${start.toLocaleString(undefined, {
        month: "long",
      })} ${start.getFullYear()}`;
    }
    const startStr = `${start.toLocaleString(undefined, {
      month: "short",
    })} ${start.getFullYear()}`;
    const endStr = `${end.toLocaleString(undefined, {
      month: "short",
    })} ${end.getFullYear()}`;
    return `${startStr} – ${endStr}`;
  };

  const timelineStart = useMemo(() => {
    const monday = getMonday(new Date());
    monday.setDate(monday.getDate() + startOffsetDays);
    return monday;
  }, [startOffsetDays]);

  const timelineDays = React.useMemo(() => {
    const today = startOfDay(new Date());
    const first = addDays(today, startOffsetDays);
    return Array.from({ length: DAYS_TO_SHOW }, (_, i) => {
      const date = addDays(first, i);
      const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
      const d = date.getDate();
      const m = date.getMonth() + 1;
      return {
        key: date.toISOString().slice(0, 10),
        day: `${weekday} ${d}.${m}.`,
        date,
        isToday: date.getTime() === today.getTime(),
      };
    });
  }, [startOffsetDays]);

  const headerLabel = useMemo(
    () => formatRangeHeader(timelineStart, daysToShow),
    [timelineStart, daysToShow]
  );

  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    drivers: true,
    engineers: true,
    hand: true,
    mechanics: true,
    tap: true,
    masters: true,
    constructionLead: true,
    machines: true,
  });

  const [sidebarEmployees, setSidebarEmployees] = useState<SidebarEmployees>({
    drivers: ["John Doe", "John Dow", "Jordan Miles"],
    engineers: ["Sarah Wilson", "Mike Johnson", "Emma Davis"],
    hand: [],
    mechanics: [],
    tap: [],
    masters: [],
    constructionLead: [],
  });

  const [sidebarMachines, setSidebarMachines] = useState<SidebarMachines>({
    digger: [],
    loader: [],
    trailerTrucks: [],
    wheelers8: [],
    personalCars: [],
    tools: ["Hammer", "Wrench", "Jack"],
  });

  /** ---------- Contract scheduler state (now supports children under machines) ---------- */
  const [contractData, setContractData] = useState<ContractData>({
    "SO1165-mon": [
      {
        name: "Machine A",
        type: "machine",
        color: "bg-green-100 text-green-800",
        children: [
          { name: "John Smith", type: "person" },
          { name: "Hammer", type: "tool" },
        ],
      },
    ],
    "SO1165-tue": [{ name: "Sarah Wilson", type: "person" }],
    "SO1165-wed": [{ name: "Machine B", type: "machine" }],
    "SO1165-thu": [{ name: "Mike Johnson", type: "person" }],
    "SO1165-fri": [],
    "SO1165-sat": [],
    "SO1165-sun": [],

    "SO1165-week2-mon": [{ name: "Emma Davis", type: "person" }],
    "SO1165-week2-tue": [],
    "SO1165-week2-wed": [{ name: "Machine C", type: "machine" }],
    "SO1165-week2-thu": [],
    "SO1165-week2-fri": [{ name: "Alex Brown", type: "person" }],
    "SO1165-week2-sat": [],
    "SO1165-week2-sun": [],

    "SO1165-week3-mon": [],
    "SO1165-week3-tue": [{ name: "Machine D", type: "machine" }],
    "SO1165-week3-wed": [],
    "SO1165-week3-thu": [{ name: "Lisa Garcia", type: "person" }],
    "SO1165-week3-fri": [],
    "SO1165-week3-sat": [{ name: "Tom Wilson", type: "person" }],
    "SO1165-week3-sun": [],
  });

  /** ---------- Time-off (unchanged structure) ---------- */
  const initialTimeOffData: TimeOffData = useMemo(() => {
    const base: TimeOffData = {};
    timelineDays.forEach(({ key }) => {
      base[`vacation-${key}`] = base[`vacation-${key}`] || [];
      base[`sick-${key}`] = base[`sick-${key}`] || [];
    });
    return base;
  }, [timelineDays]);

  const [timeOffData, setTimeOffData] =
    useState<TimeOffData>(initialTimeOffData);

  useEffect(() => {
    setTimeOffData((prev) => {
      const next = { ...prev };
      timelineDays.forEach(({ key }) => {
        const vKey = `vacation-${key}`;
        const sKey = `sick-${key}`;
        if (!next[vKey]) next[vKey] = [];
        if (!next[sKey]) next[sKey] = [];
      });
      return next;
    });
  }, [timelineDays]);

  const [dragged, setDragged] = useState<DragPayload>(null);

  // ---------- helpers ----------
  const contractColorFor = (t: ContractItemType) =>
    t === "person"
      ? "bg-blue-100 text-blue-800"
      : t === "tool"
      ? "bg-amber-50 text-amber-800"
      : "bg-green-100 text-green-800";

  const timeOffColorFor = (t: TimeOffItemType) =>
    t === "person"
      ? "bg-blue-100 text-blue-800 ring-1 ring-blue-200"
      : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"; // treat non-person as amber

  /** remove a name from top-level AND nested children everywhere */
  const stripFromItems = (items: ContractCalendarItem[], name: string): ContractCalendarItem[] =>
    items
      .filter((it) => it.name !== name)
      .map((it: ContractCalendarItem): ContractCalendarItem =>
        it.type === "machine" && it.children?.length
          ? { ...it, children: stripFromItems(it.children, name) }
          : it
      );

  const stripEverywhere = (name: string) => {
    setSidebarEmployees((prev) => ({
      drivers: prev.drivers.filter((n) => n !== name),
      engineers: prev.engineers.filter((n) => n !== name),
      hand: prev.hand.filter((n) => n !== name),
      mechanics: prev.mechanics.filter((n) => n !== name),
      tap: prev.tap.filter((n) => n !== name),
      masters: prev.masters.filter((n) => n !== name),
      constructionLead: prev.constructionLead.filter((n) => n !== name),
    }));
    setSidebarMachines((prev) => ({
      digger: prev.digger.filter((n) => n !== name),
      loader: prev.loader.filter((n) => n !== name),
      trailerTrucks: prev.trailerTrucks.filter((n) => n !== name),
      wheelers8: prev.wheelers8.filter((n) => n !== name),
      personalCars: prev.personalCars.filter((n) => n !== name),
      tools: prev.tools.filter((n) => n !== name),
    }));
    setContractData((prev) => {
      const next: ContractData = {};
      for (const k of Object.keys(prev))
        next[k] = stripFromItems(prev[k], name);
      return next;
    });
    setTimeOffData((prev) => {
      const next: TimeOffData = {};
      for (const k of Object.keys(prev)) {
        next[k] = (prev[k] || []).filter((it) => it.name !== name);
      }
      return next;
    });
  };

  /** attach an item as a child to a given machine in a cell */
  const attachToMachine = (
    cellKey: string,
    machineName: string,
    item: ContractCalendarItem
  ) => {
    setContractData((prev) => {
      const cur = prev[cellKey] || [];
      const next = cur.map((it) => {
        if (it.type === "machine" && it.name === machineName) {
          const children = it.children ? [...it.children] : [];
          if (!children.some((c) => c.name === item.name)) {
            children.push(item);
          }
          return { ...it, children };
        }
        return it;
      });
      return { ...prev, [cellKey]: next };
    });
  };

  // ---------- Central move ----------
  const moveTo = (target: {
    zone: "sidebar" | "contract" | "timeoff";
    id: string; // cellKey or "employee:drivers" etc
    assignToMachine?: { machineName: string } | null;
  }) => {
    if (!dragged) return;
    const { name, type, meta } = dragged;

    // 1) make unique
    stripEverywhere(name);

    // 2) place
    if (target.zone === "sidebar") {
      const [cat, section] = target.id.split(":") as [
        Category,
        keyof SidebarEmployees & keyof SidebarMachines & string
      ];
      if (cat === "employee") {
        setSidebarEmployees((prev) => {
          const cur = prev[section as keyof SidebarEmployees] || [];
          if (cur.includes(name)) return prev;
          return { ...prev, [section]: [...cur, name] };
        });
      } else {
        setSidebarMachines((prev) => {
          const cur = prev[section as keyof SidebarMachines] || [];
          if (cur.includes(name)) return prev;
          return { ...prev, [section]: [...cur, name] };
        });
      }
    } else if (target.zone === "contract") {
      const cellKey = target.id;

      // Assign directly to a machine?
      if (target.assignToMachine && type !== "machine") {
        const item: ContractCalendarItem = {
          name,
          type,
          color: contractColorFor(type),
        };
        attachToMachine(cellKey, target.assignToMachine.machineName, item);
        setDragged(null);
        return;
      }

      // Dropped into the cell (top-level)
      setContractData((prev) => {
        const cur = prev[cellKey] || [];

        // If we dragged a machine with children, preserve them
        if (type === "machine" && meta?.childrenSnapshot) {
          const machineItem: ContractCalendarItem = {
            name,
            type: "machine",
            color: contractColorFor("machine"),
            children: meta.childrenSnapshot.map((c) => ({
              ...c,
              color: contractColorFor(c.type as ContractItemType),
            })),
          };
          return { ...prev, [cellKey]: [...cur, machineItem] };
        }

        // Otherwise plain top-level chip
        if (cur.some((it) => it.name === name)) return prev;
        const item = { name, type, color: contractColorFor(type) };
        return { ...prev, [cellKey]: [...cur, item] };
      });
    } else if (target.zone === "timeoff") {
      const cellKey = target.id;
      setTimeOffData((prev) => {
        const cur = prev[cellKey] || [];
        if (cur.some((it) => it.name === name)) return prev;
        const item = { name, type, color: timeOffColorFor(type) };
        return { ...prev, [cellKey]: [...cur, item] };
      });
    }

    setDragged(null);
  };

  // ---------- Drag starts ----------
  const handleSidebarDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    name: string,
    category: Category,
    section: string
  ) => {
    // Employees -> person. Machines: if section === "tools" => tool, else machine
    let t: "person" | "machine" | "tool" =
      category === "employee"
        ? "person"
        : section === "tools"
        ? "tool"
        : "machine";

    setDragged({
      name,
      type: t,
      source: { zone: "sidebar", id: `${category}:${section}` },
    });
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", name);
      e.dataTransfer.setData("application/x-item-type", t);
    } catch {}
  };

  const allowDrop = (e: React.DragEvent<HTMLElement>) => e.preventDefault();

  const onContractItemDragStart = (
    name: string,
    sourceKey: string,
    type: ContractItemType,
    meta?: { childrenSnapshot?: ContractCalendarItem[]; childOf?: string }
  ) =>
    setDragged({
      name,
      type,
      source: { zone: "contract", id: sourceKey },
      meta,
    });

  const onContractDrop = (targetKey: string) =>
    moveTo({ zone: "contract", id: targetKey });

  /** NEW: assign to a specific machine on drop */
  const onContractDropToMachine = (targetKey: string, machineName: string) =>
    moveTo({
      zone: "contract",
      id: targetKey,
      assignToMachine: { machineName },
    });

  // ---------- TimeOff ----------
  const onTimeOffItemDragStart = (
    name: string,
    sourceKey: string,
    type: TimeOffItemType
  ) => {
    setTimeout(() => {
      setDragged({ name, type, source: { zone: "timeoff", id: sourceKey } });
    }, 0);
  };

  const onTimeOffDrop = (targetKey: string) =>
    moveTo({ zone: "timeoff", id: targetKey });

  // ---------- Sidebar drop targets ----------
  const onDropToEmployeeSection = (section: keyof SidebarEmployees) =>
    moveTo({
      zone: "sidebar",
      id: `employee:${section}`,
    });

  const onDropToMachineSection = (section: keyof SidebarMachines) =>
    moveTo({
      zone: "sidebar",
      id: `machine:${section}`,
    });

  const toggleSection = (section: keyof ExpandedSections) =>
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));

  return (
    <div className="flex h-screen bg-gray-50">
      {/* SIDEBAR */}
      <div className="w-64 shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white p-3 border-b border-gray-200">
          <div className="flex items-center gap-0 mb-3">
            <span className="text-sm font-medium">EuropeanCompany</span>
            <span className="pt-1.5 rounded text-xs leading-none">
              {/* logo omitted for brevity */}
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-8 pr-3 py-1.5 bg-gray-100 rounded-md text-sm outline-none"
            />
          </div>
        </div>

        {/* ================= EMPLOYEES ================= */}
        <div className="border-b border-gray-200">
          <div className="px-3 py-2 text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-600" />
            Employees
          </div>

          <div className="px-3 pb-2">
            <div className="relative pl-4">
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-px bg-gray-300"></div>

              {/* ---- Drivers ---- */}
              <div
                className="relative pl-1 py-1 text-sm text-gray-800 cursor-pointer flex items-center justify-between
                   before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
                onClick={() => toggleSection("drivers")}
              >
                <span>Drivers</span>
                {expandedSections.drivers ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </div>

              {expandedSections.drivers && (
                <div
                  className="relative ml-2 pl-4 pb-2 space-y-1
                     before:absolute before:content-[''] before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-gray-300"
                  onDragOver={allowDrop}
                  onDrop={() => onDropToEmployeeSection("drivers")}
                >
                  {sidebarEmployees.drivers.map((emp, idx) => (
                    <div
                      key={`drivers-${emp}-${idx}`}
                      className="relative before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
                    >
                      <div
                        draggable
                        onDragStart={(e) =>
                          handleSidebarDragStart(e, emp, "employee", "drivers")
                        }
                        className={[
                          "px-3 py-1.5 rounded-md text-[11px] leading-[14px] font-semibold text-slate-700 shadow-sm cursor-move border-b-[2px] ",
                          "bg-gradient-to-b ",
                          idx === 0
                            ? "from-sky-100 to-blue-50 border-blue-400"
                            : idx === 1
                            ? "from-emerald-100 to-green-50 border-green-400"
                            : idx === 2
                            ? "from-fuchsia-100 to-pink-100 border-pink-400"
                            : "from-slate-100 to-rose-50 border-rose-400 text-slate-400",
                        ].join(" ")}
                      >
                        {emp}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ---- Engineers ---- */}
              <div
                className="relative pl-1 py-1 text-sm text-gray-800 cursor-pointer flex items-center justify-between
                   before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
                onClick={() => toggleSection("engineers")}
              >
                <span>Engineers</span>
                {expandedSections.engineers ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </div>

              {expandedSections.engineers && (
                <div
                  className="relative ml-2 pl-4 pb-2 space-y-1
                     before:absolute before:content-[''] before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-gray-300"
                  onDragOver={allowDrop}
                  onDrop={() => onDropToEmployeeSection("engineers")}
                >
                  {sidebarEmployees.engineers.map((emp, idx) => (
                    <div
                      key={`engineers-${emp}-${idx}`}
                      className="relative before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
                    >
                      <div
                        draggable
                        onDragStart={(e) =>
                          handleSidebarDragStart(
                            e,
                            emp,
                            "employee",
                            "engineers"
                          )
                        }
                        className={[
                          "px-3 py-1.5 rounded-md text-[11px] leading-[14px] font-semibold text-slate-700 shadow-sm cursor-move border-b-[2px] ",
                          "bg-gradient-to-b ",
                          idx < 2
                            ? "from-emerald-100 to-green-50 border-green-400"
                            : "from-slate-100 to-rose-50 border-rose-400 text-slate-400",
                        ].join(" ")}
                      >
                        {emp}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Other employee branches unchanged... */}
              {["hand", "mechanics", "tap", "masters", "constructionLead"].map(
                (cat) => (
                  <div key={cat}>
                    <div
                      className="relative pl-1 py-1 text-sm text-gray-800 cursor-pointer flex items-center justify-between
                         before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
                      onClick={() =>
                        toggleSection(cat as keyof ExpandedSections)
                      }
                    >
                      <span>
                        {cat[0].toUpperCase() +
                          cat.slice(1).replace(/([A-Z])/g, " $1")}
                      </span>
                      {expandedSections[cat as keyof ExpandedSections] ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </div>

                    {expandedSections[cat as keyof ExpandedSections] && (
                      <div
                        className="relative ml-2 pl-4 pb-2 space-y-1
                           before:absolute before:content-[''] before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-gray-300"
                        onDragOver={allowDrop}
                        onDrop={() =>
                          onDropToEmployeeSection(cat as keyof SidebarEmployees)
                        }
                      >
                        {(
                          sidebarEmployees[
                            cat as keyof SidebarEmployees
                          ] as string[]
                        ).map((emp, idx) => (
                          <div
                            key={`${cat}-${emp}-${idx}`}
                            className="relative before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
                          >
                            <div
                              draggable
                              onDragStart={(e) =>
                                handleSidebarDragStart(e, emp, "employee", cat)
                              }
                              className="px-3 py-1.5 rounded-md text-[11px] leading-[14px] font-semibold text-slate-700 shadow-sm cursor-move
                                   bg-gradient-to-b from-sky-100 to-blue-50 border border-blue-200"
                            >
                              {emp}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* ================= MACHINES ================= */}
        <div className="px-3 py-2">
          <div className="text-sm font-medium mb-1">
            <Truck className="h-4 w-4 inline-block mr-1 text-gray-600" />
            Machines
          </div>

          <div className="relative pl-4">
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-px bg-gray-300"></div>

            {[
              { key: "digger", label: "Digger" },
              { key: "loader", label: "Loader" },
              { key: "trailerTrucks", label: "Trailer trucks" },
              { key: "wheelers8", label: "8 wheelers" },
              { key: "personalCars", label: "Personal cars" },
            ].map(({ key, label }) => (
              <div
                key={key}
                className="relative pl-1 py-1 text-sm text-gray-900
                   before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
                onDragOver={allowDrop}
                onDrop={() =>
                  onDropToMachineSection(key as keyof SidebarMachines)
                }
              >
                {label}
              </div>
            ))}

            {/* Tools */}
            <div
              className="relative pl-1 py-1 text-sm text-gray-900
                 before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
            >
              Tools
            </div>

            <div
              className="relative ml-2 pl-4 pb-1 space-y-1
                 before:absolute before:content-[''] before:left-0 before:top-0 before:bottom-0 before:w-px"
              onDragOver={allowDrop}
              onDrop={() => onDropToMachineSection("tools")}
            >
              {sidebarMachines.tools.map((tool, idx) => (
                <div
                  key={`tools-${tool}-${idx}`}
                  className="relative before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
                >
                  <div
                    draggable
                    onDragStart={(e) =>
                      handleSidebarDragStart(e, tool, "machine", "tools")
                    }
                    className="relative px-3 py-1.5 rounded-md text-[11px] leading-[14px] font-semibold text-slate-700 shadow-sm cursor-move
                       bg-orange-100 border-b-[2px] border-orange-200"
                  >
                    {tool}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <a href="/contracts">
          <div className="px-3 py-2 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                <FileText className="h-4 w-4 text-gray-600 inline-block mr-1" />
                Contracts
              </span>
            </div>
          </div>
        </a>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-x-auto pb-48 bg-gray-100">
        <div className="min-w-max">
          {/* HEADER */}
          <div className="bg-white w-[79rem] border-b border-gray-200 px-6 py-3">
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
                />
              </div>
              <div className="justify-self-end relative flex items-center gap-4">
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

                <button className="absolute top-0 -right-4 inline-flex items-center justify-center w-8 h-8 rounded-full bg-rose-500 text-white shadow-md">
                  <Bell className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white text-rose-600 text-[10px] font-semibold">
                    2
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* WEEK RULER */}
          <div className="bg-white">
            <div className="border-b border-gray-200">
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${timelineDays.length}, minmax(120px, 1fr))`,
                }}
              >
                {timelineDays.map((d, i) => (
                  <div
                    key={d.key}
                    className={`p-3 text-center text-[13px] ${
                      i === 0 ? "" : "border-l border-gray-200"
                    } ${
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
              onDropToMachine={onContractDropToMachine} // 👈 make sure this is here
            />
          </div>
        </div>
      </div>

      {/* Sticky Vacation/Sick footer */}
      <TimeOffScheduler
        weekDays={timelineDays}
        data={timeOffData}
        onDragStart={onTimeOffItemDragStart}
        onDrop={onTimeOffDrop}
      />

      <a href="/add-contract">
      <button className="fixed z-100 bottom-6 right-6 bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:bg-gray-800">
        <Plus className="h-4 w-4" />
        Add contract
      </button>
      </a>
    </div>
  );
};

export default Dashboard;
