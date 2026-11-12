/**
 * profileSeeds.ts — perfiles de CV sembrados de fábrica (R1).
 *
 * Contenido estático de los 3 perfiles multi-perfil que siembra
 * doInitializeDatabase (db/index.ts), extraído byte a byte de ahí — aquí
 * NO vive lógica, solo datos. Las guardas y el orden de siembra se
 * conservan en db/index.ts:
 *  · IAM ('profile-main')      — solo si la tabla profile está VACÍA.
 *  · HelpDesk ('profile-helpdesk-l1') — solo si la fila no existe y no
 *    está descartada (dismissal 'helpdeskProfile').
 *  · SysAdmin ('profile-sysadmin-jr') — solo si la fila no existe y no
 *    está descartada (dismissal 'sysadminProfile').
 *
 * createdAt/updatedAt se estampan en el momento del seeding (db/index.ts),
 * por eso las constantes son Omit<ProfileDoc, 'createdAt' | 'updatedAt'>.
 */
import type { ProfileDoc } from '../types';

/** CV seed del Perfil IAM (v17 — perfil principal de fábrica). */
export const IAM_SEED_PROFILE: Omit<ProfileDoc, 'createdAt' | 'updatedAt'> = {
  id: 'profile-main',
  name: 'Perfil IAM',
  fullName: '',
  headline: 'IAM Analyst | Identity & Access Management',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  portfolio: '',
  targetRoles: [
    'IAM Analyst',
    'Access Management Analyst',
    'Identity Analyst',
    'IAM Operations Analyst',
    'Identity & Access Governance Analyst',
    'Access Review Analyst',
    'Identity Lifecycle Analyst',
    'IAM Engineer (Jr)',
    'IT Security Analyst — IAM',
    'IAM Administrator',
  ],
  summary:
    'Analista de Identidades y Accesos (IAM) con dominio operativo del ciclo de vida de identidades ' +
    '(Joiner-Mover-Leaver), gobierno de accesos (RBAC, access reviews, mínimo privilegio y separación ' +
    'de funciones) y auditoría de los principales directorios e IdP del mercado: Active Directory, ' +
    'Microsoft Entra ID (Access Reviews, Sign-in logs, Enterprise Apps, Roles, PIM) y Okta Workforce. ' +
    'Gestión de tickets de acceso de extremo a extremo en ServiceNow con justificación, aprobación y ' +
    'evidencia. Automatización y análisis con PowerShell. Certificación Microsoft SC-300 en proceso. ' +
    'Español nativo e inglés B2+.',
  skills: [
    // CORE IAM — donde vive el analyst a diario
    { id: 'skl-ad-audit', name: 'Active Directory (ADUC) — auditoría de usuarios, grupos y admins', group: 'Core IAM', status: 'Dominado', notes: 'Ver usuarios activos/inactivos, pertenencia a grupos, quién tiene admin. No instalarlo: auditarlo.' },
    { id: 'skl-entra', name: 'Entra ID — Access Reviews, Sign-in logs, Enterprise Apps, Roles, PIM', group: 'Core IAM', status: 'Dominado', notes: 'Pantallas clave del día a día para revisar accesos privilegiados.' },
    { id: 'skl-okta', name: 'Okta Workforce — reports, assignments, quién accede a qué app', group: 'Core IAM', status: 'Dominado' },
    { id: 'skl-jml', name: 'JML (Joiner-Mover-Leaver) — altas, bajas y cambios de puesto', group: 'Procesos IAM', status: 'Dominado', notes: 'El 60% del trabajo del analyst.' },
    { id: 'skl-rbac', name: 'RBAC — creación y mantenimiento de la matriz de roles', group: 'Procesos IAM', status: 'Dominado', notes: 'Qué puede ver Contabilidad vs TI vs Ventas.' },
    { id: 'skl-reviews', name: 'Access Reviews / Certificaciones — reporte, aprobación/revocación y evidencia', group: 'Procesos IAM', status: 'Dominado' },
    { id: 'skl-least-sod', name: 'Mínimo Privilegio + SoD — detección de conflictos (crear y aprobar pagos, etc.)', group: 'Procesos IAM', status: 'Dominado' },
    { id: 'skl-saml', name: 'SAML 2.0 — SSO y federación IdP/SP', group: 'Core IAM', status: 'En proceso' },
    { id: 'skl-oidc', name: 'OIDC / OAuth 2.0 — autorización moderna y tokens', group: 'Core IAM', status: 'En proceso' },
    { id: 'skl-scim', name: 'SCIM / SCIM Provisioning — aprovisionamiento automatizado', group: 'Core IAM', status: 'En proceso' },
    { id: 'skl-ca', name: 'Conditional Access — análisis de directivas (riesgo, dispositivo, MFA)', group: 'Core IAM', status: 'En proceso' },
    { id: 'skl-sspr', name: 'SSPR — autoservicio de restablecimiento de contraseña', group: 'Core IAM', status: 'En proceso' },
    { id: 'skl-iga-tools', name: 'IGA empresarial (SailPoint, Saviynt)', group: 'Core IAM', status: 'Por aprender' },
    { id: 'skl-pam-tools', name: 'PAM empresarial (CyberArk, BeyondTrust)', group: 'Core IAM', status: 'Por aprender' },
    { id: 'skl-cloud-iam', name: 'AWS IAM / GCP IAM', group: 'Core IAM', status: 'Por aprender' },
    // Técnico
    { id: 'skl-powershell', name: 'PowerShell — módulos AD y Microsoft Graph', group: 'Técnico', status: 'Dominado', notes: 'Reportes de usuarios/grupos y borrado masivo seguro.' },
    { id: 'skl-kql', name: 'KQL — consultas de logs en Microsoft Sentinel/Entra', group: 'Técnico', status: 'Por aprender' },
    { id: 'skl-sql', name: 'SQL — consultas para reportes de accesos', group: 'Técnico', status: 'Por aprender' },
    // Blandas
    { id: 'skl-doc', name: 'Documentación y evidencia de auditoría', group: 'Blandas', status: 'Dominado' },
    { id: 'skl-comms', name: 'Comunicación con managers y aprobadores', group: 'Blandas', status: 'Dominado' },
    { id: 'skl-detail', name: 'Atención al detalle y trazabilidad de tickets', group: 'Blandas', status: 'Dominado' },
  ],
  tools: [
    { id: 'pt-servicenow', name: 'ServiceNow (ITSM — tickets de acceso)', level: 'Avanzado', notes: 'Herramienta #1 del analyst: abrir, documentar y cerrar con justificación, aprobador y evidencia.' },
    { id: 'pt-powershell', name: 'PowerShell', level: 'Intermedio' },
    { id: 'pt-entra', name: 'Microsoft Entra ID (admin center)', level: 'Avanzado' },
    { id: 'pt-aduc', name: 'Active Directory — ADUC', level: 'Avanzado' },
    { id: 'pt-okta', name: 'Okta Workforce (admin console)', level: 'Avanzado' },
    { id: 'pt-excel', name: 'Excel (reportes de access reviews)', level: 'Intermedio' },
  ],
  experience: [],
  education: [],
  certifications: [
    { id: 'cert-sc300', name: 'SC-300 — Identity and Access Administrator', issuer: 'Microsoft', status: 'En proceso', notes: 'Certificación alineada 1:1 con el rol: JML, access reviews, governance.' },
  ],
  languages: [
    { id: 'lang-es', name: 'Español', level: 'Nativo' },
    { id: 'lang-en', name: 'Inglés', level: 'B2+' },
  ],
  projects: [
    { id: 'prj-vaultnotes', name: 'VaultNotes — segundo cerebro de ciberseguridad (PWA local-first)', description: 'Aplicación web offline-first con glosario IAM/SOC con flashcards de repetición espaciada, labs, análisis de IOCs, calculadora CVSS y backups automáticos a USB. Desarrollada para estudiar y aplicar IAM en la práctica.' },
  ],
  atsKeywords: [
    'IAM', 'Identity and Access Management', 'IAM Analyst', 'Access Management', 'JML', 'Joiner Mover Leaver',
    'Identity Lifecycle', 'RBAC', 'Access Reviews', 'Access Certifications', 'SoD', 'Segregation of Duties',
    'Least Privilege', 'SAML', 'OIDC', 'OAuth 2.0', 'SCIM', 'MFA', 'Conditional Access', 'SSPR', 'PIM',
    'Entra ID', 'Azure AD', 'Active Directory', 'ADUC', 'Okta', 'ServiceNow', 'PowerShell', 'IGA', 'PAM',
    'Identity Governance', 'Access Governance', 'SC-300', 'Identity Analyst', 'Zero Trust',
  ],
  jobSearchNotes:
    'Títulos objetivo: IAM Analyst / Access Management Analyst (ver lista). Buscar también: "Identity Analyst", ' +
    '"IAM Operations", "Access Governance". Portales: LinkedIn, Computrabajo, Indeed, empresa-empresa. ' +
    'Palabras clave probadas: "IAM", "identidades y accesos", "active directory", "entra id", "okta". ' +
    'La certificación SC-300 (en proceso) es el diferenciador principal para pasar filtros ATS.',
};

/** CV seed del Perfil HelpDesk L1 (v19 — coexistente con el IAM). */
export const HELPDESK_SEED_PROFILE: Omit<ProfileDoc, 'createdAt' | 'updatedAt'> = {
  id: 'profile-helpdesk-l1',
  name: 'Perfil HelpDesk L1 - Service Desk',
  fullName: '',
  headline: 'HelpDesk / IT Support Analyst — L1 Service Desk',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  portfolio: '',
  targetRoles: [
    'Help Desk Technician',
    'Help Desk Analyst',
    'Service Desk Analyst',
    'IT Support Analyst',
    'IT Support Technician',
    'Desktop Support Technician',
    'Desktop Support Analyst',
    'Technical Support Analyst',
    'IT Service Desk Technician',
    'Junior IT Support Analyst',
  ],
  summary:
    'Analista de Soporte Técnico (L1 Service Desk) con base sólida de troubleshooting estructurado ' +
    '(identificar → aislar → resolver → documentar), Windows 10/11, redes fundamentales (DNS, DHCP, VPN, ' +
    'Wi-Fi), Microsoft 365 (Outlook, Teams, OneDrive, licencias) y operativa de Active Directory/Entra ID ' +
    '(altas, bloqueos, grupos, MFA). Gestión de tickets con ITIL 4 (incidente vs solicitud, prioridad ' +
    'impacto × urgencia, SLA, escalamiento) y cultura de evidencia: cada cierre documentado para L2 y ' +
    'auditoría. En transición deliberada hacia IAM (ciclo de vida de identidades, accesos y gobierno). ' +
    'Español nativo e inglés B2+.',
  skills: [
    // Windows / Endpoint — el corazón del L1
    { id: 'sklhd-win', name: 'Windows 10/11 — instalación, updates, servicios, Event Viewer, perfiles', group: 'Windows / Endpoint', status: 'En proceso', notes: 'Diagnóstico del "equipo lento" y BSOD de primera respuesta.' },
    { id: 'sklhd-troubleshoot', name: 'Troubleshooting metodológico — identificar, reproducir, aislar, verificar, documentar', group: 'Windows / Endpoint', status: 'En proceso', notes: 'El método importa más que la solución puntual.' },
    { id: 'sklhd-hw', name: 'Hardware y periféricos — diagnóstico, docking, monitores, impresoras', group: 'Windows / Endpoint', status: 'En proceso' },
    // Redes
    { id: 'sklhd-net', name: 'Redes fundamentales — DNS, DHCP, VPN, Wi-Fi, puertos, diagnóstico con ping/nslookup/Test-NetConnection', group: 'Redes', status: 'En proceso' },
    // Microsoft 365
    { id: 'sklhd-m365', name: 'Microsoft 365 — Outlook, Teams, OneDrive, licencias, activación, Service Health', group: 'Microsoft 365', status: 'Por aprender' },
    // Identidad
    { id: 'sklhd-ad', name: 'Active Directory (operativa L1) — usuarios, grupos, bloqueos, resets delegados', group: 'Identidad', status: 'Por aprender', notes: 'Puente natural hacia IAM.' },
    { id: 'sklhd-entra', name: 'Entra ID fundamentals — MFA, SSPR, sign-in logs, estados de dispositivo', group: 'Identidad', status: 'Por aprender' },
    { id: 'sklhd-intune', name: 'Intune fundamentals — enrollment, compliance, Company Portal', group: 'Identidad', status: 'Por aprender' },
    // ITSM
    { id: 'sklhd-tickets', name: 'Gestión de tickets — triage, prioridad, categorización, escalamiento', group: 'ITSM', status: 'En proceso' },
    { id: 'sklhd-itil', name: 'ITIL 4 — incidente vs solicitud vs problema vs cambio, SLA/OLA, métricas (MTTA/MTTR/FCR/CSAT)', group: 'ITSM', status: 'En proceso' },
    { id: 'sklhd-powershell', name: 'PowerShell para soporte — Get-ADUser, Search-ADAccount, Get-WinEvent, Test-NetConnection', group: 'ITSM', status: 'Por aprender' },
    // Blandas / seguridad
    { id: 'sklhd-customer', name: 'Customer service técnico — empatía, lenguaje no técnico, gestión de expectativas', group: 'Blandas / Seguridad', status: 'En proceso' },
    { id: 'sklhd-doc', name: 'Documentación — tickets como evidencia, KB, traspasos de turno', group: 'Blandas / Seguridad', status: 'En proceso' },
    { id: 'sklhd-sec', name: 'Security awareness — phishing, vishing, verificación de identidad antes de resets', group: 'Blandas / Seguridad', status: 'En proceso', notes: 'El L1 es la primera barrera: saber cuándo NO resolver.' },
  ],
  tools: [
    { id: 'pthd-servicenow', name: 'ServiceNow / Jira SM / Zendesk (ITSM)', level: 'Intermedio', notes: 'Cualquier plataforma de tickets: el flujo (intake → triage → resolve → close) es el mismo.' },
    { id: 'pthd-aduc', name: 'Active Directory — ADUC', level: 'Intermedio' },
    { id: 'pthd-m365ac', name: 'Microsoft 365 admin center', level: 'Intermedio' },
    { id: 'pthd-entra', name: 'Microsoft Entra ID (admin center)', level: 'Básico' },
    { id: 'pthd-intune', name: 'Microsoft Intune', level: 'Básico' },
    { id: 'pthd-rdp', name: 'RDP / AnyDesk (soporte remoto)', level: 'Intermedio' },
    { id: 'pthd-outlook', name: 'Outlook / Teams / OneDrive (soporte de usuario final)', level: 'Intermedio' },
  ],
  experience: [],
  education: [],
  certifications: [
    { id: 'certhd-itil', name: 'ITIL 4 Foundation', issuer: 'AXELOS / PeopleCert', status: 'En proceso', notes: 'La certificación de entrada del service desk — vocabulario y marco.' },
    { id: 'certhd-aplus', name: 'CompTIA A+', issuer: 'CompTIA', status: 'Por aprender', notes: 'Hardware/Windows/redes fundamentales con sello verificable.' },
  ],
  languages: [
    { id: 'lang-es-hd', name: 'Español', level: 'Nativo' },
    { id: 'lang-en-hd', name: 'Inglés', level: 'B2+' },
  ],
  projects: [
    { id: 'prjhd-nexora', name: 'Proyecto Final VaultNotes — "primera semana" en el service desk de Nexora S.A. (simulado)', description: '30 tickets de punta a punta (triage, prioridad, troubleshooting, resolución/escalamiento y evidencia) + KB propia + informe de métricas. Práctica deliberada de L1 con foco en el puente hacia IAM.' },
    { id: 'prjhd-vaultnotes', name: 'VaultNotes — segundo cerebro de estudio (PWA local-first)', description: 'Glosario, roadmap, labs y flashcards de repaso espaciado — ahora con especialización HelpDesk/IT Support y transición a IAM.' },
  ],
  atsKeywords: [
    'Help Desk', 'Helpdesk', 'Service Desk', 'IT Support', 'Technical Support', 'Desktop Support',
    'IT Support Analyst', 'Service Desk Analyst', 'L1 Support', 'L2 Support', 'Tier 1', 'Tier 2',
    'ITIL 4', 'ITIL', 'ITSM', 'Incident Management', 'Service Request', 'SLA', 'OLA', 'Ticketing',
    'Troubleshooting', 'Ticket Resolution', 'Escalation', 'Customer Service', 'Customer Support',
    'Windows 10', 'Windows 11', 'Active Directory', 'AD', 'Entra ID', 'Azure AD', 'Microsoft 365',
    'Office 365', 'Outlook', 'Teams', 'OneDrive', 'SharePoint', 'Exchange Online', 'Intune',
    'Autopilot', 'PowerShell', 'DNS', 'DHCP', 'VPN', 'TCP/IP', 'Networking', 'RDP', 'Remote Support',
    'Password Reset', 'Account Lockout', 'MFA', 'SSPR', 'Imaging', 'Reimaging', 'Asset Management',
    'ServiceNow', 'Jira Service Management', 'Zendesk', 'Freshservice', 'CompTIA A+', 'ITIL Foundation',
  ],
  jobSearchNotes:
    'Títulos objetivo: Help Desk Analyst / IT Support Analyst / Service Desk Analyst (ver lista). ' +
    'Palabras clave probadas: "help desk", "soporte técnico", "service desk", "mesa de ayuda", "soporte TI". ' +
    'Portales: LinkedIn, Computrabajo, Indeed, empresa-empresa. Diferenciadores: ITIL 4 Foundation (en ' +
    'proceso), el proyecto final simulado de 30 tickets (prepáralo para contar en entrevistas) y la ' +
    'narrativa de transición L1 → L2 → IAM. Este perfil COEXISTE con el Perfil IAM: activa uno u otro ' +
    'según la vacante (el contenido de ambos se conserva).',
};

/** CV seed del Perfil SysAdmin Jr (v21 — coexistente con IAM y HelpDesk). */
export const SYSADMIN_SEED_PROFILE: Omit<ProfileDoc, 'createdAt' | 'updatedAt'> = {
  id: 'profile-sysadmin-jr',
  name: 'Perfil SysAdmin Jr - Infra & Ops',
  fullName: '',
  headline: 'Junior SysAdmin | Infrastructure & Operations',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  portfolio: '',
  targetRoles: [
    'Junior SysAdmin',
    'Systems Administrator (Jr)',
    'IT Infrastructure Analyst',
    'Infrastructure Operations Analyst',
    'Windows/Linux Administrator (Jr)',
    'NOC Analyst',
    'Site Reliability Engineer (Jr)',
    'Cloud Infrastructure Analyst (Jr)',
    'IT Operations Analyst',
    'Datacenter Operations Technician',
  ],
  summary:
    'Administrador de sistemas junior (Linux + Windows Server) con criterio operativo de guardia: ' +
    'diagnóstico estructurado de incidentes (identificar → aislar → mitigar → verificar → documentar), ' +
    'gestión de servicios (systemd/Windows Services), almacenamiento y backups con regla 3-2-1, ' +
    'virtualización (vSphere/Proxmox/Hyper-V), redes de datacenter (VLANs, firewall, DNS/DHCP interno) ' +
    'y monitoreo con umbralismo sensato. Cambios con ventana, plan y rollback — nunca tocar producción ' +
    'sin los tres. Automatización con Bash/PowerShell y rumbo a Infra as Code (Ansible, Terraform) y ' +
    'contenedores. Español nativo e inglés B2+.',
  skills: [
    // Linux — el corazón operativo
    { id: 'sklsa-linux', name: 'Linux operativo — systemd, journalctl, permisos, LVM, gestores de paquetes, SSH', group: 'Linux', status: 'En proceso', notes: 'Diagnóstico del "servicio caído" y del "disco lleno" de primera línea.' },
    { id: 'sklsa-bash', name: 'Bash scripting — backups, rotación de logs, reportes, one-liners con awk/sed/grep', group: 'Linux', status: 'En proceso' },
    { id: 'sklsa-hardening-linux', name: 'Hardening Linux — SSH (claves, no root), firewalld/ufw, actualizaciones, auditd', group: 'Linux', status: 'Por aprender' },
    // Windows Server
    { id: 'sklsa-winsrv', name: 'Windows Server — AD/DNS interno, GPO, servicios, Event Viewer, PowerShell', group: 'Windows Server', status: 'En proceso' },
    { id: 'sklsa-ps', name: 'PowerShell para ops — Get-Service/Get-WinEvent, remoting, reportes de servidores', group: 'Windows Server', status: 'Por aprender' },
    // Redes
    { id: 'sklsa-net', name: 'Redes de datacenter — VLANs, switching, routing básico, firewall, DNS/DHCP interno', group: 'Redes', status: 'En proceso' },
    { id: 'sklsa-certs', name: 'PKI operativa — certificados TLS, expiración, renovación, troubleshooting de handshake', group: 'Redes', status: 'Por aprender' },
    // Storage & Backup
    { id: 'sklsa-storage', name: 'Storage — RAID niveles, LVM, NFS/SMB, capacidad y crecimiento', group: 'Storage & Backup', status: 'En proceso' },
    { id: 'sklsa-backup', name: 'Backups — regla 3-2-1, RPO/RTO, verificación de restore, retención', group: 'Storage & Backup', status: 'En proceso', notes: 'Un backup no verificado no es un backup.' },
    // Virtualización & Cloud
    { id: 'sklsa-vm', name: 'Virtualización — vSphere/Proxmox/Hyper-V, snapshots, recursos, datastores', group: 'Virtualización & Cloud', status: 'En proceso' },
    { id: 'sklsa-containers', name: 'Contenedores — Docker run/compose, volúmenes, redes, logs', group: 'Virtualización & Cloud', status: 'Por aprender' },
    { id: 'sklsa-cloud', name: 'Cloud básico — IaaS (VMs, discos, redes virtuales), IAM de cloud, costos', group: 'Virtualización & Cloud', status: 'Por aprender' },
    // Monitoreo & ITSM
    { id: 'sklsa-monitor', name: 'Monitoreo — Zabbix/Grafana/Prometheus, umbrales, alertas accionables', group: 'Monitoreo & ITSM', status: 'En proceso' },
    { id: 'sklsa-itsm', name: 'Gestión de cambios e incidentes — ventana, plan, rollback, postmortems sin culpa', group: 'Monitoreo & ITSM', status: 'En proceso' },
    { id: 'sklsa-autom', name: 'Automatización — Ansible básico, tareas programadas (cron/tareas programadas)', group: 'Monitoreo & ITSM', status: 'Por aprender' },
    // Blandas
    { id: 'sklsa-doc', name: 'Documentación operativa — runbooks, diagramas, inventario CMDB', group: 'Blandas', status: 'En proceso' },
    { id: 'sklsa-guardia', name: 'Guardia (on-call) — priorización bajo presión, comunicación de estado, escalado', group: 'Blandas', status: 'En proceso' },
  ],
  tools: [
    { id: 'ptsa-linux', name: 'Linux (RHEL/Debian) — línea de comando', level: 'Intermedio', notes: 'systemd, journalctl, LVM, rpm/deb, ssh.' },
    { id: 'ptsa-winsrv', name: 'Windows Server / Hyper-V', level: 'Intermedio' },
    { id: 'ptsa-powershell', name: 'PowerShell', level: 'Básico' },
    { id: 'ptsa-bash', name: 'Bash / scripting Linux', level: 'Intermedio' },
    { id: 'ptsa-vmware', name: 'VMware vSphere / Proxmox', level: 'Intermedio' },
    { id: 'ptsa-zabbix', name: 'Zabbix / Grafana / Prometheus', level: 'Básico' },
    { id: 'ptsa-ansible', name: 'Ansible / Terraform', level: 'Básico' },
    { id: 'ptsa-itsmops', name: 'ServiceNow / Jira (tickets de ops)', level: 'Intermedio' },
  ],
  experience: [],
  education: [],
  certifications: [
    { id: 'certsa-lpi', name: 'Linux Essentials / LPIC-1', issuer: 'LPI', status: 'En proceso', notes: 'La certificación de entrada Linux con sello verificable.' },
    { id: 'certsa-rhcsa', name: 'RHCSA', issuer: 'Red Hat', status: 'Por aprender', notes: 'El estándar de oro del SysAdmin Linux — objetivo del primer año.' },
    { id: 'certsa-azure900', name: 'Azure Fundamentals (AZ-900)', issuer: 'Microsoft', status: 'Por aprender', notes: 'Puerta de entrada a la nube para perfil on-prem.' },
  ],
  languages: [
    { id: 'lang-es-sa', name: 'Español', level: 'Nativo' },
    { id: 'lang-en-sa', name: 'Inglés', level: 'B2+' },
  ],
  projects: [
    { id: 'prjsa-guardia', name: 'Proyecto Final VaultNotes — "semana de guardia" en Infraestructura de Nexora S.A. (simulado)', description: '30 tickets de guardia de punta a punta (Linux, Windows Server, redes, storage/VM, cambios y monitoreo) con modo estudio, evidencia de cada cierre y postmortem final. Práctica deliberada del rol con foco en el puente hacia SRE.' },
    { id: 'prjsa-vaultnotes', name: 'VaultNotes — segundo cerebro de estudio (PWA local-first)', description: 'Glosario, roadmap, labs y herramientas offline — ahora con especialización SysAdmin/Infra y transición a SRE.' },
  ],
  atsKeywords: [
    'SysAdmin', 'Systems Administrator', 'System Administrator', 'Junior SysAdmin', 'Infrastructure',
    'IT Operations', 'IT Ops', 'NOC', 'Site Reliability', 'SRE', 'Linux', 'RHEL', 'Debian', 'Ubuntu',
    'Windows Server', 'Hyper-V', 'Active Directory', 'DNS', 'DHCP', 'Firewall', 'VLAN', 'TCP/IP',
    'systemd', 'journalctl', 'LVM', 'RAID', 'Bash', 'Shell Scripting', 'PowerShell', 'VMware',
    'vSphere', 'Proxmox', 'Virtualization', 'Docker', 'Kubernetes', 'Cloud', 'Ansible', 'Terraform',
    'Zabbix', 'Grafana', 'Prometheus', 'Monitoring', 'Observability', 'Backup', 'Disaster Recovery',
    '3-2-1', 'RPO', 'RTO', 'Incident Management', 'Change Management', 'On-call', 'Troubleshooting',
    'Capacity Planning', 'Patch Management', 'Hardening', 'Cron', 'NFS', 'SMB', 'LPIC-1', 'RHCSA',
  ],
  jobSearchNotes:
    'Títulos objetivo: Junior SysAdmin / IT Infrastructure Analyst / NOC Analyst (ver lista). ' +
    'Palabras clave probadas: "sysadmin junior", "administrador de sistemas", "infraestructura", ' +
    '"operaciones TI", "soporte de servidores". Portales: LinkedIn, Computrabajo, Indeed, ' +
    'empresa-empresa. Diferenciadores: la semana de guardia simulada (prepárala para contar en ' +
    'entrevistas), el dominio dual Linux+Windows y la narrativa de transición SysAdmin → SRE. Este ' +
    'perfil COEXISTE con el Perfil IAM y el Perfil HelpDesk: activa uno u otro según la vacante ' +
    '(el contenido de todos se conserva).',
};
