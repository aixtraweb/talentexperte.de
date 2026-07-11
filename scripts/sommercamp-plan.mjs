#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  collectSocialMediaUsage,
  listImageSources,
  selectFreshSources
} from './social-media-guard.mjs';

const root = process.cwd();
loadEnv(path.join(root, '.env.automation'));
loadEnv(path.join(root, '.env.social'));

const now = new Date();
const tzOffset = '+02:00'; // Europe/Berlin

const planDate = getArgValue('--date') || now.toISOString().slice(0, 10);
const deploy = process.argv.includes('--deploy') || flag('AUTO_DEPLOY');

const nextTuesday = nextWeekday(planDate, 2); // 0=Sun ... 2=Tue
const nextFriday = nextWeekday(planDate, 5);

const postSpecs = [
  {
    isoDate: nextTuesday,
    time: '18:30:00',
    key: 'sommercamp-action',
    title: 'Sommercamp 2026: Action, Freunde, Ferien.',
    caption: captionAction()
  },
  {
    isoDate: nextFriday,
    time: '17:00:00',
    key: 'sommercamp-teamgeist',
    title: 'Sommercamp 2026: Teamgeist & Selbstvertrauen.',
    caption: captionTeamgeist()
  }
];

const usage = collectSocialMediaUsage(root);
const candidates = listImageSources(root);
const sources = selectFreshSources(candidates, usage, postSpecs.length, planDate);

if (sources.length < postSpecs.length) {
  throw new Error([
    `Not enough fresh social-input images for ${postSpecs.length} Sommercamp posts.`,
    `Fresh images found: ${sources.length}. Add new photos to images/social-input/ or archive old usage intentionally.`
  ].join(' '));
}

const posts = postSpecs.map((spec, index) => buildPost({ ...spec, source: sources[index] }));

for (const post of posts) {
  runNode('scripts/social-image-create.mjs', [
    '--date', post._isoDate,
    '--title', post._imageTitle,
    '--kicker', 'MACH MIT!',
    '--source', post._source,
    '--out', post._localImagePath
  ]);
}

fs.writeFileSync(path.join(root, 'social-posts.pending.json'), `${JSON.stringify(posts.map(stripPrivateFields), null, 2)}\n`);

const planDir = path.join(root, 'drafts', 'social-plan');
fs.mkdirSync(planDir, { recursive: true });
const planPath = path.join(planDir, `${planDate}-sommercamp-plan.md`);
fs.writeFileSync(planPath, renderPlan(planDate, posts));

if (deploy) {
  runCommand('./ci/deploy.sh', []);
}

console.log(JSON.stringify({ planPath, pendingPosts: 'social-posts.pending.json', deploy }, null, 2));

function buildPost({ isoDate, time, key, title, source, caption }) {
  const imagePath = `images/social-output/${isoDate}-${key}.jpg`;
  const mediaUrl = `${publicBaseUrl()}/${imagePath}`;
  return {
    id: `${key}-${isoDate}`,
    platforms: ['instagram', 'facebook'],
    scheduledAt: `${isoDate}T${time}${tzOffset}`,
    mediaUrl,
    sourceAsset: source,
    caption,

    _isoDate: isoDate,
    _source: source,
    _imageTitle: title,
    _localImagePath: imagePath
  };
}

function stripPrivateFields(post) {
  const clone = { ...post };
  for (const k of Object.keys(clone)) {
    if (k.startsWith('_')) delete clone[k];
  }
  return clone;
}

function renderPlan(planDate, posts) {
  const blocks = posts
    .map((p) => {
      const abs = path.join(root, p._localImagePath);
      return `## ${p.id}

Geplant: ${p.scheduledAt}
Plattformen: ${p.platforms.join(', ')}
Asset: ${p._source}
Output: ${abs}
URL: ${p.mediaUrl}

![Vorschau](${abs})

Caption:

${p.caption}
`;
    })
    .join('\n');

  return `# Sommercamp Social Plan (${planDate})

Ziel: 2 Posts/Woche (Dienstag + Freitag). Erst nach Freigabe veroeffentlichen.
Bildregel: Jeder Beitrag nutzt ein frisches Quellbild. Bereits geplante, generierte oder veroeffentlichte Quellen werden uebersprungen.

Freigabe-Workflow:
1) Plan pruefen: ${path.join(root, 'drafts', 'social-plan')}
2) Freigeben: npm run sommercamp:approve
3) Publisher-Job postet automatisch zu den Terminen.

${blocks}
`;
}

function captionAction() {
  return [
    'Sommercamp 2026: Action, Freunde, Ferien.',
    '',
    'Vier Tage, die sich nach echten Sommerferien anfuehlen: viel Bewegung, neue Freunde und kleine Erfolgsmomente, die Kinder stolz machen.',
    '',
    'Sommercamp I: 20.07.–23.07.2026 | Sommercamp II: 24.08.–27.08.2026',
    '5–14 Jahre · taeglich 09:00–15:00 · 149 EUR (inkl. Mittagessen, Getraenke & Obst)',
    '',
    'Jetzt anmelden: https://www.talentexperte.de/anmeldung.html',
    '',
    '#talentexperte #fussballcamp #fussballcampaachen #sommercampaachen #aachen #kinderfussball #feriencamp'
  ].join('\n');
}

function captionTeamgeist() {
  return [
    'Sommercamp 2026: Teamgeist & Selbstvertrauen.',
    '',
    'Wenn Kinder zusammen trainieren, lachen und sich gegenseitig anfeuern, passiert etwas Besonderes: Sie werden mutiger. Und gehen mit einem guten Gefuehl nach Hause.',
    '',
    'Sommercamp I: 20.07.–23.07.2026 | Sommercamp II: 24.08.–27.08.2026',
    '5–14 Jahre · taeglich 09:00–15:00 · 149 EUR (inkl. Mittagessen, Getraenke & Obst)',
    '',
    'Jetzt anmelden: https://www.talentexperte.de/anmeldung.html',
    '',
    '#talentexperte #fussballcamp #fussballcampaachen #sommercampaachen #aachen #kinderfussball #feriencamp'
  ].join('\n');
}

function nextWeekday(fromIsoDate, targetDow) {
  const d = new Date(`${fromIsoDate}T12:00:00Z`);
  const current = d.getUTCDay();
  let delta = (targetDow - current + 7) % 7;
  if (delta === 0) delta = 7;
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function runNode(script, args) {
  return runCommand(process.execPath, [script, ...args]);
}

function runCommand(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
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

function flag(name) {
  return process.env[name] === '1' || process.env[name] === 'true';
}

function getArgValue(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : null;
}

function publicBaseUrl() {
  return process.env.PUBLIC_BASE_URL || 'https://www.talentexperte.de';
}
