#!/usr/bin/env npx ts-node
/**
 * One-time auth script for Spotify PKCE flow.
 * Run this once to authorize and save refresh token.
 *
 * Usage:
 *   SPOTIFY_CLIENT_ID=your_client_id npx ts-node src/auth.ts
 *
 * Or set SPOTIFY_CLIENT_ID in ~/.claude-spotify/.env
 */

import { createServer } from "http";
import { URL } from "url";
import { randomBytes, createHash } from "crypto";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { execFile } from "child_process";

// Use current working directory (run from project root)
const PROJECT_ROOT = process.cwd();
const TOKENS_PATH = join(PROJECT_ROOT, "tokens.json");
const ENV_PATH = join(PROJECT_ROOT, ".env");

const REDIRECT_URI = "http://127.0.0.1:8888/callback";
const SCOPES = [
  "user-modify-playback-state",
  "user-read-playback-state",
  "user-read-currently-playing",
].join(" ");

interface TokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
}

interface SavedTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  clientId: string;
}

function loadEnv(): void {
  if (existsSync(ENV_PATH)) {
    const content = readFileSync(ENV_PATH, "utf-8");
    for (const line of content.split("\n")) {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").trim();
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    }
  }
}

function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

function openBrowser(url: string): void {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  execFile(cmd, args, (err) => {
    if (err) {
      console.error("Could not open browser automatically.");
      console.error(`Please open this URL manually:\n${url}`);
    }
  });
}

async function exchangeCodeForTokens(code: string, codeVerifier: string, clientId: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: clientId,
    code_verifier: codeVerifier,
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json() as Promise<TokenResponse>;
}

function saveTokens(tokens: TokenResponse, clientId: string): void {
  const saved: SavedTokens = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    clientId,
  };
  writeFileSync(TOKENS_PATH, JSON.stringify(saved, null, 2));
  console.log(`\nTokens saved to ${TOKENS_PATH}`);
}

async function main(): Promise<void> {
  loadEnv();

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    console.error("Error: SPOTIFY_CLIENT_ID not set.");
    console.error("\nTo set up:");
    console.error("1. Go to https://developer.spotify.com/dashboard");
    console.error("2. Create an app");
    console.error("3. Add redirect URI: http://127.0.0.1:8888/callback");
    console.error("4. Copy the Client ID");
    console.error(`5. Create ${ENV_PATH} with: SPOTIFY_CLIENT_ID=your_client_id`);
    console.error("\nOr run with: SPOTIFY_CLIENT_ID=xxx npx ts-node src/auth.ts");
    process.exit(1);
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("code_challenge", codeChallenge);

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url || "", `http://${req.headers.host}`);

      if (url.pathname === "/callback") {
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        if (error) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`<html><body><h1>Authorization Failed</h1><p>${error}</p></body></html>`);
          server.close();
          reject(new Error(error));
          return;
        }

        if (!code) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<html><body><h1>No code received</h1></body></html>");
          server.close();
          reject(new Error("No authorization code received"));
          return;
        }

        try {
          const tokens = await exchangeCodeForTokens(code, codeVerifier, clientId);
          saveTokens(tokens, clientId);

          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                <div style="text-align: center;">
                  <h1 style="color: #1DB954;">Spotify Connected!</h1>
                  <p>You can close this window and return to the terminal.</p>
                </div>
              </body>
            </html>
          `);
          server.close();
          resolve();
        } catch (err) {
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end(`<html><body><h1>Error</h1><p>${err}</p></body></html>`);
          server.close();
          reject(err);
        }
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(8888, "127.0.0.1", () => {
      console.log("Starting Spotify authorization...");
      console.log("Opening browser for login...\n");
      openBrowser(authUrl.toString());
      console.log("Waiting for authorization callback...");
    });

    server.on("error", (err) => {
      reject(err);
    });
  });
}

main()
  .then(() => {
    console.log("\nAuthorization complete! You can now use the Spotify MCP server.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\nAuthorization failed:", err.message);
    process.exit(1);
  });
