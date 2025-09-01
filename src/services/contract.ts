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
  soNumber: string; // SO number (your "SO name" field maps here)
  contractId?: string; // Contract ID (optional)
  agreementId?: string; // Agreement ID (optional)
  startDate: Date; // Resource start
  endDate: Date; // Resource end
  resourceRef?: string | null; // Optional pointer to a resource catalog item
};

export async function createContractWithSoAndResource(
  input: CreateContractInput,
  opts?: { uid?: string } // optionally pass uid explicitly
) {
  const companyId = opts?.uid ?? auth.currentUser?.uid;
  if (!companyId) throw new Error("Not signed in.");
  if (input.endDate < input.startDate) {
    throw new Error("End date cannot be before start date.");
  }

  const batch = writeBatch(db);

  // Pre-create refs so we can batch .set()
  const contractRef = doc(collection(db, "companies", companyId, "contracts"));
  const soRef = doc(collection(contractRef, "so"));
  const resourceRef = doc(collection(soRef, "resources"));

  const now = serverTimestamp();

  // contracts/{contractId}
  batch.set(contractRef, {
    name: input.name,
    workType: input.workType,
    contractId: input.contractId || null,
    agreementId: input.agreementId || null,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });

  // contracts/{contractId}/so/{soId}
  batch.set(soRef, {
    soNumber: input.soNumber,
    createdAt: now,
    updatedAt: now,
  });

  // .../so/{soId}/resources/{resourceId}
  batch.set(resourceRef, {
    resourceRef: input.resourceRef ?? null,
    startTime: Timestamp.fromDate(input.startDate),
    endTime: Timestamp.fromDate(input.endDate),
    createdAt: now,
    updatedAt: now,
  });

  await batch.commit();

  return {
    contractId: contractRef.id,
    soId: soRef.id,
    resourceId: resourceRef.id,
  };
}
