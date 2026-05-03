#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
loadEnv(path.join(root, '.env.social'));

const graphVersion = env('META_GRAPH_VERSION') || 'v24.0';
const googleScope = 'https://www.googleapis.com/auth/business.manage';
const googleRedirectUri = 'http://localhost:8787/oauth2callback';

const command = process.argv[2];

switch (command) {
  case 'google-url':
    googleUrl();
    break;
  case 'google-token':
    await googleToken();
    break;
  case 'google-list':
    await googleList();
    break;
  case 'meta-list':
    await metaList();
    break;
  case 'meta-url':
    metaUrl();
    break;
  case 'meta-token':
    await metaToken();
    break;
  case 'meta-save-page':
    await metaSavePage();
    break;
  case 'meta-long-token':
    await metaLongToken();
    break;
  default:
    usage();
}

function usage() {
  console.log(`Usage:
  node scripts/social-auth.mjs google-url
  node scripts/social-auth.mjs google-token <authorization_code>
  node scripts/social-auth.mjs google-list
  node scripts/social-auth.mjs meta-url
  node scripts/social-auth.mjs meta-token <authorization_code>
  node scripts/social-auth.mjs meta-list <user_or_page_access_token>
  node scripts/social-auth.mjs meta-save-page <user_or_page_access_token>
  node scripts/social-auth.mjs meta-long-token <short_lived_user_token>
`);
}

function googleUrl() {
  requireEnv(['GOOGLE_CLIENT_ID'], 'Create a Google Cloud OAuth Client of type "Desktop app" and paste its Client ID into .env.social as GOOGLE_CLIENT_ID.');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', env('GOOGLE_CLIENT_ID'));
  url.searchParams.set('redirect_uri', googleRedirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', googleScope);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  console.log(url.toString());
}

async function googleToken() {
  requireEnv(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'], 'Paste the Desktop app OAuth Client ID and Client Secret into .env.social first.');
  const code = process.argv[3];
  if (!code) throw new Error('Missing authorization code.');
  const body = new URLSearchParams({
    client_id: env('GOOGLE_CLIENT_ID'),
    client_secret: env('GOOGLE_CLIENT_SECRET'),
    code,
    grant_type: 'authorization_code',
    redirect_uri: googleRedirectUri
  });
  const json = await postForm('https://oauth2.googleapis.com/token', body);
  console.log(JSON.stringify(json, null, 2));
  if (json.refresh_token) {
    console.log('\nAdd to .env.social:');
    console.log(`GOOGLE_REFRESH_TOKEN=${json.refresh_token}`);
  }
}

async function googleList() {
  const token = await getGoogleAccessToken();
  const accounts = await getJson('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', token);
  console.log(JSON.stringify(accounts, null, 2));
  const accountName = accounts.accounts?.[0]?.name;
  if (!accountName) return;
  const locations = await getJson(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress,metadata`, token);
  console.log(JSON.stringify(locations, null, 2));
}

async function metaList() {
  const token = process.argv[3] || env('META_USER_ACCESS_TOKEN') || env('FACEBOOK_PAGE_ACCESS_TOKEN') || env('INSTAGRAM_ACCESS_TOKEN');
  if (!token) throw new Error('Pass a Meta access token or set META_USER_ACCESS_TOKEN.');
  const url = `https://graph.facebook.com/${graphVersion}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${encodeURIComponent(token)}`;
  const json = await getPublicJson(url);
  console.log(JSON.stringify(json, null, 2));
  console.log('\nUse the matching Page id/access_token and instagram_business_account.id in .env.social.');
}

function metaUrl() {
  requireEnv(['META_APP_ID'], 'Paste the Meta App ID into .env.social first.');
  const url = new URL(`https://www.facebook.com/${graphVersion}/dialog/oauth`);
  url.searchParams.set('client_id', env('META_APP_ID'));
  url.searchParams.set('redirect_uri', 'https://www.talentexperte.de/');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'instagram_basic',
    'instagram_content_publish',
    'business_management'
  ].join(','));
  console.log(url.toString());
}

async function metaToken() {
  requireEnv(['META_APP_ID', 'META_APP_SECRET'], 'Paste the Meta App ID and App Secret into .env.social first.');
  const code = process.argv[3];
  if (!code) throw new Error('Missing Meta authorization code.');
  const url = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
  url.searchParams.set('client_id', env('META_APP_ID'));
  url.searchParams.set('client_secret', env('META_APP_SECRET'));
  url.searchParams.set('redirect_uri', 'https://www.talentexperte.de/');
  url.searchParams.set('code', code);
  const json = await getPublicJson(url.toString());
  if (!json.access_token) throw new Error('Meta did not return access_token.');
  const envPath = path.join(root, '.env.social');
  let text = fs.readFileSync(envPath, 'utf8');
  text = setEnvValue(text, 'META_USER_ACCESS_TOKEN', json.access_token);
  fs.writeFileSync(envPath, text);
  console.log('Meta user access token saved to .env.social');
  console.log('Access token: [hidden]');
}

async function metaSavePage() {
  const token = process.argv[3] || env('META_USER_ACCESS_TOKEN');
  if (!token) throw new Error('Pass a Meta user access token or set META_USER_ACCESS_TOKEN.');
  const url = `https://graph.facebook.com/${graphVersion}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${encodeURIComponent(token)}`;
  const json = await getPublicJson(url);
  const pages = json.data || [];
  const page = pages.find((item) => /talentexperte/i.test(item.name || '')) || pages[0];
  if (!page) throw new Error('No Facebook Pages found for this token.');
  if (!page.instagram_business_account?.id) {
    console.log(JSON.stringify(pages.map(({ id, name, instagram_business_account }) => ({ id, name, instagram_business_account })), null, 2));
    throw new Error('No connected Instagram Business Account found on the selected Page. Connect Instagram to the Facebook Page in Meta Business Suite first.');
  }
  const envPath = path.join(root, '.env.social');
  let text = fs.readFileSync(envPath, 'utf8');
  text = setEnvValue(text, 'META_USER_ACCESS_TOKEN', token);
  text = setEnvValue(text, 'FACEBOOK_PAGE_ID', page.id);
  text = setEnvValue(text, 'FACEBOOK_PAGE_ACCESS_TOKEN', page.access_token);
  text = setEnvValue(text, 'INSTAGRAM_USER_ID', page.instagram_business_account.id);
  text = setEnvValue(text, 'INSTAGRAM_ACCESS_TOKEN', page.access_token);
  fs.writeFileSync(envPath, text);
  console.log(`Saved Page "${page.name}" and Instagram account "${page.instagram_business_account.username || page.instagram_business_account.id}" to .env.social.`);
  console.log('Access tokens: [hidden]');
}

async function metaLongToken() {
  requireEnv(['META_APP_ID', 'META_APP_SECRET'], 'Paste the Meta App ID and App Secret into .env.social first.');
  const token = process.argv[3];
  if (!token) throw new Error('Missing short-lived Meta user token.');
  const url = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', env('META_APP_ID'));
  url.searchParams.set('client_secret', env('META_APP_SECRET'));
  url.searchParams.set('fb_exchange_token', token);
  const json = await getPublicJson(url.toString());
  console.log(JSON.stringify(json, null, 2));
}

async function getGoogleAccessToken() {
  if (env('GOOGLE_ACCESS_TOKEN')) return env('GOOGLE_ACCESS_TOKEN');
  requireEnv(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'], 'Run npm run social:google:url, approve access, then exchange the returned code with node scripts/social-auth.mjs google-token "CODE".');
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

function env(name) {
  return process.env[name] || '';
}

function setEnvValue(src, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(src)) return src.replace(re, line);
  return src.replace(/\s*$/, `\n${line}\n`);
}

function requireEnv(names, hint = '') {
  const missing = names.filter((name) => !env(name));
  if (missing.length) {
    const suffix = hint ? `\nHint: ${hint}` : '';
    throw new Error(`Missing env values: ${missing.join(', ')} in .env.social.${suffix}`);
  }
}

async function postForm(url, body) {
  const res = await fetch(url, { method: 'POST', body });
  return parseResponse(res);
}

async function getJson(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return parseResponse(res);
}

async function getPublicJson(url) {
  const res = await fetch(url);
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
  if (!res.ok) throw new Error(formatApiError(res.status, json));
  return json;
}

function formatApiError(status, json) {
  const details = json?.error?.details || [];
  const quotaZero = details.some((item) => item?.metadata?.quota_limit_value === '0');
  if (status === 429 && quotaZero) {
    return [
      `HTTP ${status}: Google Business Profile API quota is 0 for this Cloud project.`,
      'Request GBP API access for this project before listing accounts or publishing posts.',
      'Docs: https://developers.google.com/my-business/content/limits'
    ].join('\n');
  }
  return `HTTP ${status}: ${JSON.stringify(json)}`;
}
