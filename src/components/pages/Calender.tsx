// import React, { useMemo, useState, useEffect } from "react";
// import {
//   Search,
//   ChevronLeft,
//   ChevronRight,
//   Plus,
// } from "lucide-react";
// import Sidebar from "../CalenderComponents/SideBar";

// import ContractScheduler, {
//   CalendarData as ContractData,
//   ItemType as ContractItemType,
//   CalendarItem as ContractCalendarItem,
// } from "../CalenderComponents/ContractScheduler";

// import TimeOffScheduler, {
//   CalendarData as TimeOffData,
//   ItemType as TimeOffItemType,
// } from "../CalenderComponents/TimeOffScheduler";
// import { useLocation, useNavigate } from "react-router-dom";

// type Category = "employee" | "machine";

// type ExpandedSections = {
//   contracts: boolean;
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

// /** carry meta so we can move machine-with-children or detach child-of-machine */
// type DragPayload = {
//   name: string;
//   type: "person" | "machine" | "tool";
//   source: { zone: "sidebar" | "contract" | "timeoff"; id: string };
//   meta?: {
//     childrenSnapshot?: ContractCalendarItem[];
//     childOf?: string; // when dragging a child out of machine
//   };
// } | null;

// const Calender: React.FC = () => {
//   const DAYS_TO_SHOW = 7;

//   const location = useLocation();
//   const navigate = useNavigate();
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

//   const getMonday = (date: Date) => {
//     const d = new Date(date);
//     d.setHours(0, 0, 0, 0);
//     const day = d.getDay(); // 0..6
//     const diff = day === 0 ? -6 : 1 - day;
//     d.setDate(d.getDate() + diff);
//     return d;
//   };

//   // const formatDayLabel = (d: Date) => {
//   //   const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
//   //   const day = d.getDate();
//   //   const month = d.getMonth() + 1;
//   //   return `${weekday} ${day}.${month}.`;
//   // };

//   const [_daysToShow, _setDaysToShow] = useState(28);
//   const [startOffsetDays, setStartOffsetDays] = useState(0);
//   const [sidebarSearch, setSidebarSearch] = useState("");

//   // const isSameYMD = (a: Date, b: Date) =>
//   //   a.getFullYear() === b.getFullYear() &&
//   //   a.getMonth() === b.getMonth() &&
//   //   a.getDate() === b.getDate();

//  const formatRangeHeader = (start: Date) => {
//    return `${start.toLocaleString(undefined, {
//      month: "long",
//    })} ${start.getFullYear()}`;
//  };


//   const timelineStart = useMemo(() => {
//     const monday = getMonday(new Date());
//     monday.setDate(monday.getDate() + startOffsetDays);
//     return monday;
//   }, [startOffsetDays]);

//   const timelineDays = React.useMemo(() => {
//     const today = startOfDay(new Date());
//     const first = addDays(today, startOffsetDays);
//     return Array.from({ length: DAYS_TO_SHOW }, (_, i) => {
//       const date = addDays(first, i);
//       const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
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

//  const headerLabel = useMemo(
//    () => formatRangeHeader(timelineStart),
//    [timelineStart]
//  );

//   const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
//     contracts: true,
//     drivers: true,
//     engineers: true,
//     hand: true,
//     mechanics: true,
//     tap: true,
//     masters: true,
//     constructionLead: true,
//     machines: true,
//   });

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

//   /** ---------- Contract scheduler state (now supports children under machines) ---------- */
//   const [contractData, setContractData] = useState<ContractData>({
//     "SO1165-mon": [
//       {
//         name: "Machine A",
//         type: "machine",
//         color: "bg-green-100 text-green-800",
//         children: [
//           { name: "John Smith", type: "person" },
//           { name: "Hammer", type: "tool" },
//         ],
//       },
//     ],
//     "SO1165-tue": [{ name: "Sarah Wilson", type: "person" }],
//     "SO1165-wed": [{ name: "Machine B", type: "machine" }],
//     "SO1165-thu": [{ name: "Mike Johnson", type: "person" }],
//     "SO1165-fri": [],
//     "SO1165-sat": [],
//     "SO1165-sun": [],

//     "SO1165-week2-mon": [{ name: "Emma Davis", type: "person" }],
//     "SO1165-week2-tue": [],
//     "SO1165-week2-wed": [{ name: "Machine C", type: "machine" }],
//     "SO1165-week2-thu": [],
//     "SO1165-week2-fri": [{ name: "Alex Brown", type: "person" }],
//     "SO1165-week2-sat": [],
//     "SO1165-week2-sun": [],

//     "SO1165-week3-mon": [],
//     "SO1165-week3-tue": [{ name: "Machine D", type: "machine" }],
//     "SO1165-week3-wed": [],
//     "SO1165-week3-thu": [{ name: "Lisa Garcia", type: "person" }],
//     "SO1165-week3-fri": [],
//     "SO1165-week3-sat": [{ name: "Tom Wilson", type: "person" }],
//     "SO1165-week3-sun": [],
//   });

//   /** ---------- Time-off (unchanged structure) ---------- */
//   const initialTimeOffData: TimeOffData = useMemo(() => {
//     const base: TimeOffData = {};
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

//   const [dragged, setDragged] = useState<DragPayload>(null);

//   // ---------- helpers ----------
//   const contractColorFor = (t: ContractItemType) =>
//     t === "person"
//       ? "bg-blue-100 text-blue-800"
//       : t === "tool"
//       ? "bg-amber-50 text-amber-800"
//       : "bg-green-100 text-green-800";

//   const timeOffColorFor = (t: TimeOffItemType) =>
//     t === "person"
//       ? "bg-blue-100 text-blue-800 ring-1 ring-blue-200"
//       : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"; // treat non-person as amber

//   /** remove a name from top-level AND nested children everywhere */
//   const stripFromItems = (items: ContractCalendarItem[], name: string): ContractCalendarItem[] =>
//     items
//       .filter((it) => it.name !== name)
//       .map((it: ContractCalendarItem): ContractCalendarItem =>
//         it.type === "machine" && it.children?.length
//           ? { ...it, children: stripFromItems(it.children, name) }
//           : it
//       );

//   const stripEverywhere = (name: string) => {
//     setSidebarEmployees((prev) => ({
//       drivers: prev.drivers.filter((n) => n !== name),
//       engineers: prev.engineers.filter((n) => n !== name),
//       hand: prev.hand.filter((n) => n !== name),
//       mechanics: prev.mechanics.filter((n) => n !== name),
//       tap: prev.tap.filter((n) => n !== name),
//       masters: prev.masters.filter((n) => n !== name),
//       constructionLead: prev.constructionLead.filter((n) => n !== name),
//     }));
//     setSidebarMachines((prev) => ({
//       digger: prev.digger.filter((n) => n !== name),
//       loader: prev.loader.filter((n) => n !== name),
//       trailerTrucks: prev.trailerTrucks.filter((n) => n !== name),
//       wheelers8: prev.wheelers8.filter((n) => n !== name),
//       personalCars: prev.personalCars.filter((n) => n !== name),
//       tools: prev.tools.filter((n) => n !== name),
//     }));
//     setContractData((prev) => {
//       const next: ContractData = {};
//       for (const k of Object.keys(prev))
//         next[k] = stripFromItems(prev[k], name);
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

//   /** attach an item as a child to a given machine in a cell */
//   const attachToMachine = (
//     cellKey: string,
//     machineName: string,
//     item: ContractCalendarItem
//   ) => {
//     setContractData((prev) => {
//       const cur = prev[cellKey] || [];
//       const next = cur.map((it) => {
//         if (it.type === "machine" && it.name === machineName) {
//           const children = it.children ? [...it.children] : [];
//           if (!children.some((c) => c.name === item.name)) {
//             children.push(item);
//           }
//           return { ...it, children };
//         }
//         return it;
//       });
//       return { ...prev, [cellKey]: next };
//     });
//   };

//   // ---------- Central move ----------
//   const moveTo = (target: {
//     zone: "sidebar" | "contract" | "timeoff";
//     id: string;
//     assignToMachine?: { machineName: string } | null;
//   }) => {
//     if (!dragged) return;
//     const { name, type, meta, source } = dragged;

//     // Only remove from all places if moving between contract/timeoff, or dropping back to sidebar,
//     // but NOT when dragging from sidebar into contract or timeoff!
//     const isSidebarSource = source.zone === "sidebar";
//     const isSidebarTarget = target.zone === "sidebar";

//     if (!isSidebarSource && !isSidebarTarget) {
//       // Only strip if NOT dragging from sidebar
//       stripEverywhere(name);
//     }

//     // 2) place
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

//       // Assign directly to a machine?
//       if (target.assignToMachine && type !== "machine") {
//         const item: ContractCalendarItem = {
//           name,
//           type,
//           color: contractColorFor(type),
//         };
//         attachToMachine(cellKey, target.assignToMachine.machineName, item);
//         setDragged(null);
//         return;
//       }

//       // Dropped into the cell (top-level)
//       setContractData((prev) => {
//         const cur = prev[cellKey] || [];

//         // If we dragged a machine with children, preserve them
//         if (type === "machine" && meta?.childrenSnapshot) {
//           const machineItem: ContractCalendarItem = {
//             name,
//             type: "machine",
//             color: contractColorFor("machine"),
//             children: meta.childrenSnapshot.map((c) => ({
//               ...c,
//               color: contractColorFor(c.type as ContractItemType),
//             })),
//           };
//           return { ...prev, [cellKey]: [...cur, machineItem] };
//         }

//         // Otherwise plain top-level chip
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

//   // ---------- Drag starts ----------
//   const handleSidebarDragStart = (
//     e: React.DragEvent<HTMLDivElement>,
//     name: string,
//     category: Category,
//     section: string
//   ) => {
//     // Employees -> person. Machines: if section === "tools" => tool, else machine
//     let t: "person" | "machine" | "tool" =
//       category === "employee"
//         ? "person"
//         : section === "tools"
//         ? "tool"
//         : "machine";

//     setDragged({
//       name,
//       type: t,
//       source: { zone: "sidebar", id: `${category}:${section}` },
//     });
//     e.dataTransfer.effectAllowed = "move";
//     try {
//       e.dataTransfer.setData("text/plain", name);
//       e.dataTransfer.setData("application/x-item-type", t);
//     } catch {}
//   };

//   const allowDrop = (e: React.DragEvent<HTMLElement>) => e.preventDefault();

//   const onContractItemDragStart = (
//     name: string,
//     sourceKey: string,
//     type: ContractItemType,
//     meta?: { childrenSnapshot?: ContractCalendarItem[]; childOf?: string }
//   ) =>
//     setDragged({
//       name,
//       type,
//       source: { zone: "contract", id: sourceKey },
//       meta,
//     });

//   const onContractDrop = (targetKey: string) =>
//     moveTo({ zone: "contract", id: targetKey });

//   /** NEW: assign to a specific machine on drop */
//   const onContractDropToMachine = (targetKey: string, machineName: string) =>
//     moveTo({
//       zone: "contract",
//       id: targetKey,
//       assignToMachine: { machineName },
//     });

//   // ---------- TimeOff ----------
//   const onTimeOffItemDragStart = (
//     name: string,
//     sourceKey: string,
//     type: TimeOffItemType
//   ) => {
//     setTimeout(() => {
//       setDragged({ name, type, source: { zone: "timeoff", id: sourceKey } });
//     }, 0);
//   };

//   const onTimeOffDrop = (targetKey: string) =>
//     moveTo({ zone: "timeoff", id: targetKey });

//   // ---------- Sidebar drop targets ----------
//   const onDropToEmployeeSection = (section: keyof SidebarEmployees) =>
//     moveTo({
//       zone: "sidebar",
//       id: `employee:${section}`,
//     });

//   const onDropToMachineSection = (section: keyof SidebarMachines) =>
//     moveTo({
//       zone: "sidebar",
//       id: `machine:${section}`,
//     });

//   const toggleSection = (section: keyof ExpandedSections) =>
//     setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));

//   return (
//     <div className="flex h-screen bg-gray-50">
//       {/* SIDEBAR */}
//       <Sidebar
//         expandedSections={expandedSections}
//         setExpandedSections={setExpandedSections}
//         sidebarSearch={sidebarSearch}
//         setSidebarSearch={setSidebarSearch}
//         sidebarEmployees={sidebarEmployees}
//         sidebarMachines={sidebarMachines}
//         allowDrop={allowDrop}
//         onDropToEmployeeSection={onDropToEmployeeSection}
//         onDropToMachineSection={onDropToMachineSection}
//         handleSidebarDragStart={handleSidebarDragStart}
//         toggleSection={toggleSection}
//       />

//       {/* Main Content */}
//       <div className="flex-1 overflow-x-auto pb-48 bg-gray-100">
//         <div className="min-w-max">
//           {/* HEADER */}
//           <div className="bg-white w-screen-[calc(100%-256px]  px-6 py-3">
//             <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
//               <div>
//                 <h1 className="text-[22px] leading-6 font-semibold tracking-tight">
//                   {headerLabel}
//                 </h1>
//               </div>
//               <div className="justify-self-center w-80 relative">
//                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
//                 <input
//                   type="text"
//                   placeholder="Search"
//                   className="h-9 w-full pl-9 pr-3 rounded-full text-sm placeholder:text-gray-400
//                    bg-gray-50 ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-200"
//                 />
//               </div>
//               <div className="justify-self-end relative flex items-center gap-4">
//                 <div className="inline-flex items-stretch rounded-lg overflow-hidden ring-1 ring-gray-200 bg-white mr-7">
//                   <button
//                     className="px-2 py-2 hover:bg-gray-50"
//                     onClick={() => setStartOffsetDays((d) => d - 1)}
//                   >
//                     <ChevronLeft className="h-4 w-4 text-gray-800" />
//                   </button>
//                   <button
//                     className="px-4 py-2 text-sm font-medium border-x border-gray-200 hover:bg-gray-50"
//                     onClick={() => setStartOffsetDays(0)}
//                   >
//                     Today
//                   </button>
//                   <button
//                     className="px-2 py-2 hover:bg-gray-50"
//                     onClick={() => setStartOffsetDays((d) => d + 1)}
//                   >
//                     <ChevronRight className="h-4 w-4 text-gray-800" />
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* WEEK RULER */}
//           <div className="bg-white">
//             <div className="">
//               <div
//                 className="grid"
//                 style={{
//                   gridTemplateColumns: `repeat(${timelineDays.length}, minmax(120px, 1fr))`,
//                 }}
//               >
//                 {timelineDays.map((d, i) => (
//                   <div
//                     key={d.key}
//                     className={`p-1 text-center text-[13px] ${
//                       i === 0 ? "" : ""
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

//             <ContractScheduler
//               data={contractData}
//               onDragStart={onContractItemDragStart}
//               onDrop={onContractDrop}
//               onDropToMachine={onContractDropToMachine} // 👈 make sure this is here
//             />
//           </div>
//         </div>
//       </div>

//       {/* Sticky Vacation/Sick footer */}
//       <TimeOffScheduler
//         weekDays={timelineDays}
//         data={timeOffData}
//         onDragStart={onTimeOffItemDragStart}
//         onDrop={onTimeOffDrop}
//       />

//       <button
//         className="fixed z-100 bottom-6 right-6 bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:bg-gray-800"
//         onClick={() =>
//           navigate("/add-contract", { state: { backgroundLocation: location } })
//         }
//       >
//         <Plus className="h-4 w-4" />
//         Add contract
//       </button>
//     </div>
//   );
// };

// export default Calender;






// ===================== Calender.tsx =====================
import React, {
  useMemo,
  useState,
  useEffect,
} from "react";
import {
  Plus,
} from "lucide-react";
import Sidebar from "../CalenderComponents/SideBar";

import CalendarMainContent from "../CalenderComponents/CalenderMainContent"; 

import  {
  CalendarData as ContractData,
  ItemType as ContractItemType,
  CalendarItem as ContractCalendarItem,
} from "../CalenderComponents/ContractScheduler";

import TimeOffScheduler,
{
  CalendarData as TimeOffData,
  ItemType as TimeOffItemType,
} from "../CalenderComponents/TimeOffScheduler";
import { useLocation, useNavigate } from "react-router-dom";

type Category = "employee" | "machine";
;

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
type DragPayload =
  | {
      name: string;
      type: "person" | "machine" | "tool";
      source: { zone: "sidebar" | "contract" | "timeoff"; id: string };
      meta?: {
        childrenSnapshot?: ContractCalendarItem[];
        childOf?: string; // when dragging a child out of machine
      };
    }
  | null;

const dayOrder = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const Calender: React.FC = () => {
  const DAYS_TO_SHOW = 7;
  

  const location = useLocation();
  const navigate = useNavigate();
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

  const [_daysToShow, _setDaysToShow] = useState(28);
  const [startOffsetDays, setStartOffsetDays] = useState(0);
  const [sidebarSearch, setSidebarSearch] = useState("");

  const formatRangeHeader = (start: Date) => {
    return `${start.toLocaleString(undefined, {
      month: "long",
    })} ${start.getFullYear()}`;
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

  const headerLabel = useMemo(() => formatRangeHeader(timelineStart), [timelineStart]);

  const [expandedSections, setExpandedSections] = useState<{
    [cat: string]: boolean;
  }>({});



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

  const [timeOffData, setTimeOffData] = useState<TimeOffData>(initialTimeOffData);

 const allUnavailableResourceNames = useMemo(() => {
   const names: string[] = [];
   Object.entries(timeOffData).forEach(([key, items]) => {
     if (key.startsWith("vacation-") || key.startsWith("sick-")) {
       items.forEach((it) => {
         if (!names.includes(it.name)) names.push(it.name);
       });
     }
   });
   return names;
 }, [timeOffData]);



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
    setContractData((prev) => {
      const next: ContractData = {};
      for (const k of Object.keys(prev)) next[k] = stripFromItems(prev[k], name);
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
          return { ...it, children } as ContractCalendarItem;
        }
        return it;
      });
      return { ...prev, [cellKey]: next };
    });
  };

  // ---------- Central move ----------
  const moveTo = (target: {
    zone: "sidebar" | "contract" | "timeoff";
    id: string;
    assignToMachine?: { machineName: string } | null;
  }) => {
    if (!dragged) return;
    const { name, type, meta, source } = dragged;

    // Only remove from all places if moving between contract/timeoff, or dropping back to sidebar,
    // but NOT when dragging from sidebar into contract or timeoff!
    const isSidebarSource = source.zone === "sidebar";
    const isSidebarTarget = target.zone === "sidebar";

    if (!isSidebarSource && !isSidebarTarget) {
      // Only strip if NOT dragging from sidebar
      stripEverywhere(name);
    }

    // 2) place
    if (target.zone === "sidebar") {
      const [_cat, _section] = target.id.split(":" ) as [
        Category,
        keyof SidebarEmployees & keyof SidebarMachines & string,
      ];
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
        const item = { 
          name, 
          type, 
          color: timeOffColorFor(type),
          startDate: new Date() // Add required startDate property
        };
        return { ...prev, [cellKey]: [...cur, item] };
      });
    }

    setDragged(null);
  };

  // ========== MODAL logic ==========
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);
  const [modalResourceName, setModalResourceName] = useState<string | null>(null);

  // Build a set of all unavailable names (vacation/sick)
  const unavailableResourceNames = useMemo(() => {
    const names = new Set<string>();
    Object.entries(timeOffData).forEach(([key, items]) => {
      if (key.startsWith("vacation-") || key.startsWith("sick-")) {
        items.forEach((it) => names.add(it.name));
      }
    });
    return names;
  }, [timeOffData]);

  // ---------- Drag starts ----------
  const handleSidebarDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    name: string,
    category: Category,
    section: string,
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
    meta?: { childrenSnapshot?: ContractCalendarItem[]; childOf?: string },
  ) =>
    setDragged({
      name,
      type,
      source: { zone: "contract", id: sourceKey },
      meta,
    });

  // ========== BLOCK drop if unavailable ==========

  const onContractDrop = (targetKey: string) => {
    // Only check if currently dragging
    if (dragged && unavailableResourceNames.has(dragged.name)) {
      setShowUnavailableModal(true);
      setModalResourceName(dragged.name);
      setDragged(null);
      return;
    }
    moveTo({ zone: "contract", id: targetKey });
  };

  /** assign to a specific machine on drop */
  const onContractDropToMachine = (targetKey: string, machineName: string) => {
    if (dragged && unavailableResourceNames.has(dragged.name)) {
      setShowUnavailableModal(true);
      setModalResourceName(dragged.name);
      setDragged(null);
      return;
    }
    moveTo({
      zone: "contract",
      id: targetKey,
      assignToMachine: { machineName },
    });
  };

  // ---------- TimeOff ----------
  const onTimeOffItemDragStart = (
    name: string,
    sourceKey: string,
    type: TimeOffItemType,
  ) => {
    setTimeout(() => {
      setDragged({ name, type, source: { zone: "timeoff", id: sourceKey } });
    }, 0);
  };

  const onTimeOffDrop = (targetKey: string) =>
    moveTo({ zone: "timeoff", id: targetKey });

  // ---------- Sidebar drop targets ----------
 const onDropToEmployeeSection = (section: string) => {
   moveTo({ zone: "sidebar", id: `employee:${section}` });
 };

 const onDropToMachineSection = (section: string) => {
   moveTo({ zone: "sidebar", id: `machine:${section}` });
 };

 const toggleSection = (section: string) => {
   setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
 };

  // ---------- RESIZE HANDLER ----------
  const handleResize = (
    sourceKey: string,
    itemName: string,
    itemType: ContractItemType,
    edge: "left" | "right",
    dayDelta: number,
  ) => {
    if (dayDelta <= 0) return;

    /** helper: parse contract root + week index */
    const baseMatch = sourceKey.match(/^(.*?)(?:-week(\d+))?-(mon|tue|wed|thu|fri|sat|sun)$/);
    if (!baseMatch) return;
    const contractRoot = baseMatch[1];
    const weekIndex = baseMatch[2] ? parseInt(baseMatch[2], 10) - 1 : 0; // 0-based
    const dayKey = baseMatch[3] as typeof dayOrder[number];

    const startGlobalIdx = weekIndex * 7 + dayOrder.indexOf(dayKey);

    setContractData((prev) => {
      const next = { ...prev } as ContractData;

      const getRowKeyForWeek = (w: number) => (w === 0 ? contractRoot : `${contractRoot}-week${w + 1}`);

      const sourceItems = prev[sourceKey] || [];
      const original = sourceItems.find((it) => it.name === itemName);

      const buildItem = (): ContractCalendarItem => {
        if (original) return original;
        return {
          name: itemName,
          type: itemType,
          color: contractColorFor(itemType),
        } as ContractCalendarItem;
      };

      for (let i = 1; i <= dayDelta; i++) {
        const offset = edge === "right" ? i : -i;
        const globalIdx = startGlobalIdx + offset;
        if (globalIdx < 0) continue;
        const targetWeek = Math.floor(globalIdx / 7);
        const targetDayIdx = globalIdx % 7;
        const rowKey = getRowKeyForWeek(targetWeek);
        const cellKey = `${rowKey}-${dayOrder[targetDayIdx]}`;
        const cur = next[cellKey] || [];
        if (!cur.some((it) => it.name === itemName)) {
          next[cellKey] = [...cur, buildItem()];
        }
      }
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* SIDEBAR */}
      <Sidebar
        expandedSections={expandedSections}
        setExpandedSections={setExpandedSections}
        sidebarSearch={sidebarSearch}
        setSidebarSearch={setSidebarSearch}
        allowDrop={allowDrop}
        onDropToEmployeeSection={onDropToEmployeeSection}
        onDropToMachineSection={onDropToMachineSection}
        handleSidebarDragStart={handleSidebarDragStart}
        toggleSection={toggleSection}
      />

      {/* MAIN CONTENT moved to a new component */}
      <CalendarMainContent
        timelineDays={timelineDays}
        headerLabel={headerLabel}
        setStartOffsetDays={setStartOffsetDays}
        contractData={contractData}
        setContractData={setContractData}
        onContractItemDragStart={onContractItemDragStart}
        onContractDrop={onContractDrop}
        onContractDropToMachine={onContractDropToMachine}
        allUnavailableResourceNames={allUnavailableResourceNames}
        handleResize={handleResize}
        timeOffData={timeOffData}
        onTimeOffItemDragStart={onTimeOffItemDragStart}
        onTimeOffDrop={onTimeOffDrop}
        setSidebarSearch={setSidebarSearch}
      />

      {/* Sticky Vacation/Sick footer */}
      <TimeOffScheduler
        weekDays={timelineDays}
        data={timeOffData}
        onDragStart={onTimeOffItemDragStart}
        onDrop={onTimeOffDrop}
      />

      {/* Add Contract Floating Button */}
      <button
        className="fixed z-100 bottom-6 right-6 bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:bg-gray-800"
        onClick={() =>
          navigate("/add-contract", { state: { backgroundLocation: location } })
        }
      >
        <Plus className="h-4 w-4" />
        Add contract
      </button>

      {/* ========== Modal for Unavailable Resource ========== */}
      {showUnavailableModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-lg px-8 py-6 min-w-[300px] max-w-xs flex flex-col items-center">
            <div className="text-gray-800 text-[15px] mb-4 font-medium text-center">
              {modalResourceName
                ? `"${modalResourceName}" is marked as unavailable (vacation or sick).`
                : "This resource is marked as unavailable (vacation or sick)."}
              <br />
              Please remove from unavailable resources before scheduling.
            </div>
            <button
              className="mt-2 px-5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-[14px]"
              onClick={() => setShowUnavailableModal(false)}
              autoFocus
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default Calender;
