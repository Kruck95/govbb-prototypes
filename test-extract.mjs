/**
 * Manual test for POST /api/extract.
 *
 * Reads a real PDF, sends it to the running API server (which calls Claude),
 * and prints a readable summary of the extracted form schema.
 *
 * Usage:
 *   node test-extract.mjs "pdf forms/Immigration PDF forms/Work_Permit.pdf" "Apply for a Work Permit"
 *
 * Requires the API server running with a key:
 *   ANTHROPIC_API_KEY=sk-... npm run api
 */

import fs from 'fs';
import path from 'path';

const pdfPath = process.argv[2];
const formName = process.argv[3] || path.basename(pdfPath, '.pdf').replace(/[_-]+/g, ' ').trim();

if (!pdfPath || !fs.existsSync(pdfPath)) {
  console.error('Pass a PDF path that exists. Example:');
  console.error('  node test-extract.mjs "pdf forms/Immigration PDF forms/Work_Permit.pdf"');
  process.exit(1);
}

const pdfBase64 = fs.readFileSync(pdfPath).toString('base64');
console.log(`→ Sending "${pdfPath}" (${(pdfBase64.length / 1.37 / 1024).toFixed(0)} KB) as "${formName}"…\n`);

const res = await fetch('http://localhost:3001/api/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ formName, pdfBase64 }),
}).catch((e) => {
  console.error('Could not reach the server. Is it running? (ANTHROPIC_API_KEY=sk-... npm run api)');
  console.error(e.message);
  process.exit(1);
});

if (!res.ok) {
  const body = await res.text();
  console.error(`Server returned HTTP ${res.status}:\n${body}`);
  process.exit(1);
}

const schema = await res.json();

console.log(`FORM: ${schema.meta.title}`);
console.log(`MDA:  ${schema.meta.mda || '(none)'}   ·   ref prefix: ${schema.meta.referencePrefix}   ·   service: ${schema.meta.serviceType || '-'}`);
console.log(`FLOW: ${schema.flow.join(' → ')}\n`);

let fieldCount = 0;
for (const id of schema.flow) {
  const page = schema.pages[id];
  if (!page) continue;
  const tag = page.type.toUpperCase();
  console.log(`■ [${tag}] ${page.title || id}`);
  for (const f of page.fields || []) {
    fieldCount++;
    const req = f.required || f.validation?.required ? ' *required' : '';
    const conf = f.confidence ? ` (${f.confidence})` : '';
    const opts = f.options?.length ? `  {${f.options.map((o) => (typeof o === 'string' ? o : o.label)).join(', ')}}` : '';
    const pat = f.validation?.pattern ? `  pattern=${f.validation.pattern}` : '';
    console.log(`    • ${f.type.padEnd(8)} ${f.label}${req}${conf}${opts}${pat}`);
    if (f.hint) console.log(`        hint: ${f.hint}`);
  }
}

console.log(`\nTotal: ${schema.flow.length} pages, ${fieldCount} fields.`);
const nrn = Object.values(schema.pages).flatMap((p) => p.fields || []).filter((f) => /national|nrn|identification|registration/i.test(f.label));
if (nrn.length) {
  console.log('\nNational ID / NRN fields detected:');
  nrn.forEach((f) => console.log(`  • "${f.label}" → pattern ${f.validation?.pattern || '(none)'}`));
}
