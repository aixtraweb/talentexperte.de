#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  collectSocialMediaUsage,
  duplicateUsageForPost,
  formatUsageRecords,
  mediaKeys
} from './social-media-guard.mjs';

const root = process.cwd();
const envPath = path.join(root, '.env.social');

loadEnv(envPath);

const graphVersion = env('META_GRAPH_VERSION') || 'v24.0';

const args = new Set(process.argv.slice(2));
const publish = args.has('--publish');
const force = args.has('--force');
const ignoreSchedule = args.has('--ignore-schedule');
const postsPath = getArgValue('--posts') || 'social-posts.sample.json';
const publishedPath = path.join(root, 'social-published.json');
const publishedLog = loadPublishedLog(publishedPath);
const posts = JSON.parse(fs.readFileSync(path.resolve(root, postsPath), 'utf8'));
const usage = collectSocialMediaUsage(root);
let duplicateBlocked = false;

if (!Array.isArray(posts) || posts.length === 0) {
  throw new Error('Posts file must contain a non-empty array.');
}

for (const post of posts) {
  validatePost(post);
  console.log(`\n=== ${post.id} ===`);
  const due = isDue(post);
  const pendingPlatforms = force
    ? post.platforms
    : post.platforms.filter((platform) => !isPublished(publishedLog, post.id, platform));
  const canPublishNow = due || ignoreSchedule || force || !post.scheduledAt;
  const duplicateRecords = !force && pendingPlatforms.length > 0 && (!publish || canPublishNow)
    ? duplicateUsageForPost(post, usage)
    : [];

  if (!publish) {
    console.log('Dry run only. Add --publish to post live.');
    console.log(`Platforms: ${post.platforms.join(', ')}`);
    if (pendingPlatforms.length !== post.platforms.length) {
      const skipped = post.platforms.filter((platform) => !pendingPlatforms.includes(platform));
      console.log(`Already published: ${skipped.join(', ')}`);
    }
    console.log(`Pending: ${pendingPlatforms.join(', ') || 'none'}`);
    if (post.scheduledAt) console.log(`Scheduled: ${post.scheduledAt} (${due ? 'due' : 'not due yet'})`);
    console.log(`Media: ${post.mediaUrl}`);
    if (duplicateRecords.length) {
      duplicateBlocked = true;
      console.log(`Duplicate image blocked: ${formatUsageRecords(duplicateRecords)}`);
    }
    continue;
  }

  if (duplicateRecords.length) {
    duplicateBlocked = true;
    console.log(`Skipped: duplicate image blocked for ${post.id}: ${formatUsageRecords(duplicateRecords)}`);
    continue;
  }

  if (!due && !ignoreSchedule && !force) {
    console.log(`Skipped: scheduled for ${post.scheduledAt}. Use --ignore-schedule to publish anyway.`);
    continue;
  }

  if (pendingPlatforms.length === 0) {
    console.log('Skipped: all requested platforms were already published. Use --force to publish again.');
    continue;
  }

  if (pendingPlatforms.includes('facebook')) {
    const result = await publishFacebookPhoto(post);
    markPublished(publishedLog, post, 'facebook', result);
    savePublishedLog(publishedPath, publishedLog);
  }
  if (pendingPlatforms.includes('instagram')) {
    const result = await publishInstagramPhoto(post);
    markPublished(publishedLog, post, 'instagram', result);
    savePublishedLog(publishedPath, publishedLog);
  }
  if (pendingPlatforms.includes('googleBusiness')) {
    const result = await publishGoogleBusinessPost(post);
    markPublished(publishedLog, post, 'googleBusiness', result);
    savePublishedLog(publishedPath, publishedLog);
  }
}

if (duplicateBlocked) process.exitCode = 1;

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

function markPublished(log, post, platform, result) {
  log[post.id] ||= {};
  log[post.id][platform] = {
    publishedAt: new Date().toISOString(),
    mediaUrl: post.mediaUrl,
    mediaKey: mediaKeys(post.mediaUrl)[0] || '',
    ...(post.sourceAsset ? { sourceAsset: post.sourceAsset } : {}),
    result
  };
}

function isDue(post) {
  if (!post.scheduledAt) return true;
  const scheduled = new Date(post.scheduledAt);
  if (Number.isNaN(scheduled.getTime())) {
    throw new Error(`${post.id}: scheduledAt is not a valid date.`);
  }
  return scheduled.getTime() <= Date.now();
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
  requireEnv(['INSTAGRAM_USER_ID']);
  const token = instagramToken();
  if (!token) throw new Error('Missing Instagram access token. Set META_USER_ACCESS_TOKEN (preferred) or INSTAGRAM_ACCESS_TOKEN.');
  const mediaUrl = `https://graph.facebook.com/${graphVersion}/${env('INSTAGRAM_USER_ID')}/media`;
  const mediaBody = new URLSearchParams({
    image_url: post.mediaUrl,
    caption: post.caption,
    access_token: token
  });
  const media = await postForm(mediaUrl, mediaBody);
  await waitForInstagramMedia(media.id, token);

  const publishUrl = `https://graph.facebook.com/${graphVersion}/${env('INSTAGRAM_USER_ID')}/media_publish`;
  const publishBody = new URLSearchParams({
    creation_id: media.id,
    access_token: token
  });
  const json = await postForm(publishUrl, publishBody);
  console.log(`Instagram published: ${json.id}`);
  return { id: json.id };
}

async function waitForInstagramMedia(containerId, token) {
  const attempts = 10;
  for (let i = 1; i <= attempts; i += 1) {
    const url = new URL(`https://graph.facebook.com/${graphVersion}/${containerId}`);
    url.searchParams.set('fields', 'status_code,status');
    url.searchParams.set('access_token', token);
    const json = await getJson(url);
    if (json.status_code === 'FINISHED') return;
    if (json.status_code === 'ERROR' || json.status_code === 'EXPIRED') {
      throw new Error(`Instagram media container failed: ${JSON.stringify(json)}`);
    }
    console.log(`Instagram media not ready yet (${json.status_code || 'unknown'}), waiting...`);
    await sleep(i < 4 ? 5000 : 10000);
  }
  throw new Error(`Instagram media container ${containerId} was not ready in time.`);
}

function instagramToken() {
  return env('META_USER_ACCESS_TOKEN') || env('INSTAGRAM_ACCESS_TOKEN');
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

async function getJson(url) {
  const res = await fetch(url);
  return parseResponse(res);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
