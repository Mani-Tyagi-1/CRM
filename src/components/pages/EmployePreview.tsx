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
  setDoc, // <-- make sure this is imported!
} from "firebase/firestore";
import EmployeCalendar from "../ResourceCalender"; // or whatever your calendar component is

const TAB_LABELS = [
  { key: "rightNow", label: "Right now" },
  { key: "info", label: "Information" },
  { key: "history", label: "History" },
  { key: "issues", label: "Issues" },
];

type category = {
  alias: string;
  birthDate: string;
  payment: string;
  currency: string;
  workingRelation: string;
  typeOfStay: string;
  stayingTill: string;
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
  const [employeeInfo, setEmployeeInfo] = useState<category | null>(null);
  const [occurrences, setOccurrences] = useState<OccurrenceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<"occurrence" | "insights">("occurrence");
  const [activeTab, setActiveTab] = useState<
    "rightNow" | "info" | "history" | "issues"
  >("info");

  // ----- EDIT STATE -----
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editInfo, setEditInfo] = useState<category | null>(null);

  // On load, set editInfo as a copy of employeeInfo
  useEffect(() => {
    setEditInfo(employeeInfo);
  }, [employeeInfo]);

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

        if (employeeDocSnap.exists()) {
          const info: category = {
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
            payment: data?.payment?.toString() ?? "0", // Change this line
            currency: data?.currency ?? "Czk",
            workingRelation: data?.workingRelation ?? "",
            typeOfStay: data?.typeOfStay ?? "",
            stayingTill: data?.stayingTill ?? "",
          };
          setEmployeeInfo(info);
        } else {
          setEmployeeInfo(null);
          setOccurrences([]);
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

  // FORMAT FOR CONTRACT DATES
  function formatDate(date: any): string {
    // Accepts either a string or Firestore Timestamp or Date
    if (!date) return "";
    if (typeof date === "string")
      return date.length === 10 ? date : new Date(date).toLocaleDateString();
    if (date.toDate) {
      const d = date.toDate();
      return d.toISOString().slice(0, 10);
    }
    if (date.seconds) {
      return new Date(date.seconds * 1000).toISOString().slice(0, 10);
    }
    return "";
  }

  // ----- HANDLE SAVE -----
  const handleSave = async () => {
    if (!editInfo || !id || !category) return;
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user");

      const employeeDocRef = doc(
        db,
        "companies",
        user.uid,
        "resources",
        "employees",
        category,
        id
      );

      // Ensure dates are in YYYY-MM-DD (for "birthDate" and "stayingTill")
      const toUpdate: any = {
        ...editInfo,
        birthDate: editInfo.birthDate?.slice(0, 10) || "",
        stayingTill: editInfo.stayingTill?.slice(0, 10) || "",
        payment: editInfo.payment, 
      };

      await setDoc(employeeDocRef, toUpdate, { merge: true });

      setEmployeeInfo(editInfo); // update local display
      setEditMode(false);
    } catch (e: any) {
      alert("Failed to save. " + (e?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;
  if (err) return <ErrorMsg msg={err} />;
  if (!employeeInfo) return <NotFound />;

  // --- TABS Content ---
  function renderTabContent() {
    if (activeTab === "info") {
      return (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-8">
          {/* Name */}
          <div>
            <label className="block text-sm text-black ">Name</label>
            <input
              className={`w-full px-2 py-1 text-sm font-medium 
      ${editMode ? "border rounded-lg" : ""} `}
              value={editInfo?.name as string}
              readOnly={!editMode}
              onChange={(e) =>
                setEditInfo((prev) =>
                  prev ? { ...prev, name: e.target.value } : prev
                )
              }
            />
          </div>
          {/* Surname */}
          <div>
            <label className="block text-sm text-black ">Surname</label>
            <input
              className={`w-full px-2 py-1 text-sm font-medium 
      ${editMode ? "border rounded-lg" : ""}`}
              value={editInfo?.surname || ""}
              readOnly={!editMode}
              onChange={(e) =>
                setEditInfo((prev) =>
                  prev ? { ...prev, surname: e.target.value } : prev
                )
              }
            />
          </div>
          {/* Alias */}
          <div>
            <label className="block text-sm text-black ">Alias</label>
            <input
              className={`w-full px-2 py-1 text-sm font-medium 
      ${editMode ? "border rounded-lg" : ""}`}
              value={editInfo?.alias || ""}
              readOnly={!editMode}
              onChange={(e) =>
                setEditInfo((prev) =>
                  prev ? { ...prev, alias: e.target.value } : prev
                )
              }
            />
          </div>
          {/* Birth date */}
          <div>
            <label className="block text-sm text-black ">Birth date</label>
            <div className="flex items-center">
              <input
                type="date"
                className={`w-auto px-2 py-1 text-sm font-medium 
      ${editMode ? "border rounded-lg" : ""}`}
                value={
                  editInfo?.birthDate ? formatDate(editInfo.birthDate) : ""
                }
                readOnly={!editMode}
                onChange={(e) =>
                  setEditInfo((prev) =>
                    prev ? { ...prev, birthDate: e.target.value } : prev
                  )
                }
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
            <label className="block text-sm text-black ">Employee type</label>
            <input
              className={`w-full px-2 py-1 text-sm font-medium 
      ${editMode ? "border rounded-lg" : ""}`}
              value={editInfo?.category || ""}
              readOnly={!editMode}
              onChange={(e) =>
                setEditInfo((prev) =>
                  prev ? { ...prev, category: e.target.value } : prev
                )
              }
            />
          </div>
          {/* Hourly rate + Currency */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm text-black ">Hourly rate</label>
              <input
                type="number"
                className={`w-full px-2 py-1 text-sm font-medium 
      ${editMode ? "border rounded-lg" : ""}`}
                value={editInfo?.payment || ""}
                readOnly={!editMode}
                onChange={(e) =>
                  setEditInfo((prev) =>
                    prev ? { ...prev, hourlyRate: e.target.value } : prev
                  )
                }
              />
            </div>
            <div className="w-[80px]">
              <label className="block text-sm text-black ">&nbsp;</label>
              <input
                className={`w-full px-2 py-1 text-sm font-medium 
      ${editMode ? "border rounded-lg" : ""}`}
                value={editInfo?.currency || ""}
                readOnly={!editMode}
                onChange={(e) =>
                  setEditInfo((prev) =>
                    prev ? { ...prev, currency: e.target.value } : prev
                  )
                }
              />
            </div>
          </div>
          {/* Work relation */}
          <div>
            <label className="block text-sm text-black ">Work relation</label>
            {editMode ? (
              <select
                className={`w-full px-2 py-1 text-sm font-medium 
      ${editMode ? "border rounded-lg" : ""}`}
                value={editInfo?.workingRelation || ""}
                onChange={(e) =>
                  setEditInfo((prev) =>
                    prev ? { ...prev, workingRelation: e.target.value } : prev
                  )
                }
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="book-off-time">Book-off-time</option>
              </select>
            ) : (
              <input
                className={`w-full px-2 py-1 text-sm font-medium 
      ${editMode ? "border rounded-lg" : ""}`}
                value={editInfo?.workingRelation || ""}
                readOnly
              />
            )}
          </div>

          {/* Type of stay */}
          <div>
            <label className="block text-sm text-black ">Type of stay</label>
            <input
              className={`w-full px-2 py-1 text-sm font-medium 
      ${editMode ? "border rounded-lg" : ""}`}
              value={editInfo?.typeOfStay || ""}
              readOnly={!editMode}
              onChange={(e) =>
                setEditInfo((prev) =>
                  prev ? { ...prev, typeOfStay: e.target.value } : prev
                )
              }
            />
          </div>
          {/* Stay expiration */}
          <div>
            <label className="block text-sm text-black ">Stay expiration</label>
            <div className="flex items-center">
              <input
                type="date"
                className={`w-full px-2 py-1 text-sm font-medium 
      ${editMode ? "border rounded-lg" : ""}`}
                value={
                  editInfo?.stayingTill ? formatDate(editInfo.stayingTill) : ""
                }
                readOnly={!editMode}
                onChange={(e) =>
                  setEditInfo((prev) =>
                    prev ? { ...prev, stayingTill: e.target.value } : prev
                  )
                }
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
              Until {employeeInfo.stayingTill || "—"}
            </span>
            <span className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full">
              {employeeInfo.status || "Unavailable"}
            </span>
            {/* Edit/Save/Cancel Buttons */}
            {activeTab === "info" && !editMode && (
              <button
                className="ml-4 px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                onClick={() => setEditMode(true)}
              >
                Edit
              </button>
            )}
            {activeTab === "info" && editMode && (
              <>
                <button
                  className="ml-4 px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-semibold"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  className="ml-2 px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
                  onClick={() => {
                    setEditMode(false);
                    setEditInfo(employeeInfo);
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
              </>
            )}
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
              stayingTill={editInfo?.stayingTill ?? null} // Convert undefined to null
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeePreview;
