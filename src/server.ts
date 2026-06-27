import { existsSync } from 'node:fs';

async function main(): Promise<void> {
  if (existsSync('.env')) {
    process.loadEnvFile();
  }

  const [{ env }, { buildApp }] = await Promise.all([import('./config/env.js'), import('./app.js')]);
  const app = buildApp();

  try {
    await app.listen({ host: env.HOST, port: env.PORT });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void main();
