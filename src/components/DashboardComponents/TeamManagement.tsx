import { useState } from "react";
import { Crown, Check } from "lucide-react";

type Role = "owner" | "editor" | "viewer";
type User = { id: string; email: string; role: Role };

const ROLE_LABELS: Record<Role, string> = {
  owner: "owner",
  editor: "editor",
  viewer: "viewer",
};

export default function TeamManagement() {
  const [users, setUsers] = useState<User[]>([
    { id: "1", email: "vas@email.cz", role: "owner" },
    { id: "2", email: "prochazka@email.cz", role: "editor" },
    { id: "3", email: "prochazka@email.cz", role: "viewer" },
    { id: "4", email: "prochazka@email.cz", role: "viewer" },
    { id: "5", email: "prochazka@email.cz", role: "owner" },
    { id: "6", email: "prochazka@email.cz", role: "viewer" },
  ]);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");

  const setRole = (id: string, role: Role) =>
    setUsers((u) => u.map((x) => (x.id === id ? { ...x, role } : x)));

  const removeUser = (id: string) =>
    setUsers((u) => u.filter((x) => x.id !== id));

  const addUser = () => {
    if (!newEmail.trim()) return;
    setUsers((u) => [
      ...u,
      {
        id: Math.random().toString(36).slice(2),
        email: newEmail.trim(),
        role: "viewer",
      },
    ]);
    setNewEmail("");
  };

  const validEmail = /\S+@\S+\.\S+/.test(newEmail);

  return (
    <section className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold">Team management</h2>
      <p className="mt-1 text-sm text-gray-600">
        Lorem Ipsum is simply dummy text of the printing and typesetting
        industry. Lorem Ipsum has been the industry's standard dummy text ever
        since the 1500s.
      </p>
      <div className="w-full items-center justify-center">
        <div className="mt-6 max-w-lg rounded-xl border border-slate-400 bg-white relative overflow-visible">
          {/* header strip to mimic top divider */}
          <ul role="list">
            {users.map((user, idx) => (
              <li
                key={user.id}
                className={`flex items-center justify-between px-4 py-3 text-sm ${
                  idx !== users.length - 1 ? "border-b border-slate-400" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  {user.role === "owner" && (
                    <Crown className="w-4 h-4 text-gray-700" aria-hidden />
                  )}
                  <span
                    className={user.role === "owner" ? "font-semibold" : ""}
                  >
                    {user.email}
                  </span>
                </div>

                {/* Role cell with hover menu */}
                <div
                  className="relative "
                  onMouseEnter={() => setHoveredId(user.id)}
                  onClick={() => setHoveredId(user.id)}
                  onMouseLeave={() =>
                    setHoveredId((p) => (p === user.id ? null : p))
                  }
                >
                  <button
                    className="px-2 py-1 text-gray-600 hover:text-gray-900"
                    type="button"
                  >
                    {ROLE_LABELS[user.role]}
                  </button>

                  {hoveredId === user.id && (
                    <div className="absolute right-[-30px] z-50 mt-1 w-40 rounded-lg border border-slate-400 bg-white shadow-lg">
                      <ul className="py-1 text-sm">
                        {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
                          <li key={role}>
                            <button
                              type="button"
                              onClick={() => {
                                setRole(user.id, role);
                                setHoveredId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"
                            >
                              <span className="w-4">
                                {user.role === role && (
                                  <Check className="w-4 h-4" aria-hidden />
                                )}
                              </span>
                              <span className="capitalize">
                                {ROLE_LABELS[role]}
                              </span>
                            </button>
                          </li>
                        ))}
                        <li className="mt-1 border-t border-slate-400">
                          <button
                            type="button"
                            onClick={() => {
                              removeUser(user.id);
                              setHoveredId(null);
                            }}
                            className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50"
                          >
                            remove
                          </button>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Add row */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-slate-400 bg-gray-50">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new.employee@email.cz"
              className="flex-1 rounded-lg border border-slate-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              disabled={!validEmail}
              onClick={addUser}
              className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                validEmail
                  ? "bg-gray-900 hover:bg-black"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
