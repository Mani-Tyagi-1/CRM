import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseDMY(dateStr: string): Date | null {
  const match = dateStr.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  if (!match) return null;
  const [, d, m, y] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

function getDateRangeStrings(start: Date, end: Date): string[] {
  const arr = [];
  let cur = new Date(start);
  while (cur <= end) {
    arr.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return arr;
}

type OccurrenceType = {
  date: string; // "14. 3. 2025 - 19. 3. 2025"
  contractName: string;
};

type Props = {
  occurrences: OccurrenceType[];
  highlightColorClass: string; // e.g. "bg-blue-500" or "bg-amber-500"
};

const ResourceCalendar: React.FC<Props> = ({
  occurrences,
  highlightColorClass,
}) => {
  const [baseMonth, setBaseMonth] = useState(new Date());

  const blockedDates = useMemo(() => {
    const set = new Set<string>();
    for (const occ of occurrences) {
      const parts = occ.date.split("-");
      if (parts.length === 2) {
        const start = parseDMY(parts[0].trim());
        const end = parseDMY(parts[1].trim());
        if (start && end) {
          for (const d of getDateRangeStrings(start, end)) {
            set.add(d);
          }
        }
      }
    }
    return set;
  }, [occurrences]);

  const addMonths = (date: Date, count: number) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + count);
    return d;
  };

  const generateCalendarDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();
    const days: {
      day: number;
      isCurrentMonth: boolean;
      fullDate: Date;
    }[] = [];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const fullDate = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({ day: daysInPrevMonth - i, isCurrentMonth: false, fullDate });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const fullDate = new Date(year, month, day);
      days.push({ day, isCurrentMonth: true, fullDate });
    }
    const remainingCells = 42 - days.length;
    for (let day = 1; day <= remainingCells; day++) {
      const fullDate = new Date(year, month + 1, day);
      days.push({ day, isCurrentMonth: false, fullDate });
    }
    return days;
  };

  const renderMonth = (monthDate: Date, showChevrons = true) => (
    <div className={showChevrons ? "mb-8" : ""}>
      <div className="flex items-center justify-between mb-2">
        {showChevrons ? (
          <>
            <button
              onClick={() => setBaseMonth(addMonths(baseMonth, -1))}
              className="p-1"
            >
              <ChevronLeft className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
            <div className="text-center text-sm font-medium text-gray-700">
              {monthNames[monthDate.getMonth()]} {monthDate.getFullYear()}
            </div>
            <button
              onClick={() => setBaseMonth(addMonths(baseMonth, 1))}
              className="p-1"
            >
              <ChevronRight className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          </>
        ) : (
          <>
            <div className="w-5" />
            <div className="text-center text-sm font-medium text-gray-700">
              {monthNames[monthDate.getMonth()]} {monthDate.getFullYear()}
            </div>
            <div className="w-5" />
          </>
        )}
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500 py-1"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {generateCalendarDays(monthDate).map((date, idx) => {
          const dateStr = date.fullDate.toISOString().slice(0, 10);
          const isBlocked = date.isCurrentMonth && blockedDates.has(dateStr);
          return (
            <div
              key={idx}
              className={`
                w-8 h-8 text-sm flex items-center justify-center rounded
                ${!date.isCurrentMonth ? "text-gray-300" : ""}
                ${
                  date.isCurrentMonth && isBlocked
                    ? highlightColorClass + " text-white font-semibold"
                    : ""
                }
                ${date.isCurrentMonth && !isBlocked ? "bg-white" : ""}
              `}
            >
              {date.day}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="w-1/3 p-8 bg-gray-50 rounded-lg">
      {renderMonth(baseMonth, true)}
      {renderMonth(addMonths(baseMonth, 1), false)}
    </div>
  );
};

export default ResourceCalendar;
