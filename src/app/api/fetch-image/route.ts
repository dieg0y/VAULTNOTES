import { lookup as dnsLookup } from 'node:dns/promises';
import { request as httpRequest, type IncomingMessage, type RequestOptions } from 'node:http';
import { isIP } from 'node:net';
import { request as httpsRequest } from 'node:https';
import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginRequest } from '../requestSecurity';

export const runtime = 'nodejs';

/**
 * GET /api/fetch-image?url=<http(s) URL> — proxy local de imágenes (V17).
 *
 * PEGADO TIPO OBSIDIAN: cuando el usuario pega una página web completa, el
 * HTML del portapapeles referencia las imágenes con URLs remotas. El
 * navegador NO puede descargarlas por sí mismo (CORS: la mayoría de sitios
 * no manda Access-Control-Allow-Origin en sus imágenes), pero el servidor
 * local de la propia app (este proceso) sí puede — el resultado se sirve
 * same-origin y el cliente lo guarda localmente para que la nota quede
 * 100% offline para siempre.
 *
 * PRIVACIDAD / RED (contrato con el usuario):
 *  · SOLO se invoca tras un pegado EXPLÍCITO del usuario con imágenes en
 *    línea (y con el consentimiento único de la primera vez — ver
 *    remoteImages.ts). La app sigue siendo 100% offline por defecto.
 *  · La petición sale desde la máquina del usuario, idéntico a lo que pasa
 *    cuando abrió la página original: los hosts ven la misma IP.
 *
 * SEGURIDAD (ver AUDIT_REPORT.md Addendum III):
 *  · Esquema http/https únicamente (sin file:, data:, etc.).
 *  · SSRF: hosts privados bloqueados en la URL y en DNS; la conexión usa
 *    la IP pública validada para evitar cambios de DNS entre check y connect.
 *  · Solicitudes cross-site rechazadas con Fetch Metadata + Origin; el
 *    proxy no queda expuesto como endpoint de navegador a otras webs.
 *  · Tope 25 MB por imagen contado EN STREAMING (un servidor mentiroso
 *    sin Content-Length no puede desbordar la memoria).
 *  · Timeout total 15 s (AbortController).
 *  · Content-Type solo image/* (un hotlink-blocked que devuelve text/html
 *    se rechaza y el cliente degrada esa imagen a enlace).
 *  · Redirecciones: cada destino y su DNS se vuelven a validar antes de
 *    pedirlo; máximo 5 saltos.
 */

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB — mismo tope que el flujo legacy de imágenes
const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

class BlockedHostError extends Error {
  constructor() {
    super('host interno bloqueado');
    this.name = 'BlockedHostError';
  }
}

/** Hosts privados/internos — SSRF hardening (no escaneamos la LAN del usuario). */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const isIpv6 = h.includes(':');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h === '0.0.0.0') return true;
  if (h.startsWith('::') || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('ff')) return true;
  if (isIpv6) {
    const firstIpv6Block = Number.parseInt(h.split(':')[0], 16);
    if (Number.isFinite(firstIpv6Block) && (firstIpv6Block & 0xffc0) === 0xfe80) return true; // IPv6 link-local: fe80::/10
    if (h.startsWith('2001:db8:')) return true; // documentation range
  }
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    const c = Number(v4[3]);
    if (a === 127 || a === 10 || a === 0) return true; // loopback, red-A, "this" host
    if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
    if (a === 192 && b === 168) return true; // RFC1918
    if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata)
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // protocol assignments / documentation
    if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return true;
    if (a === 203 && b === 0 && c === 113) return true; // documentation
    if (a >= 224) return true; // multicast and reserved
  }
  return false;
}

/** Resolve once, reject private answers, and pin the socket to the checked IP. */
async function resolvePublicAddress(target: URL, signal: AbortSignal): Promise<{ address: string; family: number }> {
  const hostname = target.hostname.replace(/^\[|\]$/g, '');
  const family = isIP(hostname);
  const addresses = family
    ? [{ address: hostname, family }]
    : await new Promise<Array<{ address: string; family: number }>>((resolve, reject) => {
        const onAbort = () => {
          const error = new Error('timeout');
          error.name = 'AbortError';
          reject(error);
        };
        if (signal.aborted) {
          onAbort();
          return;
        }
        signal.addEventListener('abort', onAbort, { once: true });
        dnsLookup(hostname, { all: true, verbatim: true }).then(resolve, reject).finally(() => {
          signal.removeEventListener('abort', onAbort);
        });
      });

  if (addresses.length === 0 || addresses.some((entry) => isBlockedHost(entry.address))) {
    throw new BlockedHostError();
  }
  return addresses[0];
}

function requestPinnedImage(
  target: URL,
  address: { address: string; family: number },
  signal: AbortSignal,
): Promise<IncomingMessage> {
  const pinnedLookup: NonNullable<RequestOptions['lookup']> = (_hostname, options, callback) => {
    if (options.all) callback(null, [address]);
    else callback(null, address.address, address.family);
  };
  const transport = target.protocol === 'https:' ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const request = transport(target, {
      signal,
      lookup: pinnedLookup,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'identity',
      },
    }, resolve);
    request.once('error', reject);
    request.end();
  });
}

/** Read an upstream response with a strict byte cap. */
async function readIncomingMessageWithCap(response: IncomingMessage, cap: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of response) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += bytes.byteLength;
    if (total > cap) {
      response.destroy();
      throw new Error('TOO_LARGE');
    }
    chunks.push(bytes);
  }
  return Buffer.concat(chunks, total);
}

export async function GET(request: NextRequest) {
  // Only the app itself may use this local network proxy.
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'petición cross-site rechazada' }, { status: 403 });
  }

  const rawUrl = request.nextUrl.searchParams.get('url');
  if (!rawUrl) {
    return NextResponse.json({ error: 'falta ?url=' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return NextResponse.json({ error: 'solo http/https' }, { status: 400 });
  }
  if (target.username || target.password) {
    return NextResponse.json({ error: 'no se permiten credenciales en la URL' }, { status: 400 });
  }
  if (isBlockedHost(target.hostname)) {
    return NextResponse.json({ error: 'host interno bloqueado' }, { status: 403 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let upstream: IncomingMessage;
    for (let redirects = 0; ; redirects++) {
      const address = await resolvePublicAddress(target, controller.signal);
      upstream = await requestPinnedImage(target, address, controller.signal);

      if (!upstream.statusCode || !REDIRECT_STATUSES.has(upstream.statusCode)) break;
      const location = upstream.headers.location;
      upstream.destroy();
      if (!location || redirects >= MAX_REDIRECTS) {
        return NextResponse.json({ error: 'redirección inválida o límite excedido' }, { status: 502 });
      }

      try {
        target = new URL(location, target);
      } catch {
        return NextResponse.json({ error: 'URL de redirección inválida' }, { status: 502 });
      }
      if (target.protocol !== 'http:' && target.protocol !== 'https:') {
        return NextResponse.json({ error: 'solo http/https' }, { status: 400 });
      }
      if (target.username || target.password) {
        return NextResponse.json({ error: 'no se permiten credenciales en la URL' }, { status: 400 });
      }
      if (isBlockedHost(target.hostname)) {
        return NextResponse.json({ error: 'host interno bloqueado' }, { status: 403 });
      }
    }

    const upstreamStatus = upstream.statusCode || 502;
    if (upstreamStatus < 200 || upstreamStatus >= 300) {
      upstream.destroy();
      return NextResponse.json({ error: `upstream ${upstreamStatus}` }, { status: 502 });
    }

    const contentType = upstream.headers['content-type'];
    const ct = (typeof contentType === 'string' ? contentType : '').toLowerCase();
    if (!ct.startsWith('image/')) {
      upstream.destroy();
      return NextResponse.json({ error: `content-type no es imagen (${ct || 'desconocido'})` }, { status: 415 });
    }

    const lenHeader = Number(upstream.headers['content-length'] || 0);
    if (lenHeader > MAX_BYTES) {
      upstream.destroy();
      return NextResponse.json({ error: 'imagen > 25 MB' }, { status: 413 });
    }

    let bytes: Buffer;
    try {
      bytes = await readIncomingMessageWithCap(upstream, MAX_BYTES);
    } catch (err) {
      if (err instanceof Error && err.message === 'TOO_LARGE') {
        return NextResponse.json({ error: 'imagen > 25 MB' }, { status: 413 });
      }
      throw err;
    }

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': ct,
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'no-store',
        'X-Vault-Source': 'fetch-image',
      },
    });
  } catch (err) {
    if (err instanceof BlockedHostError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const aborted = err instanceof Error && err.name === 'AbortError';
    return NextResponse.json(
      { error: aborted ? 'timeout 15 s' : 'fallo de descarga' },
      { status: aborted ? 504 : 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
