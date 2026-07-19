import { httpClient } from '../../api/http-client';
import type { HealthResponse } from './health.types';

export async function getHealth(): Promise<HealthResponse> {
  const response = await httpClient.get<HealthResponse>('/health');

  return response.data;
}