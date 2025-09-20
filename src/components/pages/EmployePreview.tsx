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
import EmployeCalendar from "../ResourceCalender"; // or whatever your calendar component is

const TAB_LABELS = [
  { key: "rightNow", label: "Right now" },
  { key: "info", label: "Information" },
  { key: "history", label: "History" },
  { key: "issues", label: "Issues" },
];

type EmployeeType = {
  alias: string;
  birthDate: string;
  employeeType: string;
  hourlyRate: string;
  currency: string;
  workRelation: string;
  typeOfStay: string;
  stayExpiration: string;
  id: string;
  name: ReactNode;
  surname?: string;
  category?: string;
  position?: string;
  email?: string;
  phone?: string;
  unavailableUntil?: string;
  status?: string;
};

type OccurrenceType = {
  date: string;
  contractName: string;
};

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
    Employee not found.
  </div>
);

const EmployeePreview: React.FC = () => {
  const { category, id } = useParams();
  const navigate = useNavigate();
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeType | null>(null);
  const [occurrences, setOccurrences] = useState<OccurrenceType[]>([]);
  const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [subTab, setSubTab] = useState<"occurrence" | "insights">(
      "occurrence"
    );

  const [activeTab, setActiveTab] = useState<
    "rightNow" | "info" | "history" | "issues"
  >("info");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setErr("You must be signed in to view this page.");
        setLoading(false);
        return;
      }
      if (!id) {
        setErr("Invalid employee ID.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErr(null);

      try {
        if (!category) {
          throw new Error("Category is required");
        }
        const employeeDocRef = doc(
          db,
          "companies",
          user.uid,
          "resources",
          "employees",
          category,
          id
        );
        const employeeDocSnap = await getDoc(employeeDocRef);

          const data = employeeDocSnap.data();
          
          console.log("Data: ", data);

        if (employeeDocSnap.exists()) {
          const info: EmployeeType = {
            id,
            name: data?.name ?? "",
            surname: data?.surname ?? "",
            category: data?.category ?? "",
            position: data?.position ?? "",
            email: data?.email ?? "",
            phone: data?.phone ?? "",
            unavailableUntil: data?.unavailableUntil ?? "",
            status: data?.status ?? "",
            alias: data?.alias ?? "",
            birthDate: data?.birthDate ?? "",
            employeeType: data?.typeOfStay ?? "",
            hourlyRate: data?.payment?.toString() ?? "0",
            currency: data?.currency ?? "Czk",
            workRelation: data?.workingRelation ?? "",
            typeOfStay: data?.typeOfStay ?? "",
            stayExpiration: data?.stayingTill ?? "",
          };
          setEmployeeInfo(info);
        } else {
          setEmployeeInfo(null);
          setOccurrences([data?.stayingTill ?? ""]);
          setErr(null);
          setLoading(false);
          return;
        }

        // -- Fetch contracts (if you want to show contracts associated with this employee) --
        const contractsSnap = await getDocs(
          query(
            collection(db, "companies", user.uid, "contracts"),
            where("employeeId", "==", id)
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
          e?.message || "Failed to load employee data. Please try again later."
        );
        console.error("[ERROR]", e);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [id, category]);

  function formatDate(date: any): string {
    if (!date) return "";
    if (typeof date === "string") return date;
    if (date.toDate) return date.toDate().toLocaleDateString();
    if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
    return "";
  }

  if (loading) return <Loader />;
  if (err) return <ErrorMsg msg={err} />;
  if (!employeeInfo) return <NotFound />;

  // --- TABS Content ---
  function renderTabContent() {
    if (activeTab === "info") {
      return (
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-8">
          {/* Name */}
          <div>
            <label className="block text-sm text-black mb-1">Name</label>
            <input
              className="border rounded-lg w-full px-2 py-1 text-sm font-medium"
              value={employeeInfo!.name as string}
              readOnly
            />
          </div>
          {/* Surname */}
          <div>
            <label className="block text-sm text-black mb-1">Surname</label>
            <input
              className="border rounded-lg w-full px-2 py-1 text-sm font-medium"
              value={employeeInfo!.surname as string}
              readOnly
            />
          </div>
          {/* Alias */}
          <div>
            <label className="block text-sm text-black mb-1">Alias</label>
            <input
              className="border rounded-lg w-full px-2 py-1 text-sm font-medium"
              value={employeeInfo!.alias as string}
              readOnly
            />
          </div>
          {/* Birth date */}
          <div>
            <label className="block text-sm text-black mb-1">Birth date</label>
            <div className="flex items-center">
              <input
                className="border rounded-lg w-full px-2 py-1 text-sm font-medium"
                value={employeeInfo!.birthDate as string}
                readOnly
              />
              <span className="ml-2">
                <svg width={20} height={20} fill="none" stroke="black">
                  <rect
                    x="3"
                    y="7"
                    width="14"
                    height="10"
                    rx="2"
                    strokeWidth="1.2"
                  />
                  <path d="M3 9h14M7 3v4m6-4v4" strokeWidth="1.2" />
                </svg>
              </span>
            </div>
          </div>
          {/* Employee type */}
          <div>
            <label className="block text-sm text-black mb-1">
              Employee type
            </label>
            <input
              className="border rounded-lg w-full px-2 py-1 text-sm font-medium bg-white"
              value={employeeInfo!.employeeType as string}
              readOnly
            />
          </div>
          {/* Hourly rate + Currency */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm text-black mb-1">
                Hourly rate
              </label>
              <input
                className="border rounded-lg w-full px-2 py-1 text-sm font-medium"
                value={employeeInfo!.hourlyRate as string}
                readOnly
              />
            </div>
            <div className="w-[80px]">
              <label className="block text-sm text-black mb-1">&nbsp;</label>
              <input
                className="border rounded-lg w-full px-2 py-1 text-sm font-medium bg-white"
                value={employeeInfo!.currency as string}
                readOnly
              />
            </div>
          </div>
          {/* Work relation */}
          <div>
            <label className="block text-sm text-black mb-1">
              Work relation
            </label>
            <input
              className="border rounded-lg w-full px-2 py-1 text-sm font-medium bg-white"
              value={employeeInfo!.workRelation as string}
              readOnly
            />
          </div>
          {/* Type of stay */}
          <div>
            <label className="block text-sm text-black mb-1">
              Type of stay
            </label>
            <input
              className="border rounded-lg w-full px-2 py-1 text-sm font-medium bg-white"
              value={employeeInfo!.typeOfStay as string}
              readOnly
            />
          </div>
          {/* Stay expiration */}
          <div>
            <label className="block text-sm text-black mb-1">
              Stay expiration
            </label>
            <div className="flex items-center">
              <input
                className="border rounded-lg w-full px-2 py-1 text-sm font-bold"
                value={employeeInfo!.stayExpiration as string}
                readOnly
              />
              <span className="ml-2">
                <svg width={20} height={20} fill="none" stroke="black">
                  <rect
                    x="3"
                    y="7"
                    width="14"
                    height="10"
                    rx="2"
                    strokeWidth="1.2"
                  />
                  <path d="M3 9h14M7 3v4m6-4v4" strokeWidth="1.2" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      );
    }
    // Other tabs (just placeholders, as per screenshot)
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
          [Employee history placeholder]
        </div>
      );
    }
    if (activeTab === "issues") {
      return (
        <div className="text-gray-500 px-2 py-10">
          [Employee issues placeholder]
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
              Employee - {employeeInfo.name} {employeeInfo.surname}
            </h1>
            <div className="text-sm text-gray-400">
              {employeeInfo.position || "Employee"}
            </div>
          </div>
          <div className="absolute right-6 top-6 flex items-center gap-2">
            <span className="text-xs text-gray-500">
              Until {employeeInfo.unavailableUntil || "—"}
            </span>
            <span className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full">
              {employeeInfo.status || "Unavailable"}
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

        <div className="flex items-start justify-center gap-18">
          {/* Left Section: Tab content or Employee Info */}
          <div className="w-[420px] px-2 pt-2 flex flex-col items-center ">
            {renderTabContent()}
            {/* Occurrence & Insights subtabs and occurrence list only for info tab */}
            {activeTab === "info" && (
              <>
                {/* Sub-tabs UI */}
                <div className="mb-4 flex items-center justify-start">
                  <div className="flex bg-[#F7FAFC] rounded-xl p-1 gap-1 w-fit">
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
                      Occurence
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
                </div>

                {/* Sub-tab content */}
                {subTab === "occurrence" && (
                  <div className="space-y-2 mt-4">
                    {occurrences.length === 0 && (
                      <div className="text-gray-400 text-sm text-center">
                        No occurrences/contracts found for this employee.
                      </div>
                    )}
                    {occurrences.map((occ, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 px-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <div>
                          <div className="text-xs text-gray-500">
                            {occ.date}
                          </div>
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
              </>
            )}
          </div>

          {/* Calendar: only on info tab! */}
          {activeTab === "info" && (
            <EmployeCalendar
              occurrences={occurrences}
              highlightColorClass="bg-amber-500"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeePreview;
