import {
  collection,
  getDocs,
  Firestore,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../lib/firebase";

// ----------------------
// Type Definitions
// ----------------------

export interface NestedResource {
  id: string;
  assignedDates: string[];
  colour: string;
  name: string;
  type: string;
}

export interface Resource extends NestedResource {
  nestedResources: NestedResource[];
}

export interface SO {
  id: string;
  soNumber: string;
  updatedAt: any;
  resources: Resource[];
}

export interface ContractDeep {
  id: string;
  [key: string]: any;
  so: SO[];
}

// ----------------------
// Fetch Nested Resources
// ----------------------

const fetchNestedResources = async (
  db: Firestore,
  path: string
): Promise<NestedResource[]> => {
  const nestedRef = collection(db, path, "resources");
  const nestedSnap = await getDocs(nestedRef);

  return nestedSnap.docs.map((d) => ({
      ...(d.data() as NestedResource),
    id: d.id,
  }));
};

// ----------------------
// Fetch Resources (with nested resources)
// ----------------------

const fetchResources = async (
  db: Firestore,
  soPath: string
): Promise<Resource[]> => {
  const resRef = collection(db, soPath, "resources");
  const resSnap = await getDocs(resRef);

  const resources: Resource[] = [];

  for (const resDoc of resSnap.docs) {
    const resData = resDoc.data() as Resource;

    const nested = await fetchNestedResources(
      db,
      `${soPath}/resources/${resDoc.id}`
    );

    resources.push({
        ...resData,
      id: resDoc.id,
      nestedResources: nested,
    });
  }

  return resources;
};

// ----------------------
// Fetch SO and their resources
// ----------------------

const fetchSO = async (db: Firestore, contractPath: string): Promise<SO[]> => {
  const soRef = collection(db, contractPath, "so");
  const soSnap = await getDocs(soRef);

  const soList: SO[] = [];

  for (const soDoc of soSnap.docs) {
    const soData = soDoc.data() as SO;

    const resources = await fetchResources(
      db,
      `${contractPath}/so/${soDoc.id}`
    );

    soList.push({
        ...soData,
      id: soDoc.id,
      resources,
    });
  }

  return soList;
};

// ----------------------
// Final Fetch: All contracts with ALL nested structure
// ----------------------

export const fetchAllContracts = async (): Promise<ContractDeep[]> => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) throw new Error("User not logged in");

  const uid = user.uid; // companyId = userId

  const contractsRef = collection(db, "companies", uid, "contracts");
  const contractsSnap = await getDocs(contractsRef);

  const fullContracts: ContractDeep[] = [];

  for (const contractDoc of contractsSnap.docs) {
    const contractPath = `companies/${uid}/contracts/${contractDoc.id}`;

    const soData = await fetchSO(db, contractPath);

    fullContracts.push({
      id: contractDoc.id,
      ...contractDoc.data(),
      so: soData,
    });
  }

  return fullContracts;
};
