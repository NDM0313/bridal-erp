/**
 * ContactSelect Component
 * Reusable select with search and Quick-Add fallback for Customers/Suppliers
 * Features:
 * - Portal rendering for z-index safety
 * - Search with debounce
 * - "+ Add New [Name]" option when no results found
 * - Smooth icon hide/padding shift
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Plus, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Contact {
  id: number;
  name: string;
  type?: string;
  email?: string;
  phone?: string;
}

interface ContactSelectProps {
  value: string;
  onChange: (contactId: string, contactName: string) => void;
  onAddNew: (searchTerm: string) => void;
  contacts: Contact[];
  placeholder?: string;
  label?: string;
  type: 'customer' | 'supplier';
  className?: string;
}

export function ContactSelect({
  value,
  onChange,
  onAddNew,
  contacts,
  placeholder = 'Search...',
  label,
  type,
  className
}: ContactSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter contacts based on search term
  const filteredContacts = searchTerm.trim().length > 0
    ? contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (contact.phone && contact.phone.includes(searchTerm))
      )
    : contacts;

  const showAddButton = searchTerm.trim().length >= 3 && filteredContacts.length === 0;

  // Get selected contact name
  const selectedContact = contacts.find(c => c.id.toString() === value);
  const displayValue = selectedContact ? selectedContact.name : '';

  // Update dropdown position
  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleResize = () => requestAnimationFrame(updatePosition);
      const handleScroll = () => requestAnimationFrame(updatePosition);
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          Math.min(prev + 1, (showAddButton ? filteredContacts.length : filteredContacts.length - 1))
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (showAddButton && highlightedIndex === filteredContacts.length) {
          handleAddNew();
        } else if (filteredContacts[highlightedIndex]) {
          handleSelect(filteredContacts[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (contact: Contact) => {
    onChange(contact.id.toString(), contact.name);
    setSearchTerm('');
    setIsOpen(false);
    setHighlightedIndex(0);
  };

  const handleAddNew = () => {
    onAddNew(searchTerm.trim());
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onChange('', '');
    setSearchTerm('');
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dropdownContent = isOpen && (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`,
        zIndex: 999999
      }}
      className="bg-[#0f172a] border border-indigo-500/30 rounded-lg shadow-2xl shadow-indigo-500/20 max-h-60 overflow-y-auto"
    >
      {filteredContacts.length > 0 ? (
        <div className="py-1">
          {filteredContacts.map((contact, index) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => handleSelect(contact)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={cn(
                'w-full px-4 py-2.5 text-left transition-colors',
                'flex items-center gap-3',
                highlightedIndex === index
                  ? 'bg-indigo-500/20 text-white'
                  : 'text-gray-300 hover:bg-indigo-500/10'
              )}
            >
              <User size={16} className="text-indigo-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{contact.name}</div>
                {(contact.email || contact.phone) && (
                  <div className="text-xs text-gray-500 truncate">
                    {contact.email || contact.phone}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : showAddButton ? (
        <button
          type="button"
          onClick={handleAddNew}
          onMouseEnter={() => setHighlightedIndex(filteredContacts.length)}
          className={cn(
            'w-full px-4 py-3 text-left transition-colors',
            'flex items-center gap-3 border-t border-indigo-500/20',
            highlightedIndex === filteredContacts.length
              ? 'bg-green-500/20 text-green-300'
              : 'text-green-400 hover:bg-green-500/10'
          )}
        >
          <Plus size={18} className="flex-shrink-0" />
          <div>
            <div className="font-semibold">Add New {type === 'customer' ? 'Customer' : 'Supplier'}</div>
            <div className="text-xs opacity-70">"{searchTerm}"</div>
          </div>
        </button>
      ) : (
        <div className="px-4 py-6 text-center text-gray-500 text-sm">
          No {type === 'customer' ? 'customers' : 'suppliers'} found
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-400 mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        {/* Search Icon */}
        <Search
          size={18}
          className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none',
            'transition-opacity duration-300',
            (isOpen || searchTerm.length > 0 || displayValue) ? 'opacity-0' : 'opacity-100'
          )}
        />

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : displayValue}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearchTerm('');
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'w-full bg-[#1e293b] border border-gray-700 rounded-lg py-2.5 text-white',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
            'transition-all duration-300',
            (isOpen || searchTerm.length > 0 || displayValue) ? 'pl-3' : 'pl-10',
            'pr-10'
          )}
        />

        {/* Clear Button */}
        {(displayValue || searchTerm) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Portal Dropdown */}
      {typeof window !== 'undefined' && createPortal(dropdownContent, document.body)}
    </div>
  );
}

