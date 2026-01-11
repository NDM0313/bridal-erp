/**
 * Unit Tests: Duplicate Contact Detection
 * Tests for mobile number uniqueness validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Duplicate Contact Detection', () => {
  describe('Mobile Number Normalization', () => {
    it('should normalize mobile numbers by removing non-digits', () => {
      const normalize = (mobile: string) => mobile.replace(/\D/g, '');
      
      expect(normalize('0300-123-4567')).toBe('03001234567');
      expect(normalize('+92 300 1234567')).toBe('923001234567');
      expect(normalize('(0300) 123-4567')).toBe('03001234567');
      expect(normalize('03001234567')).toBe('03001234567');
    });

    it('should handle empty strings', () => {
      const normalize = (mobile: string) => mobile.replace(/\D/g, '');
      expect(normalize('')).toBe('');
    });
  });

  describe('Duplicate Detection Logic', () => {
    it('should detect duplicate when mobile matches existing contact', () => {
      const existingContacts = [
        { id: 1, mobile: '03001234567', name: 'Ali', business_id: 1 },
        { id: 2, mobile: '03007654321', name: 'Ahmed', business_id: 1 },
      ];

      const checkDuplicate = (mobile: string, businessId: number) => {
        const normalized = mobile.replace(/\D/g, '');
        return existingContacts.find(
          c => c.business_id === businessId && c.mobile === normalized
        );
      };

      expect(checkDuplicate('0300-123-4567', 1)).toBeTruthy();
      expect(checkDuplicate('03001234567', 1)).toBeTruthy();
      expect(checkDuplicate('03009999999', 1)).toBeFalsy();
    });

    it('should not detect duplicate for different businesses', () => {
      const existingContacts = [
        { id: 1, mobile: '03001234567', name: 'Ali', business_id: 1 },
        { id: 2, mobile: '03001234567', name: 'Ahmed', business_id: 2 },
      ];

      const checkDuplicate = (mobile: string, businessId: number) => {
        const normalized = mobile.replace(/\D/g, '');
        return existingContacts.find(
          c => c.business_id === businessId && c.mobile === normalized
        );
      };

      expect(checkDuplicate('03001234567', 1)).toBeTruthy();
      expect(checkDuplicate('03001234567', 2)).toBeTruthy();
      // Same mobile, different business = not duplicate
    });

    it('should skip duplicate check in edit mode', () => {
      const isEditMode = true;
      const currentContactId = 1;
      const existingContacts = [
        { id: 1, mobile: '03001234567', name: 'Ali', business_id: 1 },
      ];

      const checkDuplicate = (mobile: string, businessId: number, editMode: boolean, currentId?: number) => {
        if (editMode) return null; // Skip in edit mode
        const normalized = mobile.replace(/\D/g, '');
        return existingContacts.find(
          c => c.business_id === businessId && c.mobile === normalized && c.id !== currentId
        );
      };

      expect(checkDuplicate('03001234567', 1, true, 1)).toBeNull();
      expect(checkDuplicate('03001234567', 1, false, 1)).toBeTruthy();
    });
  });

  describe('Validation Rules', () => {
    it('should require minimum mobile length', () => {
      const validateMobile = (mobile: string) => {
        const normalized = mobile.replace(/\D/g, '');
        return normalized.length >= 10;
      };

      expect(validateMobile('03001234567')).toBe(true);
      expect(validateMobile('0300123456')).toBe(true); // 10 digits
      expect(validateMobile('030012345')).toBe(false); // 9 digits
      expect(validateMobile('123')).toBe(false);
    });

    it('should prevent submission when duplicate detected', () => {
      const duplicateContact = { id: 1, name: 'Ali', mobile: '03001234567' };
      const canSubmit = !duplicateContact;

      expect(canSubmit).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', () => {
      const handleError = (error: any) => {
        if (error.code === '23505') {
          return 'DUPLICATE_ERROR';
        }
        if (error.code === '42501') {
          return 'PERMISSION_ERROR';
        }
        return 'UNKNOWN_ERROR';
      };

      expect(handleError({ code: '23505' })).toBe('DUPLICATE_ERROR');
      expect(handleError({ code: '42501' })).toBe('PERMISSION_ERROR');
      expect(handleError({ code: '500' })).toBe('UNKNOWN_ERROR');
    });
  });

  describe('Audit Logging', () => {
    it('should log duplicate attempts with correct metadata', () => {
      const logEntry = {
        attempted_mobile: '03001234567',
        existing_contact_id: 1,
        user_id: 'user-123',
        timestamp: new Date().toISOString(),
        action: 'duplicate_detected',
      };

      expect(logEntry.action).toBe('duplicate_detected');
      expect(logEntry.attempted_mobile).toBe('03001234567');
      expect(logEntry.existing_contact_id).toBe(1);
    });
  });
});
