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
