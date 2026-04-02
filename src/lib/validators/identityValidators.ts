export type ValidationResult = {
  valid: boolean;
  message?: string;
};

const BI_REGEX = /^\d{12}[A-Z]$/;
const NUIT_REGEX = /^\d{9}$/;

export function normalizeBi(value: string): string {
  return value
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^0-9A-Z]/g, '')
    .slice(0, 13)
    .trim();
}

export function normalizeNuit(value: string): string {
  return value.replace(/\D/g, '').slice(0, 9).trim();
}

export function normalizePhone(value: string): string {
  return value.replace(/[^\d+]/g, '').trim();
}

export function validateBi(value: string): ValidationResult {
  const bi = normalizeBi(value);

  if (!bi) {
    return {
      valid: false,
      message: 'Número do BI é obrigatório.',
    };
  }

  if (!BI_REGEX.test(bi)) {
    return {
      valid: false,
      message:
        'BI inválido. Deve conter 12 dígitos seguidos de 1 letra maiúscula (ex: 100105369203S).',
    };
  }

  return { valid: true };
}

export function validateNuit(value?: string | null): ValidationResult {
  const nuit = normalizeNuit(value || '');

  if (!nuit) {
    return { valid: true };
  }

  if (!NUIT_REGEX.test(nuit)) {
    return {
      valid: false,
      message: 'O NUIT deve conter exactamente 9 dígitos.',
    };
  }

  return { valid: true };
}

export function validateMzPhone(value: string): ValidationResult {
  const phone = value.replace(/\s+/g, '');

  if (!phone) {
    return {
      valid: false,
      message: 'Telefone é obrigatório.',
    };
  }

  const valid =
    /^(\+258)?8[2-7]\d{7}$/.test(phone) ||
    /^(\+258)?2\d{7}$/.test(phone);

  if (!valid) {
    return {
      valid: false,
      message: 'Telefone inválido.',
    };
  }

  return { valid: true };
}