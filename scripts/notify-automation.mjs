#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

loadEnv(path.join(process.cwd(), '.env.automation'));

const title = getArgValue('--title') || 'TALENTEXPERTE Automation';
const message = getArgValue('--message') || 'Der Automatisierungslauf ist fertig.';
const body = getArgValue('--body') || message;

let sent = false;

if (flag('ENABLE_MACOS_NOTIFICATION', true)) {
  const result = spawnSync('osascript', [
    '-e',
    `display notification ${JSON.stringify(message)} with title ${JSON.stringify(title)}`
  ], { encoding: 'utf8' });
  sent = sent || result.status === 0;
  if (result.status !== 0 && result.stderr) process.stderr.write(result.stderr);
}

if (process.env.NOTIFY_EMAIL) {
  const result = spawnSync('mail', ['-s', title, process.env.NOTIFY_EMAIL], {
    encoding: 'utf8',
    input: body
  });
  sent = sent || result.status === 0;
  if (result.status !== 0 && result.stderr) process.stderr.write(result.stderr);
}

if (process.env.NOTIFY_WEBHOOK_URL) {
  try {
    const response = await fetch(process.env.NOTIFY_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, message, body })
    });
    sent = sent || response.ok;
    if (!response.ok) process.stderr.write(`Webhook notification failed: HTTP ${response.status}\n`);
  } catch (error) {
    process.stderr.write(`Webhook notification failed: ${error.message}\n`);
  }
}

process.exit(sent ? 0 : 0);

function getArgValue(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : null;
}

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function flag(name, defaultValue = false) {
  const value = process.env[name];
  if (value === undefined || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}
