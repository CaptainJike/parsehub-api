import { randomUUID } from 'node:crypto';
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
  }
}

const requestContextPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (request, reply) => {
    const incoming = request.headers['x-request-id'];
    request.requestId = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
    reply.header('x-request-id', request.requestId);
  });
};

export default fp(requestContextPlugin, { name: 'request-context' });
