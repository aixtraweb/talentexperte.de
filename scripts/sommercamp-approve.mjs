#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  collectSocialMediaUsage,
  duplicateUsageForPost,
  formatUsageRecords
} from './social-media-guard.mjs';

const root = process.cwd();
const pending = path.join(root, 'social-posts.pending.json');
const approved = path.join(root, 'social-posts.approved.json');

if (!fs.existsSync(pending)) {
  console.error('No pending file found. Run: npm run sommercamp:plan');
  process.exit(1);
}

const posts = JSON.parse(fs.readFileSync(pending, 'utf8'));
const usage = collectSocialMediaUsage(root);
const blocked = [];

for (const post of posts) {
  const duplicates = duplicateUsageForPost(post, usage);
  if (duplicates.length) {
    blocked.push(`${post.id}: ${formatUsageRecords(duplicates)}`);
  }
}

if (blocked.length) {
  console.error(`Duplicate social media blocked:\n- ${blocked.join('\n- ')}`);
  process.exit(1);
}

fs.copyFileSync(pending, approved);
console.log(JSON.stringify({ approved: 'social-posts.approved.json' }, null, 2));
