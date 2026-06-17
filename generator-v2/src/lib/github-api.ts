/**
 * Frontend client for the api-server.js OAuth + save-to-library routes.
 * Calls go through the Vite proxy so cookies and redirects work cleanly
 * on a single origin (localhost:5173 → localhost:3001).
 */

import type { FormSchema } from '../types/schema';
import { exportSchemaToHtml } from './export-html';

export interface AuthState {
  authed: boolean;
  configured: boolean;
  user?: { login: string; name?: string | null; avatar?: string };
  orgs?: { login: string; avatar?: string }[];
  error?: string;
}

export async function fetchAuthState(): Promise<AuthState> {
  try {
    const res = await fetch('/api/auth/github/me', { credentials: 'include' });
    if (!res.ok) return { authed: false, configured: false, error: `HTTP ${res.status}` };
    return await res.json();
  } catch (e: any) {
    return { authed: false, configured: false, error: e?.message ?? 'Network error' };
  }
}

/** Browser-level redirect to start the OAuth flow. */
export function loginWithGithub(): void {
  window.location.href = '/api/auth/github/login';
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/github/logout', { method: 'POST', credentials: 'include' });
}

export interface SaveResult {
  ok: true;
  slug: string;
  commitUrl: string;
  htmlPath: string;
  schemaPath: string;
  livePreviewUrl: string;
}

export async function saveToLibrary(opts: {
  schema: FormSchema;
  owner: string;
  repo: string;
  branch?: string;
}): Promise<SaveResult> {
  const { schema, owner, repo, branch = 'main' } = opts;
  const html = exportSchemaToHtml(schema);
  const res = await fetch('/api/save-to-library', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      owner,
      repo,
      branch,
      slug: schema.id,
      schema,
      html,
      formTitle: schema.meta.title,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Save failed (HTTP ${res.status})`);
  }
  return data as SaveResult;
}
