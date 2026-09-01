// attacks/iam.ts — dataset de ATAQUES IAM / Identidad.
//
// 12 entradas con categoria: 'IAM'. REGLA ANTI-DUPLICADO (decisión de
// diseño verificada entrada por entrada): TODAS las técnicas de abuso
// AD/Kerberos clásicas — Kerberoasting, AS-REP Roasting, Golden/Silver/
// Diamond Ticket, Skeleton Key, DCSync, DCShadow, Pass-the-Hash/Ticket/
// Key, relay NTLM, coerción de autenticación, delegaciones (unconstrained/
// S4U/RBCD), AD CS ESC1-16, ACLs, SID History, Shadow Credentials, LAPS,
// GPP, gMSA, Zerologon, noPac, PrintNightmare, token manipulation, MFA
// fatigue, SIM swap, password spraying, credential stuffing, AiTM/Evilginx,
// Golden SAML, consent phishing, privesc AWS, IMDS — YA VIVEN en
// ../vulnerabilities.ts (203 entradas). Aquí SOLO lo que Vulnerabilidades
// NO cubre: exploits de Kerberos sin parche, extracción at-rest, recon,
// captura en el endpoint, phishing de flujos OAuth no cubiertos, robo de
// PRT, abuso de planificadores de endpoints (SCCM/Intune) y fraude de
// exportaciones.
//
// IDs: IAM-001..IAM-012. 100% offline — se concatena en ./index.ts.
// Los sinónimos van en `alias`, NUNCA como fila aparte.
// No usar `export default`.

import type { AttackInfo } from './types';

export const IAM_ATTACKS: AttackInfo[] = [
  /* ===================== KERBEROS (EXPLOITS SIN PARCHE) ===================== */
  {
    id: 'IAM-001',
    nombre: 'MS14-068 (PAC forjado)',
    alias: ['MS14-068', 'PAC forgery', 'kerberos checksum forge', 'CVE-2014-6324'],
    categoria: 'IAM',
    severidad: 'High',
    cve_ejemplo: ['CVE-2014-6324'],
    mitre_attack: ['T1558'],
    descripcion_tecnica: 'En KDCs sin el parche de Nov-2014 (2008 R2/2012/2012 R2), la validación del checksum del PAC (firma de servidor) es defectuosa: un usuario autenticado presenta un TGT con un PAC FORJADO —Domain Admins y Enterprise Admins en los grupos— y el KDC lo acepta y emite TGS con esos privilegios. De credenciales de un usuario normal a Domain Admin sin explotar ningún host: pura criptografía de Kerberos.',
    impacto_iam_soc: 'Escalada instantánea en dominios legacy sin parchear (raro hoy en TI corporativo, real en OT/ICS y entornos abandonados). No deja señal directa en eventos (los tickets son "válidos"): el hunt retrospectivo es TGS de cuentas normales hacia servicios de DC y revisión del parcheo de KDC.',
    como_funciona: ['Credenciales válidas de un usuario de dominio cualquiera', 'PyKEK (ms14-068.py) o kekeo: construir un TGT con PAC de Domain Admins y el bug del checksum del servidor', 'Presentarlo al KDC: lo valida mal y emite TGS con los grupos forjados', 'Usar los tickets hacia cifs/dc (psexec) y administrar el dominio'],
    deteccion: {
      kql: 'SecurityEvent | where EventID == 4769 and TargetUserName in (usuarios_normales) and (ServiceName startswith "cifs/" or ServiceName startswith "host/") | where IpAddress in (estaciones) // dominios sin parche: TGS hacia servicios de DC pedidos por cuentas normales desde estaciones',
      spl: 'index=win EventCode=4769 service LIKE "cifs/*" user!="*admin*" | stats count by user, src | sort - count | head 20',
      sigma: 'win_ms14_068_forged_pac (custom)',
      win_event_ids: [4768, 4769],
    },
    mitigacion: [
      'Parchear los DCs (KB3011780 y acumulativos): el bug murió en Nov-2014, no hay excusa',
      'Inventariar dominios legacy/OT y verificar nivel de parcheo de TODOS los KDC (el dominio es tan fuerte como su DC más viejo)',
      'Si se detecta: reset de krbtgt y de las cuentas usadas (los tickets forjados valen hasta expirar)',
      'Monitoreo de TGS de cuentas normales hacia servicios de DC en dominios de riesgo',
    ],
    referencias: ['https://msrc.microsoft.com/update-guide/vulnerability/CVE-2014-6324', 'https://adsecurity.org/?p=525', 'https://github.com/bidord/pykek'],
  },
  {
    id: 'IAM-002',
    nombre: 'Kerberos Bronze Bit (CVE-2020-17049)',
    alias: ['Bronze Bit', 'forwardable flag forgery', 'CVE-2020-17049'],
    categoria: 'IAM',
    severidad: 'High',
    cve_ejemplo: ['CVE-2020-17049'],
    mitre_attack: ['T1558'],
    descripcion_tecnica: 'El flag "forwardable" del ticket viaja cifrado con la CLAVE DEL SERVICIO, no del KDC: un atacante que controla la clave de una cuenta de servicio (hash robado de un servicio cualquiera) puede re-emitir un ticket NO forwardable como forwardable sin que el KDC lo detecte. Con ese ticket forjado, un servidor con delegación restringida clásica (S4U2Proxy) aceptará autenticar a usuarios que NUNCA delegarían (incl. cuentas protegidas: "This account is sensitive and cannot be delegated" se salta, porque el flag viaja como legítimo).',
    impacto_iam_soc: 'Rompe el último refugio de la delegación restringida cuando ya se creía mitigada: la marca "sensitive account" deja de proteger si el hash del servicio cayó. Detectable por correlación, no por firma: S4U2Proxy exitoso (4769 con transited/extended Key Usage de delegación) hacia servicios que la cuenta sensible nunca usó, y por el parcheo (Nov-2020) de TODOS los servidores que corren Kerberos.',
    como_funciona: [
      'Obtener el hash NT de una cuenta de servicio con delegación restringida (dump de LSASS o NTDS.dit de un DC)',
      'Tomar un ticket de servicio NO forwardable (el que la víctima usaría normalmente) y re-firmarlo como forwardable con la clave del servicio',
      'Presentarlo al servidor con S4U2Proxy: el servidor pide un ticket "en nombre de" la cuenta protegida y el dominio lo emite',
      'El servidor ahora actúa como la cuenta sensible (caja, HR, DA) sin que aparezca login interactivo de esa cuenta',
    ],
    deteccion: {
      kql: 'SecurityEvent | where EventID == 4769 and TicketOptions == 0x40810000 // delegación; cazar S4U hacia cuentas marcadas "sensitive" desde servidores con delegación restringida + revisar parche Nov-2020 en servers',
      spl: 'index=win EventCode=4769 ticket_options="0x40810000" | stats count by user, service, src | where user IN (sensitive_accounts)',
      sigma: 'kerberos_bronze_bit_s4u_sensitive (custom)',
      win_event_ids: [4769],
    },
    mitigacion: [
      'Parchear Nov-2020 (CVE-2020-17049) en TODOS los hosts que aceptan Kerberos, no solo DCs: el flag se valida donde se consume',
      'Tratar los hashes de cuentas de servicio como Tier-0: un hash cualquiera con S4U abre la puerta (LSASS protegido, gMSA donde aplique)',
      'Reducir la superficie: eliminar delegación restringida clásica en favor de RBCD con accounts sensibles, o mejor: recursos sin delegación',
      'Alertar S4U2Proxy hacia cuentas protegidas/sensibles — por diseño no deberían aparecer JAMÁS ahí',
    ],
    referencias: ['https://msrc.microsoft.com/update-guide/vulnerability/CVE-2020-17049', 'https://www.semperis.com/blog/kerberos-bronze-bit-attack/', 'https://adsecurity.org/?p=4116'],
  },
  /* ===================== EXTRACCIÓN AT-REST ===================== */
  {
    id: 'IAM-003',
    nombre: 'Extracción de SAM / LSA / NTDS.dit',
    alias: ['hashdump', 'SAM dump', 'NTDS.dit dump', 'IFM abuse'],
    categoria: 'IAM',
    severidad: 'Critical',
    mitre_attack: ['T1003.002', 'T1003.003', 'T1003.004'],
    descripcion_tecnica: 'Los secretos no solo viven en LSASS: SAM (hashes de cuentas locales), SECURITY (LSA secrets: contraseñas de servicios, de cuentas de máquina, DPAPI de sistema y logons cacheados) y NTDS.dit (la base de AD: TODOS los hashes del dominio incl. krbtgt e historial). Vías de extracción: volumen de sombra (vssadmin/diskshadow), copia ESE (esentutl), paquete IFM de ntdsutil, reg save o directamente el disco/backups robados. Distinto del volcado en memoria de LSASS (en Vulnerabilidades): aquí el material se lee EN REPOSO de disco/backup.',
    impacto_iam_soc: 'Un NTDS.dit es el dominio entero en un fichero: se saca en minutos y se parsea offline. Los IFM y los backups de DC son NTDS.dit con otro nombre (y nadie los cifra aparte). Detección: 4688 con vssadmin/ntdsutil/esentutl/diskshadow/reg en hosts donde no corresponden, y creación de shadow copies fuera de ventanas de backup.',
    como_funciona: ['vssadmin create shadow /for=C: → copiar \\\\?\\GLOBALROOT\\Device\\HarddiskVolumeShadowCopyN\\windows\\ntds\\ntds.dit y SYSTEM', 'ntdsutil "ac i ntds" "ifm" "create full C:\\temp" — el paquete IFM arrastra ntds.dit + SYSTEM legibles', 'reg.exe save HKLM\\SAM sam.bin / reg.exe save HKLM\\SECURITY security.bin (+ SYSTEM para la bootkey)', 'Parse offline: secretsdump.py -system SYSTEM -ntds ntds.dit LOCAL / pypykatz o mimikatz lsadump::sam /lsa /ntds'],
    deteccion: {
      kql: 'DeviceProcessEvents | where FileName in ("vssadmin.exe", "ntdsutil.exe", "esentutl.exe", "diskshadow.exe", "reg.exe") and ProcessCommandLine has_any ("shadow", "ifm", "save hklm", "create full") | project TimeGenerated, DeviceName, FileName, ProcessCommandLine // solo DCs/admins legit: correlar con ventanas de backup',
      spl: 'index=win EventCode=4688 (process="*vssadmin*" OR process="*ntdsutil*" OR process="*esentutl*" OR process="*diskshadow*") (process="*shadow*" OR process="*ifm*" OR process="*ntds*") | stats count by src, host, process',
      sigma: 'win_susp_shadow_copy_creation (custom)',
      win_event_ids: [4688],
    },
    mitigacion: [
      'ASR/AppLocker: vssadmin, ntdsutil, diskshadow y esentutl solo para administradores con justificación',
      'Proteger los backups e IFM de DC como Tier-0 (cifrado, acceso restringido, inventario): son NTDS.dit de facto',
      'Command-line auditing (4688) en DCs/servidores + EDR con detección de dumping',
      'Si NTDS.dit sale: reset doble de krbtgt y rotación masiva de cuentas privilegiadas (asumir dominio comprometido)',
    ],
    referencias: ['https://attack.mitre.org/techniques/T1003/', 'https://en.hackndo.com/ntds-dumping/'],
  },
  /* ===================== RECON / CAPTURA ===================== */
  {
    id: 'IAM-004',
    nombre: 'Recon de Active Directory (BloodHound / SharpHound)',
    alias: ['BloodHound', 'SharpHound', 'AD graph recon', 'BloodHound.py'],
    categoria: 'IAM',
    severidad: 'Medium',
    mitre_attack: ['T1087.002'],
    descripcion_tecnica: 'El AD es un grafo: BloodHound lo recorre por LDAP (usuarios, grupos, ACLs, GPOs, trusts, delegaciones, SPNs), enumera sesiones y admins locales por RPC, y calcula RUTAS de escalada (quién llega a Domain Admins, por qué eslabón: ACL, delegación, sesión, kerberoast). SharpHound (Windows) y BloodHound.py (Linux) son los colectores; el grafo se analiza offline. Es el mapa con el que se planifica todo lo demás.',
    impacto_iam_soc: 'Por sí solo no rompe nada, pero es el prerequisito de casi toda escalada moderna y delata fase de reconocimiento: picos de queries LDAP (evento 1644 si se habilita LDAP query logging), 4662 masivo y procesos SharpHound/BloodHound en estaciones (4688/Sysmon 1). Cualquier usuario autenticado es un colector potencial — el que LLAMA la atención es el VOLUMEN.',
    como_funciona: ['Autenticado como cualquier usuario del dominio: SharpHound --CollectionMethods All (o BloodHound.py -c All desde Linux)', 'Recolección LDAP masiva: usuarios, grupos, ACLs, SPNs, trusts, delegaciones, GPOs (4662/1644 a raudales)', 'Sesiones y admins locales: RPC contra hosts (net sessions, localgroup) para saber "quién está logueado dónde"', 'Análisis offline del grafo: rutas más cortas a DA, cuentas kerberoasteables, AS-REPs, targets de RBCD/delegación'],
    deteccion: {
      kql: 'SecurityEvent | where EventID == 1644 | summarize cnt=count() by SubjectUserName, bin(TimeGenerated, 5m) | where cnt > 500 // + 4688/Sysmon 1 con "sharphound"/"bloodhound" en cmdline y 4662 en picos',
      spl: 'index=win EventCode=1644 | stats count by src, user | where count > 500 | sort - count',
      sigma: 'win_sharphound_collection (custom)',
      win_event_ids: [1644, 4688, 4662],
    },
    mitigacion: [
      'Attack path hygiene continua: correr BloodHound en modo auditoría y CERRAR las rutas propias antes que el atacante',
      'Habilitar el evento 1644 (LDAP query logging: Field Engineering/Directory Service) y alertar por volumen por usuario',
      'ASR/AppLocker contra binarios no firmados (SharpHound.exe) y PowerShell en Constrained Language Mode',
      'Reducción de atributos legibles por usuarios normales y restricción de la enumeración de sesiones por RPC (hardening de niveles SAMR/netlogon)',
    ],
    referencias: ['https://attack.mitre.org/techniques/T1087/002/', 'https://github.com/BloodHoundAD/BloodHound'],
  },
  {
    id: 'IAM-005',
    nombre: 'Keylogging',
    alias: ['keylogger', 'captura de teclado', 'keystroke logging'],
    categoria: 'IAM',
    severidad: 'High',
    mitre_attack: ['T1056.001'],
    descripcion_tecnica: 'Captura de pulsaciones en el endpoint: hooks de user32 (SetWindowsHookEx), polling de GetAsyncKeyState, drivers de teclado (kernel/BYOVD) o hardware USB entre teclado y PC; en el navegador, form-grabbing de JavaScript inyectado. Objetivo directo: contraseñas tecleadas, respuestas de seguridad y OTP TOTP de 6 dígitos — que valen 30s, justo la ventana del replay automático.',
    impacto_iam_soc: 'Password y MFA del mismo golpe, con la víctima tecleando de verdad: no hay eventos de auth anómalos hasta que el replay ocurre (y este puede venir de otra IP). La detección es de endpoint (hooks raros, drivers no firmados, procesos con ventanas de login enfocadas) o del patrón del replay posterior (impossible travel, UA nuevo).',
    como_funciona: ['Compromiso del host y despliegue del keylogger: hook de user32 (fácil de detectar), driver kernel (BYOVD, difícil) o hardware', 'Captura de pulsaciones (buffer local o stream al C2; a veces screenshots al detectar ventanas de login)', 'Parsing de credenciales: campos de password por título de ventana y OTP de 6 dígitos para replay inmediato', 'Replay del TOTP dentro de su ventana de validez + contraseña en el portal objetivo (o envío al C2 para uso manual)'],
    deteccion: {
      kql: 'DeviceDriverEvents | where InitiatingProcessFileName !in ("TrustedInstaller.exe", "TiWorker.exe") | take 20 // drivers de teclado/entrada nuevos = kernel keylogger; + EDR: SetWindowsHookEx de procesos no firmados',
      spl: 'index=sysmon EventCode=6 | search driver_image!="C:\\\\Windows\\\\*" | stats count by host, driver_image',
      sigma: 'sysmon_driver_load_unsigned_keylogger (custom)',
    },
    mitigacion: [
      'Password managers (la contraseña no se teclea) y FIDO2/passkeys: no hay OTP ni secret que capturar por teclado',
      'WDAC/AppLocker + EDR con detección de hooks y blocklist de drivers vulnerables (BYOVD)',
      'PAWs para tareas sensibles (estación dedicada, sin browsing ni email) y control físico del entorno de trabajo crítico',
      'Detección de replay server-side: OTP de un solo uso real (anti-replay) y binding de sesión a dispositivo',
    ],
    referencias: ['https://attack.mitre.org/techniques/T1056/001/', 'https://en.wikipedia.org/wiki/Keystroke_logging'],
  },
  /* ===================== PHISHING DE FLUJOS OAUTH ===================== */
  {
    id: 'IAM-006',
    nombre: 'Phishing de código de dispositivo',
    alias: ['device code phishing', 'device code flow phishing', 'devicelogin phishing'],
    categoria: 'IAM',
    severidad: 'High',
    mitre_attack: ['T1528'],
    descripcion_tecnica: 'El device code flow existe para aparatos sin teclado (TV, consola, IoT): Entra muestra un código corto (XXXX-XXXX) y la víctima lo valida en microsoft.com/devicelogin. El ataque: el ATACANTE inicia el flujo con el client_id de una app legítima (Teams, OneDrive, Graph) y phishea el código: "entre en microsoft.com/devicelogin y escriba XYZ-1234 para validar su cuenta". La víctima se autentica con password+MFA en la web REAL de Microsoft… y el flujo del atacante (que estaba haciendo polling) recibe los tokens. Diferencia clave: no hay app maliciosa ni consentimiento — se secuestra el flujo de una app legítima (el consent phishing vive en Vulnerabilidades).',
    impacto_iam_soc: 'Cero dominios falsos y cero contraseña robada en tránsito: la víctima solo interactúa con microsoft.com (el phishing es un código y una instrucción). El token llega al atacante con MFA ya satisfecho. Detectable: sign-ins con AuthenticationProtocol=deviceCode fuera de los flujos de consola esperados del tenant.',
    como_funciona: ['Iniciar device code flow contra Entra con client_id de app legítima y scopes amplios (offline_access incluido)', 'Phishing del código por email/chat/QR: "valide su cuenta en https://microsoft.com/devicelogin con el código XYZ-1234"', 'La víctima se autentica en la web real de Microsoft (password + MFA) y aprueba el "dispositivo"', 'El atacante (polling /token) recibe access + refresh tokens de la cuenta de la víctima'],
    deteccion: {
      kql: 'SigninLogs | where AuthenticationProtocol == "deviceCode" | project TimeGenerated, UserPrincipalName, IPAddress, AppId | take 20 // baseline por tenant: solo esperable en consolas/IoT; el resto es phishing',
      spl: 'index=sso sourcetype=entra authentication_protocol=devicecode | stats count by user, app, src',
      sigma: 'entra_device_code_signin_anomaly (custom)',
    },
    mitigacion: [
      'Conditional Access / políticas de tenant que bloqueen el device code flow donde no se use realmente',
      'Educación: Microsoft nunca pide "validar un código" por email/chat — señalar el patrón de la instrucción',
      'Post-phishing: revocar refresh tokens del usuario y revisar grants de la app implicada',
      'Baseline de sign-ins deviceCode (usuarios, IPs, apps) y alerta de desviaciones',
    ],
    referencias: ['https://attack.mitre.org/techniques/T1528/', 'https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-device-code'],
  },
  /* ===================== CLOUD / ENTRA ID ===================== */
  {
    id: 'IAM-007',
    nombre: 'Robo de Primary Refresh Token (Entra ID)',
    alias: ['PRT theft', 'cloud pass-the-hash', 'PRT replay'],
    categoria: 'IAM',
    severidad: 'High',
    mitre_attack: ['T1550'],
    descripcion_tecnica: 'El PRT es la credencial de sesión de largo plazo del dispositivo en Entra (SSO silencioso durante días). Un atacante con SYSTEM en un host Entra-joined/híbrido puede robar el PRT y su clave de sesión (AADInternals, ROADtoken/ROADtools) y fabricar el cookie de sesión firmado con esa clave: SSO completo como el usuario desde CUALQUIER máquina, con el deviceId del host víctima. Es el "pass-the-hash de la nube": Conditional Access basado en "dispositivo compliant" queda satisfecho por material robado.',
    impacto_iam_soc: 'Sesión de dispositivo replicada fuera del host: los sign-ins resultan NO interactivos (AADNonInteractiveUserSignInLogs) con deviceId conocido desde IP desconocida. Señal de contexto, no de auth. Es la escalada natural tras SYSTEM en un portátil corporativo: de workstation a identidad cloud completa.',
    como_funciona: ['SYSTEM en un dispositivo Entra joined/hybrid: robo del PRT y su session key (AADInternals o ROADtoken en el host)', 'Fabricar el cookie de sesión de Entra firmando con la clave del PRT (ROADtoken genera el cookie usable en el navegador del atacante)', 'Replay: SSO total a M365/Graph como el usuario; CA de "compliant device" superado (el deviceId es real)', 'Persistencia mientras el PRT siga vigente: renovaciones silenciosas hasta revocación del dispositivo/sesión'],
    deteccion: {
      kql: 'AADNonInteractiveUserSignInLogs | where ResultType == 0 | summarize cnt=count() by UserPrincipalName, IPAddress, DeviceId | where IPAddress !in (corp_ranges) // PRT usado desde fuera de la red/ubicación del dispositivo: deviceId conocido, IP nueva',
      spl: 'index=entra sourcetype=aad:noninteractive result=success | stats count by user, src, deviceid | where src NOT IN (corp_ranges)',
      sigma: 'entra_prt_noninteractive_outside_network (custom)',
    },
    mitigacion: [
      'Hardware-backed: PRT y claves Hello for Business en TPM (sin fallback software) — el material robado no sirve',
      'Atacar el prerequisito: endurecer endpoints (EDR, WDAC, parches) porque el robo exige SYSTEM en el dispositivo',
      'Conditional Access multicapa: no confiar SOLO en "compliant device" (riesgo, ubicación, MFA para apps críticas)',
      'Respuesta: revocar sesiones y re-registrar el dispositivo; monitor de non-interactive sign-ins por deviceId↔IP',
    ],
    referencias: ['https://attack.mitre.org/techniques/T1550/', 'https://learn.microsoft.com/en-us/entra/identity/devices/concept-primary-refresh-token', 'https://github.com/dirkjanm/ROADtools'],
  },
  {
    id: 'IAM-008',
    nombre: 'Registro fraudulento de dispositivos (Entra device registration)',
    alias: ['device registration abuse', 'trusted device abuse', 'compliant device spoofing', 'device trust hijacking'],
    categoria: 'IAM',
    severidad: 'High',
    mitre_attack: ['T1098'],
    descripcion_tecnica: 'Las políticas de Conditional Access que confían en "dispositivo registrado/compliant/hybrid joined" dan por hecho que el dispositivo lo controla la empresa. El ataque: con credenciales robadas (phishing + MFA push aprobado, o el token de un device code flow), el atacante REGISTRA su propio dispositivo en el tenant (o re-registra uno) desde una IP residencial. El nuevo deviceId satisface las CA basadas en dispositivo y las opciones "remember MFA on this device" — a partir de ahí, la sesión del atacante es un "dispositivo de confianza" legítimo a todos los efectos.',
    impacto_iam_soc: 'Blinda la persistencia del atacante: la CA que exigía "compliant device" ya no molesta, el MFA se recuerda y el triaje ve un deviceId nuevo (atribuible a "portátil nuevo del usuario") en vez de una IP rara. Señales: registro de dispositivo desde ASN/geo nuevo, deviceId sin historia previa de management, y MDM que nunca lo ve reportar.',
    como_funciona: ['Credenciales + MFA satisfecho del usuario (phishing con relay de OTP o device code flow)', 'Registrar el dispositivo del atacante en Entra (Settings → Accounts → Access work or school → Join) o via API con el token robado', 'El deviceId entra al anillo de confianza: CA de "registered/compliant device" satisfecha y MFA recordado en ese device', 'Persistencia: mientras el dispositivo exista en el tenant, el atacante re-auth como el usuario sin volver a phishear'],
    deteccion: {
      kql: 'AuditLogs | where OperationName in~ ("Add device", "Register device", "Update device") and not(InitiatedBy contains "sync") | project TimeGenerated, OperationName, TargetResources, InitiatedBy | take 20 // correlar: deviceId NUEVO + primer uso desde IP/ASN no corporativo y ausencia de gestión MDM posterior',
      spl: 'index=entra sourcetype=entra:audit operation IN ("Add device", "Register device") | stats count by user, src_ip, _time | sort -_time',
      sigma: 'entra_device_registration_from_unmanaged_context (custom)',
    },
    mitigacion: [
      'Registro de dispositivos restringido: quién puede unir dispositivos (Set-MsolCompanySettings / Entra admin) y require MFA en el join',
      'CA multicapa: "compliant device" NO como único requisito — combinar con riesgo de sesión, ubicación y re-autenticación periódica',
      'MDM obligatorio con grace period: un deviceId registrado que nunca se inscribe a management = alerta automática',
      'Remediación: Disable/eliminar el dispositivo, revocar refresh tokens y forzar re-registro legítimo del usuario',
    ],
    referencias: ['https://attack.mitre.org/techniques/T1098/', 'https://learn.microsoft.com/en-us/entra/identity/devices/concept-azure-ad-join', 'https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-token-protection'],
  },
  /* ===================== PLANIFICADORES DE ENDPOINT (SCCM / INTUNE) ===================== */
  {
    id: 'IAM-009',
    nombre: 'Abuso de SCCM / MECM ( jerarquía de gestión)',
    alias: ['SCCM abuse', 'MECM abuse', 'ConfigMgr hierarchy takeover', 'CMPivot abuse', 'client push hash grab'],
    categoria: 'IAM',
    severidad: 'Critical',
    mitre_attack: [],
    descripcion_tecnica: 'SCCM (Microsoft Configuration Manager) ejecuta código en TODO el parque gestionado: sus credenciales y roles son equivalentes a Tier-0. Vectores documentados: el client push installation account (el hash NT se puede capturar por SMB al forzar una reinstalación), boot media/PXE con variables de tarea en claro (passwords de domain join y cuentas de red en los BCD/variables), policy retrieval con la cuenta de MÁQUINA de un host comprometido (que en jerarquías laxas puede leer/actuar sobre la distribución), y el camino final: derechos de "Full Administrator" en la consola → CMPivot o Application deployment = SYSTEM en miles de equipos con dos clics.',
    impacto_iam_soc: 'SCCM casi nunca está en el modelo de tiering: la jerarquía es un dominio paralelo invisible para el SOC (los logs viven en SQL/MECM, no en el SIEM). Un atacante con la consola despliega lo que quiera firmado por la propia infraestructura de gestión. Detección: los logs MECM (SMSProv/Site server) correlados con 4688/analytics de cambios de aplicación, y la CTA de hash-grab: conexiones SMB hacia hosts no-SCCM desde el site server.',
    como_funciona: [
      'Enumerar el sitio: sites/DP/CAs desde cualquier host (AD publica el container System Management); kits: SCCMHunter, Misconfiguration Manager',
      'Hash grab: forzar client push hacia el atacante (responder captura el hash NT del client push account) o leer variables PXE/boot media (UserStateMigrationTool/SCCM TsBootShell — passwords en claro)',
      'Con cuenta de máquina de host gestionado (jerarquía laxa): leer polícies y firmar contenido de la carpeta de distribución',
      'Con la consola (Full Administrator): CMPivot corre consultas/ejecución como SYSTEM en cada colección; Win32 app/Script deployment entrega el payload del atacante al parque entero',
    ],
    deteccion: {
      kql: 'DeviceProcessEvents | where FileName in~ ("CcmExec.exe", "TsBootShell.exe") or ProcessCommandLine has_any ("Invoke-CMPivot", "New-CMApplication", "Start-CMDistribution") | take 20 // + SMB (5145) desde el site server hacia hosts atípicos = client push grab; correlar cambios de aplicaciones en el feed MECM con tickets',
      spl: 'index=win (EventCode=5145 OR EventCode=4688) | search "SCCM" OR "ccmsetup" OR "TsBootShell" | stats count by host, src, process | head 30',
      sigma: 'sccm_hierarchy_abuse_indicators (custom)',
      win_event_ids: [4688, 5145],
    },
    mitigacion: [
      'Tratar la jerarquía SCCM como Tier-0: site server y consolas aisladas, cuentas del sitio con tiering, y "Full Administrator" reducido al mínimo',
      'Client push: deshabilitar el fallback o usar una cuenta sin privilegios + bloquear NTLM desde/hacia el site server (EBP/signing) — PXE protegido con password y variables cifradas',
      'Enhanced HTTP / PKI para la comunicación del sitio y bitlocker+cred SSP endurecido en boot media',
      'Logs MECM al SIEM (site server, SMS Provider, CMPivot) y alerta de despliegues nuevos fuera de ventana de cambio',
    ],
    referencias: ['https://github.com/subat0mik/Misconfiguration-Manager', 'https://posts.specterops.io/abusing-sccm-690ab5e32937', 'https://web.specterops.io/assets/resources/SpecterOps-Attack-and-Defense-with-SCCM.pdf'],
  },
  {
    id: 'IAM-010',
    nombre: 'Abuso de Intune / Endpoint Manager',
    alias: ['Intune abuse', 'Windows Intune PowerShell as SYSTEM', 'rogue enrollment', 'Win32 app deployment abuse'],
    categoria: 'IAM',
    severidad: 'High',
    mitre_attack: [],
    descripcion_tecnica: 'Intune es el "SCCM de la nube": quien lo administra despliega scripts y aplicaciones como SYSTEM/Tácticas de admin en dispositivos gestionados. Vectores: credenciales de un Intune Administrator (phishing, token de consola robado) → Win32 app o PowerShell script upload (IntuneManagementExtension lo ejecuta como SYSTEM en los dispositivos objetivo); rogue enrollment de dispositivos con credenciales de usuario (el dispositivo del atacante entra al management y recibe —y bypasea— las políticas); y abuso de Compliance/CA: el dispositivo enrolado cuenta como "managed/compliant" para Conditional Access.',
    impacto_iam_soc: 'Doble filo: ejecución SYSTEM remota firmada por tu propia plataforma MDM + un dispositivo del atacante que queda dentro del perímetro lógico (recibe perfiles, certificados y Wi-Fi). El SOC debe vigilar los operational logs de Intune (deployments nuevos, enrollment desde ASNs no corporativos) — casi nunca se ingieren. El enrollment fraudulento es la versión cloud del "portátil no gestionado que parece gestionado".',
    como_funciona: [
      'Acceso admin: credenciales/token de Intune Administrator (phishing de código de dispositivo es suficiente) o rol equivalente por privilege escalation en el tenant',
      'Desplegar payload: Windows PowerShell Scripts o Win32 app (intunewin) que IntuneManagementExtension ejecuta como SYSTEM en la colección objetivo',
      'Rogue enrollment: el atacante enrola su equipo con las credenciales del usuario → recibe certificados/perfiles corporativos y "managed device" para CA',
      'Persistencia: el script/app se re-instala por política; el dispositivo enrolado sigue contando como compliant mientras nadie lo purgue',
    ],
    deteccion: {
      kql: 'DeviceManagementScripts // [Intune operational logs vía Graph: deviceManagement.deviceManagementScripts y mobileApps] — alerta de scripts/apps NUEVOS sin ticket + AuditLogs Category "DeviceConfiguration" | project TimeGenerated, OperationName, InitiatedBy | take 20 // enrollment: AuditLogs "Enroll" + deviceId sin historia MDM',
      spl: 'index=intune sourcetype=intune:audit operation IN ("Create", "Update", "Assign") | stats count by object_type, actor, _time | sort -_time',
      sigma: 'intune_new_deployment_without_change_record (custom)',
    },
    mitigacion: [
      'PIM/JIT para Intune Administrator (sin admins permanentes) + MFA fuerte y token protection para el acceso a la consola/Graph',
      'Separación: quien gestiona Intune no puede firmar código, y los despliegues requieren approval workflow/ventana de cambio',
      'Monitoreo: ingesta de Intune audit logs al SIEM con alerta de scripts/apps nuevos y enrollments desde ASN/geo fuera de patrón',
      'Remediación: retirar el dispositivo enrolado, revocar tokens de sesión del admin y auditar qué ejecutó el script (timeline por deviceId)',
    ],
    referencias: ['https://learn.microsoft.com/en-us/mem/intune/fundamentals/monitor-audit-logs', 'https://attack.mitre.org/groups/G0046/'],
  },
  /* ===================== AD: OBJETOS BORRADOS ===================== */
  {
    id: 'IAM-011',
    nombre: 'Abuso del AD Recycle Bin (reanimación de objetos)',
    alias: ['AD object reanimation', 'restore deleted admin', 'revive deleted account', 'recycle bin abuse'],
    categoria: 'IAM',
    severidad: 'Medium',
    mitre_attack: ['T1078'],
    descripcion_tecnica: 'Con AD Recycle Bin activado, los objetos borrados (180 días por defecto) conservan membresías y atributos: un atacante con derechos de restore (tipicamente admins de AD o delegación laxa sobre OU) puede REANIMAR una cuenta privilegiada borrada — p. ej. la del admin que se fue hace 3 meses — y la cuenta vuelve con sus grupos intactos y una contraseña que se puede resetear a placer. El governance de JML asume que "borrado = fuera": el Recycle Bin es el detrás-cámara que mantiene el escenario vivo.',
    impacto_iam_soc: 'Persistencia sigilosa post-offboarding: la cuenta reanimada aparece como "nueva" para la organización pero con SID/membresías de la vieja — y si había SID History, también. Detección específica: el restore genera 5136 con cambio de isDeleted y atributos "restored" (lastKnownParent), pero casi nadie alerta reanimaciones: el evento parece un cambio de atributo cualquiera.',
    como_funciona: [
      'Identificar candidatos: Get-ADObject -Filter {isDeleted -eq $true -and ObjectClass -eq "user"} -IncludeDeletedObjects (con -Properties lastKnownParent, memberOf)',
      'Elegir una cuenta privilegiada borrada (ex-admin, cuenta de servicio con membresías fuertes) aún dentro de la ventana de 180 días',
      'Restore: Get-ADObject <GUID> | Restore-ADObject — vuelve con sus grupos; reset de contraseña y activación',
      'Login como la cuenta reanimada: para el governance es un fantasma que nadie deshabilita porque "ya no existe" en la HR ni en el JML',
    ],
    deteccion: {
      kql: 'SecurityEvent | where EventID == 5136 | extend AttributeValue = tostring(AttributeValue) | where AttributeLDAPDisplayName in~ ("isDeleted") and AttributeValue == "FALSE" | project TimeGenerated, SubjectUserName, ObjectDN // reanimación: isDeleted pasa a FALSE; correlar con cuentas fuera de JML y reset de password posterior',
      spl: 'index=win EventCode=5136 | search "isDeleted" | table _time, src_user, object_dn | head 20',
      sigma: 'ad_deleted_object_restored (custom)',
      win_event_ids: [5136, 4724],
    },
    mitigacion: [
      'Reducir la ventana del Recycle Bin a lo que la operación exija (msDS-DeletedObjectLifetime) y auditárla como objeto vivo',
      'Alertar toda reanimación (5136 isDeleted=FALSE) y tratarla como excepción con ticket: fuera de JML = incidente',
      'Al hacer offboarding de cuentas privilegiadas: strip de membresías ANTES del borrado (la reanimación recupera los grupos que tenía al morir)',
      'Revisar delegación de restore rights: solo Domain Admins / delegados explícitos, nunca administradores de OU por defecto',
    ],
    referencias: ['https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/adac/introduction-to-active-directory-administrative-center--level-100-', 'https://attack.mitre.org/techniques/T1078/'],
  },
  /* ===================== FRAUDE EN EXPORTACIONES ===================== */
  {
    id: 'IAM-012',
    nombre: 'Inyección CSV / de fórmulas (CSV injection)',
    alias: ['CSV injection', 'formula injection', 'Excel injection', 'command injection en hojas de cálculo'],
    categoria: 'IAM',
    severidad: 'Medium',
    mitre_attack: ['T1204.002'],
    descripcion_tecnica: 'Las consolas IAM/SOC exportan listas a CSV que los analistas abren en Excel: cualquier CAMPO controlable (nombre de usuario, display name, subject de un correo, comentario de un grupo, hasta el nombre de un IoC) puede contener una fórmula (=cmd|\' /C calc\'!A1, =HYPERLINK, =WEBSERVICE) o un payload DDE. El analista abre la exportación de "usuarios con MFA pendiente" y Excel ejecuta el payload del atacante que previamente seteó su display name en Entra/AD a "=2+5|cmd...". El atacante siembra el campo sabiendo que alguien lo exportará y abrirá con Excel en el equipo con acceso a las consolas.',
    impacto_iam_soc: 'Sigue la cadena "atacante escribe → sistema almacena → analista ejecuta": la exportación es el delivery y Excel el detonador (warning de Excel = el último control y casi nadie lo lee). Detección: preventiva en el pipeline (escanear exports por celdas que empiecen por =, +, -, @, tab) y de detonación (proceso excel → cmd/powershell con padre sospechoso).',
    como_funciona: [
      'Siembra: el atacante pone fórmulas en campos de perfil bajo su control (display name de Entra, subject de mails que llegarán al reporte, comentario LDAP, nombre de archivo compartido)',
      'Trigger: un admin/analista exporta el informe (usuarios, correos cuarentena, members de grupo) a CSV/Excel desde la consola IAM o el SIEM',
      'Detonación: al abrir, Excel evalúa las celdas: =cmd ejecuta comandos, =WEBSERVICE/DDE exfiltra datos (el token de la víctima viaja en la URL de la fórmula), =HYPERLINK phishea al analista',
      'Impacto: código en la estación del ADMIN (la de acceso a consolas), no en la del usuario: salto de privilegio del lado del defensor',
    ],
    deteccion: {
      kql: 'DeviceProcessEvents | where FileName in~ ("excel.exe") and InitiatingProcessFileName in~ ("excel.exe") | where ProcessCommandLine has_any ("cmd", "powershell", "mshta", "rundll32") | take 20 // hijo de Excel ejecutando intérprete = fórmula DDE/cmd detonada; + exportación: procesos de browser descargando .csv seguidos de excel.exe abriéndolo',
      spl: 'index=win EventCode=4688 parent_process="*excel.exe" | search process IN ("*cmd.exe", "*powershell*", "*mshta*") | table _time, host, process, command_line',
      sigma: 'excel_child_process_formula_injection (custom)',
      win_event_ids: [4688],
    },
    mitigacion: [
      'Sanitizar TODA exportación server-side: prefijar celdas riesgosas con \x27 o bloquear =, +, -, @, tab iniciales (OWASP CSV Injection cheat sheet)',
      'Excel: bloquear DDE (reglas de GPO "DDE Policy") y deshabilitar la ejecución de fórmulas de archivos de confianza desconocida; usar visores de CSV que no evalúen nada',
      'Validación de campos de usuario (display name, comentarios): rechazar contenido que arranque con =, +, -, @ — es semántica de fórmula, no de nombre',
      'EDR alertando excel→cmd/powershell (regla base que todo EDR trae: habilitarla, no solo coleccionarla)',
    ],
    referencias: ['https://owasp.org/www-community/attacks/CSV_Injection', 'https://www.contextis.com/en/blog/comma-separated-vulnerabilities', 'https://attack.mitre.org/techniques/T1204/002/'],
  },
];
