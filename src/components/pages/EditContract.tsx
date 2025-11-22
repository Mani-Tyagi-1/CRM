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
  onUpdated?: () => void; // callback after update (optional)
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

          // Use soNumbers array or fallback to SO subcollection
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

   const contractRef = doc(db, "companies", companyId, "contracts", contractId);
   const soCol = collection(contractRef, "so");

   setSaving(true);
   try {
     // 1. Update contract fields
     await updateDoc(contractRef, {
       name: contractName,
       workType: typeOfWork,
       agreementId: offerNumber || null,
       contractId: contractNumber || null,
       workPrice: workPrice || null,
       unit: unit || null,
       startDate,
       endDate,
       soNumbers, // keep stored SO numbers for display
       updatedAt: new Date(),
     });

     // 2. READ existing SO documents
     const prevSO = await getDocs(soCol);

     // Map: soNumber → document ID
     const existing = new Map(
       prevSO.docs.map((d) => [d.data().soNumber, d.id])
     );

     // --- UPDATE / CREATE SO docs ---
     for (const soNumber of soNumbers) {
       if (existing.has(soNumber)) {
         // Update existing SO
         const soId = existing.get(soNumber);
         await updateDoc(doc(soCol, soId), {
           soNumber,
           updatedAt: new Date(),
         });
         existing.delete(soNumber); // mark as handled
       } else {
         // Create new SO with stable ID = soNumber
         const soId = soNumber.replace(/\s+/g, "_").toLowerCase();
         await setDoc(doc(soCol, soId), {
           soNumber,
           updatedAt: new Date(),
         });
       }
     }

     // --- DELETE removed SO docs ---
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
    <div className="flex flex-col max-h-screen items-center justify-center p-1">
      {/* Header */}
      <div className="flex items-center px-6 py-2 border-b border-gray-200 w-full">
        <div className="flex items-center min-w-[160px]">
          <a href="/calender" className="flex items-center">
            <ChevronLeft className="w-5 h-5 text-gray-600 mr-3" />
            <span className="text-gray-600 text-sm cursor-pointer">
              Back to the calendar
            </span>
          </a>
        </div>
        <div className="flex-1 text-center">
          <h1 className="text-xl font-medium">Edit contract</h1>
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
              onClick={handleUpdate}
              disabled={saving}
              className="bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-900 transition-colors disabled:opacity-60"
            >
              {saving ? "Updating…" : "Update contract"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditContractForm;
