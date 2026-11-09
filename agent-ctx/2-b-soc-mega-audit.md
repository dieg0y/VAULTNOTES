# 2-b — SOC · Bloque MEGA-AUDITORÍA (RB-SOC-049…054 + LAB-SOC-001…004)

**Agente:** Creador de contenido técnico senior — VaultNotes (SOC / Blue Team L1)
**Archivo modificado:** `src/vault/data/runbooksSoc.ts` (solo este archivo; nada más del proyecto fue tocado)
**Fecha:** 2026 — bloque mega-auditoría de empleo 2024-2026 (V10)

## Qué se hizo

Se añadieron **10 documentos nuevos** al final del array `RUNBOOKS_SOC` (insertados ANTES del `];` que precede a `export const RUNBOOKS_SOC_COUNT`), con la interfaz `PillarRunbook` completa (los 18 campos, mismo orden que los existentes) y las reglas de estilo del archivo (single-quotes, KQL con `"` dentro de single-quotes TS, paths Windows con `\\` como el resto del archivo, es-CO descriptivo + inglés en ticket_example / english_customer_response_template / english_technical_explanation).

### Runbooks (RB-SOC-049…054)

| ID | Categoría | Título (resumen) | Líneas aprox. |
|---|---|---|---|
| RB-SOC-049 | Phishing | Análisis completo de cabeceras de email: cadena Received, SPF/DKIM/DMARC y veredicto del mensaje | 94 |
| RB-SOC-050 | Respuesta a Incidentes | Forense de artefactos Windows: Prefetch, AmCache, ShimCache y línea de tiempo MFT (EZTools/KAPE) | 96 |
| RB-SOC-051 | C2 / Exfiltración | Wireshark y tshark para el triage SOC: filtros, conversaciones, flujos y extracción de IOCs del pcap | 102 |
| RB-SOC-052 | Procesos / EDR | Sysmon: despliegue con config, Event IDs clave (1,3,8,10,11,13,22) y envío al SIEM | 96 |
| RB-SOC-053 | Respuesta a Incidentes | SOAR en la práctica: playbook de enriquecimiento y contención en Logic Apps y Cortex XSOAR | 92 |
| RB-SOC-054 | SIEM | Splunk para el SOC L1: SPL esencial — 4625→4624, alerta y dashboard | 102 |

### Laboratorios guiados (LAB-SOC-001…004, category: 'Laboratorio' — categoría nueva)

| ID | Título (resumen) | Infra |
|---|---|---|
| LAB-SOC-001 | KQL para detectar Impossible Travel (SigninLogs, serialize/prev, afinado de FPs) | Sentinel trial / Log Analytics demo / tenant dev M365 (~90 min) |
| LAB-SOC-002 | Splunk con el dataset BOTSv3 — ingerir logs de ataque y cazar | Splunk Docker + botsv3-dataset (~2 h) |
| LAB-SOC-003 | Mapear un incidente a MITRE ATT&CK y cerrar huecos de detección | Visor ATT&CK offline de la app + RB-SOC-041/043 (~60-90 min) |
| LAB-SOC-004 | C2 en Wireshark — beaconing, intervalos y IOCs de un pcap real | malware-traffic-analysis.net (~75 min) |

### Header del archivo

Se añadió al final del doc-comment el bloque V10 exigido por la spec:
`V10 (RB-SOC-049…054 + LAB-SOC-001…004, mega-auditoría de empleo 2024-2026): análisis de cabeceras SPF/DKIM/DMARC, forense de artefactos Windows (Prefetch/AmCache/ShimCache/MFT), Wireshark/tshark para triage, Sysmon, SOAR (Logic Apps/XSOAR), Splunk SPL; laboratorios de KQL Impossible Travel, Splunk BOTSv3, mapeo MITRE ATT&CK y C2 en Wireshark.`

## Cumplimiento de reglas

- **Comandos EXACTOS de la spec** — nada inventado: nslookup TXT/_dmarc/_domainkey, EmailEvents/UrlClickEvents KQL, kape.exe --tsource/--tdest/--target KapeTriage, PECmd/AmcacheParser (-i on)/AppCompatCacheParser/MFTECmd (con `` `$MFT ``), tcpdump, tshark (-z conv,ip / -T fields / -Y dns.flags.response==0 / http.request / follow,tcp,ascii,0), Sysmon64.exe -accepteula -i / -c, Get-WinEvent (LogName y FilterHashtable Id=1 con -enc|encodedcommand), `Event | where Source == "Microsoft-Windows-Sysmon" | where EventID == 1 | take 10` (la versión CORRECTA; la rechazada por la spec NO se usó), az logic workflow list/show, Confirm-MgRiskyUserCompromised -UserIds, las 8 queries SPL de RB-SOC-054 (incluidas `| rest /services/saved/searches` y `| tstats`), las queries KQL de LAB-SOC-001 (base SIN ClientAppUsed y serialize/prev según spec), docker splunk/splunk:latest, queries BOTSv3 (sqlmap, uri_path, XmlWinEventLog 4624 — SIN inventar campos: se instruye el field browser), filtros Wireshark de LAB-SOC-004 (ip.addr, dns.qry.name contains, dns, http, ip.dst).
- **IDs ATT&CK solo los de la spec** (T1003, T1558.001, T1550.003) y con la nota explícita de confirmarlos en el visor, no de memoria.
- **Referencias cruzadas verificadas contra el archivo:** RB-SOC-001/002/004/005/006/007/009/010/014/016/017/018/019/021/022/023/024/026/027/028/029/031/032/040/041/043/045/048/053/054 (todas existen con el tema correcto).
- **Estructura validada en runtime (bun):** TOTAL 59 runbooks (49 previos + 10 nuevos); cada doc nuevo con 8 pasos (rango 7-9), 3 síntomas, 3 causas raíz, 3 prerrequisitos, 4 evidencias, 16 keywords (rango 12-16), 18/18 campos presentes.
- **Categorías nuevas en RUNBOOKS_SOC_CATEGORIES:** 'SIEM' y 'Laboratorio' (las demás ya existían).

## Validación

- `bunx eslint src/vault/data/runbooksSoc.ts` → **EXIT 0, sin errores ni warnings**.
- `bunx tsc --noEmit 2>&1 | grep runbooksSoc` → **sin output (sin errores en runbooksSoc.ts)**; `bunx tsc --noEmit` completo → **TSC_EXIT:0** (el proyecto compila limpio en el momento de la verificación).
- Archivo: 4561 → 5529 líneas (+968 líneas).

## Desviaciones de la spec (menores, justificadas)

1. **Keywords recortadas a 16 por doc** (la spec listaba 21-25 por doc; la interfaz del bloque exige 12-16 y runbooksCore dice 6-14). Se priorizaron los términos con más valor de búsqueda ES/EN.
2. **Placeholders adicionales usados tal cual los provee la spec:** `{{SELECTOR}}`, `{{C2_IP}}`, `{{RG}}`, `{{WORKFLOW}}`, `{{USER_ID}}`, `{{ADMIN_PASS}}`, `{{HOST_IP}}`, `{{GUESS}}` (precedente existente: RB-SOC-048 ya usa `{{MISP_API_KEY}}`/`{{MISP_URL}}`/`{{HASH_SHA256}}`). Los canónicos ({{USERNAME}}, {{TICKET_ID}}, {{DOMAIN}}, {{HOSTNAME}}, {{SOURCE_IP}}, {{TIMESTAMP}}, {{TENANT}}) se usan donde aplica.
3. **RB-SOC-049 paso 2 (origen M365):** la spec venía truncada ("sendei…"); se redactó la validación de congruencia del primer "Received: from" contra el dominio declarado SIN inventar hostnames de Microsoft.
4. **LAB-SOC-003 `commands_copyable: []`** — la spec no provee comandos para ese lab (es trabajo de mapeo) y está prohibido inventar; hay precedente de arrays vacíos en runbooksHelpDesk.ts y runbooksIam.ts.
5. **Labs: symptoms/root_causes reformulados como señales de necesidad de aprendizaje** (adaptación natural del modelo de ticket al formato laboratorio, igual que ticket_example 'LAB-SOC-00X - Guided lab: … - Self-paced ~N min - …').

## Notas para los siguientes agentes

- El array `RUNBOOKS_SOC` termina en LAB-SOC-004; el siguiente bloque SOC debería continuar en RB-SOC-055 o LAB-SOC-005 e insertarse antes del mismo `];`.
- No tocar los escapes: paths Windows con `\\`, el backtick de `` `$MFT `` y las dobles comillas KQL dentro de single-quotes TS.
- `RUNBOOKS_SOC_COUNT` (59) y `RUNBOOKS_SOC_CATEGORIES` se calculan solos (length / Set).
