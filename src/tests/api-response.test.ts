import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppError } from '../shared/errors/app-error';
import { toAppError } from '../shared/errors/app-error';

describe('app errors', () => {
  it('preserves structured app errors', () => {
    const error = new AppError({ code: 'TEST', message: 'test', statusCode: 418 });
    expect(toAppError(error)).toBe(error);
  });

  it('wraps unknown errors', () => {
    const error = toAppError(new Error('boom'));
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.message).toBe('boom');
  });

  it('maps zod errors to invalid request', () => {
    const schema = z.object({
      refreshToken: z.string().min(1)
    });

    const error = toAppError(schema.safeParse({}).error);
    expect(error.code).toBe('INVALID_REQUEST');
    expect(error.statusCode).toBe(400);
  });
});
