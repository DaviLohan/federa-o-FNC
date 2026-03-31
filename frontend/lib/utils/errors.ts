/**
 * Extrai mensagem de erro de resposta de API (Django REST Framework)
 * Suporta múltiplos formatos de erro do DRF
 */
export function extractErrorMessage(err: any): string {
  // Se não há resposta, é erro de rede
  if (!err.response?.data) {
    if (err.code === 'ECONNABORTED') {
      return 'Tempo de requisição esgotado. Tente novamente.';
    }
    if (err.message === 'Network Error') {
      return 'Erro de conexão. Verifique sua internet.';
    }
    return err.message || 'Erro ao processar requisição.';
  }
  
  const data = err.response.data;
  
  // Formatos comuns do Django REST Framework
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  if (data.message) return data.message;
  
  // Erros não relacionados a campos específicos
  if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
    return data.non_field_errors[0];
  }
  
  // Erros de campos específicos (pega o primeiro)
  const fields = Object.keys(data);
  if (fields.length > 0) {
    const firstField = fields[0];
    const fieldErrors = data[firstField];
    
    if (Array.isArray(fieldErrors)) {
      // Formata: "campo: mensagem de erro"
      const fieldName = firstField.replace(/_/g, ' ');
      return `${fieldName}: ${fieldErrors[0]}`;
    }
    
    if (typeof fieldErrors === 'string') {
      return fieldErrors;
    }
  }
  
  // Fallback genérico
  return 'Erro ao processar requisição.';
}

/**
 * Verifica se é um erro de autenticação (401/403)
 */
export function isAuthError(err: any): boolean {
  return err.response?.status === 401 || err.response?.status === 403;
}

/**
 * Verifica se é um erro de validação (400)
 */
export function isValidationError(err: any): boolean {
  return err.response?.status === 400;
}

/**
 * Verifica se é um erro de servidor (500+)
 */
export function isServerError(err: any): boolean {
  return err.response?.status >= 500;
}
