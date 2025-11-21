// import {
//   collection,
//   getDocs,
//   Firestore,
// } from "firebase/firestore";
// import { getAuth } from "firebase/auth";
// import { db } from "../lib/firebase";

// // ----------------------
// // Type Definitions
// // ----------------------

// export interface NestedResource {
//   id: string;
//   assignedDates: string[];
//   colour: string;
//   name: string;
//   type: string;
// }

// export interface Resource extends NestedResource {
//   nestedResources: NestedResource[];
// }

// export interface SO {
//   id: string;
//   soNumber: string;
//   updatedAt: any;
//   resources: Resource[];
// }

// export interface ContractDeep {
//   id: string;
//   [key: string]: any;
//   so: SO[];
// }

// // ----------------------
// // Fetch Nested Resources
// // ----------------------

// const fetchNestedResources = async (
//   db: Firestore,
//   path: string
// ): Promise<NestedResource[]> => {
//   const nestedRef = collection(db, path, "resources");
//   const nestedSnap = await getDocs(nestedRef);

//   return nestedSnap.docs.map((d) => ({
//       ...(d.data() as NestedResource),
//     id: d.id,
//   }));
// };

// // ----------------------
// // Fetch Resources (with nested resources)
// // ----------------------

// const fetchResources = async (
//   db: Firestore,
//   soPath: string
// ): Promise<Resource[]> => {
//   const resRef = collection(db, soPath, "resources");
//   const resSnap = await getDocs(resRef);

//   const resources: Resource[] = [];

//   for (const resDoc of resSnap.docs) {
//     const resData = resDoc.data() as Resource;

//     const nested = await fetchNestedResources(
//       db,
//       `${soPath}/resources/${resDoc.id}`
//     );

//     resources.push({
//         ...resData,
//       id: resDoc.id,
//       nestedResources: nested,
//     });
//   }

//   return resources;
// };

// // ----------------------
// // Fetch SO and their resources
// // ----------------------

// const fetchSO = async (db: Firestore, contractPath: string): Promise<SO[]> => {
//   const soRef = collection(db, contractPath, "so");
//   const soSnap = await getDocs(soRef);

//   const soList: SO[] = [];

//   for (const soDoc of soSnap.docs) {
//     const soData = soDoc.data() as SO;

//     const resources = await fetchResources(
//       db,
//       `${contractPath}/so/${soDoc.id}`
//     );

//     soList.push({
//         ...soData,
//       id: soDoc.id,
//       resources,
//     });
//   }

//   return soList;
// };

// // ----------------------
// // Final Fetch: All contracts with ALL nested structure
// // ----------------------

// export const fetchAllContracts = async (): Promise<ContractDeep[]> => {
//   const auth = getAuth();
//   const user = auth.currentUser;

//   if (!user) throw new Error("User not logged in");

//   const uid = user.uid; // companyId = userId

//   const contractsRef = collection(db, "companies", uid, "contracts");
//   const contractsSnap = await getDocs(contractsRef);

//   const fullContracts: ContractDeep[] = [];

//   for (const contractDoc of contractsSnap.docs) {
//     const contractPath = `companies/${uid}/contracts/${contractDoc.id}`;

//     const soData = await fetchSO(db, contractPath);

//     fullContracts.push({
//       id: contractDoc.id,
//       ...contractDoc.data(),
//       so: soData,
//     });
//   }

//   return fullContracts;
// };




// import { collection, getDocs, Firestore } from "firebase/firestore";
// import { getAuth } from "firebase/auth";
// import { db } from "../lib/firebase";

// // ----------------------
// // Type Definitions
// // ----------------------

// export interface NestedResource {
//   id: string;
//   assignedDates: string[];
//   colour: string;
//   name: string;
//   type: string;
// }

// export interface Resource extends NestedResource {
//   nestedResources: NestedResource[];
// }

// export interface SO {
//   id: string;
//   soNumber: string;
//   updatedAt: any;
//   resources: Resource[];
// }

// export interface ContractDeep {
//   id: string;
//   [key: string]: any;
//   so: SO[];
// }

// // Fetch Nested Resources in Parallel
// const fetchNestedResources = async (
//   db: Firestore,
//   path: string
// ): Promise<NestedResource[]> => {
//   const nestedRef = collection(db, path, "resources");
//   const nestedSnap = await getDocs(nestedRef);

//   // Already fetched all at once, just map to array
//   return nestedSnap.docs.map((d) => ({
//     ...(d.data() as NestedResource),
//     id: d.id,
//   }));
// };

// // Fetch Resources (with nested resources) in Parallel
// const fetchResources = async (
//   db: Firestore,
//   soPath: string
// ): Promise<Resource[]> => {
//   const resRef = collection(db, soPath, "resources");
//   const resSnap = await getDocs(resRef);

//   // Fetch all nested resources in parallel
//   const resourcePromises = resSnap.docs.map(async (resDoc) => {
//     const resData = resDoc.data() as Resource;
//     const nested = await fetchNestedResources(
//       db,
//       `${soPath}/resources/${resDoc.id}`
//     );
//     return {
//       ...resData,
//       id: resDoc.id,
//       nestedResources: nested,
//     };
//   });

//   return Promise.all(resourcePromises);
// };

// // Fetch SO and their resources in Parallel
// const fetchSO = async (db: Firestore, contractPath: string): Promise<SO[]> => {
//   const soRef = collection(db, contractPath, "so");
//   const soSnap = await getDocs(soRef);

//   // Fetch all SO resources in parallel
//   const soPromises = soSnap.docs.map(async (soDoc) => {
//     const soData = soDoc.data() as SO;
//     const resources = await fetchResources(
//       db,
//       `${contractPath}/so/${soDoc.id}`
//     );
//     return {
//       ...soData,
//       id: soDoc.id,
//       resources,
//     };
//   });

//   return Promise.all(soPromises);
// };

// // Final Fetch: All contracts with ALL nested structure in Parallel
// export const fetchAllContracts = async (): Promise<ContractDeep[]> => {
//   const auth = getAuth();
//   const user = auth.currentUser;

//   if (!user) throw new Error("User not logged in");

//   const uid = user.uid;

//   const contractsRef = collection(db, "companies", uid, "contracts");
//   const contractsSnap = await getDocs(contractsRef);

//   // Fetch all contracts and their SO in parallel
//   const contractPromises = contractsSnap.docs.map(async (contractDoc) => {
//     const contractPath = `companies/${uid}/contracts/${contractDoc.id}`;
//     const soData = await fetchSO(db, contractPath);
//     return {
//       id: contractDoc.id,
//       ...contractDoc.data(),
//       so: soData,
//     };
//   });

//   return Promise.all(contractPromises);
// };



import { collection, getDocs, Firestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../lib/firebase";

// Utility: Converts Firestore Timestamp to ISO (yyyy-mm-dd)
function toISODate(ts: any): string | null {
  if (!ts) return null;
  if (typeof ts === "string") return ts.slice(0, 10);
  if (typeof ts === "object" && ts.seconds)
    return new Date(ts.seconds * 1000).toISOString().slice(0, 10);
  return null;
}

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

const fetchNestedResources = async (
  db: Firestore,
  nestedPath: string
): Promise<NestedResource[]> => {
  const nestedRef = collection(db, nestedPath, "resources");
  const nestedSnap = await getDocs(nestedRef);

  return nestedSnap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      assignedDates: (data.assignedDates || []).map(toISODate),
      colour: data.colour,
      name: data.name,
      type: data.type,
    };
  });
};

const fetchResources = async (
  db: Firestore,
  soPath: string
): Promise<Resource[]> => {
  const resRef = collection(db, soPath, "resources");
  const resSnap = await getDocs(resRef);

  const resourcePromises = resSnap.docs.map(async (resDoc) => {
    const resData = resDoc.data();
    let nestedResources: NestedResource[] = [];
    if (resData.type === "machine") {
      nestedResources = await fetchNestedResources(
        db,
        `${soPath}/resources/${resDoc.id}`
      );
    }
    return {
      ...resData,
      id: resDoc.id,
      assignedDates: (resData.assignedDates || []).map(toISODate),
      nestedResources,
      colour: resData.colour,
      name: resData.name,
      type: resData.type,
    };
  });

  return Promise.all(resourcePromises);
};

const fetchSO = async (db: Firestore, contractPath: string): Promise<SO[]> => {
  const soRef = collection(db, contractPath, "so");
  const soSnap = await getDocs(soRef);

  const soPromises = soSnap.docs.map(async (soDoc) => {
    const soData = soDoc.data();
    const resources = await fetchResources(
      db,
      `${contractPath}/so/${soDoc.id}`
    );
    return {
      ...soData,
      id: soDoc.id,
      soNumber: soData.soNumber || soDoc.id,
      updatedAt: toISODate(soData.updatedAt),
      resources,
    };
  });

  return Promise.all(soPromises);
};

export const fetchAllContracts = async (): Promise<ContractDeep[]> => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) throw new Error("User not logged in");

  const uid = user.uid;

  const contractsRef = collection(db, "companies", uid, "contracts");
  const contractsSnap = await getDocs(contractsRef);

  const contractPromises = contractsSnap.docs.map(async (contractDoc) => {
    const contractPath = `companies/${uid}/contracts/${contractDoc.id}`;
    const so = await fetchSO(db, contractPath);
    const data = contractDoc.data();
    return {
      ...data,
      id: contractDoc.id,
      contractId: data.contractId || contractDoc.id,
      startDate: toISODate(data.startDate),
      endDate: toISODate(data.endDate),
      createdAt: toISODate(data.createdAt),
      updatedAt: toISODate(data.updatedAt),
      anchorDate: toISODate(data.anchorDate),
      soNumbers: data.soNumbers || [],
      so,
      name: data.name || "",
      status: data.status,
      agreementId: data.agreementId,
      workType: data.workType,
      workPrice: data.workPrice,
      unit: data.unit,
    };
  });

  return Promise.all(contractPromises);
};
