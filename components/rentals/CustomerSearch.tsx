'use client';

import React, { useState, useEffect } from 'react';
import { User, Plus, Search, Check, ChevronsUpDown } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { supabase } from '@/utils/supabase/client';
import { QuickAddContactModal, Contact } from './QuickAddContactModal';

export type { Contact };

interface CustomerSearchProps {
  onSelect: (contact: Contact) => void;
  selectedContact?: Contact | null;
}

export const CustomerSearch = ({ onSelect, selectedContact }: CustomerSearchProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(selectedContact?.name || '');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Load customers from Supabase
  useEffect(() => {
    const loadContacts = async () => {
      if (!open) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('contacts')
          .select('id, name, mobile, email, type')
          .or('type.eq.customer,type.eq.both')
          .order('name')
          .limit(50);

        if (error) throw error;

        if (data) {
          setContacts(
            data.map((c) => ({
              id: c.id,
              name: c.name,
              mobile: c.mobile || undefined,
              email: c.email || undefined,
              type: c.type as 'customer' | 'supplier' | 'both',
            }))
          );
        }
      } catch (error) {
        console.error('Failed to load contacts:', error);
        setContacts([]);
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, [open]);

  // Update search term when selected contact changes
  useEffect(() => {
    if (selectedContact) {
      setSearchTerm(selectedContact.name);
    }
  }, [selectedContact]);

  const handleSelect = (contact: Contact) => {
    onSelect(contact);
    setOpen(false);
    setSearchTerm(contact.name);
  };

  const handleQuickAdd = (newContact: Contact) => {
    setContacts((prev) => [...prev, newContact]);
    handleSelect(newContact);
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.mobile?.includes(searchTerm) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search customer by name, phone, or email..."
          className="bg-gray-900 border-gray-700 pl-9 pr-9 text-white focus:border-pink-500 h-9 w-full"
          onClick={() => setOpen(true)}
          onFocus={() => setOpen(true)}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsQuickAddOpen(true)}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-gray-400 hover:text-white"
        >
          <Plus size={14} />
        </Button>
      </div>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-800 rounded-lg shadow-xl max-h-96 overflow-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-400 text-sm">Loading customers...</div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-gray-400 text-sm mb-2">No customers found.</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    setIsQuickAddOpen(true);
                  }}
                  className="text-blue-400 hover:text-blue-300"
                >
                  <Plus size={14} className="mr-2" />
                  Create "{searchTerm}"?
                </Button>
              </div>
            ) : (
              <div className="p-2">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleSelect(contact)}
                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-800 mb-1"
                  >
                    <div className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0 border border-gray-700">
                      <User size={14} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white truncate">{contact.name}</h4>
                      {contact.mobile && (
                        <p className="text-xs text-gray-500">{contact.mobile}</p>
                      )}
                    </div>
                    {selectedContact?.id === contact.id && (
                      <Check size={16} className="text-green-400 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <QuickAddContactModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSave={handleQuickAdd}
        initialName={searchTerm}
        contactType="customer"
      />
    </>
  );
};

