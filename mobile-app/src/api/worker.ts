/**
 * Worker API
 * Handles production worker API calls
 */

import { apiClient } from './client.js';

export interface WorkerStep {
  step_id: number;
  order_no: string;
  step_name: string;
  step_qty: number | null;
  completed_qty: number;
  status: 'pending' | 'in_progress' | 'completed';
  started_at: string | null;
  completed_at: string | null;
}

export interface UpdateStepProgressRequest {
  completed_qty: number;
}

export interface UpdateStepStatusRequest {
  status: 'in_progress' | 'completed';
}

/**
 * Get assigned steps
 */
export async function getAssignedSteps(params?: {
  include_completed?: boolean;
}): Promise<WorkerStep[]> {
  const queryParams = new URLSearchParams();
  if (params?.include_completed) {
    queryParams.append('include_completed', 'true');
  }

  const endpoint = `/api/v1/worker/steps${queryParams.toString() ? `?${queryParams}` : ''}`;
  const response = await apiClient.get<{ data: WorkerStep[]; count: number }>(endpoint);
  return response.data || [];
}

/**
 * Update step progress
 */
export async function updateStepProgress(
  stepId: number,
  completedQty: number
): Promise<WorkerStep> {
  const response = await apiClient.patch<{ data: WorkerStep }>(
    `/api/v1/worker/steps/${stepId}/progress`,
    { completed_qty: completedQty }
  );
  return response.data || response;
}

/**
 * Update step status
 */
export async function updateStepStatus(
  stepId: number,
  status: 'in_progress' | 'completed'
): Promise<WorkerStep> {
  const response = await apiClient.patch<{ data: WorkerStep }>(
    `/api/v1/worker/steps/${stepId}/status`,
    { status }
  );
  return response.data || response;
}
