import * as React from "react";
import { Calendar } from "../ui/calendar";
import type { DateRange } from "react-day-picker";

// --- Type for parent communication ---
type Props = {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onChange: (range: { start: Date | undefined; end: Date | undefined }) => void;
};

// --- Calendar Style Overrides for Highlighting ---
const CalendarGrayOverride = () => (
  <style>{`
    /* Selected day: dark background, white text */
    .rdp-day_selected,
    .rdp-day_selected:hover,
    .rdp-day_selected:focus-visible,
    .rdp-day_range_start,
    .rdp-day_range_end {
      background-color: #111827 !important; /* gray-900 */
      color: #fff !important;
      border : 1px solid #111827 !important;
      border-color: #111827 !important;
      border-radius: 0.375rem !important; /* rounded-md */
    }
    /* In-range days (not start/end): light gray background, dark text */
    .rdp-day_in_range:not(.rdp-day_selected):not(.rdp-day_range_start):not(.rdp-day_range_end) {
      background-color: #f3f4f6 !important; /* gray-100 */
      color: #111827 !important;
    }
    /* Today outline (not selected) */
    .rdp-day_today:not(.rdp-day_selected):not(.rdp-day_range_start):not(.rdp-day_range_end) {
      border: 1px solid #6b7280 !important; /* gray-500 */
    }
    /* Calendar accent/focus */
    .rdp {
      --rdp-accent-color: #6b7280;
      --rdp-background-color: #e5e7eb;
    }
      .rdp-day:focus,
  .rdp-day:focus-visible,
  .rdp-day:active,
  .rdp-day_selected:focus,

  .rdp-day_selected:focus-visible {
    outline: none !important;
    box-shadow: none !important;
    border: none !important;
  }

  .rdp {
  --rdp-accent-color: transparent;
  --rdp-border-color: transparent;
  outline: none !important;
    box-shadow: none !important;
    border: none !important;
}
  `}</style>
);

// --- Utility: check if date is within (exclusive) range ---
function isWithinRange(day: Date, from?: Date, to?: Date) {
  if (!from || !to) return false;
  const d = day.setHours(0, 0, 0, 0);
  const f = from.setHours(0, 0, 0, 0);
  const t = to.setHours(0, 0, 0, 0);
  return d > f && d < t;
}

export function ContractDateRangePicker({
  startDate,
  endDate,
  onChange,
}: Props) {
  // -- Handlers for calendars --
  const handleStartSelect = (date: Date | undefined) => {
    // If new start > end, clear end date (UX enhancement)
    if (date && endDate && date > endDate) {
      onChange({ start: date, end: undefined });
    } else {
      onChange({ start: date, end: endDate });
    }
  };

  const handleEndSelect = (date: Date | undefined) => {
    // If new end < start, clear start date (UX enhancement)
    if (date && startDate && date < startDate) {
      onChange({ start: undefined, end: date });
    } else {
      onChange({ start: startDate, end: date });
    }
  };

  // --- In-range modifier function for DayPicker ---
  const inRangeModifier = (day: Date) => isWithinRange(day, startDate, endDate);

  return (
    <div className="flex flex-col gap-4 items-start">
      <CalendarGrayOverride />
      <div className="flex flex-col items-center">
        <span className="mb-1 text-xs font-medium text-gray-500">
          Start Date
        </span>
        <Calendar
          mode="single"
          selected={startDate}
          onSelect={handleStartSelect}
          fromMonth={startDate || new Date()}
          // Only allow selecting up to endDate, if selected
          disabled={endDate ? { after: endDate } : undefined}
          modifiers={{
            in_range: inRangeModifier,
            range_start: startDate
              ? (d: Date) =>
                  d.setHours(0, 0, 0, 0) === startDate.setHours(0, 0, 0, 0)
              : undefined,
          }}
          modifiersClassNames={{
            in_range: "rdp-day_in_range",
            range_start: "rdp-day_range_start",
          }}
          numberOfMonths={1}
        />
      </div>
      <div className="flex flex-col items-center">
        <span className="mb-1 text-xs font-medium text-gray-500">End Date</span>
        <Calendar
          mode="single"
          selected={endDate}
          onSelect={handleEndSelect}
          fromMonth={endDate || startDate || new Date()}
          // Only allow selecting after startDate, if selected
          disabled={startDate ? { before: startDate } : undefined}
          modifiers={{
            in_range: inRangeModifier,
            range_end: endDate
              ? (d: Date) =>
                  d.setHours(0, 0, 0, 0) === endDate.setHours(0, 0, 0, 0)
              : undefined,
          }}
          modifiersClassNames={{
            in_range: "rdp-day_in_range",
            range_end: "rdp-day_range_end",
          }}
          numberOfMonths={1}
          
        />
      </div>
    </div>
  );
}
