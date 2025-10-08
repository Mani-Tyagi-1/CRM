// ===================== SidebarContracts.tsx =====================
import React, { useEffect, useState } from "react";
import { FileText, ChevronUp, ChevronDown, Loader2, Info } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  addDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { useNavigate } from "react-router-dom";

/* ---------- Types ---------- */
type ContractDoc = {
  id: string;
  name?: string;
  status?: string;
};

type SOItem = {
  id: string;
  soNumber?: string;
};

type ContractWithSOs = {
  id: string;
  title: string;
  SOs: SOItem[];
};

/* ---------- UPDATED prop so the parent (Calendar) can receive drag events ---------- */
type Props = {
  onContractDragStart?: (payload: {
    contractId: string;
    title: string;
    soList: { id: string; soNumber?: string }[];
  }) => void;
  onContractDragEnd?: () => void;
};

/* ------------------------------------------------------------------------------ */
const SidebarContracts: React.FC<Props> = ({
  onContractDragStart = () => {},
  onContractDragEnd = () => {},
}) => {
  const [contracts, setContracts] = useState<ContractWithSOs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractsExpanded, setContractsExpanded] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [addingSOContract, setAddingSOContract] = useState<string | null>(null);
  const [addingSOName, setAddingSOName] = useState("");

  const navigate = useNavigate();

  /* ---------- Firestore listeners ---------- */
  useEffect(() => {
    let unsubContracts: null | (() => void) = null;
    let soUnsubs: Record<string, () => void> = {};
    let mounted = true;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!mounted) return;

      /* cleanup old listeners */
      Object.values(soUnsubs).forEach((unsub) => unsub());
      soUnsubs = {};
      if (unsubContracts) {
        unsubContracts();
        unsubContracts = null;
      }

      /* signed-out → reset state */
      if (!user) {
        setUid(null);
        setContracts([]);
        setLoading(false);
        setError("You must be signed in to see your contracts.");
        return;
      }

      /* signed-in */
      setUid(user.uid);
      setError(null);
      setLoading(true);

      const contractsCol = collection(db, "companies", user.uid, "contracts");
      unsubContracts = onSnapshot(
        contractsCol,
        (snap) => {
          const docs = snap.docs
            .map((d) => ({ ...(d.data() as ContractDoc), id: d.id }))
            .filter((c) => (c.status ?? "draft") !== "archived");


          /* reset top-level contract list */
          setContracts(
            docs.map((contract) => ({
              id: contract.id,
              title: contract.name || "Contract",
              SOs: [],
            }))
          );

          /* listen for SOs inside each contract */
          docs.forEach((contract) => {
            if (!soUnsubs[contract.id]) {
              const soCol = collection(
                db,
                "companies",
                user.uid,
                "contracts",
                contract.id,
                "so"
              );
              soUnsubs[contract.id] = onSnapshot(
                query(soCol, orderBy("soNumber")),
                (soSnap) => {
                  const soList = soSnap.docs
                    .filter((so) => so.get("soNumber"))
                    .map((so) => ({
                      id: so.id,
                      soNumber: so.get("soNumber"),
                    }));
                  
                  
                  setContracts((prev) =>
                    prev.map((c) =>
                      c.id === contract.id
                        ? {
                            ...c,
                            SOs: soList,
                          }
                        : c
                    )
                  );
                }
              );
            }
          });

          /* drop SO listeners for removed contracts */
          const currentIds = docs.map((c) => c.id);
          Object.keys(soUnsubs).forEach((cid) => {
            if (!currentIds.includes(cid)) {
              soUnsubs[cid]();
              delete soUnsubs[cid];
            }
          });

          setLoading(false);
        },
        (e) => {
          setError(e.message || "Failed to load contracts.");
          setLoading(false);
        }
      );
    });
    return () => {
      mounted = false;
      unsubAuth();
      if (unsubContracts) unsubContracts();
      Object.values(soUnsubs).forEach((unsub) => unsub());
    };
  }, []);

  /* ---------- “+ Add SO” ---------- */
  const handleAddSO = async (contractId: string) => {
    if (!uid || !addingSOName.trim()) {
      alert("Missing uid or SO number!");
      return;
    }
    try {
      const soCol = collection(
        db,
        "companies",
        uid,
        "contracts",
        contractId,
        "so"
      );
      const docRef = await addDoc(soCol, { soNumber: addingSOName.trim() });
      alert("SO added! id: " + docRef.id);
      setAddingSOName("");
      setAddingSOContract(null);
    } catch (err: any) {
      alert("Error adding SO: " + err.message);
      console.error("Add SO failed:", err);
    }
  };

  /* -------------------------------------------------------------------------- */
  return (
    <div className="border-t border-gray-200 select-none">
      {/* ---------- Section header ---------- */}
      <div
        className="px-3 py-2 flex items-center justify-between cursor-pointer"
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

      {/* ---------- Collapsible list ---------- */}
      {contractsExpanded && (
        <div className="ml-2 pl-2 py-3 relative">
          <div className="absolute left-2 top-2 bottom-2 w-px bg-gray-300 z-0" />

          {/* Loading / error states */}
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
              <Loader2 className="animate-spin w-4 h-4" /> Loading...
            </div>
          ) : error ? (
            <div className="text-xs text-red-400 py-2">{error}</div>
          ) : contracts.length === 0 ? (
            <div className="text-xs text-gray-400 italic py-2">
              No contracts
            </div>
          ) : (
            /* ---------- Contract cards ---------- */
            <div className="flex flex-col gap-4">
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="relative z-10"
                  style={{ marginLeft: "16px" }}
                >
                  {/* tiny connector */}
                  <div
                    className="absolute left-[-16px] top-4 w-[16px] h-px bg-gray-300"
                    style={{ zIndex: 1 }}
                  />

                  {/* ---------- Contract title line (draggable) ---------- */}
                  <div
                    className="pl-2 pb-1 pt-1 text-[15px] font-medium text-gray-800 cursor-move select-none flex items-center justify-between"
                    draggable
                    onDragStart={(e) => {
                      onContractDragStart({
                        contractId: contract.id,
                        title: contract.title,
                        soList: contract.SOs.map((s) => ({
                          id: s.id,
                          soNumber: s.soNumber,
                        })),
                      });
                      e.dataTransfer.effectAllowed = "move";
                      try {
                        e.dataTransfer.setData("text/plain", contract.title);
                        e.dataTransfer.setData(
                          "application/x-contract-id",
                          contract.id
                        );
                      } catch {}
                    }}
                    onDragEnd={() => onContractDragEnd?.()}
                  >
                    <span className="truncate flex-1">{contract.title}</span>
                    <Info
                      className="h-4 w-4 mr-4 text-gray-600 hover:text-black cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/contract-preview/${contract.id}`);
                      }}
                    />
                  </div>

                  {/* ---------- SO list ---------- */}
                  <div className="flex flex-col gap-2 ml-1 relative">
                    {/* vertical branch */}
                    <div className="absolute left-[-12px] top-[-14px] bottom-0 w-px bg-gray-300 z-0 " />
                    {contract.SOs.map((so) => (
                      <div
                        key={so.id}
                        className="relative flex items-center"
                        style={{ zIndex: 2 }}
                      >
                        {/* connector */}
                        <div
                          className="absolute left-[-12px] top-1/2 w-[16px] h-px bg-gray-300"
                          style={{ transform: "translateY(-50%)", zIndex: 1 }}
                        />
                        <div
                          className="flex-1 border border-gray-400 bg-white rounded-[8px] px-3 py-1 text-[14px] font-medium text-gray-800
                              text-center shadow-sm transition-colors duration-100 hover:bg-gray-50"
                          style={{
                            minWidth: "90px",
                            maxWidth: "150px",
                            boxShadow: "0 1px 4px 0 rgb(0 0 0 / 0.03)",
                            marginLeft: "4px",
                          }}
                        >
                          {so.soNumber || so.id}
                        </div>
                      </div>
                    ))}

                    {/* ---------- “+ Add SO” row ---------- */}
                    <div
                      className="relative flex items-center group"
                      style={{ zIndex: 2 }}
                    >
                      <div
                        className="absolute left-[-12px] top-1/2 w-[12px] h-px bg-gray-300"
                        style={{ transform: "translateY(-50%)", zIndex: 1 }}
                      />
                      {addingSOContract === contract.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleAddSO(contract.id);
                          }}
                          className="flex gap-2 items-center w-full"
                        >
                          <input
                            autoFocus
                            className="px-2 py-1 text-[13px] border border-gray-300 rounded-md w-24 outline-none"
                            value={addingSOName}
                            onChange={(e) => setAddingSOName(e.target.value)}
                            placeholder="SO number"
                          />
                          <button
                            type="submit"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            className="text-xs text-gray-600 ml-1"
                            onClick={() => setAddingSOContract(null)}
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <button
                          className="text-[14px] text-gray-700 rounded-md px-1 py-0.5 bg-transparent hover:underline"
                          onClick={() => {
                            setAddingSOContract(contract.id);
                            setAddingSOName("");
                          }}
                        >
                          +Add SO
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SidebarContracts;
