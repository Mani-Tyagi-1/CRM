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
  // Only check date order if both are given
  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    throw new Error("End date cannot be before start date.");
  }

  const batch = writeBatch(db);
  const now = serverTimestamp();

  // Always create contract
  const contractRef = doc(collection(db, "companies", companyId, "contracts"));
  batch.set(contractRef, {
    name: input.name,
    workType: input.workType,
    contractId: input.contractId || null,
    agreementId: input.agreementId || null,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });

  // Only create SO if soNumber is provided and not blank
  let soId: string | undefined = undefined;
  let resourceId: string | undefined = undefined;
  if (input.soNumber && input.soNumber.trim() !== "") {
    // Create SO
    const soRef = doc(collection(contractRef, "so"));
    batch.set(soRef, {
      soNumber: input.soNumber,
      createdAt: now,
      updatedAt: now,
    });
    soId = soRef.id;

    // Only create resource if resourceRef and dates provided
    if (input.resourceRef && input.startDate && input.endDate) {
      const resourceRef = doc(collection(soRef, "resources"));
      batch.set(resourceRef, {
        resourceRef: input.resourceRef ?? null,
        startTime: Timestamp.fromDate(input.startDate),
        endTime: Timestamp.fromDate(input.endDate),
        createdAt: now,
        updatedAt: now,
      });
      resourceId = resourceRef.id;
    }
  }

  await batch.commit();

  return {
    contractId: contractRef.id,
    soId,
    resourceId,
  };
}
