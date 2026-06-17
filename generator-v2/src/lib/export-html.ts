/**
 * Schema → self-contained HTML.
 *
 * Produces a single .html file the user can double-click anywhere
 * (no server, no dev tools) to see a working clickable prototype.
 * Uses the Tailwind CDN, Figtree font, and inline bb- design tokens
 * so the output matches every prototypes/*.html visually.
 *
 * Navigation is handled by a small vanilla-JS shim at the bottom of
 * the page. We're not embedding React or the GovBB framework — for a
 * phase-1 deliverable, vanilla JS keeps the file small and portable.
 */

import type { FormSchema, Field, Page } from '../types/schema';
import { isNationalIdField, NRN_EXAMPLE } from './id-format';

export function exportSchemaToHtml(schema: FormSchema): string {
  const pagesHtml = schema.flow
    .map((id) => {
      const page = schema.pages[id];
      return page ? renderPageHtml(schema, page) : '';
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(schema.meta.title)} – ${escapeHtml(schema.meta.mda || 'GovTech Barbados')}</title>
  <link rel="icon" href="https://upload.wikimedia.org/wikipedia/commons/e/ef/Flag_of_Barbados.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@300..900&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: ${JSON.stringify(BB_COLORS)},
          spacing: ${JSON.stringify(BB_SPACING)},
          fontFamily: { sans: ['Figtree', '-apple-system', 'system-ui', 'sans-serif'] },
          boxShadow: { 'form-hover': 'inset 4px 4px 0px 0px rgba(0,0,0,0.10)' },
          borderRadius: { sm: '0.25rem', md: '0.375rem', lg: '0.5rem' },
        }
      }
    };
  </script>
  <style>
    body { font-family: Figtree, -apple-system, system-ui, sans-serif; font-size: 1.25rem; line-height: 1.5; margin: 0; min-height: 100vh; display: grid; grid-template-rows: auto auto auto 1fr auto; background: #fff; color: #000; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 16px; }
    .gen-page { display: none; }
    .gen-page.active { display: block; }
  </style>
</head>
<body>

<div class="bg-bb-blue-100 text-bb-white-00">
  <div class="container flex items-center gap-2 py-2 text-[0.875rem]">
    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Coat_of_arms_of_Barbados_%282%29.svg/1280px-Coat_of_arms_of_Barbados_%282%29.svg.png" alt="Coat of arms of Barbados" style="height:20px;width:auto">
    Official website of the Government of Barbados
  </div>
</div>

<header class="bg-bb-yellow-100">
  <div class="container py-s">
    <p class="text-[1.5rem] font-bold">Government of Barbados</p>
  </div>
</header>

<div class="bg-bb-blue-10">
  <div class="container py-xs text-[1rem]">
    This page is in <a href="#" class="text-bb-teal-00 underline underline-offset-2 hover:no-underline">Alpha</a>. Your feedback helps us improve.
  </div>
</div>

<main>
  <div class="container py-l max-w-3xl">
${pagesHtml}
  </div>
</main>

<footer class="bg-bb-blue-100 text-bb-white-00">
  <div class="container py-m text-[1rem]">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <p>&copy; 2026 Government of Barbados. All rights reserved.</p>
      <div class="flex gap-4">
        <a href="#" class="underline underline-offset-2 hover:no-underline text-bb-white-00">Privacy</a>
        <a href="#" class="underline underline-offset-2 hover:no-underline text-bb-white-00">Terms</a>
        <a href="#" class="underline underline-offset-2 hover:no-underline text-bb-white-00">Accessibility</a>
      </div>
    </div>
  </div>
</footer>

<script>
  const SCHEMA = ${JSON.stringify({ id: schema.id, title: schema.meta.title, flow: schema.flow })};
  let _data = {};
  function showPage(id) {
    document.querySelectorAll('.gen-page').forEach(el => el.classList.remove('active'));
    const el = document.getElementById('page-' + id);
    if (el) { el.classList.add('active'); window.scrollTo(0,0); }
  }
  function goNext(fromId) {
    // Capture inputs from current page
    document.querySelectorAll('#page-' + fromId + ' input, #page-' + fromId + ' select, #page-' + fromId + ' textarea').forEach(el => {
      if (el.type === 'checkbox') _data[el.name] = el.checked;
      else _data[el.name] = el.value;
    });
    const idx = SCHEMA.flow.indexOf(fromId);
    const next = idx >= 0 && idx < SCHEMA.flow.length - 1 ? SCHEMA.flow[idx + 1] : null;
    if (next) showPage(next);
  }
  function goBack(fromId) {
    const idx = SCHEMA.flow.indexOf(fromId);
    const prev = idx > 0 ? SCHEMA.flow[idx - 1] : null;
    if (prev) showPage(prev);
  }
  // Start at the first page
  showPage(SCHEMA.flow[0]);
</script>

</body>
</html>`;
}

/* ─── Per-page rendering ───────────────────────────────────────────── */

function renderPageHtml(schema: FormSchema, page: Page): string {
  const isFirst = schema.flow[0] === page.id;
  const isLast = schema.flow[schema.flow.length - 1] === page.id;

  const back = !isFirst
    ? `<a href="#" onclick="goBack('${page.id}');return false;" class="inline-flex items-center gap-xs mb-s text-bb-teal-00 underline underline-offset-2 hover:no-underline">← Back</a>`
    : '';

  const caption =
    page.caption && schema.meta.title
      ? `<p class="border-l-4 border-bb-blue-40 py-xs pl-s text-bb-mid-grey-00 mb-xs">${escapeHtml(schema.meta.title)}</p>`
      : '';

  const heading = `<h1 class="font-bold text-[3.5rem] leading-[1.15] mb-m">${escapeHtml(page.title ?? page.id)}</h1>`;

  const body = renderPageBody(page);

  const actions = renderPageActions(page, isLast);

  return `<section id="page-${page.id}" class="gen-page">
  ${back}
  ${caption}
  ${heading}
  ${body}
  ${actions}
</section>`;
}

function renderPageBody(page: Page): string {
  if (page.type === 'start') {
    const intro = Array.isArray(page.intro) ? page.intro : page.intro ? [page.intro] : [];
    return `<div class="space-y-m text-[1.25rem]">
      ${intro.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
      ${page.eligibility ? renderList(page.eligibility.heading, page.eligibility.items) : ''}
      ${page.whatYouNeed ? renderList(page.whatYouNeed.heading, page.whatYouNeed.items) : ''}
    </div>`;
  }
  if (page.type === 'check') {
    return `<p class="text-[1.25rem] text-bb-mid-grey-00">Check your answers above before sending.</p>`;
  }
  if (page.type === 'confirmation') {
    return `<div class="bg-bb-teal-00 text-bb-white-00 p-m rounded-sm">
      <p class="text-[1.5rem]">Your reference number</p>
      <p class="text-[2rem] font-bold" id="ref-num">REF-${Math.random().toString(36).slice(2, 8).toUpperCase()}</p>
      <p class="mt-xs text-[1.25rem]">We will contact you within 5 working days.</p>
    </div>`;
  }

  const declarationBody =
    page.type === 'declaration' && page.body
      ? `<div class="border-l-4 border-bb-blue-40 bg-bb-blue-10 p-s mb-m text-[1.1rem]">${escapeHtml(page.body)}</div>`
      : '';

  const fields = (page.fields ?? []).map(renderFieldHtml).join('\n');
  return `<form novalidate onsubmit="event.preventDefault()" class="space-y-m">
    ${declarationBody}
    ${fields}
  </form>`;
}

function renderPageActions(page: Page, isLast: boolean): string {
  if (page.type === 'confirmation') return '';
  const label =
    page.type === 'start'
      ? page.startButton ?? 'Start now'
      : page.type === 'check'
        ? 'Submit application'
        : isLast
          ? 'Submit'
          : 'Continue';
  return `<div class="mt-m flex gap-4">
    <button type="button" onclick="goNext('${page.id}')" class="inline-flex items-center gap-2 bg-bb-teal-00 text-bb-white-00 hover:bg-[#1a777d] px-xm py-s rounded-sm text-[1.25rem]">
      ${escapeHtml(label)}
    </button>
  </div>`;
}

function renderList(heading: string, items: string[]): string {
  return `<div>
    <h2 class="font-bold text-[1.5rem] mb-xs">${escapeHtml(heading)}</h2>
    <ul class="list-disc pl-6 space-y-1">${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
  </div>`;
}

/* ─── Field rendering (mirrors src/components/renderer/fields/*) ──── */

function renderFieldHtml(field: Field): string {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'tel':
      return inputField(field, field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'text');
    case 'textarea':
      return textareaField(field);
    case 'date':
      return dateField(field);
    case 'select':
      return selectField(field);
    case 'radio':
      return radioField(field);
    case 'checkbox':
      return checkboxField(field);
    case 'file':
      return fileField(field);
    case 'static':
      return `<div class="border-l-4 border-bb-blue-40 bg-bb-blue-10 p-s text-[1.1rem]">${escapeHtml(field.label)}</div>`;
  }
}

const LABEL_CLS = 'block text-[1.25rem] font-bold text-bb-black-00';
const HINT_CLS = 'text-[1rem] text-bb-mid-grey-00';
const WRAP_CLS =
  'relative inline-flex w-full rounded-sm border-2 border-bb-black-00 items-center gap-2 transition-all bg-bb-white-00 hover:shadow-form-hover focus-within:ring-4 focus-within:ring-bb-teal-100';
const INPUT_CLS = 'w-full min-w-0 p-s outline-none rounded-[inherit] text-[1.25rem]';

function inputField(field: Field, inputType: string): string {
  const isId = isNationalIdField(field);
  const hint = field.hint ?? (isId ? `For example, ${NRN_EXAMPLE}` : undefined);
  const placeholder = field.placeholder ?? (isId ? NRN_EXAMPLE : undefined);
  // National ID / NRN: digits only, hyphen after the sixth, max 10 digits.
  const idAttrs = isId
    ? ` inputmode="numeric" maxlength="11" oninput="var d=this.value.replace(/\\D/g,'').slice(0,10);this.value=d.length>6?d.slice(0,6)+'-'+d.slice(6):d"`
    : field.inputmode ? ` inputmode="${field.inputmode}"` : '';
  return `<div class="flex flex-col gap-xs">
    <label for="${field.id}" class="${LABEL_CLS}">${escapeHtml(field.label)}</label>
    ${hint ? `<p class="${HINT_CLS}">${escapeHtml(hint)}</p>` : ''}
    <div class="${WRAP_CLS}">
      <input type="${inputType}" id="${field.id}" name="${field.id}"${field.required ? ' aria-required="true"' : ''}${placeholder ? ` placeholder="${escapeAttr(placeholder)}"` : ''}${idAttrs} class="${INPUT_CLS}">
    </div>
  </div>`;
}

function textareaField(field: Field): string {
  return `<div class="flex flex-col gap-xs">
    <label for="${field.id}" class="${LABEL_CLS}">${escapeHtml(field.label)}</label>
    ${field.hint ? `<p class="${HINT_CLS}">${escapeHtml(field.hint)}</p>` : ''}
    <div class="${WRAP_CLS}">
      <textarea id="${field.id}" name="${field.id}" rows="${field.rows ?? 5}" class="${INPUT_CLS} resize-y"></textarea>
    </div>
  </div>`;
}

function dateField(field: Field): string {
  const part = (id: string, label: string, width: string) => `<div class="flex flex-col gap-xs">
    <label for="${id}" class="text-[1.25rem] font-bold">${label}</label>
    <div class="relative inline-flex rounded-sm border-2 border-bb-black-00 items-center bg-bb-white-00 transition-all hover:shadow-form-hover focus-within:ring-4 focus-within:ring-bb-teal-100" style="width:${width}">
      <input type="text" id="${id}" name="${id}" inputmode="numeric" class="w-full min-w-0 p-s outline-none rounded-[inherit] text-[1.25rem]">
    </div>
  </div>`;
  return `<div class="flex flex-col gap-xs">
    <p class="text-[1.25rem] font-bold">${escapeHtml(field.label)}</p>
    <p class="${HINT_CLS}">${escapeHtml(field.hint ?? 'For example, 27 03 2007')}</p>
    <div class="flex gap-s items-end flex-wrap">
      ${part(`${field.id}-day`, 'Day', '5rem')}
      ${part(`${field.id}-month`, 'Month', '5rem')}
      ${part(`${field.id}-year`, 'Year', '7rem')}
    </div>
  </div>`;
}

function selectField(field: Field): string {
  const opts = (field.options ?? []).map((o) => {
    const v = typeof o === 'string' ? o : o.value;
    const l = typeof o === 'string' ? o : o.label;
    return `<option value="${escapeAttr(v)}">${escapeHtml(l)}</option>`;
  });
  return `<div class="flex flex-col gap-xs">
    <label for="${field.id}" class="${LABEL_CLS}">${escapeHtml(field.label)}</label>
    ${field.hint ? `<p class="${HINT_CLS}">${escapeHtml(field.hint)}</p>` : ''}
    <div class="${WRAP_CLS}">
      <select id="${field.id}" name="${field.id}" class="${INPUT_CLS} cursor-pointer bg-transparent">
        <option value="">Choose an option</option>
        ${opts.join('')}
      </select>
    </div>
  </div>`;
}

function radioField(field: Field): string {
  const opts = (field.options ?? [])
    .map((o) => {
      const v = typeof o === 'string' ? o : o.value;
      const l = typeof o === 'string' ? o : o.label;
      return `<label class="flex gap-5 items-center cursor-pointer">
        <input type="radio" name="${field.id}" value="${escapeAttr(v)}" class="size-5 accent-bb-teal-00">
        <span class="text-[1.25rem]">${escapeHtml(l)}</span>
      </label>`;
    })
    .join('');
  return `<fieldset class="flex flex-col gap-s items-start">
    <legend class="text-[1.25rem] font-bold">${escapeHtml(field.label)}</legend>
    ${field.hint ? `<p class="${HINT_CLS}">${escapeHtml(field.hint)}</p>` : ''}
    ${opts}
  </fieldset>`;
}

function checkboxField(field: Field): string {
  return `<label class="flex gap-5 items-start cursor-pointer">
    <input type="checkbox" name="${field.id}" class="size-5 mt-1 accent-bb-teal-00">
    <span class="flex-1 text-[1.25rem]">${escapeHtml(field.label)}</span>
  </label>`;
}

function fileField(field: Field): string {
  return `<div class="flex flex-col gap-xs">
    <label for="${field.id}" class="${LABEL_CLS}">${escapeHtml(field.label)}</label>
    ${field.hint ? `<p class="${HINT_CLS}">${escapeHtml(field.hint)}</p>` : ''}
    <input type="file" id="${field.id}" name="${field.id}" class="block text-[1rem]">
  </div>`;
}

/* ─── Escaping ─────────────────────────────────────────────────────── */

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
function escapeAttr(s: string): string {
  return escapeHtml(s);
}

/* ─── bb- design tokens (mirrors tailwind.config.ts) ─────────────────── */

const BB_COLORS = {
  'bb-yellow-00': '#e8a833',
  'bb-yellow-100': '#ffc726',
  'bb-yellow-40': '#ffe9a8',
  'bb-yellow-10': '#fff9e9',
  'bb-blue-00': '#00164a',
  'bb-blue-100': '#00267f',
  'bb-blue-40': '#99a8cc',
  'bb-blue-10': '#e5e9f2',
  'bb-black-00': '#000000',
  'bb-mid-grey-00': '#595959',
  'bb-grey-00': '#e0e4e9',
  'bb-white-00': '#ffffff',
  'bb-green-00': '#00654a',
  'bb-green-100': '#1fbf84',
  'bb-green-40': '#a5e5ce',
  'bb-green-10': '#e9f9f3',
  'bb-red-00': '#a42c2c',
  'bb-red-100': '#ff6b6b',
  'bb-red-40': '#ffc4c4',
  'bb-red-10': '#fff0f0',
  'bb-teal-00': '#0e5f64',
  'bb-teal-100': '#30c0c8',
  'bb-teal-40': '#ace6e9',
  'bb-teal-10': '#eaf9f9',
};
const BB_SPACING = { xs: '0.5rem', s: '1rem', xm: '1.5rem', m: '2rem', l: '4rem', xl: '8rem' };
