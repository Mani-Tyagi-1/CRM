// import * as React from "react";
import { Calendar } from "../ui/calendar";
// import { CalendarGrayOverride } from "./SearchWithDates"; // If in same dir
import type { DateRange } from "react-day-picker";

type Props = {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onChange: (range: { start: Date | undefined; end: Date | undefined }) => void;
};

const CalendarGrayOverride = () => (
  <style>{`
    /* Main selected day, start/end of range: gray-200, text gray-900 */
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
    .rdp-day_today:not(.rdp-day_selected) {
      border: 1px solid #6b7280 !important; /* gray-500 for today */
    }
    /* accent for focus/navigation */
    .rdp {
      --rdp-accent-color: #6b7280;
      --rdp-background-color: #e5e7eb;
    }
  `}</style>
);

export function ContractDateRangePicker({
  startDate,
  endDate,
  onChange,
}: Props) {
  // Internal state for controlled inputs if you want
  const range: DateRange = {
    from: startDate,
    to: endDate,
  };

  return (
    <div className="flex flex-col gap-2 items-start">
      <CalendarGrayOverride />
      <div className="flex flex-col items-center">
        <Calendar
          mode="single"
          selected={startDate}
          onSelect={(date) =>
            onChange({ start: date ?? undefined, end: endDate })
          }
          fromMonth={new Date()}
          modifiers={{
            range_middle:
              startDate && endDate
                ? ([startDate, endDate].filter(Boolean) as Date[])
                : [],
          }}
          modifiersClassNames={{
            range_middle: "rdp-day_range_middle",
          }}
          numberOfMonths={1}
          disabled={endDate ? { after: endDate } : undefined}
        />
      </div>
      <div className="flex flex-col items-center">
        <Calendar
          mode="single"
          selected={endDate}
          onSelect={(date) =>
            onChange({ start: startDate, end: date ?? undefined })
          }
          fromMonth={startDate || new Date()}
          modifiers={{
            range_middle:
              startDate && endDate
                ? ([startDate, endDate] as [Date, Date])
                : [],
          }}
          modifiersClassNames={{
            range_middle: "rdp-day_range_middle",
          }}
          numberOfMonths={1}
          disabled={startDate ? { before: startDate } : undefined}
        />
      </div>
    </div>
  );
}
