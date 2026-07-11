#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  collectSocialMediaUsage,
  duplicateUsageForPost,
  formatUsageRecords
} from './social-media-guard.mjs';

const root = process.cwd();
loadEnv(path.join(root, '.env.automation'));
loadEnv(path.join(root, '.env.social'));

const date = getArgValue('--date') || new Date().toISOString().slice(0, 10);
const autoBlog = flag('AUTO_PUBLISH_BLOG') || process.argv.includes('--public-blog');
const autoDeploy = flag('AUTO_DEPLOY') || process.argv.includes('--deploy');
const autoPost = flag('AUTO_POST_SOCIAL') || process.argv.includes('--post-social');
const runId = `${date}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const runDir = path.join(root, 'automation-runs', runId);
fs.mkdirSync(runDir, { recursive: true });
fs.mkdirSync(path.join(root, 'drafts', 'social'), { recursive: true });
fs.mkdirSync(path.join(root, 'logs'), { recursive: true });

const blog = runNode('scripts/blog-create.mjs', [
  '--date', date,
  '--json',
  ...(autoBlog ? ['--public'] : [])
], true);

const socialImagePath = `images/social-output/${date}-${blog.topicKey}.jpg`;
const image = runNode('scripts/social-image-create.mjs', [
  '--date', date,
  '--title', imageTitleFor(blog.topicKey),
  '--subline', imageSublineFor(blog.topicKey),
  '--kicker', 'MACH MIT!',
  '--out', socialImagePath
], true);

const post = buildSocialPost(blog, image, date);
const draftPath = path.join(root, 'drafts', 'social', `${date}-${blog.topicKey}.md`);
fs.writeFileSync(draftPath, toDraft(post, blog, image));

if (autoBlog || autoPost) {
  upsertSocialPost(post);
}

if (autoPost && !autoDeploy) {
  throw new Error('AUTO_POST_SOCIAL requires AUTO_DEPLOY=1 so the generated image is public before posting.');
}

if (autoDeploy) {
  runCommand('./ci/deploy.sh', []);
}

if (autoPost) {
  runCommand('npm', ['run', 'social:publish']);
}

const summary = {
  runId,
  date,
  mode: {
    autoBlog,
    autoDeploy,
    autoPost
  },
  blog,
  image,
  socialDraft: draftPath,
  socialPostQueued: autoBlog || autoPost
};

fs.writeFileSync(path.join(runDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
notifySuccess(summary);
console.log(JSON.stringify(summary, null, 2));

function buildSocialPost(blog, image, isoDate) {
  return {
    id: `${blog.topicKey}-${isoDate}`,
    platforms: ['instagram', 'facebook'],
    scheduledAt: `${isoDate}T18:30:00+02:00`,
    mediaUrl: image.publicUrl,
    sourceAsset: image.source,
    caption: [
      `${blog.title}`,
      '',
      'Manche Ferienmomente bleiben lange im Kopf: ein gelungenes Dribbling, ein neuer Freund, ein gemeinsames Lachen nach dem Training.',
      '',
      'Bei TALENTEXPERTE erleben Kinder von 5 bis 14 Jahren vier Tage voller Fußball, Bewegung und Teamgefühl. Für Eltern gibt es klare Zeiten, gute Betreuung und ein Angebot, das den Ferientag sinnvoll füllt.',
      '',
      `Mehr dazu im neuen Blogartikel: ${blog.publicUrl}`,
      '',
      'Jetzt Platz sichern:',
      'https://www.talentexperte.de/anmeldung.html',
      '',
      '#talentexperte #fussballcamp #fussballcampaachen #sommercampaachen #feriencampaachen #aachen #kinderfussball #sommerferien #teamgeist #selbstvertrauen'
    ].join('\n')
  };
}

function imageTitleFor(topicKey) {
  const titles = {
    'sommercamp-selbstvertrauen': 'SOMMERCAMP 2026',
    'ferien-mit-struktur': 'FERIEN MIT BALL',
    'neue-freunde': 'SOMMERCAMP 2026',
    'technik-spiel-spass': 'TRAINIEREN. SPIELEN. LACHEN.'
  };
  return titles[topicKey] || 'SOMMERCAMP 2026';
}

function imageSublineFor(topicKey) {
  const sublines = {
    'sommercamp-selbstvertrauen': 'Fussballcamp fuer Kinder',
    'ferien-mit-struktur': 'Spass, Teamgeist, Betreuung',
    'neue-freunde': 'Fussballcamp fuer Kinder',
    'technik-spiel-spass': 'Fussball. Freunde. Ferien.'
  };
  return sublines[topicKey] || 'Fussballcamp fuer Kinder';
}

function toDraft(post, blog, image) {
  const absoluteImagePath = path.join(root, image.imagePath);
  return `# Social-Draft ${post.id}

Blog: ${blog.title}
Blog URL: ${blog.publicUrl}
Bild lokal: ${absoluteImagePath}
Bild URL: ${image.publicUrl}
Geplant: ${post.scheduledAt}
Plattformen: ${post.platforms.join(', ')}

![Vorschau](${absoluteImagePath})

## Caption

${post.caption}
`;
}

function upsertSocialPost(post) {
  const duplicates = duplicateUsageForPost(post, collectSocialMediaUsage(root));
  if (duplicates.length) {
    throw new Error(`Duplicate social media blocked for ${post.id}: ${formatUsageRecords(duplicates)}`);
  }

  const file = path.join(root, 'social-posts.json');
  let posts = [];
  if (fs.existsSync(file)) posts = JSON.parse(fs.readFileSync(file, 'utf8'));
  const idx = posts.findIndex((item) => item.id === post.id);
  if (idx >= 0) posts[idx] = post;
  else posts.push(post);
  fs.writeFileSync(file, `${JSON.stringify(posts, null, 2)}\n`);
}

function runNode(script, args, parseJson = false) {
  return runCommand(process.execPath, [script, ...args], parseJson);
}

function notifySuccess(summary) {
  runNode('scripts/notify-automation.mjs', [
    '--title', 'TALENTEXPERTE Entwurf fertig',
    '--message', `Blog und Social-Entwurf fuer ${summary.date} wurden erstellt.`,
    '--body', [
      `Blog: ${summary.blog.markdownPath}`,
      `Social: ${summary.socialDraft}`,
      `Bild: ${path.join(root, summary.image.imagePath)}`
    ].join('\n')
  ]);
}

function runCommand(command, args, parseJson = false) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: process.env
  });
  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
  if (!parseJson) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    return result.stdout;
  }
  const text = result.stdout.trim();
  return JSON.parse(text.slice(text.indexOf('{')));
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
  return ['1', 'true', 'yes', 'on'].includes(String(process.env[name] || '').toLowerCase());
}

function getArgValue(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : null;
}
