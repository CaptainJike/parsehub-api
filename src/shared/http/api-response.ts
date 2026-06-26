import type { FastifyReply } from 'fastify';
import { toAppError } from '../errors/app-error';

export interface ApiResponse<T = unknown> {
  requestId: string;
  status: boolean;
  code: string;
  message: string;
  data?: T;
  error?: {
    reason: string;
    retryable: boolean;
  };
}

export function sendSuccess<T>(
  reply: FastifyReply,
  requestId: string,
  data: T,
  message = 'OK',
  code = 'OK'
): FastifyReply {
  const body: ApiResponse<T> = {
    requestId,
    status: true,
    code,
    message,
    data
  };

  return reply.send(body);
}

export function sendError(reply: FastifyReply, requestId: string, error: unknown): FastifyReply {
  const appError = toAppError(error);
  const body: ApiResponse = {
    requestId,
    status: false,
    code: appError.code,
    message: appError.message,
    error: {
      reason: appError.code,
      retryable: appError.retryable
    }
  };

  return reply.code(appError.statusCode).send(body);
}
