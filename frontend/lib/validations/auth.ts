/**
 * Validação de formulários de autenticação.
 *
 * Helpers puros (sem dependências externas) que retornam um mapa
 * `{ campo: mensagem }` com mensagens humanas em pt-BR. Um objeto vazio
 * significa "sem erros". Mantém as regras já praticadas no projeto
 * (senha ≥ 8, número de camisa 1–99, etc.).
 */

export const MIN_PASSWORD_LENGTH = 8;

/** Regex pragmático para e-mail (mesma intenção do `type="email"`). */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export interface LoginValues {
  email: string;
  password: string;
}

export function validateLogin(values: LoginValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.email.trim()) {
    errors.email = 'Informe seu e-mail.';
  } else if (!isValidEmail(values.email)) {
    errors.email = 'Digite um e-mail válido.';
  }

  if (!values.password) {
    errors.password = 'Informe sua senha.';
  }

  return errors;
}

export interface RegisterStep1Values {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirm: string;
}

export function validateRegisterStep1(values: RegisterStep1Values): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.first_name.trim()) errors.first_name = 'Informe seu nome.';
  if (!values.last_name.trim()) errors.last_name = 'Informe seu sobrenome.';

  if (!values.email.trim()) {
    errors.email = 'Informe seu e-mail.';
  } else if (!isValidEmail(values.email)) {
    errors.email = 'Digite um e-mail válido.';
  }

  if (!values.password) {
    errors.password = 'Crie uma senha.';
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  if (!values.password_confirm) {
    errors.password_confirm = 'Confirme sua senha.';
  } else if (values.password !== values.password_confirm) {
    errors.password_confirm = 'As senhas não coincidem.';
  }

  return errors;
}

export interface RegisterStep2Values {
  player_name: string;
  gamer_tag: string;
  shirt_number: string;
  birth_date: string;
  whatsapp: string;
  country: string;
}

export function validateRegisterStep2(values: RegisterStep2Values): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.player_name.trim()) errors.player_name = 'Informe o nome do jogador.';
  if (!values.gamer_tag.trim()) errors.gamer_tag = 'Informe sua Gamer Tag.';

  const shirt = parseInt(values.shirt_number, 10);
  if (!values.shirt_number) {
    errors.shirt_number = 'Informe o número da camisa.';
  } else if (Number.isNaN(shirt) || shirt < 1 || shirt > 99) {
    errors.shirt_number = 'O número da camisa deve estar entre 1 e 99.';
  }

  if (!values.birth_date) errors.birth_date = 'Informe sua data de nascimento.';
  if (!values.whatsapp.trim()) errors.whatsapp = 'Informe seu WhatsApp.';
  if (!values.country.trim()) errors.country = 'Informe seu país.';

  return errors;
}

/**
 * Rótulos amigáveis para campos retornados pelo backend (DRF),
 * usados ao mapear erros de validação do servidor para os inputs.
 */
export const FIELD_LABELS: Record<string, string> = {
  email: 'E-mail',
  password: 'Senha',
  password_confirm: 'Confirmação de senha',
  first_name: 'Nome',
  last_name: 'Sobrenome',
  player_name: 'Nome do jogador',
  gamer_tag: 'Gamer Tag',
  shirt_number: 'Número da camisa',
  primary_position: 'Posição principal',
  secondary_position: 'Posição secundária',
  birth_date: 'Data de nascimento',
  whatsapp: 'WhatsApp',
  country: 'País',
  language: 'Idioma',
  platform: 'Plataforma',
};

/** Campos que pertencem à etapa 1 do cadastro (para voltar à etapa certa em erro). */
export const STEP1_FIELDS = [
  'email',
  'password',
  'password_confirm',
  'first_name',
  'last_name',
  'platform',
];
