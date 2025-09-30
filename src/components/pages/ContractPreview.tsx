import React, { useEffect, useState } from "react";
import { ChevronLeft, ExternalLink, Loader2 } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../../lib/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  DocumentData,
  QueryDocumentSnapshot,
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
        setContract(contractSnap.data() as ContractDoc);

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
          <h1 className="text-xl font-medium">{contract.name}</h1>
        </div>
        {/* Right: Ghost div for centering */}
        <div className="min-w-[160px]" />
      </div>

      <div className="rounded-lg w-full max-w-3xl">
        {/* Details */}
        <div className="flex flex-col items-center py-20">
          <div className="flex gap-24 mb-8">
            <div>
              <div className="text-sm text-gray-500 mb-1">Offer number</div>
              <div className="font-medium">{contract.agreementId || "—"}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Type of work</div>
              <div className="font-medium">{contract.workType}</div>
            </div>
          </div>
          <div className="flex gap-24 mb-8">
            <div>
              <div className="text-sm text-gray-500 mb-1">Contract number</div>
              <div className="font-medium">{contract.contractId || "—"}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Start date</div>
              <div className="font-medium">
                {contract.startDate
                  ? new Date(
                      contract.startDate.seconds * 1000
                    ).toLocaleDateString()
                  : "—"}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">End date</div>
              <div className="font-medium">
                {contract.endDate
                  ? new Date(
                      contract.endDate.seconds * 1000
                    ).toLocaleDateString()
                  : "—"}
              </div>
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
                      {/* Placeholder ExternalLink icon */}
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
