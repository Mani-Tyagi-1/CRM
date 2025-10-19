import React, { useEffect, useState } from "react";
import {
  ChevronLeft,
  ExternalLink,
  Loader2,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../../lib/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  DocumentData,
  QueryDocumentSnapshot,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type ContractDoc = {
  name: string;
  workType: string;
  agreementId?: string;
  contractId?: string;
  startDate?: any;
  endDate?: any;
};

type SODoc = {
  id: string;
  soNumber: string;
};

const ContractPreview: React.FC = () => {
  const { id: contractId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [uid, setUid] = useState<string | null>(null);
  const [contract, setContract] = useState<ContractDoc | null>(null);
  const [soList, setSOList] = useState<SODoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // NEW: Local edit state
  const [editMode, setEditMode] = useState(false);
  const [edit, setEdit] = useState<Partial<ContractDoc> | null>(null);
  const [saving, setSaving] = useState(false);

  // Listen for auth state to get UID
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user ? user.uid : null);
    });
    return () => unsub();
  }, []);

  // Fetch contract and SOs once UID and contractId are present
  useEffect(() => {
    if (!uid || !contractId) return;
    setLoading(true);

    const fetchContract = async () => {
      try {
        const contractRef = doc(db, "companies", uid, "contracts", contractId);
        const contractSnap = await getDoc(contractRef);
        if (!contractSnap.exists()) throw new Error("Contract not found");
        const c = contractSnap.data() as ContractDoc;
        setContract(c);
        setEdit(c);

        const soCol = collection(
          db,
          "companies",
          uid,
          "contracts",
          contractId,
          "so"
        );
        const soSnap = await getDocs(soCol);
        const soArr: SODoc[] = [];
        soSnap.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          soArr.push({ id: doc.id, soNumber: doc.get("soNumber") || doc.id });
        });
        setSOList(soArr);
        setErr(null);
      } catch (e: any) {
        setErr(e.message || "Failed to load contract");
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, [uid, contractId]);

  // Handle input change
  const handleChange = (field: keyof ContractDoc, value: any) => {
    setEdit((prev) => ({ ...(prev ?? {}), [field]: value }));
  };

  // Save changes
  const handleSave = async () => {
    if (!uid || !contractId || !edit) return;
    setSaving(true);
    try {
      const contractRef = doc(db, "companies", uid, "contracts", contractId);
      // Handle Firestore Timestamp for start/end dates (convert back to Date if needed)
      let toUpdate: any = { ...edit };
      // Convert startDate/endDate to Date if they are strings
      // Ensure startDate and endDate are 'YYYY-MM-DD' strings
      if (typeof toUpdate.startDate === "string") {
        toUpdate.startDate = toUpdate.startDate.slice(0, 10);
      }
      if (typeof toUpdate.endDate === "string") {
        toUpdate.endDate = toUpdate.endDate.slice(0, 10);
      }
      await updateDoc(contractRef, toUpdate);

      setContract(edit as ContractDoc);
      setEditMode(false);
      setErr(null);
    } catch (e: any) {
      setErr(e.message || "Failed to save contract");
    }
    setSaving(false);
  };

  // Cancel edit
  const handleCancel = () => {
    setEdit(contract); // reset changes
    setEditMode(false);
  };

  if (!uid) {
    return (
      <div className="flex items-center justify-center h-80 text-gray-500">
        <Loader2 className="animate-spin w-6 h-6 mr-2" />
        Checking authentication...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80 text-gray-500">
        <Loader2 className="animate-spin w-6 h-6 mr-2" />
        Loading contract...
      </div>
    );
  }
  if (err || !contract) {
    return (
      <div className="flex items-center justify-center h-80 text-red-500">
        {err || "Contract not found."}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-1 ">
      {/* Header */}
      <div className="flex items-center px-6 py-2 border-b border-gray-200 w-full">
        {/* Left: Back button + link */}
        <div className="flex items-center min-w-[160px]">
          <ChevronLeft
            className="w-5 h-5 text-gray-600 mr-3 cursor-pointer"
            onClick={() => navigate("/calender")}
          />
          <span
            className="text-gray-600 text-sm cursor-pointer"
            onClick={() => navigate("/calender")}
          >
            Back to the calendar
          </span>
        </div>
        {/* Center: Heading */}
        <div className="flex-1 text-center">
          {!editMode ? (
            <h1 className="text-xl font-medium">{contract.name}</h1>
          ) : (
            <input
              className="text-xl font-medium border-b border-gray-300 focus:outline-none"
              value={edit?.name ?? ""}
              onChange={(e) => handleChange("name", e.target.value)}
              disabled={saving}
            />
          )}
        </div>
        {/* Right: Edit/Save */}
        <div className="min-w-[160px] flex justify-end gap-2">
          {!editMode ? (
            <button
              className="flex items-center gap-1 text-blue-600 hover:underline"
              onClick={() => setEditMode(true)}
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <>
              <button
                className="flex items-center gap-1 text-green-700 hover:underline"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                className="flex items-center gap-1 text-red-600 hover:underline"
                onClick={handleCancel}
                disabled={saving}
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg w-full max-w-3xl">
        {/* Details */}
        <div className="flex flex-col items-center py-20">
          <div className="flex gap-24 mb-8">
            <div>
              <div className="text-sm text-gray-500 mb-1">Offer number</div>
              {!editMode ? (
                <div className="font-medium">{contract.agreementId || "—"}</div>
              ) : (
                <input
                  className="border rounded px-2 py-1"
                  value={edit?.agreementId ?? ""}
                  onChange={(e) => handleChange("agreementId", e.target.value)}
                  disabled={saving}
                />
              )}
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Type of work</div>
              {!editMode ? (
                <div className="font-medium">{contract.workType}</div>
              ) : (
                <input
                  className="border rounded px-2 py-1"
                  value={edit?.workType ?? ""}
                  onChange={(e) => handleChange("workType", e.target.value)}
                  disabled={saving}
                />
              )}
            </div>
          </div>
          <div className="flex gap-24 mb-8">
            <div>
              <div className="text-sm text-gray-500 mb-1">Contract number</div>
              {!editMode ? (
                <div className="font-medium">{contract.contractId || "—"}</div>
              ) : (
                <input
                  className="border rounded px-2 py-1"
                  value={edit?.contractId ?? ""}
                  onChange={(e) => handleChange("contractId", e.target.value)}
                  disabled={saving}
                />
              )}
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Start date</div>
              {!editMode ? (
                <div className="font-medium">
                  {contract.startDate
                    ? new Date(
                        contract.startDate.seconds
                          ? contract.startDate.seconds * 1000
                          : contract.startDate
                      ).toLocaleDateString()
                    : "—"}
                </div>
              ) : (
                <input
                  type="date"
                  className="border rounded px-2 py-1"
                  value={edit?.startDate || ""}
                  onChange={(e) => handleChange("startDate", e.target.value)}
                  disabled={saving}
                />
              )}
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">End date</div>
              {!editMode ? (
                <div className="font-medium">
                  {contract.endDate
                    ? new Date(
                        contract.endDate.seconds
                          ? contract.endDate.seconds * 1000
                          : contract.endDate
                      ).toLocaleDateString()
                    : "—"}
                </div>
              ) : (
                <input
                  type="date"
                  className="border rounded px-2 py-1"
                  value={edit?.endDate || ""}
                  onChange={(e) => handleChange("endDate", e.target.value)}
                  disabled={saving}
                />
              )}
            </div>
          </div>

          {/* SOs List */}
          <div className="w-full max-w-md flex flex-col items-center mt-6">
            <div className="flex mb-6">
              <div className="flex bg-[#f5f8fa] rounded-2xl px-4 py-1">
                <span className="px-4 py-2 rounded-xl font-medium text-[14px] bg-white text-[#212a39]">
                  SO
                </span>
              </div>
            </div>

            <div className="w-full">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {soList.length === 0 ? (
                  <div className="w-full py-10 text-center text-gray-400 text-sm">
                    No SOs found.
                  </div>
                ) : (
                  soList.map((so, idx) => (
                    <div
                      key={so.id}
                      className={`flex items-center justify-between px-5 py-3 text-gray-900 text-[15px] font-medium 
                        ${
                          idx !== soList.length - 1
                            ? "border-b border-gray-200"
                            : ""
                        }
                        hover:bg-gray-50 cursor-pointer`}
                    >
                      <div>{so.soNumber}</div>
                      <ExternalLink className="w-4 h-4 text-gray-400 ml-3" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractPreview;
