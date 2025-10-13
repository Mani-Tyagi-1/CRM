import * as React from "react";
import { CalendarIcon } from "lucide-react";
// import { addDays, format } from "date-fns";
import { cn } from "../../lib/utils"; // if you use shadcn's cn utility, else remove
import { Button } from "../ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { Calendar } from "../ui/calendar"; // shadcn Calendar
import type { DateRange } from "react-day-picker"; // type is the same as shadcn

// Optional: override shadcn calendar styles for gray color scheme
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

export default function SearchWithDates() {
  const [open, setOpen] = React.useState(false);
  const [range, setRange] = React.useState<DateRange | undefined>();
  const btnRef = React.useRef<HTMLButtonElement>(null);

  // Compose the label
  const label = React.useMemo(() => {
    const fmt = (d?: Date) => (d ? `${d.getDate()}. ${d.getMonth() + 1}.` : "");
    if (range?.from && range?.to)
      return `${fmt(range.from)} - ${fmt(range.to)}`;
    if (range?.from) return `${fmt(range.from)} - …`;
    return "Select dates";
  }, [range]);

  return (
    <div className="w-full space-y-2">
      <div className="relative">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={btnRef}
              variant="ghost"
              className={cn(
                "inline-flex items-center gap-2 rounded-md mt-2 px-3 py-1 text-sm text-gray-800 hover:bg-gray-200"
              )}
              type="button"
            >
              <CalendarIcon className="h-4 w-4 text-gray-500" />
              <span>{label}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-2 z-[70] rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-in fade-in"
            align="start"
            side="bottom"
            sideOffset={8}
            onInteractOutside={() => setOpen(false)}
          >
            <CalendarGrayOverride />
            <Calendar
              mode="range"
              selected={range}
              onSelect={(r: DateRange | undefined) => {
                setRange(r);
                if (r?.from && r?.to) setOpen(false);
              }}
              numberOfMonths={1}
              pagedNavigation
              disabled={{ before: new Date() }} 
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
