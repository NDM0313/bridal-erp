/**
 * Event Service
 * Event-driven architecture for system events
 * 
 * PHASE D: Social Media Integration
 * - Decouples WhatsApp/social logic from core services
 * - Allows multiple listeners for same event
 * - Extensible for future integrations
 */

import { EventEmitter } from 'events';

/**
 * System Event Emitter
 * Singleton instance for system-wide events
 */
class SystemEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50); // Allow multiple listeners
  }

  /**
   * Emit system event
   * @param {string} eventName - Event name (e.g., 'sale.created')
   * @param {object} data - Event data
   */
  emitEvent(eventName, data) {
    this.emit(eventName, data);
    // Also emit wildcard event for global listeners
    this.emit('*', { event: eventName, data });
  }
}

// Singleton instance
export const systemEvents = new SystemEventEmitter();

/**
 * Event Names
 * Standardized event names for system events
 */
export const EVENT_NAMES = {
  // Sales
  SALE_CREATED: 'sale.created',
  SALE_COMPLETED: 'sale.completed',
  SALE_UPDATED: 'sale.updated',
  
  // Production
  PRODUCTION_CREATED: 'production.created',
  PRODUCTION_COMPLETED: 'production.completed',
  PRODUCTION_STEP_COMPLETED: 'production.step.completed',
  
  // Payments
  PAYMENT_RECEIVED: 'payment.received',
  
  // Orders
  ORDER_READY: 'order.ready',
};

/**
 * Helper function to emit events
 * @param {string} eventName - Event name
 * @param {object} data - Event data
 */
export function emitSystemEvent(eventName, data) {
  systemEvents.emitEvent(eventName, data);
}
