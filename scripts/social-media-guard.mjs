import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const POST_FILES = [
  'social-posts.json',
  'social-posts.pending.json',
  'social-posts.approved.json',
  'social-posts.now.json',
  'social-posts.sample.json'
];

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export function collectSocialMediaUsage(root, options = {}) {
  const usage = createUsage();
  for (const name of POST_FILES) collectPostFile(root, path.join(root, name), usage);
  collectPublishedLog(root, usage);
  collectMarkdownDir(root, path.join(root, 'drafts', 'social-plan'), usage);
  collectMarkdownDir(root, path.join(root, 'drafts', 'social'), usage);
  collectAutomationSummaries(root, path.join(root, 'automation-runs'), usage);
  collectCodexAutomationMemory(root, usage, options.codexHome);
  return usage;
}

export function listImageSources(root, dir = 'images/social-input') {
  const base = path.join(root, dir);
  if (!fs.existsSync(base)) return [];
  const found = [];
  walk(base, (file) => {
    if (IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase())) {
      found.push(toPosix(path.relative(root, file)));
    }
  });
  return found.sort((a, b) => a.localeCompare(b));
}

export function selectFreshSources(candidates, usage, count, seed = '') {
  const selected = [];
  const selectedKeys = new Set();
  for (const candidate of rotate(candidates, seed)) {
    const keys = sourceKeys(candidate);
    if (keys.some((key) => selectedKeys.has(key))) continue;
    if (keys.some((key) => usage.sources.has(key))) continue;
    selected.push(candidate);
    for (const key of keys) selectedKeys.add(key);
    if (selected.length === count) break;
  }
  return selected;
}

export function duplicateUsageForPost(post, usage) {
  const mediaRecords = matchingRecords(usage.media, mediaKeys(post.mediaUrl), post.id);
  const source = sourceForPost(post, usage);
  const sourceRecords = source
    ? matchingRecords(usage.sources, sourceKeys(source), post.id)
    : [];
  return uniqueRecords([...mediaRecords, ...sourceRecords]);
}

export function formatUsageRecords(records) {
  return uniqueRecords(records)
    .map((record) => {
      const owner = record.postId ? `post ${record.postId}` : record.owner;
      const detail = record.value ? ` -> ${record.value}` : '';
      return `${owner}${detail}`;
    })
    .join('; ');
}

export function registerPostUsage(usage, post, owner) {
  if (post.mediaUrl) registerMedia(usage, post.mediaUrl, owner);
  const source = post.sourceAsset || post.source || post.asset;
  if (source) registerSource(usage, source, owner);
}

export function mediaKeys(value) {
  const normalized = normalizeAssetValue(value);
  if (!normalized) return [];
  return keySet([
    `media:path:${normalized.toLowerCase()}`,
    `media:file:${path.posix.basename(normalized).toLowerCase()}`
  ]);
}

export function sourceKeys(value) {
  const normalized = normalizeAssetValue(value);
  if (!normalized) return [];
  const burst = burstKey(normalized);
  return keySet([
    `source:path:${normalized.toLowerCase()}`,
    `source:file:${path.posix.basename(normalized).toLowerCase()}`,
    burst ? `source:burst:${burst}` : ''
  ]);
}

function createUsage() {
  return {
    media: new Map(),
    sources: new Map(),
    sourceByPostId: new Map()
  };
}

function collectPostFile(root, file, usage) {
  if (!fs.existsSync(file)) return;
  let posts;
  try {
    posts = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return;
  }
  if (!Array.isArray(posts)) return;
  for (const post of posts) {
    if (!post || typeof post !== 'object') continue;
    const owner = {
      owner: relativeTo(root, file),
      postId: post.id,
      value: post.mediaUrl || post.sourceAsset || ''
    };
    registerPostUsage(usage, post, owner);
  }
}

function collectPublishedLog(root, usage) {
  const file = path.join(root, 'social-published.json');
  if (!fs.existsSync(file)) return;
  let published;
  try {
    published = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return;
  }
  for (const [postId, platforms] of Object.entries(published)) {
    if (!platforms || typeof platforms !== 'object') continue;
    for (const [platform, entry] of Object.entries(platforms)) {
      if (!entry || typeof entry !== 'object') continue;
      const owner = {
        owner: `${relativeTo(root, file)}:${platform}`,
        postId,
        value: entry.mediaUrl || entry.sourceAsset || ''
      };
      if (entry.mediaUrl) registerMedia(usage, entry.mediaUrl, owner);
      if (entry.sourceAsset) registerSource(usage, entry.sourceAsset, owner);
    }
  }
}

function collectMarkdownDir(root, dir, usage) {
  if (!fs.existsSync(dir)) return;
  walk(dir, (file) => {
    if (path.extname(file).toLowerCase() === '.md') collectMarkdownFile(root, file, usage);
  });
}

function collectMarkdownFile(root, file, usage) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  let postId = null;
  for (const line of lines) {
    const heading = line.match(/^##\s+([^\s#]+)/) || line.match(/^#\s+Social-Draft\s+([^\s#]+)/);
    if (heading) postId = heading[1];
    const owner = { owner: relativeTo(root, file), postId, value: '' };

    const asset = line.match(/^(?:Asset|Source|Quelle):\s+`?(.+?)`?\s*$/i);
    if (asset && asset[1].includes('images/social-input/')) {
      registerSource(usage, asset[1], { ...owner, value: asset[1] });
    }

    const output = line.match(/^(?:Output|Bild lokal):\s+`?(.+?)`?\s*$/i);
    if (output && output[1].includes('images/social-output/')) {
      registerMedia(usage, output[1], { ...owner, value: output[1] });
    }

    const url = line.match(/^(?:URL|Bild URL):\s+`?(.+?)`?\s*$/i);
    if (url && url[1].includes('images/social-output/')) {
      registerMedia(usage, url[1], { ...owner, value: url[1] });
    }
  }
}

function collectAutomationSummaries(root, dir, usage) {
  if (!fs.existsSync(dir)) return;
  walk(dir, (file) => {
    if (path.basename(file) !== 'summary.json') return;
    let summary;
    try {
      summary = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return;
    }
    const owner = {
      owner: relativeTo(root, file),
      postId: summary?.blog?.topicKey && summary?.date ? `${summary.blog.topicKey}-${summary.date}` : null,
      value: ''
    };
    if (summary?.image?.source) registerSource(usage, summary.image.source, { ...owner, value: summary.image.source });
    if (summary?.image?.imagePath) registerMedia(usage, summary.image.imagePath, { ...owner, value: summary.image.imagePath });
    if (summary?.image?.publicUrl) registerMedia(usage, summary.image.publicUrl, { ...owner, value: summary.image.publicUrl });
  });
}

function collectCodexAutomationMemory(root, usage, codexHome) {
  const base = codexHome || process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
  const dir = path.join(base, 'automations', 'sommercamp-social-content');
  for (const name of ['memory.md', 'automation.toml']) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    const owner = { owner: file, postId: null, value: '' };
    for (const match of text.matchAll(/images\/social-input\/[^\s`,;]+/g)) {
      registerSource(usage, match[0], { ...owner, value: match[0] });
    }
    for (const match of text.matchAll(/(?:https?:\/\/[^\s`,;]+)?images\/social-output\/[^\s`,;]+/g)) {
      registerMedia(usage, match[0], { ...owner, value: match[0] });
    }
  }
}

function registerMedia(usage, value, owner) {
  addRecords(usage.media, mediaKeys(value), { ...owner, value });
}

function registerSource(usage, value, owner) {
  addRecords(usage.sources, sourceKeys(value), { ...owner, value });
  if (owner.postId && !usage.sourceByPostId.has(owner.postId)) {
    usage.sourceByPostId.set(owner.postId, value);
  }
}

function sourceForPost(post, usage) {
  return post.sourceAsset || post.source || post.asset || usage.sourceByPostId.get(post.id) || '';
}

function matchingRecords(map, keys, postId) {
  const records = [];
  for (const key of keys) {
    for (const record of map.get(key) || []) {
      if (record.postId && record.postId === postId) continue;
      records.push(record);
    }
  }
  return records;
}

function addRecords(map, keys, record) {
  for (const key of keys) {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(record);
  }
}

function normalizeAssetValue(value) {
  if (!value) return '';
  let text = String(value).trim().replace(/^`|`$/g, '').replace(/^["']|["']$/g, '');
  try {
    const parsed = new URL(text);
    text = decodeURIComponent(parsed.pathname);
  } catch {
    // Plain path.
  }
  text = toPosix(text).replace(/\\/g, '/');
  const inputIdx = text.indexOf('images/social-input/');
  if (inputIdx >= 0) return text.slice(inputIdx);
  const outputIdx = text.indexOf('images/social-output/');
  if (outputIdx >= 0) return text.slice(outputIdx);
  return text.replace(/^\.\//, '').replace(/^\/+/, '');
}

function burstKey(value) {
  const basename = path.posix.basename(value).toLowerCase();
  const match = basename.match(/^([a-z_]+)(\d{3,5})/);
  if (!match) return '';
  const prefix = match[1].replace(/_+$/g, '');
  const group = Math.floor(Number(match[2]) / 100);
  return `${prefix}:${group}`;
}

function keySet(values) {
  return [...new Set(values.filter(Boolean))];
}

function uniqueRecords(records) {
  const seen = new Set();
  const unique = [];
  for (const record of records) {
    const key = `${record.postId || record.owner}|${record.value || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(record);
  }
  return unique;
}

function rotate(items, seed) {
  if (items.length === 0) return [];
  const n = Number(String(seed).replace(/\D/g, '')) || 0;
  const start = n % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

function walk(dir, visit) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, visit);
    else if (entry.isFile()) visit(file);
  }
}

function relativeTo(root, file) {
  return toPosix(path.relative(root, file));
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}
