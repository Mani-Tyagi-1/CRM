import { useState } from "react";

export default function Register() {
  const [address, setAddress] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Example saved addresses (you can fetch from API later)
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

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 mt-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">
          Sign Up
        </h2>

        <form className="space-y-4">
          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Company name
            </label>
            <input
              type="text"
              placeholder="EuropeanCompany"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Business ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Business ID
            </label>
            <input
              type="text"
              placeholder="01234567"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Tax Business ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tax business ID
            </label>
            <input
              type="text"
              placeholder="CZ01234567"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Bank Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Bank account number
            </label>
            <input
              type="text"
              placeholder="01234567 / 0123"
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

          {/* Contact Person */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contact person
            </label>
            <input
              type="text"
              placeholder="Tomáš Novák"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Contact Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contact person's phone
            </label>
            <input
              type="tel"
              placeholder="+420 012 345 678"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Admin Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Admin e-mail
            </label>
            <input
              type="email"
              placeholder="vas@email.cz"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full rounded-md bg-gray-900 px-4 py-2 text-white font-medium hover:bg-gray-800"
          >
            Sign up
          </button>
        </form>
      </div>
    </div>
  );
}
