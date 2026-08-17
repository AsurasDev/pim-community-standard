export class DirectusError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'DirectusError';
    this.status = status;
    this.body = body;
  }
}

export class DirectusClient {
  constructor({ url, email, password, token }) {
    this.url = url.replace(/\/$/, '');
    this.email = email;
    this.password = password;
    this.token = token;
  }

  async login() {
    if (this.token) return this.token;
    if (!this.email || !this.password) {
      throw new Error('Faltan DIRECTUS_EMAIL/DIRECTUS_PASSWORD o DIRECTUS_TOKEN.');
    }

    const response = await this.request('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email: this.email, password: this.password, mode: 'json' }
    });
    this.token = response.data.access_token;
    return this.token;
  }

  async request(path, options = {}) {
    const headers = { Accept: 'application/json', ...(options.headers ?? {}) };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.auth !== false && this.token) headers.Authorization = `Bearer ${this.token}`;

    const response = await fetch(`${this.url}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    const raw = await response.text();
    const body = raw ? JSON.parse(raw) : null;
    if (!response.ok) {
      throw new DirectusError(
        body?.errors?.[0]?.message ?? `Directus respondió ${response.status}`,
        response.status,
        body
      );
    }
    return body;
  }

  async exists(path) {
    try {
      return await this.request(path);
    } catch (error) {
      if (error instanceof DirectusError && error.status === 404) return null;
      throw error;
    }
  }
}

export function clientFromEnvironment() {
  const url = process.env.DIRECTUS_URL ?? process.env.PUBLIC_URL;
  if (!url) throw new Error('Falta DIRECTUS_URL o PUBLIC_URL.');
  return new DirectusClient({
    url,
    token: process.env.DIRECTUS_TOKEN,
    email: process.env.DIRECTUS_EMAIL ?? process.env.ONIX_ADMIN_EMAIL,
    password: process.env.DIRECTUS_PASSWORD ?? process.env.ONIX_ADMIN_PASSWORD
  });
}
