import React, { ReactNode, useEffect, useState } from "react";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../../lib/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import MachineCalendar from "../ResourceCalender";

const TAB_LABELS = [
  { key: "rightNow", label: "Right now" },
  { key: "info", label: "Information" },
  { key: "history", label: "History" },
  { key: "issues", label: "Issues" },
];

// Helper: Loading and error UI
const Loader = () => (
  <div className="flex justify-center items-center h-64 text-gray-500">
    Loading...
  </div>
);

const ErrorMsg = ({ msg }: { msg: string }) => (
  <div className="flex justify-center items-center h-64 text-red-500">
    {msg}
  </div>
);

const NotFound = () => (
  <div className="flex justify-center items-center h-64 text-gray-400">
    Machine not found.
  </div>
);

type MachineType = {
  name: ReactNode;
  id: string;
  mechanizationType: string;
  gasConsumption: number | string;
  licencePlate: string;
  mechanizationCategory: string;
  unavailableUntil?: string;
  status?: string;
  ownershipType?: string;
  // Any other machine-specific fields
};

type OccurrenceType = {
  date: string;
  contractName: string;
  // Any other contract/booking fields
};

const MachinePreview: React.FC = () => {
  const { category, id } = useParams();
  const navigate = useNavigate();
  const [machineInfo, setMachineInfo] = useState<MachineType | null>(null);
  const [occurrences, setOccurrences] = useState<OccurrenceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "rightNow" | "info" | "history" | "issues"
  >("info");
  const [subTab, setSubTab] = useState<"occurrence" | "insights">("occurrence");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setErr("You must be signed in to view this page.");
        setLoading(false);
        return;
      }
      if (!id || !category) {
        setErr("Invalid machine ID or category.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErr(null);

      try {
        const machineDocRef = doc(
          db,
          "companies",
          user.uid,
          "resources",
          "machines",
          category,
          id
        );

        const machineDocSnap = await getDoc(machineDocRef);
        const data = machineDocSnap.data();

        if (machineDocSnap.exists()) {
          setMachineInfo({
            id,
            mechanizationType: data?.category ?? "",
            gasConsumption: data?.averageConsumption ?? "",
            licencePlate: data?.licencePlate ?? "",
            mechanizationCategory: data?.mechanizationCategory ?? "",
            unavailableUntil: data?.unavailableUntil ?? "",
            status: data?.status ?? "",
            ownershipType: data?.ownershipType ?? "",
            name: data?.name ?? "",
          });
        } else {
          setMachineInfo(null);
          setOccurrences([]);
          setErr(null);
          setLoading(false);
          return;
        }

        // -- Fetch contracts (unchanged) --
        const contractsSnap = await getDocs(
          query(
            collection(db, "companies", user.uid, "contracts"),
            where("machineId", "==", id)
          )
        );
        const occList: OccurrenceType[] = [];
        contractsSnap.forEach((doc) => {
          const cdata = doc.data();
          if (cdata.startDate && cdata.endDate && cdata.contractName) {
            occList.push({
              date: `${formatDate(cdata.startDate)} - ${formatDate(
                cdata.endDate
              )}`,
              contractName: cdata.contractName,
            });
          }
        });

        setOccurrences(occList);
        setErr(null);
      } catch (e: any) {
        setErr(
          e?.message || "Failed to load machine data. Please try again later."
        );
        console.error("[ERROR]", e);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [id, category]);

  // Helper to format Firestore Timestamp or string date
  function formatDate(date: any): string {
    if (!date) return "";
    if (typeof date === "string") return date;
    // If Timestamp object (from Firestore)
    if (date.toDate) return date.toDate().toLocaleDateString();
    if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
    return "";
  }

  if (loading) return <Loader />;
  if (err) return <ErrorMsg msg={err} />;
  if (!machineInfo) return <NotFound />;

  // --- TABS Content ---
  function renderTabContent() {
    if (activeTab === "info") {
      return (
        <div className="flex items-start justify-center gap-10">
          {/* Left Section: Machine info + Occurrence/Insights tabs */}
          <div className="w-1/2 p-8 flex flex-col items-center ">
            {/* Machine Info */}
            <div className="flex flex-col gap-2 mb-6">
              <div className="flex gap-10">
                <div>
                  <span className="block text-sm text-gray-500">
                    Mechanization type
                  </span>
                  <span className="font-medium">
                    {machineInfo?.mechanizationType || "—"}
                  </span>
                </div>
                <div>
                  <span className="block text-sm text-gray-500">
                    Gas consumption
                  </span>
                  <span className="font-medium">
                    {machineInfo?.gasConsumption || "—"}
                  </span>
                </div>
              </div>
              <div className="flex gap-10">
                <div>
                  <span className="block text-sm text-gray-500">
                    Licence plate
                  </span>
                  <span className="font-medium">
                    {machineInfo?.licencePlate || "—"}
                  </span>
                </div>
                <div>
                  <span className="block text-sm text-gray-500">
                    Mechanization category
                  </span>
                  <span className="font-medium">
                    {machineInfo?.mechanizationCategory || "—"}
                  </span>
                </div>
              </div>
              <div className="flex gap-10">
                <div>
                  <span className="block text-sm text-gray-500">
                    Ownership type
                  </span>
                  <span className="font-medium capitalize">
                    {machineInfo?.ownershipType || "—"}
                  </span>
                </div>
              </div>
            </div>
            {/* Sub-tabs */}
            <div className="mb-2 flex bg-[#F7FAFC] rounded-xl p-1 gap-1 w-fit">
              <button
                className={`
                  px-5 py-2 text-base font-medium rounded-lg transition-all
                  ${
                    subTab === "occurrence"
                      ? "bg-white text-[#29364B] shadow"
                      : "bg-transparent text-[#42516D]"
                  }
                `}
                onClick={() => setSubTab("occurrence")}
                type="button"
              >
                Occurrence
              </button>
              <button
                className={`
                  px-5 py-2 text-base font-medium rounded-lg transition-all
                  ${
                    subTab === "insights"
                      ? "bg-white text-[#29364B] shadow"
                      : "bg-transparent text-[#42516D]"
                  }
                `}
                onClick={() => setSubTab("insights")}
                type="button"
              >
                Insights
              </button>
            </div>
            {/* Sub-tab Content */}
            {subTab === "occurrence" && (
              <div className="space-y-2 mt-4">
                {occurrences.length === 0 && (
                  <div className="text-gray-400 text-sm text-center">
                    No occurrences/contracts found for this machine.
                  </div>
                )}
                {occurrences.map((occ, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 px-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <div>
                      <div className="text-xs text-gray-500">{occ.date}</div>
                      <div className="font-medium text-sm">
                        {occ.contractName}
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 ml-3" />
                  </div>
                ))}
              </div>
            )}
            {subTab === "insights" && (
              <div className="mt-4 text-gray-400 text-sm text-center">
                No insights to show yet.
              </div>
            )}
          </div>
          {/* Right Section: Calendar */}
          <MachineCalendar
            occurrences={occurrences}
            highlightColorClass="bg-blue-500"
          />
        </div>
      );
    }
    // Other tabs (just placeholders, as per employee preview)
    if (activeTab === "rightNow") {
      return (
        <div className="text-gray-500 px-2 py-10">
          [Right now panel placeholder]
        </div>
      );
    }
    if (activeTab === "history") {
      return (
        <div className="text-gray-500 px-2 py-10">
          [Machine history placeholder]
        </div>
      );
    }
    if (activeTab === "issues") {
      return (
        <div className="text-gray-500 px-2 py-10">
          [Machine issues placeholder]
        </div>
      );
    }
  }

  return (
    <div className="flex items-center justify-center p-2">
      <div className="rounded-lg shadow-lg w-full max-w-5xl bg-white">
        {/* Header */}
        <div className="flex items-center px-6 py-4 border-b relative">
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
          <div className="flex-1 text-center">
            <h1 className="text-xl font-medium">
              Machinery - {machineInfo.name}
            </h1>
            <div className="text-sm text-gray-400">
              {machineInfo.ownershipType
                ? machineInfo.ownershipType[0].toUpperCase() +
                  machineInfo.ownershipType.slice(1)
                : "Machine"}
            </div>
          </div>
          <div className="absolute right-6 top-6 flex items-center gap-2">
            <span className="text-xs text-gray-500">
              Until {machineInfo.unavailableUntil || "—"}
            </span>
            <span className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full">
              {machineInfo.status || "Unavailable"}
            </span>
          </div>
        </div>

        {/* --- TOP TABS --- */}
        <div className="flex items-center justify-center pt-4 pb-6">
          <div className="flex rounded-xl bg-[#F7FAFC] p-1 gap-1">
            {TAB_LABELS.map((tab) => (
              <button
                key={tab.key}
                className={`px-5 py-1 rounded-lg text-sm font-medium transition-all
                  ${
                    activeTab === tab.key
                      ? "bg-white shadow text-blue-700"
                      : "text-gray-500 hover:bg-gray-100"
                  }
                `}
                onClick={() => setActiveTab(tab.key as any)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </div>
  );
};

export default MachinePreview;
