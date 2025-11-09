import { auth, db } from "../lib/firebase"; // adjust path
import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

export type CreateContractInput = {
  name: string; // Contract name
  workType: string; // Selection
  soNumber?: string; // SO number (your "SO name" field maps here)
  contractId?: string; // Contract ID (optional)
  agreementId?: string; // Agreement ID (optional)
  startDate?: Date; // Resource start (optional)
  endDate?: Date; // Resource end (optional)
  resourceRef?: string | null; // Optional pointer to a resource catalog item
  workPrice: string | undefined;
  unit: string | undefined;
  soNumbers: string[];
};

export async function createContractWithSoAndResource(
  input: CreateContractInput,
  opts?: { uid?: string }
) {
  const companyId = opts?.uid ?? auth.currentUser?.uid;
  if (!companyId) throw new Error("Not signed in.");

  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    throw new Error("End date cannot be before start date.");
  }

  const batch = writeBatch(db);
  const now = serverTimestamp();

  // Ensure soNumbers is always an array
  const soNumbers =
    input.soNumbers && input.soNumbers.length > 0
      ? input.soNumbers.filter((s) => !!s.trim())
      : ["Default SO"];

  // Create contract document with all fields
  const contractRef = doc(collection(db, "companies", companyId, "contracts"));
  batch.set(contractRef, {
    name: input.name,
    workType: input.workType,
    contractId: input.contractId || null,
    agreementId: input.agreementId || null,
    workPrice: input.workPrice || null,
    unit: input.unit || null,
    startDate: input.startDate ? Timestamp.fromDate(input.startDate) : null,
    endDate: input.endDate ? Timestamp.fromDate(input.endDate) : null,
    soNumbers, // Store the array of SOs
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });

  // Always create at least one SO (either from user or "Default SO")
  soNumbers.forEach((soNumber) => {
    const soRef = doc(collection(contractRef, "so"));
    batch.set(soRef, {
      soNumber,
      createdAt: now,
      updatedAt: now,
    });
  });

  await batch.commit();

  return {
    contractId: contractRef.id,
  };
}
