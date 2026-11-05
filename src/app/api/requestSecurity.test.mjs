import { describe, expect, test } from 'bun:test';
import { NextRequest } from 'next/server';
import { POST as enrichTicket } from './enrich-ticket/route.ts';
import { GET as fetchImage } from './fetch-image/route.ts';
import { POST as gitPull } from './git/pull/route.ts';
import { ApiRequestError, isSameOriginRequest, readJsonRequest } from './requestSecurity.ts';

describe('same-origin API guard', () => {
  test('allows requests from the app and rejects cross-site or missing metadata', () => {
    expect(isSameOriginRequest(new Request('http://localhost/api/test', {
      headers: { origin: 'http://localhost', 'sec-fetch-site': 'same-origin' },
    }))).toBe(true);
    expect(isSameOriginRequest(new Request('http://localhost/api/test', {
      headers: { origin: 'https://other.example', 'sec-fetch-site': 'cross-site' },
    }))).toBe(false);
    expect(isSameOriginRequest(new Request('http://localhost/api/test', {
      headers: { origin: 'https://other.example' },
    }))).toBe(false);
    expect(isSameOriginRequest(new Request('http://localhost/api/test'))).toBe(false);
    expect(isSameOriginRequest(new Request('http://localhost/api/test', {
      headers: { 'sec-fetch-site': 'same-site' },
    }))).toBe(false);
  });

  test('rejects cross-site calls before protected API work runs', async () => {
    const headers = { origin: 'https://other.example', 'sec-fetch-site': 'cross-site' };
    const enrich = await enrichTicket(new Request('http://localhost/api/enrich-ticket', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ticketText: 'Texto de prueba suficientemente largo.' }),
    }));
    const pull = await gitPull(new Request('http://localhost/api/git/pull', {
      method: 'POST',
      headers,
      body: JSON.stringify({ mode: 'mirror' }),
    }));
    const image = await fetchImage(new NextRequest('http://localhost/api/fetch-image?url=https%3A%2F%2Fexample.com%2Fimage.png', {
      headers,
    }));

    expect(enrich.status).toBe(403);
    expect(pull.status).toBe(403);
    expect(image.status).toBe(403);
  });

  test('rejects private-network targets and credential-bearing image URLs', async () => {
    const headers = { origin: 'http://localhost', 'sec-fetch-site': 'same-origin' };
    const privateTarget = await fetchImage(new NextRequest(
      'http://localhost/api/fetch-image?url=http%3A%2F%2F127.0.0.1%2Fprivate',
      { headers },
    ));
    const credentials = await fetchImage(new NextRequest(
      'http://localhost/api/fetch-image?url=https%3A%2F%2Fuser%3Asecret%40example.com%2Fimage.png',
      { headers },
    ));
    const privateIpv6 = await fetchImage(new NextRequest(
      'http://localhost/api/fetch-image?url=http%3A%2F%2F%5B%3A%3A1%5D%2Fprivate',
      { headers },
    ));

    expect(privateTarget.status).toBe(403);
    expect(credentials.status).toBe(400);
    expect(privateIpv6.status).toBe(403);
  });
});

describe('bounded JSON request parsing', () => {
  test('parses valid JSON and rejects oversized and malformed bodies', async () => {
    const valid = await readJsonRequest(new Request('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ ok: true }),
    }), 64);
    expect(valid).toEqual({ ok: true });

    const oversized = readJsonRequest(new Request('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ value: 'larger than the limit' }),
    }), 8);
    await expect(oversized).rejects.toBeInstanceOf(ApiRequestError);

    const malformed = readJsonRequest(new Request('http://localhost/api/test', {
      method: 'POST',
      body: '{',
    }), 8);
    await expect(malformed).rejects.toMatchObject({ status: 400 });
  });
});
