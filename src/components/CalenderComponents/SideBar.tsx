import React, { useEffect, useState } from "react";
import {
  Search,
  ChevronUp,
  ChevronDown,
  Users,
  Truck,
  FileText,
  Loader2,
} from "lucide-react";
import Header from "../CalenderComponents/Header";

// Firebase imports (adjust to your project structure)
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../lib/firebase"; // Adjust this path as needed

type ExpandedSections = {
  drivers: boolean;
  engineers: boolean;
  hand: boolean;
  mechanics: boolean;
  tap: boolean;
  masters: boolean;
  constructionLead: boolean;
  machines: boolean;
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

// Type for contract doc fetched from Firestore
type ContractDoc = {
  id: string;
  name?: string;
  status?: string;
  // add other fields if needed
};

// UI type for rendered contract
type ContractUIItem = {
  id: string;
  dateRange: string;
  title: string;
};

const Sidebar: React.FC<Props> = ({
  expandedSections,
  setExpandedSections,
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

  // --- Contracts state ---
  const [contracts, setContracts] = useState<ContractUIItem[]>([]);
  const [contractsLoading, setContractsLoading] = useState<boolean>(true);
  const [contractsError, setContractsError] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  // For expanding/collapsing contracts dropdown
  // You could control this in expandedSections, but for full independence, let's keep local state
  const [contractsExpanded, setContractsExpanded] = useState(true);

  // Dummy implementation for getContractDateRange. Replace with real one as needed.
  async function getContractDateRange(
    userId: string,
    contractId: string
  ): Promise<string | null> {
    // Replace this with real logic if you have it in your codebase!
    return null; // Or e.g. "2023-01-01 – 2023-05-05"
  }

  // --- Fetch contracts on mount ---
  useEffect(() => {
    let unsubContracts: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubContracts) {
        unsubContracts();
        unsubContracts = null;
      }

      if (!user) {
        setUid(null);
        setContracts([]);
        setContractsLoading(false);
        setContractsError("You must be signed in to see your contracts.");
        return;
      }

      setUid(user.uid);
      setContractsError(null);
      setContractsLoading(true);

      // Listen to all contracts and filter client-side:
      const col = collection(db, "companies", user.uid, "contracts");
      unsubContracts = onSnapshot(
        col,
        async (snap) => {
          const docs = snap.docs.map((d) => ({
            ...(d.data() as ContractDoc),
            id: d.id, // Override any existing id with Firestore's id
          }));

          // Consider anything not archived as "ongoing"
          const ongoingDocs = docs.filter(
            (c) => (c.status ?? "draft") !== "archived"
          );

          // Build UI items with date ranges
          const items = await Promise.all(
            ongoingDocs.map(async (c) => {
              const dateRange = await getContractDateRange(user.uid, c.id);
              return {
                id: c.id,
                dateRange: dateRange || "—",
                title: c.name || "Contract",
              };
            })
          );

          setContracts(items);
          setContractsLoading(false);
        },
        (e) => {
          setContractsError(e.message || "Failed to load contracts.");
          setContractsLoading(false);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubContracts) unsubContracts();
    };
  }, []);

  // --- Sidebar UI ---
  return (
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
                  <div className="text-xs text-gray-400 italic px-2">
                  </div>
                ) : (
                  filteredEmployees.drivers.map((emp, idx) => (
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
                  <div className="text-xs text-gray-400 italic px-2">
                  </div>
                ) : (
                  filteredEmployees.engineers.map((emp, idx) => (
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
                          <div className="text-xs text-gray-400 italic px-2">
                          </div>
                        ) : (
                          filteredList.map((emp, idx) => (
                            <div
                              key={`${cat}-${emp}-${idx}`}
                              className="relative before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
                            >
                              <div
                                draggable
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

      {/* MACHINES */}
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
          ].map(({ key, label }) => {
            const filteredList = filteredMachines[key as keyof SidebarMachines];
            return (
              <div key={key}>
                <div
                  className="relative pl-1 py-1 text-sm text-gray-900
                       before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
                  onDragOver={allowDrop}
                  onDrop={() =>
                    onDropToMachineSection(key as keyof SidebarMachines)
                  }
                >
                  {label}
                </div>
                {filteredList.length > 0 && (
                  <div
                    className="relative ml-2 pl-4 pb-1 space-y-1
                         before:absolute before:content-[''] before:left-0 before:top-0 before:bottom-0 before:w-px"
                  >
                    {filteredList.map((machine, idx) => (
                      <div
                        key={`${key}-${machine}-${idx}`}
                        className="relative before:absolute before:content-[''] before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:transform before:w-4 before:h-px before:bg-gray-300"
                      >
                        <div
                          draggable
                          onDragStart={(e) =>
                            handleSidebarDragStart(e, machine, "machine", key)
                          }
                          className="relative px-3 py-1.5 rounded-md text-[11px] leading-[14px] font-semibold text-slate-700 shadow-sm cursor-move
                             bg-yellow-50 border-b-[2px] border-yellow-200"
                        >
                          {machine}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {filteredList.length === 0 && (
                  <div className="text-xs text-gray-400 italic px-2">
                  </div>
                )}
              </div>
            );
          })}
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
            {filteredMachines.tools.length === 0 ? (
              <div className="text-xs text-gray-400 italic px-2">
              </div>
            ) : (
              filteredMachines.tools.map((tool, idx) => (
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
              ))
            )}
          </div>
        </div>
      </div>

      {/* CONTRACTS - Footer */}
      <div className="border-t border-gray-200">
        {/* Contracts dropdown header */}
        <div
          className="px-3 py-2 flex items-center justify-between cursor-pointer select-none"
          onClick={() => setContractsExpanded((v) => !v)}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-gray-600 inline-block mr-1" />
            Contracts
          </span>
          {contractsExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
        {contractsExpanded && (
          <div className="relative ml-3 pl-2 py-3">
            {/* vertical branch line */}
            <div className="absolute left-2 top-2 bottom-2 w-px bg-gray-300 z-0" />
            {contractsLoading ? (
              <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                <Loader2 className="animate-spin w-4 h-4" /> Loading...
              </div>
            ) : contractsError ? (
              <div className="text-xs text-red-400 py-2">{contractsError}</div>
            ) : contracts.length === 0 ? (
              <div className="text-xs text-gray-400 italic py-2">
                No contracts
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {contracts.map((contract, idx) => (
                  <div
                    key={contract.id}
                    className="relative flex items-start z-10"
                    style={{ marginLeft: "10px" }}
                  >
                    {/* horizontal connector to branch */}
                    <div
                      className="absolute left-[-12px] top-1/2 w-3 h-px bg-gray-300"
                      style={{ transform: "translateY(-50%)" }}
                    />
                    {/* contract card */}
                    <a
                      href={`/contract/${contract.id}`}
                      className="flex-1 bg-white border border-gray-300 rounded-lg px-2 py-1 shadow-sm hover:bg-gray-50 transition-colors duration-100"
                      style={{
                        minWidth: "100px",
                        maxWidth: "160px",
                        boxShadow: "0 1px 4px 0 rgb(0 0 0 / 0.03)",
                        fontSize: "12px",
                      }}
                      title={contract.title}
                    >
                      <div className="font-medium text-gray-800 truncate">
                        {contract.title}
                      </div>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
