import request from "supertest";
import { createServer } from "http";
import next from "next";

// Utilitaire pour lancer Next.js en mode test
export async function setupTestServer() {
  const app = next({ dev: true, dir: "." });
  await app.prepare();
  const handle = app.getRequestHandler();
  const server = createServer((req, res) => handle(req, res));
  return server;
}
