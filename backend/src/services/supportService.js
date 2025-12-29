/**
 * Support Service
 * Handles support operations and audit logging
 */

import { supabase } from '../config/supabase.js';

/**
 * Log support action
 * @param {object} logData - Log data
 * @returns {Promise<object>} Created log
 */
export async function logSupportAction({
  agentId,
  organizationId = null,
  actionType,
  metadata = {},
}) {
  const { data, error } = await supabase
    .from('support_access_logs')
    .insert({
      agent_id: agentId,
      organization_id: organizationId,
      action_type: actionType,
      accessed_data: metadata,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to log support action:', error);
    return null;
  }

  return data;
}

/**
 * Get support agent by user ID
 * @param {string} userId - User ID (UUID)
 * @returns {Promise<object|null>} Support agent data
 */
export async function getSupportAgent(userId) {
  const { data, error } = await supabase
    .from('support_agents')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Check if user is support agent
 * @param {string} userId - User ID (UUID)
 * @returns {Promise<boolean>} True if support agent
 */
export async function isSupportAgent(userId) {
  const agent = await getSupportAgent(userId);
  return agent !== null;
}

