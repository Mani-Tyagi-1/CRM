import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
} from "firebase/firestore";

/**
 * Add a resource to a given timeoff cell (e.g. vacation-2025-10-06)
 */
export async function addResourceToTimeoffCell(
  db: any,
  uid: string,
  cellKey: string,
  resource: any
) {
  const ref = doc(db, "companies", uid, "timeoff", cellKey);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { items: arrayUnion(resource) });
  } else {
    await setDoc(ref, { items: [resource] });
  }
}

/**
 * Remove a resource from a given timeoff cell
 */
export async function removeResourceFromTimeoffCell(
  db: any,
  uid: string,
  cellKey: string,
  resource: any
) {
  const ref = doc(db, "companies", uid, "timeoff", cellKey);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { items: arrayRemove(resource) });
  }
}

/**
 * Optionally, clean up empty docs
 */
export async function cleanupEmptyTimeoffCell(
  db: any,
  uid: string,
  cellKey: string
) {
  const ref = doc(db, "companies", uid, "timeoff", cellKey);
  const snap = await getDoc(ref);
  if (
    snap.exists() &&
    Array.isArray(snap.data().items) &&
    snap.data().items.length === 0
  ) {
    await deleteDoc(ref);
  }
}
