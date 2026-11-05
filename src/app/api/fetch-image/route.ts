import { NextRequest, NextResponse } from 'next/server';

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
 *  · SSRF: hosts privados bloqueados (loopback, RFC1918, link-local, ULA,
 *    CGNAT, .local) — este endpoint no debe convertirse en escáner de la
 *    red interna del usuario.
 *  · Sec-Fetch-Site: cross-site rechazado — neutraliza DNS rebinding y
 *    webs de terceros usando este endpoint como proxy (navegadores
 *    modernos lo envían siempre; ausente se permite — p. ej. curl propio).
 *  · Tope 25 MB por imagen contado EN STREAMING (un servidor mentiroso
 *    sin Content-Length no puede desbordar la memoria).
 *  · Timeout total 15 s (AbortController).
 *  · Content-Type solo image/* (un hotlink-blocked que devuelve text/html
 *    se rechaza y el cliente degrada esa imagen a enlace).
 *  · Redirecciones: cada destino se vuelve a validar antes de pedirlo;
 *    máximo 5 saltos. Evita redirecciones directas a hosts internos bloqueados.
 */

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB — mismo tope que el flujo legacy de imágenes
const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/** Hosts privados/internos — SSRF hardening (no escaneamos la LAN del usuario). */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const isIpv6 = h.includes(':');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h === '0.0.0.0') return true;
  if (h === '::' || h === '::1') return true;
  if (isIpv6) {
    if (h.startsWith('::ffff:') || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('ff')) return true;
    const firstIpv6Block = Number.parseInt(h.split(':')[0], 16);
    if (Number.isFinite(firstIpv6Block) && (firstIpv6Block & 0xffc0) === 0xfe80) return true; // IPv6 link-local: fe80::/10
  }
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 127 || a === 10 || a === 0) return true; // loopback, red-A, "this" host
    if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
    if (a === 192 && b === 168) return true; // RFC1918
    if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata)
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast and reserved
  }
  return false;
}

/** Lee el body con tope de bytes — aborta en cuanto se pasa del límite. */
async function readArrayBufferWithCap(body: ReadableStream<Uint8Array>, cap: number): Promise<ArrayBuffer> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > cap) {
        await reader.cancel().catch(() => undefined);
        throw new Error('TOO_LARGE');
      }
      chunks.push(value);
    }
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out.buffer;
}

export async function GET(request: NextRequest) {
  // Sec-Fetch-Site: neutraliza DNS rebinding y uso como proxy desde webs de terceros.
  const sfs = request.headers.get('sec-fetch-site');
  if (sfs && sfs !== 'same-origin' && sfs !== 'same-site' && sfs !== 'none') {
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
  if (isBlockedHost(target.hostname)) {
    return NextResponse.json({ error: 'host interno bloqueado' }, { status: 403 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let upstream: Response;
    for (let redirects = 0; ; redirects++) {
      upstream = await fetch(target.toString(), {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          // UA de navegador genérico: evita bloqueos básicos de hotlinking.
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        },
        cache: 'no-store',
      });

      if (!REDIRECT_STATUSES.has(upstream.status)) break;
      const location = upstream.headers.get('location');
      await upstream.body?.cancel().catch(() => undefined);
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
      if (isBlockedHost(target.hostname)) {
        return NextResponse.json({ error: 'host interno bloqueado' }, { status: 403 });
      }
    }

    if (!upstream.ok) {
      return NextResponse.json({ error: `upstream ${upstream.status}` }, { status: 502 });
    }

    const ct = (upstream.headers.get('content-type') || '').toLowerCase();
    if (!ct.startsWith('image/')) {
      return NextResponse.json({ error: `content-type no es imagen (${ct || 'desconocido'})` }, { status: 415 });
    }

    const lenHeader = Number(upstream.headers.get('content-length') || 0);
    if (lenHeader > MAX_BYTES) {
      return NextResponse.json({ error: 'imagen > 25 MB' }, { status: 413 });
    }

    if (!upstream.body) {
      return NextResponse.json({ error: 'respuesta sin body' }, { status: 502 });
    }
    let bytes: ArrayBuffer;
    try {
      bytes = await readArrayBufferWithCap(upstream.body, MAX_BYTES);
    } catch (err) {
      if (err instanceof Error && err.message === 'TOO_LARGE') {
        return NextResponse.json({ error: 'imagen > 25 MB' }, { status: 413 });
      }
      throw err;
    }

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': ct,
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'no-store',
        'X-Vault-Source': 'fetch-image',
      },
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return NextResponse.json(
      { error: aborted ? 'timeout 15 s' : 'fallo de descarga' },
      { status: aborted ? 504 : 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
