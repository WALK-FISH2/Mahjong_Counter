// @vitest-environment node
import { describe, expect, it, vi, afterEach } from 'vitest';
import { deflateSync, deflateRawSync, gzipSync } from 'node:zlib';
import { shareFixture } from '../../test/helpers/share-fixture';
import {
  createShareCodec,
  canonicalShareJson,
  base64Url,
  checkShareUrlLength,
} from './share-codec';
import { parseSharePayload } from '../../schemas/share/share-payload-schema';
import {
  assertShareResources,
  MAX_SAFE_SHARE_URL_LENGTH,
  MAX_DECOMPRESSED_SHARE_BYTES,
  MAX_JSON_DEPTH,
  MAX_JSON_NODES,
  MAX_OBJECT_FIELDS,
  MAX_ARRAY_ITEMS,
} from '../../schemas/share/share-input-limits';

afterEach(() => vi.unstubAllGlobals());
const compressed = (value: unknown) => base64Url(deflateSync(JSON.stringify(value)));
async function payload() {
  const f = shareFixture();
  await f.store.getState().startAnalysis();
  return f.service.captureFormal();
}

describe('T1004 deterministic properties and wire interoperability', () => {
  it('canonical JSON sorts object keys, preserves array order, handles Unicode', () => {
    expect(canonicalShareJson({ z: [2, 1], a: { 中: '🀄', b: true } })).toBe(
      '{"a":{"b":true,"中":"🀄"},"z":[2,1]}',
    );
    expect(canonicalShareJson({ b: 1, a: 2 })).toBe(canonicalShareJson({ a: 2, b: 1 }));
  });
  it('fixed seeded 64-case encode/decode, canonical order and deterministic byte properties', async () => {
    const p = await payload();
    const codec = createShareCodec();
    let seed = 0x221006;
    for (let i = 0; i < 64; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      if (p.resultSnapshot.kind !== 'evaluation') throw new Error();
      const name = `测试🀄-${seed}`;
      const x = parseSharePayload({
        ...p,
        rule: { ...p.rule, name },
        resultSnapshot: {
          kind: 'evaluation',
          value: {
            ...p.resultSnapshot.value,
            display: {
              ...p.resultSnapshot.value.display,
              ruleName: name,
              warnings: [`编号-${seed}`, `中文-${i}`],
            },
          },
        },
      });
      const a = await codec.encode(x, 'https://example.test/app/');
      const b = await codec.encode(x, 'https://example.test/app/');
      expect(a).toEqual(b);
      if (a.status !== 'ready') throw new Error(`Not ready: ${a.status}`);
      const encoded = a.url.split('/share/')[1]!;
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/u);
      expect(await codec.decode(encoded)).toEqual(x);
      expect(await codec.decode(compressed(x))).toEqual(x);
    }
  });
  it('rejects gzip/raw-deflate, truncated zlib, corrupt checksum and trailing bytes', async () => {
    const p = await payload();
    const bytes = Buffer.from(JSON.stringify(p));
    const z = deflateSync(bytes);
    const corrupt = Buffer.from(z);
    corrupt[corrupt.length - 1] = corrupt[corrupt.length - 1]! ^ 255;
    for (const value of [
      gzipSync(bytes),
      deflateRawSync(bytes),
      z.subarray(0, z.length - 2),
      corrupt,
      Buffer.concat([z, Buffer.from([1])]),
    ])
      await expect(createShareCodec().decode(base64Url(value))).rejects.toThrow();
  });
});
describe('T1004 hostile input/resource bounds', () => {
  it.each(['', 'a', '====', '+/xx', 'YWJj=', '%2f', 'A'.repeat(8001)])(
    'rejects malformed or oversized encoding %s',
    async (value) => {
      await expect(createShareCodec().decode(value)).rejects.toThrow();
    },
  );
  it('rejects invalid JSON, UTF-8, executable values, dangerous keys and unrelated record families', async () => {
    const codec = createShareCodec();
    for (const text of [
      '{',
      '{"__proto__":{"polluted":true}}',
      '{"constructor":{}}',
      '{"format":"mahjong-example","version":1}',
      '{"code":"eval(1)"}',
    ])
      await expect(codec.decode(base64Url(deflateSync(text)))).rejects.toThrow();
    await expect(
      codec.decode(base64Url(deflateSync(new Uint8Array([255, 254])))),
    ).rejects.toThrow();
    expect({}).not.toHaveProperty('polluted');
    expect(() => assertShareResources({ run: () => 1 })).toThrow();
    expect(() => assertShareResources({ n: Infinity })).toThrow();
  });
  it('bounds depth, nodes, fields, arrays, cycles and decompression bombs', async () => {
    let deep: unknown = null;
    for (let i = 0; i <= MAX_JSON_DEPTH; i++) deep = [deep];
    expect(() => assertShareResources(deep)).toThrow('SHARE_LIMIT');
    expect(() =>
      assertShareResources(Array.from({ length: MAX_ARRAY_ITEMS + 1 }, () => 0)),
    ).toThrow('SHARE_LIMIT');
    expect(() =>
      assertShareResources(
        Object.fromEntries(Array.from({ length: MAX_OBJECT_FIELDS + 1 }, (_, i) => [`f${i}`, 0])),
      ),
    ).toThrow('SHARE_LIMIT');
    const large = Array.from({ length: Math.ceil(MAX_JSON_NODES / 1000) }, () =>
      Array.from({ length: 1000 }, () => 0),
    );
    expect(() => assertShareResources(large)).toThrow('SHARE_LIMIT');
    const cycle: unknown[] = [];
    cycle.push(cycle);
    expect(() => assertShareResources(cycle)).toThrow();
    await expect(
      createShareCodec().decode(
        base64Url(deflateSync(' '.repeat(MAX_DECOMPRESSED_SHARE_BYTES + 1))),
      ),
    ).rejects.toThrow('SHARE_LIMIT');
    await expect(createShareCodec().decode(compressed(deep))).rejects.toThrow();
  });
  it('missing compression API fails explicitly; formatter does not need codec', async () => {
    const p = await payload();
    vi.stubGlobal('CompressionStream', undefined);
    expect(await createShareCodec().encode(p, 'https://example.test')).toEqual({
      status: 'capability-unavailable',
      capability: 'compression-stream',
    });
  });
});
describe('T1007 foundation, not SingleExample export', () => {
  it.each([-1, 0, 1])('full URL boundary %i never truncates', (delta) => {
    const url = 'https://example.test/#/share/'.padEnd(MAX_SAFE_SHARE_URL_LENGTH + delta, 'x');
    const result = checkShareUrlLength(url);
    if (delta <= 0) expect(result).toEqual({ status: 'ready', url });
    else expect(result).toEqual({ status: 'single-example-fallback-required', length: url.length });
    expect(result).not.toHaveProperty('file');
    expect(JSON.stringify(result)).not.toContain('mahjong-example');
  });
  it('measures full encoded URL including base path; strips unrelated query/hash', async () => {
    const p = await payload();
    const codec = createShareCodec();
    const result = await codec.encode(p, 'https://example.test/?secret=none#/saved/private');
    if (result.status !== 'ready') throw new Error();
    expect(result.url).not.toContain('secret');
    expect(result.url).not.toContain('/saved/');
    const extra = MAX_SAFE_SHARE_URL_LENGTH - result.url.length + 1;
    const long = await codec.encode(p, `https://example.test/${'x'.repeat(extra)}`);
    expect(long.status).toBe('single-example-fallback-required');
  });
});
