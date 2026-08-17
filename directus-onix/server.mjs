import { createServer } from 'node:http';
import { syncProducts } from './scripts/sync-akeneo-products.mjs';

/**
 * Disparador HTTP del sincronizador ONIX → Akeneo.
 *
 * Existe para que n8n orqueste sin tener que saber nada del modelo: llama a un
 * endpoint, recibe un informe en JSON y decide qué hacer con el resultado.
 */

const PORT = Number(process.env.PORT ?? 3000);
const SECRET = process.env.SYNC_SECRET;

const json = (response, status, body) => {
  const payload = JSON.stringify(body, null, 2);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload)
  });
  response.end(payload);
};

const authorized = (request) => {
  if (!SECRET) return true;
  const header = request.headers.authorization ?? '';
  return header === `Bearer ${SECRET}`;
};

const readBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
};

/** Evita que dos sincronizaciones se pisen si n8n dispara de más. */
let running = null;

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === '/health') {
    return json(response, 200, { ok: true, service: 'onix-akeneo-sync', running: Boolean(running) });
  }

  if (url.pathname !== '/sync/products') {
    return json(response, 404, { error: 'Ruta no encontrada.' });
  }
  if (request.method !== 'POST') {
    return json(response, 405, { error: 'Usa POST.' });
  }
  if (!authorized(request)) {
    return json(response, 401, { error: 'Falta o no coincide el bearer de SYNC_SECRET.' });
  }
  if (running) {
    return json(response, 409, { error: 'Ya hay una sincronización en curso.' });
  }

  const body = await readBody(request);
  const options = {
    since: body.since ?? url.searchParams.get('since') ?? null,
    isbns: body.isbns ?? (url.searchParams.get('isbn')?.split(',') ?? null),
    withCovers: body.withCovers ?? url.searchParams.get('covers') === 'true'
  };

  const startedAt = new Date().toISOString();
  running = syncProducts(options);
  try {
    const report = await running;
    const failed = report.products.failed + report.associations.failed;
    json(response, failed ? 207 : 200, { startedAt, options, report });
  } catch (error) {
    console.error('Sincronización fallida:', error);
    json(response, 500, { startedAt, options, error: error.message });
  } finally {
    running = null;
  }
});

server.listen(PORT, () => {
  console.log(`Sincronizador ONIX → Akeneo escuchando en :${PORT}`);
  if (!SECRET) console.warn('AVISO: SYNC_SECRET no está definido, el endpoint queda abierto.');
});
