import {
  ShareError,
  type ShareCodecPort,
  type SharePayloadV1,
  type ShareUrlResult,
} from '../../application/share/share-models';
import { parseSharePayload } from '../../schemas/share/share-payload-schema';
import {
  assertShareResources,
  MAX_DECOMPRESSED_SHARE_BYTES,
  MAX_ENCODED_SHARE_LENGTH,
  MAX_SAFE_SHARE_URL_LENGTH,
} from '../../schemas/share/share-input-limits';

export function canonicalShareJson(value: unknown): string {
  assertShareResources(value);
  function canonical(v: unknown): string {
    if (Array.isArray(v)) return `[${v.map((item: unknown) => canonical(item)).join(',')}]`;
    if (v !== null && typeof v === 'object')
      return `{${Object.entries(v)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
        .join(',')}}`;
    return JSON.stringify(v);
  }
  return canonical(value);
}
export function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}
function decodeBase64(encoded: string): Uint8Array<ArrayBuffer> {
  if (
    encoded.length === 0 ||
    encoded.length > MAX_ENCODED_SHARE_LENGTH ||
    !/^[A-Za-z0-9_-]+$/u.test(encoded) ||
    encoded.length % 4 === 1
  )
    throw new ShareError('SHARE_INVALID_ENCODING');
  const binary = atob(
    encoded.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (encoded.length % 4)) % 4),
  );
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  if (base64Url(bytes) !== encoded) throw new ShareError('SHARE_NON_CANONICAL_ENCODING');
  return bytes;
}
// Wire v1 is RFC1950 zlib-wrapped DEFLATE, not gzip or deflate-raw. See WHATWG Compression.
export async function transformShareBytes(
  bytes: Uint8Array<ArrayBuffer>,
  decompress: boolean,
): Promise<Uint8Array<ArrayBuffer>> {
  if (decompress && typeof DecompressionStream === 'undefined')
    throw new ShareError('SHARE_DECOMPRESSION_UNAVAILABLE');
  if (!decompress && typeof CompressionStream === 'undefined')
    throw new ShareError('SHARE_COMPRESSION_UNAVAILABLE');
  const transform = decompress
    ? new DecompressionStream('deflate')
    : new CompressionStream('deflate');
  const source = new ReadableStream<Uint8Array<ArrayBuffer>>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  const reader = source.pipeThrough(transform).getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const item = await reader.read();
      if (item.done) break;
      length += item.value.byteLength;
      if (length > MAX_DECOMPRESSED_SHARE_BYTES) {
        await reader.cancel();
        throw new ShareError('SHARE_LIMIT');
      }
      chunks.push(item.value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}
export function checkShareUrlLength(url: string): ShareUrlResult {
  return url.length > MAX_SAFE_SHARE_URL_LENGTH
    ? { status: 'single-example-fallback-required', length: url.length }
    : { status: 'ready', url };
}
export function createShareCodec(): ShareCodecPort {
  return {
    async encode(payload: SharePayloadV1, baseUrl: string) {
      const text = canonicalShareJson(parseSharePayload(payload));
      const bytes = new TextEncoder().encode(text);
      if (bytes.length > MAX_DECOMPRESSED_SHARE_BYTES) throw new ShareError('SHARE_LIMIT');
      if (typeof CompressionStream === 'undefined')
        return { status: 'capability-unavailable', capability: 'compression-stream' };
      const encoded = base64Url(await transformShareBytes(bytes, false));
      const base = new URL(baseUrl);
      if (!['http:', 'https:'].includes(base.protocol))
        throw new ShareError('SHARE_INVALID_BASE_URL');
      base.search = '';
      base.hash = `/share/${encoded}`;
      return checkShareUrlLength(base.href);
    },
    async decode(encoded: string) {
      const bytes = await transformShareBytes(decodeBase64(encoded), true);
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      const input: unknown = JSON.parse(text);
      return parseSharePayload(input);
    },
  };
}
