import React, { useEffect, useState } from "react";
import { ChevronLeft, X } from "lucide-react";
import { db } from "../../lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { ContractDateRangePicker } from "../ui/ContractDateRangePicker";

type Props = {
  companyId: string;
  contractId: string;
  onUpdated?: () => void;
};

const EditContractForm: React.FC<Props> = ({
  companyId,
  contractId,
  onUpdated,
}) => {
  // Form state
  const [contractName, setContractName] = useState("");
  const [typeOfWork, setTypeOfWork] = useState("");
  const [offerNumber, setOfferNumber] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [workPrice, setWorkPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [soList, setSoList] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Fetch contract and SOs
  useEffect(() => {
    async function fetchData() {
      try {
        const contractRef = doc(
          db,
          "companies",
          companyId,
          "contracts",
          contractId
        );
        const contractSnap = await getDoc(contractRef);
        if (contractSnap.exists()) {
          const data = contractSnap.data();
          setContractName(data.name || "");
          setTypeOfWork(data.workType || "");
          setOfferNumber(data.agreementId || "");
          setContractNumber(data.contractId || "");
          setWorkPrice(data.workPrice || "");
          setUnit(data.unit || "");
          setStartDate(
            data.startDate
              ? data.startDate.toDate?.() ||
                  new Date(data.startDate.seconds * 1000)
              : undefined
          );
          setEndDate(
            data.endDate
              ? data.endDate.toDate?.() || new Date(data.endDate.seconds * 1000)
              : undefined
          );

          if (Array.isArray(data.soNumbers) && data.soNumbers.length) {
            setSoList(data.soNumbers);
          } else {
            const soCol = collection(contractRef, "so");
            const soSnaps = await getDocs(soCol);
            const list = soSnaps.docs.map((d) => d.data().soNumber || "");
            setSoList(list.length ? list : [""]);
          }
        }
      } catch (e) {
        setErr("Failed to load contract");
      }
    }
    fetchData();
  }, [companyId, contractId]);

  // Update contract
  const handleUpdate = async () => {
    setErr(null);

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

    const trimmedSOList = soList.map((so) => so.trim()).filter(Boolean);
    const soNumbers = trimmedSOList.length ? trimmedSOList : ["Default SO"];

    const contractRef = doc(
      db,
      "companies",
      companyId,
      "contracts",
      contractId
    );
    const soCol = collection(contractRef, "so");

    setSaving(true);
    try {
      await updateDoc(contractRef, {
        name: contractName,
        workType: typeOfWork,
        agreementId: offerNumber || null,
        contractId: contractNumber || null,
        workPrice: workPrice || null,
        unit: unit || null,
        startDate,
        endDate,
        soNumbers,
        updatedAt: new Date(),
      });

      const prevSO = await getDocs(soCol);
      const existing = new Map(
        prevSO.docs.map((d) => [d.data().soNumber, d.id])
      );

      for (const soNumber of soNumbers) {
        if (existing.has(soNumber)) {
          const soId = existing.get(soNumber);
          await updateDoc(doc(soCol, soId), {
            soNumber,
            updatedAt: new Date(),
          });
          existing.delete(soNumber);
        } else {
          const soId = soNumber.replace(/\s+/g, "_").toLowerCase();
          await setDoc(doc(soCol, soId), {
            soNumber,
            updatedAt: new Date(),
          });
        }
      }

      for (const [, id] of existing) {
        await deleteDoc(doc(soCol, id));
      }

      if (onUpdated) onUpdated();
    } catch (e: any) {
      setErr(e?.message || "Failed to update contract.");
    } finally {
      setSaving(false);
    }
  };

  return (
    
    <div className="flex flex-col h-[95vh] w-full bg-white rounded-lg overflow-hidden relative">
      
      <div className="flex-none flex items-center px-6 py-3 border-b border-gray-200 w-full bg-white z-10">
        <div className="flex items-center min-w-[160px]">
          
          <a href="/calender" className="flex items-center group">
            <ChevronLeft className="w-5 h-5 text-gray-500 group-hover:text-gray-700 mr-2" />
            <span className="text-gray-500 group-hover:text-gray-700 text-sm font-medium cursor-pointer">
              Back to calendar
            </span>
          </a>
        </div>
        <div className="flex-1 text-center">
          <h1 className="text-xl font-semibold text-slate-800">
            Edit Contract
          </h1>
        </div>
        {/* Placeholder for balance */}
        <div className="min-w-[160px]" />
      </div>

      {/* 2. Scrollable Body Area (Flex-1 fills remaining height) */}
      <div className="flex-1 overflow-y-auto">
        {err && (
          <div className="mx-6 mt-4 rounded-lg bg-red-50 p-4 border border-red-100 text-sm text-red-700 font-medium shadow-sm">
            {err}
          </div>
        )}

        <div className="p-8 w-full max-w-5xl mx-auto flex flex-row gap-10 justify-center items-start">
          {/* Left Column - Inputs */}
          <div className="w-[440px] flex-shrink-0">
            {/* Contract name */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Contract name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contractName}
                onChange={(e) => setContractName(e.target.value)}
                placeholder="e.g. Project Alpha"
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
              />
            </div>
            {/* Type of work */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Type of work <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={typeOfWork}
                  onChange={(e) => setTypeOfWork(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none shadow-sm cursor-pointer"
                >
                  <option value="">Select type...</option>
                  <option value="Road transport">Road transport</option>
                  <option value="Construction">Construction</option>
                  <option value="Consulting">Consulting</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                  <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Offer number */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Offer number
                </label>
                <input
                  type="text"
                  value={offerNumber}
                  onChange={(e) => setOfferNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {/* Contract number */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Contract number
                </label>
                <input
                  type="text"
                  value={contractNumber}
                  onChange={(e) => setContractNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Work price */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Price
                </label>
                <input
                  type="text"
                  value={workPrice}
                  onChange={(e) => setWorkPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {/* Unit of measurement */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. hr/m²"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* SOs */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Service Orders (SOs)
              </label>
              <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                {soList.map((so, idx) => (
                  <div
                    key={idx}
                    className="flex items-center border-b border-slate-200 last:border-b-0"
                  >
                    <input
                      type="text"
                      value={so}
                      onChange={(e) => {
                        const newList = [...soList];
                        newList[idx] = e.target.value;
                        setSoList(newList);
                      }}
                      placeholder={`SO Number ${idx + 1}`}
                      className="flex-1 px-4 py-2.5 bg-transparent border-none focus:ring-0 text-sm"
                    />
                    {soList.length > 1 && (
                      <button
                        type="button"
                        title="Remove SO"
                        className="px-3 py-2 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
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
                  className="w-full text-left text-sm px-4 py-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 font-medium transition-colors"
                  onClick={() => setSoList([...soList, ""])}
                >
                  + Add another SO
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Datepickers & Actions */}
          <div className="w-[300px] flex flex-col gap-6 sticky top-0">
            <div className="bg-white p-1">
              <ContractDateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={({ start, end }) => {
                  setStartDate(start);
                  setEndDate(end);
                }}
              />
            </div>

            <hr className="border-gray-100" />

            <div className="flex flex-col gap-3">
              <button
                onClick={handleUpdate}
                disabled={saving}
                className="w-full bg-slate-800 text-white font-medium px-6 py-3 rounded-lg hover:bg-slate-900 focus:ring-4 focus:ring-slate-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform active:scale-[0.98]"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating...
                  </span>
                ) : (
                  "Update contract"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditContractForm;
