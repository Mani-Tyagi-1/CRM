// src/pages/ContractForm.tsx
import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { createContractWithSoAndResource } from "../../services/contract"; 
import {
  doc,
  onSnapshot,
} from "firebase/firestore";

type CompanyDoc = {
  companyName: string;
  adminEmail: string;
};


const ContractForm: React.FC = () => {
  // ---- auth + company ----
  const [uid, setUid] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyDoc | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdContractId, setCreatedContractId] = useState<string | null>(
    null
  );

  // ---- form state ----
  const [contractName, setContractName] = useState("");
  const [soName, setSoName] = useState("");
  const [typeOfWork, setTypeOfWork] = useState("");
  const [offerNumber, setOfferNumber] = useState("");
  const [contractNumber, setContractNumber] = useState("");

  // separate picked dates
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // calendars: independent month views
  const [startCalCurrent, setStartCalCurrent] = useState(new Date(2022, 0, 1)); // Start at Jan 2022
  const [endCalCurrent, setEndCalCurrent] = useState(new Date(2022, 0, 1));

  const [showContractDetails, setShowContractDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<"Resources" | "Insights">(
    "Resources"
  );

  // ---- consts ----
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // ---- auth + company listener ----
  useEffect(() => {
    let unsubCompany: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubCompany) {
        unsubCompany();
        unsubCompany = null;
      }
      if (!user) {
        setUid(null);
        setCompany(null);
        setErr("You must be signed in to create a contract.");
        return;
      }
      setUid(user.uid);
      setErr(null);

      const ref = doc(db, "companies", user.uid);
      unsubCompany = onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as CompanyDoc;
            setCompany({
              companyName: data.companyName ?? "My Company",
              adminEmail: data.adminEmail ?? "",
            });
          } else {
            setCompany(null);
          }
        },
        (e) => setErr(e.message || "Failed to load company.")
      );
    });

    return () => {
      unsubAuth();
      if (unsubCompany) unsubCompany();
    };
  }, []);

  // ---- calendar helpers ----
  const generateCalendarDays = (date: Date, selected: Date | null) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();

    const days: {
      day: number;
      isCurrentMonth: boolean;
      isSelected: boolean;
      fullDate: Date;
    }[] = [];

    // prev month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const fullDate = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        isSelected: false,
        fullDate,
      });
    }
    // current month
    for (let day = 1; day <= daysInMonth; day++) {
      const fullDate = new Date(year, month, day);
      const isSelected =
        !!selected &&
        selected.getDate() === day &&
        selected.getMonth() === month &&
        selected.getFullYear() === year;

      days.push({
        day,
        isCurrentMonth: true,
        isSelected,
        fullDate,
      });
    }
    // next month padding to 6 rows (42 cells)
    const remainingCells = 42 - days.length;
    for (let day = 1; day <= remainingCells; day++) {
      const fullDate = new Date(year, month + 1, day);
      days.push({
        day,
        isCurrentMonth: false,
        isSelected: false,
        fullDate,
      });
    }
    return days;
  };

  const handleStartDateClick = (
    _day: number,
    isCurrentMonth: boolean,
    fullDate: Date
  ) => {
    if (!isCurrentMonth) return;
    setStartDate(fullDate);

    // auto-adjust end date if it's before the newly selected start
    if (endDate && fullDate && endDate < fullDate) {
      setEndDate(fullDate);
    }
  };

  const handleEndDateClick = (
    _day: number,
    isCurrentMonth: boolean,
    fullDate: Date
  ) => {
    if (!isCurrentMonth) return;
    setEndDate(fullDate);
  };

  const navigateStartMonth = (direction: number) => {
    setStartCalCurrent((prev) => {
      const d = new Date(prev);
      d.setMonth(prev.getMonth() + direction);
      return d;
    });
  };

  const navigateEndMonth = (direction: number) => {
    setEndCalCurrent((prev) => {
      const d = new Date(prev);
      d.setMonth(prev.getMonth() + direction);
      return d;
    });
  };

  // dummy resources UI (leave as-is or load from Firestore later)
  const resources = useMemo(
    () => [
      { date: "14.3.2025 - 19.3.2025", title: "Heavy machine", person: "" },
      { date: "1.1.2025 - 3.1.2025", title: "", person: "John Doe" },
      { date: "2.2.2025 - 3.2.2025", title: "", person: "John Doe" },
      { date: "3.3.2025 - 19.3.2025", title: "", person: "John Doe" },
      { date: "1.4.2025 - 3.4.2025", title: "", person: "John Doe" },
    ],
    []
  );

  // ---- create contract (Firestore) ----
  const handleCreateContract = async () => {
    setErr(null);

    if (!uid) {
      setErr("You must be signed in.");
      return;
    }
    if (!contractName || !soName || !typeOfWork) {
      setErr("Please fill all required fields (*).");
      return;
    }
    if (!startDate || !endDate) {
      setErr("Please select both a start date and an end date.");
      return;
    }

    setSaving(true);
    try {
      const { contractId } = await createContractWithSoAndResource(
        {
          name: contractName,
          workType: typeOfWork,
          soNumber: soName, // maps to your SO schema
          contractId: contractNumber || undefined,
          agreementId: offerNumber || undefined,
          startDate: startDate!,
          endDate: endDate!,
        },
        { uid } // pass uid or let the service read auth.currentUser
      );

      setCreatedContractId(contractId);
      setShowContractDetails(true);
    } catch (e: any) {
      setErr(e?.message || "Failed to create contract.");
    } finally {
      setSaving(false);
    }
  };


  // ====== DETAILS VIEW ======
  if (showContractDetails) {
    return (
      <div className="flex items-center justify-center p-2">
        <div className=" rounded-lg shadow-lg w-full max-w-5xl">
          {/* Header */}
          <div className="flex items-center px-6 py-4 border-b">
            <ChevronLeft className="w-5 h-5 text-gray-600 mr-3" />
            <a href="/calender">
              <span className="text-gray-600 text-sm cursor-pointer">
                Back to the calendar
              </span>
            </a>
            <div className="flex-1 text-center">
              <h1 className="text-xl font-medium">
                {company?.companyName || "New contract"}
              </h1>
              {createdContractId && (
                <p className="text-xs text-gray-500 mt-1">
                  Contract ID: {createdContractId}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start justify-center gap-10">
            {/* Left Section - Contract Details */}
            <div className="w-1/2 p-6">
              <div className="space-y-6 flex gap-5 flex-col items-center">
                <div className="flex flex-col items-start space-y-4">
                  <div className="flex gap-10 ">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">SO name</div>
                      <div className="font-medium">{soName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">
                        Type of work
                      </div>
                      <div className="font-medium">{typeOfWork}</div>
                    </div>
                  </div>

                  <div className="flex gap-10">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">
                        Offer number
                      </div>
                      <div className="font-medium">{offerNumber || "—"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">
                        Contract number
                      </div>
                      <div className="font-medium">{contractNumber || "—"}</div>
                    </div>
                  </div>

                  {/* <div className="flex gap-10">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">
                        Start date
                      </div>
                      <div className="font-medium">
                        {startDate ? startDate.toLocaleDateString() : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">End date</div>
                      <div className="font-medium">
                        {endDate ? endDate.toLocaleDateString() : "—"}
                      </div>
                    </div>
                  </div> */}
                </div>

                <div className="w-full max-w-md mx-auto bg-white">
                  {/* Tabs */}
                  <div className="w-full">
                    <div className="flex border-b border-gray-200 justify-center">
                      <button
                        onClick={() => setActiveTab("Resources")}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === "Resources"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Resources
                      </button>
                      <button
                        onClick={() => setActiveTab("Insights")}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === "Insights"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Insights
                      </button>
                    </div>

                    {activeTab === "Resources" && (
                      <div className="mt-4 space-y-2">
                        {resources.map((resource, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-1 px-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-gray-500 mb-1">
                                {resource.date}
                              </div>
                              {resource.title && (
                                <div className="font-medium text-gray-900 text-sm mb-1">
                                  {resource.title}
                                </div>
                              )}
                              {resource.person && (
                                <div className="text-sm text-gray-900">
                                  {resource.person}
                                </div>
                              )}
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === "Insights" && (
                      <div className="mt-4 p-8 text-center text-gray-500">
                        No insights available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - Separate Calendars */}
            <div className="w-1/3 p-6 bg-gray-50 ">
              <div className="flex flex-col gap-6">
                {/* Start Date Calendar */}
                <div className="w-full">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Start date
                    </span>
                    <div className="flex items-center gap-2">
                      <ChevronLeft
                        className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600"
                        onClick={() => navigateStartMonth(-1)}
                      />
                      <div className="text-center text-sm font-medium text-gray-700">
                        {monthNames[startCalCurrent.getMonth()]}{" "}
                        {startCalCurrent.getFullYear()}
                      </div>
                      <ChevronRight
                        className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600"
                        onClick={() => navigateStartMonth(1)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekDays.map((day) => (
                      <div
                        key={day}
                        className="text-center text-xs font-medium text-gray-500 py-1"
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {generateCalendarDays(startCalCurrent, startDate).map(
                      (date, index) => (
                        <button
                          key={index}
                          onClick={() =>
                            handleStartDateClick(
                              date.day,
                              date.isCurrentMonth,
                              date.fullDate
                            )
                          }
                          className={`w-8 h-8 text-sm flex items-center justify-center rounded ${
                            !date.isCurrentMonth
                              ? "text-gray-400"
                              : "text-gray-700"
                          } ${
                            date.isSelected
                              ? "bg-gray-800 text-white"
                              : "hover:bg-gray-200"
                          }`}
                        >
                          {date.day}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* End Date Calendar */}
                <div className="w-full">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      End date
                    </span>
                    <div className="flex items-center gap-2">
                      <ChevronLeft
                        className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600"
                        onClick={() => navigateEndMonth(-1)}
                      />
                      <div className="text-center text-sm font-medium text-gray-700">
                        {monthNames[endCalCurrent.getMonth()]}{" "}
                        {endCalCurrent.getFullYear()}
                      </div>
                      <ChevronRight
                        className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600"
                        onClick={() => navigateEndMonth(1)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekDays.map((day) => (
                      <div
                        key={day}
                        className="text-center text-xs font-medium text-gray-500 py-1"
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {generateCalendarDays(endCalCurrent, endDate).map(
                      (date, index) => (
                        <button
                          key={index}
                          onClick={() =>
                            handleEndDateClick(
                              date.day,
                              date.isCurrentMonth,
                              date.fullDate
                            )
                          }
                          className={`w-8 h-8 text-sm flex items-center justify-center rounded ${
                            !date.isCurrentMonth
                              ? "text-gray-400"
                              : "text-gray-700"
                          } ${
                            date.isSelected
                              ? "bg-gray-800 text-white"
                              : "hover:bg-gray-200"
                          }`}
                        >
                          {date.day}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Simple validation hint */}
              {startDate && endDate && endDate < startDate && (
                <div className="mt-4 text-xs text-red-600">
                  End date cannot be before start date.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ====== FORM VIEW ======
  return (
    <div className="flex items-center justify-center p-1">
      <div className=" rounded-lg shadow-lg w-full max-w-5xl">
        {/* Header */}
        <div className="flex items-center px-6 py-2 border-b border-gray-200">
          <ChevronLeft className="w-5 h-5 text-gray-600 mr-3" />
          <a href="/calender">
          <span className="text-gray-600 text-sm cursor-pointer">
            Back to the calendar
          </span>
          </a>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-medium">
              {company?.companyName
                ? `New contract – ${company.companyName}`
                : "New contract"}
            </h1>
          </div>
        </div>

        {err && (
          <div className="mx-6 mt-3 rounded bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="flex  gap-10 justify-center items-center">
          {/* Form Section */}
          <div className="w-1/2 p-6 space-y-4">
            {/* Contract name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                *Contract name
              </label>
              <input
                type="text"
                value={contractName}
                onChange={(e) => setContractName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* SO name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                *SO name
              </label>
              <input
                type="text"
                value={soName}
                onChange={(e) => setSoName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Type of work */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                *Type of work
              </label>
              <select
                value={typeOfWork}
                onChange={(e) => setTypeOfWork(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="">Select the type of work</option>
                <option value="construction">Construction</option>
                <option value="maintenance">Maintenance</option>
                <option value="consulting">Consulting</option>
              </select>
            </div>

            {/* Offer number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Offer number
              </label>
              <input
                type="text"
                value={offerNumber}
                onChange={(e) => setOfferNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Contract number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contract number
              </label>
              <input
                type="text"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Calendar Section: two separate calendars */}
          <div className="w-1/3 p-6 bg-gray-50">
            <div className="flex flex-col gap-6">
              {/* Start Date Calendar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Start date
                  </span>
                  <div className="flex items-center gap-2">
                    <ChevronLeft
                      className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600"
                      onClick={() => navigateStartMonth(-1)}
                    />
                    <div className="text-center text-sm font-medium text-gray-700">
                      {monthNames[startCalCurrent.getMonth()]}{" "}
                      {startCalCurrent.getFullYear()}
                    </div>
                    <ChevronRight
                      className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600"
                      onClick={() => navigateStartMonth(1)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-medium text-gray-500 py-1"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {generateCalendarDays(startCalCurrent, startDate).map(
                    (date, index) => (
                      <button
                        key={index}
                        onClick={() =>
                          handleStartDateClick(
                            date.day,
                            date.isCurrentMonth,
                            date.fullDate
                          )
                        }
                        className={`w-8 h-8 text-sm flex items-center justify-center rounded ${
                          !date.isCurrentMonth
                            ? "text-gray-400"
                            : "text-gray-700"
                        } ${
                          date.isSelected
                            ? "bg-gray-800 text-white"
                            : "hover:bg-gray-200"
                        }`}
                      >
                        {date.day}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* End Date Calendar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    End date
                  </span>
                  <div className="flex items-center gap-2">
                    <ChevronLeft
                      className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600"
                      onClick={() => navigateEndMonth(-1)}
                    />
                    <div className="text-center text-sm font-medium text-gray-700">
                      {monthNames[endCalCurrent.getMonth()]}{" "}
                      {endCalCurrent.getFullYear()}
                    </div>
                    <ChevronRight
                      className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600"
                      onClick={() => navigateEndMonth(1)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-medium text-gray-500 py-1"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {generateCalendarDays(endCalCurrent, endDate).map(
                    (date, index) => (
                      <button
                        key={index}
                        onClick={() =>
                          handleEndDateClick(
                            date.day,
                            date.isCurrentMonth,
                            date.fullDate
                          )
                        }
                        className={`w-8 h-8 text-sm flex items-center justify-center rounded ${
                          !date.isCurrentMonth
                            ? "text-gray-400"
                            : "text-gray-700"
                        } ${
                          date.isSelected
                            ? "bg-gray-800 text-white"
                            : "hover:bg-gray-200"
                        }`}
                      >
                        {date.day}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Simple validation hint */}
            {startDate && endDate && endDate < startDate && (
              <div className="mt-4 text-xs text-red-600">
                End date cannot be before start date.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-2">
          <button
            onClick={handleCreateContract}
            disabled={saving}
            className="bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-900 transition-colors disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create contract"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContractForm;
