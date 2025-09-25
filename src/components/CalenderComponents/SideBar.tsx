import React from "react";
import { Search, ChevronUp, ChevronDown, Users, Truck } from "lucide-react";
import Header from "../CalenderComponents/Header";
import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

import SidebarContracts from "./SidebarContract"; // Adjust path if needed

type ExpandedSections = {
  drivers: boolean;
  engineers: boolean;
  hand: boolean;
  mechanics: boolean;
  tap: boolean;
  masters: boolean;
  constructionLead: boolean;
  // Machine categories
  digger: boolean;
  machines: boolean;
  loader: boolean;
  trailerTrucks: boolean;
  wheelers8: boolean;
  personalCars: boolean;
  tools: boolean;
  contracts: boolean; // new!
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

type Props = {
  expandedSections: ExpandedSections;
  setExpandedSections: React.Dispatch<React.SetStateAction<ExpandedSections>>;
  sidebarEmployees: SidebarEmployees;
  sidebarMachines: SidebarMachines;
  allowDrop: (e: React.DragEvent<HTMLElement>) => void;
  onDropToEmployeeSection: (section: keyof SidebarEmployees) => void;
  onDropToMachineSection: (section: keyof SidebarMachines) => void;
  handleSidebarDragStart: (
    e: React.DragEvent<HTMLDivElement>,
    name: string,
    category: "employee" | "machine",
    section: string
  ) => void;
  toggleSection: (section: keyof ExpandedSections) => void;
  sidebarSearch: string;
  setSidebarSearch: React.Dispatch<React.SetStateAction<string>>;
};

const MACHINE_CATEGORIES = [
  { key: "digger", label: "Digger" },
  { key: "loader", label: "Loader" },
  { key: "trailerTrucks", label: "Trailer trucks" },
  { key: "wheelers8", label: "8 wheelers" },
  { key: "personalCars", label: "Personal cars" },
  { key: "tools", label: "Tools" },
] as const;

const Sidebar: React.FC<Props> = ({
  expandedSections,
  // setExpandedSections,
  sidebarEmployees,
  sidebarMachines,
  allowDrop,
  onDropToEmployeeSection,
  onDropToMachineSection,
  handleSidebarDragStart,
  toggleSection,
  sidebarSearch,
  setSidebarSearch,
}) => {
  // --- Search filter helpers ---
  const searchLower = sidebarSearch.trim().toLowerCase();
  const filterBySearch = (list: string[]) =>
    searchLower === ""
      ? list
      : list.filter((name) => name.toLowerCase().includes(searchLower));

  const filteredEmployees = {
    drivers: filterBySearch(sidebarEmployees.drivers),
    engineers: filterBySearch(sidebarEmployees.engineers),
    hand: filterBySearch(sidebarEmployees.hand),
    mechanics: filterBySearch(sidebarEmployees.mechanics),
    tap: filterBySearch(sidebarEmployees.tap),
    masters: filterBySearch(sidebarEmployees.masters),
    constructionLead: filterBySearch(sidebarEmployees.constructionLead),
  };

  const filteredMachines = {
    digger: filterBySearch(sidebarMachines.digger),
    loader: filterBySearch(sidebarMachines.loader),
    trailerTrucks: filterBySearch(sidebarMachines.trailerTrucks),
    wheelers8: filterBySearch(sidebarMachines.wheelers8),
    personalCars: filterBySearch(sidebarMachines.personalCars),
    tools: filterBySearch(sidebarMachines.tools),
  };

  const navigate = useNavigate();

  // --- Sidebar UI ---
  return (
    <div className="w-64 shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white p-3 border-b border-gray-200">
        <div className="flex items-center gap-0 mb-3">
          <span className="text-sm font-medium">EuropeanCompany</span>
          <span className="pt-1.5 rounded text-xs leading-none">
            {/* Settings Button */}
            <button
              className="px-1"
              title="Settings"
              onClick={() => navigate("/dashboard")}
            >
              <Settings className="h-4 w-4 " />
            </button>
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-gray-100 rounded-md text-sm outline-none"
          />
        </div>
        <Header />
      </div>

      {/* EMPLOYEES */}
      <div className="border-b border-gray-200">
        <div className="px-3 py-2 text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-600" />
          Employees
        </div>

        <div className="px-3 pb-2">
          <div className="relative pl-4">
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-px bg-gray-300"></div>

            {/* Drivers */}
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
                {filteredEmployees.drivers.length === 0 ? (
                  <div className="text-xs text-gray-400 italic px-2"></div>
                ) : (
                  filteredEmployees.drivers.map((emp, idx) => (
                    <div
                      key={`drivers-${emp}-${idx}`}
                      className="relative before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
                    >
                      <div
                        draggable
                        data-resource-name={emp}
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
                  ))
                )}
              </div>
            )}

            {/* Engineers */}
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
                {filteredEmployees.engineers.length === 0 ? (
                  <div className="text-xs text-gray-400 italic px-2"></div>
                ) : (
                  filteredEmployees.engineers.map((emp, idx) => (
                    <div
                      key={`engineers-${emp}-${idx}`}
                      className="relative before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
                    >
                      <div
                        draggable
                        data-resource-name={emp}
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
                  ))
                )}
              </div>
            )}

            {/* Other employee branches */}
            {["hand", "mechanics", "tap", "masters", "constructionLead"].map(
              (cat) => {
                const filteredList =
                  filteredEmployees[cat as keyof SidebarEmployees];
                return (
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
                        {filteredList.length === 0 ? (
                          <div className="text-xs text-gray-400 italic px-2"></div>
                        ) : (
                          filteredList.map((emp, idx) => (
                            <div
                              key={`${cat}-${emp}-${idx}`}
                              className="relative before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
                            >
                              <div
                                draggable
                                data-resource-name={emp}
                                onDragStart={(e) =>
                                  handleSidebarDragStart(
                                    e,
                                    emp,
                                    "employee",
                                    cat
                                  )
                                }
                                className="px-3 py-1.5 rounded-md text-[11px] leading-[14px] font-semibold text-slate-700 shadow-sm cursor-move
                                   bg-gradient-to-b from-sky-100 to-blue-50 border border-blue-200"
                              >
                                {emp}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* MACHINES (each category is a dropdown, just like Employees) */}
      <div className="px-3 py-2">
        <div className="text-sm font-medium mb-1">
          <Truck className="h-4 w-4 inline-block mr-1 text-gray-600" />
          Machines
        </div>
        <div className="relative pl-4">
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-px bg-gray-300"></div>
          {MACHINE_CATEGORIES.map(({ key, label }) => {
            const sectionKey = key as keyof SidebarMachines &
              keyof ExpandedSections;
            const filteredList = filteredMachines[sectionKey];
            return (
              <div key={key}>
                <div
                  className="relative pl-1 py-1 text-sm text-gray-900 cursor-pointer flex items-center justify-between
                       before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
                  onClick={() =>
                    toggleSection(sectionKey as keyof ExpandedSections)
                  }
                >
                  <span>{label}</span>
                  {expandedSections[sectionKey as keyof ExpandedSections] ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </div>
                {expandedSections[sectionKey as keyof ExpandedSections] && (
                  <div
                    className="relative ml-2 pl-4 pb-2 space-y-1
                         before:absolute before:content-[''] before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-gray-300"
                    onDragOver={allowDrop}
                    onDrop={() =>
                      onDropToMachineSection(
                        sectionKey as keyof SidebarMachines
                      )
                    }
                  >
                    {filteredList.length === 0 ? (
                      <div className="text-xs text-gray-400 italic px-2"></div>
                    ) : (
                      filteredList.map((machine, idx) => (
                        <div
                          key={`${key}-${machine}-${idx}`}
                          className="relative before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
                        >
                          <div
                            draggable
                            data-resource-name={machine}
                            onDragStart={(e) =>
                              handleSidebarDragStart(e, machine, "machine", key)
                            }
                            className={[
                              "relative px-3 py-1.5 rounded-md text-[11px] leading-[14px] font-semibold text-slate-700 shadow-sm cursor-move border-b-[2px]",
                              key === "digger"
                                ? "bg-yellow-50 border-yellow-200"
                                : key === "loader"
                                ? "bg-amber-50 border-amber-200"
                                : key === "trailerTrucks"
                                ? "bg-teal-50 border-teal-200"
                                : key === "wheelers8"
                                ? "bg-sky-50 border-sky-200"
                                : key === "personalCars"
                                ? "bg-green-50 border-green-200"
                                : "bg-orange-100 border-orange-200", // tools
                            ].join(" ")}
                          >
                            {machine}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <SidebarContracts />
    </div>
  );
};

export default Sidebar;
