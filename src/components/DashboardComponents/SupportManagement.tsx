import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function SupportChat() {
  type Msg = {
    id: string;
    from: string; // e.g. "support@my.cz" or "you"
    text: string;
    align: "left" | "center" | "right";
  };

  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "m1",
      from: "support@my.cz",
      align: "left",
      text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
    },
    {
      id: "m2",
      from: "support@my.cz",
      align: "center",
      text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
    },
    { id: "m3", from: "support@my.cz", align: "left", text: "hi" },
  ]);

  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        from: "you",
        align: "right",
        text,
      },
    ]);
    setDraft("");
  };

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="mx-auto max-w-3xl h-[640px] flex flex-col">
      {/* Messages area */}
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-6 p-2">
        {messages.map((m) => (
          <div key={m.id}>
            {/* Sender label */}
            <div
              className={`text-xs font-semibold text-gray-700 ${
                m.align === "right"
                  ? "text-right"
                  : m.align === "center"
                  ? "text-right pr-1"
                  : ""
              }`}
            >
              {m.from}
            </div>

            {/* Message body */}
            {m.align === "center" ? (
              <div className="mx-auto  text-end text-sm text-gray-700 leading-6">
                {m.text}
              </div>
            ) : (
              <div
                className={`text-sm text-gray-700 leading-6 ${
                  m.align === "right" ? "text-right" : ""
                }`}
              >
                {m.text}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="pt-2">
        <div className="flex items-center gap-3 rounded-2xl border px-4 py-2 bg-white shadow-sm">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type your request..."
            className="flex-1 bg-transparent outline-none text-sm py-2"
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          
          <button
            type="button"
            onClick={send}
            aria-label="Send"
            className="grid place-items-center w-12 h-12 rounded-2xl border border-gray-300 bg-white text-gray-600 shadow-sm hover:bg-gray-50 active:shadow-inner"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
