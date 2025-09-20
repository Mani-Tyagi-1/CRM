import React, { useEffect, useState } from "react";
import {
  Users,
  Truck,
  ChevronUp,
  ChevronDown,
  PencilLine,
  Trash2,
  Plus,
} from "lucide-react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  getDocs,
  Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { ResourceModal } from "./ResourceModal";
import { DeleteModal } from "./DeleteModal";
import { useNavigate } from "react-router-dom"; // if using React Router


// STATIC DEFAULTS
const DEFAULT_EMPLOYEE_CATEGORIES = [
  "drivers",
  "engineers",
  "hand",
  "mechanics",
  "tap",
  "masters",
  "constructionLead",
];

const DEFAULT_MACHINE_CATEGORIES = [
  "digger",
  "loader",
  "trailerTrucks",
  "wheelers8",
  "personalCars",
  "tools",
];

const GRADIENTS = [
  "from-sky-100 to-blue-50 border-blue-400",
  "from-emerald-100 to-green-50 border-green-400",
  "from-fuchsia-100 to-pink-100 border-pink-400",
  "from-amber-100 to-yellow-50 border-yellow-400",
  "from-indigo-100 to-purple-50 border-indigo-400",
];

// ---------- UI HELPERS ----------

function SectionHeader({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold mb-1 select-none">
      <Icon className="h-4 w-4 text-gray-600 shrink-0" />
      <span>{label}</span>
    </div>
  );
}

function BranchHeader({
  label,
  open,
  toggle,
  onAdd,
}: {
  label: string;
  open: boolean;
  toggle: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="relative pl-1 py-1 cursor-pointer flex items-center justify-between text-sm text-gray-900 before:absolute before:-left-4 before:top-1/2 before:-translate-y-1/2 before:w-4 before:h-px before:bg-gray-300 group">
      <div className="flex-1" onClick={toggle}>
        {label}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 mr-1">
        <Plus
          className="h-3 w-3 cursor-pointer text-gray-600 hover:text-black"
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
        />
      </div>
      {open ? (
        <ChevronUp className="h-3 w-3 ml-1" />
      ) : (
        <ChevronDown className="h-3 w-3 ml-1" />
      )}
    </div>
  );
}

function Leaf({
  data,
  className = "",
  onEdit,
  onDelete,
  onClick, // NEW
}: {
  data: { id: string; [key: string]: any };
  className?: string;
  onEdit: () => void;
  onDelete: () => void;
  onClick?: () => void; // NEW
}) {
  const display =
    data.name || data.surname
      ? [data.name, data.surname].filter(Boolean).join(" ")
      : data.title || data.licencePlate || "Unnamed";
  return (
    <div className="relative before:absolute before:-left-4 before:top-1/2 before:-translate-y-1/2 before:w-4 before:h-px before:bg-gray-300">
      <div
        className={
          "px-3 py-1.5 rounded-md text-[11px] leading-[14px] font-semibold text-slate-700 shadow-sm flex items-center gap-1 border-b-2 cursor-pointer " + // add cursor-pointer
          className
        }
        onClick={onClick}
      >
        <span className="truncate flex-1">{display}</span>
        <PencilLine
          className="h-3 w-3 cursor-pointer hover:text-black"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        />
        <Trash2
          className="h-3 w-3 cursor-pointer hover:text-black"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        />
      </div>
    </div>
  );
}


// ----------- Main Component -----------

type ModalState = {
  open: boolean;
  mode?: "add" | "edit";
  type?: "employee" | "machine";
  category?: string;
  initialData?: any;
  docId?: string;
};

type DeleteModalState = {
  open: boolean;
  type?: "employee" | "machine";
  category?: string;
  id?: string;
  name?: string;
};

type AddCategoryMode = {
  type: null | "employee" | "machine";
  open: boolean;
  value: string;
  loading?: boolean;
};

export default function ResourceManagementSidebar() {
  const [uid, setUid] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  // ----------- CATEGORY MANAGEMENT (dynamic) -----------
  const [employeeCategories, setEmployeeCategories] = useState<string[]>([
    ...DEFAULT_EMPLOYEE_CATEGORIES,
  ]);
  const [machineCategories, setMachineCategories] = useState<string[]>([
    ...DEFAULT_MACHINE_CATEGORIES,
  ]);

  const [addCategoryMode, setAddCategoryMode] = useState<AddCategoryMode>({
    type: null,
    open: false,
    value: "",
    loading: false,
  });

  // State for collapsible categories (all open by default for best UX)
  const [openEmp, setOpenEmp] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(DEFAULT_EMPLOYEE_CATEGORIES.map((k) => [k, true]))
  );
  const [openMachine, setOpenMachine] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(DEFAULT_MACHINE_CATEGORIES.map((k) => [k, true]))
  );

  // Data
  const [employees, setEmployees] = useState<Record<string, any[]>>({});
  const [machines, setMachines] = useState<Record<string, any[]>>({});

  // Modals
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    open: false,
  });

  // --- LOAD categories & data from Firestore ---
  useEffect(() => {
    let empUnsubs: Unsubscribe[] = [];
    let machUnsubs: Unsubscribe[] = [];

    const authUnsub = onAuthStateChanged(auth, async (user: User | null) => {
      empUnsubs.forEach((fn) => fn());
      machUnsubs.forEach((fn) => fn());
      setEmployees({});
      setMachines({});

      if (!user) {
        setUid(null);
        setErr("Not signed in");
        return;
      }
      setErr(null);
      setUid(user.uid);

      // ----- EMPLOYEE CATEGORIES -----
      const empCatSnap = await getDocs(
        collection(
          db,
          "companies",
          user.uid,
          "resources",
          "employeeCategories",
          "categories"
        )
      ).catch(() => null);

      let empCats = [...DEFAULT_EMPLOYEE_CATEGORIES];
      if (empCatSnap && !empCatSnap.empty) {
        empCatSnap.forEach((d) => {
          if (!empCats.includes(d.id)) empCats.push(d.id);
        });
      }
      setEmployeeCategories(empCats);
      setOpenEmp((old) =>
        Object.fromEntries(empCats.map((k) => [k, old[k] ?? true]))
      );

      // ----- MACHINE CATEGORIES -----
      const machCatSnap = await getDocs(
        collection(
          db,
          "companies",
          user.uid,
          "resources",
          "machineCategories",
          "categories"
        )
      ).catch(() => null);

      let machCats = [...DEFAULT_MACHINE_CATEGORIES];
      if (machCatSnap && !machCatSnap.empty) {
        machCatSnap.forEach((d) => {
          if (!machCats.includes(d.id)) machCats.push(d.id);
        });
      }
      setMachineCategories(machCats);
      setOpenMachine((old) =>
        Object.fromEntries(machCats.map((k) => [k, old[k] ?? true]))
      );

      // ----- EMPLOYEE DATA -----
      empCats.forEach((cat) => {
        const colRef = collection(
          db,
          "companies",
          user.uid,
          "resources",
          "employees",
          cat
        );
        const unsub = onSnapshot(colRef, (snap) => {
          setEmployees((prev) => ({
            ...prev,
            [cat]: snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            })),
          }));
        });
        empUnsubs.push(unsub);
      });

      // ----- MACHINE DATA -----
      machCats.forEach((cat) => {
        const colRef = collection(
          db,
          "companies",
          user.uid,
          "resources",
          "machines",
          cat
        );
        const unsub = onSnapshot(colRef, (snap) => {
          setMachines((prev) => ({
            ...prev,
            [cat]: snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            })),
          }));
        });
        machUnsubs.push(unsub);
      });
    });

    return () => {
      authUnsub();
      empUnsubs.forEach((fn) => fn());
      machUnsubs.forEach((fn) => fn());
    };
  }, []);

  // ---------------- CATEGORY ADDING ----------------
  function startAddCategory(type: "employee" | "machine") {
    setAddCategoryMode({ type, open: true, value: "", loading: false });
  }

  // Confirm add category (snappy close, async update)
  async function confirmAddCategory() {
    const { type, value } = addCategoryMode;
    if (!uid || !type || !value.trim()) return;
    const key = value.trim().replace(/\s+/g, "");
    if (!key) return;
    setAddCategoryMode((prev) => ({
      ...prev,
      open: false,
      value: "",
      loading: true,
    }));

    // Firestore add
    const colPath =
      type === "employee"
        ? [
            "companies",
            uid,
            "resources",
            "employeeCategories",
            "categories",
            key,
          ]
        : [
            "companies",
            uid,
            "resources",
            "machineCategories",
            "categories",
            key,
          ];
    await setDoc(doc(db,...(colPath as [string, ...string[]])), { label: value.trim() });

    // Add category to UI and immediately start listening for resources!
    if (type === "employee") {
      setEmployeeCategories((cats) =>
        cats.includes(key) ? cats : [...cats, key]
      );
      setOpenEmp((old) => ({ ...old, [key]: true }));
      const colRef = collection(
        db,
        "companies",
        uid,
        "resources",
        "employees",
        key
      );
      onSnapshot(colRef, (snap) => {
        setEmployees((prev) => ({
          ...prev,
          [key]: snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })),
        }));
      });
    } else {
      setMachineCategories((cats) =>
        cats.includes(key) ? cats : [...cats, key]
      );
      setOpenMachine((old) => ({ ...old, [key]: true }));
      const colRef = collection(
        db,
        "companies",
        uid,
        "resources",
        "machines",
        key
      );
      onSnapshot(colRef, (snap) => {
        setMachines((prev) => ({
          ...prev,
          [key]: snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })),
        }));
      });
    }
  }

  // --------------- Modal Openers ---------------
  function openAdd(type: "employee" | "machine", category: string) {
    setModal({
      open: true,
      mode: "add",
      type,
      category,
      initialData: { category },
    });
  }

  function openEdit(
    type: "employee" | "machine",
    category: string,
    data: any,
    docId: string
  ) {
    setModal({
      open: true,
      mode: "edit",
      type,
      category,
      initialData: data,
      docId,
    });
  }

  // --------------- Modal Submission ---------------
  async function handleModalSubmit(data: any) {
    if (!uid || !modal.type || !modal.category) return;
    const basePath = [
      "companies",
      uid,
      "resources",
      modal.type === "employee" ? "employees" : "machines",
      modal.category,
    ];
    const dataWithCat = { ...data, category: modal.category };
    if (modal.mode === "add") {
      await addDoc(
        collection(db, ...(basePath as [string, ...string[]])),
        dataWithCat
      );
    } else if (modal.mode === "edit" && modal.docId) {
      await updateDoc(
        doc(db, ...(basePath as [string, ...string[]]), modal.docId),
        dataWithCat
      );
    }
    setModal({ open: false });
  }

  // --------------- Delete (DeleteModal) ---------------
  function openDeleteModal(
    type: "employee" | "machine",
    category: string,
    id: string,
    name: string
  ) {
    setDeleteModal({ open: true, type, category, id, name });
  }
  async function confirmDelete() {
    if (!uid || !deleteModal.type || !deleteModal.category || !deleteModal.id)
      return;
    const docPath = [
      "companies",
      uid,
      "resources",
      deleteModal.type === "employee" ? "employees" : "machines",
      deleteModal.category,
      deleteModal.id,
    ];
    await deleteDoc(doc(db, ...(docPath as [string, ...string[]])));
    setDeleteModal({ open: false });
  }

  // -------- Employees Section --------
  const EmpSection = (
    <div className="border-b border-gray-200 px-4 pt-4 pb-2">
      <SectionHeader icon={Users} label="Employees" />
      <div className="relative pl-4 before:pointer-events-none before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-gray-300">
        {employeeCategories.map((catKey) => {
          const list = employees[catKey] || [];
          return (
            <React.Fragment key={catKey}>
              <BranchHeader
                label={
                  catKey[0].toUpperCase() +
                  catKey.slice(1).replace(/([A-Z])/g, " $1")
                }
                open={openEmp[catKey]}
                toggle={() =>
                  setOpenEmp((p) => ({ ...p, [catKey]: !p[catKey] }))
                }
                onAdd={() => openAdd("employee", catKey)}
              />
              {openEmp[catKey] && (
                <div className="relative ml-2 pl-4 pb-1 space-y-1 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-gray-300">
                  {list.map((docObj, idx) => (
                    <Leaf
                      key={docObj.id}
                      data={docObj}
                      className={`bg-gradient-to-b ${
                        GRADIENTS[idx % GRADIENTS.length]
                      }`}
                      onEdit={() =>
                        openEdit("employee", catKey, docObj, docObj.id)
                      }
                      onDelete={() =>
                        openDeleteModal(
                          "employee",
                          catKey,
                          docObj.id,
                          docObj.name || "Employee"
                        )
                      }
                      onClick={() =>
                        navigate(`/employee-preview/${catKey}/${docObj.id}`)
                      } // 👈 NEW
                    />
                  ))}
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* --- Add Employee Category UI --- */}
        <div className="relative pl-2 mt-2">
          <span
            className="absolute -left-4 top-1/2 w-5 h-px bg-gray-300"
            style={{ transform: "translateY(-50%)" }}
            aria-hidden="true"
          />
          <button
            className="text-black text-[15px] font-normal flex items-center hover:underline"
            onClick={() => startAddCategory("employee")}
            type="button"
          >
            + Add employee category
          </button>
        </div>
      </div>
    </div>
  );

  // -------- Machines Section --------
  const MachineSection = (
    <div className="px-4 pt-4 pb-2 border-b border-gray-200">
      <SectionHeader icon={Truck} label="Machines" />
      <div className="relative pl-4 before:pointer-events-none before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-gray-300">
        {machineCategories.map((catKey) => {
          const list = machines[catKey] || [];
          return (
            <React.Fragment key={catKey}>
              <BranchHeader
                label={
                  catKey[0].toUpperCase() +
                  catKey.slice(1).replace(/([A-Z])/g, " $1")
                }
                open={openMachine[catKey]}
                toggle={() =>
                  setOpenMachine((p) => ({ ...p, [catKey]: !p[catKey] }))
                }
                onAdd={() => openAdd("machine", catKey)}
              />
              {openMachine[catKey] && (
                <div className="relative ml-2 pl-4 pb-1 space-y-1 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-gray-300">
                  {list.map((docObj, _idx) => (
                    <Leaf
                      key={docObj.id}
                      data={docObj}
                      className="bg-orange-100 border-orange-200"
                      onEdit={() =>
                        openEdit("machine", catKey, docObj, docObj.id)
                      }
                      onDelete={() =>
                        openDeleteModal(
                          "machine",
                          catKey,
                          docObj.id,
                          docObj.name || "Machine"
                        )
                      }
                      onClick={() =>
                        navigate(`/machine-preview/${catKey}/${docObj.id}`)
                      } // 👈 NEW: go to machine preview
                    />
                  ))}
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* --- Add Machines Category UI --- */}
        <div className="relative pl-2 mt-2">
          <span
            className="absolute -left-4 top-1/2 w-5 h-px bg-gray-300"
            style={{ transform: "translateY(-50%)" }}
            aria-hidden="true"
          />
          <button
            className="text-black text-[15px] font-normal flex items-center hover:underline"
            onClick={() => startAddCategory("machine")}
            type="button"
          >
            + Add machines category
          </button>
        </div>
      </div>
    </div>
  );

  // ----------- Render -----------
  return (
    <>
      <div className="w-full flex flex-col justify-center items-center">
        <div className=" w-[500px] px-4  pb-1">
          <h2 className="text-xl font-bold leading-tight mb-1">
            Resources management
          </h2>
          <div className="text-[13px] leading-snug text-black/80">
            Lorem Ipsum is simply dummy text of the printing and typesetting
            industry. Lorem Ipsum has been the industry's standard dummy text
            ever since the 1500s.
          </div>
        </div>

        <aside className="w-80 shrink-0 bg-white overflow-y-auto text-[13px] leading-[16px]">
          {EmpSection}
          {MachineSection}
          {err && (
            <div className="p-3 text-xs text-red-500 whitespace-pre-wrap">
              {err}
            </div>
          )}
        </aside>
        <ResourceModal
          open={modal.open}
          mode={modal.mode}
          type={modal.type as any}
          category={modal.category || ""}
          initialData={modal.initialData}
          onClose={() => setModal({ open: false })}
          onSubmit={handleModalSubmit}
        />
        <DeleteModal
          open={deleteModal.open}
          name={deleteModal.name || ""}
          onCancel={() => setDeleteModal({ open: false })}
          onConfirm={confirmDelete}
        />
        {/* Category input modal/inline */}
        {addCategoryMode.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-100 p-6 w-full max-w-xs flex flex-col gap-4 relative">
              <button
                className="absolute right-3 top-2 text-lg hover:bg-gray-100 rounded-full px-2 py-1 transition"
                onClick={() =>
                  setAddCategoryMode({
                    type: null,
                    open: false,
                    value: "",
                    loading: false,
                  })
                }
                tabIndex={0}
              >
                ×
              </button>
              <div className="text-base font-medium text-gray-700">
                {addCategoryMode.type === "employee"
                  ? "Add employee category"
                  : "Add machines category"}
              </div>
              <input
                type="text"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                placeholder="Enter category name"
                value={addCategoryMode.value}
                autoFocus
                disabled={addCategoryMode.loading}
                onChange={(e) =>
                  setAddCategoryMode((s) => ({ ...s, value: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmAddCategory();
                  if (e.key === "Escape")
                    setAddCategoryMode({
                      type: null,
                      open: false,
                      value: "",
                      loading: false,
                    });
                }}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() =>
                    setAddCategoryMode({
                      type: null,
                      open: false,
                      value: "",
                      loading: false,
                    })
                  }
                  className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 transition"
                  type="button"
                  disabled={addCategoryMode.loading}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAddCategory}
                  className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
                  type="button"
                  disabled={
                    !addCategoryMode.value.trim() || addCategoryMode.loading
                  }
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
