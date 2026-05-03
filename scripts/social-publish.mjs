#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const envPath = path.join(root, '.env.social');

loadEnv(envPath);

const graphVersion = env('META_GRAPH_VERSION') || 'v24.0';

const args = new Set(process.argv.slice(2));
const publish = args.has('--publish');
const force = args.has('--force');
const postsPath = getArgValue('--posts') || 'social-posts.sample.json';
const publishedPath = path.join(root, 'social-published.json');
const publishedLog = loadPublishedLog(publishedPath);
const posts = JSON.parse(fs.readFileSync(path.resolve(root, postsPath), 'utf8'));

if (!Array.isArray(posts) || posts.length === 0) {
  throw new Error('Posts file must contain a non-empty array.');
}

for (const post of posts) {
  validatePost(post);
  console.log(`\n=== ${post.id} ===`);
  const pendingPlatforms = force
    ? post.platforms
    : post.platforms.filter((platform) => !isPublished(publishedLog, post.id, platform));

  if (!publish) {
    console.log('Dry run only. Add --publish to post live.');
    console.log(`Platforms: ${post.platforms.join(', ')}`);
    if (pendingPlatforms.length !== post.platforms.length) {
      const skipped = post.platforms.filter((platform) => !pendingPlatforms.includes(platform));
      console.log(`Already published: ${skipped.join(', ')}`);
    }
    console.log(`Pending: ${pendingPlatforms.join(', ') || 'none'}`);
    console.log(`Media: ${post.mediaUrl}`);
    continue;
  }

  if (pendingPlatforms.length === 0) {
    console.log('Skipped: all requested platforms were already published. Use --force to publish again.');
    continue;
  }

  if (pendingPlatforms.includes('facebook')) {
    const result = await publishFacebookPhoto(post);
    markPublished(publishedLog, post.id, 'facebook', result);
    savePublishedLog(publishedPath, publishedLog);
  }
  if (pendingPlatforms.includes('instagram')) {
    const result = await publishInstagramPhoto(post);
    markPublished(publishedLog, post.id, 'instagram', result);
    savePublishedLog(publishedPath, publishedLog);
  }
  if (pendingPlatforms.includes('googleBusiness')) {
    const result = await publishGoogleBusinessPost(post);
    markPublished(publishedLog, post.id, 'googleBusiness', result);
    savePublishedLog(publishedPath, publishedLog);
  }
}

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function env(name) {
  return process.env[name] || '';
}

function getArgValue(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : null;
}

function loadPublishedLog(file) {
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function savePublishedLog(file, log) {
  fs.writeFileSync(file, `${JSON.stringify(log, null, 2)}\n`);
}

function isPublished(log, postId, platform) {
  return Boolean(log[postId]?.[platform]?.publishedAt);
}

function markPublished(log, postId, platform, result) {
  log[postId] ||= {};
  log[postId][platform] = {
    publishedAt: new Date().toISOString(),
    result
  };
}

function validatePost(post) {
  if (!post.id) throw new Error('Post is missing id.');
  if (!Array.isArray(post.platforms)) throw new Error(`${post.id}: platforms must be an array.`);
  if (!post.mediaUrl || !/^https:\/\//.test(post.mediaUrl)) {
    throw new Error(`${post.id}: mediaUrl must be a public HTTPS URL.`);
  }
  if (!post.caption) throw new Error(`${post.id}: caption is required.`);
}

async function publishFacebookPhoto(post) {
  requireEnv(['FACEBOOK_PAGE_ID', 'FACEBOOK_PAGE_ACCESS_TOKEN']);
  const url = `https://graph.facebook.com/${graphVersion}/${env('FACEBOOK_PAGE_ID')}/photos`;
  const body = new URLSearchParams({
    url: post.mediaUrl,
    caption: post.caption,
    published: 'true',
    access_token: env('FACEBOOK_PAGE_ACCESS_TOKEN')
  });
  const json = await postForm(url, body);
  const id = json.post_id || json.id;
  console.log(`Facebook published: ${id}`);
  return { id };
}

async function publishInstagramPhoto(post) {
  requireEnv(['INSTAGRAM_USER_ID', 'INSTAGRAM_ACCESS_TOKEN']);
  const mediaUrl = `https://graph.facebook.com/${graphVersion}/${env('INSTAGRAM_USER_ID')}/media`;
  const mediaBody = new URLSearchParams({
    image_url: post.mediaUrl,
    caption: post.caption,
    access_token: env('INSTAGRAM_ACCESS_TOKEN')
  });
  const media = await postForm(mediaUrl, mediaBody);

  const publishUrl = `https://graph.facebook.com/${graphVersion}/${env('INSTAGRAM_USER_ID')}/media_publish`;
  const publishBody = new URLSearchParams({
    creation_id: media.id,
    access_token: env('INSTAGRAM_ACCESS_TOKEN')
  });
  const json = await postForm(publishUrl, publishBody);
  console.log(`Instagram published: ${json.id}`);
  return { id: json.id };
}

async function publishGoogleBusinessPost(post) {
  requireEnv(['GOOGLE_BIZ_ACCOUNT_ID', 'GOOGLE_BIZ_LOCATION_ID']);
  const token = await getGoogleAccessToken();
  const account = env('GOOGLE_BIZ_ACCOUNT_ID');
  const location = env('GOOGLE_BIZ_LOCATION_ID');
  const url = `https://mybusiness.googleapis.com/v4/accounts/${account}/locations/${location}/localPosts`;
  const body = {
    languageCode: 'de-DE',
    summary: post.googleSummary || post.caption,
    topicType: 'STANDARD',
    callToAction: {
      actionType: post.ctaType || 'LEARN_MORE',
      url: post.ctaUrl || 'https://www.talentexperte.de/anmeldung.html'
    },
    media: [
      {
        mediaFormat: 'PHOTO',
        sourceUrl: post.mediaUrl
      }
    ]
  };
  const json = await postJson(url, body, token);
  const id = json.name || json.searchUrl || 'created';
  console.log(`Google Business Profile published: ${id}`);
  return { id };
}

async function getGoogleAccessToken() {
  if (env('GOOGLE_ACCESS_TOKEN')) return env('GOOGLE_ACCESS_TOKEN');
  requireEnv(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN']);
  const body = new URLSearchParams({
    client_id: env('GOOGLE_CLIENT_ID'),
    client_secret: env('GOOGLE_CLIENT_SECRET'),
    refresh_token: env('GOOGLE_REFRESH_TOKEN'),
    grant_type: 'refresh_token'
  });
  const json = await postForm('https://oauth2.googleapis.com/token', body);
  if (!json.access_token) throw new Error('Google refresh did not return access_token.');
  return json.access_token;
}

async function postForm(url, body) {
  const res = await fetch(url, { method: 'POST', body });
  return parseResponse(res);
}

async function postJson(url, body, token) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  return parseResponse(res);
}

async function parseResponse(res) {
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

function requireEnv(names) {
  const missing = names.filter((name) => !env(name));
  if (missing.length) {
    throw new Error(`Missing env values: ${missing.join(', ')}. Create .env.social from .env.social.example.`);
  }
}
