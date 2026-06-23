export interface EndpointDef {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  weight: number;
  query?: string;
  body?: () => Record<string, unknown>;
  auth?: boolean;
  expectations?: {
    maxLatencyP99?: number;
    minThroughput?: number;
    maxErrorRate?: number;
  };
}

export interface TestScenario {
  name: string;
  endpoints: EndpointDef[];
  connections: number;
  duration: number;
  rampUp?: number;
}

export interface Thresholds {
  GET: { p50: number; p90: number; p99: number };
  POST: { p50: number; p90: number; p99: number };
  PUT: { p50: number; p90: number; p99: number };
}

export interface PerfConfig {
  baseUrl: string;
  auth: {
    registerEndpoint: string;
    csrfEndpoint: string;
    signinEndpoint: string;
    sessionEndpoint: string;
  };
  thresholds: Thresholds;
  scenarios: Record<string, TestScenario>;
  endpoints: {
    P0: EndpointDef[];
    P1: EndpointDef[];
  };
  seeding: {
    users: number;
    bookingsPerUser: number;
    transactionsPerUser: number;
    clients: number;
    products: number;
  };
}

export const PERF_CONFIG: PerfConfig = {
  baseUrl: process.env.PERF_BASE_URL || 'http://localhost:3000',
  auth: {
    registerEndpoint: '/api/auth/register',
    csrfEndpoint: '/api/auth/csrf',
    signinEndpoint: '/api/auth/callback/credentials',
    sessionEndpoint: '/api/auth/session',
  },
  thresholds: {
    GET: { p50: 200, p90: 500, p99: 1000 },
    POST: { p50: 300, p90: 800, p99: 1500 },
    PUT: { p50: 300, p90: 800, p99: 1500 },
  },
  scenarios: {
    smoke: {
      name: 'Smoke Test',
      endpoints: [],
      connections: 5,
      duration: 30,
      rampUp: 5,
    },
    load: {
      name: 'Load Test',
      endpoints: [],
      connections: 25,
      duration: 60,
      rampUp: 10,
    },
    stress: {
      name: 'Stress Test',
      endpoints: [],
      connections: 100,
      duration: 30,
      rampUp: 10,
    },
    soak: {
      name: 'Soak Test',
      endpoints: [],
      connections: 25,
      duration: 300,
      rampUp: 30,
    },
    spike: {
      name: 'Spike Test',
      endpoints: [],
      connections: 25,
      duration: 60,
      rampUp: 5,
    },
    journey: {
      name: 'User Journey Test',
      endpoints: [],
      connections: 10,
      duration: 60,
      rampUp: 10,
    },
  },
  endpoints: {
    P0: [
      { path: '/api/dashboard/overview', method: 'GET', weight: 0.3, auth: true },
      { path: '/api/transactions/overview', method: 'GET', weight: 0.25, auth: true },
      { path: '/api/transactions', method: 'GET', weight: 0.2, query: '?view=month', auth: true },
      { path: '/api/bookings', method: 'GET', weight: 0.15, query: '', auth: true },
      {
        path: '/api/transactions',
        method: 'POST',
        weight: 0.1,
        auth: true,
        body: () => ({
          amount: Math.floor(Math.random() * 50000) + 1000,
          type: Math.random() > 0.5 ? 'INCOME' : 'EXPENSE',
          date: new Date().toISOString().split('T')[0],
          category: ['Photography Session', 'Equipment', 'Rent', 'Software', 'Travel', 'Marketing', 'Misc'][Math.floor(Math.random() * 7)],
          paymentMode: ['UPI', 'Cash', 'Bank Transfer', 'Card'][Math.floor(Math.random() * 4)],
          description: `Load test transaction ${Date.now()}`,
          status: 'SETTLED',
        }),
      },
    ],
    P1: [
      { path: '/api/bookings/overview', method: 'GET', weight: 0.3, auth: true },
      { path: '/api/clients', method: 'GET', weight: 0.2, auth: true },
      { path: '/api/products', method: 'GET', weight: 0.2, auth: true },
      { path: '/api/notifications', method: 'GET', weight: 0.15, auth: true },
      {
        path: '/api/bookings',
        method: 'POST',
        weight: 0.15,
        auth: true,
        body: () => {
          const categories = ['Wedding', 'Portrait', 'Event', 'Commercial'];
          const statuses = ['Confirmed', 'Pending', 'Partial'];
          return {
            category: categories[Math.floor(Math.random() * categories.length)],
            date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            time: `${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}:${String(Math.floor(Math.random() * 4) * 15).padStart(2, '0')} ${Math.random() > 0.5 ? 'AM' : 'PM'}`,
            location: 'Test Location',
            status: statuses[Math.floor(Math.random() * statuses.length)],
            packageName: 'Test Package',
            customData: { loadTest: true, timestamp: Date.now() },
          };
        },
      },
    ],
  },
  seeding: {
    users: 5,
    bookingsPerUser: 100,
    transactionsPerUser: 200,
    clients: 20,
    products: 10,
  },
};

export function getScenario(name: string): TestScenario {
  const base = PERF_CONFIG.scenarios[name];
  if (!base) throw new Error(`Unknown scenario: ${name}`);
  return {
    ...base,
    endpoints: [...PERF_CONFIG.endpoints.P0, ...PERF_CONFIG.endpoints.P1],
  };
}

export function getThresholds(): Thresholds {
  return PERF_CONFIG.thresholds;
}