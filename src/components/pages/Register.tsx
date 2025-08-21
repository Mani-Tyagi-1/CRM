import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerCompany } from "../../services/auth";

export default function Register() {
  const [address, setAddress] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [taxBusinessId, setTaxBusinessId] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const suggestedAddresses = [
    "První nádvoří Pražského hradu, 119 00 Praha 1-Hradčany",
    "Karlovo náměstí 10, 120 00 Praha 2",
    "Václavské náměstí 25, 110 00 Praha 1",
    "Náměstí Republiky 1, 110 00 Praha 1",
  ];

  const handleSelectAddress = (addr: string) => {
    setAddress(addr);
    setShowDropdown(false);
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!adminEmail || !password) {
      setErr("Please fill e-mail and password.");
      return;
    }
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await registerCompany(
        {
          companyName,
          businessId,
          taxBusinessId,
          bankAccount,
          address,
          contactPerson,
          contactPhone,
          adminEmail,
        },
        password
      );
      navigate("/dashboard");
    } catch (e: any) {
      const msg =
        e?.code === "auth/email-already-in-use"
          ? "This e-mail is already in use."
          : e?.code === "auth/weak-password"
          ? "Password is too weak."
          : e?.message || "Failed to sign up.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 mt-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">
          Sign Up
        </h2>

        {err && (
          <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Company name
            </label>
            <input
              type="text"
              placeholder="EuropeanCompany"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Business ID
            </label>
            <input
              type="text"
              placeholder="01234567"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tax business ID
            </label>
            <input
              type="text"
              placeholder="CZ01234567"
              value={taxBusinessId}
              onChange={(e) => setTaxBusinessId(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Bank account number
            </label>
            <input
              type="text"
              placeholder="01234567 / 0123"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Address with dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onClick={() => setShowDropdown(true)}
              placeholder="Select or type address"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {showDropdown && (
              <ul className="absolute z-10 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-md">
                {suggestedAddresses.map((addr, idx) => (
                  <li
                    key={idx}
                    onClick={() => handleSelectAddress(addr)}
                    className="cursor-pointer px-3 py-2 hover:bg-gray-100"
                  >
                    {addr}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contact person
            </label>
            <input
              type="text"
              placeholder="Tomáš Novák"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contact person's phone
            </label>
            <input
              type="tel"
              placeholder="+420 012 345 678"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Admin e-mail
            </label>
            <input
              type="email"
              placeholder="vas@email.cz"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Password for Firebase auth */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-gray-900 px-4 py-2 text-white font-medium hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? "Signing up..." : "Sign up"}
          </button>
        </form>
      </div>
    </div>
  );
}
