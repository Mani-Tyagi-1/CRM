import React, { useEffect, useState } from "react";
import {
  Users,
  Truck,
  FileText,
  Plus,
  PencilLine,
  Trash2,
  GripVertical,
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
  query,
  orderBy,
  Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { ResourceModal } from "./ResourceModal";
import { DeleteModal } from "./DeleteModal";
import { useLocation, useNavigate } from "react-router-dom";
import EditContractForm from "../pages/EditContract";

const GRADIENTS = [
  "from-sky-100 to-blue-50 border-blue-400",
  "from-emerald-100 to-green-50 border-green-400",
  "from-fuchsia-100 to-pink-100 border-pink-400",
  "from-amber-100 to-yellow-50 border-yellow-400",
  "from-indigo-100 to-purple-50 border-indigo-400",
];

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function Tab({
  active,
  label,
  Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  Icon: React.ElementType;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition focus:outline-none " +
        (active
          ? "bg-white shadow text-gray-900"
          : "bg-transparent text-gray-600 hover:bg-gray-200 hover:text-gray-900")
      }
      style={{
        boxShadow: active
          ? "0 1px 4px 0 rgba(0,0,0,0.04), 0 0.5px 1.5px 0 rgba(0,0,0,0.02)"
          : undefined,
      }}
      type="button"
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}

function ColumnHeader({
  label,
  onAdd,
  onRename,
  onDelete,
}: {
  label: string;
  onAdd: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <h3 className="text-base font-semibold text-gray-800 truncate">
        {label}
      </h3>
      <div className="flex items-center gap-1 text-gray-600">
        <Plus
          className="h-4 w-4 cursor-pointer hover:text-black"
          onClick={onAdd}
        />
        <PencilLine
          className="h-4 w-4 cursor-pointer hover:text-black"
          onClick={onRename}
        />
        <Trash2
          className="h-4 w-4 cursor-pointer hover:text-red-600"
          onClick={onDelete}
        />
        <GripVertical className="h-4 w-4 cursor-move" />
      </div>
    </div>
  );
}

function getEmployeeColor(workingRelation?: string) {
  switch ((workingRelation || "").toLowerCase()) {
    case "full-time":
      return "from-sky-100 to-blue-50 border-blue-400 text-blue-800";
    case "part-time":
      return "from-emerald-100 to-green-50 border-green-400 text-green-800";
    case "book-off-time":
      return "from-fuchsia-100 to-pink-100 border-pink-400 text-pink-800";
    default:
      return "from-slate-100 to-gray-50 border-gray-300 text-gray-600";
  }
}


function ResourceCard({
  data,
  gradient,
  onEdit,
  onDelete,
  onClick,
}: {
  data: { id: string; [k: string]: any };
  gradient: string;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  const text =
    data.name || data.surname
      ? [data.name, data.surname].filter(Boolean).join(" ")
      : data.title || data.licencePlate || "Unnamed";
  return (
    <div
      onClick={onClick}
      className={classNames(
        "group cursor-pointer px-3 py-1.5 rounded-md border-b-2 shadow-sm text-[11px] leading-[14px] font-semibold flex items-center gap-1",
        "hover:brightness-110 transition",
        "bg-gradient-to-b",
        gradient
      )}
    >
      <span className="truncate flex-1">{text}</span>
      <PencilLine
        className="h-3 w-3 opacity-0 group-hover:opacity-100 hover:text-black"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
      />
      <Trash2
        className="h-3 w-3 opacity-0 group-hover:opacity-100 hover:text-black"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      />
      <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-100" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* main component                                                      */
/* ------------------------------------------------------------------ */

/* ---------- types ---------- */
type SO = { id: string; soNumber?: string };
type Contract = { id: string; name: string; status?: string; soList: SO[] };

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
  type?: "employee" | "machine" | "contract-so" | "contract";
  category?: string;
  id?: string;
  name?: string;
  isCategory?: boolean;
  contractId?: string; // for SO delete
  soId?: string; // for SO delete
};


type AddCategoryMode = {
  type: null | "employee" | "machine" | "contract";
  open: boolean;
  value: string;
  loading?: boolean;
};

export default function ResourceManagementBoard() {
  /* ----------------------------- state ---------------------------- */
  const navigate = useNavigate();
  const location = useLocation();
  const [uid, setUid] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [employeeCategories, setEmployeeCategories] = useState<string[]>([]);
  const [machineCategories, setMachineCategories] = useState<string[]>([]);

  const [employees, setEmployees] = useState<Record<string, any[]>>({});
  const [machines, setMachines] = useState<Record<string, any[]>>({});

  /* ---------- contracts ---------- */
  const [contracts, setContracts] = useState<Record<string, Contract>>({});
  const [editingSO, setEditingSO] = useState<{
    contractId: string;
    soId: string;
  } | null>(null);
  const [editingSOValue, setEditingSOValue] = useState("");
  const [deletingSO, setDeletingSO] = useState<{
    contractId: string;
    soId: string;
  } | null>(null);

  const [draggedSO, setDraggedSO] = useState<{
    so: SO;
    fromContractId: string;
  } | null>(null);

  const [showAddSOModal, setShowAddSOModal] = useState<{
    contractId: string;
    contractName: string;
  } | null>(null);
  const [addSOModalValue, setAddSOModalValue] = useState("");


  const [modal, setModal] = useState<ModalState>({ open: false });
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    open: false,
  });
  const [addCategoryMode, setAddCategoryMode] = useState<AddCategoryMode>({
    type: null,
    open: false,
    value: "",
    loading: false,
  });
  const [editingContractId, setEditingContractId] = useState<string | null>(
    null
  );


  /* Which tab is active? */
  type TabType = "employees" | "machines" | "contracts";
  const [activeTab, setActiveTab] = useState<TabType>("employees");

  /* -------------------- Firestore subscriptions ------------------- */

  /* ---------- employees / machines ---------- */
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
        setEmployeeCategories([]);
        setMachineCategories([]);
        return;
      }
      setErr(null);
      setUid(user.uid);

      /* ---- pull employee / machine category collections ---- */
      const [empCatSnap, machCatSnap] = await Promise.all([
        getDocs(
          collection(
            db,
            "companies",
            user.uid,
            "resources",
            "employeeCategories",
            "categories"
          )
        ).catch(() => null),
        getDocs(
          collection(
            db,
            "companies",
            user.uid,
            "resources",
            "machineCategories",
            "categories"
          )
        ).catch(() => null),
      ]);

      const empCats: string[] = [];
      empCatSnap?.forEach((d) => empCats.push(d.id));
      setEmployeeCategories(empCats);

      const machCats: string[] = [];
      machCatSnap?.forEach((d) => machCats.push(d.id));
      setMachineCategories(machCats);

      /* ---- subscribe to every category sub-collection ---- */
      empCats.forEach((cat) => {
        const col = collection(
          db,
          "companies",
          user.uid,
          "resources",
          "employees",
          cat
        );
        empUnsubs.push(
          onSnapshot(col, (snap) => {
            setEmployees((prev) => ({
              ...prev,
              [cat]: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
            }));
          })
        );
      });

      machCats.forEach((cat) => {
        const col = collection(
          db,
          "companies",
          user.uid,
          "resources",
          "machines",
          cat
        );
        machUnsubs.push(
          onSnapshot(col, (snap) => {
            setMachines((prev) => ({
              ...prev,
              [cat]: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
            }));
          })
        );
      });
    });

    return () => {
      authUnsub();
      empUnsubs.forEach((fn) => fn());
      machUnsubs.forEach((fn) => fn());
    };
  }, []);

  /* ---------- contracts ---------- */
  useEffect(() => {
    if (activeTab !== "contracts" || !uid) return;

    const soUnsubs: Record<string, Unsubscribe> = {};

    const unsubContracts = onSnapshot(
      collection(db, "companies", uid, "contracts"),
      (snap) => {
        const docs = snap.docs.filter(
          (d) => (d.get("status") ?? "draft") !== "archived"
        );

        /* seed contracts map first */
        setContracts((prev) => {
          const next: Record<string, Contract> = {};
          docs.forEach((d) => {
            const id = d.id;
            next[id] = {
              id,
              name: d.get("name") || "Contract",
              status: d.get("status"),
              soList: prev[id]?.soList ?? [],
            };
          });
          return next;
        });

        /* attach SO listeners */
        docs.forEach((d) => {
          if (soUnsubs[d.id]) return;
          soUnsubs[d.id] = onSnapshot(
            query(
              collection(db, "companies", uid, "contracts", d.id, "so"),
              orderBy("soNumber")
            ),
            (soSnap) => {
              const list = soSnap.docs
                .filter((s) => s.get("soNumber"))
                .map((s) => ({
                  id: s.id,
                  soNumber: s.get("soNumber") as string,
                }));
              setContracts((prev) => ({
                ...prev,
                [d.id]: { ...prev[d.id], soList: list },
              }));
            }
          );
        });

        /* clean up listeners for removed contracts */
        const curIds = docs.map((d) => d.id);
        Object.keys(soUnsubs).forEach((id) => {
          if (!curIds.includes(id)) {
            soUnsubs[id]();
            delete soUnsubs[id];
          }
        });
      }
    );

    return () => {
      unsubContracts();
      Object.values(soUnsubs).forEach((fn) => fn());
    };
  }, [uid, activeTab]);

  /* ------------------------------------------------------------------ */
  /* helpers                                                            */
  /* ------------------------------------------------------------------ */

  function startAddCategory(type: "employee" | "machine" | "contract") {
    setAddCategoryMode({ type, open: true, value: "", loading: false });
  }

  async function confirmAddCategory() {
    const { type, value } = addCategoryMode;
    if (!uid || !type || !value.trim()) return;

    const trimmed = value.trim();
    const key = trimmed.replace(/\s+/g, "");

    if (type === "contract") {
      /* create a new contract document */
      await addDoc(collection(db, "companies", uid, "contracts"), {
        name: trimmed,
        status: "draft",
      });
    } else {
      /* employee / machine categories */
      const docPath =
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
      await setDoc(doc(db, ...(docPath as [string, ...string[]])), {
        label: trimmed,
      });
      if (type === "employee") {
        setEmployeeCategories((c) => (c.includes(key) ? c : [...c, key]));
      } else {
        setMachineCategories((c) => (c.includes(key) ? c : [...c, key]));
      }
    }

    setAddCategoryMode({ type: null, open: false, value: "", loading: false });
  }

  // Edit SO submit
  async function handleEditSO(contractId: string, soId: string) {
    if (!uid || !editingSOValue.trim()) return;
    await updateDoc(
      doc(db, "companies", uid, "contracts", contractId, "so", soId),
      { soNumber: editingSOValue.trim() }
    );
    setEditingSO(null);
    setEditingSOValue("");
  }

  // Delete SO
  async function handleDeleteSO(contractId: string, soId: string) {
    if (!uid) return;
    await deleteDoc(
      doc(db, "companies", uid, "contracts", contractId, "so", soId)
    );
    setDeletingSO(null);
  }

  // Move SO (drag and drop)
  async function moveSO(fromContractId: string, toContractId: string, so: SO) {
    if (!uid || !so.id) return;
    // Get SO doc data
    const soDoc = doc(
      db,
      "companies",
      uid,
      "contracts",
      fromContractId,
      "so",
      so.id
    );
    const soSnap = await getDocs(
      query(
        collection(db, "companies", uid, "contracts", fromContractId, "so"),
        orderBy("soNumber")
      )
    );
    const soData = soSnap.docs.find((d) => d.id === so.id)?.data();
    if (!soData) return;

    // Add to new contract
    await addDoc(
      collection(db, "companies", uid, "contracts", toContractId, "so"),
      soData
    );
    // Remove from old
    await deleteDoc(soDoc);
  }

  /* ---------- resource modal ---------- */

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

  async function handleModalSubmit(data: any) {
    if (!uid || !modal.type || !modal.category) return;

    const base = [
      "companies",
      uid,
      "resources",
      modal.type === "employee" ? "employees" : "machines",
      modal.category,
    ] as [string, ...string[]];

    const dataWithCat = { ...data, category: modal.category };

    if (modal.mode === "add") {
      await addDoc(collection(db, ...base), dataWithCat);
    } else if (modal.mode === "edit" && modal.docId) {
      await updateDoc(doc(db, ...base, modal.docId), dataWithCat);
    }
    setModal({ open: false });
  }

  /* ---------- delete modal ---------- */

  function openDeleteModal(
    type: "employee" | "machine",
    category: string,
    id: string,
    name: string,
    isCategory = false
  ) {
    setDeleteModal({ open: true, type, category, id, name, isCategory });
  }

  async function confirmDelete() {
    if (!uid) {
      setDeleteModal({ open: false });
      return;
    }

    if (deleteModal.type === "contract" && deleteModal.id) {
      // Delete all SOs under the contract
      const soSnap = await getDocs(
        collection(db, "companies", uid, "contracts", deleteModal.id, "so")
      );
      await Promise.all(soSnap.docs.map((d) => deleteDoc(d.ref)));

      // Delete the contract itself
      await deleteDoc(doc(db, "companies", uid, "contracts", deleteModal.id));

      setDeleteModal({ open: false });
      return;
    }


      if (
        deleteModal.type === "contract-so" &&
        deleteModal.contractId &&
        deleteModal.soId
      ) {
        await deleteDoc(
          doc(
            db,
            "companies",
            uid,
            "contracts",
            deleteModal.contractId,
            "so",
            deleteModal.soId
          )
        );
        setDeleteModal({ open: false });
        return;
      }


    /* deleting an entire category */
    if (deleteModal.isCategory && deleteModal.category) {
      const base = deleteModal.type === "employee" ? "employees" : "machines";
      const cat = deleteModal.category;

      /* remove all docs inside */
      const snap = await getDocs(
        collection(db, "companies", uid, "resources", base, cat)
      );
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));

      /* remove the category doc */
      const catDoc =
        deleteModal.type === "employee"
          ? [
              "companies",
              uid,
              "resources",
              "employeeCategories",
              "categories",
              cat,
            ]
          : [
              "companies",
              uid,
              "resources",
              "machineCategories",
              "categories",
              cat,
            ];
      await deleteDoc(doc(db, ...(catDoc as [string, ...string[]])));

      if (deleteModal.type === "employee") {
        setEmployeeCategories((c) => c.filter((k) => k !== cat));
        setEmployees((e) => {
          const { [cat]: _, ...rest } = e;
          return rest;
        });
      } else {
        setMachineCategories((c) => c.filter((k) => k !== cat));
        setMachines((m) => {
          const { [cat]: _, ...rest } = m;
          return rest;
        });
      }

      setDeleteModal({ open: false });
      return;
    }

    /* deleting a single resource */
    if (!deleteModal.type || !deleteModal.category || !deleteModal.id) return;


    const docPath = [
      "companies",
      uid,
      "resources",
      deleteModal.type === "employee" ? "employees" : "machines",
      deleteModal.category,
      deleteModal.id,
    ] as [string, ...string[]];

    await deleteDoc(doc(db, ...docPath));
    setDeleteModal({ open: false });

    
  }

  /* pick the data based on active tab */
  const categories =
    activeTab === "employees"
      ? employeeCategories
      : activeTab === "machines"
      ? machineCategories
      : [];

  const dataMap =
    activeTab === "employees"
      ? employees
      : activeTab === "machines"
      ? machines
      : {};

  return (
    <>
      {/* ---------------- top tabs ---------------- */}
      <div className="flex items-end gap-40  mb-1">
        <div>
          <div className="inline-flex bg-gray-100 rounded-xl px-1 py-1">
            <Tab
              active={activeTab === "employees"}
              label="Employees"
              Icon={Users}
              onClick={() => setActiveTab("employees")}
            />
            <Tab
              active={activeTab === "machines"}
              label="Machines"
              Icon={Truck}
              onClick={() => setActiveTab("machines")}
            />
            <Tab
              active={activeTab === "contracts"}
              label="Contracts"
              Icon={FileText}
              onClick={() => setActiveTab("contracts")}
            />
          </div>
        </div>

        {/* ---------- right heading ---------- */}
        <div className="w-1/2 shrink-0">
          <h2 className="text-2xl font-bold leading-tight mb-1">
            Resources management
          </h2>
          <p className="text-sm text-black/80 leading-snug">
            Lorem Ipsum is simply dummy text of the printing and typesetting
            industry. Lorem Ipsum has been the industry's standard dummy text
            ever since the 1500s.
          </p>
          {err && (
            <div className="mt-4 text-xs text-red-500 whitespace-pre-wrap">
              {err}
            </div>
          )}
        </div>
      </div>

      {/* ---------------- board + side panel ---------------- */}
      <div className="flex gap-10">
        {/* ---------- left: board ---------- */}
        <div className="flex-1 overflow-x-auto">
          {activeTab === "contracts" ? (
            <button
              className="text-black text-sm mb-4 hover:underline"
              onClick={() =>
                navigate("/add-contract", {
                  state: {
                    backgroundLocation: { pathname: location.pathname },
                  },
                })
              }
              type="button"
            >
              + Add contract
            </button>
          ) : (
            <button
              className="text-black text-sm mb-4 hover:underline"
              onClick={() =>
                startAddCategory(
                  activeTab === "employees" ? "employee" : "machine"
                )
              }
              type="button"
            >
              + Add {activeTab === "employees" ? "employee" : "machines"}{" "}
              category
            </button>
          )}

          {/* ---------------- board lanes ---------------- */}
          <div className="flex gap-6 pb-4 min-h-[calc(100vh-200px)] overflow-x-auto scrollbar-none">
            {/* ---------- CONTRACTS TAB ---------- */}
            {activeTab === "contracts" ? (
              Object.keys(contracts).length === 0 ? (
                <div className="text-sm text-gray-400">
                  No contracts yet. Add one above.
                </div>
              ) : (
                Object.values(contracts).map((contract) => (
                  <div
                    key={contract.id}
                    className="w-64 shrink-0 border-r last:border-r-0 border-gray-200 pr-3"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (
                        draggedSO &&
                        draggedSO.fromContractId !== contract.id
                      ) {
                        moveSO(
                          draggedSO.fromContractId,
                          contract.id,
                          draggedSO.so
                        );
                      }
                      setDraggedSO(null);
                    }}
                  >
                    {/* column header */}
                    <div className="flex items-center justify-between py-2">
                      <h3 className="text-base font-semibold text-gray-800 truncate">
                        {contract.name}
                      </h3>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Plus
                          className="h-4 w-4 cursor-pointer hover:text-black"
                          onClick={() =>
                            setShowAddSOModal({
                              contractId: contract.id,
                              contractName: contract.name,
                            })
                          }
                        />

                        <PencilLine
                          className="h-4 w-4 cursor-pointer hover:text-black"
                          onClick={() => setEditingContractId(contract.id)}
                        />

                        <Trash2
                          className="h-4 w-4 cursor-pointer hover:text-red-600"
                          onClick={() =>
                            setDeleteModal({
                              open: true,
                              type: "contract",
                              id: contract.id,
                              name: contract.name,
                              isCategory: true,
                            })
                          }
                        />

                        <GripVertical className="h-4 w-4 cursor-move" />
                      </div>
                    </div>

                    <div className="w-72 h-[1px] bg-slate-200 mb-2"></div>

                    {/* SO list */}
                    <div className="space-y-1 pb-2">
                      {contract.soList.length === 0 && (
                        <div className="text-[13px] text-gray-400 italic px-2 py-1">
                          No SOs added
                        </div>
                      )}
                      {contract.soList.map((so) => (
                        <div
                          key={so.id}
                          className="flex items-center bg-white border border-gray-200 rounded-md px-3 py-1 text-[14px] font-medium text-gray-800  group"
                          draggable
                          onDragStart={() =>
                            setDraggedSO({ so, fromContractId: contract.id })
                          }
                          onDragEnd={() => setDraggedSO(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (
                              draggedSO &&
                              draggedSO.fromContractId !== contract.id &&
                              draggedSO.so.id !== so.id
                            ) {
                              moveSO(
                                draggedSO.fromContractId,
                                contract.id,
                                draggedSO.so
                              );
                            }
                            setDraggedSO(null);
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          style={{
                            opacity:
                              draggedSO &&
                              draggedSO.so.id === so.id &&
                              draggedSO.fromContractId === contract.id
                                ? 0.5
                                : 1,
                            cursor: "move",
                            position: "relative",
                          }}
                        >
                          {editingSO?.contractId === contract.id &&
                          editingSO.soId === so.id ? (
                            <form
                              className="flex-1 flex items-center gap-2"
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleEditSO(contract.id, so.id);
                              }}
                            >
                              <input
                                className="px-2 py-1 text-[13px] border border-gray-300 rounded-md w-20 outline-none"
                                value={editingSOValue}
                                autoFocus
                                onChange={(e) =>
                                  setEditingSOValue(e.target.value)
                                }
                                onBlur={() => setEditingSO(null)}
                              />
                              <button
                                type="submit"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="text-xs text-gray-600 ml-1"
                                onClick={() => setEditingSO(null)}
                              >
                                Cancel
                              </button>
                            </form>
                          ) : (
                            <>
                              <span
                                className="flex-1 truncate"
                                title={so.soNumber}
                              >
                                {so.soNumber}
                              </span>
                              <PencilLine
                                className="h-4 w-4 ml-2 opacity-0 group-hover:opacity-100 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSO({
                                    contractId: contract.id,
                                    soId: so.id,
                                  });
                                  setEditingSOValue(so.soNumber || "");
                                }}
                              />
                              <Trash2
                                className="h-4 w-4 ml-2 opacity-0 group-hover:opacity-100 text-red-500 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteModal({
                                    open: true,
                                    type: "contract-so",
                                    contractId: contract.id,
                                    soId: so.id,
                                    name: so.soNumber || "SO",
                                    isCategory: false,
                                  });
                                }}
                              />

                              <GripVertical className="h-4 w-4 ml-2 opacity-0 group-hover:opacity-100" />
                            </>
                          )}
                          {/* Inline confirm delete popup */}
                          {deletingSO &&
                            deletingSO.contractId === contract.id &&
                            deletingSO.soId === so.id && (
                              <div className="absolute top-full left-0 mt-1 bg-white border shadow rounded p-2 text-xs flex gap-2 z-20">
                                <span>Delete SO?</span>
                                <button
                                  className="text-red-500"
                                  onClick={() =>
                                    handleDeleteSO(contract.id, so.id)
                                  }
                                >
                                  Yes
                                </button>
                                <button
                                  className="text-gray-500"
                                  onClick={() => setDeletingSO(null)}
                                >
                                  No
                                </button>
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )
            ) : /* ---------- EMPLOYEES / MACHINES ---------- */
            categories.length === 0 ? (
              <div className="text-sm text-gray-400">
                No categories yet. Add one above.
              </div>
            ) : (
              categories.map((catKey) => {
                const list = dataMap[catKey] || [];
                const label =
                  catKey[0].toUpperCase() +
                  catKey.slice(1).replace(/([A-Z])/g, " $1");
                const type = activeTab === "employees" ? "employee" : "machine";

                return (
                  <div
                    key={catKey}
                    className="w-64 shrink-0 border-r last:border-r-0 border-gray-200 pr-3 "
                  >
                    <ColumnHeader
                      label={label}
                      onAdd={() => openAdd(type, catKey)}
                      onRename={() => {
                        /* optional: implement rename */
                      }}
                      onDelete={() =>
                        openDeleteModal(type, catKey, "", label, true)
                      }
                    />

                    <div className="w-72 h-[1px] bg-slate-200 mb-2"></div>

                    {/* list of resources */}
                    <div className="space-y-1 pb-2">
                      {list.map((docObj: any, idx: number) => (
                        <ResourceCard
                          key={docObj.id}
                          data={docObj}
                          gradient={
                            docObj.workingRelation
                              ? getEmployeeColor(docObj.workingRelation)
                              : GRADIENTS[idx % GRADIENTS.length]
                          }
                          onEdit={() =>
                            openEdit(type, catKey, docObj, docObj.id)
                          }
                          onDelete={() =>
                            openDeleteModal(
                              type,
                              catKey,
                              docObj.id,
                              docObj.name || docObj.title || "Item"
                            )
                          }
                          onClick={() =>
                            navigate(
                              `/${
                                activeTab === "employees"
                                  ? "employee-preview"
                                  : "machine-preview"
                              }/${catKey}/${docObj.id}`
                            )
                          }
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* -------------------- modals & overlays -------------------- */}
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

      {/* quick “add category / contract” modal */}
      {addCategoryMode.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border p-6 w-full max-w-xs flex flex-col gap-4 relative">
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
                : addCategoryMode.type === "machine"
                ? "Add machines category"
                : "Add contract"}
            </div>
            <input
              type="text"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
              placeholder={
                addCategoryMode.type === "contract"
                  ? "Contract name"
                  : "Enter category name"
              }
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

      {showAddSOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-7 shadow-2xl flex flex-col gap-4">
            {/* Close button */}
            <button
              className="absolute right-4 top-3 text-xl font-bold text-gray-400 hover:text-gray-700 transition-colors rounded-full p-1"
              onClick={() => {
                setShowAddSOModal(null);
                setAddSOModalValue("");
              }}
              tabIndex={0}
              aria-label="Close"
            >
              ×
            </button>
            {/* Title */}
            <div className="mb-1 text-lg font-semibold text-gray-500 flex items-center gap-2">
              <span>Contract </span>
              <span className="inline-block font-bold">
                {showAddSOModal.contractName}
              </span>
            </div>
            {/* Subtitle / helper text */}
            <div className="text-[13px] text-gray-600 mb-2">
              Enter the SO number to add it under{" "}
              <span className="font-semibold text-blue-700">
                {showAddSOModal.contractName}
              </span>
              .
            </div>
            {/* Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!uid || !addSOModalValue.trim()) return;
                await addDoc(
                  collection(
                    db,
                    "companies",
                    uid,
                    "contracts",
                    showAddSOModal.contractId,
                    "so"
                  ),
                  { soNumber: addSOModalValue.trim() }
                );
                setShowAddSOModal(null);
                setAddSOModalValue("");
              }}
              className="space-y-4"
            >
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="so-number-input"
                  className="text-sm font-medium text-gray-700 flex items-center"
                >
                  SO Number
                  <span className="ml-1 text-red-500 text-base leading-none">
                    *
                  </span>
                </label>
                <input
                  id="so-number-input"
                  autoFocus
                  className="rounded-lg border border-gray-300 px-3 py-2 text-base transition focus:ring-2 focus:ring-blue-200 focus:outline-none"
                  value={addSOModalValue}
                  onChange={(e) => setAddSOModalValue(e.target.value)}
                  placeholder="e.g. SO-12345"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  className="px-4 py-1.5 rounded-md bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 transition"
                  onClick={() => {
                    setShowAddSOModal(null);
                    setAddSOModalValue("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition shadow-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
                  disabled={!addSOModalValue.trim()}
                >
                  Add SO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingContractId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border p-0 w-full max-w-4xl flex flex-col relative">
            <button
              className="absolute right-3 top-2 text-lg hover:bg-gray-100 rounded-full px-2 py-1 transition"
              onClick={() => setEditingContractId(null)}
              tabIndex={0}
            >
              ×
            </button>
            <EditContractForm
              companyId={uid!}
              contractId={editingContractId}
              onUpdated={() => setEditingContractId(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}
