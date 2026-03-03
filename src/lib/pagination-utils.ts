export function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function coercePositiveInteger(value: unknown, fallback: number): number {
  const parsed = parseNumber(value);
  if (parsed === null) {
    return fallback;
  }

  return Math.max(1, Math.floor(parsed));
}

export function coerceNonNegativeInteger(
  value: unknown,
  fallback: number,
): number {
  const parsed = parseNumber(value);
  if (parsed === null) {
    return fallback;
  }

  return Math.max(0, Math.floor(parsed));
}

export function coerceOptionalBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value === '') {
    return true;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  return Boolean(value);
}
