import { auth, db } from "../lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";

export type CompanyProfile = {
  companyName: string;
  businessId: string;
  taxBusinessId: string;
  bankAccount: string;
  address: string;
  contactPerson: string;
  contactPhone: string;
  adminEmail: string; // also used as login email
};

export async function registerCompany(
  profile: CompanyProfile,
  password: string
) {
  // 1) create auth user
  const cred = await createUserWithEmailAndPassword(
    auth,
    profile.adminEmail,
    password
  );

  // 2) store the company profile under this user's UID
  const ref = doc(db, "companies", cred.user.uid);
  await setDoc(ref, {
    ...profile,
    createdAt: serverTimestamp(),
  });

  return cred.user;
}

export async function login(email: string, password: string) {
  const creds = await signInWithEmailAndPassword(auth, email, password);
  return creds.user;
}

export async function fetchMyCompany(uid: string) {
  const snap = await getDoc(doc(db, "companies", uid));
  return snap.exists() ? snap.data() : null;
}

export function signOut() {
  return firebaseSignOut(auth);
}
