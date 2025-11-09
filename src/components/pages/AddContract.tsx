import React, { useEffect, useState } from "react";
import { ChevronLeft, ExternalLink, X } from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { createContractWithSoAndResource } from "../../services/contract";
import { doc, onSnapshot } from "firebase/firestore";
import { ContractDateRangePicker } from "../ui/ContractDateRangePicker";

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
  const [typeOfWork, setTypeOfWork] = useState("");
  const [offerNumber, setOfferNumber] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [workPrice, setWorkPrice] = useState("");
  const [unit, setUnit] = useState("");
const [startDate, setStartDate] = useState<Date | undefined>();
const [endDate, setEndDate] = useState<Date | undefined>();

  // ---- SOs ----
  const [soList, setSoList] = useState<string[]>([""]);

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

  // ---- contract creation ----
  const handleCreateContract = async () => {
    setErr(null);

    // Validate
    if (!uid) {
      setErr("You must be signed in.");
      return;
    }
    if (!contractName || !typeOfWork) {
      setErr("Please fill all required fields (*).");
      return;
    }
    if (!startDate || !endDate) {
      setErr("Please select both start and end date.");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setErr("End date must be after start date.");
      return;
    }
    
    

    // At least one SO if any entered
    const trimmedSOList = soList.map((so) => so.trim()).filter(Boolean);

    setSaving(true);
    try {
      const { contractId } = await createContractWithSoAndResource(
        {
          name: contractName,
          workType: typeOfWork,
          agreementId: offerNumber || undefined,
          contractId: contractNumber || undefined,
          workPrice: workPrice || undefined,
          unit: unit || undefined,
          soNumbers: trimmedSOList,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
        { uid }
      );
      setCreatedContractId(contractId);
    } catch (e: any) {
      setErr(e?.message || "Failed to create contract.");
    } finally {
      setSaving(false);
    }
  };

  // ====== DETAILS VIEW (after creation) ======
  const [activeTab, setActiveTab] = React.useState<"SO" | "Insights">("SO");
  if (createdContractId) {
    return (
      <div className="flex flex-col items-center justify-center p-1 ">
        {/* Header */}
        <div className="flex items-center px-6 py-2 border-b border-gray-200 w-full">
          <div className="flex items-center min-w-[160px]">
            <ChevronLeft className="w-5 h-5 text-gray-600 mr-3" />
            <a href="/calender">
              <span className="text-gray-600 text-sm cursor-pointer">
                Back to the calendar
              </span>
            </a>
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-medium">{contractName}</h1>
          </div>
          <div className="min-w-[160px]" />
        </div>
        <div className="rounded-lg  w-full max-w-3xl">
          <div className="flex flex-col items-center py-20">
            {/* Top details */}
            <div className="flex gap-24 mb-8">
              <div>
                <div className="text-sm text-gray-500 mb-1">Offer number</div>
                <div className="font-medium">{offerNumber || "—"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Type of work</div>
                <div className="font-medium">{typeOfWork}</div>
              </div>
            </div>
            <div className="flex gap-24 mb-8">
              <div>
                <div className="text-sm text-gray-500 mb-1">
                  Contract number
                </div>
                <div className="font-medium">{contractNumber || "—"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Work price</div>
                <div className="font-medium">{workPrice || "—"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">
                  Unit of measurement
                </div>
                <div className="font-medium">{unit || "—"}</div>
              </div>
            </div>
            <div className="flex gap-24 mb-8">
              <div>
                <div className="text-sm text-gray-500 mb-1">Start date</div>
                <div className="font-medium">{startDate ? startDate.toLocaleDateString() : "—"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">End date</div>
                <div className="font-medium">{endDate ? endDate.toLocaleDateString() : "—"}</div>
              </div>
            </div>
            {/* Tabs */}
            <div className="w-full max-w-md flex flex-col items-center mt-6">
              <div className="flex mb-6">
                <div className="flex bg-[#f5f8fa] rounded-2xl px-4 py-1">
                  <button
                    className={`px-4 py-2 rounded-xl font-medium text-[14px] transition-all
          ${
            activeTab === "SO"
              ? "bg-white text-[#212a39] shadow-none"
              : "bg-transparent text-[#212a39]/60"
          }
        `}
                    onClick={() => setActiveTab("SO")}
                    style={{ marginRight: "6px" }}
                  >
                    SO
                  </button>
                  <button
                    className={`px-6 py-2 rounded-xl font-medium text-[14px] transition-all
          ${
            activeTab === "Insights"
              ? "bg-white text-[#212a39] shadow-none"
              : "bg-transparent text-[#212a39]/60"
          }
        `}
                    onClick={() => setActiveTab("Insights")}
                  >
                    Insights
                  </button>
                </div>
              </div>
              {/* Content Box */}
              <div className="w-full">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  {activeTab === "SO" && (
                    <div>
                      {soList.length === 0 && (
                        <div className="p-5 text-gray-400 text-center text-sm">
                          No SOs.
                        </div>
                      )}
                      {soList.map((so, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between px-5 py-3 text-gray-900 text-[15px] font-medium 
              ${idx !== soList.length - 1 ? "border-b border-gray-200" : ""}
              hover:bg-gray-50 cursor-pointer`}
                        >
                          <div>{so}</div>
                          <ExternalLink className="w-4 h-4 text-gray-400 ml-3" />
                        </div>
                      ))}
                    </div>
                  )}
                  {activeTab === "Insights" && (
                    <div className="w-full py-10 text-center text-gray-400 text-sm">
                      No insights available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ====== FORM VIEW ======
  return (
    <div className="flex flex-col max-h-screen items-center justify-center p-1">
      {/* Header */}
      <div className="flex items-center px-6 py-2 border-b border-gray-200 w-full">
        <div className="flex items-center min-w-[160px]">
          <ChevronLeft className="w-5 h-5 text-gray-600 mr-3" />
          <a href="/calender">
            <span className="text-gray-600 text-sm cursor-pointer">
              Back to the calendar
            </span>
          </a>
        </div>
        <div className="flex-1 text-center">
          <h1 className="text-xl font-medium">
            {company?.companyName
              ? `New contract – ${company.companyName}`
              : "New contract"}
          </h1>
        </div>
        <div className="min-w-[160px]" />
      </div>

      {err && (
        <div className="mx-6 mt-3 rounded bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}
      <div className="rounded-lg w-full max-w-3xl flex flex-row gap-10 justify-center">
        {/* Left Side - Inputs */}
        <div className="p-10 py-8 w-[430px]">
          {/* Contract name */}
          <div className="mb-6">
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
          {/* Type of work */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              *Type of work
            </label>
            <select
              value={typeOfWork}
              onChange={(e) => setTypeOfWork(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="">Select the type of work</option>
              <option value="Road transport">Road transport</option>
              <option value="Construction">Construction</option>
              <option value="Consulting">Consulting</option>
              {/* Add more as needed */}
            </select>
          </div>
          {/* Offer number */}
          <div className="mb-6">
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
          <div className="mb-6">
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
          {/* Work price */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Work price
            </label>
            <input
              type="text"
              value={workPrice}
              onChange={(e) => setWorkPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {/* Unit of measurement */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit of measurement
            </label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {/* SOs */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Create SOs
            </label>
            <div className="bg-white border border-gray-300 rounded-lg">
              {soList.map((so, idx) => (
                <div
                  key={idx}
                  className="flex items-center border-b last:border-b-0"
                >
                  <input
                    type="text"
                    value={so}
                    onChange={(e) => {
                      const newList = [...soList];
                      newList[idx] = e.target.value;
                      setSoList(newList);
                    }}
                    className="flex-1 px-3 py-2 border-0 focus:ring-0 rounded-none"
                  />
                  {soList.length > 1 && (
                    <button
                      type="button"
                      className="px-2 py-1 text-gray-400 hover:text-red-500"
                      onClick={() => {
                        setSoList(soList.filter((_, i) => i !== idx));
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="text-sm px-3 py-2 text-blue-500 hover:underline"
                onClick={() => setSoList([...soList, ""])}
              >
                + Add another SO
              </button>
            </div>
          </div>
        </div>
        {/* Right Side - Datepickers */}
        <div className="py-2 flex flex-col items-center gap-5 min-w-[250px]">
          <ContractDateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={({ start, end }) => {
              setStartDate(start);
              setEndDate(end);
            }}
          />
          <div className="mt-0 flex justify-end w-full ">
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
    </div>
  );
};

export default ContractForm;
