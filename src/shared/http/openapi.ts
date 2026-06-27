import type { FastifyDynamicSwaggerOptions } from '@fastify/swagger';

const errorObjectSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reason: { type: 'string' },
    retryable: { type: 'boolean' }
  },
  required: ['reason', 'retryable']
} as const;

const successEnvelopeBase = {
  type: 'object',
  additionalProperties: false,
  properties: {
    requestId: { type: 'string' },
    status: { type: 'boolean', enum: [true] },
    code: { type: 'string' },
    message: { type: 'string' }
  },
  required: ['requestId', 'status', 'code', 'message']
} as const;

const errorEnvelopeSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    requestId: { type: 'string' },
    status: { type: 'boolean', enum: [false] },
    code: { type: 'string' },
    message: { type: 'string' },
    error: errorObjectSchema
  },
  required: ['requestId', 'status', 'code', 'message', 'error']
} as const;

export const bearerSecurity = [{ bearerAuth: [] }] as const;

export const openApiOptions: FastifyDynamicSwaggerOptions = {
  openapi: {
    info: {
      title: 'parsehub-api',
      description: 'Stable media parsing API for the parsehub mini-program backend.',
      version: '0.1.0'
    },
    tags: [
      { name: 'system', description: 'Health and readiness endpoints' },
      { name: 'auth', description: 'Authentication endpoints' },
      { name: 'users', description: 'Current user profile and quota' },
      { name: 'parse', description: 'Media parsing endpoints' },
      { name: 'rewards', description: 'Ad reward quota endpoints' },
      { name: 'payments', description: 'Order and payment callback endpoints' },
      { name: 'admin', description: 'Administrative placeholder endpoints' }
    ],
    servers: [
      {
        url: '/'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  }
};

export function successResponseSchema(dataSchema: Record<string, unknown>, extra?: Record<string, unknown>) {
  return {
    ...successEnvelopeBase,
    properties: {
      ...successEnvelopeBase.properties,
      ...(extra ?? {}),
      data: dataSchema
    },
    required: [...successEnvelopeBase.required, 'data']
  };
}

export function errorResponseSchema() {
  return errorEnvelopeSchema;
}
