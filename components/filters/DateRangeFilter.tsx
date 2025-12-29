'use client';

/**
 * Date Range Filter Component
 * Provides preset and custom date range selection
 */

import { useState } from 'react';
import { DateRange, getPresetRanges, getTodayRange } from '@/lib/utils/dateFilters';

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets?: DateRange[];
}

export function DateRangeFilter({ value, onChange, presets }: DateRangeFilterProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState(value.from);
  const [customTo, setCustomTo] = useState(value.to);

  const presetRanges = presets || getPresetRanges();

  const handlePresetSelect = (range: DateRange) => {
    onChange(range);
    setShowCustom(false);
  };

  const handleCustomApply = () => {
    const from = new Date(customFrom);
    const to = new Date(customTo);
    onChange({
      from: customFrom,
      to: customTo,
      label: 'Custom',
    });
    setShowCustom(false);
  };

  return (
    <div className="space-y-2">
      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2">
        {presetRanges.map((range) => (
          <button
            key={range.label}
            onClick={() => handlePresetSelect(range)}
            className={`px-3 py-1 text-sm border rounded-md transition-colors ${
              value.label === range.label
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {range.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`px-3 py-1 text-sm border rounded-md transition-colors ${
            showCustom || value.label === 'Custom'
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Custom
        </button>
      </div>

      {/* Custom Date Inputs */}
      {showCustom && (
        <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md border border-gray-200">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleCustomApply}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Current Selection Display */}
      <div className="text-xs text-gray-600">
        Selected: {value.label} ({value.from} to {value.to})
      </div>
    </div>
  );
}

