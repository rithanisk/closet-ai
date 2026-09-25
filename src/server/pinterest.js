import 'server-only';

import sharp from 'sharp';
import { HttpError } from './http';

const USER_AGENT = 'Mozilla/5.0 (compatible; ClosetAI/1.0; +https://closet.ai)';
const RESERVED = new Set(['pin', 'pins', 'search', 'ideas', 'today', 'settings', 'business', '_', 'categories', 'topics', 'explore', 'login', 'about', 'password']);
const MAX_RSS_BYTES = 3 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export const isPinterestHost = (host) => /(^|\.)pinterest\.[a-z]{2,3}(\.[a-z]{2})?$/i.test(host);
const isShortHost = (host) => /^pin\.it$/i.test(host);
const isImageHost = (host) => /^i\.pinimg\.com$/i.test(host);

function parseUrl(value) {
  try {
    const url = new URL(String(value).trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url;
  } catch { return null; }
}

/** Follow pin.it short links (and Pinterest's own redirect hops) without ever leaving Pinterest hosts. */
async function resolveShortLink(url) {
  let current = url;
  for (let hop = 0; hop < 4; hop += 1) {
    if (!isShortHost(current.hostname) && !current.pathname.includes('url_shortener')) return current;
    const response = await fetch(current, { redirect: 'manual', headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(8000) });
    const location = response.headers.get('location');
    if (!location) break;
    const next = new URL(location, current);
    if (!isShortHost(next.hostname) && !isPinterestHost(next.hostname)) throw new HttpError(400, 'That short link does not point to a Pinterest board.');
    current = next;
  }
  if (isShortHost(current.hostname)) throw new HttpError(400, 'That short link could not be resolved. Paste the full board URL instead.');
  return current;
}

/**
 * Turn a Pinterest board or profile URL into its public RSS feed.
 * Board: pinterest.com/{user}/{board}/ → /{user}/{board}.rss
 * Profile: pinterest.com/{user}/ → /{user}/feed.rss
 */
export async function resolveBoard(input) {
  let url = parseUrl(input);
  if (!url || !(isPinterestHost(url.hostname) || isShortHost(url.hostname))) {
    throw new HttpError(400, 'Paste a public Pinterest board link, for example https://www.pinterest.com/username/board-name/.');
  }
  if (isShortHost(url.hostname)) url = await resolveShortLink(url);
  const segments = url.pathname.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment));
  if (segments[segments.length - 1]?.endsWith('.rss')) segments[segments.length - 1] = segments[segments.length - 1].slice(0, -4);
  if (!segments.length || RESERVED.has(segments[0].toLowerCase())) {
    throw new HttpError(400, 'That link is a single pin or search page. Share a board link instead.');
  }
  const [user, board] = segments;
  const safe = (value) => /^[\w.\-%]+$/u.test(value);
  if (!safe(user) || (board && !safe(board))) throw new HttpError(400, 'That Pinterest link does not look like a board.');
  const isProfile = !board || board === 'feed' || board === '_saved' || board === '_created';
  const path = isProfile ? `/${encodeURIComponent(user)}/feed.rss` : `/${encodeURIComponent(user)}/${encodeURIComponent(board)}.rss`;
  const boardUrl = isProfile ? `https://www.pinterest.com/${user}/` : `https://www.pinterest.com/${user}/${board}/`;
  const pretty = (value) => value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  return { rssUrl: `https://www.pinterest.com${path}`, boardUrl, label: isProfile ? `${pretty(user)} · recent pins` : pretty(board) };
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", nbsp: ' ' };
export function decodeEntities(value) {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z#0-9]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match);
}

const unwrap = (value) => decodeEntities(String(value || '').replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim());
const tag = (block, name) => unwrap(block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))?.[1]);

/** Upgrade Pinterest thumbnail URLs to the 736px rendition, which is plenty for style analysis. */
export function upgradeImageUrl(src) {
  return src.replace(/\/(?:\d+x\d*|\d+x\d+_RS|originals)\//, '/736x/');
}

/** Parse a Pinterest RSS document into pins. Exported for unit testing. */
export function parseBoardRss(xml, limit = 30) {
  const pins = [];
  const seen = new Set();
  for (const [, block] of String(xml).matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const description = tag(block, 'description');
    const enclosure = block.match(/<(?:enclosure|media:content)[^>]+url="([^"]+)"/i)?.[1];
    const src = decodeEntities(enclosure || description.match(/<img[^>]+src="([^"]+)"/i)?.[1] || '');
    const image = parseUrl(src);
    if (!image || !isImageHost(image.hostname)) continue;
    const imageUrl = upgradeImageUrl(image.toString());
    if (seen.has(imageUrl)) continue;
    seen.add(imageUrl);
    const link = parseUrl(tag(block, 'link'));
    pins.push({
      imageUrl,
      link: link && isPinterestHost(link.hostname) ? link.toString() : '',
      title: tag(block, 'title').slice(0, 200),
    });
    if (pins.length >= limit) break;
  }
  return pins;
}

async function readLimited(response, maxBytes) {
  const length = Number(response.headers.get('content-length') || 0);
  if (length > maxBytes) throw new HttpError(413, 'The Pinterest response was too large.');
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) { await reader.cancel(); throw new HttpError(413, 'The Pinterest response was too large.'); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function fetchBoardPins(rssUrl, limit = Number(process.env.PINTEREST_PIN_LIMIT) || 30) {
  let response;
  try {
    response = await fetch(rssUrl, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.5' }, redirect: 'follow', signal: AbortSignal.timeout(12_000) });
  } catch {
    throw new HttpError(502, 'Pinterest could not be reached. Try again in a moment.');
  }
  if (response.status === 404) throw new HttpError(404, 'That board was not found. Check that it exists and is public.');
  if (!response.ok) throw new HttpError(502, 'Pinterest did not return the board. Make sure it is public, or upload the images instead.');
  const xml = (await readLimited(response, MAX_RSS_BYTES)).toString('utf8');
  if (!/<rss[\s>]/i.test(xml)) throw new HttpError(502, 'Pinterest did not return a readable board feed. Make sure the board is public, or upload the images instead.');
  const pins = parseBoardRss(xml, Math.min(Math.max(limit, 1), 50));
  if (!pins.length) throw new HttpError(422, 'No images were found on that board.');
  return pins;
}

/** Download a pin image from Pinterest's CDN only, then shrink it for analysis. */
export async function downloadPinImage(imageUrl) {
  const url = parseUrl(imageUrl);
  if (!url || url.protocol !== 'https:' || !isImageHost(url.hostname)) throw new Error('Unexpected image host');
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, redirect: 'error', signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`Image download failed (${response.status})`);
  const buffer = await readLimited(response, MAX_IMAGE_BYTES);
  return sharp(buffer, { failOn: 'error', limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: 768, height: 768, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
}
