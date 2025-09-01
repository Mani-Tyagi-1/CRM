import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { auth, db } from "../../lib/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

type Color = "blue" | "red" | "green" | "purple";

type CompanyDoc = {
  companyName: string;
  businessId?: string;
  taxBusinessId?: string;
  bankAccount?: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  adminEmail: string;
  colorStyling?: string; // can be anything; we'll map to our 4 options
};

const colorOptions: { label: string; value: Color; class: string }[] = [
  { label: "Blue", value: "blue", class: "bg-blue-600" },
  { label: "Red", value: "red", class: "bg-red-600" },
  { label: "Green", value: "green", class: "bg-green-600" },
  { label: "Purple", value: "purple", class: "bg-purple-600" },
];

export default function OrganizationDetails() {
  // UI state
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Company fields
  const [companyName, setCompanyName] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [taxBusinessId, setTaxBusinessId] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [address, setAddress] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");

  // Color theme
  const [color, setColor] = useState<Color>("blue");
  const colorClass = colorOptions.find((c) => c.value === color)?.class ?? "";

  // Map whatever is stored in Firestore to one of our 4 colors
  const mapColor = (raw?: string): Color => {
    const allowed: Color[] = ["blue", "red", "green", "purple"];
    return allowed.includes(raw as Color) ? (raw as Color) : "blue";
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setErr("You must be signed in to view organization details.");
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, "companies", user.uid); // <-- Model A path
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setErr("Company document not found.");
          setLoading(false);
          return;
        }

        const d = snap.data() as CompanyDoc;

        setCompanyName(d.companyName ?? "");
        setBusinessId(d.businessId ?? "");
        setTaxBusinessId(d.taxBusinessId ?? "");
        setBankAccount(d.bankAccount ?? "");
        setAddress(d.address ?? "");
        setContactPerson(d.contactPerson ?? "");
        setContactPhone(d.contactPhone ?? "");
        setOwnerEmail(d.adminEmail ?? "");
        setColor(mapColor(d.colorStyling));
      } catch (e: any) {
        setErr(e?.message || "Failed to load company.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="w-[90%] flex justify-center space-y-8">
      <div className="max-w-4xl flex justify-between items-start flex-wrap gap-24">
        {/* LEFT */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">
            {companyName || "Organization"}
          </h2>

          {/* error message */}
          {err && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-700">
              {err}
            </div>
          )}

          {/* Color theme */}
          <label className="relative inline-flex items-center">
            <span
              className={`absolute left-3 w-3 h-3 rounded-full ${colorClass}`}
              aria-hidden
            />
            <select
              className="appearance-none bg-transparent px-10 py-1 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-sm font-medium text-gray-800 cursor-pointer"
              value={color}
              onChange={(e) => setColor(e.target.value as Color)}
            >
              {colorOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 w-4 h-4 text-gray-400" />
          </label>

          {/* Bank account */}
          <div>
            <div className="text-sm font-medium text-gray-700">
              Bank account
            </div>
            <input
              type="text"
              placeholder="01234567/0123"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              className="mt-1 w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Address */}
          <div>
            <div className="text-sm font-medium text-gray-700">Address</div>
            <input
              type="text"
              placeholder="První nádvoří Pražského hradu, 119 00 Praha 1-Hradčany"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-96 max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Phone */}
          <div>
            <div className="text-sm font-medium text-gray-700">Phone</div>
            <input
              type="tel"
              placeholder="+420 012 345 678"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="mt-1 w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-700">Business ID</div>
            <input
              type="text"
              placeholder="01234567"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              className="mt-1 w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700">
              Business tax ID
            </div>
            <input
              type="text"
              placeholder="CZ01234567"
              value={taxBusinessId}
              onChange={(e) => setTaxBusinessId(e.target.value)}
              className="mt-1 w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700">
              Contact person
            </div>
            <input
              type="text"
              placeholder="Tomáš Novák"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="mt-1 w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700">
              Owner e-mail
            </div>
            <input
              type="email"
              placeholder="vas@email.cz"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              className="mt-1 w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled // usually you won’t edit this here
            />
          </div>
        </div>
      </div>
    </div>
  );
}
