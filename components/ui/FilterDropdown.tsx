'use client';

import { useState } from 'react';
import { Filter, X, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { cn } from '@/lib/utils';

export interface FilterOptions {
  dateRange?: {
    start: string;
    end: string;
  };
  status?: string;
  category?: string;
  [key: string]: any;
}

interface FilterDropdownProps {
  onFilterChange: (filters: FilterOptions) => void;
  activeFilters?: FilterOptions;
  statusOptions?: Array<{ value: string; label: string }>;
  categoryOptions?: Array<{ value: string; label: string }>;
  showDateRange?: boolean;
  showStatus?: boolean;
  showCategory?: boolean;
}

export function FilterDropdown({
  onFilterChange,
  activeFilters = {},
  statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'paid', label: 'Paid' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'partial', label: 'Partial' },
  ],
  categoryOptions = [],
  showDateRange = true,
  showStatus = true,
  showCategory = false,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>(activeFilters);

  const hasActiveFilters = 
    filters.dateRange?.start || 
    filters.dateRange?.end || 
    (filters.status && filters.status !== 'all') ||
    filters.category;

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    const newFilters = {
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [type]: value,
      },
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters: FilterOptions = {};
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 transition-standard',
            hasActiveFilters && 'border-indigo-500 bg-indigo-500/10'
          )}
        >
          <Filter size={16} className="mr-2" />
          Filter
          {hasActiveFilters && (
            <span className="ml-2 px-1.5 py-0.5 bg-indigo-600 text-white text-xs rounded-full">
              {[
                filters.dateRange?.start && 1,
                filters.status && filters.status !== 'all' && 1,
                filters.category && 1,
              ].filter(Boolean).length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-slate-900 border-slate-800" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Filters</h3>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                <X size={14} className="mr-1" />
                Clear All
              </Button>
            )}
          </div>

          {showDateRange && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-400 flex items-center gap-2">
                <Calendar size={14} />
                Date Range
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Start Date</Label>
                  <Input
                    type="date"
                    value={filters.dateRange?.start || ''}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-200 text-xs h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">End Date</Label>
                  <Input
                    type="date"
                    value={filters.dateRange?.end || ''}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-200 text-xs h-8"
                  />
                </div>
              </div>
            </div>
          )}

          {showStatus && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-400 flex items-center gap-2">
                <CheckCircle size={14} />
                Status
              </Label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {statusOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="text-slate-200 hover:bg-slate-800"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showCategory && categoryOptions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Category</Label>
              <Select
                value={filters.category || 'all'}
                onValueChange={(value) => handleFilterChange('category', value === 'all' ? undefined : value)}
              >
                <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200 h-8 text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="all" className="text-slate-200 hover:bg-slate-800">
                    All Categories
                  </SelectItem>
                  {categoryOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="text-slate-200 hover:bg-slate-800"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

