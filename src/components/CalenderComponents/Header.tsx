import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import type { DateRange } from "react-day-picker";

// Optional: override shadcn calendar styles for gray color scheme
const CalendarGrayOverride = () => (
  <style>{`
    /* Single selected day + range start/end -> BLACK circle */
    button[data-selected-single="true"],
    button[data-range-start="true"],
    button[data-range-end="true"] {
      background-color: #000000 !important;
      border-radius: 10px !important; /* Fixed syntax error: rounded -> border-radius */
      border: none !important;
      outline: none !important;
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

  // Handle Clear Action
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent bubbling issues
    setDateRange(undefined);
    // We do NOT close setOpen(false) here, because the user wants to pick a new range immediately
  };

  const formattedRange = React.useMemo(
    () => ({
      from: formatDateForApi(dateRange?.from),
      to: formatDateForApi(dateRange?.to),
    }),
    [dateRange]
  );

  React.useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
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
                "inline-flex items-center gap-2 rounded-md mt-2 px-3 py-1 text-sm text-gray-800 hover:bg-gray-200 transition-colors"
              )}
              type="button"
            >
              <CalendarIcon className="h-4 w-4 text-gray-500" />
              <span>{label}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 z-[70] rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-in fade-in overflow-hidden"
            align="start"
            side="bottom"
            sideOffset={8}
            onInteractOutside={() => setOpen(false)}
          >
            <div className="p-3">
              <CalendarGrayOverride />
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(r: DateRange | undefined) => {
                  // If user selects a full range, set it and close
                  if (r?.from && r?.to && r.from.getTime() !== r.to.getTime()) {
                    setDateRange(r);
                    setOpen(false);
                  } else {
                    // If user selects just start date (or clicks start date again)
                    setDateRange(
                      r?.from ? { from: r.from, to: undefined } : undefined
                    );
                  }
                }}
                numberOfMonths={1}
                pagedNavigation
                disabled={{ before: new Date() }}
              />
            </div>

            {/* --- Added Clear Button Footer --- */}
            <div className="border-t border-gray-100 p-2 bg-gray-50/50 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50"
                onClick={handleClear}
                disabled={!dateRange?.from} // Disable if nothing is selected
              >
                Clear Selection
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default Header;
