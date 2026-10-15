import http from "node:http";
import { scanConnectedDevices } from "./scan.mjs";

export const AGENT_VERSION = "1.0.0";
export const DEFAULT_AGENT_PORT = 9477;

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function corsHeaders(origin) {
  const allow =
    origin && ALLOWED_ORIGINS.has(origin) ? origin : "http://localhost:3000";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export function createHardwareAgentServer() {
  return http.createServer(async (req, res) => {
    const origin = req.headers.origin || "";
    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
    };

    if (req.method === "OPTIONS") {
      res.writeHead(204, headers);
      res.end();
      return;
    }

    if (req.url === "/v1/health" && req.method === "GET") {
      res.writeHead(200, headers);
      res.end(JSON.stringify({ ok: true, version: AGENT_VERSION }));
      return;
    }

    if (req.url === "/v1/scan" && req.method === "GET") {
      try {
        const scan = await scanConnectedDevices();
        res.writeHead(200, headers);
        res.end(
          JSON.stringify({
            agentVersion: AGENT_VERSION,
            platform: scan.platform,
            devices: scan.devices,
          })
        );
      } catch (e) {
        res.writeHead(500, headers);
        res.end(
          JSON.stringify({
            error: e instanceof Error ? e.message : "Scan failed",
          })
        );
      }
      return;
    }

    res.writeHead(404, headers);
    res.end(JSON.stringify({ error: "Not found" }));
  });
}

/**
 * @param {{ port?: number; onListen?: (url: string) => void }} [options]
 */
export function startHardwareAgent(options = {}) {
  const port = Number(options.port ?? process.env.SIMS_HARDWARE_AGENT_PORT ?? DEFAULT_AGENT_PORT);
  const server = createHardwareAgentServer();

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.removeListener("error", reject);
      const url = `http://127.0.0.1:${port}`;
      options.onListen?.(url);
      resolve({ server, port, url });
    });
  });
}

import path from "node:path";
import { pathToFileURL } from "node:url";

function isRunningDirectly() {
  if (!process.argv[1]) return false;
  try {
    return import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
  } catch {
    return false;
  }
}

if (isRunningDirectly()) {
  startHardwareAgent({
    onListen(url) {
      console.log(`SIMS Hardware Agent listening on ${url}`);
      console.log("Keep this window open while using SIMS hardware detection.");
    },
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
