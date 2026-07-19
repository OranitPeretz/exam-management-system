export interface HealthResponse {
  data: {
    status: 'ok';
    service: string;
    timestamp: string;
  };
}