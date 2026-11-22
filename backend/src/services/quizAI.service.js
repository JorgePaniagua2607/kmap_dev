const fs = require('fs');
const path = require('path');
const env = require('../config/env');
const { AppError } = require('../utils/AppError');

const UPLOAD_DIR_ABS = path.resolve(__dirname, '../..', env.UPLOAD_DIR || 'uploads');
const MAX_INLINE_PDF_BYTES = 15 * 1024 * 1024;
const MAX_TEXT_CHARS = 60000;

function resolveUploadPath(url = '') {
  if (!url || /^https?:\/\//i.test(url)) return null;
  const filename = url.startsWith('/uploads/') ? url.slice('/uploads/'.length) : path.basename(url);
  const abs = path.join(UPLOAD_DIR_ABS, path.basename(filename));
  return fs.existsSync(abs) ? abs : null;
}

function clean(str = '') {
  return String(str).replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/** Extrae texto real de un PDF con pdf-parse (pdf.js). Devuelve '' si es un PDF escaneado (solo imágenes). */
async function extractPdfText(buffer) {
  try {
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    if (typeof parser.destroy === 'function') await parser.destroy().catch(() => {});
    return clean(result?.text || '');
  } catch (err) {
    console.warn('[AI] pdf-parse falló:', err.message);
    return '';
  }
}

async function extractDocxText(buffer) {
  try {
    const mammoth = require('mammoth');
    const r = await mammoth.extractRawText({ buffer });
    return clean(r.value || '');
  } catch (err) {
    console.warn('[AI] mammoth falló:', err.message);
    return '';
  }
}

/**
 * Lee los materiales del tema. Devuelve { texts: [{title, text}], pdfs: [{title, base64}], unreadable: [title] }
 */
async function readMaterials(materials = []) {
  const texts = [];
  const pdfs = [];
  const unreadable = [];

  for (const m of materials) {
    const title = m.titulo_del_material || m.title || 'Material';
    const url = m.enlace_para_descargar || m.url || '';
    const isExternal = /^https?:\/\//i.test(url);
    if (isExternal) continue;

    const abs = resolveUploadPath(url);
    if (!abs) {
      unreadable.push(`${title} (archivo no encontrado en el servidor; vuelve a subirlo)`);
      continue;
    }

    const ext = path.extname(abs).toLowerCase();
    const buf = fs.readFileSync(abs);
    let text = '';

    if (ext === '.pdf') {
      text = await extractPdfText(buf);
      // Gemini lee PDFs de forma nativa (incluye escaneados/imágenes): se adjunta el archivo original
      if (buf.length <= MAX_INLINE_PDF_BYTES) {
        pdfs.push({ title, base64: buf.toString('base64') });
      }
    } else if (ext === '.docx') {
      text = await extractDocxText(buf);
    } else if (['.txt', '.md', '.csv', '.json', '.sql', '.html', '.xml'].includes(ext)) {
      text = clean(buf.toString('utf8'));
    }

    if (text.length >= 40) texts.push({ title, text });
    else if (!(ext === '.pdf' && buf.length <= MAX_INLINE_PDF_BYTES)) unreadable.push(title);
  }

  return { texts, pdfs, unreadable };
}

function safeParseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const m = String(raw).match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('La IA no devolvió un JSON válido');
  }
}

function validateQuestions(list, wanted) {
  const out = [];
  for (const q of Array.isArray(list) ? list : []) {
    const text = String(q.texto_de_la_pregunta || q.pregunta || '').trim();
    const opts = (q.opciones || [])
      .map((o) => (typeof o === 'string' ? o : o.texto_de_la_opcion))
      .map((o) => String(o || '').trim());
    let idx = Number(q.indice_opcion_correcta);
    if (text.length < 8 || opts.length !== 4 || opts.some((o) => !o) || new Set(opts).size !== 4) continue;
    if (!Number.isInteger(idx) || idx < 0 || idx > 3) continue;
    out.push({
      texto_de_la_pregunta: text,
      nivel_de_dificultad: Number(q.nivel_de_dificultad) || 60,
      opciones: opts.map((t, i) => ({ orden_en_que_aparece: i + 1, texto_de_la_opcion: t })),
      indice_opcion_correcta: idx,
      explicacion: String(q.explicacion || '').trim() || null,
    });
  }
  return out.slice(0, wanted);
}

let resolvedModel = null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const REQUEST_TIMEOUT_MS = 25000;
const PREFERRED_FALLBACKS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
];

/** Lista modelos "flash" estables disponibles para la clave, priorizando los "-lite" (más rápidos y menos saturados). */
async function listFlashModels() {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${env.AI_API_KEY}&pageSize=200`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) return [];
  const { models = [] } = await r.json();
  const versionOf = (n) => parseFloat((n.match(/(\d+(?:\.\d+)?)/) || [0, 0])[1]);
  const isLite = (n) => /lite/i.test(n) ? 1 : 0;
  return models
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''))
    .filter((n) => /flash/i.test(n) && !/(image|tts|live|thinking|exp|audio|omni|transcribe)/i.test(n))
    .sort((a, b) => isLite(b) - isLite(a) || versionOf(b) - versionOf(a));
}

async function callGemini({ prompt, pdfs = [], hasExtractedText = false, responseSchema = null }) {
  const buildParts = (includePdfs) => {
    const parts = [{ text: prompt }];
    if (includePdfs) {
      for (const p of pdfs) {
        parts.push({ text: `Archivo PDF adjunto del docente: ${p.title}` });
        parts.push({ inline_data: { mime_type: 'application/pdf', data: p.base64 } });
      }
    }
    return parts;
  };

  let includePdfs = pdfs.length > 0;
  const generationConfig = { responseMimeType: 'application/json', temperature: 0.35 };
  if (responseSchema) generationConfig.responseSchema = responseSchema;

  const request = (model) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.AI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        contents: [{ role: 'user', parts: buildParts(includePdfs) }],
        generationConfig,
      }),
    });

  const RETRYABLE = new Set([429, 500, 502, 503, 504]);
  const tried = new Set();
  const queue = [resolvedModel || env.AI_MODEL, ...PREFERRED_FALLBACKS];
  let discoveredLoaded = false;
  let lastStatus = 0;
  let lastErrorText = '';
  let okResponse = null;
  let usedModel = env.AI_MODEL;

  while (queue.length && tried.size < 6) {
    const model = queue.shift();
    if (!model || tried.has(model)) continue;
    tried.add(model);

    let gotRetryableOrNotFound = false;
    for (let attempt = 0; attempt < 2; attempt++) {
      let response;
      try {
        response = await request(model);
      } catch (err) {
        lastStatus = 504;
        lastErrorText = err?.name === 'TimeoutError' ? `Timeout (${REQUEST_TIMEOUT_MS / 1000}s) en ${model}` : err.message;
        console.warn(`[AI] ${model} timeout/red (${lastErrorText}).`);
        gotRetryableOrNotFound = true;
        break;
      }

      if (response.ok) {
        okResponse = response;
        usedModel = model;
        resolvedModel = model;
        break;
      }

      lastStatus = response.status;
      lastErrorText = await response.text().catch(() => '');

      // Si el PDF adjunto excede el límite y ya tenemos texto extraído con pdf-parse, reintentar solo con texto
      if (response.status === 413 && includePdfs && hasExtractedText) {
        console.warn(`[AI] Payload muy grande para ${model}; reintentando con el texto extraído del PDF.`);
        includePdfs = false;
        continue;
      }

      if (response.status === 404) {
        console.warn(`[AI] Modelo ${model} no disponible (404), cambiando a alternativa...`);
        gotRetryableOrNotFound = true;
        break;
      }

      if (RETRYABLE.has(response.status)) {
        gotRetryableOrNotFound = true;
        console.warn(`[AI] ${model} respondió ${response.status} (intento ${attempt + 1}/2).`);
        if (attempt === 0) await sleep(1000);
        continue;
      }

      // Error no recuperable (ej. 400/401/403 clave inválida)
      gotRetryableOrNotFound = false;
      break;
    }

    if (okResponse) break;
    if (!gotRetryableOrNotFound) break;

    if (queue.length === 0 && !discoveredLoaded) {
      discoveredLoaded = true;
      const discovered = await listFlashModels().catch(() => []);
      for (const m of discovered) {
        if (!tried.has(m)) queue.push(m);
      }
    }
  }

  if (!okResponse) {
    let msg = lastErrorText;
    try {
      msg = JSON.parse(lastErrorText)?.error?.message || lastErrorText;
    } catch {}
    const hint = RETRYABLE.has(lastStatus)
      ? ' Todos los modelos Gemini probados están temporalmente saturados; intenta de nuevo en unos segundos.'
      : '';
    throw new AppError(`Gemini rechazó la solicitud (HTTP ${lastStatus || 502}): ${String(msg).slice(0, 250)}${hint}`, 502);
  }

  const result = await okResponse.json();
  const raw = result?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  if (!raw) throw new AppError('Gemini no devolvió contenido. Intenta nuevamente.', 502);
  return { data: safeParseJson(raw), model: usedModel };
}

const QUIZ_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          texto_de_la_pregunta: { type: 'STRING' },
          opciones: { type: 'ARRAY', items: { type: 'STRING' } },
          indice_opcion_correcta: { type: 'INTEGER' },
          nivel_de_dificultad: { type: 'INTEGER' },
          explicacion: { type: 'STRING' },
        },
        required: [
          'texto_de_la_pregunta',
          'opciones',
          'indice_opcion_correcta',
          'nivel_de_dificultad',
          'explicacion',
        ],
      },
    },
  },
  required: ['questions'],
};

function hasGeminiKey() {
  return Boolean(env.AI_MODE === 'gemini' && env.AI_API_KEY && !/^tu_api_key/i.test(env.AI_API_KEY));
}

/**
 * Genera un quiz REAL con un modelo de IA (Gemini) leyendo los archivos que subió el docente.
 * No existe respaldo con plantillas: si la IA no está configurada o falla, se devuelve un error claro.
 */
async function generateQuizWithLLM({ topicTitle, topicDescription, materials = [], numQuestions = 5, difficulty = 60 }) {
  if (!hasGeminiKey()) {
    throw new AppError(
      'La IA no está configurada. En backend/.env define AI_MODE="gemini" y AI_API_KEY con tu clave de Google AI Studio (https://aistudio.google.com/apikey) y reinicia el backend.',
      503
    );
  }

  const { texts, pdfs, unreadable } = await readMaterials(materials);
  if (texts.length === 0 && pdfs.length === 0 && unreadable.length > 0) {
    throw new AppError(
      `No se pudo leer el material adjunto (${unreadable.join(', ')}). Quítalo y vuelve a subir el PDF/DOCX/TXT para que la IA pueda analizar su contenido real.`,
      422
    );
  }
  if (texts.length === 0 && pdfs.length === 0 && !(topicDescription || '').trim()) {
    throw new AppError(
      'Este tema no tiene archivos legibles ni descripción. Sube un PDF/DOCX/TXT con contenido o escribe la descripción del tema.',
      422
    );
  }

  let budget = MAX_TEXT_CHARS;
  const textBlocks = texts.map((t) => {
    const slice = t.text.slice(0, Math.max(2000, Math.floor(budget / Math.max(1, texts.length))));
    budget -= slice.length;
    return `=== ARCHIVO: ${t.title} ===\n${slice}`;
  });

  const prompt = [
    'Eres un docente universitario experto que elabora evaluaciones rigurosas para BIT ACADEMY - KMAP.',
    `Elabora EXACTAMENTE ${numQuestions} preguntas de selección múltiple en español sobre el tema «${topicTitle}».`,
    topicDescription ? `Descripción del tema dada por el docente: ${topicDescription}` : '',
    '',
    'REGLAS OBLIGATORIAS:',
    '- Basa cada pregunta Y cada una de sus 4 opciones ÚNICAMENTE en datos, conceptos, pasos o definiciones reales del material del docente (texto y/o PDFs adjuntos). No inventes datos externos.',
    '- PROHIBIDO generar preguntas genéricas o plantillas como "¿Cuál afirmación describe correctamente un concepto clave?" o respuestas vagas como "Definición correcta del concepto" / "Ninguna de las anteriores".',
    '- Cada pregunta debe evaluar comprensión de un concepto concreto del documento (terminología, procedimiento, causa-efecto, aplicación práctica).',
    '- Exactamente 4 opciones por pregunta, concretas, plausibles y redactadas con el vocabulario real del documento, sin repetirse; solo UNA es correcta según el material.',
    '- Distribuye la posición de la opción correcta de forma variada (índices 0, 1, 2, 3).',
    '- Incluye una explicación breve (1-2 oraciones) que justifique la respuesta correcta citando la idea del material.',
    `- Dificultad aproximada: ${difficulty}/100.`,
    '',
    'Responde ÚNICAMENTE con JSON válido con esta estructura:',
    '{"questions":[{"texto_de_la_pregunta":"...","opciones":["...","...","...","..."],"indice_opcion_correcta":0,"nivel_de_dificultad":60,"explicacion":"..."}]}',
    '',
    textBlocks.length ? `MATERIAL DEL DOCENTE (texto extraído):\n${textBlocks.join('\n\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const hasExtractedText = texts.length > 0;
  let parsed = { questions: [] };
  let usedModel = env.AI_MODEL;
  let questions = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      ({ data: parsed, model: usedModel } = await callGemini({
        prompt,
        pdfs,
        hasExtractedText,
        responseSchema: QUIZ_RESPONSE_SCHEMA,
      }));
      questions = validateQuestions(parsed.questions, numQuestions);
      if (questions.length >= Math.min(numQuestions, 2)) break;
    } catch (err) {
      if (attempt === 1) throw err;
      console.warn('[AI] Reintentando generación por respuesta inválida:', err.message);
    }
  }
  if (questions.length === 0) {
    throw new AppError('La IA no pudo generar preguntas válidas con este material. Intenta de nuevo o sube un archivo con más contenido.', 502);
  }

  return {
    provider: 'gemini',
    model: usedModel || env.AI_MODEL,
    status: 'DRAFT',
    titulo_del_quiz: `Quiz IA: ${topicTitle}`,
    questions,
  };
}

module.exports = { generateQuizWithLLM, readMaterials, extractPdfText, callGemini, hasGeminiKey };
