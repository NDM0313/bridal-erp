'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears, isSameDay } from 'date-fns';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface DateRangePickerProps {
  value: { from: string; to: string };
  onChange: (range: { from: string; to: string }) => void;
  className?: string;
  firstTransactionDate?: string | null; // First transaction date for "All Transactions"
}

type PresetRange = {
  label: string;
  getValue: () => { from: Date; to: Date };
};

export function DateRangePicker({ value, onChange, className, firstTransactionDate }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange>({
    from: value.from ? new Date(value.from) : null,
    to: value.to ? new Date(value.to) : null,
  });
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const pickerRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const currentYear = today.getFullYear();

  // Preset ranges
  const presetRanges: PresetRange[] = [
    {
      label: 'Today',
      getValue: () => {
        const date = new Date();
        return { from: startOfDay(date), to: endOfDay(date) };
      },
    },
    {
      label: 'Yesterday',
      getValue: () => {
        const date = subDays(today, 1);
        return { from: startOfDay(date), to: endOfDay(date) };
      },
    },
    {
      label: 'Last 7 Days',
      getValue: () => {
        return { from: startOfDay(subDays(today, 6)), to: endOfDay(today) };
      },
    },
    {
      label: 'Last 30 Days',
      getValue: () => {
        return { from: startOfDay(subDays(today, 29)), to: endOfDay(today) };
      },
    },
    {
      label: 'This Month',
      getValue: () => {
        return { from: startOfMonth(today), to: endOfMonth(today) };
      },
    },
    {
      label: 'Last Month',
      getValue: () => {
        const lastMonth = subMonths(today, 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      },
    },
    {
      label: 'This Year',
      getValue: () => {
        return { from: startOfYear(today), to: endOfYear(today) };
      },
    },
    {
      label: 'Last Year',
      getValue: () => {
        const lastYear = subYears(today, 1);
        return { from: startOfYear(lastYear), to: endOfYear(lastYear) };
      },
    },
    {
      label: 'All Transactions',
      getValue: () => {
        // Get first transaction date or start of current year, whichever is earlier
        const firstDate = firstTransactionDate 
          ? new Date(firstTransactionDate)
          : new Date(new Date().getFullYear(), 0, 1);
        return { from: startOfDay(firstDate), to: endOfDay(today) };
      },
    },
    {
      label: 'Custom Range',
      getValue: () => {
        return { from: selectedRange.from || today, to: selectedRange.to || today };
      },
    },
  ];

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePresetClick = (preset: PresetRange) => {
    const range = preset.getValue();
    setSelectedRange(range);
    if (preset.label !== 'Custom Range') {
      applyRange(range);
    }
  };

  const applyRange = (range: DateRange) => {
    if (range.from && range.to) {
      onChange({
        from: format(range.from, 'yyyy-MM-dd'),
        to: format(range.to, 'yyyy-MM-dd'),
      });
      setIsOpen(false);
    }
  };

  const clearRange = () => {
    const startOfYearDate = startOfYear(today);
    const endOfYearDate = endOfYear(today);
    setSelectedRange({ from: startOfYearDate, to: endOfYearDate });
    onChange({
      from: format(startOfYearDate, 'yyyy-MM-dd'),
      to: format(endOfYearDate, 'yyyy-MM-dd'),
    });
    setIsOpen(false);
  };

  const handleDateClick = (date: Date) => {
    if (!selectedRange.from || (selectedRange.from && selectedRange.to)) {
      // Start new selection
      setSelectedRange({ from: date, to: null });
    } else if (selectedRange.from && !selectedRange.to) {
      // Complete selection
      if (date < selectedRange.from) {
        // If clicked date is before from, swap them
        setSelectedRange({ from: date, to: selectedRange.from });
      } else {
        setSelectedRange({ ...selectedRange, to: date });
      }
    }
  };

  const isDateInRange = (date: Date) => {
    if (!selectedRange.from) return false;
    if (selectedRange.to) {
      return date >= selectedRange.from && date <= selectedRange.to;
    }
    if (hoveredDate) {
      const start = selectedRange.from < hoveredDate ? selectedRange.from : hoveredDate;
      const end = selectedRange.from > hoveredDate ? selectedRange.from : hoveredDate;
      return date >= start && date <= end;
    }
    return isSameDay(date, selectedRange.from);
  };

  const isDateSelected = (date: Date) => {
    return (
      (selectedRange.from && isSameDay(date, selectedRange.from)) ||
      (selectedRange.to && isSameDay(date, selectedRange.to))
    );
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth2 = () => {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    setCurrentMonth(next);
  };

  const prevMonth2 = () => {
    const prev = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    setCurrentMonth(prev);
  };

  const displayValue = selectedRange.from && selectedRange.to
    ? `${format(selectedRange.from, 'dd-MM-yyyy')} - ${format(selectedRange.to, 'dd-MM-yyyy')}`
    : 'Select date range';

  const currentMonthDays = getDaysInMonth(currentMonth);
  const nextMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  const nextMonthDays = getDaysInMonth(nextMonthDate);

  return (
    <div className={cn('relative', className)} ref={pickerRef}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-start text-left font-normal h-10 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
      >
        <Calendar className="mr-2 h-4 w-4" />
        {displayValue}
      </Button>

      {isOpen && (
        <div className="absolute z-[100] mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-4 w-[800px] backdrop-blur-0">
          <div className="flex gap-4">
            {/* Preset Ranges */}
            <div className="w-48 border-r border-gray-700 pr-4">
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {presetRanges.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm rounded-lg transition-colors font-medium',
                      'hover:bg-gray-800 text-gray-200 hover:text-white',
                      preset.label === 'Custom Range' && selectedRange.from && selectedRange.to && !presetRanges.slice(0, -1).some(p => {
                        const presetRange = p.getValue();
                        return isSameDay(presetRange.from, selectedRange.from!) && isSameDay(presetRange.to, selectedRange.to!);
                      }) && 'bg-blue-600 text-white font-semibold'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar View */}
            <div className="flex-1">
              <div className="flex gap-4">
                {/* Current Month */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={prevMonth}
                      className="p-1 hover:bg-gray-800 rounded"
                    >
                      <ChevronLeft className="h-4 w-4 text-gray-400" />
                    </button>
                    <h3 className="text-sm font-semibold text-white antialiased">
                      {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </h3>
                    <button
                      onClick={nextMonth}
                      className="p-1 hover:bg-gray-800 rounded"
                    >
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayNames.map((day) => (
                      <div key={day} className="text-xs text-gray-500 text-center py-1">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {currentMonthDays.map((date, idx) => {
                      if (!date) {
                        return <div key={`empty-${idx}`} className="h-8" />;
                      }
                      const isSelected = isDateSelected(date);
                      const inRange = isDateInRange(date);
                      const isToday = isSameDay(date, today);

                      return (
                        <button
                          key={date.toISOString()}
                          onClick={() => handleDateClick(date)}
                          onMouseEnter={() => setHoveredDate(date)}
                          className={cn(
                            'h-8 rounded text-sm transition-colors font-medium antialiased',
                            isSelected
                              ? 'bg-blue-600 text-white font-semibold'
                              : inRange
                              ? 'bg-blue-600/40 text-white'
                              : isToday
                              ? 'bg-gray-700 text-white font-semibold'
                              : 'text-gray-200 hover:bg-gray-800 hover:text-white'
                          )}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Next Month */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={prevMonth2}
                      className="p-1 hover:bg-gray-800 rounded"
                    >
                      <ChevronLeft className="h-4 w-4 text-gray-400" />
                    </button>
                    <h3 className="text-sm font-semibold text-white antialiased">
                      {monthNames[nextMonthDate.getMonth()]} {nextMonthDate.getFullYear()}
                    </h3>
                    <button
                      onClick={nextMonth2}
                      className="p-1 hover:bg-gray-800 rounded"
                    >
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayNames.map((day) => (
                      <div key={day} className="text-xs text-gray-500 text-center py-1">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {nextMonthDays.map((date, idx) => {
                      if (!date) {
                        return <div key={`empty-${idx}`} className="h-8" />;
                      }
                      const isSelected = isDateSelected(date);
                      const inRange = isDateInRange(date);
                      const isToday = isSameDay(date, today);

                      return (
                        <button
                          key={date.toISOString()}
                          onClick={() => handleDateClick(date)}
                          onMouseEnter={() => setHoveredDate(date)}
                          className={cn(
                            'h-8 rounded text-sm transition-colors font-medium antialiased',
                            isSelected
                              ? 'bg-blue-600 text-white font-semibold'
                              : inRange
                              ? 'bg-blue-600/40 text-white'
                              : isToday
                              ? 'bg-gray-700 text-white font-semibold'
                              : 'text-gray-200 hover:bg-gray-800 hover:text-white'
                          )}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  {selectedRange.from && selectedRange.to
                    ? `${format(selectedRange.from, 'dd-MM-yyyy')} - ${format(selectedRange.to, 'dd-MM-yyyy')}`
                    : 'Select a date range'}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearRange}
                    className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                  >
                    Clear
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => applyRange(selectedRange)}
                    disabled={!selectedRange.from || !selectedRange.to}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

