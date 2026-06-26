import { env } from './config/env';
import { buildApp } from './app';

const app = buildApp();

async function main(): Promise<void> {
  try {
    await app.listen({ host: env.HOST, port: env.PORT });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void main();
