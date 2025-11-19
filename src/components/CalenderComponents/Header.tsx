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
    /* Main selected day, start/end of dateRange: gray-200, text gray-900 */
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

type HeaderProps = {
  dateRange: DateRange | undefined;
  setDateRange: (dateRange: DateRange | undefined) => void;
};

const Header: React.FC<HeaderProps> = ({ dateRange, setDateRange }) => {
  const [open, setOpen] = React.useState(false);
  // const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const btnRef = React.useRef<HTMLButtonElement>(null);

  // Compose the label
const label = React.useMemo(() => {
  const fmt = (d?: Date) => {
    if (!d) return "";
    return `${d.getDate()}.${d.getMonth() + 1}.`;
  };

  if (dateRange?.from && dateRange?.to) {
    return `${fmt(dateRange.from)} - ${fmt(dateRange.to)}`;
  }

  if (dateRange?.from) {
    return `${fmt(dateRange.from)} - …`;
  }

  return "Select dates";
}, [dateRange]);


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
              selected={dateRange}
              onSelect={(r: DateRange | undefined) => {
                if (r?.from && r?.to && r.from.getTime() !== r.to.getTime()) {
                  setDateRange(r);
                  setOpen(false);
                } else {
                  // If only one date picked, keep from, but set to undefined to force single-date mode
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
}


export default Header;