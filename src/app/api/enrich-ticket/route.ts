import { NextResponse } from 'next/server';
import { z } from 'zod';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * POST /api/enrich-ticket — Enriquecimiento ONLINE opcional del Ticket
 * Triage Parser (V6 FASE 3, spec: "botón [Enrich Online], nunca auto-envía").
 *
 * Contrato:
 *  · SOLO se llama con clic explícito del usuario en el botón [Enrich
 *    Online] (la tool offline funciona al 100% sin este endpoint).
 *  · Recibe el texto crudo del ticket que el usuario pegó.
 *  · Devuelve sugerencias de categorización/prioridad como JSON validado
 *    con zod — NUNCA se escriben automáticamente: la UI las muestra como
 *    panel "sugerido por IA (online)" para que el L1 las compare con el
 *    análisis offline local.
 *
 * El SDK vive AQUÍ (backend), nunca en cliente (regla del entorno).
 * Sin API key del usuario: el puente es el backend local de la propia app
 * (las keys cifradas de terceros siguen siendo exclusivas de Threat Intel).
 */

const EnrichRequest = z.object({
  ticketText: z.string().min(10, 'Texto del ticket demasiado corto').max(4000, 'Texto del ticket demasiado largo'),
  offlineCategory: z.string().max(120).optional(),
  offlinePriority: z.enum(['P1', 'P2', 'P3', 'P4']).optional(),
});

const SYSTEM_PROMPT = `Actúa como Service Desk L2 lead con 10 años de experiencia en entornos Microsoft (AD, Entra, M365, Intune) y ITSM.
Te dan el texto crudo de un ticket de soporte (puede incluir ruido: saludos, firma, historial de reenvíos).
Tu trabajo es devolver un ENRIQUECIMIENTO de triage como JSON EXACTO con esta forma:
{
  "category": "una de: Acceso e Identidad | Windows/Endpoint | Redes/Conectividad | Microsoft 365 | Impresoras y Hardware | Aplicaciones | Consulta/How-To",
  "subcategory": "subcategoría corta y específica (máx 60 chars)",
  "priority": "P1 | P2 | P3 | P4 (P1 SOLO si servicio caído global o multiusuario)",
  "priorityReason": "1 frase justificando la prioridad",
  "confidence": "alta | media | baja",
  "keywords": ["3-6 keywords ES/EN del ticket útiles para buscar en una KB"],
  "missingInfo": ["1-3 datos que L1 debería pedir al usuario antes de actuar"],
  "securityFlags": ["señales de social engineering / phishing / riesgo SIEM detectadas, o array vacío"],
  "notes": "1-2 frases de contexto extra útil para L1 (máx 240 chars)"
}
Responde SOLO el JSON válido (sin markdown, sin explicaciones). Usa español.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = EnrichRequest.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Petición inválida: se espera { ticketText } (10-4000 chars).' },
        { status: 400 }
      );
    }
    const { ticketText, offlineCategory, offlinePriority } = parsed.data;

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content:
            `Texto del ticket:\n"""\n${ticketText}\n"""\n` +
            (offlineCategory
              ? `El análisis OFFLINE local devolvió: categoría="${offlineCategory}", prioridad="${offlinePriority ?? 'n/d'}". Si tu lectura difiere, dilo en "notes".\n`
              : '') +
            'Devuelve el JSON de enriquecimiento.',
        },
      ],
      thinking: { type: 'disabled' },
    });

    const raw = completion.choices[0]?.message?.content ?? '';
    // El modelo debe devolver JSON puro; tolerar fence markdown accidental.
    const jsonText = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    let enrich: unknown;
    try {
      enrich = JSON.parse(jsonText);
    } catch {
      return NextResponse.json(
        { ok: false, error: 'El servicio devolvió una respuesta no interpretable. Reintenta.' },
        { status: 502 }
      );
    }

    // Validar la forma antes de devolverla al cliente.
    const EnrichResult = z.object({
      category: z.string().min(1).max(120),
      subcategory: z.string().min(1).max(80),
      priority: z.enum(['P1', 'P2', 'P3', 'P4']),
      priorityReason: z.string().max(300),
      confidence: z.enum(['alta', 'media', 'baja']),
      keywords: z.array(z.string().max(60)).min(1).max(8),
      missingInfo: z.array(z.string().max(200)).max(5),
      securityFlags: z.array(z.string().max(200)).max(5),
      notes: z.string().max(400),
    });
    const result = EnrichResult.safeParse(enrich);
    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: 'El servicio devolvió un enriquecimiento con formato inesperado.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, enrichment: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json(
      { ok: false, error: `Enriquecimiento online falló: ${message}` },
      { status: 502 }
    );
  }
}
