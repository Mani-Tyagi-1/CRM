import React, { useEffect, useState } from "react";
import {
  Search,
  ChevronUp,
  ChevronDown,
  Users,
  Truck,
  Settings,
  Info,
} from "lucide-react";
import Header from "../CalenderComponents/Header";
import { useNavigate } from "react-router-dom";
// import SidebarContracts from "./SidebarContract";

import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

// ---------------- Types ----------------

type ResourceItem = {
  id: string;
  display: string;
};

type CategoryMap = { [cat: string]: ResourceItem[] };

type ExpandedSections = { [cat: string]: boolean };

type Props = {
  expandedSections: ExpandedSections;
  setExpandedSections: React.Dispatch<React.SetStateAction<ExpandedSections>>;
  allowDrop: (e: React.DragEvent<HTMLElement>) => void;
  onDropToEmployeeSection: (section: string) => void;
  onDropToMachineSection: (section: string) => void;
  handleSidebarDragStart: (
    e: React.DragEvent<HTMLDivElement>,
    name: string,
    category: "employee" | "machine",
    section: string
  ) => void;
  toggleSection: (section: string) => void;
  sidebarSearch: string;
  setSidebarSearch: React.Dispatch<React.SetStateAction<string>>;
  onContractDragStart: (payload: {
    contractId: string;
    title: string;
    soList: { id: string; soNumber?: string }[];
  }) => void;
  onContractDragEnd?: () => void;
   onResourceIndexChange?: (
   idx: Record<
     string,
     { category: string; id: string; type: "employee" | "machine" }
   >
 ) => void;
};

// ---------------- Component ----------------

const Sidebar: React.FC<Props> = ({
  expandedSections,
  setExpandedSections,
  allowDrop,
  onDropToEmployeeSection,
  onDropToMachineSection,
  handleSidebarDragStart,
  toggleSection,
  sidebarSearch,
  setSidebarSearch,
  // onContractDragStart,
  // onContractDragEnd,
  onResourceIndexChange,
}) => {
  // Dynamic categories/resources
  const [employeeCategories, setEmployeeCategories] = useState<string[]>([]);
  const [machineCategories, setMachineCategories] = useState<string[]>([]);
  const [sidebarEmployees, setSidebarEmployees] = useState<CategoryMap>({});
  const [sidebarMachines, setSidebarMachines] = useState<CategoryMap>({});

  const navigate = useNavigate();

  // ---------------- Helpers ----------------

  const buildDisplayName = (data: any): string => {
    if (data.name || data.surname) {
      return [data.name, data.surname].filter(Boolean).join(" ");
    }
    return data.title || data.licencePlate || data.name || "Unnamed";
  };

  const searchLower = sidebarSearch.trim().toLowerCase();
  const filterBySearch = (list: ResourceItem[]) =>
    searchLower === ""
      ? list
      : list.filter((item) => item.display.toLowerCase().includes(searchLower));

  // ---------------- Fetch data on auth ----------------

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) {
        setEmployeeCategories([]);
        setMachineCategories([]);
        setSidebarEmployees({});
        setSidebarMachines({});
        return;
      }

      // ----- EMPLOYEE CATEGORIES -----
      const empCatsSnap = await getDocs(
        collection(
          db,
          "companies",
          user.uid,
          "resources",
          "employeeCategories",
          "categories"
        )
      ).catch(() => null);

      const fetchedEmpCats: string[] = [];
      if (empCatsSnap && !empCatsSnap.empty) {
        empCatsSnap.forEach((d) => fetchedEmpCats.push(d.id));
      }
      setEmployeeCategories(fetchedEmpCats);

      // ----- EMPLOYEE RESOURCES -----
      const empObj: CategoryMap = {};
      await Promise.all(
        fetchedEmpCats.map(async (cat) => {
          const resSnap = await getDocs(
            collection(db, "companies", user.uid, "resources", "employees", cat)
          ).catch(() => null);

          empObj[cat] =
            resSnap && !resSnap.empty
              ? resSnap.docs.map((doc) => ({
                  id: doc.id,
                  display: buildDisplayName(doc.data()),
                }))
              : [];
        })
      );
      setSidebarEmployees(empObj);

      // ----- MACHINE CATEGORIES -----
      const machCatsSnap = await getDocs(
        collection(
          db,
          "companies",
          user.uid,
          "resources",
          "machineCategories",
          "categories"
        )
      ).catch(() => null);

      const fetchedMachCats: string[] = [];
      if (machCatsSnap && !machCatsSnap.empty) {
        machCatsSnap.forEach((d) => fetchedMachCats.push(d.id));
      }
      setMachineCategories(fetchedMachCats);

      // ----- MACHINE RESOURCES -----
      const machObj: CategoryMap = {};
      await Promise.all(
        fetchedMachCats.map(async (cat) => {
          const resSnap = await getDocs(
            collection(db, "companies", user.uid, "resources", "machines", cat)
          ).catch(() => null);

          machObj[cat] =
            resSnap && !resSnap.empty
              ? resSnap.docs.map((doc) => ({
                  id: doc.id,
                  display: buildDisplayName(doc.data()),
                }))
              : [];
        })
      );
      setSidebarMachines(machObj);

      // Expand new categories by default
      setExpandedSections((prev) => {
        const out: ExpandedSections = { ...prev };
        fetchedEmpCats.forEach((k) => {
          if (!(k in out)) out[k] = true;
        });
        fetchedMachCats.forEach((k) => {
          if (!(k in out)) out[k] = true;
        });
        return out;
      });

      const idx: Record<
        string,
        { category: string; id: string; type: "employee" | "machine" }
      > = {};
  
      fetchedEmpCats.forEach((cat) => {
        (empObj[cat] || []).forEach(({ id, display }) => {
          idx[display] = { category: cat, id, type: "employee" };
        });
      });
      fetchedMachCats.forEach((cat) => {
        (machObj[cat] || []).forEach(({ id, display }) => {
          idx[display] = { category: cat, id, type: "machine" };
        });
      });
  
      /* fire the callback */
      onResourceIndexChange?.(idx);
    });



    return () => {
      if (unsubAuth) unsubAuth();
    };
  }, [setExpandedSections]);

  // ---------------- UI ----------------

  return (
    <div className="w-64 shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white p-3 border-b border-gray-200">
        <div className="flex items-center gap-0 mb-3">
          <span className="text-sm font-medium">EuropeanCompany</span>
          <span className="pt-1.5 rounded text-xs leading-none">
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

      {/* ---------------- Employees ---------------- */}
      {employeeCategories.length > 0 && (
        <div
          className="border-b border-gray-200"
          onDragOver={allowDrop}
          onDrop={() => onDropToEmployeeSection("__ALL__")}
        >
          <div className="px-3 py-2 text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-600" /> Employees
          </div>
          <div className="px-3 pb-2">
            <div className="relative pl-4">
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-px bg-gray-300" />
              {employeeCategories.map((catKey) => (
                <div key={catKey}>
                  {/* Category Header */}
                  <div
                    className="relative pl-1 py-1 text-sm text-gray-800 cursor-pointer flex items-center justify-between before:absolute before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:w-4 before:h-px before:bg-gray-300"
                    onClick={() => toggleSection(catKey)}
                  >
                    <span>
                      {catKey[0].toUpperCase() +
                        catKey.slice(1).replace(/([A-Z])/g, " $1")}
                    </span>
                    {expandedSections[catKey] ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                  {/* Resources */}
                  {expandedSections[catKey] && (
                    <div
                      className="relative ml-[-7px] pl-4 pb-2 h-min  before:absolute before:left-0 before:top-[-14px] before:bottom-0 before:w-px before:bg-gray-300"
                      onDragOver={allowDrop}
                      onDrop={() => onDropToEmployeeSection(catKey)}
                    >
                      {filterBySearch(sidebarEmployees[catKey] || []).length ===
                      0 ? (
                        <div className="text-xs text-gray-400 italic px-2" />
                      ) : (
                        filterBySearch(sidebarEmployees[catKey] || []).map(
                          (emp, idx) => (
                            <div
                              key={`${catKey}-${emp.id}`}
                              className="relative before:absolute before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:w-4 before:h-px before:bg-gray-300"
                            >
                              <div
                                draggable
                                data-resource-name={emp.display}
                                onDragStart={(e) =>
                                  handleSidebarDragStart(
                                    e,
                                    emp.display,
                                    "employee",
                                    catKey
                                  )
                                }
                                onClick={() =>
                                  navigate(
                                    `/employee-preview/${catKey}/${emp.id}`
                                  )
                                }
                                className={[
                                  "flex items-center justify-between gap-1 px-3 py-1.5 rounded-md text-[11px] leading-[14px] font-semibold text-slate-700 shadow-sm cursor-pointer border-b-[2px]",
                                  idx === 0
                                    ? "bg-gradient-to-b from-sky-100 to-blue-50 border-blue-400"
                                    : idx === 1
                                    ? "bg-gradient-to-b from-emerald-100 to-green-50 border-green-400"
                                    : idx === 2
                                    ? "bg-gradient-to-b from-fuchsia-100 to-pink-100 border-pink-400"
                                    : "bg-gradient-to-b from-slate-100 to-rose-50 border-rose-400 text-slate-400",
                                ].join(" ")}
                              >
                                <span className="truncate flex-1">
                                  {emp.display}
                                </span>
                                <Info
                                  className="h-3 w-3 shrink-0 text-gray-600 hover:text-black"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(
                                      `/employee-preview/${catKey}/${emp.id}`
                                    );
                                  }}
                                />
                              </div>
                            </div>
                          )
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Machines ---------------- */}
      {machineCategories.length > 0 && (
        <div
          className="px-3 py-2"
          onDragOver={allowDrop}
          onDrop={() => onDropToMachineSection("__ALL__")}
        >
          <div className="text-sm font-medium mb-1">
            <Truck className="h-4 w-4 inline-block mr-1 text-gray-600" />{" "}
            Machines
          </div>
          <div className="relative pl-4">
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-px bg-gray-300" />
            {machineCategories.map((catKey) => (
              <div key={catKey}>
                {/* Category Header */}
                <div
                  className="relative pl-1 py-1 text-sm text-gray-900 cursor-pointer flex items-center justify-between before:absolute before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:w-4 before:h-px before:bg-gray-300"
                  onClick={() => toggleSection(catKey)}
                >
                  <span>
                    {catKey[0].toUpperCase() +
                      catKey.slice(1).replace(/([A-Z])/g, " $1")}
                  </span>
                  {expandedSections[catKey] ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </div>
                {/* Resources */}
                {expandedSections[catKey] && (
                  <div
                    className="relative ml-[-7px] pl-4 pb-2 h-min  before:absolute before:left-0 before:top-[-14px] before:bottom-0 before:w-px before:bg-gray-300"
                    onDragOver={allowDrop}
                    onDrop={() => onDropToMachineSection(catKey)}
                  >
                    {filterBySearch(sidebarMachines[catKey] || []).length ===
                    0 ? (
                      <div className="text-xs text-gray-400 italic px-2" />
                    ) : (
                      filterBySearch(sidebarMachines[catKey] || []).map(
                        (machine, idx) => (
                          <div
                            key={`${catKey}-${machine.id}`}
                            className="relative before:absolute before:left-[-1rem] before:top-1/2 before:-translate-y-1/2 before:w-4 before:h-px before:bg-gray-300"
                          >
                            <div
                              draggable
                              data-resource-name={machine.display}
                              onDragStart={(e) =>
                                handleSidebarDragStart(
                                  e,
                                  machine.display,
                                  "machine",
                                  catKey
                                )
                              }
                              onClick={() =>
                                navigate(
                                  `/machine-preview/${catKey}/${machine.id}`
                                )
                              }
                              className={[
                                "flex items-center justify-between gap-1 relative px-3 py-1.5 rounded-md text-[11px] leading-[14px] font-semibold text-slate-700 shadow-sm cursor-pointer border-b-[2px]",
                                idx === 0
                                  ? "bg-yellow-50 border-yellow-200"
                                  : idx === 1
                                  ? "bg-amber-50 border-amber-200"
                                  : idx === 2
                                  ? "bg-teal-50 border-teal-200"
                                  : "bg-orange-100 border-orange-200",
                              ].join(" ")}
                            >
                              <span className="truncate flex-1">
                                {machine.display}
                              </span>
                              <Info
                                className="h-3 w-3 shrink-0 text-gray-600 hover:text-black"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(
                                    `/machine-preview/${catKey}/${machine.id}`
                                  );
                                }}
                              />
                            </div>
                          </div>
                        )
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- Contracts (Static) ---------------- */}
      {/* <SidebarContracts
        onContractDragStart={onContractDragStart}
        onContractDragEnd={onContractDragEnd}
      /> */}
    </div>
  );
};

export default Sidebar;
