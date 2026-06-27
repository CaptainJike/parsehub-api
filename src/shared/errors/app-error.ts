import { ZodError } from 'zod';

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly retryable: boolean;

  constructor(params: { code: string; message: string; statusCode?: number; retryable?: boolean }) {
    super(params.message);
    this.name = 'AppError';
    this.code = params.code;
    this.statusCode = params.statusCode ?? 500;
    this.retryable = params.retryable ?? false;
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const looksLikeZodError =
    error instanceof ZodError ||
    (typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'ZodError' &&
      'issues' in error &&
      Array.isArray(error.issues));

  if (looksLikeZodError) {
    return new AppError({
      code: 'INVALID_REQUEST',
      message: 'Request validation failed.',
      statusCode: 400,
      retryable: false
    });
  }

  const looksLikeFastifyValidationError =
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    error.statusCode === 400 &&
    'validation' in error &&
    Array.isArray(error.validation);

  if (looksLikeFastifyValidationError) {
    return new AppError({
      code: 'INVALID_REQUEST',
      message: 'Request validation failed.',
      statusCode: 400,
      retryable: false
    });
  }

  if (error instanceof Error) {
    return new AppError({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Internal error',
      statusCode: 500,
      retryable: false
    });
  }

  return new AppError({
    code: 'INTERNAL_ERROR',
    message: 'Internal error',
    statusCode: 500,
    retryable: false
  });
}
