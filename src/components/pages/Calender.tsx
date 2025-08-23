import React, { useMemo, useState, useEffect } from "react";

import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Bell,
} from "lucide-react";

import ContractScheduler, {
  CalendarData as ContractData,
  ItemType as ContractItemType,
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

type DragPayload = {
  name: string;
  type: "person" | "machine";
  source: { zone: "sidebar" | "contract" | "timeoff"; id: string }; // id: section or cellKey
} | null;

const Dashboard: React.FC = () => {
  // Get Monday (start of week) for a given date
  const getMonday = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    // JS: 0=Sun ... 6=Sat. We want Monday as start.
    const day = d.getDay(); // 0..6
    const diff = day === 0 ? -6 : 1 - day; // shift to Monday
    d.setDate(d.getDate() + diff);
    return d;
  };

  // Label like "Mon 18.8."
  const formatDayLabel = (d: Date) => {
    const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
    const day = d.getDate();
    const month = d.getMonth() + 1;
    return `${weekday} ${day}.${month}.`;
  };

  // ---------- Flexible timeline controls ----------
  // Show N days (default 28)
  const [daysToShow, setDaysToShow] = useState(28);

  // Start offset in days (0 = Monday of the current week)
  const [startOffsetDays, setStartOffsetDays] = useState(0);

  const isSameYMD = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  // "June 2025" or "Jun 2025 – Jul 2025" for arbitrary ranges
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

  // Timeline start (Monday-aligned) + offset in days
  const timelineStart = useMemo(() => {
    const monday = getMonday(new Date());
    monday.setDate(monday.getDate() + startOffsetDays);
    return monday;
  }, [startOffsetDays]);

  // Visible N-day slice for the "calendar ruler" and time-off footer
  const timelineDays: Array<{
    day: string;
    key: string; // YYYY-MM-DD
    date: Date;
    isToday: boolean;
  }> = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: daysToShow }, (_, i) => {
      const d = new Date(timelineStart);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      return {
        day: formatDayLabel(d),
        key,
        date: d,
        isToday: isSameYMD(d, today),
      };
    });
  }, [timelineStart, daysToShow]);

  const headerLabel = useMemo(
    () => formatRangeHeader(timelineStart, daysToShow),
    [timelineStart, daysToShow]
  );

  // ---------- Sidebar open/close ----------
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

  // ---------- Sidebar data ----------
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

  // ---------- Contract scheduler data (controlled) ----------
  const [contractData, setContractData] = useState<ContractData>({
    // Week 1
    "SO1165-mon": [
      {
        name: "John Smith",
        type: "person",
        color: "bg-blue-100 text-blue-800",
        note: "8:00 AM - 4:00 PM",
      },
      {
        name: "Machine A",
        type: "machine",
        color: "bg-green-100 text-green-800",
      },
    ],
    "SO1165-tue": [
      {
        name: "Sarah Wilson",
        type: "person",
        color: "bg-purple-100 text-purple-800",
        note: "9:00 AM - 5:00 PM",
      },
    ],
    "SO1165-wed": [
      {
        name: "Machine B",
        type: "machine",
        color: "bg-orange-100 text-orange-800",
      },
    ],
    "SO1165-thu": [
      {
        name: "Mike Johnson",
        type: "person",
        color: "bg-indigo-100 text-indigo-800",
        note: "Half Day",
      },
    ],
    "SO1165-fri": [],
    "SO1165-sat": [],
    "SO1165-sun": [],

    // Week 2
    "SO1165-week2-mon": [
      {
        name: "Emma Davis",
        type: "person",
        color: "bg-pink-100 text-pink-800",
      },
    ],
    "SO1165-week2-tue": [],
    "SO1165-week2-wed": [
      {
        name: "Machine C",
        type: "machine",
        color: "bg-yellow-100 text-yellow-800",
      },
    ],
    "SO1165-week2-thu": [],
    "SO1165-week2-fri": [
      {
        name: "Alex Brown",
        type: "person",
        color: "bg-teal-100 text-teal-800",
      },
    ],
    "SO1165-week2-sat": [],
    "SO1165-week2-sun": [],

    // Week 3
    "SO1165-week3-mon": [],
    "SO1165-week3-tue": [
      { name: "Machine D", type: "machine", color: "bg-red-100 text-red-800" },
    ],
    "SO1165-week3-wed": [],
    "SO1165-week3-thu": [
      {
        name: "Lisa Garcia",
        type: "person",
        color: "bg-cyan-100 text-cyan-800",
      },
    ],
    "SO1165-week3-fri": [],
    "SO1165-week3-sat": [
      {
        name: "Tom Wilson",
        type: "person",
        color: "bg-lime-100 text-lime-800",
      },
    ],
    "SO1165-week3-sun": [],
  });

  // ---------- Time-off data (controlled, based on timelineDays) ----------
  const initialTimeOffData: TimeOffData = useMemo(() => {
    const base: TimeOffData = {};
    // Pre-populate keys for visible days
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

  // ---------- Global drag payload ----------
  const [dragged, setDragged] = useState<DragPayload>(null);

  // Helpers to colorize when adding to a section
  const contractColorFor = (t: ContractItemType) =>
    t === "person"
      ? "bg-blue-100 text-blue-800"
      : "bg-green-100 text-green-800";
  const timeOffColorFor = (t: TimeOffItemType) =>
    t === "person"
      ? "bg-blue-100 text-blue-800 ring-1 ring-blue-200"
      : "bg-amber-50 text-amber-700 ring-1 ring-amber-200";

  // Remove a name everywhere (sidebar + both schedulers)
  const stripEverywhere = (name: string) => {
    setSidebarEmployees((prev) => {
      const next: SidebarEmployees = {
        drivers: prev.drivers.filter((n) => n !== name),
        engineers: prev.engineers.filter((n) => n !== name),
        hand: prev.hand.filter((n) => n !== name),
        mechanics: prev.mechanics.filter((n) => n !== name),
        tap: prev.tap.filter((n) => n !== name),
        masters: prev.masters.filter((n) => n !== name),
        constructionLead: prev.constructionLead.filter((n) => n !== name),
      };
      return next;
    });
    setSidebarMachines((prev) => {
      const next: SidebarMachines = {
        digger: prev.digger.filter((n) => n !== name),
        loader: prev.loader.filter((n) => n !== name),
        trailerTrucks: prev.trailerTrucks.filter((n) => n !== name),
        wheelers8: prev.wheelers8.filter((n) => n !== name),
        personalCars: prev.personalCars.filter((n) => n !== name),
        tools: prev.tools.filter((n) => n !== name),
      };
      return next;
    });
    setContractData((prev) => {
      const next: ContractData = {};
      for (const k of Object.keys(prev)) {
        next[k] = (prev[k] || []).filter((it) => it.name !== name);
      }
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

  // Central move: place dragged into a target zone + id, ensuring uniqueness
  const moveTo = (target: {
    zone: "sidebar" | "contract" | "timeoff";
    id: string;
    sidebarCategory?: Category;
  }) => {
    if (!dragged) return;
    const { name, type } = dragged;

    // 1) remove everywhere (unique)
    stripEverywhere(name);

    // 2) add to the selected target
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
      setContractData((prev) => {
        const cur = prev[cellKey] || [];
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

  // ---------- Drag starts from Sidebar ----------
  const handleSidebarDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    name: string,
    category: Category,
    section: string
  ) => {
    const t: "person" | "machine" =
      category === "employee" ? "person" : "machine";
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

  // ---------- Contract callbacks ----------
  const onContractItemDragStart = (
    name: string,
    sourceKey: string,
    type: ContractItemType
  ) => setDragged({ name, type, source: { zone: "contract", id: sourceKey } });

  const onContractDrop = (targetKey: string) =>
    moveTo({ zone: "contract", id: targetKey });

  // ---------- TimeOff callbacks ----------
  const onTimeOffItemDragStart = (
    name: string,
    sourceKey: string,
    type: TimeOffItemType
  ) => {
    // FIX: Defer the state update to allow the browser to initialize
    // the drag operation without interference from a synchronous React re-render.
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
      sidebarCategory: "employee",
    });

  const onDropToMachineSection = (section: keyof SidebarMachines) =>
    moveTo({
      zone: "sidebar",
      id: `machine:${section}`,
      sidebarCategory: "machine",
    });

  // ---------- UI helpers ----------
  const toggleSection = (section: keyof ExpandedSections) =>
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium">EuropeanCompany</span>
            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">⚙</span>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-8 pr-3 py-1.5 bg-gray-100 rounded text-sm"
            />
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
            <span className="bg-gray-100 px-2 py-0.5 rounded">
              21. 3. - 24. 4.
            </span>
          </div>
        </div>

        {/* Employees Section */}
        <div className="border-b border-gray-200">
          <div className="px-3 py-2 flex items-center gap-2">
            <span className="text-sm font-medium">Employees</span>
          </div>

          {/* Drivers */}
          <div className="px-3">
            <div
              className="py-1 text-sm text-gray-600 cursor-pointer flex items-center justify-between"
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
                className="space-y-1 pb-2"
                onDragOver={allowDrop}
                onDrop={() => onDropToEmployeeSection("drivers")}
              >
                {sidebarEmployees.drivers.map((emp, idx) => (
                  <div
                    key={`drivers-${emp}-${idx}`}
                    draggable
                    onDragStart={(e) =>
                      handleSidebarDragStart(e, emp, "employee", "drivers")
                    }
                    className="px-3 py-1.5 bg-blue-100 rounded text-xs cursor-move hover:bg-blue-200"
                  >
                    {emp}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Engineers */}
          <div className="px-3">
            <div
              className="py-1 text-sm text-gray-600 cursor-pointer flex items-center justify-between"
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
                className="space-y-1 pb-2"
                onDragOver={allowDrop}
                onDrop={() => onDropToEmployeeSection("engineers")}
              >
                {sidebarEmployees.engineers.map((emp, idx) => (
                  <div
                    key={`engineers-${emp}-${idx}`}
                    draggable
                    onDragStart={(e) =>
                      handleSidebarDragStart(e, emp, "employee", "engineers")
                    }
                    className="px-3 py-1.5 bg-pink-100 rounded text-xs cursor-move hover:bg-pink-200"
                  >
                    {emp}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Other employee categories */}
          {["hand", "mechanics", "tap", "masters", "constructionLead"].map(
            (cat) => (
              <div key={cat} className="px-3">
                <div
                  className="py-1 text-sm text-gray-600 cursor-pointer flex items-center justify-between"
                  onClick={() => toggleSection(cat as keyof ExpandedSections)}
                >
                  <span>{cat[0].toUpperCase() + cat.slice(1)}</span>
                  {expandedSections[cat as keyof ExpandedSections] ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </div>
                {expandedSections[cat as keyof ExpandedSections] && (
                  <div
                    className="space-y-1 pb-2"
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
                        draggable
                        onDragStart={(e) =>
                          handleSidebarDragStart(e, emp, "employee", cat)
                        }
                        className="px-3 py-1.5 bg-blue-100 rounded text-xs cursor-move hover:bg-blue-200"
                      >
                        {emp}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* Machines Section */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">Machines</span>
          </div>

          {[
            { key: "digger", label: "Digger" },
            { key: "loader", label: "Loader" },
            { key: "trailerTrucks", label: "Trailer trucks" },
            { key: "wheelers8", label: "8 wheelers" },
            { key: "personalCars", label: "Personal cars" },
          ].map(({ key, label }) => (
            <div key={key} className="py-1 text-sm text-gray-600">
              <div
                className="mb-1"
                onDragOver={allowDrop}
                onDrop={() =>
                  onDropToMachineSection(key as keyof SidebarMachines)
                }
              >
                {label}
              </div>
            </div>
          ))}

          {/* Tools */}
          <div>
            <div className="py-1 text-sm text-gray-600">Tools</div>
            <div
              className="space-y-1"
              onDragOver={allowDrop}
              onDrop={() => onDropToMachineSection("tools")}
            >
              {sidebarMachines.tools.map((tool, idx) => (
                <div
                  key={`tools-${tool}-${idx}`}
                  draggable
                  onDragStart={(e) =>
                    handleSidebarDragStart(e, tool, "machine", "tools")
                  }
                  className="px-3 py-1.5 bg-orange-100 rounded text-xs cursor-move hover:bg-orange-200"
                >
                  {tool}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contracts footer in sidebar (placeholder) */}
        <a href="/contracts">
          <div className="px-3 py-2 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Contracts</span>
            </div>
          </div>
        </a>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-x-auto pb-48 bg-gray-100">
        <div className="min-w-max">
          {/* Header — styled like the screenshot */}
          <div className="bg-white border-b border-gray-200 px-4 py-3">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              {/* Left: Month/Year */}
              <div>
                <h1 className="text-xl font-semibold">{headerLabel}</h1>
              </div>

              {/* Center: Search */}
              <div className="justify-self-center w-72 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-full text-sm placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>

              {/* Right: Segmented Today controls with chevrons + badge */}
              <div className="justify-self-end relative">
                <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-1 py-1 shadow-sm">
                  <button
                    className="p-1.5 rounded-full hover:bg-white"
                    onClick={() => setStartOffsetDays((d) => d - daysToShow)}
                    title="Previous range"
                  >
                    <ChevronLeft className="h-4 w-4 text-gray-700" />
                  </button>
                  <button
                    className="px-3 py-1 rounded-full text-sm font-medium hover:bg-white"
                    onClick={() => setStartOffsetDays(0)}
                    title="Jump to current week"
                  >
                    Today
                  </button>
                  <button
                    className="p-1.5 rounded-full hover:bg-white"
                    onClick={() => setStartOffsetDays((d) => d + daysToShow)}
                    title="Next range"
                  >
                    <ChevronRight className="h-4 w-4 text-gray-700" />
                  </button>
                </div>

                {/* Notification badge (decorative like the screenshot) */}
                <button
                  className="absolute -top-2 -right-3 inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-500 text-white shadow"
                  title="Notifications"
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white text-red-600 text-[10px] font-semibold">
                    2
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Grid header (dynamic length, horizontally scrollable with the content) */}
          <div className="bg-white">
            <div
              className="grid border-b border-gray-200"
              style={{
                gridTemplateColumns: `200px repeat(${timelineDays.length}, minmax(130px, 1fr))`,
              }}
            >
              {/* First column spacer for row labels */}
              <div className="p-3 text-sm font-medium"></div>

              {timelineDays.map((d) => (
                <div
                  key={d.key}
                  className={`p-3 text-center text-sm border-l border-gray-200 text-gray-600 ${
                    d.isToday ? "text-black font-semibold" : ""
                  }`}
                  title={d.date.toLocaleDateString()}
                >
                  <div>{d.day}</div>
                  {d.isToday && (
                    <div className="mx-auto mt-1 h-0.5 w-8 rounded-full bg-black" />
                  )}
                </div>
              ))}
            </div>

            {/* Controlled Contract Scheduler (unchanged) */}
            <ContractScheduler
              data={contractData}
              onDragStart={onContractItemDragStart}
              onDrop={onContractDrop}
            />
          </div>
        </div>
      </div>

      {/* Sticky Vacation/Sick footer (controlled, uses same flexible timeline) */}
      <TimeOffScheduler
        weekDays={timelineDays}
        data={timeOffData}
        onDragStart={onTimeOffItemDragStart}
        onDrop={onTimeOffDrop}
      />

      {/* Add Contract Button */}
      <button className="fixed z-100 bottom-6 right-6 bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:bg-gray-800">
        <Plus className="h-4 w-4" />
        Add contract
      </button>

      {/* Range size quick picker (keep if you still want to vary days) */}
      {/* <div className="fixed bottom-6 left-6">
        <select
          className="text-sm bg-white border border-gray-200 rounded px-3 py-2 shadow"
          value={daysToShow}
          onChange={(e) => setDaysToShow(parseInt(e.target.value, 10))}
          title="Days visible"
        >
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={21}>21 days</option>
          <option value={28}>28 days</option>
          <option value={60}>60 days</option>
        </select>
      </div> */}
    </div>
  );
};

export default Dashboard;
