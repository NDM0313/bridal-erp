/**
 * SmartTable Component
 * Reusable data table with search, pagination, and mobile support
 * Follows dark mode design system (#111827)
 */

'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './Table';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface SmartTableProps<T> {
  data: T[];
  columns: Column<T>[];
  title?: string;
  onAdd?: () => void;
  addButtonLabel?: string;
  keyField: keyof T;
  searchPlaceholder?: string;
  itemsPerPage?: number;
  renderMobileCard?: (item: T) => React.ReactNode;
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
}

export function SmartTable<T extends Record<string, any>>({
  data,
  columns,
  title,
  onAdd,
  addButtonLabel = 'Add New',
  keyField,
  searchPlaceholder = 'Search...',
  itemsPerPage = 10,
  renderMobileCard,
  emptyMessage = 'No items found',
  emptyAction,
}: SmartTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    const term = searchTerm.toLowerCase();
    return data.filter((item) =>
      Object.values(item).some((val) =>
        String(val).toLowerCase().includes(term)
      )
    );
  }, [data, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      {(title || onAdd || searchTerm !== '') && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {title && (
            <div>
              <h2 className="text-xl font-bold text-white">{title}</h2>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500"
              />
            </div>

            {/* Add Button */}
            {onAdd && (
              <Button
                variant="primary"
                onClick={onAdd}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus size={18} className="mr-2" />
                {addButtonLabel}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block bg-[#111827] border border-gray-800 rounded-lg overflow-hidden">
        {paginatedData.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 mb-4">{emptyMessage}</p>
            {emptyAction && (
              <Button variant="outline" onClick={emptyAction.onClick} className="border-gray-700 text-gray-300 hover:bg-gray-800">
                {emptyAction.label}
              </Button>
            )}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-[#111827] border-b border-gray-800">
                  {columns.map((column) => (
                    <TableHead 
                      key={column.key} 
                      className={cn(
                        "text-[11px] uppercase tracking-wider font-semibold text-gray-500",
                        column.className
                      )}
                    >
                      {column.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((item) => (
                  <TableRow
                    key={String(item[keyField])}
                    className="hover:bg-gray-800/30 transition-colors"
                  >
                    {columns.map((column) => (
                      <TableCell key={column.key} className={column.className}>
                        {column.render
                          ? column.render(item)
                          : String(item[column.key] || '—')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-800 flex items-center justify-between text-sm text-gray-400">
                <span>
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of{' '}
                  {filteredData.length} items
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="text-gray-400 hover:text-white hover:bg-gray-800"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </Button>
                  <span className="text-gray-500">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="text-gray-400 hover:text-white hover:bg-gray-800"
                  >
                    Next
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile Card View */}
      {renderMobileCard && (
        <div className="md:hidden space-y-4">
          {paginatedData.length === 0 ? (
            <div className="p-8 text-center bg-gray-900 border border-gray-800 rounded-lg">
              <p className="text-gray-400 mb-4">{emptyMessage}</p>
              {emptyAction && (
                <Button variant="outline" onClick={emptyAction.onClick} className="border-gray-700 text-gray-300">
                  {emptyAction.label}
                </Button>
              )}
            </div>
          ) : (
            <>
              {paginatedData.map((item) => (
                <div key={String(item[keyField])}>
                  {renderMobileCard(item)}
                </div>
              ))}
              {/* Mobile Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 bg-gray-900 border border-gray-800 rounded-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="text-gray-400"
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <span className="text-sm text-gray-400">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="text-gray-400"
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

