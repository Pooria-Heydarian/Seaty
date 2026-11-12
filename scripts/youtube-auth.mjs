// One-time sign-in so the robot can upload videos to YOUR channel.
//
// 1. Google Cloud Console (same project as your API key):
//    - APIs & Services -> OAuth consent screen: User type "External", fill in the app name + your email,
//      add yourself under "Test users", then click "PUBLISH APP" (status "In production").
//      (While it is in "Testing", Google expires the sign-in after 7 days.)
//    - APIs & Services -> Credentials -> Create credentials -> OAuth client ID -> Application type "Desktop app".
// 2. Put the client ID and secret in .env:
//      YT_CLIENT_ID=...
//      YT_CLIENT_SECRET=...
// 3. Run:  npm run youtube-auth
//    Sign in with the Google account that owns the channel (pick the channel if asked).
//    Google will warn "Google hasn't verified this app": click Advanced -> Go to <app> (it's your own app).
// 4. The script saves YT_REFRESH_TOKEN into .env. Copy it into the GitHub secret YT_REFRESH_TOKEN.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { exec } from 'node:child_process';
import { loadEnv, ROOT } from './lib.mjs';

loadEnv();
const { YT_CLIENT_ID: CLIENT_ID, YT_CLIENT_SECRET: CLIENT_SECRET } = process.env;
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set YT_CLIENT_ID and YT_CLIENT_SECRET in .env first (see the comment at the top of this file).');
  process.exit(1);
}

const PORT = 53682;
const REDIRECT = `http://127.0.0.1:${PORT}/callback`;
const SCOPE = 'https://www.googleapis.com/auth/youtube.upload';
const state = crypto.randomBytes(16).toString('hex');
const verifier = crypto.randomBytes(48).toString('base64url');
const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
Object.entries({
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT,
  response_type: 'code',
  scope: SCOPE,
  access_type: 'offline',
  prompt: 'consent',
  state,
  code_challenge: challenge,
  code_challenge_method: 'S256',
}).forEach(([k, v]) => authUrl.searchParams.set(k, v));

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  if (url.pathname !== '/callback') { res.writeHead(404).end(); return; }
  if (url.searchParams.get('state') !== state) { res.writeHead(400).end('State mismatch'); return; }
  const code = url.searchParams.get('code');
  if (!code) { res.writeHead(400).end(`Sign-in cancelled: ${url.searchParams.get('error')}`); server.close(); return; }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: REDIRECT, grant_type: 'authorization_code', code_verifier: verifier }),
  });
  const tokens = await tokenRes.json();
  if (!tokens.refresh_token) {
    res.writeHead(500).end('No refresh token received. See the terminal.');
    console.error('Token exchange failed:', tokens.error_description || tokens.error || tokens);
    server.close();
    return;
  }

  const envFile = path.join(ROOT, '.env');
  let env = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
  env = env.replace(/^YT_REFRESH_TOKEN=.*$/m, '').trimEnd() + `\nYT_REFRESH_TOKEN=${tokens.refresh_token}\n`;
  fs.writeFileSync(envFile, env);

  res.writeHead(200, { 'Content-Type': 'text/html' }).end('<h2>Done! You can close this tab and go back to the terminal.</h2>');
  console.log('\n✅ Signed in. YT_REFRESH_TOKEN was saved to .env');
  console.log('Now add it to GitHub: Settings -> Secrets and variables -> Actions -> New repository secret');
  console.log('   Name: YT_REFRESH_TOKEN   Value: (the YT_REFRESH_TOKEN line in your .env file)');
  console.log('Also add YT_CLIENT_ID and YT_CLIENT_SECRET as secrets.');
  server.close();
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Opening Google sign-in in your browser. If it does not open, paste this link:\n');
  console.log(authUrl.toString() + '\n');
  const opener = process.platform === 'win32' ? `start "" "${authUrl}"` : process.platform === 'darwin' ? `open "${authUrl}"` : `xdg-open "${authUrl}"`;
  exec(opener);
});
