/**
 * GovBB AI Prototype Generator — API Server
 * Node.js HTTP server on port 3001.
 *
 * Endpoints:
 *   GET  /api/pdf-list       → JSON list of all PDF files
 *   POST /api/generate       → SSE stream: reads PDF + CLAUDE.md, calls Claude, saves prototype
 *   GET  /api/health         → {"ok": true}
 *
 * Usage:
 *   npm install
 *   ANTHROPIC_API_KEY=sk-... node api-server.js
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import Anthropic from '@anthropic-ai/sdk';
import {
  handleLogin as handleGithubLogin,
  handleCallback as handleGithubCallback,
  handleMe as handleGithubMe,
  handleLogout as handleGithubLogout,
  handleSaveToLibrary,
  oauthConfig,
} from './lib/github-oauth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3001;
const PDF_ROOT = path.join(__dirname, 'pdf forms');
const PROTOTYPES_DIR = path.join(__dirname, 'prototypes');
const PATCHES_DIR = path.join(PROTOTYPES_DIR, 'patches');
const CLAUDE_MD = path.join(__dirname, 'CLAUDE.md');

// Pick a short reference prototype to show Claude what the output format looks like
const REFERENCE_PROTOTYPE = path.join(__dirname, 'prototypes', 'nisss-dp10.html');

const client = new Anthropic();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, data, status = 200) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

/** Recursively list all .pdf files under a directory */
function listPdfs(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listPdfs(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
      results.push(full);
    }
  }
  return results;
}

/** Convert a PDF path to a relative label like "NISSS PDF forms / DP-10-Form.pdf" */
function pdfLabel(fullPath) {
  return path.relative(PDF_ROOT, fullPath);
}

/** Git: stage the patch file, commit, push to both remotes. */
function _autoCommitAndPush(slug, patchFile) {
  const result = { committed: false, pushed: [], errors: [] };
  const relPath = path.relative(__dirname, patchFile).replace(/\\/g, '/');

  // Stage + commit (safe to fail if nothing changed)
  try {
    execSync(`git add "${relPath}"`, { cwd: __dirname, stdio: 'pipe' });
    execSync(`git commit -m "Edit: save patches for ${slug}"`, { cwd: __dirname, stdio: 'pipe' });
    result.committed = true;
  } catch (e) {
    const out = (e.stdout || Buffer.alloc(0)).toString();
    if (!out.includes('nothing to commit')) {
      result.errors.push('commit: ' + out.trim() || e.message);
    }
    // "nothing to commit" is fine — patches file unchanged, still push
  }

  // Push to govtech-bb (origin)
  try {
    execSync('git push origin HEAD:main', { cwd: __dirname, stdio: 'pipe' });
    result.pushed.push('origin');
  } catch (e) {
    result.errors.push('push origin: ' + (e.stderr || Buffer.alloc(0)).toString().trim() || e.message);
  }

  // Push to personal — auto-merge if the remote is ahead
  try {
    execSync('git push personal HEAD:main', { cwd: __dirname, stdio: 'pipe' });
    result.pushed.push('personal');
  } catch {
    try {
      execSync('git fetch personal', { cwd: __dirname, stdio: 'pipe' });
      execSync('git merge personal/main --no-edit', { cwd: __dirname, stdio: 'pipe' });
      execSync('git push personal HEAD:main', { cwd: __dirname, stdio: 'pipe' });
      result.pushed.push('personal');
    } catch (e2) {
      result.errors.push('push personal: ' + (e2.stderr || Buffer.alloc(0)).toString().trim() || e2.message);
    }
  }

  return result;
}

/** Convert a form name to a safe kebab-case filename */
function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

// ─── /api/pdf-list ────────────────────────────────────────────────────────────

function handlePdfList(res) {
  const pdfs = listPdfs(PDF_ROOT);
  const list = pdfs.map(p => ({
    label: pdfLabel(p),
    path: path.relative(__dirname, p).replace(/\\/g, '/'),
  }));
  json(res, list);
}

// ─── /api/generate ────────────────────────────────────────────────────────────

async function handleGenerate(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    return json(res, { error: 'Invalid request body' }, 400);
  }

  const { pdfPath, formName, outputFile, editSlug, feedback } = body;
  if (!formName) return json(res, { error: 'formName is required' }, 400);

  // In edit mode pdfPath is empty — skip PDF validation
  let absPath = '';
  if (pdfPath) {
    absPath = path.resolve(__dirname, pdfPath);
    if (!absPath.startsWith(__dirname)) return json(res, { error: 'Invalid path' }, 400);
    if (!fs.existsSync(absPath)) return json(res, { error: 'PDF not found: ' + pdfPath }, 404);
  } else if (!editSlug) {
    return json(res, { error: 'pdfPath or editSlug is required' }, 400);
  }

  // Set up SSE
  cors(res);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  function send(event, data) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  try {
    // Build output filename
    const slug = outputFile
      ? outputFile.replace(/\.html$/, '')
      : (editSlug || toSlug(formName));
    const filename = slug + '.html';
    const outputPath = path.join(PROTOTYPES_DIR, filename);

    // 1. Read CLAUDE.md
    send('status', { message: 'Loading design system instructions…' });
    const claudeMd = fs.readFileSync(CLAUDE_MD, 'utf8');

    let messages;
    const systemPrompt = `You are a GovTech Barbados prototype builder. Your task is to produce a single, complete, self-contained HTML prototype file for a government form.

Follow the design system and coding rules in CLAUDE.md exactly. Do not deviate from the specified structure, component patterns, colour tokens, or technical requirements.

Output ONLY the raw HTML — no markdown fences, no explanation, no commentary before or after the HTML. The output must start with <!DOCTYPE html> and end with </html>.`;

    if (editSlug && feedback) {
      // ── EDIT MODE: read existing prototype, apply changes ──
      const existingPath = path.join(PROTOTYPES_DIR, editSlug + '.html');
      if (!fs.existsSync(existingPath)) {
        send('error', { message: `Prototype not found: prototypes/${editSlug}.html` });
        res.end(); return;
      }
      send('status', { message: 'Reading existing prototype…' });
      const existingHtml = fs.readFileSync(existingPath, 'utf8');

      const userPrompt = `Here are your design system instructions (CLAUDE.md):

<claude_md>
${claudeMd}
</claude_md>

Here is the existing prototype HTML for "${formName}" (prototypes/${filename}):

<existing_prototype>
${existingHtml}
</existing_prototype>

The user wants the following changes made to this prototype:

<requested_changes>
${feedback}
</requested_changes>

Apply those changes to the prototype. Return the complete updated HTML file. Do not summarise what you changed — output only the full HTML.`;

      messages = [{ role: 'user', content: userPrompt }];
      send('status', { message: 'Calling Claude API — applying changes…' });

    } else {
      // ── GENERATE MODE: read PDF, build from scratch ──
      send('status', { message: 'Reading PDF…' });
      const pdfBase64 = fs.readFileSync(absPath).toString('base64');

      // Reference prototype for structure guidance
      let refProto = '';
      if (fs.existsSync(REFERENCE_PROTOTYPE)) {
        const raw = fs.readFileSync(REFERENCE_PROTOTYPE, 'utf8');
        refProto = raw.length > 6000 ? raw.substring(0, 6000) + '\n...[truncated for brevity]' : raw;
      }

      const userPrompt = `Here are your instructions (CLAUDE.md):

<claude_md>
${claudeMd}
</claude_md>

${refProto ? `Here is an existing prototype to use as a structural reference (follow the same pattern):

<reference_prototype>
${refProto}
</reference_prototype>

` : ''}The form name is: "${formName}"
The output filename will be: prototypes/${filename}

Now read the PDF form below and generate a complete HTML prototype that digitises it.`;

      messages = [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
            },
            { type: 'text', text: userPrompt },
          ],
        },
      ];
      send('status', { message: 'Calling Claude API — generating prototype…' });
    }

    // 5. Stream from Claude
    let generated = '';

    const stream = client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system: systemPrompt,
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          generated += event.delta.text;
          send('chunk', { text: event.delta.text });
        }
        // Skip thinking blocks in the stream output
      }
    }

    // 6. Clean up output — strip any accidental markdown fences
    let html = generated.trim();
    if (html.startsWith('```')) {
      html = html.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
    }

    // 7. Save to file
    send('status', { message: `Saving prototype to prototypes/${filename}…` });
    fs.writeFileSync(outputPath, html, 'utf8');

    send('done', {
      filename: filename,
      path: `prototypes/${filename}`,
      url: `/prototypes/${filename}`,
    });

  } catch (err) {
    console.error('Generation error:', err);
    send('error', { message: err.message || 'Generation failed' });
  }

  res.end();
}

// ─── /api/extract ─────────────────────────────────────────────────────────────

/**
 * Tool schema given to Claude. It mirrors the FormSchema the editor and
 * renderer consume (src/types/schema.ts), but `pages` is an ARRAY here so we
 * never depend on dynamic object keys in the tool input schema. The server
 * converts the array back into the keyed `pages` object in normaliseSchema().
 */
const FIELD_DEF = {
  type: 'object',
  required: ['id', 'type', 'label'],
  properties: {
    id: { type: 'string', description: 'Unique kebab-case field id, e.g. "first-name".' },
    type: {
      type: 'string',
      enum: ['text', 'email', 'tel', 'date', 'radio', 'checkbox', 'select', 'textarea', 'file', 'static'],
    },
    label: { type: 'string', description: 'The question, phrased in plain language a 9-year-old understands.' },
    hint: { type: 'string', description: 'Short helper text. Explain IDs/numbers and where to find them.' },
    placeholder: { type: 'string' },
    options: {
      type: 'array',
      description: 'For radio and select fields only.',
      items: {
        type: 'object',
        required: ['value', 'label'],
        properties: { value: { type: 'string' }, label: { type: 'string' } },
      },
    },
    rows: { type: 'integer', description: 'For textarea only.' },
    inputmode: { type: 'string', enum: ['text', 'numeric', 'tel', 'email', 'decimal', 'search', 'url'] },
    required: { type: 'boolean' },
    validation: {
      type: 'object',
      properties: {
        required: { type: 'boolean' },
        pattern: { type: 'string', description: 'Regex as a JSON string, e.g. "^[0-9]{6}-[0-9]{4}$".' },
        patternMessage: { type: 'string' },
        maxLength: { type: 'integer' },
        notFuture: { type: 'boolean', description: 'For dates that cannot be in the future.' },
      },
    },
    showWhen: {
      type: 'object',
      description: 'Show this field only when a condition on another field is met.',
      required: ['operator', 'conditions'],
      properties: {
        operator: { type: 'string', enum: ['AND', 'OR'] },
        conditions: {
          type: 'array',
          items: {
            type: 'object',
            required: ['sourceFieldId', 'comparator'],
            properties: {
              sourceFieldId: { type: 'string' },
              comparator: {
                type: 'string',
                enum: ['equals', 'notEquals', 'isAnswered', 'isNotAnswered', 'contains'],
              },
              value: { type: 'string' },
            },
          },
        },
      },
    },
    confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
      description: 'How sure you are this field was read correctly from the source.',
    },
    sourcePage: { type: 'integer', description: 'Which source page this field came from.' },
  },
};

const PAGE_DEF = {
  type: 'object',
  required: ['id', 'type'],
  properties: {
    id: { type: 'string', description: 'Unique kebab-case page id.' },
    type: { type: 'string', enum: ['start', 'question', 'declaration', 'check', 'confirmation'] },
    title: { type: 'string' },
    caption: { type: 'boolean', description: 'Show the form name as a caption above the heading (question pages).' },
    body: { type: 'string', description: 'Declaration statement text (declaration pages).' },
    intro: { type: 'array', items: { type: 'string' }, description: 'Intro paragraphs for the start page.' },
    eligibility: {
      type: 'object',
      properties: { heading: { type: 'string' }, items: { type: 'array', items: { type: 'string' } } },
    },
    whatYouNeed: {
      type: 'object',
      properties: { heading: { type: 'string' }, items: { type: 'array', items: { type: 'string' } } },
    },
    startButton: { type: 'string' },
    fields: { type: 'array', items: FIELD_DEF },
  },
};

const EXTRACT_TOOL = {
  name: 'emit_form_schema',
  description: 'Return the digitised government form as a structured schema.',
  input_schema: {
    type: 'object',
    required: ['meta', 'flow', 'pages'],
    properties: {
      meta: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string' },
          mda: { type: 'string', description: 'Ministry, Department or Agency that runs this form.' },
          serviceType: {
            type: 'string',
            enum: ['registration', 'application', 'declaration', 'certificate', 'permit', 'renewal', 'search', 'claim', 'other'],
          },
          referencePrefix: { type: 'string', description: '2–5 letter prefix for reference numbers, e.g. "WP".' },
          estimatedTime: { type: 'string', description: 'Plain time estimate, e.g. "10 minutes".' },
        },
      },
      flow: { type: 'array', items: { type: 'string' }, description: 'Page ids in order.' },
      pages: { type: 'array', items: PAGE_DEF, description: 'All pages. Include start, question/declaration pages, check, and confirmation.' },
    },
  },
};

const EXTRACT_SYSTEM = `You are a GovTech Barbados service designer. You are given the pages of a paper government form (as images and/or extracted text). Turn it into a structured, well-designed online form schema by calling the emit_form_schema tool.

Follow these rules:

ONE THING PER PAGE
- Each "question" page asks ONE question or one tightly-related group (e.g. first + last name together is fine).
- Split the paper form's sections across multiple pages accordingly.
- Use the field LABEL as the page question, phrased directly to the user.

PLAIN LANGUAGE (critical)
- Write so a 9-year-old understands. Short words, short sentences, address the user as "you".
- "What is your first name?" not "Applicant forename". "When were you born?" not "Date of birth".
- Explain any ID/number in the hint and where to find it.

PAGES TO PRODUCE (in this order)
1. ONE "start" page: title, 1–2 intro paragraphs, optional eligibility ("You can apply if"), optional whatYouNeed ("Before you start"), startButton "Start now".
2. One or more "question" pages (set caption: true). Group related fields sensibly.
3. ONE "check" page (type "check", title "Check your answers before sending your application"). No fields.
4. A "declaration" page AFTER the check page if the form has a sign/agree statement: put the statement in body and add a required checkbox field. The declaration always comes after "Check your answers".
5. ONE "confirmation" page (type "confirmation", title "Application sent"). No fields.

The flow order must therefore be: start → question pages → check → declaration → confirmation.

FIELD TYPES
- Use date for dates (day/month/year), select for long option lists, radio for short ones (give options as {value,label}), textarea for long free text, file for uploads, checkbox for agree/consent.
- Only mark fields required if the paper form indicates they are mandatory. Set validation.required to match.
- Set a confidence (high/medium/low) and sourcePage on every field, based on how clearly you could read it.

BARBADOS CONVENTIONS
- Parish select options: Christ Church, St. Andrew, St. George, St. James, St. John, St. Joseph, St. Lucy, St. Michael, St. Peter, St. Philip, St. Thomas.
- National Registration Number — however it is labelled (NRN, National Registration Number, National Identification Number, National ID Number, ID Number): use type "text", validation.pattern "^[0-9]{6}-[0-9]{4}$", patternMessage "Enter your number in the format 939218-7644", hint "For example, 939218-7644", inputmode "numeric". This is always six digits, a hyphen, then four digits. (This is different from the National Insurance Number.)
- Postal code: pattern "^BB[0-9]{5}$", hint "For example, BB11000".
- Dates use day/month/year; hint "For example, 27 03 2007". Birth dates: validation.notFuture true.
- National Insurance Number: 6 digits, numeric.
- Phone: do not enforce a strict pattern.

Only include fields that genuinely appear on the form. Do not invent sections. Call emit_form_schema exactly once with the full result.`;

/** Turn a "data:image/jpeg;base64,..." string into an Anthropic image block. */
function dataUrlToImageBlock(dataUrl) {
  const m = /^data:(image\/[a-z+.-]+);base64,(.+)$/i.exec(dataUrl || '');
  if (!m) return null;
  return { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } };
}

/** Convert the model's array-based output into the keyed FormSchema the app consumes. */
function normaliseSchema(raw, { formName, mda }) {
  const slug = toSlug(formName) || 'form';
  const meta = raw?.meta || {};
  const pagesArr = Array.isArray(raw?.pages) ? raw.pages : [];

  const pages = {};
  const order = [];
  for (const p of pagesArr) {
    if (!p || !p.id) continue;
    const id = String(p.id);
    pages[id] = { ...p, id };
    order.push(id);
  }

  // Guarantee the structural pages exist.
  const findByType = (t) => order.find((id) => pages[id].type === t);
  let startId = findByType('start');
  if (!startId) {
    startId = 'start';
    pages[startId] = { id: startId, type: 'start', title: meta.title || formName, startButton: 'Start now' };
    order.unshift(startId);
  }
  let checkId = findByType('check');
  if (!checkId) {
    checkId = 'check';
    pages[checkId] = { id: checkId, type: 'check', title: 'Check your answers before sending your application' };
  }
  let confirmId = findByType('confirmation');
  if (!confirmId) {
    confirmId = 'done';
    pages[confirmId] = { id: confirmId, type: 'confirmation', title: 'Application sent' };
  }

  // Order: start → question pages → check → declaration(s) → confirmation.
  // The declaration (sign/agree) always comes AFTER "Check your answers".
  const declIds = order.filter((id) => pages[id].type === 'declaration');
  const middle = order.filter((id) => ![startId, checkId, confirmId, ...declIds].includes(id));
  const flow = [startId, ...middle, checkId, ...declIds, confirmId];

  return {
    id: slug,
    version: '0.1.0',
    meta: {
      title: meta.title || formName,
      mda: mda || meta.mda || '',
      serviceType: meta.serviceType,
      status: 'alpha',
      referencePrefix: String(meta.referencePrefix || slug.slice(0, 3) || 'NEW').toUpperCase().slice(0, 5),
      estimatedTime: meta.estimatedTime,
      lastUpdated: meta.lastUpdated,
    },
    validation: { enabled: true, mode: 'onContinue' },
    flow,
    pages,
  };
}

async function handleExtract(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    return json(res, { error: 'Invalid request body' }, 400);
  }

  const { formName, mda = '', pages = [], pdfBase64 } = body || {};
  if (!formName) return json(res, { error: 'formName is required' }, 400);
  if (!process.env.ANTHROPIC_API_KEY) {
    return json(res, {
      error: 'The server has no ANTHROPIC_API_KEY. Stop the API server and restart it with your key: ANTHROPIC_API_KEY=sk-... npm run api',
    }, 500);
  }

  try {
    // Build the message content. Two input modes:
    //   1. pdfBase64 — let Claude read the PDF natively (best quality).
    //   2. pages[]   — page images (capped) + extracted text from the browser.
    const content = [];
    if (pdfBase64) {
      content.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
      });
    } else {
      let imgCount = 0;
      pages.forEach((p, idx) => {
        const pageNo = p.pageNumber ?? idx + 1;
        const block = imgCount < 10 ? dataUrlToImageBlock(p.imageDataUrl) : null;
        if (block) {
          content.push({ type: 'text', text: `--- Page ${pageNo} (image) ---` });
          content.push(block);
          imgCount++;
        }
        const txt = (p.text || '').trim();
        if (txt) content.push({ type: 'text', text: `--- Page ${pageNo} (text) ---\n${txt}` });
      });
    }
    if (content.length === 0) {
      content.push({ type: 'text', text: '(No readable content was extracted from the uploaded file.)' });
    }
    content.push({
      type: 'text',
      text: `The form is called "${formName}".${mda ? ` It is run by ${mda}.` : ''}\n\nAnalyse the source above and call emit_form_schema with the complete digitised form.`,
    });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: EXTRACT_SYSTEM,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: 'tool', name: 'emit_form_schema' },
      messages: [{ role: 'user', content }],
    });

    const toolUse = message.content.find((b) => b.type === 'tool_use');
    if (!toolUse) return json(res, { error: 'The model did not return a form schema. Try again.' }, 502);

    const schema = normaliseSchema(toolUse.input, { formName, mda });
    return json(res, schema);
  } catch (err) {
    console.error('Extraction error:', err);
    return json(res, { error: err?.message || 'Extraction failed' }, 500);
  }
}

// ─── Router ──────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === '/api/health' && req.method === 'GET') {
    return json(res, { ok: true });
  }

  if (url.pathname === '/api/pdf-list' && req.method === 'GET') {
    return handlePdfList(res);
  }

  if (url.pathname === '/api/generate' && req.method === 'POST') {
    return handleGenerate(req, res);
  }

  if (url.pathname === '/api/extract' && req.method === 'POST') {
    return handleExtract(req, res);
  }

  // ── /api/patches/:slug ────────────────────────────────────────────────────
  const patchMatch = url.pathname.match(/^\/api\/patches\/([a-z0-9-]+)$/);
  if (patchMatch) {
    const slug = patchMatch[1];
    const patchFile = path.join(PATCHES_DIR, slug + '.json');

    if (req.method === 'GET') {
      if (!fs.existsSync(patchFile)) return json(res, {});
      try {
        const data = JSON.parse(fs.readFileSync(patchFile, 'utf8'));
        return json(res, data);
      } catch {
        return json(res, {});
      }
    }

    if (req.method === 'POST') {
      let body;
      try { body = await readBody(req); } catch { return json(res, { error: 'Invalid JSON' }, 400); }
      if (!fs.existsSync(PATCHES_DIR)) fs.mkdirSync(PATCHES_DIR, { recursive: true });
      fs.writeFileSync(patchFile, JSON.stringify(body, null, 2), 'utf8');
      const git = _autoCommitAndPush(slug, patchFile);
      return json(res, { ok: true, git });
    }
  }

  // ── GitHub OAuth + save-to-library (generator-v2) ───────────────────────────
  if (url.pathname === '/api/auth/github/login' && req.method === 'GET') {
    return handleGithubLogin(req, res);
  }
  if (url.pathname === '/api/auth/github/callback' && req.method === 'GET') {
    return handleGithubCallback(req, res, url);
  }
  if (url.pathname === '/api/auth/github/me' && req.method === 'GET') {
    cors(res);
    return handleGithubMe(req, res);
  }
  if (url.pathname === '/api/auth/github/logout' && req.method === 'POST') {
    cors(res);
    return handleGithubLogout(req, res);
  }
  if (url.pathname === '/api/save-to-library' && req.method === 'POST') {
    cors(res);
    let body;
    try { body = await readBody(req); } catch { return json(res, { error: 'Invalid JSON' }, 400); }
    return handleSaveToLibrary(req, res, body);
  }

  json(res, { error: 'Not found' }, 404);
});

server.listen(PORT, () => {
  console.log(`GovBB API server running on http://localhost:${PORT}`);
  console.log(`  GET  /api/health`);
  console.log(`  GET  /api/pdf-list`);
  console.log(`  POST /api/generate`);
  console.log(`  POST /api/extract`);
  console.log(`  GET  /api/auth/github/login`);
  console.log(`  GET  /api/auth/github/callback`);
  console.log(`  GET  /api/auth/github/me`);
  console.log(`  POST /api/auth/github/logout`);
  console.log(`  POST /api/save-to-library`);
  console.log('');
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠  ANTHROPIC_API_KEY is not set. AI generation will fail.');
  }
  if (!oauthConfig().configured) {
    console.warn('⚠  GITHUB_OAUTH_CLIENT_ID / _CLIENT_SECRET are not set.');
    console.warn('   "Save to library" will be disabled. See generator-v2/SETUP.md.');
  }
});
