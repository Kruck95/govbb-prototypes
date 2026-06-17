import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormSchema } from '../../types/schema';
import { lintSchema } from '../../lib/lints';
import { downloadSchemaZip } from '../../lib/export-zip';
import { slugify } from '../../lib/slug';
import {
  fetchAuthState,
  loginWithGithub,
  logout,
  saveToLibrary,
  type AuthState,
  type SaveResult,
} from '../../lib/github-api';

interface SaveModalProps {
  open: boolean;
  schema: FormSchema;
  onClose: () => void;
  onSchemaChange: (next: FormSchema) => void;
}

const DEFAULT_REPO = 'govbb-prototypes';

export function SaveModal({ open, schema, onClose, onSchemaChange }: SaveModalProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'zip' | 'library' | null>(null);
  const [zipSlug, setZipSlug] = useState<string | null>(null);
  const [savedResult, setSavedResult] = useState<SaveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [owner, setOwner] = useState<string>('');
  const [repo, setRepo] = useState<string>(DEFAULT_REPO);

  const lints = useMemo(() => lintSchema(schema), [schema]);
  const warnCount = lints.filter((l) => l.level === 'warn').length;
  const infoCount = lints.filter((l) => l.level === 'info').length;

  /* ── Auth state on open + on the OAuth redirect-back ──────────────── */
  useEffect(() => {
    if (!open) return;
    fetchAuthState().then((a) => {
      setAuth(a);
      if (a.authed && !owner) {
        // Prefer an org with a govbb-prototypes-shaped repo if obvious;
        // fall back to the user.
        const candidates = [...(a.orgs ?? []).map((o) => o.login), a.user?.login].filter(Boolean) as string[];
        setOwner(candidates[0] ?? '');
      }
    });
    // If we just came back from the OAuth callback, GitHub redirected
    // to /?auth=ok — clean the URL so a refresh doesn't re-trigger.
    const params = new URLSearchParams(window.location.search);
    if (params.has('auth')) {
      const status = params.get('auth');
      if (status !== 'ok') setError(`GitHub sign-in failed: ${status}`);
      params.delete('auth');
      const next = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
      window.history.replaceState({}, '', next);
    }
  }, [open, owner]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => titleRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function update<K extends keyof FormSchema['meta']>(key: K, value: FormSchema['meta'][K]) {
    onSchemaChange({ ...schema, meta: { ...schema.meta, [key]: value } });
  }
  function updateSlug(slug: string) {
    onSchemaChange({ ...schema, id: slugify(slug || 'prototype') });
  }

  async function handleDownloadZip() {
    setBusy('zip');
    setError(null);
    try {
      const slug = await downloadSchemaZip(schema);
      setZipSlug(slug);
    } catch (e: any) {
      setError(e?.message ?? 'Could not build zip.');
    } finally {
      setBusy(null);
    }
  }

  async function handleSaveToLibrary() {
    if (!auth?.authed || !owner) return;
    setBusy('library');
    setError(null);
    try {
      const result = await saveToLibrary({ schema, owner, repo, branch: 'main' });
      setSavedResult(result);
    } catch (e: any) {
      setError(e?.message ?? 'Save to library failed.');
    } finally {
      setBusy(null);
    }
  }

  async function handleSignOut() {
    await logout();
    setAuth({ authed: false, configured: auth?.configured ?? true });
    setOwner('');
  }

  const ownerOptions = [
    ...(auth?.orgs?.map((o) => o.login) ?? []),
    ...(auth?.user ? [auth.user.login] : []),
  ];

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/40" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-modal-title"
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      >
        <div className="w-full max-w-xl rounded-md bg-bb-white-00 shadow-2xl">
          <header className="flex items-center justify-between border-b border-bb-grey-00 px-5 py-4">
            <h2 id="save-modal-title" className="text-[1.25rem] font-bold">Save your prototype</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-sm px-2 py-1 text-bb-mid-grey-00 hover:bg-bb-grey-00">✕</button>
          </header>

          {savedResult ? (
            <SuccessLibrary result={savedResult} onClose={onClose} onSaveAgain={() => setSavedResult(null)} />
          ) : zipSlug ? (
            <SuccessZip slug={zipSlug} onClose={onClose} onSaveAgain={() => setZipSlug(null)} />
          ) : (
            <>
              <div className="space-y-4 px-5 py-5">
                <Labelled label="Form name">
                  <input
                    ref={titleRef}
                    type="text"
                    value={schema.meta.title}
                    onChange={(e) => update('title', e.target.value)}
                    className="govbb-input"
                  />
                </Labelled>

                <div className="grid grid-cols-2 gap-3">
                  <Labelled label="File name (slug)">
                    <input type="text" value={schema.id} onChange={(e) => updateSlug(e.target.value)} className="govbb-input" />
                  </Labelled>
                  <Labelled label="Reference tag (2–5 chars)">
                    <input
                      type="text"
                      maxLength={5}
                      value={schema.meta.referencePrefix}
                      onChange={(e) => update('referencePrefix', e.target.value.toUpperCase())}
                      className="govbb-input font-mono uppercase"
                    />
                  </Labelled>
                </div>

                <Labelled label="Ministry, department, or agency">
                  <input type="text" value={schema.meta.mda} onChange={(e) => update('mda', e.target.value)} className="govbb-input" />
                </Labelled>

                {/* Where to save */}
                <section className="rounded-sm border border-bb-grey-00 bg-[#f7f9fc] p-3 text-[0.875rem]">
                  <p className="mb-2 text-[0.75rem] font-bold uppercase tracking-wide text-bb-mid-grey-00">Where to save</p>
                  {!auth && <p className="text-bb-mid-grey-00">Checking sign-in…</p>}

                  {auth && !auth.configured && (
                    <div className="text-bb-mid-grey-00">
                      <p>GitHub sign-in is not configured on this machine yet.</p>
                      <p className="mt-1">
                        Follow <code>generator-v2/SETUP.md</code> to enable one-click <strong>Save to library</strong>. You can
                        still <strong>Download zip</strong> below.
                      </p>
                    </div>
                  )}

                  {auth && auth.configured && !auth.authed && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-bb-mid-grey-00">Sign in with GitHub to save the prototype directly into the library repo.</p>
                      <button
                        type="button"
                        onClick={loginWithGithub}
                        className="inline-flex items-center gap-1 rounded-sm border border-bb-black-00 bg-bb-white-00 px-3 py-1.5 text-[0.875rem] font-semibold hover:bg-[#f4f4f4]"
                      >
                        <GithubIcon /> Sign in with GitHub
                      </button>
                    </div>
                  )}

                  {auth?.authed && auth.user && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {auth.user.avatar && <img src={auth.user.avatar} alt="" className="size-5 rounded-full" />}
                          <span>Signed in as <strong>{auth.user.login}</strong></span>
                        </div>
                        <button type="button" onClick={handleSignOut} className="text-[0.8125rem] text-bb-teal-00 underline underline-offset-2 hover:no-underline">Sign out</button>
                      </div>
                      <div className="grid grid-cols-[1fr_1fr] gap-2">
                        <Labelled label="Owner (org or user)">
                          <select value={owner} onChange={(e) => setOwner(e.target.value)} className="govbb-input">
                            {ownerOptions.length === 0 && <option value="">No orgs/user found</option>}
                            {ownerOptions.map((o) => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        </Labelled>
                        <Labelled label="Repo">
                          <input type="text" value={repo} onChange={(e) => setRepo(e.target.value)} className="govbb-input" />
                        </Labelled>
                      </div>
                      <p className="text-[0.75rem] text-bb-mid-grey-00">
                        Commits to <code>{owner || '…'}/{repo}@main</code>. Lives at{' '}
                        <code>{owner || '…'}.github.io/{repo}/prototypes/{schema.id}.html</code>.
                      </p>
                    </div>
                  )}
                </section>

                {(warnCount > 0 || infoCount > 0) && (
                  <section className="rounded-sm border-l-4 border-bb-yellow-100 bg-bb-yellow-10 px-3 py-2 text-[0.875rem]">
                    <p className="font-semibold">
                      {warnCount > 0 && <span>⚠ {warnCount} warning{warnCount === 1 ? '' : 's'}</span>}
                      {warnCount > 0 && infoCount > 0 && <span> · </span>}
                      {infoCount > 0 && <span>ℹ {infoCount} suggestion{infoCount === 1 ? '' : 's'}</span>}
                      <span className="ml-1 font-normal text-bb-mid-grey-00">(you can save anyway)</span>
                    </p>
                    <ul className="mt-1 space-y-0.5 text-bb-mid-grey-00">
                      {lints.slice(0, 6).map((l, i) => (
                        <li key={i}>{l.level === 'warn' ? '⚠' : 'ℹ'} {l.message}</li>
                      ))}
                      {lints.length > 6 && <li>… and {lints.length - 6} more</li>}
                    </ul>
                  </section>
                )}

                {error && (
                  <section className="rounded-sm border-l-4 border-bb-red-00 bg-bb-red-10 px-3 py-2 text-[0.875rem] text-bb-red-00">
                    {error}
                  </section>
                )}
              </div>

              <footer className="flex items-center justify-end gap-2 border-t border-bb-grey-00 bg-[#f7f9fc] px-5 py-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-sm border border-bb-black-00 bg-bb-white-00 px-3 py-1.5 text-[0.875rem] font-semibold hover:bg-[#f4f4f4]"
                >Cancel</button>
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={busy !== null}
                  className="rounded-sm border border-bb-black-00 bg-bb-white-00 px-3 py-1.5 text-[0.875rem] font-semibold hover:bg-[#f4f4f4] disabled:opacity-60"
                >
                  {busy === 'zip' ? 'Packing…' : '📥 Download zip'}
                </button>
                {auth?.authed && (
                  <button
                    type="button"
                    onClick={handleSaveToLibrary}
                    disabled={busy !== null || !owner}
                    className="rounded-sm bg-bb-teal-00 px-3 py-1.5 text-[0.875rem] font-semibold text-bb-white-00 hover:bg-[#1a777d] disabled:opacity-60"
                  >
                    {busy === 'library' ? 'Saving…' : '💾 Save to library'}
                  </button>
                )}
              </footer>
            </>
          )}
        </div>
      </div>

      {/* small style block so the govbb-input class is shared */}
      <style>{`
        .govbb-input {
          width: 100%;
          border-radius: 0.25rem;
          border: 1.5px solid #99a8cc;
          background: #fff;
          padding: 0.5rem;
          font-size: 0.9375rem;
        }
        .govbb-input:focus { outline: none; border-color: #0e5f64; box-shadow: 0 0 0 2px rgba(48,192,200,0.4); }
      `}</style>
    </>
  );
}

function SuccessZip({ slug, onClose, onSaveAgain }: { slug: string; onClose: () => void; onSaveAgain: () => void }) {
  return (
    <div className="px-5 py-5">
      <div className="rounded-sm border-l-4 border-bb-green-100 bg-bb-green-10 p-3 text-[0.9375rem]">
        <p className="font-bold text-bb-green-00">✓ Downloaded {slug}.zip</p>
        <p className="mt-1 text-bb-mid-grey-00">In your Downloads folder. Unzip and double-click <code>index.html</code>.</p>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onSaveAgain} className="rounded-sm border border-bb-black-00 bg-bb-white-00 px-3 py-1.5 text-[0.875rem] font-semibold hover:bg-[#f4f4f4]">Save again</button>
        <button type="button" onClick={onClose} className="rounded-sm bg-bb-teal-00 px-3 py-1.5 text-[0.875rem] font-semibold text-bb-white-00 hover:bg-[#1a777d]">Close</button>
      </div>
    </div>
  );
}

function SuccessLibrary({ result, onClose, onSaveAgain }: { result: SaveResult; onClose: () => void; onSaveAgain: () => void }) {
  return (
    <div className="px-5 py-5">
      <div className="rounded-sm border-l-4 border-bb-green-100 bg-bb-green-10 p-3 text-[0.9375rem]">
        <p className="font-bold text-bb-green-00">✓ Saved to library — {result.slug}</p>
        <p className="mt-1 text-bb-mid-grey-00">Three files committed: the prototype HTML, the schema, and the reference-prefix entry.</p>
      </div>
      <ul className="mt-3 space-y-2 text-[0.875rem]">
        <li>
          <a href={result.commitUrl} target="_blank" rel="noreferrer" className="text-bb-teal-00 underline underline-offset-2 hover:no-underline">
            🔗 View commit on GitHub
          </a>
        </li>
        <li>
          <a href={result.livePreviewUrl} target="_blank" rel="noreferrer" className="text-bb-teal-00 underline underline-offset-2 hover:no-underline">
            🚀 Open live prototype (may take ~1 min to deploy)
          </a>
        </li>
        <li className="text-bb-mid-grey-00">
          Files: <code>{result.htmlPath}</code>, <code>{result.schemaPath}</code>
        </li>
      </ul>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onSaveAgain} className="rounded-sm border border-bb-black-00 bg-bb-white-00 px-3 py-1.5 text-[0.875rem] font-semibold hover:bg-[#f4f4f4]">Save again</button>
        <button type="button" onClick={onClose} className="rounded-sm bg-bb-teal-00 px-3 py-1.5 text-[0.875rem] font-semibold text-bb-white-00 hover:bg-[#1a777d]">Close</button>
      </div>
    </div>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.8125rem] font-semibold">{label}</span>
      {children}
    </label>
  );
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.7.5.5 5.6.5 12c0 5 3.3 9.3 7.8 10.8.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.5-.3-5.2-1.3-5.2-5.6 0-1.2.4-2.3 1.2-3.1-.1-.3-.5-1.5.1-3 0 0 1-.3 3.2 1.2.9-.3 2-.4 3-.4s2.1.1 3 .4c2.2-1.5 3.2-1.2 3.2-1.2.6 1.5.2 2.7.1 3 .8.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.3-5.2 5.6.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.5-1.5 7.8-5.8 7.8-10.8C23.5 5.6 18.3.5 12 .5z" />
    </svg>
  );
}
