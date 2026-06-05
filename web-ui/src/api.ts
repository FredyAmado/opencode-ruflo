const BASE = '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }
  return res.json();
}

export interface Agent {
  id: number; name: string; type: string; description: string;
  model: string | null; config: string; status: string;
  created_at: string; updated_at: string;
}

export interface Task {
  id: number; agent_id: number; type: string; status: string;
  input: string; output: string | null; error: string | null;
  created_at: string;
}

export interface Swarm {
  id: number; name: string; topology: string; status: string;
  worker_ids: string; result: string | null;
  created_at: string;
}

export interface Observation {
  id: number; agent_id: number | null; type: string;
  content: string; tags: string; created_at: string;
}

export interface Context {
  id: number; key: string; value: string; description: string | null;
}

export interface Plugin {
  id: number; name: string; version: string; description: string;
  enabled: number; agent_count: number; created_at: string;
}

export const api = {
  health: () => request<{ status: string; version: string }>('/api/health'),
  agents: {
    list: () => request<Agent[]>('/api/agents'),
    get: (id: number) => request<Agent>(`/api/agents/${id}`),
    spawn: (id: number, prompt: string) =>
      request<{ taskId: number; response: string }>(`/api/agents/${id}/spawn`, {
        method: 'POST', body: JSON.stringify({ prompt }),
      }),
    tasks: (id: number) => request<Task[]>(`/api/agents/${id}/tasks`),
  },
  swarms: {
    list: () => request<Swarm[]>('/api/swarms'),
    get: (id: number) => request<Swarm>(`/api/swarms/${id}`),
    create: (name: string, topology: string, worker_ids: number[]) =>
      request<{ id: number }>('/api/swarms', {
        method: 'POST',
        body: JSON.stringify({ name, topology, worker_ids }),
      }),
    execute: (id: number, objective: string) =>
      request<{ status: string; result: string }>(`/api/swarms/${id}/execute`, {
        method: 'POST', body: JSON.stringify({ objective }),
      }),
    tasks: (id: number) => request<Task[]>(`/api/swarms/${id}/tasks`),
  },
  observations: {
    list: (params?: { q?: string; type?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.q) qs.set('q', params.q);
      if (params?.type) qs.set('type', params.type);
      if (params?.limit) qs.set('limit', String(params.limit));
      const q = qs.toString();
      return request<Observation[]>(`/api/observations${q ? '?' + q : ''}`);
    },
    create: (data: { type?: string; content: string; tags?: string[]; agent_id?: number | null }) =>
      request<{ id: number }>('/api/observations', {
        method: 'POST', body: JSON.stringify(data),
      }),
  },
  context: {
    list: () => request<Context[]>('/api/context'),
    get: (key: string) => request<Context>(`/api/context/${encodeURIComponent(key)}`),
    set: (key: string, value: string, description?: string) =>
      request<{ success: boolean }>(`/api/context/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: JSON.stringify({ value, description }),
      }),
    delete: (key: string) =>
      request<{ success: boolean }>(`/api/context/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      }),
  },
  plugins: {
    list: () => request<Plugin[]>('/api/plugins'),
    scan: () => request<{ loaded: number }>('/api/plugins/scan', { method: 'POST' }),
    enable: (name: string) =>
      request<{ success: boolean }>(`/api/plugins/${name}/enable`, { method: 'PUT' }),
    disable: (name: string) =>
      request<{ success: boolean }>(`/api/plugins/${name}/disable`, { method: 'PUT' }),
  },
};
