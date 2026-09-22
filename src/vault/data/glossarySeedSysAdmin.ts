/**
 * glossarySeedSysAdmin — especialización SysAdmin / Infraestructura.
 *
 * 134 términos SysAdmin/Infra: Linux/Unix 30 · Windows Server 12 · Redes & Firewalls 17 ·
 * Storage & Backup 20 · Virtualización 8 · Cloud/Contenedores 18 · Monitoreo & Observabilidad 14 ·
 * Automatización 9 · Seguridad & Hardening 6. Español es-CO, tono práctico del día a día.
 * Los nombres obligatorios referenciados por la KB SysAdmin (sakb-*) van con su nombre
 * canónico exacto (systemd, journalctl, LVM, RAID, hot spare, Snapshot, DNS, GPO, etc.).
 *
 * Se siembran vía glossarySeed.ts (GLOSSARY_SEED_TERMS) con el mismo mecanismo
 * idempotente del glosario base: dedupe por nombre normalizado (incluidos
 * soft-deleted), nunca sobrescribe ediciones del usuario.
 */
import { type SeedTerm } from './glossarySeedBase';

export const GLOSSARY_SEED_SYSADMIN_TERMS: SeedTerm[] = [
  {
    id: "seed-sa-systemd",
    term: "systemd",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Init moderno de Linux: arranca servicios en paralelo, los supervisa y aplica reinicios y límites declarados en unidades.",
    longDefinition: "systemd es el PID 1 de casi todas las distros actuales: al boot lee unidades (servicios, timers, mounts) y las levanta en paralelo con dependencias declaradas, en lugar de scripts secuenciales. Con systemctl start/stop/enable/disable gestionas el ciclo de vida y con systemctl status ves si un servicio falló, cuándo y con qué código de salida. Por qué importa: la diferencia entre 'reinicia el server y cruza los dedos' y 'systemctl restart nginx y sigue vivo' es la base del mantenimiento diario. Trampa clásica: ejecutar el binario a mano para probarlo funciona, pero al reiniciar el servidor el servicio no sube porque nunca se hizo systemctl enable.",
    example: "Ticket 'el portal no arranca tras el reinicio de la madrugada': systemctl status nginx muestra inactive (dead) y systemctl is-enabled devuelve disabled; lo activas con systemctl enable --now nginx y documentas el fix en el ticket."
  },
  {
    id: "seed-sa-journalctl",
    term: "journalctl",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Lector del diario central de systemd: logs del kernel y de cada servicio, filtrables por unidad, boot, severidad y tiempo.",
    longDefinition: "journalctl centraliza los logs del kernel y de todas las unidades de systemd en un diario binario indexado. Con -u nginx ves solo ese servicio, con -b el arranque actual, con -b -1 el arranque anterior (oro puro cuando 'ayer funcionaba'), y con --since '2 hours ago' o -p err filtras por tiempo o severidad. Por qué importa: es la primera parada de todo diagnóstico en un servidor moderno y sustituye andar cazando archivos por /var/log. Trampa: el diario rota y se recorta por tamaño; si vas a investigar un incidente de hace semanas, configura la retención (SystemMaxUse en /etc/systemd/journald.conf) antes de que la evidencia se pierda.",
    example: "Reporte de 'ssh authentication failure' masivo en srv-app-01: journalctl -u ssh --since '1 hour ago' revela 800 intentos desde una sola IP; la bloqueas en el firewall, el ticket pasa a seguridad con la evidencia adjunta."
  },
  {
    id: "seed-sa-cron",
    term: "cron",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Planificador clásico de Unix: ejecuta comandos y scripts en minutos, horas, días y fechas programadas.",
    longDefinition: "El demonio cron revisa cada minuto las tablas de tareas programadas y lanza lo que toque. Es el motor de los respaldos nocturnos, la rotación de logs, los reportes y las limpiezas en casi cualquier servidor Linux. A diferencia de los systemd timers, cron no captura salida por defecto ni re-ejecuta tareas perdidas: si el server se cayó a las 02:00, la tarea de las 02:30 simplemente no corrió. Por qué importa: la pregunta '¿esto corrió anoche?' se resuelve revisando cron y su correo de salida. Trampa clásica: cron corre con un entorno mínimo (PATH distinto, sin variables del .bashrc), y scripts que funcionan a mano fallan en cron.",
    example: "El respaldo de srv-db-01 no generó archivo: en /var/log/syslog ves que cron lanzó el job pero mysqldump falló por una ruta mal escrita; la corriges, agregas un log propio en /var/log/backup.log y el respaldo de la noche siguiente queda verificado."
  },
  {
    id: "seed-sa-crontab",
    term: "crontab",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Tabla de tareas de cron: cinco campos de tiempo (minuto, hora, día, mes, día-semana) más el comando a ejecutar.",
    longDefinition: "La crontab define qué corre y cuándo: minuto, hora, día del mes, mes y día de la semana (0 = domingo) seguidos del comando, con soporte de listas, rangos y */N para 'cada N'. Se gestiona por usuario con crontab -e y crontab -l, y también en /etc/cron.d para tareas de sistema con usuario explícito. Por qué importa: casi todo el mantenimiento nocturno de un SysAdmin vive aquí, y saber leerla rápido evita tareas duplicadas o ventanas que chocan. Trampa: los jobs de root y de usuario corren con permisos distintos (una tarea que escribe en /var/lib como usuario normal falla con permiso denegado) y editar la crontab del usuario equivocado es el error de las 3 a.m.",
    example: "Respaldos duplicados saturando el enlace de 02:00 a 02:30: crontab -l de root y del usuario backup muestran la misma tarea de mysqldump; consolidas ambas en una sola entrada en /etc/cron.d/backup con el usuario correcto y el ancho de banda se recupera."
  },
  {
    id: "seed-sa-systemd-timer",
    term: "systemd timer",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Unidad de systemd que dispara un servicio según calendario (OnCalendar) o de forma relativa (OnBootSec, OnUnitActiveSec): la alternativa moderna a cron.",
    longDefinition: "Un timer es una unidad .timer que activa su .service según un calendario (OnCalendar=*-*-* 02:30:00) o de manera relativa (OnBootSec, OnUnitActiveSec para 'cada N desde la última'). Ventajas prácticas frente a cron: systemctl list-timers muestra la próxima y la última ejecución, Persistent=true recupera la tarea perdida si el servidor estuvo apagado, y la salida vive en el journal (nada de correos perdidos). Por qué importa: las distros nuevas ya empaquetan así sus tareas (logrotate, fstrim, man-db) y el SysAdmin moderno las lee igual que leía cron. Trampa: olvidar Persistent=true hace que las tareas solo corran si el equipo está encendido en el momento exacto: un servidor apagado el domingo pierde el reporte semanal sin decir nada.",
    example: "Falla el reporte semanal tras el fin de semana de mantenimiento eléctrico: systemctl list-timers muestra el timer sin Persistent=true y la última ejecución hace 13 días; lo activas, systemctl start reporte.service recupera la corrida y queda documentado."
  },
  {
    id: "seed-sa-systemd-target",
    term: "systemd target",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Grupo de unidades que define un estado de arranque: multi-user.target (servidor normal), graphical.target (con escritorio) o emergency.target (rescate).",
    longDefinition: "Los targets agrupan unidades con Wants/Requires para formar estados del sistema: multi-user.target es el objetivo normal de un servidor, rescue.target y emergency.target son modos de recuperación, y graphical.target añade entorno gráfico. Se cambian en caliente con systemctl isolate y se fija el default con systemctl set-default. Por qué importa: la diferencia entre 'el servidor arrancó en modo rescate y nadie se dio cuenta' y un boot limpio se diagnostica viendo el target activo; y endurecer servidores suele incluir fijar multi-user como default. Trampa: ver 'Welcome to emergency mode' en consola y reiniciar sin investigar enmascara la causa real (un fsck pendiente, un disco que no monta por fstab).",
    example: "Tras un apagón srv-fs-01 llega a 'Give root password for maintenance': estás en emergency.target por un fsck fallido de /data; corres el fsck a mano, systemctl isolate multi-user.target, revisas fstab y solo entonces das el server por sano."
  },
  {
    id: "seed-sa-systemd-unit",
    term: "systemd unit",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Objeto gestionado por systemd: .service, .timer, .mount, .socket... Todo lo que arranca, monta o supervisa el sistema es una unit.",
    longDefinition: "Cada unit es un archivo INI con secciones [Unit], [Service] y [Install] que declara qué ejecutar, con qué usuario, límites (MemoryMax, CPUQuota), reinicio automático (Restart=on-failure) y dependencias (After, Requires). systemctl list-units --failed muestra las que fallaron y systemctl daemon-reload recarga cambios de archivos. Por qué importa: envolver un binario legacy en una unit le da supervisión, límites de recursos y arranque limpio sin tocar el código; es la forma correcta de que 'ese proceso que se cae' deje de ser manual. Trampa número uno: editar la unit, no correr daemon-reload y perder una hora sin entender por qué systemd sigue usando la configuración vieja.",
    example: "Un script Java legacy se cae cada semana y nadie lo reinicia: creas /etc/systemd/system/api-legacy.service con Restart=on-failure y User=api, corres daemon-reload, systemctl enable --now, y el monitoreo deja de gritar de madrugada."
  },
  {
    id: "seed-sa-grub",
    term: "GRUB",
    acronym: "GRUB",
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Gestor de arranque de Linux: carga el kernel con sus parámetros y ofrece el menú para arrancar versiones anteriores o modo rescate.",
    longDefinition: "GRUB toma el control después del firmware, muestra el menú de kernels, carga el elegido con su cmdline (root=, quiet, etc.) y le pasa el testigo. En el día a día lo usas para arrancar un kernel anterior cuando una actualización rompe el boot, editar con 'e' en el menú para añadir single o systemd.unit=rescue.target, y reinstalarlo (grub-install / update-grub) tras cambios de disco. Por qué importa: el 90% de los 'el servidor no arranca tras patching' se resuelve desde el menú de GRUB sin reinstalar nada. Trampa: la cuenta regresiva oculta con GRUB_TIMEOUT=0 convierte un kernel roto en consola física urgente: en servidores deja el menú visible y un kernel viejo conocido siempre disponible.",
    example: "srv-web-02 no bootea tras yum update (kernel panic): reinicias, eliges el kernel anterior en el menú de GRUB, el server sube, y mientras abres ticket fijas el kernel anterior como default en /etc/default/grub."
  },
  {
    id: "seed-sa-initramfs",
    term: "initramfs",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Mini sistema de archivos en RAM que el kernel usa para montar el disco raíz real: contiene los drivers de LVM, RAID y cifrado.",
    longDefinition: "El kernel no sabe montar tu raíz sobre LVM/RAID/LUKS solo: primero desempaqueta el initramfs (un mini-root en RAM con módulos y scripts) que activa esos dispositivos y hace el pivot_root al sistema real. Se regenera con dracut (familia RHEL/SUSE) o update-initramfs (Debian/Ubuntu) cada vez que cambia el stack de arranque. Por qué importa: el error 'kernel panic - not syncing: VFS: unable to mount root fs' es casi siempre un initramfs sin el módulo o el mapa de dispositivos correcto, y arreglarlo es regenerarlo desde un chroot de rescate, no reinstalar. Trampa: convertir / a LVM o cifrar el disco después de instalar, sin regenerar el initramfs, rompe el boot en el siguiente reinicio.",
    example: "Después de migrar / a un volumen LVM, el primer reboot muere en kernel panic: arrancas con la ISO de rescate, haces chroot al sistema, update-initramfs -u -k all, reinstalas GRUB y el segundo arranque es limpio."
  },
  {
    id: "seed-sa-fstab",
    term: "fstab",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Tabla /etc/fstab: define los montajes del arranque con dispositivo (UUID), punto de montaje, tipo de FS y opciones (defaults, nofail, _netdev).",
    longDefinition: "fstab declara qué se monta y cómo: UUID del dispositivo, punto de montaje, sistema de archivos, opciones de montaje, dump y orden de fsck. También alimenta el comando mount -a y la abreviatura 'mount /data' para montar por punto de montaje. Por qué importa: aquí es donde un UUID mal copiado, o una entrada de NFS sin nofail/_netdev para un servidor que ya no existe, convierte el siguiente reboot en modo de emergencia a las 4 a.m. Trampa: validar con mount -a parece suficiente, pero el arranque espera la red y los recursos con tiempos distintos; prueba siempre un reboot controlado tras cambiar fstab en un servidor de producción.",
    example: "Tras cambiar un disco de puerto, srv-fs-01 no arranca ('mount point does not exist' en emergency mode): corriges el UUID con blkid, agregas nofail a la entrada del NFS de respaldos, mount -a para validar y el reboot programado sale limpio."
  },
  {
    id: "seed-sa-inode",
    term: "inode",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Estructura del filesystem que guarda los metadatos de un archivo (permisos, dueño, tamaño, bloques); el nombre solo apunta a un número de inode.",
    longDefinition: "Cada archivo consume un inode: el nombre es solo una entrada de directorio apuntando a ese número, y varios nombres pueden apuntar al mismo inode (hard links). Por eso un disco puede estar 'lleno' con df -h al 40%: si se agotaron los inodes (df -i al 100%), típicamente por millones de archivos diminutos (sesiones PHP, colas de correo), no se puede crear nada más. También explica el clásico: borraste un archivo gigante que un proceso sigue teniendo abierto y el espacio no baja (se libera al cerrar/reiniciar el proceso, visible con lsof +L1). Por qué importa: 'df -h y df -i' es el dúo diagnóstico de todo 'No space left on device' que no lo parece.",
    example: "srv-app-01 lanza 'No space left on device' con df -h al 38%: df -i revela IUse% al 100% por 12 millones de archivos de sesión viejos en /var/lib/php/sessions; limpias con find -mtime +7 -delete y documentas el caso con la línea de diagnóstico."
  },
  {
    id: "seed-sa-ext4",
    term: "ext4",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "El sistema de archivos por defecto de muchas distros: journaling, maduro, redimensionable en caliente y sin sorpresas.",
    longDefinition: "ext4 diariza los cambios (journal) para recuperarse limpio de cortes de energía, soporta archivos enormes con extents, y se redimensiona en caliente con resize2fs sobre el LV. Es el caballo de batalla para raíz, /home y datos generales: compatible con todo el tooling (e2fsck, tune2fs, dumpe2fs, quotas). Por qué importa: por cada filesystem exótico que 'rendirá más', ext4 es el que no te despierta a las 3 a.m.; la mayoría de incidentes de storage que verás son de administración (lleno, inodes, permisos), no del FS en sí. Trampa: chattr +i (inmutable) en archivos de configuración es un candado útil hasta que un playbook falla con 'permission denied' sin razón visible; documentar siempre qué se dejó inmutable.",
    example: "Ticket 'no puedo subir archivos' en srv-files: df -h al 97% en /data (ext4 sobre el LV data-lv); haces lvextend -r +50G /dev/vg01/data, el filesystem crece en caliente sin desmontar y el upload vuelve al instante."
  },
  {
    id: "seed-sa-xfs",
    term: "XFS",
    acronym: "XFS",
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Filesystem de alto rendimiento, default de RHEL: excelente con archivos grandes y concurrencia, pero NO se puede reducir.",
    longDefinition: "XFS gestiona metadatos en paralelo y asigna por extents: muy bueno con cargas grandes y concurrentes (video, imágenes, colas de datos), con reparación con xfs_repair (siempre desmontado) y crecimiento en caliente con xfs_growfs. La limitación que define decisiones: no existe el shrink; achicar un XFS implica respaldar, recrear el filesystem y restaurar. Por qué importa: elegir XFS para un volumen que luego 'habría que encoger' es una deuda operativa permanente; y en servidores RHEL es el default que vas a administrar sí o sí. Trampa: por diseño XFS + xfs_repair nunca se corre montado (riesgo real de corrupción): el procedimiento correcto es boot de rescate o LV alternativo.",
    example: "Quieren meter 20 TB de video en un XFS que 'luego se achicaría' para darle espacio a otro LV: explicas que XFS no encoge, se redesigna el volumen nuevo y evitas el rediseño con 8 TB de datos ya dentro."
  },
  {
    id: "seed-sa-rpm-dpkg",
    term: "RPM y DPKG",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Formatos base de paquetería: RPM (familia RHEL/Fedora/SUSE) y DPKG (Debian/Ubuntu): instalan, consultan y verifican software local.",
    longDefinition: "RPM y DPKG son el nivel bajo de la paquetería: rpm -ivh/-e/-q y dpkg -i/-r/-L instalan, borran y listan contenido de paquetes; rpm -V verifica qué archivos de un paquete fueron modificados (ideal tras un incidente de seguridad) y dpkg -V es su equivalente. Lo que NO resuelven solos son dependencias: para eso están dnf/yum y apt. Por qué importa: en servidores sin repositorio o con software de vendor (agentes, drivers, HBA) terminarás instalando .rpm/.deb a mano y verificando su integridad y procedencia. Trampa: instalar un RPM fuera de repositorio genera duplicados y conflictos cuando el gestor formal actualice; se resuelve con repos internos (createrepo) y evitando el 'rpm -ivh de la carpeta de Descargas'.",
    example: "El agente de respaldo del vendor llega como .rpm a un server sin repos: rpm -ivh agente.rpm, rpm -qa para confirmar la instalación y rpm -V para verificar que ningún binario cambió tras el incidente de la semana pasada."
  },
  {
    id: "seed-sa-yum-dnf",
    term: "YUM / DNF",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Gestor de paquetes de la familia RHEL: resuelve dependencias contra repositorios, aplica updates y guarda historial de transacciones.",
    longDefinition: "yum (y su sucesor dnf) instala desde repositorios configurados en /etc/yum.repos.d, resuelve dependencias, valida firmas GPG y deja historial consultable con dnf history para deshacer transacciones completas. Cartera básica: install/update/info/search/repolist, update --security para parcheo dirigido, y versionlock para congelar versiones certificadas. Por qué importa: el parcheo mensual de servidores RHEL-like se planifica con estos comandos y ventanas de mantenimiento; el historial es tu tabla de salvación cuando un update rompe algo y necesitas deshacer. Trampa: yum clean all borra caché de metadatos (la próxima operación es lenta) y los repos de 'una app que instaló alguien' sin GPG validado son vector de incidente.",
    example: "Ventana de parches: dnf update --security -y con dnf versionlock en la versión certificada de PostgreSQL; la app reporta incompatibilidad y dnf history undo revierte la transacción completa en minutos."
  },
  {
    id: "seed-sa-apt",
    term: "APT",
    acronym: "APT",
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Gestor de paquetes de Debian/Ubuntu: apt update refresca índices y apt install/upgrade opera resolviendo dependencias contra los repos.",
    longDefinition: "apt update refresca los índices de paquetes, apt install/upgrade/remove operan resolviendo dependencias, apt policy muestra qué versiones hay y apt list --upgradable alimenta el plan de parcheo. La familia apt-get/apt-cache es la estable para scripts y apt la interactiva. Por qué importa: Ubuntu Server se parchea por aquí, y unattended-upgrades bien configurado es la diferencia entre una flota parcheada en seguridad y una granja de servidores vulnerables esperando el siguiente scan. Trampa: olvidar apt update tras cambiar sources.list hace que apt instale versiones viejas de los mirrors cacheados; y apt upgrade vs apt full-upgrade difieren en cómo tratan kernels y dependencias nuevas.",
    example: "Plan de parcheo de 20 servidores Ubuntu: apt list --upgradable alimenta la matriz de la ventana, apt upgrade en horario controlado y apt-mark hold en el kernel hasta validar el driver de la HBA con el equipo de storage."
  },
  {
    id: "seed-sa-sudoers",
    term: "sudoers",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Reglas de sudo (/etc/sudoers y /etc/sudoers.d/): quién puede ejecutar qué comandos como qué usuario, con o sin contraseña.",
    longDefinition: "sudoers es la fuente de verdad de la delegación en Linux: reglas de 'quién en qué hosts = (como quién) comandos', aliases para agrupar usuarios y comandos, y Defaults para opciones como requiretty o el log centralizado. SIEMPRE se edita con visudo (valida sintaxis antes de guardar) o se fragmenta en archivos de /etc/sudoers.d/ con permisos 0440. Por qué importa: bien hecho elimina la contraseña de root compartida: puedes dar al equipo de desarrollo exactamente 'systemctl restart miapp' sin shell y con log de quién hizo qué. Trampa: un alias con comodín o un NOPASSWD: ALL 'para que no moleste' escala a root instantáneo; y editar sudoers con un editor directo puede dejar el servidor sin sudo válido (queda la consola física o el modo rescate).",
    example: "El equipo app necesita reiniciar su API sin abrir tickets: creas /etc/sudoers.d/api con 'appdev ALL=(appsvc) NOPASSWD: /usr/bin/systemctl restart api', validas con visudo -c y los tickets de 'reiníciame el servicio' desaparecen."
  },
  {
    id: "seed-sa-pam",
    term: "PAM",
    acronym: "PAM",
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Pluggable Authentication Modules: el marco de Linux que encadena módulos de complejidad, bloqueo, sesiones e integración de dominio en login, sudo y sshd.",
    longDefinition: "PAM no autentica por sí mismo: cada servicio con archivo en /etc/pam.d/ (login, sudo, sshd) declara una pila de módulos con tipos auth/account/password/session y controles required/requisite/sufficient/optional. Ahí se decide la complejidad de contraseñas (pam_pwquality), el bloqueo por intentos (pam_faillock), límites de sesión y la integración con AD/LDAP vía sssd. Por qué importa: todo hardening de login en Linux pasa por PAM, y es exactamente lo que audita un benchmark CIS; leer la pila de sshd es leer por qué tu usuario entra (o no). Trampa: un módulo mal configurado puede dejar fuera hasta el root por consola; prueba cambios PAM con una sesión SSH abierta de respaldo antes de cerrar la actual.",
    example: "Tras aplicar la política de contraseñas del benchmark, nadie entra por SSH: pam_faillock bloqueó las cuentas por los reintentos del fin de semana; faillock --user appsvc --reset limpia el contador y se ajustan los umbrales con una sesión de respaldo abierta."
  },
  {
    id: "seed-sa-chroot",
    term: "chroot",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Cambia el directorio raíz de un proceso: lo encierra en una 'jaula' de archivos; base de entornos de rescate y servicios enjaulados.",
    longDefinition: "chroot /mnt hace que un proceso vea ese directorio como '/': con eso construyes jaulas para servicios o rescatas un sistema roto montando sus discos y entrando al chroot para reinstalar GRUB o resetear contraseñas. El uso de rescate es el que más vas a usar: ISO live + montaje + chroot + grub-install es el rito sagrado de los boots rotos. Por qué importa: entenderlo explica los límites del aislamiento (root clásico puede escapar de la jaula; para aislamiento real están los namespaces de contenedores). Trampa: dentro del chroot faltan /proc, /dev o /sys y todo falla con errores confusos; monta --bind /dev, /proc y /sys ANTES de entrar.",
    example: "srv-mail-01 con GRUB roto tras un corte eléctrico: booteas la ISO, montas el raíz en /mnt, montas /dev /proc /sys con --bind, chroot /mnt, grub-install y update-grub; reinicio limpio sin reinstalar nada."
  },
  {
    id: "seed-sa-bash",
    term: "Bash",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "La shell de Linux: lenguaje de scripting y entorno interactivo con pipes, variables, redirección y exit codes.",
    longDefinition: "Bash es donde vive el SysAdmin: tuberías (|), redirección (> archivo 2>&1), sustitución de comandos, loops, variables y set -euo pipefail para scripts que fallen a tiempo. El exit code ($?) es el contrato entre comandos y el resto del universo: &&, ||, systemd y los pipelines de CI se basan en él. Por qué importa: automatizar es bash primero y Ansible después; un one-liner bien construido resuelve en 30 segundos lo que por GUI toma una tarde. Trampa: scripts sin quoting correcto ('$var' vs $var) revientan justo con el archivo que tiene espacio en el nombre, y los scripts heredados rara vez traen set -e ni validación de argumentos.",
    example: "Incidente 'no sé qué llena /var/log': un one-liner con du -sh /var/log/* | sort -h | tail -5 revela un debug.log de 40 GB; lo truncas con > debug.log y dejas la rotación configurada con logrotate para que no repita."
  },
  {
    id: "seed-sa-awk",
    term: "awk",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Procesador de texto por columnas y patrones: parte cada línea en campos ($1, $2...) y filtra, calcula y formatea lo que grep no puede.",
    longDefinition: "awk recorre un flujo línea a línea, la divide en campos según separador (-F:) y ejecuta acciones por patrón: sumar columnas, filtrar y formatear. Cartera básica: awk '{print $1}' para primeras columnas, df -h | awk 'NR>1 {print $5, $6}' para uso por punto de montaje, y sumas tipo awk '{s+=$3} END {print s}'. Por qué importa: el 80% de los reportes 'urgentes' de capacidad son un awk sobre la salida de un comando; es la navaja entre grep (filtra líneas) y awk (filtra y transforma columnas). Trampa: los índices de campo cambian al usar -F, NR empieza en 1 (NR>1 salta headers) y los decimales con coma del locale rompen sumas silenciosamente: LC_ALL=C primero.",
    example: "Reporte exprés de consumo: ps aux --sort=-%mem | awk 'NR<=11 {print $1, $4\"%\", $11}' entrega el top 10 de memoria en una línea y va directo al ticket como evidencia inicial."
  },
  {
    id: "seed-sa-sed",
    term: "sed",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Editor de flujos: reemplaza, inserta y borra texto en archivos y pipes sin abrirlos (sed 's/viejo/nuevo/g archivo').",
    longDefinition: "sed aplica comandos de edición línea a línea: s/viejo/nuevo/g para sustituir, -i para editar el archivo en sitio (con -i.bak para dejar respaldo), /patrón/d para borrar líneas y 1d/$d para extremos. Es el estándar para cambiar configuraciones en masa: comentar una línea, cambiar un puerto en 200 nginx.conf o limpiar comentarios de un archivo. Por qué importa: cambios repetibles en 50 servidores sin abrir vi; combinado con find -exec o xargs es una campaña de configuración en una línea. Trampa: sin -i solo muestra el resultado (útil para probar), con -i y sin backup no hay vuelta atrás; y los caracteres especiales del patrón se escapan o se cambia el delimitador (s|ruta|nueva|g).",
    example: "Hay que apuntar 200 servidores al repo espejo: sed -i.bak 's|repo.viejo.com|repo.espejo.int|g' /etc/yum.repos.d/*.repo, validas con diff y el .bak salva la noche si un repo no cuadra."
  },
  {
    id: "seed-sa-grep",
    term: "grep",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Busca patrones en texto: -r recursivo, -i ignora mayúsculas, -v invierte, -E regex extendidas, -c cuenta, -A/-B/-C contexto.",
    longDefinition: "grep es el comando más usado del oficio: filtra la salida de cualquier comando o busca en árboles de archivos con -rn. Combinaciones diarias: journalctl -u nginx | grep -i error, grep -E '(sshd|CRON)' /var/log/auth.log, grep -c para contar y grep -C 3 para ver el contexto alrededor del match. Por qué importa: el diagnóstico en servidores es 80% 'encuentra la aguja en el log'; dominar grep (y zgrep para logs rotados comprimidos) multiplica tu velocidad de respuesta. Trampa: buscar 'FAIL' cuando el log dice 'FAILED', regex sin escapar y logs rotados comprimidos que grep plano no ve: usa -i, comillas correctas y zgrep.",
    example: "'El SSH está raro desde ayer': grep 'Accepted' /var/log/secure | awk '{print $3}' | sort | uniq -c | sort -rn revela 400 logins de un usuario retirado; ticket a seguridad con evidencia en 5 minutos."
  },
  {
    id: "seed-sa-top-htop",
    term: "top y htop",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Monitores de procesos en consola: top viene en todo Linux; htop agrega árbol de procesos, colores, ordenamiento y kill interactivo.",
    longDefinition: "top muestra CPU por proceso con el resumen arriba: load average, %us (usuario), %sy (sistema), %wa (iowait, el que delata disco saturado) y memoria con buff/cache. htop hace lo mismo usable: F5 árbol de procesos (quién es hijo de quién), F6 ordenar por columna y F9 kill con señal elegida. Por qué importa: es la primera pantalla que abres cuando 'el server va lento': distingue CPU (procesos rojos arriba) de disco (iowait alto, procesos en estado D) de RAM (swap creciendo). Trampa: el load average cuenta también procesos en D (esperando IO): 'load 40 con CPU idle' significa disco o NFS colgado, no falta de procesador.",
    example: "Ticket 'la app está lenta': htop en srv-app-03 muestra iowait al 45% y procesos en D; el problema es el datastore lento y no la app; escalas a storage con la captura como evidencia."
  },
  {
    id: "seed-sa-vmstat-iostat-sar",
    term: "vmstat, iostat y sar",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Trío de diagnóstico: vmstat (memoria, swap, CPU por segundo), iostat (rendimiento por disco) y sar (series históricas del paquete sysstat).",
    longDefinition: "vmstat 1 imprime por segundo: r/b (procesos corriendo/bloqueados), si/so (swap in/out) y las columnas de CPU con id/wa; b alto con wa alto es cuello de botella de disco. iostat -x 1 agrega por dispositivo: %util (ocupación) y await (latencia en ms) son los números que storage te va a pedir. sar es la historia: sysstat guarda series (sar -u CPU, sar -d discos, sar -r memoria) para responder '¿desde cuándo?' sin monitoreo externo. Por qué importa: son la evidencia estándar en tickets de rendimiento; distinguir CPU vs IO vs RAM en 60 segundos evita semanas de idas y vueltas. Trampa: sysstat suele venir deshabilitado: actívalo y deja que acumule historia ANTES del próximo incidente.",
    example: "Reclaman 'el server está lento desde el viernes': sar -u muestra el %iowait saltando de 2 a 38 el viernes 14:00, iostat -x señala un disco con await de 90 ms: la evidencia soporta el reemplazo del disco en la próxima ventana."
  },
  {
    id: "seed-sa-nice-renice",
    term: "nice y renice",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Prioridades de CPU de procesos: nice al lanzarlos y renice en caliente; rango -20 (máxima) a +19 (mínima), 0 por defecto.",
    longDefinition: "El scheduler reparte CPU según prioridad: nice -n 10 ./respaldo.sh lanza el trabajo con prioridad baja y renice -n 5 -p 1234 ajusta un proceso vivo sin matarlo. Valores negativos requieren root. Por qué importa: es la forma correcta de correr trabajos pesados (respaldos, compresión, reindexados) en horas de producción sin que el usuario lo note; y en emergencia, subir la prioridad del proceso crítico en un server saturado compra minutos. Trampa: nice solo afecta CPU, no IO ni locks: si el cuello es disco, renice es un placebo; y 'renice' a procesos en estado D no hace nada hasta que liberen el IO.",
    example: "Un pg_dump diurno degrada la facturación: lo relanzas con nice -n 15 y en la crontab queda 'nice -n 15 pg_dump ...'; la queja de lentitud desaparece y el backup conserva su ventana."
  },
  {
    id: "seed-sa-oom-killer",
    term: "OOM killer",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Mecanismo del kernel que, al agotarse la RAM y el swap, mata el proceso con mayor oom_score para salvar el sistema.",
    longDefinition: "Cuando la memoria libre se agota, el kernel elige víctima por oom_score (tamaño del proceso más el ajuste oom_score_adj) y la mata con SIGKILL: no es un crash del proceso, es el kernel ejecutándolo. Se confirma en dmesg/journalctl como 'Out of memory: Killed process 4321 (java)' y cada proceso muestra su riesgo en /proc/PID/oom_score. Por qué importa: explica el clásico 'el proceso desaparece sin core ni log de error'; con systemd puedes marcar MemoryMax u OOMScoreAdjust para que el killer respete a los críticos. Trampa: culpar al OOM killer sin ver que el swap estaba lleno desde hace horas (vmstat si/so sostenido) es tratar el síntoma y no el memory leak de la app.",
    example: "Tomcat 'se cae' cada domingo a las 3 a.m. sin rastro en sus logs: journalctl -k | grep -i 'killed process' muestra al OOM killer ejecutando a java; ajustas MemoryMax en la unit y el fix de fondo es el leak del despliegue nuevo."
  },
  {
    id: "seed-sa-swappiness",
    term: "swappiness",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Parámetro del kernel (vm.swappiness 0-100) que define qué tan agresivamente mueve páginas de RAM a swap.",
    longDefinition: "vm.swappiness equilibra entre liberar page cache y usar swap: valor alto (60, default) swapea con gusto (tolerable en laptops, pésimo en bases de datos) y valor bajo (1-10) forcejea antes de tocar disco. Se ajusta en caliente con sysctl vm.swappiness=10 y se persiste en /etc/sysctl.d/. Por qué importa: en un servidor de base de datos el swap es veneno para la latencia (una página de índice en disco son milisegundos extra) y un swappiness alto produce 'lentitud sin CPU ni IO altos', el caso más difícil de diagnosticar. Trampa: 0 no significa 'nunca swap' (el kernel sigue evitando el OOM bajo presión extrema) y cambiarlo sin medir si/so con vmstat es adivinar.",
    example: "MySQL con latencias de 200 ms 'sin causa': vmstat 1 muestra si/so sostenido y el swap apenas usado; sysctl vm.swappiness=1 y restart en ventana: las latencias vuelven a 4 ms y queda documentado en el ticket."
  },
  {
    id: "seed-sa-proc",
    term: "/proc",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Filesystem virtual con información viva del kernel: /proc/PID/ por proceso, más meminfo, cpuinfo, loadavg, mounts y sys.",
    longDefinition: "/proc no está en disco: lo genera el kernel al vuelo. Ahí viven /proc/meminfo (lo que lee free), /proc/cpuinfo (lscpu), /proc/loadavg, /proc/mounts, /proc/sys (editable en caliente: echo 1 > /proc/sys/... es lo que automatiza sysctl) y /proc/PID/ con cmdline, environ, fd/, limits y oom_score. Por qué importa: es la fuente de la que beben top, ps y todo el tooling; y en incidentes, la inspección directa (ls -l /proc/1234/fd para ver qué archivos tiene abiertos un proceso) responde lo que ningún comando empaquetado. Trampa: es lectura viva: dos cat seguidos dan números distintos, y colgarse de un valor instantáneo sin historia es diagnóstico débil.",
    example: "'Borré un log de 30 GB y el df no baja': ls -l /proc/$(pidof rsyslogd)/fd muestra el archivo deleted todavía abierto; systemctl restart rsyslogd libera el espacio y el truco queda documentado en el runbook."
  },
  {
    id: "seed-sa-sys-fs",
    term: "/sys",
    acronym: undefined,
    category: "SysAdmin - Linux / Unix",
    shortDefinition: "Filesystem virtual (sysfs) del kernel con el árbol de dispositivos: buses, discos, NICs y parámetros de drivers como archivos.",
    longDefinition: "/sys modela el hardware y sus drivers: dispositivos por bus, atributos legibles y a veces editables; de ahí beben udevadm y lsblk (identidad de discos), y viven parámetros útiles como /sys/block/sdX/queue/scheduler para cambiar el IO scheduler en caliente. Por qué importa: cuando 'el disco no aparece' o una NIC cambió de nombre (eth0 a ens192 tras un upgrade), /sys es la fuente de verdad de qué ve el kernel; el nombre predictivo de interfaces se entiende leyéndolo. Trampa: escribir valores en /sys sin conocer rangos puede tumbar un dispositivo hasta el próximo reboot; los cambios por /sys no persisten: se documentan y se persisten con reglas de udev o sysctl.",
    example: "Tras parchar el hipervisor una NIC pasó de eth0 a ens192: confirmas en /sys/class/net/, actualizas la configuración de red y persistes una regla de udev con la MAC para que el próximo parche no repita el susto."
  },
  {
    id: "seed-sa-gpo",
    term: "GPO",
    acronym: "GPO",
    category: "SysAdmin - Windows Server",
    shortDefinition: "Group Policy Objects: directivas de dominio que imponen configuración (seguridad, scripts, restricciones, software) a usuarios y equipos de AD.",
    longDefinition: "Una GPO es un conjunto de configuraciones ligadas a sitio, dominio u OU de Active Directory; el cliente de directivas la procesa en el boot/logon y cada 90 min aprox, con gpupdate /force para forzar y gpresult /r para ver cuáles aplicaron y cuáles quedaron filtradas. GPMC es la consola de diseño, con herencia, Block Inheritance y la opción Enforced para forzar desde arriba. Por qué importa: es EL mecanismo de gestión de flota Windows: hardening, mapeo de unidades, firewall, políticas de contraseñas finas y despliegue de configuración sin tocar equipo por equipo. Trampa clásica: 'la GPO no aplica' suele ser (1) el equipo en la OU equivocada, (2) security filtering que excluye al usuario/grupo, o (3) replicación SYSVOL rota entre DCs; gpresult /h report.html lo revela.",
    example: "Usuario reporta que no le mapea la unidad de contabilidad: gpresult /r muestra la GPO 'MAP-CONTAB' como filtered/not applied porque su cuenta no está en el grupo correcto; lo agregas, gpupdate /force y la unidad aparece al instante."
  },
  {
    id: "seed-sa-wsus",
    term: "WSUS",
    acronym: "WSUS",
    category: "SysAdmin - Windows Server",
    shortDefinition: "Windows Server Update Services: servidor de parches del dominio que descarga updates una vez, los aprueba y los distribuye a la flota.",
    longDefinition: "WSUS centraliza el parcheo de Windows: sincroniza contra Microsoft Update, el administrador aprueba o declina cada actualización por grupo de computadores, y los clientes se apuntan al servidor por GPO con horarios de detección e instalación. Por qué importa: ahorra ancho de banda (una descarga para 800 equipos), da control real de qué entra (validación en piloto) y reporta cumplimiento por equipo: la evidencia típica de una campaña de parcheo. Trampa: WSUS descuidado acumula updates obsoletos y la base SUSDB crece hasta degradar la consola; el cleanup wizard y la reindexación son mantenimiento mensual, no opcional, o 'parchar la flota' se vuelve imposible.",
    example: "Campaña de parcheo del mes: apruebas en WSUS primero el grupo 'Piloto', 72 horas sin incidentes, apruebas 'Producción' y el reporte de compliance (updates needed = 0) queda adjunto como evidencia del cambio."
  },
  {
    id: "seed-sa-sccm",
    term: "SCCM / MECM",
    acronym: undefined,
    category: "SysAdmin - Windows Server",
    shortDefinition: "Microsoft Endpoint Configuration Manager: plataforma de gestión de flota con inventario, despliegue de software y parches, imaging (OSD) y control remoto.",
    longDefinition: "SCCM (hoy MECM) va mucho más allá de WSUS: inventario hardware/software, distribución de aplicaciones y paquetes, secuencias de tareas OSD para imaging, parcheo con maintenance windows, baselines de cumplimiento y control remoto, todo con agentes en los equipos y boundaries que definen sitios y distribution points. Por qué importa: en empresas Windows es el estándar de facto: buena parte del trabajo de flota se expresa en colecciones, deployments y ventanas de mantenimiento con reportes de éxito/fallo por equipo. Trampa: las maintenance windows del cliente mandan sobre tu calendario (un despliegue que 'corrió a medianoche solo' es la window mal configurada) y las colecciones demasiado dinámicas revientan la evaluación de membresías.",
    example: "Despliegue del agente VPN a 600 equipos: colección 'All Windows 11 - Bogota', deployment con ventana 22:00-02:00 y deadline escalonado; el reporte de éxito por distribution point alimenta el acta del cambio."
  },
  {
    id: "seed-sa-powershell-remoting",
    term: "PowerShell remoting",
    acronym: undefined,
    category: "SysAdmin - Windows Server",
    shortDefinition: "Ejecución de PowerShell en servidores remotos: Invoke-Command contra uno o cientos por WinRM, con resultados etiquetados por equipo.",
    longDefinition: "Invoke-Command -ComputerName srv01,srv02 -ScriptBlock { Get-Service } corre el mismo bloque en N servidores y devuelve objetos con PSComputerName para saber de quién es cada resultado; New-PSSession mantiene sesiones persistentes y Enter-PSSession abre una consola interactiva remota. Requiere WinRM habilitado y 5985/5986 abiertos. Por qué importa: es el músculo del admin de flota Windows: parchar, consultar, configurar y auditar 200 servidores desde un equipo, sin RDP uno por uno; es también el transporte de Ansible para Windows. Trampa: el double-hop (que el servidor remoto autentique contra un tercero, p. ej. un share) falla sin CredSSP o credenciales explícitas, y -ComputerName sin resolución de nombres falla de formas creativas.",
    example: "Hay que verificar un servicio en 40 servidores antes de la ventana: Invoke-Command sobre la lista de servers.txt con Get-Service devuelve la matriz completa en 10 segundos y va directa al ticket."
  },
  {
    id: "seed-sa-winrm",
    term: "WinRM",
    acronym: "WinRM",
    category: "SysAdmin - Windows Server",
    shortDefinition: "Windows Remote Management: el servicio de gestión remota (WS-Man sobre HTTP 5985 o HTTPS 5986) sobre el que corre PowerShell remoting.",
    longDefinition: "WinRM es el listener que acepta comandos remotos: se habilita con winrm quickconfig o por GPO, autentica con Kerberos (en dominio) o NTLM/certificados, y se audita con winrm enumerate winrm/config/listener. El puerto 5986 exige certificado y coincidencia del hostname (CN). Por qué importa: sin WinRM no hay Invoke-Command, ni Ansible para Windows, ni DSC: toda la automatización de flota Windows pasa por este servicio; habilitarlo por GPO de forma controlada es paso uno de cualquier proyecto de automatización. Trampa: la mezcla de TrustedHosts con Kerberos hace que funcione por IP pero no por nombre (o al revés) y confunde horas de diagnóstico: elige el modelo y documéntalo.",
    example: "Ansible no conecta a srv-web-05: Test-WSMan srv-web-05 falla y el enumerate muestra listener solo HTTP; habilitas HTTPS con certificado del dominio, abres 5986 en el firewall y el playbook pasa a verde."
  },
  {
    id: "seed-sa-rds-gateway",
    term: "RDS y RD Gateway",
    acronym: undefined,
    category: "SysAdmin - Windows Server",
    shortDefinition: "Remote Desktop Services a escala: granjas de sesiones/RemoteApp y RD Gateway para publicar escritorios y apps por HTTPS sin exponer el 3389.",
    longDefinition: "RDS arma colecciones donde los usuarios corren apps o escritorios completos en servidores: RD Connection Broker balancea y reconecta, RD Web Access da el portal y RD Gateway tuneliza RDP dentro de HTTPS (443) para no abrir 3389 al mundo. Por qué importa: es cómo se da acceso remoto a apps legacy sin VPN y con MFA, y es la pieza que auditan: el perímetro debe mostrar 443 al Gateway y nada de 3389 expuesto. Trampa: certificados desalineados entre Gateway/Broker/Web generan errores genéricos de conexión difíciles de rastrear; y sin límites de sesión por colección, los servidores llegan al 95% de RAM a las 9 a.m.",
    example: "Los comerciales necesitan la app de facturación desde casa: publicas la app como RemoteApp detrás del RD Gateway por 443, cierras el 3389 del perímetro y el acceso queda auditado por usuario."
  },
  {
    id: "seed-sa-sysinternals",
    term: "Sysinternals",
    acronym: undefined,
    category: "SysAdmin - Windows Server",
    shortDefinition: "Suite gratuita de Microsoft para diagnóstico profundo de Windows: Process Explorer, ProcMon, Autoruns, PsTools y compañía.",
    longDefinition: "Process Explorer muestra el árbol de procesos con DLLs y handles abiertos; ProcMon registra cada acceso a archivo, registro y red en tiempo real con filtros; Autoruns enumera todo lo que arranca con el sistema; PsExec/PsList/PsInfo operan equipos locales y remotos. Por qué importa: es el kit forense-diagnóstico del Windows Admin: 'no encuentra la DLL', 'acceso denegado que nadie pidió' y 'logon lento' se resuelven con ProcMon en minutos cuando el Event Viewer solo da pistas genéricas. Trampa: ProcMon genera millones de eventos en segundos: define filtros primero (por proceso y resultado) o te ahogas; y descarga solo desde la fuente oficial, porque circulan copias adulteradas.",
    example: "App custom lanza 'no encuentra la DLL' solo en producción: ProcMon filtrando por el nombre de la DLL y Result = NAME NOT FOUND revela que busca en C:\Temp\vendor que no existe en el server; la creas con permisos y el caso queda resuelto con evidencia."
  },
  {
    id: "seed-sa-task-scheduler",
    term: "Task Scheduler",
    acronym: undefined,
    category: "SysAdmin - Windows Server",
    shortDefinition: "El programador de tareas de Windows: ejecuta scripts y programas en horarios, al inicio o ante eventos, con historial auditable.",
    longDefinition: "Task Scheduler corre tareas con triggers (calendario, boot, logon, evento del visor), condiciones (solo con red, despertar el equipo), acciones (programa, script) y un historial de ejecuciones con resultado. Es el equivalente natural de cron en Windows y el corazón del mantenimiento nocturno: limpiezas, respaldos, reportes. Por qué importa: el '¿por qué no corrió?' se resuelve en el historial: última ejecución, código de resultado y el error del script. Trampa: las tareas configuradas 'solo si el usuario inició sesión' fallan de madrugada: en servidores va 'Run whether user is logged on or not'; y un resultado 0x1 casi siempre es script que corrió pero devolvió error (revísalo a mano).",
    example: "El reporte diario no llegó: Task Scheduler muestra 'could not be run' porque venció la contraseña de la cuenta de la tarea; la actualizas, Run manual exitoso y el vencimiento entra a la checklist de cuentas de servicio."
  },
  {
    id: "seed-sa-dfs",
    term: "DFS",
    acronym: "DFS",
    category: "SysAdmin - Windows Server",
    shortDefinition: "Distributed File System: namespaces de rutas lógicas (\\\\corp\\compartidos) y replicación DFS-R entre servidores de archivos.",
    longDefinition: "DFS Namesspaces publica una ruta lógica apuntando a varios servidores físicos: puedes migrar el backend sin tocar los mapeos de los usuarios; DFS-R replica el contenido entre servidores o sedes manteniéndolo sincronizado. Por qué importa: es la forma estándar de consolidar shares, balancear entre sedes y dar tolerancia a falla de un file server sin que el usuario lo note: la migración de file server se vuelve un cambio de target, no un proyecto de mapeos. Trampa: DFS-R no es respaldo (replica también el borrado y el cifrado de ransomware) y la caché de referrals del cliente hace que un cambio de target tarde en verse: dfsutil /pktflush cuando 'la mitad de los usuarios ve una cosa'.",
    example: "Migración del file server viejo al nuevo: publicas el share vía DFS, agregas el server nuevo como target, esperas la replicación, retiras el viejo del namespace y ningún usuario volvió a mapear nada."
  },
  {
    id: "seed-sa-failover-clustering",
    term: "Failover Clustering",
    acronym: undefined,
    category: "SysAdmin - Windows Server",
    shortDefinition: "Agrupa servidores Windows en alta disponibilidad: si un nodo cae, roles (SQL, file server, VMs) conmutan a otro nodo automáticamente.",
    longDefinition: "Un clúster de failover comparte un quórum (mayoría de votos que evita el split-brain) y recursos validados para conmutación: discos CSV, IP y nombre de red virtuales, y roles con dependencias y políticas de failback. Se administra con Failover Cluster Manager o PowerShell (Get-ClusterNode, Move-ClusterGroup). Por qué importa: es la HA nativa de Windows para SQL (FCI/AlwaysOn), file servers y Hyper-V: conocer el orden de conmutación y validar el post-failover antes de que pregunte el negocio es el trabajo. Trampa: los failovers nunca ensayados fallan justo cuando toca (disco de quórum, prioridades, dependencias): agenda failovers planeados como ensayo trimestral.",
    example: "Mantenimiento del nodo pasivo del clúster SQL: Move-ClusterGroup al nodo 2, parchas el nodo 1, failback en ventana; el acta incluye el tiempo de conmutación medido (18 segundos) para afinar la expectativa del negocio."
  },
  {
    id: "seed-sa-hci",
    term: "Hyperconverged (HCI)",
    acronym: "HCI",
    category: "SysAdmin - Windows Server",
    shortDefinition: "Infraestructura hiperconvergida: cómputo, almacenamiento y virtualización en los mismos nodos (Storage Spaces Direct, vSAN, Ceph), escalando horizontalmente.",
    longDefinition: "HCI apila servidores estándar repartiendo el storage por red entre nodos: S2D/CSV en Azure Stack HCI, vSAN en VMware, Ceph en Proxmox; cada VM consume del pool distribuido y la tolerancia a fallas la da la réplica entre nodos. Se escala agregando nodos, no comprando un SAN aparte. Por qué importa: simplifica el ciclo de vida (un stack que parchear, una consola) y es el destino típico de la migración de SAN + hipervisores separados; el refresh se planea por nodos. Trampa: la red ES el storage: sin 10 GbE+ (y RDMA donde toque) el rendimiento se desploma; y agregar un nodo no es plug-and-play de capacidad: el rebalanceo puede tardar días.",
    example: "Crecimiento del clúster HCI de 3 a 5 nodos: compras validadas contra la HCL del vendor, el pool pasa de 60 a 96 TB, programas el rebalanceo para la madrugada y documentas el fin del riesgo de single-SAN."
  },
  {
    id: "seed-sa-vss",
    term: "VSS (Shadow Copy)",
    acronym: "VSS",
    category: "SysAdmin - Windows Server",
    shortDefinition: "Volume Shadow Copy Service: snapshots consistentes de volúmenes en uso; la base de 'Versiones anteriores' y de los respaldos de archivos abiertos.",
    longDefinition: "VSS coordina escritores (SQL, Exchange, apps) y proveedores para congelar un instante del volumen y respaldarlo aunque los archivos estén abiertos: los respaldos de Windows y Veeam en modo software se apoyan en él, y 'Previous Versions' es su cara visible para el usuario. Por qué importa: sin snapshot consistente, respaldar una base en caliente produce un archivo corrupto que se descubre justo el día del restore, el peor momento posible. Trampa: los shadows tienen cuota propia, viven en el mismo volumen (no son respaldo) y un writer en estado failed (vssadmin list writers) hace fallar los respaldos en cadena hasta reiniciar el servicio o el writer.",
    example: "Usuario borra una carpeta del share a las 10:00: restauras desde Versiones anteriores (shadow de las 07:00) en dos minutos; incidente resuelto y el backup nocturno sigue siendo la red de seguridad documentada."
  },
  {
    id: "seed-sa-dns",
    term: "DNS",
    acronym: "DNS",
    category: "SysAdmin - Redes & Firewalls",
    shortDefinition: "Domain Name System: traduce nombres a IPs y al revés mediante zonas, registros (A, CNAME, MX, SRV, PTR) y resolvers con caché y TTL.",
    longDefinition: "El DNS es la agenda de la red: el cliente pregunta a un resolver recursivo (con caché y TTL) que consulta a los autoritativos de cada zona. El SysAdmin administra zonas internas, el DNS de AD (registros SRV que hacen funcionar el login del dominio), split-DNS (nombre interno vs público), forwarders y delegaciones. Por qué importa: una gran parte de los 'no funciona' son DNS: login de AD lento, la web interna que no abre, correos que rebotan y balanceadores que mandan a la IP equivocada. Trampa: el TTL manda: cambiar un registro sin bajar el TTL horas antes hace que los clientes sigan a la IP vieja 'sin razón' (ipconfig /flushdns, resolvectl flush-caches para acelerar en los críticos).",
    example: "Tras migrar intranet al server nuevo, media flota aún cae al viejo: el registro A tenía TTL de 8 horas; esperas la expiración con flush de caché en los críticos y dejas el TTL en 300 para el próximo cambio."
  },
  {
    id: "seed-sa-dhcp",
    term: "DHCP",
    acronym: "DHCP",
    category: "SysAdmin - Redes & Firewalls",
    shortDefinition: "Asigna IP, máscara, gateway, DNS y opciones a los clientes dinámicamente mediante leases (concesiones) con renovación y reserva por MAC.",
    longDefinition: "El flujo DHCPDISCOVER/OFFER/REQUEST/ACK entrega un lease con duración y tiempos de renovación (T1/T2). El SysAdmin administra scopes (rangos), exclusiones, reservas por MAC para impresoras y equipos críticos, opciones (router, DNS, TFTP) y relays entre VLANs. Por qué importa: un scope agotado o una opción mal seteada tumba el acceso a red de cientos de equipos a la vez, y la IP 169.254.x.x (APIPA) delata que nadie respondió. Trampa: dos servidores respondiendo en el mismo segmento (un router doméstico conectado a la red corporativa) provoca IPs imposibles e intermitencia difícil de cazar: los alertas de 'conflicto' y el dhcp Snooping/port security son tus amigos.",
    example: "Ronda de la mañana: 30 equipos sin red en planta 2; el reporte del DHCP muestra el scope PLANTA2 al 100% consumido por dispositivos móviles; amplías el rango, dejas exclusión para estáticas y configuras alerta al 85%."
  },
  {
    id: "seed-sa-vlan",
    term: "VLAN",
    acronym: "VLAN",
    category: "SysAdmin - Redes & Firewalls",
    shortDefinition: "Segmentación lógica de la red: una LAN física se divide en VLANs numeradas con dominios de broadcast propios, aisladas hasta que un router las conecte.",
    longDefinition: "Cada VLAN es un dominio de broadcast aparte: los puertos del switch se configuran como access (una VLAN, sin etiqueta) o trunk (todas, etiquetadas 802.1Q). El ruteo inter-VLAN lo hace un switch L3 (SVIs) o el firewall con subinterfaces, y ahí aplican las ACLs. Por qué importa: separar producción, administración, invitados y VoIP reduce riesgo y ruido de broadcast; y el 90% de los 'no hay red tras mudanza de puesto' son puertos en VLAN distinta a la esperada. Trampa: la native VLAN del trunk debe coincidir en ambos extremos y no debe ser la de administración; y sin documentar el mapa puerto-VLAN, cada mudanza se vuelve sondeo.",
    example: "El nuevo puesto de caja no ve el POS: el puerto del patch quedó en VLAN 30 (invitados) en vez de la 10 (POS); lo corriges, actualizas el mapa puerto-VLAN del switch y el punto queda en línea."
  },
  {
    id: "seed-sa-vpn-s2s",
    term: "VPN site-to-site",
    acronym: undefined,
    category: "SysAdmin - Redes & Firewalls",
    shortDefinition: "Túnel permanente entre dos redes (sede-sede o sede-cloud) que viaja cifrado por Internet: IPsec o WireGuard entre firewalls/routers.",
    longDefinition: "Un site-to-site enlaza dos LANs como si fueran una: las rutas de A apuntan al túnel para alcanzar B (interesting traffic o selectors de fase 2), con IKEv2/IPsec o WireGuard y renegociación automática. A diferencia del acceso remoto, no hay cliente por usuario: hay subredes hablando. Por qué importa: conecta sedes, DRP y VPCs de cloud; cuando el túnel cae, ambas sedes siguen con Internet pero sin verse entre sí, y media empresa deja de trabajar: es incidente P1 aunque 'el Internet funcione'. Trampa: Phase 1 up / Phase 2 down es la falla típica (mismatch de subredes en los selectors tras un cambio de red) y el MTU del túnel provoca 'el ping pasa pero la aplicación no' por fragmentación.",
    example: "Sede Medellín 'sin acceso al ERP de Bogotá': el dashboard del firewall muestra tunnel up pero fase 2 inactiva por un cambio de subred local; actualizas los selectors y el túnel renegocia sin reiniciar nada."
  },
  {
    id: "seed-sa-firewall",
    term: "Firewall",
    acronym: undefined,
    category: "SysAdmin - Redes & Firewalls",
    shortDefinition: "Filtra tráfico entre zonas de confianza por reglas de 5-tupla (IPs, puertos, protocolo) con seguimiento de estado y deny implícito al final.",
    longDefinition: "Los firewalls modernos son stateful: además de la regla, siguen el estado de la conexión para dejar volver las respuestas; las reglas se evalúan de arriba abajo, la primera coincidencia gana y lo no permitido se deniega. El SysAdmin lo gestiona en capas: perímetro, segmentación interna y firewall de host (ufw/firewalld/Windows Defender Firewall). Por qué importa: cada puerto abierto es superficie de ataque y cada regla vieja es deuda: el hardening de red incluye cazar reglas ANY, documentar el porqué de cada apertura y darle vencimiento a lo temporal. Trampa: la regla amplia 'para que no moleste' sobrevive años; usa contadores de hits, nombres descriptivos y revisión periódica de lo que nunca matchea.",
    example: "El proveedor 'no ve' el servicio publicado: la regla permitía desde su IP vieja; actualizas el objeto de red a la nueva IP, verificas el hit count creciente y registras el cambio con ticket y fecha de revisión."
  },
  {
    id: "seed-sa-nftables",
    term: "nftables",
    acronym: undefined,
    category: "SysAdmin - Redes & Firewalls",
    shortDefinition: "El sucesor de iptables en Linux: filtrado unificado con tablas, cadenas y sets con nombre, mejor rendimiento y reglas legibles.",
    longDefinition: "nftables unifica IPv4/IPv6, ARP y bridge en un solo framework: reglas declarativas en cadenas con hooks (input/output/forward) organizadas en tablas (filter, nat) y sets con nombre para agrupar IPs, que son más legibles y rápidos que cadenas de iptables. Se consulta con nft list ruleset y se persiste en /etc/nftables.conf aplicándolo con nft -f. Por qué importa: es el firewall nativo del Linux moderno (RHEL 9, Debian, Ubuntu): aunque uses ufw o firewalld encima, todo termina en nftables, y saber leerlo te permite auditar qué está realmente filtrado. Trampa: mezclar reglas legacy de iptables con nft en el mismo kernel genera sorpresas: elige un stack y documenta; y las reglas sin counter no dejan evidencia de tráfico para auditoría.",
    example: "Auditoría de puertos en srv-app-01: nft list ruleset muestra la cadena input con policy accept y reglas heredadas de años; documentas, ordenas y dejas policy drop con reglas explícitas con counters para la próxima auditoría."
  },
  {
    id: "seed-sa-ufw",
    term: "ufw",
    acronym: undefined,
    category: "SysAdmin - Redes & Firewalls",
    shortDefinition: "Uncomplicated Firewall: frontend amigable sobre nftables/iptables en Ubuntu: ufw allow/deny, reglas numeradas y status verbose.",
    longDefinition: "ufw simplifica el firewall de host: ufw default deny incoming, ufw allow from 10.10.0.0/24 to any port 22 proto tcp, ufw enable y ufw status verbose; soporta perfiles por aplicación (ufw allow OpenSSH), comentarios y reglas numeradas para borrar (ufw delete 3). Por qué importa: es la barrera mínima esperada en hardening de servidores Ubuntu: 'ufw inactivo' en producción es hallazgo de auditoría seguro; y su sintaxis directa es ideal para dejar reglas declaradas y legibles en el runbook del server. Trampa: ufw enable por SSH sin haber permitido el 22 te desconecta a ti mismo; y un allow de puerto abierto al mundo duerme años si nadie revisa los status verbose.",
    example: "Hardening de srv-db-01: ufw allow from 10.20.1.0/24 to any port 5432 comment 'apps a PostgreSQL', default deny, enable; las apps conectan y el escaneo externo ya no ve el 5432."
  },
  {
    id: "seed-sa-stp",
    term: "STP",
    acronym: "STP",
    category: "SysAdmin - Redes & Firewalls",
    shortDefinition: "Spanning Tree Protocol: bloquea los enlaces redundantes entre switches para evitar bucles de broadcast y los libera si el activo cae.",
    longDefinition: "Con dos caminos entre switches, un broadcast circula para siempre (broadcast storm) y tumba la red: STP elige un root bridge y bloquea los puertos redundantes, pasándolos a forwarding si el activo falla (convergencia de segundos con RSTP). Por qué importa: la redundancia de enlaces se diseña confiando en STP; y un loop no controlado (un cable de vuelta en un switch de escritorio) satura el edificio en minutos: BPDU guard en los puertos de acceso aísla al responsable. Trampa: elegir root bridge por 'suerte' (el de menor MAC) genera topologías absurdas: fija el root y el backup con prioridad; y los microbloqueos por renegotiaciones se ven como 'la red se congela un rato'.",
    example: "La red 'se congela' cada tarde en planta: un usuario conectó dos puertos de un switch pequeño con un cable; el BPDU guard del puerto de acceso apaga ese puerto solo, documentas y activas storm-control en los trunks."
  },
  {
    id: "seed-sa-trunk",
    term: "Trunk 802.1Q",
    acronym: undefined,
    category: "SysAdmin - Redes & Firewalls",
    shortDefinition: "Enlace que transporta varias VLANs etiquetadas con su ID por una sola conexión física: el esqueleto entre switches, routers y firewalls.",
    longDefinition: "Un trunk añade una etiqueta de 4 bytes con el VLAN ID a cada frame para que el otro extremo sepa a qué VLAN pertenece; los puertos access entregan frames sin etiqueta a los equipos finales, y la native VLAN viaja sin etiquetar (debe coincidir en ambos extremos). Por qué importa: toda red segmentada vive de trunks: switch-switch, switch-firewall (router-on-a-stick o subinterfaces por VLAN) e hipervisores con VLAN tagging virtual. Trampa: las allowed VLANs desalineadas entre tramos generan 'funciona en un piso y no en otro' (a la VLAN 30 le falta permit en un switch intermedio); y usar la VLAN nativa para administración por el trunk es mala práctica documentada.",
    example: "El piso 3 no ve la red de impresión: el trunk hacia ese switch permite 10,20 pero la 30 quedó fuera en un extremo; la agregas a los allowed, el trunk se renegocia y las impresoras responden."
  },
  {
    id: "seed-sa-port-channel",
    term: "Port-channel (LACP)",
    acronym: "LACP",
    category: "SysAdmin - Redes & Firewalls",
    shortDefinition: "Agrega varios enlaces físicos en uno lógico (EtherChannel/bond) negociado por LACP: más ancho de banda y redundancia sin que STP bloquee.",
    longDefinition: "LACP negocia entre ambos extremos la agregación: dos o cuatro puertos forman un port-channel con reparto por hash de flujo (src-dst-ip), y si un miembro falla el canal sigue con los restantes; en Linux su equivalente es el bonding mode 802.3ad. Por qué importa: los uplinks entre switches y hacia hipervisores y servidores de respaldo van siempre en port-channel: duplicas capacidad y toleras la falla de un puerto o SFP sin convergencia de STP. Trampa: el reparto es por flujo, no por paquete: una sola sesión nunca supera el ancho de un miembro (el backup de un solo hilo no acelera solo por agregar puertos) y los parámetros (active/passive, hash) deben coincidir o el canal queda suspended.",
    example: "El backup nocturno satura el uplink de 1 Gb: creas un port-channel de 2x1 Gb (LACP active) entre el switch y el server de respaldo; el canal sube (Po1 SU) y la ventana de respaldo baja de 9 a 4 horas."
  },
  {
    id: "seed-sa-acl",
    term: "ACL",
    acronym: "ACL",
    category: "SysAdmin - Redes & Firewalls",
    shortDefinition: "Listas de control de acceso: reglas permit/deny evaluadas en orden; en redes filtran tráfico por interfaz/VLAN y en Linux extienden permisos de archivos.",
    longDefinition: "En redes, las ACLs (numeradas o nombradas) se aplican a interfaces o SVIs y filtran por origen/destino/puerto, evaluando de arriba abajo con deny implícito; en los filesystems Linux, las ACLs POSIX (getfacl/setfacl) extienden el rwx tradicional con permisos por usuario o grupo específico. Por qué importa: es el mecanismo con el que se materializa la segmentación ('la VLAN de desarrollo solo habla 443 con la de servicios') y el modo fino de dar acceso puntual a un archivo sin romper el modelo de grupos. Trampa: ACL de red sin logging no sabes si hizo match; y las ACLs de archivo se pierden con cp/tar mal usados: respáldalas con getfacl -R.",
    example: "Auditoría exige que desarrollo no llegue a producción: ACL en la SVI de la VLAN 50 que deniega hacia 10.30.0.0/16 y permite el resto; el log de la ACL muestra los intentos y el hallazgo queda cerrado con evidencia."
  },
  {
    id: "seed-sa-nat-pat",
    term: "NAT y PAT",
    acronym: "NAT",
    category: "SysAdmin - Redes & Firewalls",
    shortDefinition: "Network Address Translation: reescribir IP/puerto del paquete; PAT/NAT overload para salir con una IP pública y DNAT para publicar servicios.",
    longDefinition: "SNAT/PAT traduce muchas IPs privadas a una pública usando una tabla de puertos; DNAT (port forwarding) publica un servicio interno cambiando el destino del paquete; el firewall registra las traducciones activas (tabla xlate/conntrack). Por qué importa: casi toda comunicación hacia y desde Internet pasa por NAT: cada publicación de servicio es una regla DNAT, y las tablas de conexiones son la evidencia para saber si un flujo llega y si vuelve. Trampa: el hairpin (acceder desde dentro a la IP pública propia) exige regla específica o falla 'solo desde la oficina'; y la tabla conntrack llena produce Internet intermitente sin nada caído aparente.",
    example: "El nuevo sistema del proveedor debe verse desde Internet: publicas DNAT 203.0.113.5:8443 hacia 10.20.1.15:443, verificas en la tabla de conexiones que los flujos se crean y solo entonces entregas la URL."
  },
  {
    id: "seed-sa-snmp",
    term: "SNMP",
    acronym: "SNMP",
    category: "SysAdmin - Redes & Firewalls",
    shortDefinition: "Protocolo de monitoreo estándar: los dispositivos exponen OIDs (tráfico, puertos, temperatura) que Zabbix/LibreNMS consultan, o emiten traps.",
    longDefinition: "SNMPv2c/v3 permite leer contadores (ifHCInOctets, ocupación de disco, temperatura) con GET/GETBULK walks, recibir traps como eventos push y hasta escribir valores; v3 añade autenticación y cifrado, mientras v2c solo usa community strings. Por qué importa: es la lengua franca con la que tu plataforma de monitoreo ve switches, APs, UPS y NAS que no corren agentes: sin SNMP hay ciego... hay tablero parcial y los incidentes de red se enteran por el usuario. Trampa: community 'public' en producción es hallazgo de auditoría clásico; y leer contadores de 32 bits en interfaces rápidas genera gráficas absurdas: usa los contadores HC de 64 bits y v3.",
    example: "Nadie monitorea el switch de planta: activas SNMPv3 (authPriv) con credenciales en el Zabbix, importas la plantilla del modelo y en una hora tienes puertos, tráfico y temperatura con historia."
  },
  {
    id: "seed-sa-ntp",
    term: "NTP",
    acronym: "NTP",
    category: "SysAdmin - Redes & Firewalls",
    shortDefinition: "Network Time Protocol: sincroniza los relojes de la red contra fuentes confiables; sin hora común no hay logs correlacionables ni Kerberos.",
    longDefinition: "NTP mantiene los relojes con precisión de milisegundos mediante una jerarquía de strata: tus servidores sincronizan contra fuentes válidas (el DC con el rol PDC emulator para AD, o pools internos) y todo lo demás contra ellos: chronyd en Linux, w32tm en Windows. Por qué importa: sin hora común no hay correlación de logs entre servidores, Kerberos falla con más de 5 minutos de desviación y los certificados se validan mal: 'aún no válido' es el síntoma clásico de reloj atrasado. Trampa: dejar que cada equipo salga a Internet por NTP propio rompe la correlación de evidencia y complica el filtrado: centraliza la fuente y alerta por drift.",
    example: "Logins intermitentes contra el dominio en una filial: el router local perdió su fuente NTP y hay 7 minutos de desviación; lo apuntas al DC, w32tm /resync en la flota y los fallos Kerberos cesan."
  },
  {
    id: "seed-sa-ospf-bgp",
    term: "OSPF y BGP",
    acronym: undefined,
    category: "SysAdmin - Redes & Firewalls",
    shortDefinition: "Protocolos de ruteo dinámico: OSPF (interior, estado de enlace por áreas) dentro de la red propia; BGP (entre sistemas autónomos) en el borde.",
    longDefinition: "OSPF descubre vecinos, inundar el estado de enlaces y calcular rutas con SPF: ideal dentro de la empresa, con áreas que sumarizan; BGP intercambia rutas entre sistemas autónomos (contra el ISP o entre sedes por MPLS) con políticas basadas en AS-path y comunidades. Por qué importa: con varios routers/firewalls, el failover de rutas debería ser automático (OSPF reconverge en segundos) y el doble enlace a Internet se maneja con BGP: 'rutas estáticas en un Excel' es deuda que un día no conmuta. Trampa: redistribuir rutas entre protocolos sin control genera loops y rutas negras; y el cost de OSPF mal calibrado manda el tráfico por el enlace de respaldo lento 'sin que nada esté caído'.",
    example: "Caída del enlace principal: OSPF reconverge por el backup en 3 segundos y nadie lo nota en la app; el reporte documenta el evento y la lección: validar que el backup tenía el ancho de banda pactado."
  },
  {
    id: "seed-sa-proxy-salida",
    term: "Proxy de salida",
    acronym: undefined,
    category: "SysAdmin - Redes & Firewalls",
    shortDefinition: "Servidor intermedio (Squid y similares) para el tráfico web hacia Internet: controla qué sale, quién navega a dónde y cachea contenido.",
    longDefinition: "El proxy explícito se configura en los navegadores (o por PAC/GPO) y valida políticas por usuario, URL y categoría; el transparente intercepta sin configurar clientes. Filtra la salida (categorías, blocklists de malware), cachea y sobre todo deja auditoría de navegación por usuario. Por qué importa: en entornos corporativos es el punto de control del tráfico web: exigencia recurrente de auditoría ('evidencia de navegación por empleado') y pieza del egress filtering. Trampa: las apps y appliances que ignoran el PAC del sistema hay que apuntarlas a mano; y el HTTPS sin inspección (con certificado raíz de la empresa) solo permite pasar o bloquear por dominio completo, no por ruta.",
    example: "Auditoría pide evidencia de navegación por usuario: los access logs del Squid con autenticación integrada entregan el reporte por equipo y dominio, y el bloqueo de categorías queda documentado por política."
  },
  {
    id: "seed-sa-cidr",
    term: "CIDR y VLSM",
    acronym: "CIDR",
    category: "SysAdmin - Redes & Firewalls",
    shortDefinition: "Notación y diseño de subredes: CIDR expresa la máscara en bits (/24) y VLSM permite subnetear con tamaños distintos según necesidad.",
    longDefinition: "192.168.10.0/24 dice 24 bits de red y 254 hosts; un /30 tiene 2 hosts útiles (enlaces punto a punto) y un /23 agrupa 512. VLSM divide un bloque en subredes de tamaños variados (un /26 para impresoras, un /23 para usuarios), ajustando el gasto de direcciones. Por qué importa: el diseño de VLANs, scopes DHCP y sumarización de rutas es aritmética CIDR: calcular bien evita scopes agotados, rangos que chocan con la oficina y rutas imposibles de sumarizar. Trampa: una máscara desalineada (255.255.255.128 donde se esperaba .0) hace que 'la mitad de la red no llegue' al gateway; y los rangos solapados con on-premise condenan la integración híbrida.",
    example: "Nueva VLAN de cámaras: estimas 120 dispositivos, asignas un /25 del bloque de planta, dejas documentado el /25 contiguo para crecer y configuras el DHCP con exclusión de las primeras 10 IPs para estáticas."
  },
  {
    id: "seed-sa-lvm",
    term: "LVM",
    acronym: "LVM",
    category: "SysAdmin - Storage & Backup",
    shortDefinition: "Logical Volume Manager: capa de abstracción de discos en Linux que agrupa discos en volume groups y entrega volúmenes lógicos redimensionables en caliente.",
    longDefinition: "LVM apila tres niveles: los physical volumes (discos o particiones inicializados con pvcreate), los volume groups (piscinas de espacio armadas con vgcreate) y los logical volumes (volúmenes que el filesystem formatea como si fueran particiones). Un LV puede crecer sin desmontar: lvextend -r +50G extiende el volumen y redimensiona ext4 o XFS en un solo paso, y agregar capacidad es comprar un disco, pvcreate y vgextend. Por qué importa: desamarra la capacidad del disco físico: el filesystem lleno de producción se resuelve en caliente agregando un disco al VG, sin ventana de mantenimiento y sin reinstalar; además habilita snapshots para cambios de riesgo. Trampa: reducir es la operación peligrosa: hay que achicar el filesystem ANTES y con cifras exactas, porque un cálculo invertido destruye los datos en segundos; la ruta sana para encoger es respaldar, recrear el volumen y restaurar.",
    example: "srv-files con df -h al 97% en /data: pvcreate /dev/sdb, vgextend vg01 /dev/sdb, lvextend -r +200G /dev/vg01/data-lv y el filesystem crece en caliente sin ventana de mantenimiento; el disco físico se compró el lunes y quedó integrado el martes."
  },
  {
    id: "seed-sa-raid",
    term: "RAID",
    acronym: "RAID",
    category: "SysAdmin - Storage & Backup",
    shortDefinition: "Redundant Array of Independent Disks: agrupa varios discos en un dispositivo lógico único que tolera la falla de N discos según el nivel elegido.",
    longDefinition: "Cada nivel reparte datos y redundancia de forma distinta: RAID 0 hace striping puro (rendimiento máximo, cero tolerancia: un disco muerto es todo perdido), RAID 1 espeja (dos copias, tolera la falla de un disco del par), RAID 5 reparte paridad (capacidad útil de N-1 discos, tolera 1 falla: el clásico de arrays de datos), RAID 6 agrega doble paridad (N-2 útiles, tolera 2 fallas: el seguro para discos grandes con rebuilds largos) y RAID 10 combina espejos en franjas (mínimo 4 discos, tolera un disco por pareja, favorito para bases de datos). Se implementa por controladora, por software con mdadm o en el hipervisor. Por qué importa: define cuántos discos pueden morir sin caída del servicio y cuánta capacidad bruta es realmente usable: elegir el nivel es el balance entre velocidad, espacio y riesgo, y errarlo se paga en rendimiento o en sustos. Trampa: RAID no es respaldo: el borrado lógico o el ransomware destruye las N copias igual de rápido; y el RAID 5 con discos de 10 TB o más tiene rebuilds de días donde un segundo error o una tasa de errores de lectura es pérdida total.",
    example: "srv-db-01 nuevo para PostgreSQL: se propone RAID 10 de 8 discos SAS: sobrevive la falla de un disco por pareja espejo manteniendo rendimiento de escritura, y el acta de diseño documenta por qué se descartó RAID 5 (rebuild de más de 2 días sobre discos de 12 TB)."
  },
  {
    id: "seed-sa-hot-spare",
    term: "hot spare",
    acronym: undefined,
    category: "SysAdmin - Storage & Backup",
    shortDefinition: "Disco de repuesto ya conectado y visible para el array que entra a reconstruir automáticamente (o con un comando) cuando falla un disco activo.",
    longDefinition: "Un hot spare es un disco vacío insertado en la caja pero fuera del array: mdadm lo tiene registrado (mdadm /dev/md0 --add /dev/sde lo deja en standby) y al fallar un disco activo el rebuild arranca solo hacia el spare, sin intervención humana. Puede ser dedicado a un array o global (compartido entre varios arrays del mismo equipo). Su misión es cerrar la ventana vulnerable: el tiempo entre la falla y la recuperación de la redundancia completa. Por qué importa: en RAID 5, cada hora con un disco muerto es una hora a un error de perderlo todo; el spare hace que la reconstrucción empiece a las 3 a.m. mientras el guardia duerme, y de día solo queda tramitar el reemplazo del disco consumido. Trampa: el spare también muere en silencio: si nadie vigila el estado del array (mdadm --detail y las alertas de mdadm --monitor), puede haber DOS discos muertos sin que nadie lo note; y un spare más pequeño que los discos nuevos que se compren jamás podrá reconstruirlos.",
    example: "Correo de mdadm a las 02:14: disco sdb del RAID 6 fallido; el hot spare sde toma su lugar y el rebuild corre de madrugada; a las 07:00 el dashboard muestra el array en estado clean y el ticket del día solo tramita el reemplazo del spare consumido."
  },
  {
    id: "seed-sa-rebuild",
    term: "rebuild",
    acronym: undefined,
    category: "SysAdmin - Storage & Backup",
    shortDefinition: "Reconstrucción de un array degradado: al fallar un disco, el reemplazo (o el spare) se llena con los datos recalculados hasta recuperar la redundancia.",
    longDefinition: "Cuando un disco muere, el array sigue funcionando en estado degraded pero sin margen; al integrar el reemplazo, la controladora o mdadm reconstruyen bloque a bloque: en RAID 1 copiando del espejo sano y en RAID 5/6 recalculando desde la paridad. Mientras dura, el array está lento y vulnerable (en RAID 5, un segundo error durante el rebuild es pérdida total). Se vigila con cat /proc/mdstat y se modera con los speed_limit del kernel. Por qué importa: la duración del rebuild (horas o días según tamaño, carga y prioridad) ES la ventana real de riesgo del array: planearla, monitorearla y no lanzar trabajos pesados encima es parte del oficio; un rebuild ignorado es la bomba de tiempo del storage. Trampa: un error de lectura (URE) en los discos restantes puede abortar el rebuild al 80%: elegir discos enterprise (1 error por 10^15 bits) y revisar el SMART del resto ANTES de reconstruir evita repetir la odisea; y acelerar el rebuild subiendo su prioridad degrada la producción que corre encima.",
    example: "Rebuild del RAID 6 estimado en 2 días: cat /proc/mdstat muestra el avance a 180 MB/s; se mueve el backup nocturno de ventana para no competir por IO, se vigila el SMART de los discos restantes y el postmortem deja el aprendizaje: los discos de esa serie se compran enterprise de ahora en adelante."
  },
  {
    id: "seed-sa-mdadm",
    term: "mdadm",
    acronym: undefined,
    category: "SysAdmin - Storage & Backup",
    shortDefinition: "Herramienta de Linux para administrar RAID por software: crea arrays, inspecciona estado, integra reemplazos y monitoriza con alertas.",
    longDefinition: "mdadm es el mando del RAID software: mdadm --create /dev/md0 --level=5 --raid-devices=3 /dev/sdb /dev/sdc /dev/sdd arma el array; --detail muestra estado, UUID y eventos; --add integra el disco de reemplazo o el spare; --fail y --remove marcan y expulsan un disco (también son el drill de prueba); --monitor --scan corre como servicio alertando por correo; y el archivo mdadm.conf hace que el array se reensamble en cada boot. Por qué importa: el RAID software es gratis, transparente y portable: sin controladora propietaria, los discos con su array se pueden mudar a otro servidor y seguir funcionando; y el ciclo fail, remove, add es el drill de reemplazo que todo SysAdmin debe haber ensayado antes de que toque en serio. Trampa: --fail sobre el disco equivocado en un array ya degradado (o probando el failover sin repuesto conectado) cruza la línea entre simulación y siniestro; y sin el mdadm.conf actualizado, el array aparece con nombre distinto y degradado tras un reboot.",
    example: "Reemplazo del disco con sectores pendientes: mdadm /dev/md0 --fail /dev/sdb --remove /dev/sdb, mdadm /dev/md0 --add /dev/sdf, watch cat /proc/mdstat sigue el rebuild y mdadm --detail /dev/md0 confirma State: clean al terminar; el drill completo queda documentado en el runbook de storage."
  },
  {
    id: "seed-sa-rpo",
    term: "RPO",
    acronym: "RPO",
    category: "SysAdmin - Storage & Backup",
    shortDefinition: "Recovery Point Objective: máxima cantidad de datos (medida en tiempo) que el negocio acepta perder en un incidente: define la frecuencia del respaldo.",
    longDefinition: "El RPO responde a la pregunta de cuánto se puede perder: un RPO de 24 horas se cumple con respaldos diarios; uno de 15 minutos exige replicación o respaldo transaccional continuo; RPO cero pide sincronía estricta. No es un número técnico: lo define el negocio proceso por proceso, y de ahí baja el diseño (frecuencia, snapshots, replicación) y su costo. Por qué importa: es la métrica que dimensiona toda la solución de respaldo: exigir RPO de minutos donde alcanza con horas multiplica infraestructura y complejidad sin necesidad; y al revés, descubrir en pleno incidente que el respaldo nocturno no cumple el RPO que la gerencia asumía es una conversación incómoda que se evita midiendo antes. Trampa: los RPO se declaran ambiciosos y nadie los mide: hasta cronometrar los restores y los cortes de replicación reales, el RPO de la ficha técnica y el RPO verdadero son dos números distintos.",
    example: "La dirección pide no perder nada: se hace el ejercicio por sistema con los dueños: el ERP acepta RPO de 4 horas (respaldo cada 4 horas), el sistema de pagos justifica replicación continua y los archivos corporativos quedan en 24 horas; el diseño se firma con números, no con deseos."
  },
  {
    id: "seed-sa-rto",
    term: "RTO",
    acronym: "RTO",
    category: "SysAdmin - Storage & Backup",
    shortDefinition: "Recovery Time Objective: tiempo máximo que el negocio tolera un servicio caído tras un incidente: define la estrategia de recuperación.",
    longDefinition: "El RTO responde a cuánto se puede estar sin servicio: 48 horas se resuelve con restore desde cinta o VM respaldada; 4 horas exige imagen lista, repositorio rápido y procedimiento probado; minutos obligan a clúster, réplica activa o DRP en otra sede. Lo fija el negocio por proceso y de ahí bajan las decisiones técnicas: medios, orden de arranque, dependencias y ensayos. Por qué importa: junto al RPO dibuja la matriz de continuidad y evita pagar de más: mucha alta disponibilidad se compra para servicios que toleran horas sin que el negocio lo note; y el orden de recuperación (qué se levanta primero: DNS, AD, base de datos, aplicaciones) se decide aquí, no en medio del incidente. Trampa: los RTO se calculan con la infraestructura sana y la gente descansada; el restore real en incidente (estrés, repositorios lentos, dependencias cruzadas) tarda 3 a 5 veces lo estimado si nunca se ha ensayado: el drill es parte del RTO.",
    example: "RTO declarado del file server: 8 horas; el ensayo trimestral del restore mide 2.5 horas reales incluyendo verificación, y revela que el 70% del tiempo es reconstruir permisos, no copiar datos: la exportación de permisos entra como paso previo y el acta del drill demuestra cumplimiento."
  },
  {
    id: "seed-sa-regla-321",
    term: "Regla 3-2-1",
    acronym: undefined,
    category: "SysAdmin - Storage & Backup",
    shortDefinition: "Estrategia mínima de respaldo: 3 copias de los datos, en 2 medios distintos, con 1 copia fuera del sitio (offsite).",
    longDefinition: "La regla arma el colchón de seguridad: la copia original de producción más dos respaldos, en al menos dos tipos de medio (disco y cinta, o disco y nube) y una de las copias físicamente fuera: bóveda, sede alterna o repositorio en la nube con retención. La extensión moderna 3-2-1-1-0 agrega una copia inmutable (que ni administradores ni ransomware pueden borrar) y cero errores de verificación de restores. Por qué importa: sobrevive al escenario que mata los respaldos ingenuos: el ransomware que cifra el servidor y también el NAS de respaldo montado con las mismas credenciales; la copia offsite o inmutable es la que rescata, y sin ella el 'tenemos respaldo' es una esperanza, no un plan. Trampa: la copia externa en el mismo edificio, en el mismo dominio AD o con la misma cuenta no cuenta (comparte destino de falla); y las copias sincronizadas en tiempo real replican el borrado en segundos: sincronizar no es respaldar.",
    example: "El intento de ransomware cifra los servidores y también el NAS de respaldo conectado: la copia semanal en cinta guardada en bóveda y el tier inmutable del repositorio cloud permiten restaurar el ERP; el incidente impulsa el plan 3-2-1-1-0 con verificación mensual de restores."
  },
  {
    id: "seed-sa-nfs",
    term: "NFS",
    acronym: "NFS",
    category: "SysAdmin - Storage & Backup",
    shortDefinition: "Network File System: compartir directorios de un servidor Linux por red para que otros hosts los monten como si fueran locales.",
    longDefinition: "El servidor exporta carpetas desde /etc/exports y los clientes montan con mount -t nfs srv-fs-01:/export/proyectos /mnt/proyectos; las opciones gobiernan el comportamiento: rw/ro, sync/async y root_squash (el root del cliente degrada a anónimo) frente al peligroso no_root_squash; NFSv4 agrega Kerberos y trabaja limpio por el puerto 2049. El diagnóstico clásico: showmount -e, rpcinfo -p y los procesos en estado D esperando IO remoto. Por qué importa: es el estándar de almacenamiento compartido en Linux: homes de usuarios, ISOs de hipervisores, datos de clusters y respaldos; y sus incidentes (montajes colgados, permisos squash, retransmisiones) son pan de cada día de la operación. Trampa: un mount hard sin opciones de recuperación congela al cliente cuando el servidor o la red fallan (procesos en D y umount imposible); y olvidar _netdev y nofail en fstab secuestra el boot de un servidor cuyo NFS no está: emergency mode a las 4 a.m.",
    example: "Las 40 workstations pierden /proyectos a la vez sin nada caído: rpcinfo -p srv-fs-01 responde y nfsstat en el cliente muestra retransmisiones crecientes: el trunk hacia el storage está saturado; se agrega el uplink y el monitoreo del puerto pasa a alertar por paquetes perdidos."
  },
  {
    id: "seed-sa-smb",
    term: "SMB",
    acronym: "SMB",
    category: "SysAdmin - Storage & Backup",
    shortDefinition: "Server Message Block: protocolo de archivos e impresión de Windows (los 'compartidos de red'), también servido y montado desde Linux con Samba.",
    longDefinition: "SMB es la lengua de los shares de Windows: carpetas publicadas con autenticación de dominio (Kerberos/NTLM), permisos que combinan el share y el NTFS, y versiones SMB2/3 con multichannel y cifrado; desde Linux, Samba monta (mount -t cifs //srv-fs-01/contab /mnt -o user=...) y sirve carpetas a clientes mixtos. Por qué importa: es el file sharing del 95% de los escritorios corporativos y el terreno de los 'no puedo abrir la carpeta': permisos del share frente a NTFS, archivos bloqueados por quien lo dejó abierto, versiones de protocolo y oplocks; dominarlo es dominar el file server. Trampa: los permisos efectivos son la combinación de share más NTFS (un Deny heredado vence al Allow del share: se audita con Effective Access, no a ojo) y el SMBv1 habilitado por compatibilidad con equipos viejos es la puerta clásica de propagación de ransomware: retirarlo es hardening de primera línea.",
    example: "Contabilidad reporta que la carpeta rechaza el acceso aunque el usuario tiene permisos: la ficha de Effective Access muestra un Deny heredado de un grupo viejo en NTFS que vencía el Allow del share; se retira el Deny, gpupdate /force y el caso queda documentado en la KB interna."
  },
  {
    id: "seed-sa-iscsi",
    term: "iSCSI",
    acronym: "iSCSI",
    category: "SysAdmin - Storage & Backup",
    shortDefinition: "Storage en bloque sobre TCP/IP: el servidor remoto (target) publica LUNs que el iniciador descubre y usa como discos locales.",
    longDefinition: "El target (una cabina o un Linux con targetcli) publica LUNs por un portal IP; el iniciador del servidor o hipervisor las descubre (iscsiadm -m discovery -t sendtargets -p 10.20.0.10) y hace login para obtener un /dev/sdX que formatea y monta como disco propio; dm-multipath superpone varios caminos de red para tolerar fallas de puerto o switch. Es el SAN económico: fibra no incluida. Por qué importa: es la forma asequible de storage en bloque sobre Ethernet: datastores de hipervisores, discos de bases de datos y CSV de clusters de failover; entender initiator, target y LUN es entender la mitad del storage empresarial moderno. Trampa: la red ES el disco: sin VLAN dedicada, jumbo frames y caminos redundantes, cualquier congestión convierte el LUN en una tortuga y las bases empiezan a lanzar timeouts; y dos iniciadores conectando el MISMO LUN sin clúster coordinado corrompen el filesystem en minutos (no es un filesystem compartido: es un disco).",
    example: "Las VMs se quejan de IO lento cada tarde: la latencia del LUN en el hipervisor está alta y multipath -ll muestra uno de los dos caminos en faulty: el puerto del switch iSCSI se saturaba y la NIC del segundo camino estaba caída; se recupera el camino y el monitoreo de multipath pasa a la lista de alertas accionables."
  },
  {
    id: "seed-sa-san",
    term: "SAN",
    acronym: "SAN",
    category: "SysAdmin - Storage & Backup",
    shortDefinition: "Storage Area Network: red dedicada (fibra o Ethernet) que entrega storage en bloque a los servidores: discos remotos presentados como LUNs.",
    longDefinition: "El SAN separa el almacenamiento del cómputo: switches FC o Ethernet dedicados interconectan cabinas y servidores; la cabina arma pools de discos (RAID, tiering) y presenta LUNs a cada consumidor por iSCSI, FC o NVMe-oF; el servidor ve un disco y lo formatea como propio. Se administra en capas: zoning FC o ACLs de la red de storage, masking de LUNs por host, multipath en cada consumidor y las colas de la cabina. Por qué importa: concentra y reasigna la capacidad: los discos se asignan a quien los necesita sin amarrarse a un servidor físico, y la redundancia (controladoras duales, caminos múltiples) nace del diseño; detrás de la mayoría de la virtualización y de las bases de datos serias hay un SAN. Trampa: es bloque, no archivos: dos servidores en el mismo LUN sin coordinación destruyen el filesystem; y el 'SAN lento' se investiga en la cadena completa (colas de controladora, puertos saturados, multipath degradado) antes de culpar a los discos: el síntoma siempre llega al consumidor y la causa está a tres capas abajo.",
    example: "Mantenimiento de una controladora de la cabina: se verifica que cada host tenga caminos activos por la otra controladora, el failover planificado se ejecuta a las 02:00 y el reporte post-cambio muestra multipath activo-activo en todos los consumidores: cero ventana de servicio perdida."
  },
  {
    id: "seed-sa-nas",
    term: "NAS",
    acronym: "NAS",
    category: "SysAdmin - Storage & Backup",
    shortDefinition: "Network Attached Storage: servidor de archivos especializado que comparte carpetas por red (NFS, SMB) con permisos, snapshots y gestión propia.",
    longDefinition: "Un NAS entrega almacenamiento a nivel de archivo: carpetas servidas por NFS/SMB a muchos clientes simultáneos, con cuotas, permisos (locales o integrados a AD/LDAP), snapshots y replicación propias de la caja, administrado por su consola o API. A diferencia del SAN (bloque para un consumidor por LUN), el NAS resuelve compartir archivos entre humanos y sistemas. Por qué importa: es el destino natural de homes, shares departamentales, repositorios de respaldo y medios: su relación precio/capacidad y simplicidad lo hacen el caballo de batalla del almacenamiento cotidiano; y saber distinguir 'necesito bloque' (SAN) de 'necesito archivos' (NAS) evita comprar mal. Trampa: usar el NAS como único destino de respaldo viola 3-2-1 (comparte sitio y a veces dominio con todo lo demás, y el ransomware lo cifra igual); y los permisos híbridos (usuarios locales del NAS mezclados con AD) producen accesos imposibles de explicar hasta que se auditan los dos lados.",
    example: "El NAS nuevo se une al dominio para permisos centralizados, exporta el share de respaldos por NFS al servidor de Veeam y departamentos por SMB con cuotas por carpeta; la alerta de capacidad al 80% se activa el primer día para que el disco no vuelva a sorprender a nadie."
  },
  {
    id: "seed-sa-rsync",
    term: "rsync",
    acronym: undefined,
    category: "SysAdmin - Storage & Backup",
    shortDefinition: "Copia y sincronización delta: transfiere solo las diferencias entre origen y destino, preservando permisos y viajando por SSH.",
    longDefinition: "rsync compara tamaños y fechas (o checksums con -c) y copia solo los bloques que cambiaron: el comando canónico rsync -avz --delete /datos/ backup@srv-bkp:/respaldo/ preserva permisos y dueños (-a), comprime el tránsito (-z), replica borrados en el destino (--delete) y usa SSH como transporte. Con --link-dest se construyen rotaciones con hardlinks (copias 'completas' que comparten lo no cambiado) y con --bwlimit se le pone freno para no saturar la WAN. Por qué importa: es la navaja del respaldo y la migración en Linux: mover terabytes transfiriendo solo lo distinto, sincronizar sedes, clonar servidores y sostener respaldos diarios baratos; su salida con el resumen de bytes transferidos es la evidencia natural del ticket. Trampa: la barra final del path cambia el significado (el contenido de la carpeta frente a la carpeta dentro del destino), y --delete en el destino equivocado borra con la misma eficiencia con la que copia: dry-run (-n) SIEMPRE antes de la primera corrida real.",
    example: "Migración del file server: rsync -avh --progress /srv/datos/ root@srv-fs-02:/srv/datos/ en tres corridas nocturnas, una pasada final con -n para listar diferencias y el viernes la sincronización delta tarda 20 minutos: el corte de servicio se reduce a desmontar y remontar."
  },
  {
    id: "seed-sa-borg",
    term: "BorgBackup",
    acronym: undefined,
    category: "SysAdmin - Storage & Backup",
    shortDefinition: "Respaldo deduplicado, comprimido y cifrado por repositorio: cada respaldo guarda solo los chunks nuevos; Borg y Restic son la dupla típica.",
    longDefinition: "Borg gestiona repositorios: los archivos se trocean en chunks, se comprimen (zstd), se deduplican por hash y se cifran antes de entrar; cada respaldo (archive) referencia los chunks ya existentes, así que respaldar 18 servidores parecidos casi no consume espacio extra. borg create hace el respaldo, borg prune aplica la retención (keep-daily, keep-weekly, keep-monthly), borg mount explora un respaldo como carpeta y borg check verifica la integridad del repositorio. Por qué importa: hace económicamente viable la retención larga (GFS) y el offsite cifrado: el repositorio en un storage no confiable es opaco sin la clave; y los restores granulares (montar y copiar un archivo) quitan el miedo al restore completo. Trampa: el repositorio es la caja única: sin borg check periódico y réplica del repo, la corrupción silenciosa de chunks aparece justo el día del restore; y la passphrase perdida son datos perdidos: bóveda de secretos, no memoria de una persona.",
    example: "Respaldos de 18 VMs de configuración similar a un repo Borg remoto: la segunda máquina en adelante casi no cuesta espacio por deduplicación; borg prune --keep-daily 7 --keep-weekly 5 --keep-monthly 12 sostiene la retención GFS y borg check --verify-data mensual queda en el calendario de verificación."
  },
  {
    id: "seed-sa-veeam",
    term: "Veeam",
    acronym: undefined,
    category: "SysAdmin - Storage & Backup",
    shortDefinition: "Plataforma de respaldo para virtualización: imágenes de VM consistentes sin agente, con replicación, verificación automática y restore granular.",
    longDefinition: "Veeam respalda a nivel de hipervisor: snapshots de las VMs, extracción de datos sin agente y repositorios con compresión, deduplicación y cifrado; los restores son a nivel de VM completa, disco, archivo o ítem de aplicación (un correo, un registro), SureBackup arranca las VMs respaldadas en red aislada para verificar que arrancan de verdad, y la réplica mantiene copias listas para failover en otro host. Por qué importa: es el estándar de facto del respaldo en VMware y Hyper-V: la diferencia entre 'tenemos respaldos' y 'tenemos restores probados con evidencia automatizada'; el reporte de éxitos y fallos de jobs y el inventario de puntos de restauración son la evidencia de cualquier auditoría. Trampa: los jobs sin monitoreo fallan en cadena durante semanas (el último 'respaldo exitoso' es de hace 15 días), y las VMs con discos excluidos 'para ahorrar espacio' restauran incompletas: revisar qué quedó excluido es parte del audit del diseño de respaldo.",
    example: "Un usuario borra la carpeta del share a las 10:00: se monta el restore de anoche desde la consola (a nivel de archivo, sin tocar la VM), se extrae la carpeta en minutos y el usuario firma la entrega; el reporte mensual de SureBackup confirma 30/30 respaldos arrancables."
  },
  {
    id: "seed-sa-gfs",
    term: "GFS (abuelo-padre-hijo)",
    acronym: "GFS",
    category: "SysAdmin - Storage & Backup",
    shortDefinition: "Rotación de respaldos Grandfather-Father-Son: diarios de corta vida, semanales de mediana y mensuales de larga retención.",
    longDefinition: "La rotación GFS estructura la retención por generaciones: los hijos son los respaldos diarios (se guardan 7 a 14 días: casi todo restore sale de aquí), los padres los semanales (4 a 8 semanas) y los abuelos los mensuales (12 meses o más: auditoría y archivos de cierre); cada nivel promueve al siguiente cuando toca. Es la política natural sobre cinta, repositorios con retención o tiers de objetos. Por qué importa: balancea espacio contra necesidad real: los restores son casi siempre recientes, pero la pregunta del archivo de hace 5 meses solo la responde el abuelo; sin niveles, o se quema storage guardando 365 diarios o se pierde la historia profunda que auditoría y el área legal piden. Trampa: nadie prueba los restores de niveles viejos: la cinta mensual leída 11 meses después puede fallar por medio degradado, drive sucio o software que ya no existe: agenda restores de nivel abuelo trimestrales como parte de la verificación.",
    example: "El auditor pide evidencia del cierre de diciembre: se restaura el mensual de diciembre desde la cinta de bóveda al servidor de staging, se comparan los archivos contra el cierre contable y la evidencia (medio, fecha, hash, responsable) va al legajo de auditoría."
  },
  {
    id: "seed-sa-backup-inmutable",
    term: "Backup inmutable",
    acronym: undefined,
    category: "SysAdmin - Storage & Backup",
    shortDefinition: "Respaldo protegido contra borrado y modificación durante su retención: ni administradores, ni ransomware, ni borrados accidentales lo tocan.",
    longDefinition: "La inmutabilidad se materializa con object lock o WORM: al escribirse el respaldo se fija un período (7, 30, 90 días) durante el cual ninguna credencial ni API puede borrarlo o alterarlo; lo soportan los buckets de objetos (S3 Object Lock y equivalentes), las cintas WORM y los repositorios con retención de compliance. Es el penúltimo '1' de la regla 3-2-1-1-0. Por qué importa: el ransomware moderno caza los respaldos primero con credenciales robadas del dominio o de la consola de backup: la copia inmutable es la que sobrevive a un atacante que ya es admin; sin ella, la cadena de respaldo comparte el mismo talón de Aquiles que la producción que protege. Trampa: inmutable no es eterno: si la retención es de 7 días y la infección se detecta al día 10, el campo quedó limpio (la retención debe superar el peor tiempo de detección); y las credenciales que CONFIGURAN la retención siguen siendo el eslabón: guárdalas aparte o el atacante acorta el candado antes de cifrar.",
    example: "El intento de ransomware borra los repositorios conectados de la consola de backup, pero el tier con object lock de 30 días resiste: el restore del punto anterior a la infección salva al ERP y el postmortem fija la lección: retención inmutable mayor o igual al peor tiempo de detección asumido."
  },
  {
    id: "seed-sa-lto",
    term: "Cinta LTO",
    acronym: undefined,
    category: "SysAdmin - Storage & Backup",
    shortDefinition: "Cintas magnéticas Linear Tape-Open para respaldo y archivo: altísimo rendimiento por TB a bajo costo y aislamiento físico real al guardarse fuera de la librería.",
    longDefinition: "LTO entrega cintas de varios TB nativos (LTO-9: 18 TB) leídas por drives en librerías con robots, con cifrado por hardware y modos WORM en generaciones recientes; el acceso es secuencial: se escribe y lee en secuencia, perfecto para respaldos completos y archivo frío, inútil para consultas aleatorias. Cada generación lee una atrás (el drive LTO-9 lee LTO-8) y escribe solo la suya. Por qué importa: sigue siendo el medio con mejor costo por TB y el único air gap económico de verdad: la cinta en bóveda no tiene IP, no se cifra por red y se traslada físicamente; para retenciones largas y requisitos de auditoría sigue siendo el estándar silencioso de la industria. Trampa: la compatibilidad de generaciones mata archivos: al jubilar la librería vieja, las cintas que solo ella leía se vuelven ilegibles: migra los datos ANTES de deshacerte del drive; y los drives sucios o las cintas mal almacenadas (calor, humedad) fallan justo en el restore del año.",
    example: "La librería se renueva de LTO-8 a LTO-9: se migran las cintas del abuelo (retención de 2 años) en tres fines de semana, se valida por muestreo la lectura del 10% y las cintas viejas se destruyen con acta; el plan de migración de medios queda en el runbook de storage."
  },
  {
    id: "seed-sa-dedupe",
    term: "Deduplicación",
    acronym: undefined,
    category: "SysAdmin - Storage & Backup",
    shortDefinition: "Almacenar una sola copia de cada bloque repetido: respaldar 20 servidores parecidos ocupa poco más que respaldar uno.",
    longDefinition: "La deduplicación trocea los datos (por bloques o chunks), les calcula un hash y guarda solo los bloques nuevos: los repetidos se referencian. Puede ocurrir en origen (Borg y Restic: poco ancho de banda transferido), en el destino (repositorios y appliances de respaldo) o en línea del storage (volúmenes con dedupe del NAS). Con ella, los respaldos sintéticos y las retenciones largas de flotas enteras dejan de comer storage exponencialmente. Por qué importa: es lo que hace económicamente viable el plan de respaldo real: 15 TB de datos de flota se estabilizan en 3 o 4 TB de repositorio y el offsite se vuelve asequible; sin deduplicación, el mismo plan se cae por costo en el segundo mes. Trampa: el hash no valida contenido: la corrupción de un bloque compartido daña TODOS los respaldos que lo referencian (por eso la verificación y la réplica del repositorio son sagradas), y el orden importa: cifrar ANTES de deduplicar produce texto cifrado único y la dedupe cae a cero (dedupe primero, cifrado después).",
    example: "El repositorio de respaldos de 15 TB de datos se estabiliza en 3.5 TB usados tras activar deduplicación y compresión: el reporte de ratio 4.2:1 convence a compras de extender la retención de 3 a 7 semanas sin comprar un solo disco."
  },
  {
    id: "seed-sa-vsphere",
    term: "vSphere",
    acronym: undefined,
    category: "SysAdmin - Virtualización",
    shortDefinition: "Plataforma de virtualización de VMware: hipervisor ESXi en los hosts, vCenter para gestión central, y HA, DRS y vMotion sobre datastores compartidos.",
    longDefinition: "ESXi es el hipervisor tipo 1 que corre las VMs en cada host físico; vCenter las administra como cluster: plantillas y clones, snapshots, vMotion (migración en caliente entre hosts), DRS (balanceo automático por carga), HA (reinicio de VMs si un host muere) y el inventario de datastores; la operación diaria es el cliente web, PowerCLI para automatizar y carpetas, tags y permisos para ordenar cientos de VMs. Por qué importa: es el estándar de facto del enterprise: gran parte de las vacantes de infraestructura lo dan por sentado, y el ciclo de vida operativo (clonar de plantilla, parchear, snapshot pre-cambio, consolidar, migrar) se domina aquí; entender vCenter frente a ESXi es entender quién manda en la granja. Trampa: el snapshot NO es respaldo (vive en el datastore y crece con las escrituras), el admission control de HA mal ajustado deja el cluster sin margen real para failover, y parchar vCenter sin respaldo de su propia VM es apostar la consola que administra todo lo demás.",
    example: "Ciclo de parcheo mensual: DRS ya repartió la carga; se ponen los hosts en maintenance mode uno a uno (vMotion automático de las VMs), se parchan, salen de mantenimiento y el reporte post-ventana valida cero VMs reiniciadas por HA y latencia normal en los datastores."
  },
  {
    id: "seed-sa-proxmox",
    term: "Proxmox",
    acronym: undefined,
    category: "SysAdmin - Virtualización",
    shortDefinition: "Plataforma open source de virtualización: KVM para VMs y LXC para contenedores de sistema, en cluster con consola web y vzdump para respaldos.",
    longDefinition: "Proxmox VE monta sobre Debian un hipervisor KVM más contenedores LXC, administrado en cluster con quórum (pvecm), consola web y API: storages locales o compartidos (ZFS, Ceph, NFS, iSCSI), snapshots, replicación de VMs entre nodos, HA con fence, y vzdump con qmrestore como ciclo de respaldo; la CLI (qm, pct, pvesm) automatiza todo lo que la GUI muestra. Por qué importa: es la alternativa sin licenciamiento por socket dominante en laboratorios, pymes y proveedores: aprender virtualización de verdad (cluster, quórum, storages, respaldo, HA) sin barrera de costo y con comandos que se parecen a los de cualquier entrevista; su combinación KVM, LXC y Ceph enseña el stack completo en una sola caja. Trampa: el cluster de dos nodos sin QDevice pierde el quórum con una sola falla y se congela entero: clusters de tres nodos o QDevice siempre; y vzdump al NAS sin drill de restore es fe ciega, igual que cualquier backup.",
    example: "Laboratorio de estudio: 3 mini-PC en cluster Proxmox con Ceph replicado, la VM del laboratorio de AD respaldada con vzdump en modo snapshot hacia el NAS, y el drill mensual de qmrestore hacia el nodo de pruebas antes de dar el mes por cerrado."
  },
  {
    id: "seed-sa-hyperv",
    term: "Hyper-V",
    acronym: undefined,
    category: "SysAdmin - Virtualización",
    shortDefinition: "Hipervisor tipo 1 de Microsoft (rol de Windows Server): VMs sobre VHDX con checkpoints, Live Migration, réplica y clusters de failover con CSV.",
    longDefinition: "Hyper-V corre como rol de Windows Server (o en Azure Stack HCI): VMs con discos VHDX, checkpoints de producción (consistentes con VSS), Live Migration entre hosts, Réplica de Hyper-V (copia asincrónica de VMs a otro sitio sin storage compartido) y clusters de failover con CSV para alta disponibilidad; la administración va de Hyper-V Manager (un host) a Failover Cluster Manager y PowerShell (Get-VM, Move-VM, Checkpoint-VM), hasta SCVMM en flotas grandes. Por qué importa: es la virtualización nativa del mundo Windows: el licenciamiento Datacenter incluye derechos de virtualización generosos que lo hacen natural en esos entornos, y su integración con failover clustering, VSS y las herramientas de respaldo de Microsoft es directa. Trampa: el checkpoint estándar guarda estado con RAM y no es consistente con aplicaciones como el production checkpoint; y los VHDX dinámicos crecen sin control si nadie compacta: hay que monitorear el espacio REAL del CSV, no el lógico de los discos.",
    example: "Parcheo del host con 14 VMs: Move-VM en vivo hacia el nodo 2, el host se parchea y reinicia, las VMs regresan por Live Migration; el acta reporta cero interrupciones y las VMs críticas quedan replicando al DRP con Réplica de Hyper-V cada 5 minutos."
  },
  {
    id: "seed-sa-snapshot",
    term: "Snapshot",
    acronym: undefined,
    category: "SysAdmin - Virtualización",
    shortDefinition: "Punto en el tiempo de una VM o volumen: congela el estado para revertir en segundos; NO es un respaldo (comparte el mismo almacenamiento).",
    longDefinition: "El snapshot congela el disco base (y opcionalmente la RAM): las escrituras posteriores van a un archivo delta y el base queda intacto; revertir (rollback) devuelve la VM al instante congelado en minutos y consolidar (delete o merge) reintegra los cambios acumulados. Es la red de seguridad de las ventanas de cambio y la pieza interna de los respaldos a nivel hipervisor, que la usan para copiar consistente. Por qué importa: convierte un upgrade fallido en un rollback de minutos en vez de un restore de horas: el snapshot pre-cambio es el cinturón de seguridad del cambio; y entender por qué NO es respaldo (vive en el mismo datastore, se degrada con el tiempo y no sobrevive la falla del storage) evita la falsa seguridad clásica. Trampa: los deltas crecen con cada escritura, la VM sufre penalización de IO y los snapshots apilados 'por si acaso' llenan el datastore y hacen eterna la consolidación: política de vida máxima de 24 a 72 horas, una sola generación y alertas de snapshots viejos.",
    example: "Upgrade del ERP: snapshot pre-cambio etiquetado 'pre-upgrade-2024-06-12' en la VM app-erp-01; el upgrade corrompe la configuración y el rollback del snapshot restaura en 4 minutos; el cambio se replanifica y la alerta de snapshots con más de 48 horas queda configurada en vCenter."
  },
  {
    id: "seed-sa-datastore",
    term: "Datastore",
    acronym: undefined,
    category: "SysAdmin - Virtualización",
    shortDefinition: "Almacén donde viven los archivos de las VMs (discos, configuración, snapshots): carpeta lógica sobre storage local, NFS, iSCSI/FC o distribuido (vSAN, Ceph).",
    longDefinition: "El datastore es la unidad de almacenamiento del hipervisor: cada VM ocupa una carpeta con sus discos (vmdk, vhdx, qcow2), su configuración, logs y los deltas de snapshots; puede ser un disco local del host, un share NFS montado, un LUN de bloques con filesystem propio (VMFS) o un pool distribuido (vSAN, Ceph). Su capacidad libre y su latencia gobiernan la salud de la granja: se monitorea espacio consumido y latencia de datastore como se monitorea un disco físico. Por qué importa: el datastore lleno congela VMs, rompe snapshots y falla las migraciones: es EL incidente clásico de virtualización; y asignar datastores por tipo de carga (SSD para bases de datos, SAS para lo frío) es diseño, no decoración. Trampa: los discos thin reportan tamaño lógico, no consumo físico: un datastore 'con 2 TB libres' puede estar al borde real; y las carpetas huérfanas de VMs borradas desde el explorador (sin desregistrar) acumulan cientos de GB invisibles para el inventario.",
    example: "Alarma de DS-SSD-01 al 92%: los deltas de snapshots olvidados de app-legacy ocupan 800 GB; se consolidan los snapshots, dos VMs frías migran a DS-SAS-02 con Storage vMotion y el datastore respira al 61% antes del fin de semana."
  },
  {
    id: "seed-sa-vmotion",
    term: "vMotion",
    acronym: undefined,
    category: "SysAdmin - Virtualización",
    shortDefinition: "Migración en caliente de una VM encendida entre hosts (o sus discos entre datastores) sin interrupción perceptible para el usuario.",
    longDefinition: "vMotion copia la memoria de la VM al host destino mientras sigue corriendo, en iteraciones cada vez más cortas hasta el switch final de milisegundos; Storage vMotion mueve los discos entre datastores con la VM encendida, y el maintenance mode de un host es vMotion trabajando en serie. Requiere compatibilidad de CPU entre hosts (EVC nivela las generaciones), una red de vMotion dedicada (10 GbE recomendado) y margen de ancho de banda. Por qué importa: es lo que hace soportable el mantenimiento en horario laboral: parchar, reparar y balancear hosts sin apagar nada; sin migración en caliente, cada mantenimiento es una ventana con apagado y cada balanceo un proyecto. Trampa: la red de vMotion compartida con producción o con el storage iSCSI satura con las migraciones grandes y 'todo se pone lento' sin causa visible; y las VMs con dispositivos passthrough (USB físico, licencias atadas al hardware) no migran: identificar las excepciones ANTES de activar el maintenance mode.",
    example: "El host esxi-03 reporta errores de RAM en el FRU: maintenance mode y vMotion evacua las 22 VMs en 40 minutos sin que ningún usuario lo note; el host se repara en garantía y regresa al cluster el mismo viernes."
  },
  {
    id: "seed-sa-cpu-ready",
    term: "CPU ready",
    acronym: undefined,
    category: "SysAdmin - Virtualización",
    shortDefinition: "Tiempo que una VM pasó esperando por CPU física disponible: el síntoma de oversubscription; %ready alto sostenido significa CPU asignada pero no obtenida.",
    longDefinition: "Cuando las vCPUs de muchas VMs compiten por los mismos cores, el hipervisor debe programarlas juntas (co-scheduling) y la VM espera: ese tiempo de espera es el CPU ready, medible por VM (el %ready de esxtop, o su equivalente por plataforma). Valores sostenidos por encima del 5-10% por vCPU indican que el invitado sufre espera del scheduler aunque su propio %CPU se vea bajo: la VM tiene CPU pero no la consigue. Por qué importa: distingue 'falta de CPU física' (agregar hosts) de 'problema dentro de la VM' (proceso o configuración): es la métrica que evita comprar hardware para arreglar un software, y la evidencia que la gerencia entiende cuando pide velocidad. Trampa: la causa frecuente son VMs infladas de vCPUs (una VM de 8 vCPUs para una app de un solo hilo bloquea el scheduler de todas): REDUCIR vCPUs suele mejorar el ready de toda la granja; y los promedios esconden la hora pico: analizar por VM y por franja horaria.",
    example: "Quejas de lentitud al mediodía en la granja RDS: esxtop muestra %ready del 14% en las VMs de sesiones; se rebajan de 8 a 4 vCPUs las VMs sobredimensionadas y el ready cae bajo el 3%: el fix no compró un solo servidor nuevo."
  },
  {
    id: "seed-sa-thin-thick",
    term: "Thin y thick provisioning",
    acronym: undefined,
    category: "SysAdmin - Virtualización",
    shortDefinition: "Cómo se entrega el espacio del disco de la VM: thin lo consume a medida que escribe, thick lo reserva todo desde la creación.",
    longDefinition: "Thin provisiona lógicamente: la VM declara 500 GB pero el datastore solo asigna bloques cuando se escriben (el archivo del disco crece); thick reserva el espacio completo al crear la VM, y el eager zeroed además lo pre-inicializa, con rendimiento predecible a costo de una creación lenta. La elección va por carga: sistemas y desarrollo en thin (estira la capacidad), bases de datos y logs intensivos en thick (previsibilidad de espacio y rendimiento). Por qué importa: define la matemática real del storage: thin multiplica la capacidad útil aparente (con disciplina de monitoreo) y thick garantiza que el espacio y el rendimiento no sorprendan; la mezcla consciente por tipo de carga es parte del diseño del storage virtual. Trampa: la sobre-asignación total (más lógico que físico) hace que el datastore se llene 'de repente' y las VMs se congelen o corrompan al fallar la asignación de un bloque: alertas de consumo REAL y holgura siempre; y thin combinado con snapshots es la pareja que más engorda en silencio.",
    example: "DS-SAS-01 con 8 TB físicos tiene 14 TB lógicos en thin: la alarma del 85% de consumo real se dispara de madrugada cuando el job de logs crece; se migra una VM fría y queda política escrita: bases de datos en thick, lo demás thin con cuota y alerta."
  },
  {
    id: "seed-sa-docker",
    term: "Docker",
    acronym: undefined,
    category: "SysAdmin - Cloud / Contenedores",
    shortDefinition: "Plataforma de contenedores: empaqueta apps con sus dependencias en imágenes portables y las corre aisladas compartiendo el kernel del host.",
    longDefinition: "Docker construye imágenes por capas a partir de un Dockerfile, las distribuye desde un registry y las ejecuta como contenedores: procesos aislados con namespaces y cgroups del kernel Linux, sin hipervisor ni sistema invitado; la operación diaria es docker build, pull y run, docker ps, logs, exec y stats, y docker compose para stacks multicontenedor declarados en YAML. Por qué importa: industrializó el empaquetado: 'funciona en mi máquina' se convierte en una imagen idéntica de desarrollo a producción, el rollback es correr la etiqueta anterior y la densidad por host es un orden de magnitud mayor que con VMs; es la puerta de entrada obligatoria al mundo cloud-native. Trampa: los contenedores son efímeros: los datos guardados DENTRO del contenedor se pierden al recrearlo (volúmenes para lo persistente), y docker run con restart always sin límites de memoria y CPU deja que un contenedor con fuga tumbe el host entero: límites SIEMPRE.",
    example: "La API interna se contenedoriza: Dockerfile multi-stage, imagen de 90 MB etiquetada por versión en el registry interno, docker run -d --name api --memory 512m --restart unless-stopped con logs a stdout; el despliegue pasa de un runbook de 40 minutos a un pull de 2 minutos."
  },
  {
    id: "seed-sa-contenedor",
    term: "Contenedor",
    acronym: undefined,
    category: "SysAdmin - Cloud / Contenedores",
    shortDefinition: "Proceso aislado que comparte el kernel del host: filesystem propio por capas, red y límites de recursos, sin VM ni sistema operativo invitado.",
    longDefinition: "Un contenedor es un proceso Linux con namespaces (pid, red, mount: cada uno ve su propio mundo) y cgroups (CPU, memoria e IO acotados): arranca en segundos porque no bootea un kernel, solo superpone capas de imagen sobre el host. Frente a la VM: la VM virtualiza hardware y corre kernels propios; el contenedor comparte kernel y aísla procesos: más liviano, más denso, menos aislado. Por qué importa: es la unidad de despliegue moderna: inmutable, versionada, de arranque instantáneo y escalable; entender qué NO aísla (el kernel: un kernel vulnerable lo comparten todos los contenedores del host) explica por qué en multi-tenant hostil se usan VMs o sandboxes reforzados, y por qué parchear el HOST es parchear a todos sus contenedores. Trampa: 'parchear' un contenedor vivo a mano es tratarlo como VM: el fix muere con el contenedor; el flujo correcto es reconstruir la imagen y redeployar; y los logs sin rotación dentro del contenedor llenan el disco del host sin que docker ps lo delate.",
    example: "El contenedor del worker es asesinado por el OOM killer del HOST (dmesg muestra 'Killed process' con el ID del runtime): se fija --memory=1g, se monta el monitoreo por contenedor y el fix de fondo entra en la imagen nueva, no parcheando el contenedor vivo."
  },
  {
    id: "seed-sa-kubernetes",
    term: "Kubernetes",
    acronym: "K8s",
    category: "SysAdmin - Cloud / Contenedores",
    shortDefinition: "Orquestador de contenedores: un cluster de nodos despliega, escala, balancea y autorrepara las cargas declaradas en YAML.",
    longDefinition: "Kubernetes (K8s) separa un plano de control (API server, scheduler, controladores) de los nodos workers con kubelet: el operador declara el estado deseado (Deployment, Service, Ingress) y el cluster reconcilia la realidad contra esa declaración: recrea los pods que mueren, repone las cargas de un nodo caído, escala por métricas y hace rolling updates sin ventana. Los objetos del día a día: Pod, Deployment, Service, Ingress, ConfigMap, Secret y HPA. Por qué importa: es el estándar de plataforma para contenedores en producción: autorreparación, despliegues progresivos y descubrimiento de servicios vienen de fábrica en vez de scripts caseros; detrás de casi todo PaaS moderno hay K8s, y su vocabulario (pod, rollout, manifiesto) es el idioma común de las plataformas. Trampa: la curva es real: networking (CNI), storage (StorageClass) y RBAC cobran su precio en operación; empezar sin dominar las primitivas (liveness, readiness, requests y limits) produce CrashLoopBackOff en bucle y nodos NotReady de diagnóstico amargo.",
    example: "El deployment de la API pasa de 2 a 6 réplicas en hora pico por HPA y vuelve a 2 de noche; la versión nueva entra con rolling update (maxSurge 1, maxUnavailable 0) y el rollback es kubectl rollout undo deployment/api en un comando: cero ventana de servicio."
  },
  {
    id: "seed-sa-dockerfile",
    term: "Dockerfile",
    acronym: undefined,
    category: "SysAdmin - Cloud / Contenedores",
    shortDefinition: "Receta de la imagen: instrucciones en capas (FROM, RUN, COPY, ENV, EXPOSE, CMD) que el builder ejecuta y cachea para 'hornear' la imagen.",
    longDefinition: "Cada instrucción genera una capa cacheable: FROM elige la base, RUN ejecuta comandos, COPY añade archivos, ENV, EXPOSE y LABEL documentan y CMD o ENTRYPOINT definen el arranque; el orden manda: las capas estables (dependencias) arriba para cachearse y el código al final para invalidar solo lo que cambia. El multi-stage compila en una imagen con herramientas y copia solo el artefacto a la imagen final pequeña. Por qué importa: la imagen es el artefacto auditable del despliegue (versionado, firmable, escaneable) y el Dockerfile decide su calidad: peso (120 MB frente a 1.2 GB), seguridad (usuario no root, mínimos paquetes) y reproducibilidad (bases fijadas por versión); es el archivo que separa una imagen artesanal de una de serie. Trampa: el FROM latest y los upgrades dentro de la build rompen la reproducibilidad (la misma build da resultados distintos mañana), y los secretos en capas intermedias quedan en la imagen aunque se borren después: los .env no se copian, se montan en runtime.",
    example: "La imagen de la API pesa 1.2 GB y el build tarda 14 minutos: se reescribe multi-stage (imagen de build completa, runtime slim), npm ci va antes del COPY del código para cachear dependencias y queda en 120 MB con build de 2 minutos: el pipeline de CI respira."
  },
  {
    id: "seed-sa-docker-compose",
    term: "Docker Compose",
    acronym: undefined,
    category: "SysAdmin - Cloud / Contenedores",
    shortDefinition: "Definir y correr una app multicontenedor en un solo YAML: servicios, redes, volúmenes y dependencias con docker compose up -d.",
    longDefinition: "El compose file declara la aplicación completa: servicios (imagen, puertos, variables, restart, límites), volúmenes persistentes, redes internas y depends_on para el orden de arranque; docker compose up -d levanta todo, logs -f sigue la salida y down, pull y build administran el ciclo. El formato (compose spec) se volvió estándar de facto incluso más allá de Docker. Por qué importa: convierte el entorno en un archivo versionado en Git: el stack de monitoreo, el wiki o el entorno de laboratorio completo se levanta con un comando en cualquier máquina; para el SysAdmin es además el vehículo natural de laboratorios reproducibles de estudio y de stacks pequeños y medianos en producción. Trampa: depends_on espera 'arrancado', no 'listo' (la app parte antes de que la base acepte conexiones: healthchecks con condition service_healthy) y sin volúmenes nombrados los datos mueren con el down; y el YAML sin política de restart deja el stack tirado tras cada reinicio del host.",
    example: "El stack de monitoreo del equipo: prometheus, alertmanager y grafana declarados en docker-compose.yml con volúmenes persistentes, red interna y healthchecks; se versiona en Git y el servidor nuevo lo levanta completo con docker compose up -d en cinco minutos."
  },
  {
    id: "seed-sa-registry",
    term: "Registry de contenedores",
    acronym: undefined,
    category: "SysAdmin - Cloud / Contenedores",
    shortDefinition: "Repositorio de imágenes: almacena, versiona por tags y sirve imágenes para pull y push (Docker Hub, Harbor, ECR, ACR, GCR).",
    longDefinition: "El registry guarda imágenes por capas con tags (miapp:1.4.2, miapp:latest) y digests (hashes inmutables del contenido): docker push y pull contra él, con autenticación, y los enterprise (Harbor o los administrados de cada cloud) agregan escaneo de vulnerabilidades, firmas, policies y retención. La referencia por tag es un puntero móvil: el mismo tag puede apuntar a contenido distinto; el digest no cambia jamás. Por qué importa: es la biblioteca central del ciclo de despliegue: imágenes propias versionadas, bases oficiales verificadas y un punto de control de la cadena de suministro (qué puede entrar a producción); sin registry interno, 'cualquier imagen de Docker Hub' se vuelve la política de facto de riesgo. Trampa: el tag latest es una mentira conveniente: dos despliegues del mismo latest pueden correr código distinto (pinnear digest en producción), y sin retención el storage del registry crece para siempre: cada build de CI es una capa nueva que nadie borra.",
    example: "Se monta Harbor interno con escaneo Trivy y retención de 10 versiones por repositorio: la CI publica con el tag del commit, producción despliega por digest exacto y la imagen con vulnerabilidad crítica queda bloqueada por policy antes de llegar al cluster."
  },
  {
    id: "seed-sa-kubectl",
    term: "kubectl",
    acronym: undefined,
    category: "SysAdmin - Cloud / Contenedores",
    shortDefinition: "CLI de Kubernetes: habla con el API server para crear, inspeccionar, editar y depurar objetos del cluster (get, describe, logs, apply, exec, rollout).",
    longDefinition: "kubectl es la puerta al cluster: contextos para cambiar de cluster y namespace (kubectl config get-contexts), get y describe para inspección (pods, deployments, services, events), logs y logs --previous para ver lo que dijo el contenedor antes de morir, exec para entrar, apply -f para declarar estado, rollout status y undo para gestionar despliegues y top, port-forward y proxy para operación; casi todo acepta -o wide o -o yaml y --watch. Por qué importa: es el diagnóstico de producción: 'el pod se reinicia' se resuelve con describe (events: OOMKilled, CrashLoopBackOff, Insufficient memory) y logs --previous; sin kubectl fluente el cluster es una caja negra, y con él los eventos cuentan la historia del incidente sin abrir un solo SSH al nodo. Trampa: el contexto equivocado es el incidente clásico (el apply 'de pruebas' cae sobre producción): contextos con nombre obvio y --context explícito en scripts; y el edit en vivo se pierde con el siguiente apply: la fuente de verdad es Git, no el cluster.",
    example: "El pod del worker entra en CrashLoopBackOff: kubectl describe pod muestra OOMKilled y logs --previous revela el fallo por variable faltante; se corrige el ConfigMap, kubectl rollout restart deployment/worker y los eventos confirman el ciclo estable: 15 minutos de diagnóstico sin consola del host."
  },
  {
    id: "seed-sa-pod",
    term: "Pod",
    acronym: undefined,
    category: "SysAdmin - Cloud / Contenedores",
    shortDefinition: "Unidad mínima de Kubernetes: uno o más contenedores con red y almacenamiento compartidos, programados juntos y con vida y muerte comunes.",
    longDefinition: "El pod agrupa contenedores que deben ejecutarse juntos: comparten IP (se hablan por localhost), volúmenes y ciclo de vida; los sidecars (el proxy de servicio, el exportador de métricas) viajan con el contenedor principal. K8s no replica contenedores: replica pods, y el pod es desechable por diseño: su nombre y su IP cambian al recrearse (los Services dan el nombre estable encima). Por qué importa: es la unidad de razonamiento del cluster: límites (requests y limits), scheduling, monitoreo y reinicios se piensan en pods; sus estados raros (Pending por recursos, OOMKilled, CrashLoopBackOff) son el idioma diario del operador y la mitad del diagnóstico es leerlos bien. Trampa: tratar el pod como mascota: parchear o guardar datos en 'ese' pod se pierde al recrearlo (el estado va en volúmenes y en imágenes); y meter dos contenedores en un pod 'por ahorro' es anti-patrón salvo que compartan ciclo de vida real: escalar uno escala el otro, se quiera o no.",
    example: "El pod api-7d9f-x2kl queda Pending: describe muestra 'Insufficient memory' en todos los nodos porque los requests del deployment superan el hueco libre; se ajustan los requests, el scheduler lo coloca al instante y la causa raíz queda documentada en el ticket."
  },
  {
    id: "seed-sa-deployment",
    term: "Deployment",
    acronym: undefined,
    category: "SysAdmin - Cloud / Contenedores",
    shortDefinition: "Objeto de K8s que declara cuántas réplicas de un pod y con qué imagen: gestiona el rolling update y el rollback de los despliegues automáticamente.",
    longDefinition: "El deployment describe el estado deseado (imagen, réplicas, recursos) y el controlador lo sostiene: crea y escala ReplicaSets, reemplaza pods viejos por nuevos según la estrategia (RollingUpdate con maxSurge y maxUnavailable, o Recreate) y corrige cualquier desviación (el pod borrado a mano reaparece). kubectl rollout status, undo e history administran el ciclo con revisiones numeradas. Por qué importa: es la declaración que reemplaza al runbook de despliegue: sin SSH, sin pasos manuales, con historia de revisiones y rollback de un comando; junto con Git (el YAML versionado) es la base del flujo declarativo que define la operación moderna de plataformas. Trampa: cambiar a una imagen latest sin tag nuevo 'no despliega nada' (los pods ya la tenían y el rollout cree que todo está igual), y sin readinessProbe el rollout va retirando pods viejos mientras los nuevos aún no sirven: caída de servicio en un despliegue 'exitoso'.",
    example: "Despliegue de la API v2.3.1: kubectl apply crea los pods nuevos, la readinessProbe los habilita por olas y se retiran los viejos (maxUnavailable 0); se detecta un bug en v2.3.1 y kubectl rollout undo deployment/api devuelve la 2.3.0 en 90 segundos, sin juntas."
  },
  {
    id: "seed-sa-ingress",
    term: "Ingress",
    acronym: undefined,
    category: "SysAdmin - Cloud / Contenedores",
    shortDefinition: "Objeto de K8s que publica servicios HTTP(S) hacia afuera: rutas por host y path con TLS terminado en el borde; el controller es quien lo materializa.",
    longDefinition: "El Ingress declara el enrutamiento L7: 'lo que llegue a api.empresa.com/v1 va al service api' con TLS y rewrites; el ingress controller (nginx, traefik o el del cloud) es el pod que realmente escucha el tráfico y obedece esas reglas; sin controller, el Ingress es un deseo inerte. cert-manager automatiza los certificados sobre el controller. Por qué importa: centraliza la publicación: un punto para TLS, rutas y rate limiting en vez de un NodePort o balanceador por servicio; es el 'virtual host' del mundo K8s y la primera parada cuando 'la URL no responde': el ingress existe, el controller lo procesa y el service tiene endpoints: tres eslabones que fallan de forma distinta. Trampa: confundir Service (L4, balanceo interno) con Ingress (L7, publicación) lleva a NodePorts regados por todo el cluster; y el controller sin réplicas redundantes es un punto único de falla que tumba TODAS las URLs publicadas de golpe.",
    example: "La API interna necesita URL con TLS: se crea el Ingress api.midominio.com apuntando al service, el controller nginx (con cert-manager) emite y renueva el certificado, y la regla queda versionada en Git junto con el resto de los manifiestos."
  },
  {
    id: "seed-sa-hpa",
    term: "HPA",
    acronym: "HPA",
    category: "SysAdmin - Cloud / Contenedores",
    shortDefinition: "Horizontal Pod Autoscaler: ajusta las réplicas de un deployment según métricas vivas (CPU, memoria o custom) entre el mínimo y el máximo declarados.",
    longDefinition: "El HPA consulta métricas (metrics-server o el adapter de Prometheus) y escala réplicas: si el uso promedio por pod supera el objetivo, agrega pods hasta el máximo; si cae, retira hasta el mínimo, con ventanas de estabilización para no oscilar; el escalado es horizontal (más pods) y el cluster autoscaler complementa escalando los nodos. Por qué importa: absorbe los picos sin sobreaprovisionar fijo: la granja pasa de 6 a 24 pods en hora pico y vuelve cuando baja la carga: el ahorro real de contenedores frente a VMs dimensionadas para el peor día, y la diferencia entre 'máquinas en la nube' y operación cloud-native. Trampa: sin requests declarados en el pod el cálculo de porcentaje no existe (el HPA no escala: los porcentajes se calculan contra los requests); y escalar pods no escala la base de datos ni los nodos: el pico encuentra el próximo cuello de botella (conexiones, pods Pending) y el autoscaler felizmente le agrega presión encima.",
    example: "La campaña triplica el tráfico del checkout: el HPA sube de 6 a 24 pods conforme la CPU en minutos; el pool de conexiones de la base llega al tope y esa alerta (no la del HPA) delata el siguiente cuello: se dimensiona el pool y la campaña pasa sin incidente."
  },
  {
    id: "seed-sa-iaas-paas-saas",
    term: "IaaS, PaaS y SaaS",
    acronym: undefined,
    category: "SysAdmin - Cloud / Contenedores",
    shortDefinition: "Modelos de servicio cloud: IaaS entrega infraestructura cruda (VMs, redes), PaaS plataformas gestionadas (BD, runtimes) y SaaS software terminado.",
    longDefinition: "IaaS: el proveedor da VMs, storage y redes; tú administras el sistema operativo y todo lo de arriba (EC2, Azure VMs). PaaS: la plataforma ya gestionada (Azure SQL, RDS, App Service): traes código y datos, sin parchear sistema operativo. SaaS: el software completo del proveedor (M365, Salesforce): administras usuarios, accesos e integraciones. El modelo de responsabilidad compartida cambia en cada nivel: en IaaS el parcheo del SO es tuyo; en PaaS el proveedor parchea la plataforma pero tú la configuración; en SaaS tú gestionas accesos e integraciones. Por qué importa: decidir el nivel por carga es la decisión de arquitectura y presupuesto más frecuente: qué opero yo y qué delego; sin tener claro quién responde por qué aparecen sistemas sin dueño de parcheo y brechas de responsabilidad que la auditoría cobra caras. Trampa: el 'está en la nube, ellos lo parchean' aplicado a IaaS es el hallazgo clásico de auditoría: VMs sin actualizar durante años porque nadie leyó el modelo de responsabilidad compartida.",
    example: "Arquitectura de la app nueva: front y API como PaaS (sin servidores que parchear), base de datos gestionada con respaldos incluidos y solo el legacy de integración como VM IaaS con su runbook; el acta define línea por línea quién parchea qué."
  },
  {
    id: "seed-sa-region-az",
    term: "Región y zona de disponibilidad",
    acronym: undefined,
    category: "SysAdmin - Cloud / Contenedores",
    shortDefinition: "Región: área geográfica del proveedor cloud; zona de disponibilidad (AZ): datacenter independiente dentro de la región con energía y red propias.",
    longDefinition: "Una región agrupa varias zonas de disponibilidad: datacenters aislados entre sí (fallas independientes) pero interconectados con fibra de baja latencia; desplegar en múltiples AZ sobrevive la caída de un datacenter completo sin salir de la región, y multi-región sobrevive desastres regionales agregando latencia, costo y complejidad de replicación de datos. Buena parte de los recursos y precios son regionales: elegir región es elegir también catálogo de servicios, latencia a los usuarios y marco legal de los datos. Por qué importa: el nivel de redundancia (y su factura) se decide aquí: multi-AZ es el estándar de producción y multi-región se reserva para DR real o cercanía al usuario; y la consistencia de datos entre regiones (réplica síncrona o asíncrona) define si el DR es de minutos o de horas. Trampa: dos VMs 'redundantes' en la misma AZ no son redundantes (comarten datacenter) y las IPs y varios recursos son regionales: 'moverse de región' no es mover, es migrar con recreación y transferencia de datos.",
    example: "La base gestionada se despliega multi-AZ: el proveedor mantiene una réplica síncrona en otra zona y hace failover automático; el mantenimiento programado de la AZ primaria se ejecuta un domingo y las apps conectadas al endpoint no registran ni un minuto de error."
  },
  {
    id: "seed-sa-vnet",
    term: "VNet",
    acronym: "VNet",
    category: "SysAdmin - Cloud / Contenedores",
    shortDefinition: "Red virtual privada en la nube: tu bloque CIDR privado con subredes, tablas de rutas, security groups y peering, aislado de otros clientes.",
    longDefinition: "La VNet es la LAN propia en el cloud: un bloque CIDR subdividido en subredes (por zona o por rol), con route tables, NACLs y security groups, y las puertas hacia afuera: peering entre VNets, VPN site-to-site o interconexión dedicada hacia on-premise; el DNS privado de la VNet resuelve los nombres internos. Por qué importa: es el fundamento del aislamiento y la segmentación en la nube: qué subred habla con qué, cómo se sale a Internet y cómo llegan los usuarios corporativos; y el direccionamiento ES la decisión que no se puede deshacer: un rango que colisiona con la LAN de la oficina condena la integración híbrida porque no hay rutas posibles entre iguales. Trampa: el CIDR de la VNet no se puede cambiar después de crearla (hay que recrear todo): planear el direccionamiento con margen y documentarlo ANTES del primer despliegue; y las subredes se agotan: un /24 'de sobra' se llena con IPs de balanceadores y servicios que nadie presupuestó.",
    example: "La VNet nueva 10.40.0.0/16 con subredes por rol y por zona, peering con la VNet hub de servicios compartidos y VPN site-to-site hacia la oficina; el documento de direccionamiento corporativo se actualiza ANTES del despliegue y el conflicto con la LAN se detecta en papel, no en producción."
  },
  {
    id: "seed-sa-security-group",
    term: "Security group",
    acronym: undefined,
    category: "SysAdmin - Cloud / Contenedores",
    shortDefinition: "Firewall stateful a nivel de instancia o subred en la nube: reglas de permit por puerto y origen/destino; lo no permitido se deniega.",
    longDefinition: "El security group filtra el tráfico de cada interfaz: reglas de entrada y salida por protocolo, puerto y origen (un CIDR, otro security group o un prefijo), con seguimiento de estado (las respuestas vuelven solas) y lógica de solo permitir: no hay deny explícito, lo no cubierto se bloquea. Referenciar security groups entre sí (el grupo de las apps puede hablar al grupo de la base por el 5432) sustituye el mantenimiento de listas de IPs. Por qué importa: es la unidad de segmentación de la nube: 'la base solo acepta del security group de las apps' es la traducción cloud de la segmentación por VLAN, y como viaja con los recursos en las plantillas (IaC), la seguridad se despliega junto con el servicio en vez de después de él. Trampa: el 0.0.0.0/0 en puertos de gestión (22, 3389, 3306) 'para probar' es la puerta más explotada del ecosistema, y las reglas acumuladas por copiar y pegar heredan permisos que nadie recuerda: hay que revisarlas con la misma disciplina (dueño, descripción, fecha de revisión) que un firewall físico.",
    example: "La auditoría de la suscripción detecta el puerto 22 abierto a 0.0.0.0/0 en una VM de pruebas desde hace meses, con intentos de login en los logs: se restringe al CIDR de la VPN corporativa, la regla queda con dueño y descripción, y el hallazgo se cierra con la evidencia del cambio."
  },
  {
    id: "seed-sa-load-balancer",
    term: "Load balancer",
    acronym: undefined,
    category: "SysAdmin - Cloud / Contenedores",
    shortDefinition: "Reparte el tráfico entre múltiples backends sanos: el health check retira a los enfermos y el balanceo mantiene el servicio ante caídas y despliegues.",
    longDefinition: "El balanceador expone un VIP o endpoint y reparte entre los backends que pasan el health check (HTTP o TCP): el que falla el chequeo sale de rotación y vuelve al recuperarse; los algoritmos van de round-robin a menor número de conexiones, y hay niveles L4 (TCP puro) y L7 (HTTP con rutas, cookies y TLS). En la nube, el balanceador con IP pública es la forma correcta de publicar, frente a la IP pública en cada VM. Por qué importa: es la pieza que hace que una instancia pueda caerse sin que el usuario lo note: redundancia real de servicio y despliegues sin ventana (se retira un backend, se actualiza, vuelve a rotación); y su health check es el estándar de verdad sobre qué está sano, no el ping. Trampa: el health check que mide la raíz '/' cuando la app sirve su estado real en otra ruta deja pasar backends enfermos como 'sanos', y las sesiones pegadas (sticky) dejan al usuario en la instancia que se va a reiniciar: configurar el drenaje antes de desplegar.",
    example: "Despliegue sin downtime: se retira una instancia del pool (draining), se actualiza, su health check vuelve verde y reingresa a rotación antes de tocar la siguiente; el rollback es volver a la imagen anterior en la misma secuencia: el usuario nunca nota la diferencia."
  },
  {
    id: "seed-sa-auto-scaling",
    term: "Auto-scaling",
    acronym: undefined,
    category: "SysAdmin - Cloud / Contenedores",
    shortDefinition: "Ajuste automático de capacidad: agrega o retira instancias según métricas (CPU, colas, horarios) entre el mínimo y el máximo definidos.",
    longDefinition: "El grupo de auto-scaling define plantilla, mínimo, máximo y políticas: agrega instancias cuando la métrica dispara (CPU sostenida, profundidad de cola, métricas custom) y las retira al caer, con cooldowns para no oscilar; las instancias nuevas se registran solas al balanceador y corren la misma imagen y configuración (de ahí la necesidad de 'ganado, no mascotas'). El escalado vertical (más grande) topa y reinicia; el horizontal es el cloud-native. Por qué importa: convierte el pico en costo temporal en vez de dimensionar para el peor viernes del año: capacidad y factura siguen la curva real de uso; junto al balanceador y los health checks es la resiliencia automática de referencia en la nube. Trampa: escalar el eslabón equivocado (agregar web servers cuando el cuello es la base de datos solo suma costo y conexiones), y el mínimo de 1 instancia 'para ahorrar' aniquila la disponibilidad: mínimo 2 en todo lo que importe, o el parcheo de la única instancia es un incidente.",
    example: "El procesamiento nocturno encola millones de registros: la política de auto-scaling por profundidad de cola levanta 8 workers de 01:00 a 04:00 que drenan la cola y se retiran solos: el batch pasa de 9 horas a 3 sin servidores fijos pagando el mes entero."
  },
  {
    id: "seed-sa-finops",
    term: "Egress y FinOps",
    acronym: undefined,
    category: "SysAdmin - Cloud / Contenedores",
    shortDefinition: "Egress: el costo del tráfico que SALE de la nube; FinOps: la práctica de gestionar la factura cloud con visibilidad, presupuestos y optimización.",
    longDefinition: "En la mayoría de proveedores el tráfico entrante es gratis y el saliente (hacia Internet o hacia otra región) se cobra por GB: mover decenas de TB de respaldos o bases desde la nube puede costar más que el storage mismo. FinOps es la disciplina que ata la factura a la realidad: etiquetado por equipo y proyecto, presupuestos y alertas de gasto, caza de recursos ociosos (discos huérfanos, IPs reservadas, instancias al 5%), rightsizing y compromisos de uso (reservas). Por qué importa: la nube convierte el CAPEX en OPEX y la factura crece en silencio sin dueño: el SysAdmin que sabe leerla y predecirla se vuelve insustituible; y el egress es un factor de arquitectura (dónde viven los respaldos y por qué 'la nube barata' puede arruinar el restore caro). Trampa: el restore masivo de DRP desde la nube con egress alto puede costar miles de dólares en horas y nadie lo presupuesta hasta que ocurre; y sin política de tags ANTES del primer despliegue, la factura es una sopa imposible de delegar por equipo.",
    example: "Revisión FinOps mensual: el reporte por tags revela 40 discos huérfanos de pruebas (600 USD al mes), un bucket sirviendo 3 TB de egress por una configuración equivocada y dos instancias al 8% de CPU: rightsizing y limpieza bajan la factura 18% y el acta queda como evidencia del ciclo."
  },
  {
    id: "seed-sa-zabbix",
    term: "Zabbix",
    acronym: undefined,
    category: "SysAdmin - Monitoreo & Observabilidad",
    shortDefinition: "Plataforma de monitoreo todo en uno: agentes y checks sin agente (SNMP, ICMP) recolectan métricas; los triggers convierten umbrales en alertas y acciones.",
    longDefinition: "Zabbix modela el monitoreo en capas: hosts con interfaces, items (cada métrica con su intervalo), triggers (la lógica que dispara: disco al 90% durante 10 minutos) y actions (notificar, escalar, ejecutar comandos); la recolección es por agente (zabbix_agentd: métricas del OS a fondo), SNMP e IPMI para red y hardware, y templates que empaquetan el stack completo de un equipo listo para importar; los proxies extienden el alcance a sedes. Por qué importa: es el monitoreo on-premise por excelencia: maduro, libre, con mapas de red, tendencias y escalamiento; el día a día del operador es importar templates, afinar triggers y responder a lo que disparan: la salud de la flota vive o muere en la calidad de esos tres oficios. Trampa: los triggers sin histéresis ni dependencias producen tormentas (cada puerto del switch 'cae' cuando cae el switch: 60 alertas por un evento) que enseñan al equipo a ignorarlas TODAS, y monitorear cientos de items por minuto degrada el server: intervalos realistas por tipo de métrica.",
    example: "El template de Linux por defecto disparaba 'disco lleno' por spikes de segundos: se reescriben los triggers con promedios de 10 minutos, se agregan dependencias (host down silencia sus items) y las alertas nocturnas del NOC caen de 40 a 3 por noche."
  },
  {
    id: "seed-sa-grafana",
    term: "Grafana",
    acronym: undefined,
    category: "SysAdmin - Monitoreo & Observabilidad",
    shortDefinition: "Visualización de series de tiempo: consulta data sources (Prometheus, Zabbix, logs, SQL) y arma dashboards con paneles, variables y alertas.",
    longDefinition: "Grafana no almacena: consulta (PromQL, las métricas de Zabbix, Loki para logs, incluso SQL) y pinta: dashboards con paneles, variables para filtrar (host, entorno, datacenter), anotaciones de eventos (cada deploy o ventana marcada en la línea de tiempo) y alertas construidas sobre las mismas consultas; los dashboards son JSON versionable y compartible (Git, bibliotecas). Por qué importa: es la cara visible del monitoreo: la pantalla del NOC, el tablero de la guardia y el informe de capacidad nacen aquí; un dashboard bien diseñado (pocas métricas que importan, comparativas, zoom al incidente con las anotaciones de los cambios) convierte 20 minutos de SSH en 30 segundos de mirar; el mal diseñado es decoración cara. Trampa: los dashboards de 40 paneles que nadie mira (agregan carga y ruido visual) y las variables sin valor por defecto que rompen todos los paneles al abrir: cada panel debe responder una pregunta con nombre, no exhibir una métrica.",
    example: "El dashboard de guardia 'Salud del perímetro': latencia de enlaces, túneles up, sesiones de los firewalls y errores 5xx del proxy, con anotaciones automáticas de cada deploy; en el incidente del jueves, la caída del túnel correlaciona en pantalla con el deploy de las 12:40 sin abrir un solo SSH."
  },
  {
    id: "seed-sa-prometheus",
    term: "Prometheus",
    acronym: undefined,
    category: "SysAdmin - Monitoreo & Observabilidad",
    shortDefinition: "Base de series de tiempo y motor de recolección pull: scrapea las métricas que cada target expone en /metrics y se consulta con PromQL.",
    longDefinition: "Prometheus centraliza el modelo pull: cada target (exporter, app instrumentada) expone /metrics en texto plano con labels; el server los scrapea cada N segundos y guarda las series en su base local; PromQL consulta y agrega (rate, sum by), y las reglas de alerta se evalúan sobre esas consultas disparando a Alertmanager. El ecosistema aporta exporters para todo y proyectos que extienden retención y escala (Thanos, VictoriaMetrics). Por qué importa: es el estándar de hecho del monitoreo cloud-native: sin Prometheus no hay HPA custom, ni dashboards vivos de K8s, ni alertas de series temporales; su modelo de labels (todo lo que se mide viene etiquetado: host, job, instancia) es lo que hace poderosas las consultas y compartibles los dashboards entre equipos. Trampa: es pull: el target caído NO genera serie (ausencia de datos, no ceros: las consultas deben contemplar el 'up' y las ventanas mínimas de rate), y la retención local es corta por diseño: sin capa de retención larga, la pregunta 'desde cuándo' de hace tres semanas no tiene respuesta.",
    example: "El cluster nuevo: node_exporter en los nodos y kube-state-metrics exponen /metrics, Prometheus los scrapea cada 30 segundos, la regla de CPU sostenida dispara a Alertmanager y Grafana pinta los paneles con las mismas consultas: el stack completo conectado en una tarde."
  },
  {
    id: "seed-sa-umbral",
    term: "Umbral",
    acronym: undefined,
    category: "SysAdmin - Monitoreo & Observabilidad",
    shortDefinition: "Valor límite de una métrica que dispara una alerta o estado (disco al 90%, CPU al 80%): la frontera entre lo normal y lo accionable.",
    longDefinition: "El umbral se define sobre la métrica con condiciones de tiempo y lógica: 'disco al 90% sostenido 10 minutos', 'promedio de CPU al 80% en 2 de 3 mediciones'; se acompaña de histéresis (dispara al subir de 90, aclara al bajar de 85) para evitar el flapping, y de severidades según el valor. Su calidad decide todo: el umbral correcto se cruza antes de que el servicio se degrade y después del ruido normal del sistema. Por qué importa: el 90% del valor de un sistema de monitoreo está en sus umbrales: mal calibrados generan tormentas (el equipo aprende a ignorar TODO) o silencio (el incidente lo reporta el usuario, la peor alarma); afinarlos con historia (percentiles, patrones de hora pico) es la tarea eterna que separa un tablero de adorno de una guardia operable. Trampa: los umbrales universales ignoran que el disco de logs crece en horas y el de datos en meses: umbral por tipo de recurso y por tendencia ('llegará al 90% en 24 horas' avisa el jueves); y alertar al 100% ya consumido no es alerta: es obituario.",
    example: "El /var/log de los 60 servidores cruza 85% cada fin de semana por rotación tardía: se parametriza el umbral con promedio de 10 minutos y se agrega el trigger de tendencia; la alerta llega el jueves con margen para limpiar, no el domingo con el servicio caído."
  },
  {
    id: "seed-sa-sre",
    term: "SRE",
    acronym: "SRE",
    category: "SysAdmin - Monitoreo & Observabilidad",
    shortDefinition: "Site Reliability Engineering: operar los sistemas con prácticas de ingeniería: SLOs con error budgets, automatización del toil y postmortems sin culpa.",
    longDefinition: "SRE (nacido en Google) traduce la confiabilidad a ingeniería: se mide (SLIs y SLOs), se presupuesta el error (error budget: cuánta falla es aceptable), se automatiza el trabajo manual repetitivo (toil), se responde con roles claros de incidente y se aprende con postmortems blameless; cuando el presupuesto de error se agota, se congela el trabajo de features a favor de confiabilidad: la confiabilidad es una característica con presupuesto. Por qué importa: es el marco que convierte 'andar apagando incendios' en un sistema medible y mejorable: las discusiones pasan de 'está lento' a 'el SLO de latencia p99 lleva tres semanas en rojo'; y la progresión de SysAdmin hacia SRE es la ruta de carrera natural del rol de infraestructura moderna. Trampa: copiar los rituales (postmortems, dashboards) sin los números (SLIs reales acordados con el negocio) es SRE de cosplay: la confiabilidad no se declara, se mide; y el error budget sin consecuencia al agotarse es decoración.",
    example: "El equipo de plataforma acuerda con el negocio un SLO de 99.5% para el checkout: el trimestre con tres incidentes grandes quema el presupuesto y la dirección congela el roadmap dos sprints para pagar deuda de infraestructura: la conversación pasó de intuiciones a aritmética."
  },
  {
    id: "seed-sa-noc",
    term: "NOC",
    acronym: "NOC",
    category: "SysAdmin - Monitoreo & Observabilidad",
    shortDefinition: "Network Operations Center: el equipo y los turnos que vigilan la infraestructura en tiempo real, triagean alertas y ejecutan los runbooks de primera respuesta.",
    longDefinition: "El NOC es la guardia de la infraestructura: pantallas con el estado (dashboards), turnos cubriendo 24/7 o horario extendido, y un flujo: la alerta entra, se triagea (¿es real?, ¿qué impacto tiene?, ¿qué runbook aplica?), se ejecuta la primera respuesta documentada y se escala al especialista o al on-call si no resuelve; sus herramientas son el monitoreo, los runbooks, la bitácora y el handover escrito de cada turno. Por qué importa: es el primer anillo de respuesta: la diferencia entre un incidente contenido en minutos con un runbook claro y uno descubierto cuatro horas después por el usuario; y para el SysAdmin junior el NOC es la escuela: ver cientos de incidentes reales y sus patrones entrena el criterio que ningún curso da. Trampa: el NOC sin runbooks ni criterio de escala degenera en 'pantallas y clics' (reiniciar sin diagnosticar, alertas cerradas sin causa raíz), y sin handover escrito cada cambio de turno reinicia el diagnóstico del incidente de la noche: la memoria del NOC es la bitácora, no la cabeza de la gente.",
    example: "03:40: el NOC recibe 'túnel sede norte down': ejecuta el runbook TUN-01 (verificar fase 2, logs del ISP, failover al enlace de respaldo), confirma el corte del operador, activa el enlace 4G de emergencia y escala a L3 con toda la evidencia; el handover de las 07:00 cuenta la historia completa."
  },
  {
    id: "seed-sa-postmortem",
    term: "Postmortem",
    acronym: undefined,
    category: "SysAdmin - Monitoreo & Observabilidad",
    shortDefinition: "Análisis posterior al incidente: línea de tiempo, causa raíz, impacto medido y acciones con dueño y fecha; sin culpas para que la verdad salga.",
    longDefinition: "El postmortem reconstruye el incidente: timeline (detección, diagnóstico, mitigación, cierre), impacto en usuarios y negocio con números, causa raíz técnica (el porqué del porqué, no 'alguien se equivocó'), qué funcionó y qué falló del proceso, y action items con dueño y fecha. La cultura blameless no elimina la responsabilidad: elimina el miedo a contar lo que pasó, porque la causa raíz es casi siempre sistémica (proceso, prioridad, herramienta), no maldad. Por qué importa: es el único mecanismo que convierte cada incidente en mejora permanente: sin postmortem, el mismo ticket renace en tres meses; con postmortem, la acción con dueño mata la CLASE de incidente, y la biblioteca de postmortems se vuelve la memoria operativa de la organización. Trampa: los action items sin dueño ni fecha ('se revisará') son decoración, y el postmortem para buscar culpable garantiza que el próximo incidente se reporte tarde y con medias verdades: el objetivo es el sistema, no el disparo.",
    example: "Postmortem del P1 de facturación: el timeline muestra 47 minutos entre la caída y la primera acción porque la alerta caía a un buzón sin vigilar; causa raíz: el cambio no tenía verificación post-implementación; tres acciones con dueño (alerta al pager, checklist post-cambio, runbook de rollback) cierran en el sprint siguiente."
  },
  {
    id: "seed-sa-sli",
    term: "SLI",
    acronym: "SLI",
    category: "SysAdmin - Monitoreo & Observabilidad",
    shortDefinition: "Service Level Indicator: la métrica concreta que mide la experiencia del servicio (tasa de éxito, latencia p99, disponibilidad).",
    longDefinition: "Un SLI mide lo que el usuario experimenta: proporción de requests exitosas, latencia p99 (la experiencia del 1% más lento: nadie sufre el promedio), frescura de los datos o disponibilidad del endpoint medida desde afuera. Cada SLI se define con ventana (5 minutos, 30 días rodantes) y fuente de verdad (logs, métricas, probes sintéticos). Por qué importa: sin SLI no hay conversación de confiabilidad: 'está lento' se convierte en 'la latencia p99 está en 1.8 segundos contra 800 ms de objetivo'; elegir los pocos SLIs correctos (orientados al usuario y medibles desde su punto de vista) es la decisión fundacional de todo el stack SRE: de aquí bajan el SLO, el error budget y las prioridades. Trampa: medir la salud del servidor y llamarla salud del servicio (CPU tranquila con usuarios en error por una dependencia caída: el SLI interno en verde mientras el usuario sufre), y los promedios que esconden la cola: el p99 y el p99.9 son la verdad incómoda.",
    example: "El SLI del checkout se define como 'requests con respuesta exitosa en menos de 800 ms medidas desde el probe externo': en el incidente del viernes cae al 62% aunque la CPU de los servidores nunca pasó del 50%: el problema era el proveedor de pagos, y el SLI lo delató en minutos."
  },
  {
    id: "seed-sa-slo",
    term: "SLO",
    acronym: "SLO",
    category: "SysAdmin - Monitoreo & Observabilidad",
    shortDefinition: "Service Level Objective: el objetivo interno de confiabilidad sobre un SLI (99.5% de éxito en 30 días): lo bastante bueno para poder innovar.",
    longDefinition: "El SLO fija la meta sobre el SLI con una ventana rodante (99.5% de éxito en 30 días); la cifra se acuerda con el negocio: 100% es imposible (mantenimientos y fallas) y carísimo; el SLO correcto deja un error budget para gastar en cambios y riesgo controlado, y cuando se agota, se congela lo nuevo a favor de confiabilidad. Por qué importa: traduce 'confiable' a un número operable: prioriza el trabajo (qué sistema viola su SLO hoy), permite decidir con datos (pagar redundancia frente a aceptar riesgo) y detiene la escalada eterna del 'más disponible siempre': la disponibilidad se compra con velocidad de cambio. Trampa: los SLO copiados de plantilla (99.99% para un servicio interno que tolera reinicios) que nadie puede pagar, y el SLO sin ventana ni medición es un deseo: empezar por dos o tres servicios clave y madurar los números con la operación real.",
    example: "El servicio de reportes internos queda con SLO 99% (procesa batch y tolera reinicios) y el checkout con 99.9%: la discusión de inversión del trimestre se apoya en esos números para decidir dónde comprar redundancia: la conversación pasa de opiniones a aritmética."
  },
  {
    id: "seed-sa-sla",
    term: "SLA",
    acronym: "SLA",
    category: "SysAdmin - Monitoreo & Observabilidad",
    shortDefinition: "Service Level Agreement: compromiso contractual con el cliente (disponibilidad, tiempos de respuesta) con penalización por incumplimiento.",
    longDefinition: "El SLA es el contrato: 99.9% mensual de disponibilidad, respuesta a P1 en 15 minutos, crédito del 10% de la factura si se incumple; a diferencia del SLO (objetivo interno), el SLA es externo y legal: lo incumplido se paga, y define exclusiones (mantenimiento programado, fuerza mayor) y la forma de medir y acreditar. El buen diseño interno: el SLA contractual un escalón más holgado que el SLO, para que los incidentes normales no rocen la multa. Por qué importa: define la expectativa del cliente y las obligaciones del equipo: saber leerlo (qué cuenta, qué no, cómo se acredita) evita prometer en contrato lo que la operación no sostiene; y detrás de cada P1 del SLA hay dinero directo: prioridad objetiva, no adrenalina. Trampa: la disponibilidad del SLA suele excluir el mantenimiento programado, lo que incentiva 'bautizar' post-facto los incidentes como mantenimiento (fraude de métrica), y medir por dentro (el uptime del servidor) cuando el contrato mide por fuera (del lado del usuario) fabrica disputas de cifra.",
    example: "Mes con 43 minutos de caída del portal: el SLA contractual de 99.9% mensual admite 43.2: se cumplió por 12 segundos; el comité pide revisar el diseño y el SLO interno se sube a 99.95% para no volver a rozar la multa: el aprendizaje va al acta del comité."
  },
  {
    id: "seed-sa-error-budget",
    term: "Error budget",
    acronym: undefined,
    category: "SysAdmin - Monitoreo & Observabilidad",
    shortDefinition: "El presupuesto de falla permitida por el SLO (100% menos el objetivo): cuánta indisponibilidad se puede 'gastar' antes de frenar los cambios.",
    longDefinition: "Con un SLO de 99.5%, el error budget mensual es 0.5% (unas 3.6 horas): lo consumen los incidentes, los reinicios de mantenimiento y el riesgo de los despliegues; la política: mientras hay presupuesto, se lanza con velocidad; agotado, se congelan cambios y el equipo invierte en confiabilidad hasta recuperar margen. Se monitorea como métrica viva (burn rate: qué tan rápido se quema). Por qué importa: resuelve la disputa eterna entre innovación y estabilidad con un número: la velocidad de cambio se paga con presupuesto y este se ve en el dashboard; convierte el 'estamos cayéndonos mucho' en 'quemamos el 80% del presupuesto a mitad de mes' y le da a la dirección una palanca objetiva y acordada de antemano. Trampa: el presupuesto que nadie mide no existe como práctica (¿cómo se gasta lo invisible?) y gastarlo de golpe en un mantenimiento masivo sin avisar al negocio rompe la confianza en el sistema: el budget es un contrato, no una alcancía.",
    example: "El burn rate se dispara 3 veces por dos días por una fuga de memoria: el comité de cambios pospone el lanzamiento de la campaña, el sprint se dedica al fix del worker, el presupuesto se estabiliza y el lanzamiento entra dos semanas después sin riesgo contractual: el postmortem lo celebra como proceso, no como suerte."
  },
  {
    id: "seed-sa-exporter",
    term: "Exporter",
    acronym: undefined,
    category: "SysAdmin - Monitoreo & Observabilidad",
    shortDefinition: "Programa que traduce las métricas de una fuente (OS, base de datos, SNMP) al formato /metrics de Prometheus para que el server las scrapee.",
    longDefinition: "El exporter expone su dominio en el formato texto de Prometheus con labels: node_exporter (CPU, memoria, discos y red del OS), blackbox_exporter (probes HTTP, TCP e ICMP desde afuera: la experiencia del usuario) y uno por tecnología (mysqld, windows, snmp, ipmi); Prometheus scrapea al exporter y este traduce del sistema fuente (contadores, APIs, MIBs) a series temporales. Por qué importa: es la pieza que hace el monitoreo universal: casi cualquier cosa con métricas tiene exporter listo (o se instrumenta el código directamente), y el estándar común de labels hace que dashboards y alertas se compartan entre equipos y empresas: el ecosistema es la ventaja competitiva de todo el stack. Trampa: el exporter del lado equivocado del problema: node_exporter DENTRO del contenedor mide la vista del invitado (cuotas, no la saturación real del host: el host puede estar ahogado con el invitado 'tranquilo'); y los exporters desactualizados exponen métricas renombradas que rompen silenciosamente los dashboards que las consultaban.",
    example: "Se instala mysqld_exporter con cuenta de solo lectura: Prometheus scrapea conexiones y queries lentas; la regla de caída del servicio de MySQL dispara la alerta y el dashboard de guardia muestra el pool de conexiones saturado antes de que la app empiece a fallar."
  },
  {
    id: "seed-sa-scraping",
    term: "Scraping",
    acronym: undefined,
    category: "SysAdmin - Monitoreo & Observabilidad",
    shortDefinition: "La recolección pull de Prometheus: el server consulta /metrics de cada target según su intervalo y guarda las series con su timestamp.",
    longDefinition: "En el modelo pull, Prometheus pregunta: cada scrape_interval (30 segundos típico) pide /metrics a cada target del listado (service discovery en K8s, file_sd o estático), el target responde con sus series actuales y el server las timestampa y almacena; el intervalo ES la resolución máxima: entre scrapes no existe nada. El modelo push existe para casos de vida corta (jobs de batch: Pushgateway). Se puede depurar a mano: curl al /metrics del target muestra exactamente lo que el server ve. Por qué importa: el pull simplifica la operación: el target no sabe quién lo monitorea (se puede balancear el scraping, depurar con curl y detectar el target muerto porque el scrape falla), y el service discovery automatiza el qué-monitorear en entornos donde los pods nacen y mueren por docenas. Trampa: las reglas sobre rate() necesitan al menos dos puntos: con intervalos de 60 segundos, las ventanas de 1 minuto casi no tienen datos; y los targets efímeros (jobs de segundos) mueren sin ser scrapeados jamás: para esos es Pushgateway, no scraping agresivo.",
    example: "Una alarma 'nunca dispara': curl localhost:9100/metrics muestra la métrica plana en cero; el intervalo era de 5 minutos y el pico dura 40 segundos: se baja el intervalo del grupo a 30 segundos, la regla pasa a rate sobre 2 minutos y la alerta aparece en el siguiente incidente real."
  },
  {
    id: "seed-sa-alertmanager",
    term: "Alertmanager",
    acronym: undefined,
    category: "SysAdmin - Monitoreo & Observabilidad",
    shortDefinition: "El cartero del stack Prometheus: agrupa, deduplica, silencia y enruta las alertas a quien corresponde, con escalamiento si nadie atiende.",
    longDefinition: "Alertmanager recibe las alertas que disparan las reglas de Prometheus y las gestiona antes de notificar: agrupación (50 alertas de disco del mismo incidente son 1 notificación), inhibición (el 'switch down' silencia las 30 alertas de sus servicios dependientes), silencios programados (ventanas de mantenimiento), rutas por severidad y equipo con escalamiento temporal si no hay reconocimiento; la alerta viaja con labels y annotations (el resumen y el link al runbook). Por qué importa: es la diferencia entre un sistema de notificaciones y un sistema de guardia: sin agrupación e inhibición, cada incidente es una tormenta de pings que el equipo aprende a silenciar ENTERO (y con ella la alerta real); el routing y los silencios auditable son la higiene del on-call. Trampa: los silencios eternos y los routings a buzones sin vigilar son la deuda silenciosa del monitoreo (la alerta 'se envió' pero nadie la vio: la métrica dice entregado, la guardia dice nunca la vi), y repetir la notificación cada 2 minutos genera fatiga y canales silenciados por toda la oficina.",
    example: "Incidente del switch core: Prometheus dispara 60 alertas; Alertmanager las agrupa en un incidente, inhibe las de los hosts dependientes, notifica al pager del guardia con el link al runbook y re-escala al líder si no hay reconocimiento en 15 minutos: una notificación accionable en lugar de 60 pings."
  },
  {
    id: "seed-sa-ansible",
    term: "Ansible",
    acronym: undefined,
    category: "SysAdmin - Automatización",
    shortDefinition: "Automatización sin agentes: playbooks YAML declaran el estado deseado y el control node lo aplica por SSH y WinRM a cientos de servidores en paralelo.",
    longDefinition: "Ansible empuja desde un control node sin instalar agentes: el inventario lista los hosts (estático o dinámico desde la nube), los playbooks declaran tareas idempotentes con módulos (package, service, template, copy, user), los roles empaquetan lo reutilizable, las variables parametrizan por entorno y ansible-vault cifra los secretos; la ejecución es ansible-playbook -i inventario site.yml, con --check para predecir sin tocar y --diff para ver el cambio exacto. Por qué importa: convierte el runbook de 40 pasos en un comando repetible: parchar flotas, endurecer, desplegar y estandarizar servidores de serie sin drift manual; es la habilidad de automatización número uno del SysAdmin moderno (con módulos de Windows por WinRM incluidos) y el puente natural hacia las prácticas SRE. Trampa: los playbooks no idempotentes se vuelven inconfiables a la segunda corrida, y lanzar con become root contra flotas enteras sin --check previo convierte el typo de una línea en el incidente del trimestre: predecir primero, aplicar después.",
    example: "Campaña de hardening SSH: un rol con las 12 directivas (PermitRootLogin no, ciphers modernos, MaxAuthTries acotado), ansible-playbook -i prod --check muestra los 240 servidores fuera de política, la corrida real los alinea en 4 minutos y el reporte JSON queda adjunto como evidencia de auditoría."
  },
  {
    id: "seed-sa-terraform",
    term: "Terraform",
    acronym: undefined,
    category: "SysAdmin - Automatización",
    shortDefinition: "Infraestructura como código declarativa: recursos descritos en HCL, terraform plan predice el cambio y terraform apply lo materializa contra el proveedor.",
    longDefinition: "Terraform declara el estado deseado en archivos .tf con providers por plataforma (AWS, Azure, vSphere, Proxmox): terraform plan calcula el diff (crear, cambiar, destruir) antes de tocar nada, apply lo ejecuta y el state (remoto, con locking) recuerda qué administra; los módulos parametrizan patrones (la VNet estándar, el servidor de serie) y el flujo maduro va por pull request: plan del PR, revisión, apply controlado. Por qué importa: la infraestructura deja de ser clicks irrepetibles: versionada en Git, auditable, reproducible en otra región o entorno y con destroy igual de controlado que create (adiós IPs y discos huérfanos facturando); el entorno completo del proyecto o del DRP pasa de semanas a horas. Trampa: el state es la verdad: sin state remoto con locking, dos ingenieros se pisan o se pierde el mapa (recursos huérfanos invisibles); y el apply sobre infra con drift manual (alguien cambió por consola) puede destruir y recrear lo tocado: la consola se mira, ya no se toca.",
    example: "El entorno del piloto completo en un módulo: el plan del PR muestra los 14 recursos a crear con costo estimado, apply los levanta en 12 minutos y al cerrar el piloto el destroy aprobado limpia TODO: la factura del mes siguiente no trae sorpresas."
  },
  {
    id: "seed-sa-iac",
    term: "Infra as Code",
    acronym: "IaC",
    category: "SysAdmin - Automatización",
    shortDefinition: "Definir y gestionar la infraestructura en archivos versionados (Terraform, Ansible, Pulumi): Git como fuente de verdad del datacenter.",
    longDefinition: "IaC invierte el flujo: la infraestructura se escribe (declarativa: Terraform y CloudFormation; procedural: scripts y Ansible) y el sistema la materializa; cada cambio es un commit revisable, revertible y auditable, el entorno entero se puede recrear y el drift se detecta contra el repo. La madurez completa agrega pipeline (PR, plan, revisión, apply), pruebas y policy-as-code (policies de seguridad evaluadas antes del apply). Por qué importa: mata las tres plagas del datacenter artesanal: la configuración que nadie sabe cómo llegó, el servidor único irrepetible y el desastre del 'el que sabía se fue'; la infra es un repo, el conocimiento vive en Git y el rebuild de un entorno es un comando con evidencia para auditoría. Trampa: el IaC de mentira: el repo dice una cosa y la realidad otra (el hotfix de emergencia por consola que nadie volcó a Git); sin disciplina de 'todo pasa por PR', el código de infra se vuelve otra bola de espaguetis: documentación que miente.",
    example: "Auditoría de continuidad: piden evidencia de reproducibilidad; el pipeline IaC corre en la suscripción de DRP y en 40 minutos existen las 30 VMs, redes y balanceadores conforme al repo: el acta certifica el rebuild y el 'servidor artesanal' queda en el pasado."
  },
  {
    id: "seed-sa-ventana-mantenimiento",
    term: "Ventana de mantenimiento",
    acronym: undefined,
    category: "SysAdmin - Automatización",
    shortDefinition: "Período acordado, aprobado y publicado donde se aplican cambios de riesgo (parches, upgrades, reinicios) con menor impacto y expectativa administrada.",
    longDefinition: "La ventana define cuándo, qué y cómo: horario validado con métricas (no con intuición), alcance del cambio, prerrequisitos (respaldos o snapshots), plan de rollback y criterio de éxito; en ITSM se registra como change window con aprobación (CAB cuando aplica) y en monitoreo se silencian las alertas esperables del período; las ventanas recurrentes (la mensual de parches) convierten el cambio en rutina auditable. Por qué importa: el cambio es la mayor fuente de incidentes: la ventana lo blinda con la trifecta de menos riesgo, expectativa del negocio y autorización formal; sin ella, cada parche es una apuesta clandestina que se descubre cuando falla, y la culpa posterior congela el parcheo: la peor deuda posible. Trampa: la ventana sin rollback probado es una promesa (el plan B de 'ojalá' no es plan), y las ventanas eternas de domingo a las 2 a.m. queman al equipo: rotar la guardia y automatizar (Ansible en ventana) o la fatiga matará la práctica del parcheo.",
    example: "Ventana mensual 22:00-02:00: RFC aprobado (parcheo de 24 servidores y firmware de 2 switches), snapshots pre-cambio, Ansible ejecuta en oleadas (4 de prueba primero), rollback documentado por oleada y el monitoreo silencia lo esperado; el acta cierra con cero incidentes y duración real de 1 hora 50 minutos."
  },
  {
    id: "seed-sa-rollback",
    term: "Rollback",
    acronym: undefined,
    category: "SysAdmin - Automatización",
    shortDefinition: "Volver al estado anterior conocido tras un cambio fallido: reversión del despliegue, restauración de la configuración o snapshot pre-cambio.",
    longDefinition: "El rollback es la mitad del plan de cambio y se define ANTES de tocar: qué se reversa, cómo, en cuánto tiempo y quién decide: volver a la etiqueta anterior de la imagen (kubectl rollout undo), restaurar la configuración (Git revert, respaldo del archivo), revertir el snapshot de la VM o restaurar el respaldo; su métrica es el tiempo real medido en el drill, no el estimado. Por qué importa: cambia la psicología del cambio: con rollback probado, los equipos se atreven a cambiar seguido (velocidad con cinturón de seguridad); sin rollback, cada cambio fallido es una sesión creativa de las 2 a.m. y el equipo aprende a NO cambiar jamás: el miedo congela el parcheo y la deuda crece. Trampa: el rollback no probado no existe ('restauramos el respaldo' que nunca se ha restaurado), y el rollback a medias (app vieja contra base ya migrada por la versión nueva) suele fallar peor que el cambio original: el plan debe cubrir datos y configuración, no solo binarios.",
    example: "Upgrade de facturación en ventana: a los 15 minutos el smoke test falla por error de esquema; se ejecuta el rollback documentado: imagen anterior más snapshot de base pre-migración, 8 minutos y operando; el postmortem ajusta el orden (secar los datos antes de la app) para el siguiente intento."
  },
  {
    id: "seed-sa-playbook",
    term: "Playbook",
    acronym: undefined,
    category: "SysAdmin - Automatización",
    shortDefinition: "Archivo YAML de Ansible que declara el estado deseado: tareas con módulos, handlers y variables aplicadas a los hosts del inventario.",
    longDefinition: "El playbook mapea hosts a tareas: cada tarea usa un módulo idempotente (apt, service, template, user) con argumentos y registros; los handlers reaccionan a cambios (reiniciar el servicio solo si la configuración cambió), los roles empaquetan tareas reutilizables y las variables parametrizan por entorno; se ejecuta con ansible-playbook y se valida con --syntax-check, --check --diff y assertions. Por qué importa: es el formato en que el SysAdmin escribe automatización legible: el manual de 12 páginas se vuelve 60 líneas versionadas en Git, revisables en pull request y ejecutables contra 200 servidores en un comando; el playbook ES la documentación viva del 'cómo se configura esto aquí'. Trampa: los playbooks monolíticos de 500 líneas sin roles son inmantenibles, las tareas shell en vez de módulos pierden la idempotencia ('¿por qué corriste si ya estaba?'), y el copy de archivos con secretos sin ansible-vault deja credenciales planas en el repositorio.",
    example: "El manual de alta de servidor de 15 pasos se refactoriza a un rol (usuario de deploy, hardening SSH, agente de monitoreo, registro al inventario): la alta pasa de 90 minutos propensos a error a 6 minutos idempotentes y el rol se comparte con seguridad para sus ajustes."
  },
  {
    id: "seed-sa-idempotencia",
    term: "Idempotencia",
    acronym: undefined,
    category: "SysAdmin - Automatización",
    shortDefinition: "Propiedad de una operación que llega al mismo resultado final sin importar cuántas veces se ejecute: re-correr el playbook no acumula cambios.",
    longDefinition: "Una operación idempotente converge al estado deseado: crear el usuario deploy ya existente termina en ok sin duplicar, la línea ya presente en la configuración no se agrega de nuevo y el servicio corriendo no se reinicia; en Ansible la dan los módulos declarativos, y en los scripts hay que construirla a mano (verificar antes de hacer). La prueba es re-ejecutar: la segunda corrida debería reportar changed=0. Por qué importa: es el fundamento de la automatización confiable: solo lo idempotente se puede re-correr con seguridad (reintentos, corridas parciales, programación nocturna), y habilita la convergencia periódica del drift; sin ella, 'automatizar' es fabricar una bomba que explota a la segunda ejecución. Trampa: los módulos shell y raw no son idempotentes por sí mismos (un echo a un archivo duplica la línea en cada corrida) y 'corrió una vez bien' no prueba nada: la prueba de idempotencia es correr dos veces y ver changed=0.",
    example: "El playbook de firewall 'se dañaba' a la segunda corrida: la tarea shell con un append duplicaba reglas en cada ejecución; se cambia al módulo declarativo de firewall, la segunda corrida reporta changed=0 y se agenda la ejecución horaria para corregir drift automáticamente."
  },
  {
    id: "seed-sa-drift",
    term: "Drift de configuración",
    acronym: undefined,
    category: "SysAdmin - Automatización",
    shortDefinition: "La divergencia silenciosa entre el estado declarado (Git, IaC) y el estado real de los servidores: cambios manuales que nadie volvió a código.",
    longDefinition: "El drift nace de las emergencias: el hotfix por SSH de las 3 a.m. que salva el servicio y se olvida, la configuración 'temporal' del proveedor, el servidor que se saltó la campaña; semanas después, la flota 'idéntica' tiene veinte variantes y el próximo despliegue falla solo en el servidor que nadie recuerda haber tocado. Se combate con detección programada (terraform plan agendado, auditorías de configuración), convergencia periódica (Ansible en cron) y disciplina: el hotfix de emergencia se volca a Git al día siguiente o no existió. Por qué importa: el drift es el impuesto oculto de la operación manual: cada divergencia es un incidente futuro con causa raíz 'alguien cambió algo'; los entornos reproducibles lo eliminan como clase de problema y el diagnóstico deja de depender de la memoria de la gente. Trampa: detectar drift y 'corregirlo' a mano agrega más drift (ahora hay tres estados); la corrección siempre es la declaración en Git, y sin detección programada el drift se descubre en pleno incidente: tarde y caro.",
    example: "El despliegue falla solo en srv-app-07: la convergencia diaria reporta 'changed' permanente en ese host y la comparación revela un httpd.conf editado a mano hace dos meses; se convierte a template, el drift desaparece y la flota vuelve a ser idéntica de verdad."
  },
  {
    id: "seed-sa-runbook",
    term: "Runbook",
    acronym: undefined,
    category: "SysAdmin - Automatización",
    shortDefinition: "Procedimiento documentado paso a paso para una operación o incidente recurrente: diagnóstico con comandos, criterios de decisión y punto de escala.",
    longDefinition: "El runbook es la receta ejecutable por un humano (a diferencia del playbook, que lo ejecuta Ansible): síntomas esperados, pasos de diagnóstico con los comandos exactos, las decisiones (si pasa X, hacer Y), el punto de escala (a quién y con qué información) y cómo verificar que quedó resuelto; vive versionado (Git o wiki), con dueño y fecha de última validación. Por qué importa: convierte el conocimiento del experto en capacidad del equipo: la guardia de la madrugada resuelve con el runbook lo que antes esperaba al especialista; reduce tiempos de respuesta, entrena a los nuevos y es la etapa previa natural a la automatización (runbook maduro, playbook después). Trampa: el runbook desactualizado es más peligroso que no tenerlo (confianza ciega en pasos que ya no aplican: cada uso debe validar y actualizar), y el 'runbook' sin comandos ni criterio de éxito es un ensayo, no una herramienta de guardia.",
    example: "El P1 del túnel se resuelve en 12 minutos por el NOC siguiendo el runbook TUN-01 (verificación de fases, logs del ISP, failover); el postmortem agrega los dos pasos que faltaban y la alerta queda enlazada al runbook en su annotation: la respuesta y el documento viven conectados."
  },
  {
    id: "seed-sa-pki",
    term: "PKI",
    acronym: "PKI",
    category: "SysAdmin - Seguridad & Hardening",
    shortDefinition: "Public Key Infrastructure: la jerarquía que emite, firma, revoca y valida certificados: CA raíz offline, CAs intermedias y listas de revocación.",
    longDefinition: "La PKI es el sistema de confianza: una CA raíz (offline, aislada, custodiada) firma CAs intermedias que emiten los certificados de servidores y usuarios; la validez de cada certificado se comprueba contra la cadena, las fechas y la revocación (CRL u OCSP). El SysAdmin la encuentra en tres frentes: la PKI interna de AD (AD CS: plantillas, autoinscripción), los certificados públicos (Let's Encrypt con ACME o comprados) y la gestión del ciclo completo: emisión, renovación, revocación y el reemplazo de la CA misma cuando toca. Por qué importa: casi todo lo que importa confía en certificados: HTTPS interno, LDAPS, RADIUS, WiFi 802.1X y VPN site-to-site; sin PKI sana no hay TLS confiable, y su descuido (una CA intermedia que vence) tumba de golpe todo lo que firmó. Trampa: la CA raíz en un DC encendido 'por facilidad' convierte su compromiso en la caída de TODA la confianza de la organización, y el calendario de vencimientos debe incluir a la CA misma (el certificado de la CA intermedia también vence), no solo a los certificados que emite.",
    example: "El reporte de vencimientos detecta que el certificado de la CA intermedia interna vence en 30 días y con él todos los servicios que firmó: se reemite desde la raíz offline en ventana controlada y el monitoreo pasa a alertar los vencimientos de PKI con 60 días de margen."
  },
  {
    id: "seed-sa-certificado-tls",
    term: "Certificado TLS",
    acronym: undefined,
    category: "SysAdmin - Seguridad & Hardening",
    shortDefinition: "Credencial digital X.509 que liga una clave pública a una identidad (los nombres del SAN) avalada por una CA: habilita HTTPS y el cifrado autenticado.",
    longDefinition: "El certificado contiene la clave pública, el sujeto con los nombres que ampara (CN y SAN: el navegador valida contra lo que conecta), el emisor (la cadena de CA), la ventana de validez y el uso; el cliente valida cadena, fechas, revocación y coincidencia del nombre. El ciclo que se opera: generar (CSR con la clave privada protegida), emitir (CA interna o pública), instalar (bind del servicio), monitorear vencimiento y renovar; openssl s_client -connect host:443 y openssl x509 -noout -dates son el diagnóstico diario. Por qué importa: el certificado vencido tumba el servicio aunque el servidor esté perfecto (y el navegador lo grita), el nombre mal amparado (falta el SAN) produce fallos 'solo desde algunos sistemas', y la clave privada expuesta exige revocación y reemplazo de emergencia: el ciclo de certificados es operación permanente, no un proyecto. Trampa: los vencimientos caen en fines de semana largo (nunca fallan un martes), y validar con curl desde el servidor cuando el cliente real valida la cadena completa: un intermediario que falta en el server falla solo en algunos clientes, el incidente intermitente más confuso de diagnosticar.",
    example: "El portal interno 'no abre' desde los portátiles: openssl s_client muestra la cadena incompleta (falta el intermediario) y -dates revela vencido desde el sábado; se reinstala el fullchain renovado, el probe sintético del monitoreo valida y la alerta de vencimiento a 30 días queda configurada: nunca más un domingo."
  },
  {
    id: "seed-sa-hardening",
    term: "Hardening",
    acronym: undefined,
    category: "SysAdmin - Seguridad & Hardening",
    shortDefinition: "Endurecimiento de sistemas según guías reconocidas (CIS, STIG): cerrar servicios, puertos, defaults y permisos para reducir la superficie de ataque.",
    longDefinition: "Hardening es aplicar el checklist de referencia capa por capa: sistema operativo (servicios innecesarios fuera, SSH sin root ni contraseñas, firewall activo, actualizaciones), base de datos (cuentas de app de mínimos, defaults desactivados), hipervisores y contenedores (sin root, filesystem de solo lectura) y Windows (políticas de contraseña, RDP acotado, auditoría encendida); se guía por benchmarks (CIS por producto y versión), se automatiza (Ansible, GPO) y se audita con scanners que puntúan el cumplimiento. Por qué importa: la mayoría de los compromisos explotan defaults y descuidos que el hardening elimina: el servicio viejo escuchando 'por si acaso', la cuenta admin compartida, el puerto de gestión expuesto; un baseline endurecido y automático convierte la seguridad en propiedad del build, no del heroísmo de cada admin. Trampa: endurecer sin validar rompe la dependencia olvidada que usaba ese puerto (la reversa furiosa mata la práctica): oleadas con pruebas y rollback; y el checklist aplicado una sola vez se degrada con cada cambio: re-auditar es parte del ciclo, no un evento.",
    example: "Proyecto de hardening de 60 Linux: benchmark CIS nivel 1 automatizado en rol Ansible, piloto en 5 servidores con la app validando cada oleada, el scanner reporta 96% de score (antes 41%) y las 6 excepciones documentadas con justificación y fecha de remediación."
  },
  {
    id: "seed-sa-selinux",
    term: "SELinux",
    acronym: "SELinux",
    category: "SysAdmin - Seguridad & Hardening",
    shortDefinition: "Mandatory Access Control del kernel (familia RHEL): políticas que limitan qué proceso puede tocar qué recursos, incluso siendo root.",
    longDefinition: "SELinux etiqueta procesos y objetos (contextos de seguridad) y aplica la política de quién puede hacer qué: el proceso httpd confinado solo accede a sus tipos permitidos: si alguien lo explota, no lee /home ni las claves de la base. Modos: enforcing (bloquea), permissive (registra sin bloquear: oro para diagnosticar) y disabled (nunca en producción). Las herramientas del día a día: ausearch -m avc para ver las denegaciones, semanage para puertos y etiquetas y restorecon para re-etiquetar. Por qué importa: es la diferencia entre 'el atacante obtuvo root' y 'el atacante obtuvo root dentro de una jaula': limita el radio de explosión de las vulnerabilidades de servicios; y en la familia RHEL es requisito de auditoría: el SELinux disabled es el hallazgo clásico que grita en cualquier informe. Trampa: la reacción instintiva ante el servicio raro ('setenforce 0 y ya funcionó') desarma el MAC del servidor entero por un problema de contexto de UN archivo: la ruta correcta es permissive, ausearch y el ajuste puntual con restorecon o semanage, documentado.",
    example: "La app nueva 'no lee su configuración' en el RHEL recién montado: la denegación AVC en ausearch apunta al contexto del archivo copiado desde el home del instalador; restorecon -v sobre el archivo resuelve en dos minutos SIN apagar SELinux, y el paso entra al runbook de despliegue."
  },
  {
    id: "seed-sa-apparmor",
    term: "AppArmor",
    acronym: undefined,
    category: "SysAdmin - Seguridad & Hardening",
    shortDefinition: "MAC de Linux por perfiles de ruta (familia Ubuntu, Debian y SUSE): cada perfil declara qué archivos, puertos y capacidades puede usar el programa confinado.",
    longDefinition: "AppArmor confina programas con perfiles que enumeran permisos por rutas de archivos: el perfil de la base dice qué directorios puede leer y escribir, qué puertos escuchar y qué capacidades usar; los modos son enforce (bloquea) y complain (registra las violaciones sin bloquear). Se administra con aa-status, aa-genprof y aa-logprof (generan y afinan perfiles a partir de los reclamos del log) y los perfiles viven en /etc/apparmor.d/. Frente a SELinux (etiquetas en los inodos), AppArmor razona por rutas: más simple de leer, más sensible a dónde viven los binarios y los datos. Por qué importa: es el MAC por defecto de Ubuntu y Debian: contenedores LXC, snaps y muchos servicios vienen confinados de fábrica; saber leer un reclamo (DENIED) del log evita tanto el 'chmod 777' del pánico como el 'borré el perfil y ya': el ajuste quirúrgico es la ruta profesional. Trampa: mudar el directorio de datos de la base a otra ruta rompe el perfil silenciosamente (la política es por PATH: la carpeta nueva no está permitida) y el perfil eterno en complain es monitoreo sin confinar: complain es etapa de transición, no destino.",
    example: "La base 'muere' tras mudar el datadir a /data/mysql: el log muestra DENIED de AppArmor para la nueva ruta; se agrega la ruta al perfil en /etc/apparmor.d/, se recarga con apparmor_parser -r y el servicio arranca: sin apagar el MAC ni abrir permisos de par en par."
  },
  {
    id: "seed-sa-benchmark-cis",
    term: "Benchmark CIS",
    acronym: undefined,
    category: "SysAdmin - Seguridad & Hardening",
    shortDefinition: "Guía de configuración segura por producto (OS, base de datos, cloud, hipervisor) del Center for Internet Security: checklist auditable por niveles.",
    longDefinition: "Cada benchmark CIS define cientos de controles por producto y versión, organizados en niveles: Nivel 1 (seguridad razonable sin romper el funcionamiento) y Nivel 2 (defensa más fuerte con posible impacto operativo); funciona como fuente de requisitos del hardening, se automatiza (Ansible, GPO) y se audita con herramientas que puntúan el cumplimiento control por control. Por qué importa: es el estándar de facto para responder 'qué tan seguro debe estar un servidor': auditores y clientes lo citan, los scanners lo miden y el equipo lo usa como mapa; trabajar contra CIS convierte el hardening de criterio personal a checklist versionado con puntaje medible en el tiempo. Trampa: aplicarlo ciegas al 100% (el Nivel 2 rompe aplicaciones heredadas: controles que exigen configuraciones que un sistema de hace 15 años no tolera) sin proceso de excepción documentado, y perseguir el puntaje del scanner como meta en vez de evidencia del riesgo real: el score es el síntoma, no el objetivo.",
    example: "El proyecto de hardening adopta CIS Nivel 1 para RHEL y Ubuntu: el rol Ansible implementa los controles, el scanner trimestral puntúa 94% y las 6 excepciones de aplicaciones heredadas tienen justificación firmada con fecha de remediación: el informe de auditoría se arma casi solo."
  }
];
