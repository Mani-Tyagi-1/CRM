import { auth, db } from "../lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
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

export type CompanyPayload = {
  companyName: string;
  businessId?: string;
  taxBusinessId?: string;
  bankAccount?: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  adminEmail: string;
  colorStyling?: "slate" | "indigo" | "emerald" | "rose" | "amber";
};

const normalizePhone = (v: string) =>
  v.replace(/[^\d+]/g, ""); // "+420 123 456 789" -> "+420123456789"

const normalizeBankAccount = (v: string) =>
  v.replace(/\s/g, ""); // "01234567 / 0123" -> "01234567/0123"


export async function registerCompany(
  payload: CompanyPayload,
  password: string
) {
  const {
    companyName,
    businessId = "",
    taxBusinessId = "",
    bankAccount = "",
    address = "",
    contactPerson = "",
    contactPhone = "",
    adminEmail,
    colorStyling = "indigo",
  } = payload;

  // 1) Create the auth user
  const cred = await createUserWithEmailAndPassword(auth, adminEmail, password);
  const { user } = cred;

  // Optional: update the Auth display name to Company or Contact name
  try {
    await updateProfile(user, {
      displayName: companyName || contactPerson || undefined,
    });
  } catch {
    // not fatal
  }

  // 2) Write Firestore docs
  const companyDocRef = doc(db, "companies", user.uid);
  const userDocRef = doc(db, "users", user.uid);

  const now = serverTimestamp();

  const companyDoc = {
    companyName,
    businessId,
    taxBusinessId,
    bankAccount: bankAccount || "",
    bankAccountNormalized: bankAccount ? normalizeBankAccount(bankAccount) : "",
    address,
    contactPerson,
    contactPhone,
    contactPhoneNormalized: contactPhone ? normalizePhone(contactPhone) : "",
    adminEmail,
    // owner/admin of this company entity
    ownerUid: user.uid,
    colorStyling,
    createdAt: now,
    updatedAt: now,
  };

  const userDoc = {
    uid: user.uid,
    email: adminEmail,
    companyId: user.uid, // since company doc id == uid
    role: "owner", // you can use "admin" / "member" later
    displayName: companyName || contactPerson || "",
    createdAt: now,
    updatedAt: now,
  };

  await Promise.all([
    setDoc(companyDocRef, companyDoc),
    setDoc(userDocRef, userDoc),
  ]);

  // 3) Return something useful (optional)
  return { uid: user.uid };
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



