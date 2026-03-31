import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function normalizeApiBaseUrl(url?: string): string {
  const fallback = 'http://localhost:8000';
  if (!url) return fallback;

  return url.replace(/\/api\/?$/, '');
}

// Validação de variável de ambiente
if (!API_URL) {
  if (typeof window !== 'undefined') {
    console.warn('⚠️ NEXT_PUBLIC_API_URL não definida, usando http://localhost:8000');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_API_URL deve ser configurada em produção!');
  }
}

const baseURL = normalizeApiBaseUrl(API_URL);
const PUBLIC_PATH_PREFIXES = ['/', '/home', '/login', '/register', '/championships'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: baseURL,
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor para adicionar token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Token ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor para tratar erros
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const status = error.response?.status;

        // Loga apenas erros reais do servidor (5xx) em desenvolvimento.
        // 401 e 404 são fluxos esperados — não poluem o console.
        if (
          process.env.NODE_ENV !== 'production' &&
          typeof window !== 'undefined' &&
          status !== undefined &&
          status >= 500
        ) {
          const method = error.config?.method?.toUpperCase();
          const url = error.config?.url;
          const data = error.response?.data;
          console.error(`[API ERROR] ${method} ${url} → ${status}`, data);
        }

        if (status === 401) {
          // Token inválido ou expirado — redireciona para login
          // Guard: evita loop infinito se já estiver na página de login
          const hadToken = !!this.getToken();
          this.removeToken();
          if (
            hadToken &&
            typeof window !== 'undefined' &&
            !window.location.pathname.startsWith('/login') &&
            !isPublicPath(window.location.pathname)
          ) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Token management
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  public setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  public removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  // Generic methods
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.patch<T>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }

  // Upload method with FormData
  // Em Axios 1.x, o Content-Type padrão da instância ('application/json') prevalece
  // sobre a detecção automática de FormData quando está nos defaults da instância.
  // Usar `null` (não `undefined`) é o único valor que força a remoção do header herdado.
  // Sem isso, Django recebe Content-Type: application/json e rejeita o arquivo com
  // "O dado submetido não era um arquivo. Cheque o tipo de codificação no formulário."
  async upload<T>(url: string, formData: FormData, method: 'post' | 'put' | 'patch' = 'post'): Promise<T> {
    const response = await this.client[method]<T>(url, formData, {
      headers: { 'Content-Type': null as any },
    });
    return response.data;
  }
}

export const apiClient = new APIClient();
