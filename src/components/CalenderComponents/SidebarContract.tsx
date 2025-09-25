import React, { useEffect, useState } from "react";
import { FileText, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  addDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

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

const SidebarContracts: React.FC = () => {
  const [contracts, setContracts] = useState<ContractWithSOs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractsExpanded, setContractsExpanded] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [addingSOContract, setAddingSOContract] = useState<string | null>(null);
    const [addingSOName, setAddingSOName] = useState("");
    

    useEffect(() => {
      console.log("Current auth state:", auth.currentUser);
    }, []);


  useEffect(() => {
    let unsubContracts: null | (() => void) = null;
    let soUnsubs: Record<string, () => void> = {};
    let mounted = true;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!mounted) return; // <-- guard
      Object.values(soUnsubs).forEach((unsub) => unsub());
      soUnsubs = {};

      if (unsubContracts) {
        unsubContracts();
        unsubContracts = null;
      }
      if (!user) {
        setUid(null);
        setContracts([]);
        setLoading(false);
        setError("You must be signed in to see your contracts.");
        return;
      }

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

          // Reset contracts state to only those found
          setContracts(
            docs.map((contract) => ({
              id: contract.id,
              title: contract.name || "Contract",
              SOs: [],
            }))
          );

          // Listen for SOs under each contract
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
                  // For each contract, update only its SOs
                  setContracts((prev) =>
                    prev.map((c) =>
                      c.id === contract.id
                        ? {
                            ...c,
                            SOs: soSnap.docs
                              .filter((so) => so.get("soNumber")) // Only show SOs with a name
                              .map((so) => ({
                                id: so.id,
                                soNumber: so.get("soNumber"),
                              })),
                          }
                        : c
                    )
                  );
                }
              );
            }
          });

          // Remove SO listeners for contracts no longer present
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

  // Add SO function (to the /so subcollection, field soNumber)
  const handleAddSO = async (contractId: string) => {
    if (!uid || !addingSOName.trim()) {
      alert("Missing uid or SO name!");
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



  return (
    <div className="border-t border-gray-200 select-none">
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
      {contractsExpanded && (
        <div className="ml-2 pl-2 py-3 relative">
          <div className="absolute left-2 top-2 bottom-2 w-px bg-gray-300 z-0" />
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
            <div className="flex flex-col gap-4">
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="relative z-10"
                  style={{ marginLeft: "16px" }}
                >
                  {/* Connector */}
                  <div
                    className="absolute left-[-16px] top-4 w-[16px] h-px bg-gray-300"
                    style={{ zIndex: 1 }}
                  />
                  {/* Contract Name (heading, not inside card) */}
                  <div className="pl-2 pb-1 pt-1 text-[15px] font-medium text-gray-800">
                    {contract.title}
                  </div>
                  {/* SO List */}
                  <div className="flex flex-col gap-2 ml-6 relative">
                    {/* vertical branch */}
                    <div className="absolute left-[-12px] top-0 bottom-0 w-px bg-gray-300 z-0" />
                    {contract.SOs.length > 0 &&
                      contract.SOs.map((so) => (
                        <div
                          key={so.id}
                          className="relative flex items-center"
                          style={{ zIndex: 2 }}
                        >
                          {/* horizontal connector to branch */}
                          <div
                            className="absolute left-[-12px] top-1/2 w-[16px] h-px bg-gray-300"
                            style={{ transform: "translateY(-50%)", zIndex: 1 }}
                          />
                          <a
                            href={`/contract/${contract.id}/so/${so.id}`}
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
                          </a>
                        </div>
                      ))}
                    {/* + Add SO Button/Input */}
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
                            // REMOVE onBlur, so the form doesn't disappear before you hit enter
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
