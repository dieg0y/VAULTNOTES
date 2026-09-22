/**
 * roadmapSysAdminData — ROADMAP: SYSADMIN / INFRA & OPS → SRE.
 *
 * Capa de INFRAESTRUCTURA: prepara para un puesto de SysAdmin / Infra &
 * Ops (Linux + Windows Server + red + storage + virtualización) y allana
 * la transición hacia SRE / Infra Engineer (automatización, contenedores,
 * cloud e IaC).
 *
 * Estructura idéntica a los roadmaps IAM y HelpDesk (reutiliza
 * RoadmapTierDef / RoadmapPhaseDef / RoadmapItemDef de roadmapData.ts):
 * 3 tiers + proyecto final (la "Semana de Guardia" del simulador SysAdmin
 * — 30 tickets sa-027..sa-056). El checklist (estado done) persiste en la
 * tabla Dexie `roadmapSysAdminItems` (ids 'rmsa-*'); este archivo es la
 * FUENTE DE VERDAD del CONTENIDO. El seed añade filas para los ids que
 * falten — jamás resetea el progreso del usuario.
 */

import { type RoadmapTierDef } from './roadmapData';

export const ROADMAP_SA_HEADER = {
  title: 'Roadmap: SysAdmin / Infra & Ops → SRE',
  specialization: 'Especialización de Infraestructura: Linux · Windows Server · Red · Storage · Virtualización',
  edge: 'Puente de Transición: operación real → SRE / Infra Engineer (automatización, cloud, IaC)',
};

/** Nota de criterio de dominio (misma filosofía que los otros roadmaps). */
export const ROADMAP_SA_MASTERY_NOTE =
  'Para considerar una competencia dominada, debes poder ejecutarla ante un incidente real (o simulado), ' +
  'explicar el porqué técnico, decidir cuándo NO tocar producción (ventana/rollback) y documentarla ' +
  'en un ticket que otro ingeniero o un auditor pueda entender sin preguntarte nada.';

export const ROADMAP_SA_TIERS: RoadmapTierDef[] = [
  {
    id: 'rmsa-t1',
    title: 'TIER 1 — FOUNDATION SYSADMIN',
    subtitle:
      'La base física y lógica del oficio: hardware de servidor, Linux y Windows a nivel consola, redes y los reflejos del primer puesto. Aquí se construye el laboratorio que usará el resto del roadmap.',
    phases: [
      {
        id: 'rmsa-f1',
        number: 1,
        title: 'Fundamentos de Servidor y Virtualización',
        note: 'Todo lo que administrarás vive en hardware y casi todo en VMs: entiende la máquina antes de tocar el sistema.',
        items: [
          {
            id: 'rmsa-f1-1',
            label: 'Conceptos Clave',
            text: 'Hardware de servidor vs PC de oficina: RAM ECC, discos hot-swap en bandeja, fuentes redundantes y consola de gestión (IPMI/iDRAC/iLO) para entrar cuando el SO está muerto. Diagnostica diferenciando fallo de componente de fallo de sistema operativo.',
          },
          {
            id: 'rmsa-f1-2',
            label: 'Conceptos Clave',
            text: 'Virtualización como concepto: hypervisor tipo 1 (ESXi, Proxmox, Hyper-V) vs tipo 2 (VirtualBox), vCPU, RAM asignada, discos thin/thick y redes virtuales. El 90% de lo que tocarás como SysAdmin es una VM, no un rack.',
          },
          {
            id: 'rmsa-f1-3',
            label: 'Práctica',
            text: 'Habilita VT-x/AMD-V en el BIOS/UEFI, instala VirtualBox o KVM (virt-manager) y crea tu primera VM Linux desde la ISO: particionado manual, IP fija y usuario propio (nunca root para todo).',
          },
          {
            id: 'rmsa-f1-4',
            label: 'Práctica',
            text: 'Monta un laboratorio de 3 VMs en tu equipo (un Linux, un Windows Server y una de red/backup) con red interna host-only y snapshot ANTES de cada experimento que puedas romper.',
          },
          {
            id: 'rmsa-f1-5',
            label: 'Evidencia',
            text: 'Documento del laboratorio en VaultNotes: topología, IPs fijas, credenciales en la bóveda y el registro de dos cosas que rompiste a propósito y cómo las recuperaste con snapshot/rollback.',
          },
        ],
      },
      {
        id: 'rmsa-f2',
        number: 2,
        title: 'Linux Base: Shell, Sistema y SSH',
        note: 'Linux es el idioma principal de infra: shell, permisos, procesos, systemd y SSH como rutina diaria.',
        items: [
          {
            id: 'rmsa-f2-1',
            label: 'Práctica',
            text: 'Shell de supervivencia: cd/ls/cp/mv, find, grep, pipes (|), redirección (>, >>) e historial con Ctrl+R. Regla: man y --help ANTES de googlear; si lo googlearías dos veces, anótalo.',
          },
          {
            id: 'rmsa-f2-2',
            label: 'Conceptos Clave',
            text: 'Jerarquía FHS: /etc (configuración), /var/log (logs), /home, /proc y /sys (estado del kernel), /dev. Saber qué leer en cada directorio es la mitad del diagnóstico en Linux.',
          },
          {
            id: 'rmsa-f2-3',
            label: 'Práctica',
            text: 'Permisos: rwx por dueño/grupo/otros, chmod numérico (755, 644) y simbólico, chown/chgrp, umask y sudo con visudo. Reproduce y arregla un clásico: script que corre con sudo pero falla en el cron de un usuario.',
          },
          {
            id: 'rmsa-f2-4',
            label: 'Práctica',
            text: 'Procesos y señales: ps aux, top/htop, kill -TERM vs kill -9 (el -9 es último recurso), nice y estados D/Z. Identifica qué proceso se comió la RAM con ps aux --sort=-%mem | head.',
          },
          {
            id: 'rmsa-f2-5',
            label: 'Práctica',
            text: 'systemd y journalctl: systemctl status/start/enable/mask, dependencias entre units y journalctl -u servicio --since "1 hour ago" -f. El 70% de los tickets de Linux se resuelve leyendo estas dos salidas.',
          },
          {
            id: 'rmsa-f2-6',
            label: 'Práctica',
            text: 'Paquetes: apt (Debian/Ubuntu) y dnf/yum (RHEL/Rocky): instalar, actualizar, repos, claves GPG y rpm -qa / dpkg -l para auditar. Distingue cuándo paquete de distro, cuándo tarball y cuándo contenedor.',
          },
          {
            id: 'rmsa-f2-7',
            label: 'Práctica',
            text: 'SSH de verdad: ssh-keygen (ed25519), authorized_keys, scp y rsync -avz. Aprende ya a entrar con llave y sin root directo: es la primera regla de hardening y la costumbre que evalúan en cualquier entrevista.',
          },
          {
            id: 'rmsa-f2-8',
            label: 'Evidencia',
            text: 'Servidor Linux del lab operando: servicio propio con unit de systemd, logs persistentes en journal, acceso por SSH con llave desde tu equipo y un incidente simulado (servicio caído) resuelto y documentado.',
          },
        ],
      },
      {
        id: 'rmsa-f3',
        number: 3,
        title: 'Windows Server Base',
        note: 'El otro 50% del mundo real: buena parte de la empresa latina corre sobre AD + Windows Server.',
        items: [
          {
            id: 'rmsa-f3-1',
            label: 'Conceptos Clave',
            text: 'Windows Server: ediciones, Server Manager, roles y características (Features), Core vs GUI y por qué en producción se prefiere Core. Un SysAdmin que solo sabe clic ya es junior a medias.',
          },
          {
            id: 'rmsa-f3-2',
            label: 'Práctica',
            text: 'PowerShell base: Get-Command/Get-Help -Examples, pipeline con Where-Object y Select-Object, Get-Service, Get-Process, Get-WinEvent y variables. Ejecuta desde consola las 10 tareas que hoy harías con clic.',
          },
          {
            id: 'rmsa-f3-3',
            label: 'Práctica',
            text: 'Herramientas de diagnóstico: services.msc, Programador de tareas, Monitor de recursos y Event Viewer filtrando por origen/ID/nivel. Exporta el evento exacto antes de cerrar cualquier ticket de Windows.',
          },
          {
            id: 'rmsa-f3-4',
            label: 'Conceptos Clave',
            text: 'AD y DNS internos: dominio, DC, OU, usuarios y grupos de seguridad; zona forward y reverse, registros A/PTR/SRV/CNAME y por qué AD entero se cae si su DNS está mal.',
          },
          {
            id: 'rmsa-f3-5',
            label: 'Práctica',
            text: 'Instala AD DS (Install-WindowsFeature o el asistente), promueve el DC con un dominio de laboratorio (lab.local), une un cliente Windows y verifica los registros SRV del DNS interno.',
          },
          {
            id: 'rmsa-f3-6',
            label: 'Evidencia',
            text: 'Lab AD documentado: dominio con DC y cliente unidos, más un script PowerShell que cree 5 usuarios con New-ADUser en OU propia (grupo y descripción incluidos) y demuestre el login de uno de ellos.',
          },
        ],
      },
      {
        id: 'rmsa-f4',
        number: 4,
        title: 'Redes Base para el SysAdmin',
        note: 'No eres network admin, pero sin redes no diagnosticas nada: el método por capas es tu mejor herramienta.',
        items: [
          {
            id: 'rmsa-f4-1',
            label: 'Conceptos Clave',
            text: 'TCP/IP aplicado: capas, handshake TCP, MTU y los puertos de tu día a día: 22/SSH, 53/DNS, 67-68/DHCP, 80/443, 445/SMB, 3389/RDP. Con ss -tulpn y netstat ves quién escucha y en qué interfaz.',
          },
          {
            id: 'rmsa-f4-2',
            label: 'Práctica',
            text: 'Subnetting sin calculadora: CIDR, máscara, hosts útiles por red, dividir un /24 en /26 y decidir qué subred va a servidores, gestión y backups. Haz 10 ejercicios cronometrados hasta que sea reflejo.',
          },
          {
            id: 'rmsa-f4-3',
            label: 'Conceptos Clave',
            text: 'Switching y routing: MAC vs IP, ARP, gateway y tabla de rutas (ip route); VLANs y trunk 802.1Q. Explica por qué dos VMs en VLANs distintas nunca se ven sin router y cómo se diagnostica eso.',
          },
          {
            id: 'rmsa-f4-4',
            label: 'Conceptos Clave',
            text: 'DNS y DHCP operativos: resolución recursiva, caché y TTL; dig/nslookup/resolvectl y ipconfig /flushdns; DHCP (DORA), leases, reservas y el scope lleno. Aquí nacen la mitad de los tickets de "no hay red".',
          },
          {
            id: 'rmsa-f4-5',
            label: 'Práctica',
            text: 'Firewall local: ufw o firewalld (zonas, servicios, puertos) y una mirada a nftables; audita con ss -tulpn qué expone tu servidor y cierra lo que no necesites. Regla: default deny y abrir por servicio, nunca "todo".',
          },
          {
            id: 'rmsa-f4-6',
            label: 'Evidencia',
            text: 'Diagrama de red del laboratorio (VLANs, IPs, gateway, DNS, firewall) y un caso documentado de "no hay conectividad" resuelto capa por capa (cable → IP → gateway → DNS → puerto) con comandos y conclusiones.',
          },
        ],
      },
      {
        id: 'rmsa-f5',
        number: 5,
        title: 'El Primer Puesto: Guardia y Documentación',
        note: 'Lo que te contratan a hacer: turnos, tickets, inventario y la disciplina de no romper nada mientras aprendes.',
        items: [
          {
            id: 'rmsa-f5-1',
            label: 'Conceptos Clave',
            text: 'Cómo funciona una guardia de infraestructura: horarios, transmisión del turno (handoff), ventanas de cambio y las dos preguntas antes de tocar producción: ¿está aprobado? y ¿cómo revierto esto?',
          },
          {
            id: 'rmsa-f5-2',
            label: 'Práctica',
            text: 'Documentación de operaciones: bitácora con hora, comando exacto, salida relevante y resultado; tickets con síntoma → diagnóstico → cambio → verificación. Si no está escrito, no pasó.',
          },
          {
            id: 'rmsa-f5-3',
            label: 'Práctica',
            text: 'Inventario (mini-CMDB): hoja de vida por servidor con hostname, IP, SO, servicios, dueño del negocio, backup y dependencias. Hazlo para las 6 VMs de tu lab en CSV y luego represéntalo como tabla en VaultNotes.',
          },
          {
            id: 'rmsa-f5-4',
            label: 'Certificación',
            text: 'Ruta de certificación de entrada: elige UNA para este tier (LPIC-1 para Linux multi-distro o RHCSA si te ves en entornos RHEL) y agenda AZ-900 más adelante como mapa de cloud; estudia en paralelo, no en serie infinita.',
          },
        ],
      },
    ],
  },
  {
    id: 'rmsa-t2',
    title: 'TIER 2 — OPERACIÓN REAL',
    subtitle:
      'Lo que separa al junior del SysAdmin real: administrar sistemas que NO puedes reiniciar porque alguien los está usando. Producción Linux y Windows, storage, virtualización y monitoreo.',
    phases: [
      {
        id: 'rmsa-f6',
        number: 6,
        title: 'Linux en Producción',
        note: 'Sistemas con usuarios de verdad encima: disco, RAID, filesystems y rendimiento se administran con el servicio arriba.',
        items: [
          {
            id: 'rmsa-f6-1',
            label: 'Práctica',
            text: 'LVM de punta a punta: pvcreate/vgcreate/lvcreate, lvextend con -r para redimensionar en caliente y snapshots LVM para congelar antes de un cambio. Practica quedarte sin espacio y resolverlo SIN reiniciar.',
          },
          {
            id: 'rmsa-f6-2',
            label: 'Práctica',
            text: 'RAID: niveles 0/1/5/6/10 y sus compromisos, mdadm por software o el RAID del controlador; simula la falla de un disco (mdadm --fail), observa la degradación, reemplázalo y vigila la reconstrucción hasta el final.',
          },
          {
            id: 'rmsa-f6-3',
            label: 'Práctica',
            text: 'NFS y SMB: exporta /etc/exports con root_squash, monta por fstab con _netdev/automount y comparte con Samba y usuarios mapeados. Diagnostica el clásico "el share no monta al arrancar" (orden de servicios y timeout de red).',
          },
          {
            id: 'rmsa-f6-4',
            label: 'Práctica',
            text: 'Programación de tareas: crontab, su ambiente restringido y /var/log/cron, y systemd timers (OnCalendar, Persistent=true) como sucesor. Migra un cron a timer y explica por qué es más auditable.',
          },
          {
            id: 'rmsa-f6-5',
            label: 'Práctica',
            text: 'Hardening SSH y firewall: sin root, sin password (solo llaves), AllowUsers, fail2ban y firewalld activo. Verifica con un escaneo externo (nmap) que solo quedan abiertos los puertos que el servidor necesita.',
          },
          {
            id: 'rmsa-f6-6',
            label: 'Práctica',
            text: 'Troubleshooting de rendimiento: top/htop, free -m, vmstat, iostat -x y sar; distingue CPU-bound (%usr alto, cola de ejecutables), memoria (si hay swapping, ya perdiste) e IO-bound (%util y await altos). El load average sube también con procesos en estado D.',
          },
          {
            id: 'rmsa-f6-7',
            label: 'Evidencia',
            text: 'Post-incidente de laboratorio: servidor "lento" simulado (disco lleno en /var, swap o proceso desbocado): métricas antes/después, causa raíz, corrección y artículo de KB con la verificación final.',
          },
        ],
      },
      {
        id: 'rmsa-f7',
        number: 7,
        title: 'Windows Server en Producción',
        note: 'El dominio corporativo de verdad: GPO, DNS/DHCP internos, parcheo y administración remota masiva.',
        items: [
          {
            id: 'rmsa-f7-1',
            label: 'Práctica',
            text: 'GPOs: crear, filtrar por grupo de seguridad, linkear a OU y rastrear con gpupdate /force y gpresult /r /h report.html. Domina herencia LSDOU y bloqueo, y simula la GPO que rompe el login (y cómo revertirla desde modo seguro).',
          },
          {
            id: 'rmsa-f7-2',
            label: 'Práctica',
            text: 'DNS/DHCP en Windows: zonas, envejecimiento y scavenging; scope, lease, reservas y exclusiones, y el diagnóstico del scope lleno. Documenta el recorrido completo de la IP de un cliente nuevo desde el DHCP hasta el registro en DNS.',
          },
          {
            id: 'rmsa-f7-3',
            label: 'Práctica',
            text: 'Parcheo controlado: WSUS o Windows Update por GPO con anillos (piloto → producción), ventanas de reinicio y reporte de cumplimiento; conoce Azure Update Manager como la versión cloud del mismo problema.',
          },
          {
            id: 'rmsa-f7-4',
            label: 'Práctica',
            text: 'IIS: sitio, binding, certificado y app pool (identidad, reciclaje, límites) con diagnóstico de errores 500/502/503. Publica una página estática y rompe a propósito el app pool para ver el error exacto en pantalla y en el log.',
          },
          {
            id: 'rmsa-f7-5',
            label: 'Práctica',
            text: 'PowerShell remoting: Enable-PSRemoting, WinRM (y por qué HTTPS en producción), Invoke-Command y sesiones persistentes; reinicia un servicio en 10 servidores en una sola línea. La administración uno-por-uno deja de ser opción.',
          },
          {
            id: 'rmsa-f7-6',
            label: 'Evidencia',
            text: 'Informe de operación generado con PowerShell remoto: estado de servicios y parcheo de tus VMs Windows exportado a CSV/HTML — el reporte que un jefe no técnico entiende y por el que te recuerdan.',
          },
        ],
      },
      {
        id: 'rmsa-f8',
        number: 8,
        title: 'Storage y Backup',
        note: 'La parte por la que despiden o ascienden: la copia que no se restauró no existe y el ransomware también cifra los backups.',
        items: [
          {
            id: 'rmsa-f8-1',
            label: 'Conceptos Clave',
            text: 'Regla 3-2-1 (3 copias, 2 medios, 1 fuera del sitio) y su evolución 3-2-1-1-0 (una copia inmutable/offline y cero errores de verificación). Aplícala al inventario real: ¿dónde están HOY los backups de cada sistema?',
          },
          {
            id: 'rmsa-f8-2',
            label: 'Conceptos Clave',
            text: 'RPO y RTO definidos por el negocio y por servicio, no por infra: cuántos datos y cuánto tiempo de inactividad se pueden perder. De esas dos cifras salen la frecuencia, la retención y la tecnología de backup.',
          },
          {
            id: 'rmsa-f8-3',
            label: 'Práctica',
            text: 'Verificación de restauración: restaura un archivo, una base de datos pequeña y una VM completa; mide el tiempo real y compáralo con el RTO pactado. Un restore probado vale más que diez jobs en verde.',
          },
          {
            id: 'rmsa-f8-4',
            label: 'Práctica',
            text: 'Herramientas del oficio: rsync/rsnapshot y restic/borgbackup en Linux, Bacula o BackupPC como opciones open source, Veeam Community para VMs y Synology/TrueNAS como NAS destino; entiende iSCSI LUN vs NFS/SMB como respaldo de datastore.',
          },
          {
            id: 'rmsa-f8-5',
            label: 'Conceptos Clave',
            text: 'Retención y ciclo GFS (diaria/semanal/mensual), inmutabilidad (Object Lock/WORM) y aislamiento de las credenciales de backup: el ransomware moderno borra tus copias antes de cifrar producción.',
          },
          {
            id: 'rmsa-f8-6',
            label: 'Evidencia',
            text: 'Política de backup escrita para tu lab: qué se respalda, cada cuánto, dónde vive cada copia y la retención, más la evidencia fechada de un restore probado con el tiempo medido.',
          },
        ],
      },
      {
        id: 'rmsa-f9',
        number: 9,
        title: 'Virtualización en Producción',
        note: 'Tu día a día: clústeres, plantillas, snapshots y recursos compartidos; la VM lenta casi nunca es culpa de la VM.',
        items: [
          {
            id: 'rmsa-f9-1',
            label: 'Conceptos Clave',
            text: 'El mercado: VMware vSphere/ESXi, Proxmox VE, Hyper-V y KVM: clúster, HA, live migration/vMotion y datastore. Comprende el hipervisor que uses al nivel de "qué pasa si este host muere ahora mismo".',
          },
          {
            id: 'rmsa-f9-2',
            label: 'Práctica',
            text: 'Proxmox VE como laboratorio (o vSphere/Hyper-V si tienes acceso): crea plantillas (cloud-init/sysprep), clones linked, ajusta vCPU/RAM en frío y en caliente, y practica la migración en vivo entre dos nodos con el servicio arriba.',
          },
          {
            id: 'rmsa-f9-3',
            label: 'Conceptos Clave',
            text: 'Datastores: thick vs thin provisioning, overprovisioning y el colapso de escribir más de lo que existe; snapshot NO es backup: crecimiento delta, consolidación y la ruptura cuando se llena el datastore.',
          },
          {
            id: 'rmsa-f9-4',
            label: 'Práctica',
            text: 'Recursos de VM: CPU ready/steal, memory ballooning, reservas y límites; diagnostica la VM lenta con el host tranquilo (espera de CPU en cola o IO del datastore compartido) y ajusta con criterio, no con más RAM a ciegas.',
          },
          {
            id: 'rmsa-f9-5',
            label: 'Evidencia',
            text: 'Informe de capacidad del clúster del lab: consumo por VM (CPU/RAM/disco), tendencia a 30 días, una recomendación de ajuste concreta y el plan de acción para cuando el datastore se agote.',
          },
        ],
      },
      {
        id: 'rmsa-f10',
        number: 10,
        title: 'Monitoreo',
        note: 'Sin monitoreo eres reaccionario: te enteras por el usuario. Con mal monitoreo, te enteras mil veces de lo mismo.',
        items: [
          {
            id: 'rmsa-f10-1',
            label: 'Conceptos Clave',
            text: 'Monitoreo: métricas, logs y alertas; agente vs agentless (SNMP/ICMP) y el salto de estado binario (up/down) a umbrales y tendencias. Empieza por la pregunta: ¿qué me avisa ANTES de que el usuario lo note?',
          },
          {
            id: 'rmsa-f10-2',
            label: 'Práctica',
            text: 'Zabbix: hosts, items, triggers, plantillas ("Linux by Zabbix agent", "Windows by Zabbix agent") y acciones de notificación. Complemento: Prometheus + node_exporter con Grafana para dashboards de tendencias.',
          },
          {
            id: 'rmsa-f10-3',
            label: 'Conceptos Clave',
            text: 'Tormentas de alertas y alertas accionables: dependencias (no avises del switch si ya avisó el host), ventanas de mantenimiento, severidades claras y una alerta = una acción. Quien recibe 40 avisos por incidente deja de mirarlos.',
          },
          {
            id: 'rmsa-f10-4',
            label: 'Práctica',
            text: 'Instrumenta el lab completo: Linux con node_exporter o agente Zabbix, Windows con windows_exporter, blackbox para puertos/páginas y una alerta de disco al 85% que de verdad te llegue (correo o Telegram).',
          },
          {
            id: 'rmsa-f10-5',
            label: 'Evidencia',
            text: 'Dashboard del laboratorio + tabla con 3 alertas de umbral JUSTIFICADO y su runbook: qué mirar, qué decidir y a quién escalar. Toda alerta sin acción asociada es ruido que terminarás apagando.',
          },
        ],
      },
    ],
  },
  {
    id: 'rmsa-t3',
    title: 'TIER 3 — SYSADMIN → SRE',
    subtitle:
      'El salto de calidad: dejar de hacer lo mismo dos veces. Automatización, contenedores, una nube e IaC, con las prácticas SRE que hacen sostenible la operación a largo plazo.',
    phases: [
      {
        id: 'rmsa-f11',
        number: 11,
        title: 'Automatización',
        note: 'El multiplicador: si lo hiciste dos veces a mano, automatízalo; a la tercera ya debía ser playbook.',
        items: [
          {
            id: 'rmsa-f11-1',
            label: 'Práctica',
            text: 'Bash serio: set -euo pipefail, funciones, getopts, trap para limpieza, logging a archivo y scripts idempotentes (correrlos dos veces no rompe nada). Convierte 3 tareas manuales de tu lab en scripts con --dry-run.',
          },
          {
            id: 'rmsa-f11-2',
            label: 'Práctica',
            text: 'PowerShell avanzado: funciones con [CmdletBinding()], parámetros validados, try/catch, -WhatIf/-Confirm y módulos propios. Escribe una función Invoke-ServiceRestart reutilizable, con ayuda y ejemplos.',
          },
          {
            id: 'rmsa-f11-3',
            label: 'Práctica',
            text: 'Ansible: inventario, playbooks, módulos core, handlers, roles y ansible-vault para secretos. Configura desde cero 3 VMs del lab (usuario, paquetes, servicio, firewall) y demuestra la idempotencia con --check.',
          },
          {
            id: 'rmsa-f11-4',
            label: 'Conceptos Clave',
            text: 'De cron a systemd timers: dependencias, journal integrado, Persistent=true y aleatorización de horarios para no disparar todo a medianoche. Automatizar el "cuándo" también es automatización.',
          },
          {
            id: 'rmsa-f11-5',
            label: 'Práctica',
            text: 'Gestión de configuración aplicada: un rol de hardening SSH y un rol de "usuario de aplicación" con validación, versionados en Git y aplicados primero con ansible-playbook --check y luego en real.',
          },
          {
            id: 'rmsa-f11-6',
            label: 'Evidencia',
            text: 'Repo de automatización: playbooks y roles con README, y un cambio aplicado en 5+ hosts del lab con diff del --check, ejecución y verificación documentada. Ese repositorio es portfolio de entrevista.',
          },
        ],
      },
      {
        id: 'rmsa-f12',
        number: 12,
        title: 'Contenedores y una Nube',
        note: 'Dónde corre el software nuevo: contenedores para las apps y UNA nube pública bien entendida; no necesitas las tres.',
        items: [
          {
            id: 'rmsa-f12-1',
            label: 'Conceptos Clave',
            text: 'Qué resuelve un contenedor vs una VM: imagen inmutable, capas, registro y el ciclo construir → distribuir → correr. No es "una VM ligera": comparte kernel del host y por eso no aísla igual que una VM.',
          },
          {
            id: 'rmsa-f12-2',
            label: 'Práctica',
            text: 'Docker: Dockerfile multi-stage, volúmenes, redes definidas por el usuario y variables de entorno; docker compose para levantar app + base de datos con depends_on y healthcheck. Rómpelo a propósito y depura con docker logs y docker exec.',
          },
          {
            id: 'rmsa-f12-3',
            label: 'Práctica',
            text: 'Operar contenedores como SysAdmin: restart policy, límites de CPU/memoria, rotación de logs y actualización de imagen con rollback de tag. Un contenedor sin límites es el vecino ruidoso del host.',
          },
          {
            id: 'rmsa-f12-4',
            label: 'Conceptos Clave',
            text: 'Kubernetes base: pod, deployment, service, ingress, PVC y ConfigMap/Secret. Con leer manifiestos y entender el modelo alcanza para operar; la profundidad de plataforma es otra especialización.',
          },
          {
            id: 'rmsa-f12-5',
            label: 'Práctica',
            text: 'Una sola nube pública (elige AWS, Azure o GCP y quédate ahí): VM, VNet/subred, security groups, discos y snapshots; replica tu lab on-prem en la nube y APÁGALO todo cuando termines (los costos corren aunque no uses nada).',
          },
          {
            id: 'rmsa-f12-6',
            label: 'Conceptos Clave',
            text: 'IAM de cloud: usuarios vs roles, políticas de mínimo privilegio, por qué las credenciales nunca van al código (y menos al repositorio) y qué es asumir un rol. Es la extensión natural de tu lógica de permisos de Linux/AD.',
          },
          {
            id: 'rmsa-f12-7',
            label: 'Certificación',
            text: 'AZ-900 (Azure) o AWS Cloud Practitioner como mapa del territorio: vocabulario, modelos de responsabilidad y cálculo básico de costos (tamaño de instancia, discos, snapshots, IP pública) con presupuesto y alarmas de gasto.',
          },
        ],
      },
      {
        id: 'rmsa-f13',
        number: 13,
        title: 'Infra as Code',
        note: 'Lo que no puedes recrear desde código no existe: drift, PRs y pipelines en lugar de consolas a mano.',
        items: [
          {
            id: 'rmsa-f13-1',
            label: 'Conceptos Clave',
            text: 'IaC: declarativo vs imperativo, estado (state), drift y por qué "consola = deuda". La infraestructura se describe, se versiona y se revisa exactamente como el código de aplicación.',
          },
          {
            id: 'rmsa-f13-2',
            label: 'Práctica',
            text: 'Terraform: provider, resource, terraform plan/apply/destroy y state remoto con bloqueo (backend S3/Azure/Terraform Cloud). Levanta una VNet + VM desde código y entiende cada línea del plan antes de aplicarla.',
          },
          {
            id: 'rmsa-f13-3',
            label: 'Conceptos Clave',
            text: 'Módulos y reúso, variables y salidas, y entornos separados (workspaces o directorios dev/prod que llaman al mismo módulo). El mismo módulo con dos tamaños: así escala IaC sin copiar y pegar.',
          },
          {
            id: 'rmsa-f13-4',
            label: 'Práctica',
            text: 'Git para infra: ramas, pull requests con revisión, conventional commits, .gitignore para secretos y ganchos pre-commit. El historial del repositorio se convierte en el changelog auditable de tus servidores.',
          },
          {
            id: 'rmsa-f13-5',
            label: 'Práctica',
            text: 'CI/CD básico con GitHub Actions o GitLab CI: validación en PR (lint, terraform plan, ansible --check) y aplicación solo desde main protegida. Tu cambio a producción pasa por pipeline, no por tu terminal.',
          },
          {
            id: 'rmsa-f13-6',
            label: 'Evidencia',
            text: 'Repo IaC completo: README, pipeline verde aplicando un cambio real y terraform destroy limpio (crear y eliminar sin dejar huella). Recrear tu lab desde cero es el examen real de IaC.',
          },
        ],
      },
      {
        id: 'rmsa-f14',
        number: 14,
        title: 'Prácticas SRE',
        note: 'El puente final: confiabilidad medible, incidentes sin culpa y guardias que no destruyen personas.',
        items: [
          {
            id: 'rmsa-f14-1',
            label: 'Conceptos Clave',
            text: 'SLI/SLO y error budget: medir confiabilidad (disponibilidad, latencia, tasa de error) y acordar un objetivo con el negocio; el presupuesto de error decide cuándo parar lanzamientos y dedicarse a estabilizar.',
          },
          {
            id: 'rmsa-f14-2',
            label: 'Conceptos Clave',
            text: 'Postmortems sin culpa (blameless): timeline, causa raíz (las personas no son la causa), acciones con dueño y fecha. Escribe uno real de un incidente de tu laboratorio o de la semana de guardia.',
          },
          {
            id: 'rmsa-f14-3',
            label: 'Conceptos Clave',
            text: 'Runbooks: procedimientos ejecutables por otro humano a las 3 de la mañana, con verificación y rollback; el runbook que nunca se ha probado no existe. Formato: síntoma → diagnóstico → pasos → verificación → escalamiento.',
          },
          {
            id: 'rmsa-f14-4',
            label: 'Práctica',
            text: 'Automatizar toil: audita tu guardia simulada, lista las tareas repetitivas y convierte dos en script o playbook con validación. El toil que no automatizas crece al mismo ritmo que la infraestructura.',
          },
          {
            id: 'rmsa-f14-5',
            label: 'Conceptos Clave',
            text: 'On-call sano: turnos con descanso real, solo páginas accionables, handoff escrito y límites de carga. El burnout del SysAdmin es un defecto del sistema de guardia, no una medalla.',
          },
        ],
      },
    ],
  },
  {
    id: 'rmsa-pf',
    title: 'PROYECTO FINAL — SEMANA DE GUARDIA SIMULADA',
    subtitle:
      'La semana de guardia en el simulador SysAdmin de VaultNotes (empresa ficticia Nexora S.A.): 30 tickets de operación real (6 por día × 5 días, sa-027..sa-056) más el portafolio de cierre que convierte la práctica en evidencia.',
    phases: [
      {
        id: 'rmsa-f15',
        number: 15,
        title: 'Semana de Guardia en Nexora (30 tickets)',
        note: 'Trabaja los tickets del simulador SysAdmin como si te pagaran por ello: triage, método, KB y evidencia en cada cierre.',
        items: [
          {
            id: 'rmsa-f15-1',
            label: 'Proyecto',
            text: 'Día 1 — Toma de guardia: revisa el backlog, trabaja los 6 tickets del primer día con triage P1-P4 correcto, diagnóstico por capas y la KB aplicada en cada cierre. Abre tu bitácora de guardia con hora de inicio y estado del entorno.',
          },
          {
            id: 'rmsa-f15-2',
            label: 'Proyecto',
            text: 'Día 2 — Linux y servicios: tickets de discos/servicios/procesos resueltos con journalctl, systemctl, LVM y permisos; sin reiniciar como primera respuesta y con la verificación documentada antes de cerrar cada caso.',
          },
          {
            id: 'rmsa-f15-3',
            label: 'Proyecto',
            text: 'Día 3 — Windows y red: tickets de Event Viewer, GPO/DNS/DHCP interno y conectividad con diagnóstico diferencial ANTES de tocar; aplica la regla de la ventana de cambio para cualquier modificación en producción.',
          },
          {
            id: 'rmsa-f15-4',
            label: 'Proyecto',
            text: 'Día 4 — Virtualización, storage y backup: snapshots, datastores, RAID degradado y restauraciones; la evidencia del restore probado (con tiempo medido) es parte del cierre del ticket, no un extra.',
          },
          {
            id: 'rmsa-f15-5',
            label: 'Proyecto',
            text: 'Día 5 — El incidente mayor: tormenta de alertas + servicio crítico caído: estabiliza primero (mitigación), comunica el estado, escala lo que toca y SOLO después persigue la causa raíz. Cierra la semana con el handoff completo.',
          },
          {
            id: 'rmsa-f15-6',
            label: 'Proyecto',
            text: 'Postmortem final de la semana con el formato de la KB de postmortems: timeline, impacto, causa raíz y acciones con dueño y fecha; sin culpa, en Markdown, listo para contar en una entrevista.',
          },
          {
            id: 'rmsa-f15-7',
            label: 'Proyecto',
            text: 'Runbook propio exportado: 5+ procedimientos de lo que viviste en la semana, escritos para que OTRO los ejecute a las 3 AM (síntoma → diagnóstico → pasos → verificación → escalamiento), con comandos exactos.',
          },
          {
            id: 'rmsa-f15-8',
            label: 'Proyecto',
            text: 'Perfil SysAdmin exportado desde el simulador: métricas de la semana (tickets resueltos, escalamientos, MTTR) y la narrativa de CV actualizada con lo que DEMOSTRASTE en la guardia, no con lo que "conoces".',
          },
          {
            id: 'rmsa-f15-9',
            label: 'Evidencia',
            text: 'Informe final de métricas de guardia: 30/30 tickets trabajados, distribución por área y prioridad, tus 3 competencias más débiles detectadas y el plan de repaso señalando las fases exactas del roadmap que debes repetir.',
          },
        ],
      },
    ],
  },
];

/** Todos los ítems del roadmap SysAdmin (flatten) — para el seed de la DB. */
export const ROADMAP_SA_ALL_ITEM_IDS: string[] = ROADMAP_SA_TIERS.flatMap((t) =>
  t.phases.flatMap((p) => p.items.map((i) => i.id))
);
