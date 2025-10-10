import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
} from "firebase/firestore";



export async function addResourceToTimeoffCell(
  db: any,
  uid: string,
  cellKey: string,
  resource: any
) {
  // ─── Derive metadata ────────────────────────────────────────────────────────
  const [section, ...dateParts] = cellKey.split("-"); 
  const date = dateParts.join("-"); 

  
  const ref = doc(db, "companies", uid, "timeoff", cellKey);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await updateDoc(ref, {
      section,
      date,
      items: arrayUnion(resource),
    });
  } else {
    await setDoc(ref, {
      section,
      date,
      items: [resource],
    });
  }
}


export async function removeResourceFromTimeoffCell(
  db: any,
  uid: string,
  cellKey: string,
  resource: any
) {
  const ref = doc(db, "companies", uid, "timeoff", cellKey);

  // 1. Remove the resource from the array
  await updateDoc(ref, { items: arrayRemove(resource) });

  // 2. Clean up if nothing is left
  const snap = await getDoc(ref);
  if (
    snap.exists() &&
    Array.isArray(snap.data().items) &&
    snap.data().items.length === 0
  ) {
    await deleteDoc(ref);
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
