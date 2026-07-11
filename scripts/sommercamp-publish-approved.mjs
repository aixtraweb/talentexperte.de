#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const approved = path.join(root, 'social-posts.approved.json');

if (!fs.existsSync(approved)) {
  console.log('No approved posts file found. Skipping.');
  process.exit(0);
}

const result = spawnSync(process.execPath, ['scripts/social-publish.mjs', '--posts', 'social-posts.approved.json', '--publish'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env
});

process.exit(result.status ?? 1);

