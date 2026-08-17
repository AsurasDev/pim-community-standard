const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}.`);
  return value;
};

export function akeneoClientFromEnvironment() {
  return new AkeneoClient({
    baseUrl: required('AKENEO_BASE_URL').replace(/\/+$/, ''),
    clientId: required('AKENEO_CLIENT_ID'),
    clientSecret: required('AKENEO_CLIENT_SECRET'),
    username: required('AKENEO_USERNAME'),
    password: required('AKENEO_PASSWORD')
  });
}

export class AkeneoClient {
  constructor(options) {
    this.baseUrl = options.baseUrl;
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.username = options.username;
    this.password = options.password;
    this.token = null;
    this.tokenExpiresAt = 0;
  }

  async authenticate() {
    if (this.token && Date.now() < this.tokenExpiresAt - 60_000) return this.token;

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch(`${this.baseUrl}/api/oauth/v1/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${credentials}` },
      body: JSON.stringify({
        grant_type: 'password',
        username: this.username,
        password: this.password
      })
    });
    if (!response.ok) {
      throw new Error(`Autenticación de Akeneo fallida: ${response.status} ${await response.text()}`);
    }
    const payload = await response.json();
    this.token = payload.access_token;
    this.tokenExpiresAt = Date.now() + payload.expires_in * 1000;
    return this.token;
  }

  async request(path, { method = 'GET', body, raw, contentType } = {}) {
    const token = await this.authenticate();
    const headers = { Authorization: `Bearer ${token}` };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (raw !== undefined) headers['Content-Type'] = contentType ?? 'application/vnd.akeneo.collection+json';

    const response = await fetch(`${this.baseUrl}/api/rest/v1${path}`, {
      method,
      headers,
      body: raw ?? (body === undefined ? undefined : JSON.stringify(body))
    });

    if (response.status === 204 || response.status === 201) return { status: response.status };
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`${method} ${path} → ${response.status}: ${text.slice(0, 800)}`);
    }
    return text ? JSON.parse(text) : { status: response.status };
  }

  /** PATCH de un recurso individual: crea si no existe, actualiza si existe. */
  upsert(collection, code, payload) {
    return this.request(`/${collection}/${encodeURIComponent(code)}`, {
      method: 'PATCH',
      body: payload
    });
  }

  /**
   * PATCH por lotes. Akeneo acepta JSON delimitado por líneas, máximo 100 por
   * llamada, y devuelve una línea de resultado por elemento.
   */
  async upsertMany(collection, items, { batchSize = 100, label = collection } = {}) {
    const summary = { ok: 0, failed: 0, errors: [] };

    for (let index = 0; index < items.length; index += batchSize) {
      const batch = items.slice(index, index + batchSize);
      const raw = batch.map((item) => JSON.stringify(item)).join('\n');
      const response = await this.requestBulk(`/${collection}`, raw);

      for (const line of response) {
        if (line.status_code >= 200 && line.status_code < 300) {
          summary.ok += 1;
        } else {
          summary.failed += 1;
          if (summary.errors.length < 10) {
            summary.errors.push({
              identifier: line.identifier ?? line.code,
              status: line.status_code,
              message: line.message,
              errors: line.errors
            });
          }
        }
      }
      process.stderr.write(`  ${label}: ${Math.min(index + batchSize, items.length)}/${items.length}\r`);
    }
    if (items.length) process.stderr.write('\n');
    return summary;
  }

  async requestBulk(path, raw) {
    const token = await this.authenticate();
    const response = await fetch(`${this.baseUrl}/api/rest/v1${path}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/vnd.akeneo.collection+json'
      },
      body: raw
    });
    const text = await response.text();
    if (!response.ok && response.status !== 207) {
      throw new Error(`PATCH ${path} → ${response.status}: ${text.slice(0, 800)}`);
    }
    return text
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  /** Recorre todas las páginas de una colección. */
  async *list(collection, query = '') {
    let path = `/${collection}?limit=100${query ? `&${query}` : ''}`;
    while (path) {
      const page = await this.request(path);
      for (const item of page._embedded?.items ?? []) yield item;
      const next = page._links?.next?.href;
      path = next ? next.replace(`${this.baseUrl}/api/rest/v1`, '') : null;
    }
  }

  async codesOf(collection) {
    const codes = new Set();
    for await (const item of this.list(collection)) codes.add(item.code);
    return codes;
  }
}
