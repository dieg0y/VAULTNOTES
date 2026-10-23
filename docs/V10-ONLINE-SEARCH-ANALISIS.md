# VAULTNOTES V10 — INFORME DE ANÁLISIS
## Online Search Enrichment sin dejar de ser local

**Fecha:** 2026-08-09 · **Versión del análisis:** V10.0 · **Ámbito:** producto, arquitectura y seguridad
**Roles aplicados:** Senior Product Analyst · System Architect Offline-First + Online Enrichment · Security & Privacy Architect

**Convención de verificación (regla del encargo):**
- ✅ **VERIFICADO** — comprobado hoy en el código del repo o mediante búsqueda web con fuente primaria/terciaria fiable.
- ⚠️ **NOT VERIFIED** — no comprobable en esta sesión; se marca explícitamente y NO se usa como base de ninguna decisión firme.

---

## 1. RESUMEN EJECUTIVO

**Veredicto de viabilidad: ALTA — y no es teórica.** ✅ VERIFICADO en el propio código: VaultNotes **ya implementa y valida en producción una capa online-opcional** (módulo `integrations/threatIntel/` con 4 proveedores + búsqueda CVE en NVD 2.0) que cumple exactamente los invariantes que exige este análisis: consentimiento explícito, nunca-silencioso, caché local, claves aisladas y cifradas, cero telemetría, y la app 100% funcional sin internet. **V10 no empieza de cero: extiende un patrón ya probado** a runbooks/cheatsheets/troubleshooting y a fuentes de conocimiento (NVD, KEV, EPSS, OSV, MITRE, Microsoft Learn, Sigma).

Puntos clave del informe:

1. **ONLINE no significa nube.** Es una capa *opcional y explícita* de consulta puntual a fuentes públicas; **local sigue siendo la fuente de verdad** y todo lo traído se cachea localmente (disponible offline para siempre).
2. **Costo: $0** en las fases 1 y 2. Todas las fuentes críticas son gratuitas y la mayoría **no requiere API key** (NVD sin clave, CISA KEV, EPSS, OSV, MITRE STIX, Microsoft Learn en GitHub, Sigma, cvelistV5, HIBP range). ✅ VERIFICADO.
3. **Riesgo principal:** privacidad de las consultas (qué estás investigando) y gestión de claves. **Ya mitigado en el patrón existente** (solo se envía el término técnico, consentimiento previo, claves AES-GCM en DB aislada que jamás se exporta). Riesgos residuales con mitigación adicional en §8.
4. **Portabilidad USB, .bat, backups ZIP y offline-first: intactos.** El enriquecimiento viaja en el ZIP como capa adjunta (`latest-wins`, igual que los datasets de referencia actuales); las claves **nunca** viajan.
5. **Recomendación final: SÍ vale la pena**, en 3 fases con gates de QA (§10.3). Fase 1 = enriquecimiento CVE/KEV/EPSS sin claves en runbooks y troubleshooting. Fase 2 = fuentes de conocimiento + proxy local opcional + sync MITRE/Sigma real (cierra los 2 stubs honestos que hoy existen ✅ VERIFICADO). Fase 3 = opt-in avanzado (VirusTotal/OTX/abuse.ch, enriquecimiento en lote, IA opcional).
6. **Hallazgo de auditoría colateral (fix de 1 línea):** `CURRENT_SCHEMA_VERSION = 22` mientras el schema ya declara `version(23)` (`socTickets`). No hay pérdida de datos (Dexie abre siempre en la versión más alta declarada), pero el manifiesto de backup subreporta la versión. Detalle en §2.3.

---

## 2. ESTADO ACTUAL (auditado hoy, ✅ VERIFICADO en el repo)

### 2.1 Plataforma

| Aspecto | Estado verificado |
|---|---|
| Framework | Next.js 16 (`^16.1.1`) + React 19, App Router, ruta única `/` |
| Base de datos local | Dexie 4 IndexedDB (`VaultLocalDB`), schema declarado hasta **v23** (`socTickets`) |
| Backups | `zipBackup.ts` **BACKUP_FORMAT_VERSION 3.9.0**, merge `latest-wins`, validación Zod por entidad, snapshots de 9 datasets de referencia, videos excluidos del ZIP |
| PWA offline | 100% funcional sin conexión (gating `navigator.onLine`, sin probes de red) |
| Contenido V9 | Runbooks **52 HD / 48 SA / 40 SOC** · Troubleshooting **24/22/22** · Cheatsheets **70/58/48** · Tickets simulador **60/56/50** · **~93 Windows Event IDs** · 61 técnicas MITRE bundled · 56 reglas Sigma bundled · 49 tools |
| Práctica/gamificación | 3 roadmaps con checklist persistido, perfil profesional multi-perfil, glosario con flashcards |

### 2.2 La capa online-opcional YA EXISTENTE (hallazgo central, ✅ VERIFICADO)

El encargo describe el estado actual como "100% offline". La auditoría de código matiza esto de forma **muy favorable**: ya hay una capa online **opcional, explícita y privacy-first** conviviendo sin romper el offline-first:

| Componente | Ubicación | Estado |
|---|---|---|
| Indicador de conectividad | `integrations/online.ts` | ✅ `navigator.onLine` + eventos, **sin probes de red**, cero fugas |
| Threat Intel (IOC enrichment) | `integrations/threatIntel/` | ✅ 4 proveedores: VirusTotal v3, AbuseIPDB, AlienVault OTX, Shodan |
| Consentimiento | `threatIntel/consent.ts` | ✅ Booleano único en localStorage, aviso de privacidad la 1ª vez, reset desde Settings, **sin metadatos** |
| Claves API | `threatIntel/credentials.ts` | ✅ DB Dexie **separada** (`VaultIntelDB`), cifrado AES-GCM (PBKDF2 50k, salt por instalación), **jamás exportada en backups**, borrado irrecoverable |
| Rate limit | `threatIntel/rateLimit.ts` | ✅ In-memory 5 s anti-doble-clic |
| Caché | `threatIntel/cache.ts` + tabla `tiCache` | ✅ Con TTL; se exporta en el ZIP (contiene resultados, no claves) |
| Log de actividad | `onlineActivity` | ✅ Registra **solo tipo de IOC + estado**, nunca el valor (privacidad) |
| Búsqueda CVE online | `integrations/cve/search.ts` | ✅ NVD 2.0 (`cveId`), sanitización de todo lo recibido, `[Save to Vault]` → tabla `savedCves` con notas/tags/valoración personal |
| Cliente HTTP | `threatIntel/client.ts` | ✅ Timeout AbortController 12 s, `credentials:'omit'`, sanitización de strings/números/arrays (anti-XSS y anti-overflow) |
| Errores tipados | `threatIntel/errors.ts` | ✅ Clasificación `cors_blocked` / `network_timeout` / `not_configured` / `rate_limit`… |
| Sync Center (MITRE/Sigma) | `integrations/mitre/sync.ts`, `sigma/sync.ts` | ⚠️ **Arquitectura honesta, no cableada**: stubs con las reglas correctas (nunca auto-call, backup antes de swap, validación) pero sin endpoint real |
| Import manual Sigma | `sigma/validate.ts` | ✅ REAL y offline: parse YAML → `customSigmaRules` |

**Implicación estratégica:** el "cómo" de V10 ya está resuelto y testeado. Falta el "qué": extender el mismo orchestrator a **contenido** (runbooks/cheatsheets/troubleshooting) y a **fuentes de conocimiento** (MS Learn, MITRE, KEV, EPSS, OSV, Sigma). Y cablear los 2 stubs del Sync Center.

### 2.3 Hallazgos de auditoría (colaterales a este análisis)

| ID | Hallazgo | Severidad | Fix propuesto |
|---|---|---|---|
| H1 | `CURRENT_SCHEMA_VERSION = 22` pero el schema declara `version(23).stores({ socTickets … })` (db/index.ts:635 vs :645) | Menor (versionado de manifiestos de backup; sin pérdida de datos: Dexie abre en la versión más alta declarada) | 1 línea: `export const CURRENT_SCHEMA_VERSION = 23;` + nota en changelog de backup |
| H2 | Sync MITRE/Sigma = stubs ("live sync not wired") | Informativo | Es exactamente el hueco que llena la Fase 2 de V10 (§10.3) |
| H3 | Comentario en `cve/search.ts` afirma "NVD supports CORS" | ⚠️ NOT VERIFIED en runtime por este análisis | Mantener el manejo de `cors_blocked` (ya existe); si falla, el proxy local de Fase 2 lo resuelve |

---

## 3. QUÉ ENTENDEMOS POR ONLINE (definición corregida)

**ONLINE no es** ❌: pasar la app a la nube, migrar IndexedDB a un servicio, sync automático de nada, telemetría, cuentas de usuario, dependencia de internet para funcionar, ni "mejorar" el contenido local por defecto.

**ONLINE sí es** ✅: la capacidad **opcional y explícita** de buscar en internet (NVD/CVE, CISA KEV, MITRE ATT&CK, Microsoft Learn, Event IDs oficiales, docs KQL, repos Sigma, VirusTotal, etc.) **sin limitación funcional de fuentes ni de términos**, disparada por un botón `[Buscar Online]`, cuyo resultado se **normaliza, sanitiza y cachea localmente** como capa de enriquecimiento adjunta al ítem (runbook/cheatsheet/troubleshooting/IOC). **Local sigue siendo la fuente de verdad**: el bundle de contenido de la app prevalece y el enriquecimiento es un anexo datado y eliminable.

**Invariantes no negociables (I1–I7), ya implementados en la capa existente y que V10 hereda:**

| # | Invariante | Estado hoy |
|---|---|---|
| I1 | Local-first: sin internet la app hace TODO lo que hace hoy | ✅ |
| I2 | Opt-in explícito: ninguna petición de red sin click del usuario | ✅ |
| I3 | Consentimiento previo con aviso de privacidad (reset disponible) | ✅ |
| I4 | Nunca peticiones al arranque de la app | ✅ (spec #22 ya cumplida) |
| I5 | Claves API nunca en backups ZIP (DB aislada + cifrada) | ✅ |
| I6 | Nunca se envían notas/tickets completos: solo el término técnico elegido | ✅ (log registra solo el tipo) |
| I7 | Degradación elegante: offline → botón deshabilitado + caché local | ✅ |

---

## 4. VIABILIDAD TÉCNICA

### 4.1 Veredicto

**VIABLE.** ✅ VERIFICADO por existencia: el patrón (consent → online-check → rate-limit → cache → dispatch → sanitize → store → log) ya corre en producción con 5 fuentes (4 TI + NVD). Extenderlo a contenido es trabajo incremental de adaptadores + 1 tabla nueva + UI contextual. **Nada de la arquitectura actual (Dexie, ZIP, .bat, FS Access API para videos) cambia.**

### 4.2 Arquitectura propuesta (extensión del módulo existente)

```
┌────────────────────────── UI (por pilar) ──────────────────────────┐
│ RunbooksView / CheatSheetView / TroubleshootingView / ToolsView    │
│   [🔍 Buscar Online]  contextual al ítem abierto                   │
│   Panel colapsable "Enriquecimiento online" (fuentes + resultados) │
└──────────────────────────────┬─────────────────────────────────────┘
                               ▼
┌──────────────── OnlineContentOrchestrator (nuevo, patrón registry) ┐
│ 1. consent (I3) → 2. isOnline (I7) → 3. rateLimit/cola backoff     │
│ 4. cache contentEnrichments (TTL por fuente) → 5. dispatch a       │
│ adaptador → 6. sanitize (reusar client.ts) → 7. store → 8. log     │
│ (tipo+fuente+estado, NUNCA el término completo — igual que hoy)     │
└──────────┬──────────────────────────────┬─────────────────────────┘
           ▼                              ▼
┌─ Adaptadores (1 por fuente) ─┐  ┌─ Transporte ────────────────────┐
│ SearchSource { id, kind,      │  │ A) fetch directo browser CORS   │
│ supports(term), search(term)} │  │ B) proxy local Next.js route    │
│ NVD·KEV·EPSS·OSV·Mitre·       │  │    handler (allowlist dominios, │
│ MsLearn·Sigma·cvelistV5·      │  │    solo GET, timeout)           │
│ VT·OTX·abuse.ch·HIBP          │  └─────────────────────────────────┘
└───────────────────────────────┘
           ▼
┌─ contentEnrichments (Dexie, VaultLocalDB) ─────────────────────────┐
│ id: `${source}:${targetKind}:${term}` · payload sanitizado         │
│ fetchedAt · expiresAt · se EXPORTA en ZIP (3.10.0) · latest-wins   │
│ Claves: NUNCA aquí (siguen en VaultIntelDB cifrada)                │
└─────────────────────────────────────────────────────────────────────┘
```

- **Orchestrator = copia del patrón `enrichWithProvider()`** (registry.ts) con los mismos 4 outcomes (fresco / caché / error / consent-missing). Reutiliza `client.ts` (fetch + sanitización) y `errors.ts`.
- **UI:** botón `[Buscar Online]` junto a cada ítem; resultados como bloque "Online — actualizado {fecha} — fuente {X}" con acciones `[Guardar en el ítem]` / `[Descartar]`. El contenido base **jamás se sobreescribe**: el enriquecimiento es anexo.
- **ZIP 3.10.0:** añade `contentEnrichments.json` (mismo patrón que `tiCache.json`); los builds 3.9.x lo rechazarían up-front como ya hace la versión actual con versiones menores (regla spec #35).

### 4.3 CORS y el proxy (el único punto técnico delicado)

- ✅ VERIFICADO en código: hoy todo va por **fetch directo del navegador** (`mode:'cors'`, `credentials:'omit'`) con manejo tipado de `cors_blocked`. Para fuentes CORS-friendly (GitHub raw/contents de MicrosoftDocs y repos públicos, APIs públicas que envían `Access-Control-Allow-Origin`) esto ya basta.
- ⚠️ NOT VERIFIED: cabeceras CORS exactas de NVD/KEV/EPSS/OSV en runtime desde un `Origin` de file/PWA local. El código actual ya maneja el fallo con mensaje honesto ("Requires secure backend/proxy").
- **Solución para fuentes sin CORS: proxy local**, propuesto por el propio encargo como "proxy opcional": un **route handler de Next.js** (`/api/online-fetch`) que corre **en el servidor bun local que el .bat ya arranca** — cero infraestructura externa, cero nube, sigue siendo tu máquina. Reglas anti-abuso: allowlist estricta de dominios (anti-SSRF), solo GET, sin claves en query-string (header), timeout 15 s, sin redirects a dominios fuera de la allowlist, sin logging de términos.
- En entornos corporativos con proxy de salida, el fetch del servidor local respeta `HTTP(S)_PROXY` del SO → funciona sin cambios.

### 4.4 Gestión de API keys (reutilizar el patrón existente tal cual)

✅ VERIFICADO: `VaultIntelDB` separada + AES-GCM + PBKDF2 (50 000 iteraciones) + salt aleatoria por instalación + borrado irrecoverable + **nunca exportada** + advertencia honesta en UI ("un atacante con ejecución de código local puede recuperarlas"). V10 **no inventa nada nuevo aquí**: mismo almacén, nuevos provider-ids.

**Ventaja clave de las fuentes de Fase 1/2: la mayoría NO requiere clave** (NVD funciona sin clave a 5 req/30 s ✅ VERIFICADO, KEV/EPSS/OSV/MITRE/MS Learn/Sigma/cvelistV5/HIBP: sin clave). Las claves solo entran en Fase 3 (VT/OTX/abuse.ch Auth-Key).

### 4.5 Caché y TTL (offline forever tras la primera consulta)

| Fuente | TTL propuesto | Motivo |
|---|---|---|
| CVE (NVD/cvelistV5) | 30 días | El registro CVE es cuasi-inmutable; `lastModified` se guarda |
| CISA KEV | 24 h | El catálogo cambia varias veces por semana |
| EPSS | 24 h | Score diario |
| OSV | 7 días | Vulnerabilidades de dependencias |
| MITRE STIX | por versión (ATT&CK publica versiones) | Dataset versionado |
| Microsoft Learn / Event IDs / KQL | 7–30 días | Docs estables |
| Sigma repo | por commit/etiqueta | Dataset versionado |

Segunda consulta del mismo término = **0 red** (política ya probada en `tiCache`). El botón `[Refresh]` existe (`forceRefresh` ya implementado).

### 4.6 Portabilidad USB / .bat / backups — sin cambios de flujo

- `IniciarVaultNotes.bat` + `.vaultnotes-folder.txt` + `tools/bun` portable: intactos (el proxy de Fase 2 es el mismo servidor local que ya arranca el .bat).
- ZIP: los enriquecimientos viajan como capa adjunta; al importar, `latest-wins` idéntico al de `tiCache`/`savedCves` hoy. Claves fuera (I5).
- Videos en File System Access API: sin cambios.

### 4.7 Servicios reales a integrar (tabla maestra, ✅ VERIFICADO salvo marca)

| Fuente | Endpoint/repos real | Clave | Límite real (✅ verificado) | Costo | Aporta a |
|---|---|---|---|---|---|
| **NVD 2.0** | `services.nvd.nist.gov/rest/json/cves/2.0` | Opcional (gratuita: org+email) | 5 req/30 s sin clave; 50 req/30 s con clave | $0 | Runbooks SA/SOC: CVE+CVSS+CWE+refs (ya integrado hoy) |
| **CVE List v5** | github `CVEProject/cvelistV5` (actualiza ~cada 7 min) | No | GitHub anónimo: 60 req/h | $0 | Búsqueda masiva offline-cacheable por año/producto |
| **CISA KEV** | `cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json` + mirror github `cisagov/kev-data` (JSON/CSV) | No | Feed público descargable | $0 | Priorización de parcheo (SA) — "¿está en KEV?" |
| **EPSS** | `api.first.org/data/v1/epss` | No | API pública gratuita | $0 | Probabilidad de explotación → prioridad de parcheo |
| **OSV.dev** | `api.osv.dev` (Google, 30+ fuentes agregadas) | No | Gratuito | $0 | CVEs de dependencias/paquetes (DevOps/Cloud) |
| **MITRE ATT&CK STIX 2.1** | github `mitre/attack-stix-data` (+ `mitre/cti` STIX 2.0) | No | GitHub público | $0 | Techniques/grupos/software actualizados → SOC + tool guides |
| **Microsoft Learn (fuente)** | github `MicrosoftDocs/*` (p.ej. `microsoft-365-docs`, windowsserver, `azure/azure-sentinel`) | No | GitHub 60 req/h anónimo | $0 | Docs oficiales en Markdown: KQL, Intune, GPO, Defender |
| **Event IDs oficiales** | learn.microsoft.com → `windows/security/threat-protection/auditing/event-{id}` (via repo) | No | GitHub/Docs públicos | $0 | Troubleshooting: campos y causas de cada Event ID |
| **Sigma** | github `SigmaHQ/sigma` (3.000+ reglas) | No | GitHub público | $0 | Detecciones frescas vs 56 bundled |
| **VirusTotal v3** | `virustotal.com/api/v3` | Sí (gratuita) | **4 req/min · 500 req/día · uso NO comercial** | $0 (free) | IOC enrichment (ya integrado hoy) |
| **AlienVault OTX** | `otx.alienvault.com/api/v1` | Sí (gratuita) | Clave gratuita, 19M+ indicadores | $0 | IOC/pulses (ya integrado hoy) |
| **abuse.ch** | `urlhaus.abuse.ch` (API libre), `bazaar.abuse.ch` (Auth-Key gratuito), ThreatFox | Parcial (Auth-Key gratis) | API comunitaria gratuita | $0 | IOC URLs/malware/ThreatFox |
| **HIBP Pwned Passwords** | `api.pwnedpasswords.com/range/` (k-anonymity) | No | Gratuito | $0 | HD: contraseñas filtradas sin enviar la contraseña |
| Shodan | `api.shodan.io` | Sí | ⚠️ NOT VERIFIED (límites/precio actuales) | Freemium | Superficie expuesta (ya integrado; opt-in) |
| GreyNoise Community | `api.greynoise.io` | Sí | ⚠️ NOT VERIFIED | Freemium | Contexto de IPs escaneadoras |
| LLM (IA opcional) | proveedor con clave propia del usuario | Sí | ⚠️ NOT VERIFIED | $ | Fase 3: explicar tickets (solo texto técnico seleccionado) |

*Nota: se listan servicios reales y verificados; los marcados ⚠️ NO se usan como base de decisiones.*

### 4.8 Rate limits y cola

Cola local con backoff exponencial + TTL de caché: **cada término único se pide una sola vez**. Los límites de GitHub anónimo (60/h) se respetan con un solo fetch de manifest + fetch de contenido por consulta. NVD sin clave (5/30 s) es irrelevante para uso interactivo humano. VT free (4/min) ya se respeta con el rate-limiter existente + cola.

### 4.9 Privacidad por diseño (qué viaja exactamente)

- Se envía **solo el término técnico elegido** (un CVE-ID, un hash, un Event ID, una frase de error seleccionada). **Nunca** notas, tickets, contexto ni metadatos del usuario. ✅ Patrón ya vigente (el log local guarda solo tipo+estado).
- Preview honesto antes de enviar: "Se enviará a {fuente}: `{término}`".
- Elección de fuentes **sin cuenta** por defecto → ni email viaja al tercero.
- k-anonymity disponible para contraseñas (HIBP range: solo 5 primeros caracteres hex del SHA-1).
- Advertencia honesta: el proveedor ve la consulta (IP + término). No hay forma de evitarlo con APIs públicas; se mitiga optando por fuentes estatales/comunitarias sin registro y usando la caché para no repetir.

---

## 5. MEJORAS POSIBLES CON ONLINE SEARCH (concretas, por tipo de contenido)

| Contenido | Antes (offline puro) | Con [Buscar Online] |
|---|---|---|
| **Runbook** (p.ej. "Outlook no abre tras parche") | Pasos genéricos vigentes al día del release | Trae de MS Learn los top-fixes actuales por versión de Office/Windows + KB referenciada, se adjunta como "Referencia online (fecha)" con link congelado |
| **Runbook SA** (parche crítico) | Severidad estimada | **CVE → NVD + KEV + EPSS**: CVSS real, ¿está explotado activamente?, probabilidad 24 h/30 días → prioridad de parcheo con evidencia |
| **Cheatsheet KQL** | Queries curadas | Query oficial del docs de Sentinel/Kusto para la tabla exacta (p.ej. `EmailEvents`), con sintaxis vigente y operadores nuevos |
| **Troubleshooting 4625** | Escalera de decisión estática | Doc oficial del Event ID (todos los campos, substatus 0xC000006A/0xC0000072…, recomendación de auditing) adjunta al ítem |
| **Tool guide SOC** | 61 técnicas bundled | Technique actualizada del STIX de ATT&CK (sub-técnicas nuevas, data sources vigentes) |
| **Glosario** | Definiciones propias | Contraste opcional con definiciones oficiales (MITRE/CISA/NIST) |
| **Simulador** | Dataset estático | Un botón "¿Qué ha cambiado desde que se escribió este caso?" → feeds KEV/MS Learn para casos de parche/phishing |

Todas las mejoras comparten la misma forma: **capa anexa datada, sanitizada, cacheada, eliminable** — el contenido base nunca muta silenciosamente.

---

## 6. NUEVAS FEATURES QUE SE DESBLOQUEAN (imposibles 100% offline)

### 6.1 HelpDesk
- **Búsqueda de mensaje de error exacto** ("0x80070005 al activar Office") → MS Learn/KB → causa raíz real y hotfix vigente.
- **Soluciones por versión**: Windows 10 vs 11 23H2 vs 24H2 pueden tener fixes distintos.
- **Verificador de contraseñas filtradas** (HIBP k-anonymity, sin enviar la contraseña) para el runbook de credenciales comprometidas.
- **KBGenerator enriquecido**: el generador de respuestas cita con link oficial actual.

### 6.2 SysAdmin
- **Priorización de parcheo guiada por KEV+EPSS** (dashboard: "3 CVEs de tu stack están en KEV").
- **Diff de sintaxis entre versiones** (systemd/lvm/PowerShell) contra docs oficiales.
- **Vigilancia de CVEs del stack** (OSV/cvelistV5: "nueva CVE afecta a tu openssh").

### 6.3 SOC / Blue Team
- **IOC enrichment ya existe** (VT/AbuseIPDB/OTX/Shodan) → V10 añade **abuse.ch** (URLhaus/ThreatFox/MalwareBazaar) al mismo orchestrator.
- **MITRE mapping vivo**: al abrir un caso con technique (p.ej. T1566), traer sub-técnicas y data sources actuales del STIX oficial.
- **Sigma fresco**: 3.000+ reglas del repo oficial (vs 56 bundled) consultables y guardables vía el import YAML ya existente.
- **Correlación CVE↔technique↔regla Sigma** en una sola vista de caso.

### 6.4 Enriquecimiento automático (opt-in por pilar)
- Botón "Enriquecer todo lo visible" con **cola + preview + confirmación** antes de guardar (nunca silencioso, cumple I2/I3).
- Enriquecimiento al **crear** un runbook desde un CVE guardado.

### 6.5 IA opcional para explicar tickets (Fase 3, opt-in duro)
- Requiere clave propia del usuario (costos ⚠️ NOT VERIFIED, se muestran antes de activar).
- Privacidad: **solo el texto técnico seleccionado** (error/evento/síntoma), nunca notas personales ni tickets completos; sesión desechable; nunca por defecto.

---

## 7. OFFLINE PURO vs OFFLINE + ONLINE SEARCH OPCIONAL

| Dimensión | Offline puro (hoy) | Offline + Online Search opcional (V10) |
|---|---|---|
| Actualización de contenido | Cada release de la app (manual, semanas) | Por consulta: docs/CVE/techniques al día (datados) |
| Precisión técnica | Alta al publicarse; degrada con el tiempo (KQL/Intune cambian) | Alta y verificable contra fuente oficial; link congelado |
| Velocidad de resolución | Depende de la curación | + causa raíz oficial y hotfix vigente en el mismo runbook |
| Aprendizaje | Excelente base, estática | + "qué cambió desde que lo estudié"; MITRE/Sigma vigentes |
| Privacidad | Máxima (0 bytes salen) | Casi máxima: solo términos técnicos explícitos, consentidos, con caché (repeticiones = 0 red) |
| Portabilidad USB | Total | Total (enriquecimientos viajan en ZIP; claves no; sin internet funciona igual) |
| Costo | $0 | $0 en fuentes clave (✅ verificado); premium solo si el usuario opta |
| Dependencia de internet | Ninguna | Ninguna para operar; opcional para enriquecer (degradación elegante) |
| Complejidad | Base actual | +1 módulo aislado (patrón ya probado) + adaptadores |
| Auditoría/forense de la app | Trivial | Mantiene trivial: log local de actividad (tipo+estado), purgable |

**Conclusión de la tabla:** V10 gana en 5 dimensiones sin perder ninguna — a condición de respetar los invariantes I1–I7 (que ya están implementados y por tanto son "gratis").

---

## 8. CONTRAS Y RIESGOS, CON MITIGACIÓN

| # | Riesgo/Contra | Realidad | Mitigación |
|---|---|---|---|
| R1 | **Privacidad de consultas**: buscar "CVE-X" o un hash revela qué investigas | El proveedor ve IP+término | Opt-in por consulta (I2/I3); fuentes sin cuenta por defecto (NVD/KEV/EPSS/OSV/GitHub no necesitan registro); k-anonymity en HIBP; caché para no repetir |
| R2 | **Fuga de PII** | Si se enviara contexto de notas | Lista blanca de campos: solo término técnico; preview "se enviará: X"; sanitización bidireccional (ya existe client.ts) |
| R3 | **Dependencia de internet** | Percepción | I7: botón se deshabilita + "Sin conexión — usando caché"; la app hace TODO lo demás |
| R4 | **Gestión de API keys** | Riesgo de robo local | Patrón existente: DB aislada, AES-GCM, salt por instalación, no-exportación, borrado irrecoverable, aviso honesto en UI |
| R5 | **Rate limits / costos** | VT 4/min·500/día; GitHub 60/h anónimo | Cola + backoff + TTL caché (1 fetch por término único); límites tipados (`rate_limit` ya existe en errors.ts) |
| R6 | **Complejidad y mantenimiento** | Adaptadores por fuente | Interface única `SearchSource`; feature flag; errores tipados; los stubs del Sync Center ya anticipan la forma |
| R7 | **Caducidad de lo cacheado** | Datos viejos confundiendo | TTL por fuente + "Online — actualizado {fecha}" visible + [Refresh] |
| R8 | **Seguridad del proxy local (SSRF)** | Un proxy mal hecho permite fetch arbitrario | Allowlist estricta de dominios, solo GET, sin claves en query, timeout, sin redirects externos |
| R9 | **Integridad/alteración del contenido traído** | JSON malicioso/comprometido | Sanitización estricta (ya existe) + validación de esquema con Zod antes de guardar (mismo patrón que backupSchemas) + render solo como texto |
| R10 | **Cambios de API externa** | NVD/VT versionan sus APIs | Adaptadores versionados por API; errores tipados; fallo → degradación con caché |
| R11 | **Confusión local vs online** | Usuario cree que algo es oficial del bundle | Insignia "Online · {fuente} · {fecha}" en cada bloque enriquecido; purge de enriquecimientos desde Settings |
| R12 | **ToS de proveedores** | VT free = no comercial | Aviso de uso no-comercial en la tarjeta del proveedor; VT solo en Fase 3 opt-in |

---

## 9. COSTOS

| Concepto | Fase 1 | Fase 2 | Fase 3 (opcional) |
|---|---|---|---|
| Fuentes de datos | $0 (NVD/KEV/EPSS sin clave) ✅ | $0 (GitHub público: MS Learn/MITRE/Sigma/OSV) ✅ | $0 (VT free 500/día, OTX, abuse.ch) ✅ |
| Infraestructura propia | $0 | $0 (proxy = servidor bun local que ya corres) | $0 |
| API keys | Ninguna | Ninguna obligatoria | Gratuitas (VT/OTX/abuse.ch Auth-Key) |
| Premium (solo si optas) | — | — | VT Premium ⚠️ NOT VERIFIED · Shodan ⚠️ · LLM ⚠️ (precios no verificados; se muestran antes de activar) |
| Esfuerzo dev | ~1 sesión (orchestrator+adaptadores+UI+ZIP 3.10.0+E2E) | 2–3 sesiones (proxy, MS Learn, MITRE/Sigma sync real, consent por pilar) | 1–2 sesiones |

---

## 10. OTRAS POSIBLES MEJORAS O SUGERENCIAS (sección final — obligatoria)

### 10.1 Arquitectura híbrida recomendada

**"Local-first + enrichment cacheado + opt-in por pilar"** — exactamente la ya implementada para Threat Intel, extendida:

1. **Núcleo local inmutable:** contenido bundle = fuente de verdad; Dexie = estado del usuario; ZIP = portabilidad. (Ya existe — no tocar.)
2. **Capa de enriquecimiento cacheada:** tabla `contentEnrichments` exportable, `latest-wins`, TTL por fuente, purgable. Adjunta al ítem con fecha/fuente; nunca sobrescribe el base.
3. **Opt-in por pilar:** Settings → "Online por pilar": HelpDesk / SysAdmin / SOC cada uno con su set de fuentes y su consent granular (el consent global actual sigue siendo la puerta exterior).
4. **Transporte dual:** fetch directo cuando la fuente es CORS-friendly; proxy local (route handler con allowlist) para el resto; ambos solo tras click explícito.
5. **Claves fuera del flujo de backups:** VaultIntelDB cifrada, sin cambios.

### 10.2 Mejoras SIN online que faltan (offline puro, conviene hacerlas antes o en paralelo)

1. **Fix H1:** `CURRENT_SCHEMA_VERSION = 23` (1 línea, cierre de deuda de versionado).
2. **Packs de datos offline descargables** ("Offline Enrichment Packs"): ZIPs (MITRE STIX, KEV JSON, Sigma top-N, cvelistV5 recortado por año) que el usuario descarga **una vez** y arrastra al Sync Center existente → sync real **sin proxy y sin exponer consultas** (para entornos paranoicos: la descarga la hace el navegador normal, la app solo lee el archivo). Encaja perfecto con los stubs actuales.
3. **Export/import por pilar** (JSON de runbooks/cheatsheets favoritos).
4. **Simuladores:** modo examen cronometrado + estadísticas de acierto por categoría.
5. **Fuzzy search sobre enriquecimientos cacheados** (fuzzySearch.ts ya existe).
6. **Tags globales + favoritos** para runbooks/cheatsheets.
7. **Atajos de teclado globales** y modo lectura sin distracciones.

### 10.3 Roadmap de 3 fases (sin romper nada — cada fase pasa los gates completos)

**FASE 1 — "CVE/KEV/EPSS sin claves" (base inmediata, cero riesgo)**
- Entregables: `OnlineContentOrchestrator` (patrón registry) · adaptadores NVD/KEV/EPSS (sin clave) · tabla `contentEnrichments` + ZIP **3.10.0** · botón `[Buscar Online]` en Runbooks y Troubleshooting (HD/SA/SOC) · panel de enriquecimiento con preview "se enviará: X" · TTL + insignia de fecha.
- Gates: tsc 0 · eslint 0 · E2E navegador real (offline: botón deshabilitado · online: fetch+cache+segunda consulta sin red) · backup round-trip con enriquecimientos · 0 errores de consola.
- Criterio de éxito: enriquecer "CVE-2021-44228" en un runbook de parches y ver CVSS+KEV+EPSS guardado y consultable offline.

**FASE 2 — "Fuentes de conocimiento + proxy local + sync real"**
- Entregables: adaptadores MicrosoftDocs (Markdown crudo → sección legible), MITRE STIX (attack-stix-data) y Sigma (repo oficial) → **cablear los stubs del Sync Center (H2) con el flujo Descargar→Validar→Preview→Backup→Importar que ya tienen especificado** · OSV · route handler `/api/online-fetch` con allowlist · consent granular por pilar · `[Buscar Online]` en Cheatsheets y tool guides.
- Gates: idem Fase 1 + prueba de SSRF del proxy (dominio fuera de allowlist → rechazo) + import de pack offline (10.2.2) como vía alternativa.

**FASE 3 — "Opt-in avanzado" (solo si el usuario quiere)**
- Entregables: VirusTotal/OTX/abuse.ch en el orchestrator de contenido (reutilizando credenciales ya configuradas) · enriquecimiento en lote con cola+preview+confirmación · packs offline descargables oficiales · IA opcional con clave propia (solo texto técnico seleccionado, costos visibles, ⚠️ NOT VERIFIED hasta elegir proveedor).
- Gates: idem + prueba de ToS/avisos + medición de cuota respetada.

### 10.4 Recomendación final

**SÍ: vale la pena, y más de lo que sugiere el propio encargo** — porque el análisis de código demuestra que la parte difícil (el patrón privacy-first: consent, claves cifradas aisladas, caché con TTL, sanitización, degradación offline, backups que respetan todo esto) **ya está construida, probada y publicada**. V10 es una extensión natural de bajo riesgo y costo $0 con las fuentes gratuitas.

**Cómo implementarlo (decisión ejecutiva):**
1. Fase 1 YA (mayor valor/menor riesgo: KEV+EPSS+NVD en runbooks, sin claves, sin proxy).
2. Fase 2 para cerrar los stubs MITRE/Sigma y cubrir docs oficiales (el mayor salto de "precisión técnica" de la tabla §7), con proxy local allowlist y packs offline como alternativa sin red.
3. Fase 3 solo bajo demanda explícita del usuario (IA/claves de terceros), con costos verificados en el momento.
4. Invariantes I1–I7 como tests de aceptación permanentes: **cualquier feature que los viole, no se mergea.**

---

## ANEXO A — Fuentes verificadas en este análisis (búsqueda web, 2026-08-09)

- NVD API 2.0 límites (5/30 s sin clave, 50/30 s con clave): nvd.nist.gov + issues GitHub + Archer IRM docs.
- VirusTotal v3 Public: 4 req/min, 500 req/día, no comercial: docs.virustotal.com + rate-limits repo.
- MITRE STIX: attack.mitre.org (STIX 2.0/2.1) + repos `mitre/cti` y `mitre/attack-stix-data`.
- CISA KEV: cisa.gov (catálogo) + mirror `cisagov/kev-data` (JSON/CSV).
- OSV.dev: API pública gratuita, 30+ fuentes (google.github.io/osv.dev).
- EPSS: `api.first.org/data/v1/epss` (FIRST, gratuito).
- Microsoft Learn en GitHub: `MicrosoftDocs/microsoft-365-docs` ("host the source… published to Microsoft Learn… Markdown").
- SigmaHQ/sigma: "more than 3000 detection rules… at no cost".
- cvelistV5: "official CVE List… updated regularly (about every 7 minutes)".
- abuse.ch: URLhaus API free; MalwareBazaar requiere Auth-Key gratuita; Spamhaus gestiona acceso comercial.
- OTX: clave gratuita, ~19M indicadores/día (LevelBlue/Maltego).
- HIBP Pwned Passwords: k-anonymity, gratuito (haveibeenpwned.com + Troy Hunt).
- Event ID 4625 y KQL: learn.microsoft.com (docs públicas).

## ANEXO B — Hallazgos de auditoría del repo (resumen)

H1 `CURRENT_SCHEMA_VERSION=22` vs `version(23)` (db/index.ts) — fix 1 línea · H2 stubs MITRE/Sigma sin endpoint (los llena la Fase 2) · H3 afirmación "NVD supports CORS" no verificada en runtime (manejo de error ya existe).

*Informe generado como análisis de producto/arquitectura; no modifica código de la app. VaultNotes sigue siendo local-first: cualquier implementación futura debe respetar los invariantes I1–I7.*
