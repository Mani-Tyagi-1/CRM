import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Maximize2, CheckSquare } from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  getDocs,
  query,
  orderBy,
  limit as qlimit,
} from "firebase/firestore";

// Dummy data for the Issues tab (Unresolved / Resolved)
const dummyIssues = {
  unresolved: [
    {
      id: 1,
      dateRange: "14. 3. 2025 - 19. 3. 2025",
      title: "Contract name",
      description:
        "Reference site about Lorem Ipsum, giving information on its origins, as well as a random Lipsum generator.",
    },
    {
      id: 2,
      dateRange: "14. 3. 2025 - 19. 3. 2025",
      title: "Contract name",
      description:
        "Reference site about Lorem Ipsum, giving information on its origins, as well as a random Lipsum generator.",
    },
    {
      id: 3,
      dateRange: "14. 3. 2025 - 19. 3. 2025",
      title: "Contract name",
      description:
        "Reference site about Lorem Ipsum, giving information on its origins, as well as a random Lipsum generator.",
    },
  ],
  resolved: [
    {
      id: 4,
      dateRange: "14. 3. 2025 - 19. 3. 2025",
      title: "Contract name",
      description:
        "Reference site about Lorem Ipsum, giving information on its origins, as well as a random Lipsum generator.",
    },
    {
      id: 5,
      dateRange: "14. 3. 2025 - 19. 3. 2025",
      title: "Contract name",
      description:
        "Reference site about Lorem Ipsum, giving information on its origins, as well as a random Lipsum generator.",
    },
  ],
};

// Dummy data for the Contracts tab (Ongoing / Finished)
const dummyContracts = {
  ongoing: [
    { id: 1, dateRange: "14. 3. 2025 - 19. 3. 2025", title: "Contract name" },
    { id: 2, dateRange: "14. 3. 2025 - 19. 3. 2025", title: "Contract name" },
    {
      id: 3,
      dateRange: "14. 3. 2025 - 19. 3. 2025",
      title: "Contract name",
      flagged: true,
    },
    { id: 4, dateRange: "14. 3. 2025 - 19. 3. 2025", title: "Contract name" },
  ],
  finished: [
    { id: 5, dateRange: "14. 3. 2025 - 19. 3. 2025", title: "Contract name" },
    { id: 6, dateRange: "14. 3. 2025 - 19. 3. 2025", title: "Contract name" },
    { id: 7, dateRange: "14. 3. 2025 - 19. 3. 2025", title: "Contract name" },
    { id: 8, dateRange: "14. 3. 2025 - 19. 3. 2025", title: "Contract name" },
  ],
};

function SegmentedTabs({
  active,
  onChange,
}: {
  active: string;
  onChange: (v: string) => void;
}) {
  const btn = (key: string, label: string) => (
    <button
      onClick={() => onChange(key)}
      className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-150 ${
        active === key
          ? "bg-white text-gray-900 shadow"
          : "text-gray-600 hover:text-gray-900"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-gray-100 p-1">
      {btn("contracts", "Contracts")}
      {btn("issues", "Issues")}
    </div>
  );
}

// For Issues tab (with descriptions + icons)
function IssuesCardGroup({
  items,
  resolved = false,
}: {
  items: any[];
  resolved?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      {items.map((item: any, idx: number) => (
        <div
          key={item.id}
          className={`grid grid-cols-[1fr_auto] items-start gap-4 p-4 ${
            idx !== 0 ? "border-t border-gray-200" : ""
          }`}
        >
          <div>
            <p className="text-xs text-gray-500">{item.dateRange}</p>
            <p className="mt-1 font-semibold text-gray-900">{item.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              {item.description}
            </p>
          </div>
          <div className="flex items-start gap-3 text-gray-500">
            {resolved ? (
              <button
                className="p-2 rounded-lg hover:bg-gray-100"
                aria-label="Marked as resolved"
                title="Marked as resolved"
              >
                <CheckSquare size={18} />
              </button>
            ) : (
              <button
                className="p-2 rounded-lg hover:bg-gray-100"
                aria-label="Expand"
                title="Expand"
              >
                <Maximize2 size={18} />
              </button>
            )}
            <button
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label="Open"
              title="Open"
            >
              <ExternalLink size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// For Contracts tab (compact, no descriptions)
function ContractsCardGroup({
  items,
}: {
  items: {
    id: string | number;
    dateRange: string;
    title: string;
    flagged?: boolean;
  }[];
}) {
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      {items.map((item, idx) => (
        <div
          key={item.id}
          className={`relative grid grid-cols-[1fr_auto] items-center gap-4 p-4 ${
            idx !== 0 ? "border-t border-gray-200" : ""
          }`}
        >
          {item.flagged && (
            <span className="absolute left-0 top-0 h-full w-[3px] bg-red-500 rounded-sm" />
          )}
          <div>
            <p className="text-xs text-gray-500">{item.dateRange}</p>
            <p className="mt-1 font-semibold text-gray-900">{item.title}</p>
          </div>
          <div className="flex items-center gap-3 text-gray-500">
            <button
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label="Open"
              title="Open"
            >
              <ExternalLink size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

type ContractDoc = {
  name?: string;
  status?: "draft" | "active" | "archived";
};

function formatDate(d: Date) {
  return d.toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

async function getContractDateRange(
  companyId: string,
  contractId: string
): Promise<string> {
  // First SO (if multiple SO docs exist, we take the first one)
  const soCol = collection(
    db,
    "companies",
    companyId,
    "contracts",
    contractId,
    "so"
  );
  const soSnap = await getDocs(query(soCol, qlimit(1)));
  if (soSnap.empty) return "";

  const soId = soSnap.docs[0].id;
  const resCol = collection(
    db,
    "companies",
    companyId,
    "contracts",
    contractId,
    "so",
    soId,
    "resources"
  );

  // earliest start
  const firstResSnap = await getDocs(
    query(resCol, orderBy("startTime", "asc"), qlimit(1))
  );
  // latest end
  const lastResSnap = await getDocs(
    query(resCol, orderBy("endTime", "desc"), qlimit(1))
  );

  if (firstResSnap.empty || lastResSnap.empty) return "";

  const start = firstResSnap.docs[0].data().startTime?.toDate?.() as
    | Date
    | undefined;
  const end = lastResSnap.docs[0].data().endTime?.toDate?.() as
    | Date
    | undefined;

  if (!start || !end) return "";
  return `${formatDate(start)} - ${formatDate(end)}`;
}

export default function OverviewPage() {
  const [activeTab, setActiveTab] = useState("contracts");
  const [_uid, setUid] = useState<string | null>(null);
  const [ongoing, setOngoing] = useState<
    { id: string; dateRange: string; title: string; flagged?: boolean }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let unsubContracts: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubContracts) {
        unsubContracts();
        unsubContracts = null;
      }

      if (!user) {
        setUid(null);
        setOngoing([]);
        setLoading(false);
        setErr("You must be signed in to see your contracts.");
        return;
      }

      setUid(user.uid);
      setErr(null);
      setLoading(true);

      // Listen to all contracts and filter client-side:
      const col = collection(db, "companies", user.uid, "contracts");
      unsubContracts = onSnapshot(
        col,
        async (snap) => {
          const docs = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as ContractDoc),
          }));

          // Consider anything not archived as "ongoing"
          const ongoingDocs = docs.filter(
            (c) => (c.status ?? "draft") !== "archived"
          );

          // Build UI items with date ranges
          const items = await Promise.all(
            ongoingDocs.map(async (c) => {
              const dateRange = await getContractDateRange(user.uid, c.id);
              return {
                id: c.id,
                dateRange: dateRange || "—",
                title: c.name || "Contract",
              };
            })
          );

          setOngoing(items);
          setLoading(false);
        },
        (e) => {
          setErr(e.message || "Failed to load contracts.");
          setLoading(false);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubContracts) unsubContracts();
    };
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-3">
        {/* Back + Title */}
        <div className="w-full flex items-center gap-[30%] border-b border-gray-200 pb-3">
          <a
            href="/calender"
            className="group inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft
              size={16}
              className="transition-transform group-hover:-translate-x-0.5"
            />
            <span>Back to the calendar</span>
          </a>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            Overview
          </h1>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex justify-center">
          <SegmentedTabs active={activeTab} onChange={setActiveTab} />
        </div>

        {activeTab === "contracts" ? (
          <div className="mt-8 space-y-10">
            {/* Ongoing */}
            <section>
              <h2 className="text-center text-lg font-semibold text-gray-900">
                Ongoing
              </h2>

              {err && (
                <div className="mt-3 text-center text-sm text-red-600">
                  {err}
                </div>
              )}

              <div className="mt-4 max-w-4xl mx-auto">
                {loading ? (
                  <div className="text-center text-gray-500 py-8">Loading…</div>
                ) : (
                  <ContractsCardGroup
                    items={
                      ongoing.length > 0 ? ongoing : dummyContracts.ongoing // fallback if none
                    }
                  />
                )}
              </div>
            </section>

            {/* Finished (kept as-is / dummy) */}
            <section>
              <h2 className="text-center text-lg font-semibold text-gray-900">
                Finished
              </h2>
              <div className="mt-4 max-w-4xl mx-auto">
                <ContractsCardGroup items={dummyContracts.finished} />
              </div>
            </section>
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            {/* Unresolved */}
            <section>
              <h2 className="text-center text-lg font-semibold text-red-500">
                Unresolved
              </h2>
              <div className="mt-4 max-w-4xl mx-auto">
                <IssuesCardGroup items={dummyIssues.unresolved} />
              </div>
            </section>

            {/* Resolved */}
            <section>
              <h2 className="text-center text-lg font-semibold text-gray-900">
                Resolved
              </h2>
              <div className="mt-4 max-w-4xl mx-auto">
                <IssuesCardGroup items={dummyIssues.resolved} resolved />
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
