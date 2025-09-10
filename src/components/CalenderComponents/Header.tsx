import React from "react";
import { createPortal } from "react-dom";
import { DayPicker, type DateRange } from "react-day-picker";
import { Calendar as CalendarIcon, Search } from "lucide-react";
import "react-day-picker/dist/style.css";

/** Inline CSS overrides (no external/global stylesheet needed) */
const DayPickerOverrides = () => (
  <style>{`
    /* neutralize blue and use gray */
    .rdp {
      --rdp-accent-color: #6b7280;      /* gray-500 for focus/nav */
      --rdp-background-color: #e5e7eb;  /* gray-200 for selected bg */
    }
    .rdp-day_selected,
    .rdp-day_selected:hover,
    .rdp-day_selected:focus-visible,
    .rdp-day_range_start,
    .rdp-day_range_end {
      background-color: #e5e7eb !important; /* gray-200 */
      color: #111827 !important;            /* gray-900 */
    }
    .rdp-day_range_middle {
      background-color: #f3f4f6 !important; /* gray-100 */
      color: #111827 !important;
    }
    /* subtle "pop" animation */
    .calendar-pop {
      transform-origin: top left;
      animation: cal-in .12s ease-out both;
    }
    @keyframes cal-in {
      from { opacity: 0; transform: scale(0.98); }
      to   { opacity: 1; transform: scale(1); }
    }
  `}</style>
);

/** Small portal wrapper that positions the popup and prevents clipping */
function CalendarPortal({
  anchorRef,
  open,
  onClose,
  children,
}: {
  anchorRef: React.RefObject<HTMLElement>;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [pos, setPos] = React.useState<{ left: number; top: number }>({
    left: 0,
    top: 0,
  });
  const popRef = React.useRef<HTMLDivElement>(null);

  // Compute and clamp position so the calendar never overflows the right edge
  const updatePos = React.useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const GAP = 8;
    const approxWidth = popRef.current?.offsetWidth ?? 340;
    const left = Math.min(
      Math.max(GAP, rect.left),
      window.innerWidth - approxWidth - GAP
    );
    const top = rect.bottom + GAP;
    setPos({ left, top });
  }, [anchorRef]);

  React.useLayoutEffect(() => {
    if (!open) return;
    updatePos();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, updatePos, onClose]);

  if (!open) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />
      <div
        ref={popRef}
        className="fixed z-[70] rounded-2xl  bg-white p-2 shadow-2xl ring-1 ring-black/5 calendar-pop"
        style={{ left: pos.left, top: pos.top }}
        onClick={(e) => e.stopPropagation()}
      >
        <DayPickerOverrides />
        {children}
      </div>
    </>,
    document.body
  );
}

export default function SearchWithDates() {
  const [open, setOpen] = React.useState(false);
  const [range, setRange] = React.useState<DateRange | undefined>();
  const btnRef = React.useRef<HTMLButtonElement>(null);

  const label = React.useMemo(() => {
    const fmt = (d?: Date) => (d ? `${d.getDate()}. ${d.getMonth() + 1}.` : "");
    if (range?.from && range?.to)
      return `${fmt(range.from)} - ${fmt(range.to)}`;
    if (range?.from) return `${fmt(range.from)} - …`;
    return "Select dates";
  }, [range]);

  return (
    <div className="w-full space-y-2">
      {/* Date selector */}
      <div className="relative">
        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-md mt-2 px-3 py-1 text-sm text-gray-800 hover:bg-gray-200"
        >
          <CalendarIcon className="h-4 w-4 text-gray-500" />
          <span>{label}</span>
        </button>

        <CalendarPortal
          anchorRef={btnRef}
          open={open}
          onClose={() => setOpen(false)}
        >
          <DayPicker
            mode="range"
            numberOfMonths={1}
            selected={range}
            onSelect={(r) => {
              setRange(r);
              if (r?.from && r?.to) setOpen(false);
            }}
            pagedNavigation
            // extra insurance: keep middle days slightly lighter gray
            modifiersStyles={{
              selected: { backgroundColor: "#e5e7eb", color: "#111827" },
              range_start: { backgroundColor: "#e5e7eb", color: "#111827" },
              range_end: { backgroundColor: "#e5e7eb", color: "#111827" },
              range_middle: { backgroundColor: "#f3f4f6", color: "#111827" },
            }}
          />
        </CalendarPortal>
      </div>
    </div>
  );
}
