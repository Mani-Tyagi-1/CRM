import * as React from "react";
import { CalendarIcon } from "lucide-react";
// import { addDays, format } from "date-fns";
import { cn } from "../../lib/utils"; // if you use shadcn's cn utility, else remove
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar"; // shadcn Calendar
import type { DateRange } from "react-day-picker"; // type is the same as shadcn

// Optional: override shadcn calendar styles for gray color scheme
const CalendarGrayOverride = () => (
  <style>{`
    /* Single selected day + range start/end -> BLACK circle */
    button[data-selected-single="true"],
    button[data-range-start="true"],
    button[data-range-end="true"] {
      background-color: #000000 !important;
      rounded: 0px !important;
      border: none !important;
      ouline: none !important;
      color: #ffffff !important;
    }

    /* Middle of the range -> light gray bar */
    button[data-range-middle="true"] {
      background-color: #e5e7eb !important;
      color: #111827 !important;
    }
  `}</style>
);


type HeaderProps = {
  dateRange: DateRange | undefined;
  setDateRange: (dateRange: DateRange | undefined) => void;
};

const formatDateForApi = (date?: Date) => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Header: React.FC<HeaderProps> = ({ dateRange, setDateRange }) => {
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef<HTMLButtonElement>(null);

  // Label for button display
  const label = React.useMemo(() => {
    const fmt = (d?: Date) => {
      if (!d) return "";
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    };

    if (dateRange?.from && dateRange?.to) {
      return `${fmt(dateRange.from)} - ${fmt(dateRange.to)}`;
    }
    if (dateRange?.from) {
      return `${fmt(dateRange.from)} - …`;
    }
    return "Select dates";
  }, [dateRange]);

  // If you need to send or store dates as strings:
  const formattedRange = React.useMemo(
    () => ({
      from: formatDateForApi(dateRange?.from),
      to: formatDateForApi(dateRange?.to),
    }),
    [dateRange]
  );

  // Example: console.log or send to API on date change
  React.useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      // Now both formattedRange.from and formattedRange.to will be correct, e.g., "2026-01-01"
      console.log("Date range (safe for API):", formattedRange);
    }
  }, [formattedRange, dateRange]);

  return (
    <div className="w-full space-y-2 z-50">
      <div className="relative z-50">
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
              selected={dateRange}
              onSelect={(r: DateRange | undefined) => {
                if (r?.from && r?.to && r.from.getTime() !== r.to.getTime()) {
                  setDateRange(r);
                  setOpen(false);
                } else {
                  setDateRange(
                    r?.from ? { from: r.from, to: undefined } : undefined
                  );
                }
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
};

export default Header;
