/**
 * sysadminKB — 28 artículos de la base de conocimiento SysAdmin (SIMULADOS —
 * empresa ficticia Nexora S.A., equipo Infra & Ops). Dataset ESTÁTICO de
 * solo lectura (viene de fábrica, no vive en Dexie ni en el backup).
 * relatedTickets referencia tickets plausibles del dataset sa-XXX
 * (sa-001..sa-026 generales, sa-027..sa-056 semana de guardia).
 */
import type { SysAdminKbArticle } from '../types';

export const SYSADMIN_KB_ARTICLES: SysAdminKbArticle[] = [
  {
    id: 'sakb-disk-full',
    title: 'Disco lleno en Linux: diagnóstico y limpieza',
    category: 'SysAdmin - Linux / Unix',
    environment: 'Linux',
    symptoms: 'Alertas de uso de disco por encima del umbral (Zabbix) o fallos de escritura en un servidor Linux: logs que no se guardan, jobs que fallan con "No space left on device", colas de correo que se atasan. A veces df reporta espacio libre pero el error persiste: son los inodos agotados, no los bloques.',
    cause: 'Crecimiento de logs sin rotación, archivos temporales o cachés acumuladas, respaldos locales que nunca se limpiaron, archivos borrados pero retenidos por procesos vivos, o inodos agotados por millones de archivos pequeños (spool, sesiones, cachés de fragmentos).',
    steps: [
      {
        title: 'Confirmar el llenado real',
        detail: 'df -h muestra cada filesystem, su uso y el punto de montaje. Comparar con la alerta de monitoreo: a veces el umbral se disparó por otra partición (por ejemplo /var) y el síntoma parece global. Anotar el valor exacto como línea base del "antes".',
        command: 'df -h'
      },
      {
        title: 'Descartar agotamiento de inodos',
        detail: 'df -i lista el uso de inodos. Con espacio libre en bloques pero IUse% al 100%, el filesystem no puede crear más archivos aunque "tenga espacio": el diagnóstico y la limpieza cambian por completo (contar archivos pequeños, no borrar archivos grandes).',
        command: 'df -i'
      },
      {
        title: 'Localizar los directorios más pesados',
        detail: 'du con -x (no cruza a otros filesystems) y profundidad creciente localiza al culpable sin ruido. Recorrer de nivel en nivel desde el punto de montaje lleno hasta el directorio exacto, ordenando por tamaño.',
        command: 'du -xh --max-depth=2 /var | sort -rh | head -20'
      },
      {
        title: 'Detectar espacio retenido por archivos borrados',
        detail: 'lsof +L1 lista archivos borrados cuyo espacio sigue retenido porque un proceso los mantiene abiertos (clásico: log rotado "borrado" con el servicio aún escribiendo). La columna de tamaño indica lo que se recuperaría al reiniciar el proceso o truncar el archivo en vivo.',
        command: 'lsof +L1'
      },
      {
        title: 'Revisar el tamaño de los journals de systemd',
        detail: 'journalctl --disk-usage muestra cuánto ocupan los journals. Sin política de retención crecen sin límite y copan /var/log. Vaciarlos a un tope razonable y fijar SystemMaxUse en /etc/systemd/journald.conf para que no vuelva a pasar.',
        command: 'journalctl --disk-usage'
      },
      {
        title: 'Limpiar con criterio y sin rm a ciegas',
        detail: 'Orden seguro: forzar la rotación de logs, truncar archivos vivos en lugar de borrarlos, limpiar caché de paquetes y kernels viejos, vaciar /tmp de temporales viejos. Nunca borrar dentro de /var/lib sin saber qué es: ahí viven bases de datos y estado de servicios.',
        command: 'logrotate -f /etc/logrotate.conf'
      },
      {
        title: 'Verificar margen y prevenir',
        detail: 'Confirmar con df -h que quedó holgura (mínimo 20%) y que la alerta del monitoreo se recuperó. Si el crecimiento es estructural y no de basura, planear ampliar el filesystem (sakb-lvm-extend) en una ventana de cambio en lugar de limpiar cada semana.',
        command: 'df -h'
      }
    ],
    verification: 'df -h deja el filesystem por debajo del umbral con margen, los servicios afectados vuelven a escribir (probar con un log de prueba), la alerta de monitoreo pasa a resuelta y no se dispara de nuevo en 24 horas.',
    escalation: 'Líder de Infra & Ops (crecimiento estructural que requiere extender LVM o asignar almacenamiento)',
    relatedTerms: ['inode', 'ext4', 'XFS'],
    relatedTickets: ['sa-002', 'sa-028']
  },
  {
    id: 'sakb-service-down',
    title: 'Servicio caído: diagnóstico con systemd',
    category: 'SysAdmin - Linux / Unix',
    environment: 'Linux',
    symptoms: 'El monitoreo reporta un servicio caído o los usuarios notan la aplicación inaccesible, y el servidor sigue respondiendo por SSH. systemctl lo muestra en failed o inactive, y a veces el servicio entra en un ciclo de arranque y caída repetida.',
    cause: 'Error de configuración tras un cambio (sintaxis, variable faltante), dependencia que no arrancó (base de datos, red), binario actualizado incompatible, permisos del usuario de servicio, crash por falta de recursos (memoria, disco lleno) o unidad no habilitada tras un reinicio.',
    steps: [
      {
        title: 'Ver el estado exacto del servicio',
        detail: 'systemctl status muestra activo/fallido, el PID si vive, el código de salida de la última caída y las últimas líneas de log. El exit code orienta la causa: 1 es error de aplicación, 137 es kill por señal (frecuentemente OOM), 203 es binario o permisos.',
        command: 'systemctl status app-nexora'
      },
      {
        title: 'Leer el log del servicio',
        detail: 'journalctl filtrado por la unidad concentra el log del servicio. Buscar el PRIMER error del arranque fallido, no los síntomas repetidos: puerto ocupado, archivo no encontrado o credenciales inválidas aparecen una vez y el resto es ruido de reintentos.',
        command: 'journalctl -u app-nexora -n 50 --no-pager'
      },
      {
        title: 'Validar la configuración antes de reintentar',
        detail: 'Muchos servicios tienen comando de validación (nginx -t, la opción --check-config de la app). Validar evita el ciclo de arranque y caída y muestra el error de configuración en pantalla. Si el servicio permite modo primer plano, arrancarlo ahí revela el error sin el envoltorio de systemd.',
        command: 'nginx -t'
      },
      {
        title: 'Comprobar dependencias y orden de arranque',
        detail: 'Si el servicio arranca antes que su base de datos o antes de que la red esté lista, muere en cada reinicio del servidor. Revisar las dependencias declaradas y ajustar After= y Requires= en la unidad en lugar de confiar en la suerte del timing.',
        command: 'systemctl list-dependencies app-nexora'
      },
      {
        title: 'Arrancar y confirmar estado',
        detail: 'Corregida la causa, arrancar el servicio y confirmar que queda activo. Si falla de nuevo, repetir la lectura del journal desde el intento nuevo: la causa puede haber cambiado (por ejemplo, primer fallo por config y segundo por puerto ocupado).',
        command: 'systemctl start app-nexora && systemctl is-active app-nexora'
      },
      {
        title: 'Verificar persistencia ante reinicios',
        detail: 'Un servicio que funciona hoy pero no está enabled desaparece en el próximo reinicio: el clásico "se cayó solo" después de una ventana de parcheo. Confirmar que queda habilitado y documentarlo.',
        command: 'systemctl is-enabled app-nexora'
      },
      {
        title: 'Afinar la política de auto-reinicio',
        detail: 'Restart=on-failure con RestartSec razonable da auto-recuperación ante caídas puntuales sin enmascarar caídas repetidas: el monitoreo las seguirá viendo y el journal conservará la evidencia. Reiniciar sin control puede ocultar un problema creciente.',
        command: 'systemctl show app-nexora -p Restart'
      }
    ],
    verification: 'systemctl is-active devuelve active, el healthcheck o endpoint del servicio responde, y una prueba de reinicio del servicio lo levanta limpio. El ticket se cierra citando la causa raíz tal como apareció en el journal.',
    escalation: 'L2 - Aplicaciones (crash repetido por bug del binario, no de infraestructura)',
    relatedTerms: ['systemd', 'journalctl'],
    relatedTickets: ['sa-003', 'sa-029']
  },
  {
    id: 'sakb-ssh-lockout',
    title: 'SSH: acceso bloqueado / autenticación fallida',
    category: 'SysAdmin - Linux / Unix',
    environment: 'Linux',
    symptoms: 'Nadie (o solo un usuario concreto) puede entrar por SSH: "Permission denied" inmediato o tras pedir credenciales. La consola física o el iLO sí funciona y el puerto parece abierto. A veces el síntoma es para todos los usuarios y a veces para uno solo.',
    cause: 'Bloqueo de fail2ban por intentos fallidos, cambio reciente en sshd_config (AllowUsers, PermitRootLogin), contexto SELinux incorrecto tras mover o editar archivos de configuración, cuenta bloqueada por PAM/faillock, o contraseña caducada de la cuenta.',
    steps: [
      {
        title: 'Confirmar que el demonio sshd está vivo',
        detail: 'Desde consola o iLO, verificar el servicio. Si está caído, casi siempre es una configuración rota: validar con sshd -t antes de reiniciar, porque un sshd inválido no vuelve a levantar y convierte el lockout parcial en total.',
        command: 'systemctl status sshd'
      },
      {
        title: 'Leer los intentos de autenticación recientes',
        detail: 'El journal del sshd registra cada intento aceptado y rechazado con su motivo (usuario inválido, contraseña incorrecta, cuenta bloqueada). Distinguir "contraseña mala" de "cuenta bloqueada por directiva" define el camino de solución.',
        command: 'journalctl -u sshd -n 100 --no-pager'
      },
      {
        title: 'Revisar bloqueos de fail2ban',
        detail: 'Si fail2ban gobierna los intentos, su estado muestra las IPs baneadas y la explicación de un lockout desde una fuente concreta. Desbloquear únicamente la IP legítima y con justificación en el ticket: la lista existe por algo.',
        command: 'fail2ban-client status sshd'
      },
      {
        title: 'Validar la configuración efectiva de sshd',
        detail: 'sshd -T imprime la configuración efectiva (no el archivo) y revela si una directiva quedó distinta tras un cambio; sshd -t valida la sintaxis sin reiniciar. Revisar AllowUsers, PermitRootLogin y MaxAuthTries contra lo esperado.',
        command: 'sshd -t'
      },
      {
        title: 'Descartar denegaciones de SELinux',
        detail: 'Si se movió o recreó sshd_config o authorized_keys, el contexto de seguridad equivocado hace que sshd no pueda leerlos aunque los permisos clásicos estén bien. ausearch muestra las denegaciones AVC recientes; restorecon sobre los archivos restaura el contexto correcto.',
        command: 'ausearch -m avc -ts recent'
      },
      {
        title: 'Probar desde el cliente en modo verboso',
        detail: 'ssh -vvv muestra los métodos de autenticación ofrecidos, los rechazos y las claves presentadas. Es la forma más rápida de ver si el servidor rechaza el método (PAM, llave) o si la conexión ni siquiera llega a la autenticación (red, firewall).',
        command: 'ssh -vvv ops.jr@srv-app-01'
      },
      {
        title: 'Desbloquear la cuenta si PAM la bloqueó',
        detail: 'El módulo faillock bloquea cuentas tras N intentos fallidos. Resetear solo la cuenta afectada y verificar el ingreso. Si vuelve a bloquearse sola, hay un origen automatizado (script o cliente con credenciales viejas) que hay que corregir, no seguir reseteando.',
        command: 'faillock --user ops.jr --reset'
      }
    ],
    verification: 'El usuario ingresa por SSH con su clave o contraseña, el journal del sshd muestra Accepted para el login de prueba y no aparecen nuevos bloqueos masivos en las horas siguientes.',
    escalation: 'SOC (si los intentos fallidos provienen de fuentes externas o hay patrón de ataque)',
    relatedTerms: ['SELinux', 'Hardening', 'systemd'],
    relatedTickets: ['sa-005', 'sa-031']
  },
  {
    id: 'sakb-cron-not-running',
    title: 'Tarea cron que no ejecuta',
    category: 'SysAdmin - Linux / Unix',
    environment: 'Linux',
    symptoms: 'La tarea programada no produce su resultado: el backup no aparece, el reporte no llega, la purga no ocurre. El servidor está encendido y el script funciona si se ejecuta a mano, así que "el script está bien" y el problema está en el mecanismo.',
    cause: 'Servicio cron parado, job en la crontab equivocada (usuario incorrecto o /etc/cron.d con sintaxis distinta), entorno mínimo de cron (PATH distinto al interactivo), permisos de ejecución del script, horario mal escrito, o el job ejecuta pero falla en silencio sin log.',
    steps: [
      {
        title: 'Verificar el demonio de cron',
        detail: 'Si el servicio está parado, ninguna crontab corre. Reiniciarlo y averiguar por qué se detuvo (journal del sistema). Es el chequeo más barato y el más olvidado.',
        command: 'systemctl status cron'
      },
      {
        title: 'Buscar evidencia de ejecución',
        detail: 'El log de cron registra cada intento de lanzar jobs (no su salida). Si el job no aparece, cron nunca lo lanzó: problema de crontab o de servicio. Si aparece y no hay resultado, el script corrió y falló: problema del script o su entorno.',
        command: 'journalctl -u cron --since today'
      },
      {
        title: 'Revisar la crontab correcta',
        detail: 'Confirmar en qué crontab vive el job (la del usuario, /etc/crontab o /etc/cron.d) y con qué usuario corre. Un job pegado en la crontab de root cuando debía correr como el usuario de backup falla al escribir en rutas sin permiso. En /etc/crontab y cron.d el usuario es un campo explícito.',
        command: 'crontab -l -u backup'
      },
      {
        title: 'Reproducir con el entorno de cron',
        detail: 'Ejecutar el script como el usuario propietario. Si a mano funciona pero desde cron no, el 90% de las veces es el PATH mínimo de cron: usar rutas absolutas dentro del script y capturar stderr para dejar la evidencia del error real.',
        command: 'sudo -u backup /opt/nexora/scripts/respaldo.sh'
      },
      {
        title: 'Comprobar permisos y shebang',
        detail: 'El script necesita permiso de ejecución para su propietario y shebang correcto en la primera línea. Verificar también que los directorios intermedios del script (rutas de trabajo, logs) existen y son escribibles por el usuario del job.',
        command: 'ls -l /opt/nexora/scripts/respaldo.sh'
      },
      {
        title: 'Validar horario y hora del servidor',
        detail: 'Cron usa la hora local del servidor: un job que "no corre a las 6 de la mañana" puede estar corriendo a las 6 UTC. timedatectl confirma zona horaria y sincronización. Verificar también la sintaxis del horario (minuto hora día mes día-semana) campo por campo.',
        command: 'timedatectl'
      },
      {
        title: 'Dejar la salida capturada',
        detail: 'Redirigir stdout y stderr del job a un log propio para que el próximo fallo deje evidencia en lugar de un misterio. Un job mudo es indistinguible de un job muerto, y cron no guarda la salida por defecto.',
        command: 'echo "0 6 * * * backup /opt/nexora/scripts/respaldo.sh >> /var/log/nexora/respaldo.log 2>&1"'
      }
    ],
    verification: 'El job se ejecuta en el próximo disparo programado (o forzando un horario de prueba), deja su log y produce el artefacto esperado (archivo de respaldo, reporte, purga).',
    relatedTerms: ['cron', 'crontab', 'systemd'],
    relatedTickets: ['sa-007', 'sa-033']
  },
  {
    id: 'sakb-perm-denied',
    title: 'Permisos y ownership: Permission denied',
    category: 'SysAdmin - Linux / Unix',
    environment: 'Linux',
    symptoms: 'Un usuario o servicio recibe "Permission denied" sobre un archivo o ruta que en teoría debería estar accesible. El archivo existe y el espacio está: el fallo es de acceso. A veces solo falla por NFS o SMB y en local funciona, pista clave del diagnóstico.',
    cause: 'Permisos POSIX u ownership incorrectos (un chown apurado de root), falta de permiso de ejecución en un directorio intermedio del camino, ACLs restrictivas con máscara recortada, o módulos de seguridad (SELinux/AppArmor) denegando aunque los permisos clásicos estén bien.',
    steps: [
      {
        title: 'Identificar la identidad efectiva del proceso',
        detail: 'Los permisos se evalúan contra el uid y los grupos del proceso, no contra la persona que reporta. Verificar que el usuario del servicio tiene el grupo suplementario necesario: añadirlo sin recargar el servicio no surte efecto hasta reiniciarlo o reloguearlo.',
        command: 'id ops.jr'
      },
      {
        title: 'Inspeccionar el camino completo',
        detail: 'namei -l lista los permisos de CADA componente de la ruta. El culpable habitual es un directorio intermedio sin permiso de ejecución (la x de los directorios es permiso de tránsito), no el archivo final. Revisar solo ls -l del destino es mirar el final del camino y perderse del medio.',
        command: 'namei -l /srv/nexora/datos/archivo.csv'
      },
      {
        title: 'Descartar ACLs',
        detail: 'Un signo + al final del modo en ls -l indica ACLs extendidas. getfacl muestra entradas nombradas y la máscara efectiva: una máscara restrictiva niega el acceso aunque el grupo clásico lo permita. Ajustar la máscara o las entradas, no el modo clásico a lo bruto.',
        command: 'getfacl /srv/nexora/datos'
      },
      {
        title: 'Descartar SELinux o AppArmor',
        detail: 'Si los permisos clásicos y las ACLs están bien y sigue la denegación, casi siempre es un módulo de seguridad. En RHEL/CentOS buscar denegaciones AVC con ausearch; en Debian/Ubuntu revisar el estado y los perfiles con aa-status. Corregir el contexto o el perfil, no desactivar el módulo.',
        command: 'aa-status'
      },
      {
        title: 'Corregir con el criterio mínimo',
        detail: 'Ajustar owner o grupo al correcto y permisos al mínimo necesario para la operación (lectura, o escritura solo donde toca). El chmod recursivo 777 resuelve hoy y crea el hallazgo de hardening de la próxima auditoría: mejor 5 minutos más de análisis que una excepción de años.',
        command: 'chgrp nexora-app /srv/nexora/datos && chmod g+rwx /srv/nexora/datos'
      },
      {
        title: 'Verificar con la identidad del proceso',
        detail: 'Probar el acceso con la identidad real del usuario o servicio, nunca con root: root salta casi todos los controles y da falsos positivos. test -r / test -w y echo de verificación hacen la comprobación limpia y binaria.',
        command: 'sudo -u svc-app test -r /srv/nexora/datos/archivo.csv && echo LECTURA_OK'
      }
    ],
    verification: 'El usuario o servicio accede al recurso con su identidad real, el proceso de aplicación funciona de punta a punta y no aparecen nuevas denegaciones AVC. El cambio de permisos queda documentado con su antes y después en el ticket.',
    escalation: 'L2 - Seguridad (si la solución exige relajar una política de SELinux o un perfil AppArmor)',
    relatedTerms: ['SELinux', 'AppArmor', 'NFS'],
    relatedTickets: ['sa-009', 'sa-035']
  },
  {
    id: 'sakb-lvm-extend',
    title: 'Extender un filesystem LVM sin perder datos',
    category: 'SysAdmin - Storage & Backup',
    environment: 'Linux',
    symptoms: 'Un filesystem Linux gestionado con LVM llegó al umbral de alerta (80-90%) y la proyección indica que se llenará en días. El servidor es producción y no admite downtime largo: la ampliación debe ser en línea, controlada y con verificación.',
    cause: 'Crecimiento orgánico de datos (logs, bases de datos, repositorios), tamaño inicial subestimado o política de retención ampliada. Es la ampliación natural cuando la limpieza ya no da margen y la tendencia de capacidad (sakb-capacity-trend) lo justifica.',
    steps: [
      {
        title: 'Leer el estado completo del stack',
        detail: 'df -h (filesystem y punto de montaje), pvs (physical volumes), vgs (volume groups y espacio libre) y lvs (logical volumes). La combinación es el mapa antes de mover nada: define si se puede extender directo o hace falta disco nuevo.',
        command: 'pvs && vgs && lvs'
      },
      {
        title: 'Decidir la fuente del espacio',
        detail: 'Si el VG tiene VFree suficiente, se extiende directo. Si no, hace falta un disco nuevo: pedirlo al equipo de virtualización (ampliar el disco virtual de la VM) o de storage (LUN nueva). Nunca "recortar" espacio de otro LV con datos vivos fuera de una ventana de cambio formal.',
        command: 'vgs'
      },
      {
        title: 'Preparar el disco nuevo como physical volume',
        detail: 'pvcreate inicializa el disco para LVM. Verificar dos veces el nombre del dispositivo con lsblk (tamaño y serial): pvcreate sobre el disco equivocado destruye datos sin pedir confirmación. El chequeo de 30 segundos evita el incidente de la semana.',
        command: 'pvcreate /dev/sdb'
      },
      {
        title: 'Añadir el PV al volume group',
        detail: 'vgextend agrega el espacio del PV nuevo al VG. Verificar que vgs refleja el incremento de VFree antes de continuar. El VG es la alacena: hasta que el espacio entra acá, el LV no puede crecer.',
        command: 'vgextend vg-app /dev/sdb'
      },
      {
        title: 'Extender LV y filesystem en el mismo paso',
        detail: 'lvextend con -r redimensiona el filesystem en la misma operación, en línea y sin desmontar (ext4 y XFS lo soportan). El error clásico del proceso manual es extender el LV y olvidar el filesystem: df sigue igual y alguien repite el lvextend creyendo que falló.',
        command: 'lvextend -r -L +50G /dev/vg-app/lv_datos'
      },
      {
        title: 'Si se extendió sin -r, crecer el filesystem aparte',
        detail: 'El comando depende del tipo: resize2fs para ext4 y xfs_growfs para XFS montado (con su punto de montaje, no el dispositivo). Confundirlos es el error típico: XFS no se crece con resize2fs y solo crece montado.',
        command: 'resize2fs /dev/vg-app/lv_datos'
      },
      {
        title: 'Verificar y documentar',
        detail: 'df -h del filesystem ampliado, lvs para confirmar el LV, y una prueba de escritura real del servicio. Documentar en el ticket: disco añadido, secuencia ejecutada, tamaño final y verificación. fstab no se toca: el punto de montaje no cambió.',
        command: 'df -h /datos'
      }
    ],
    verification: 'df -h muestra el nuevo tamaño, una prueba de escritura funciona y el monitoreo refleja el porcentaje con holgura. El LV y el filesystem quedan del mismo tamaño (lvs y df coherentes).',
    escalation: 'Líder de Infra & Ops (aprobación de asignación o compra de almacenamiento nuevo)',
    relatedTerms: ['LVM', 'ext4', 'XFS', 'fstab'],
    relatedTickets: ['sa-010', 'sa-036']
  },
  {
    id: 'sakb-raid-degraded',
    title: 'RAID degradado: diagnóstico y rebuild con mdadm',
    category: 'SysAdmin - Storage & Backup',
    environment: 'Linux',
    symptoms: 'El monitoreo reporta el array md en estado degraded, o llega el correo de mdadm marcando un disco faulty. El servidor sigue sirviendo pero sin redundancia: mientras esté así, el próximo fallo de disco es incidente mayor con pérdida de datos.',
    cause: 'Fallo físico de un disco, cable o conexión que se aflojó, disco que el array expulsa por errores de E/S repetidos, o un rebuild previo interrumpido (servidor reiniciado a mitad). En todos los casos la prioridad es recuperar redundancia, no solo "quitar la alerta".',
    steps: [
      {
        title: 'Confirmar el estado del array',
        detail: '/proc/mdstat resume el estado en segundos: clean o degraded, la composición y qué disco falta ([U_] marca el hueco). Si aparece recovering, un rebuild ya está corriendo (por ejemplo con hot spare) y el trabajo es vigilarlo, no duplicarlo.',
        command: 'cat /proc/mdstat'
      },
      {
        title: 'Detallar el estado por disco',
        detail: 'mdadm --detail lista cada miembro con rol y estado (active, faulty, spare) más los eventos recientes del array. Anotar el disco exacto caído y el número de evento: es la evidencia del ticket y el insumo del reemplazo físico.',
        command: 'mdadm --detail /dev/md0'
      },
      {
        title: 'Verificar la salud del disco sospechoso',
        detail: 'dmesg registra los errores de E/S del disco antes de que mdadm lo expulse. Confirmar que es fallo del disco y no de cable o controladora evita reemplazar un disco sano y volver a degradar al mes. En caso de duda, SMART del disco da la segunda opinión.',
        command: 'dmesg | grep -iE "sd|raid" | tail -20'
      },
      {
        title: 'Marcar fallo y retirar el disco caído',
        detail: 'mdadm con --fail y --remove saca formalmente al disco del array. Hacerlo en ese orden (fallar primero, retirar después) mantiene el estado del array consistente. Si hay hot spare ya asignado, el rebuild puede arrancar solo en este punto.',
        command: 'mdadm /dev/md0 --fail /dev/sdb1 --remove /dev/sdb1'
      },
      {
        title: 'Añadir el disco de reemplazo',
        detail: 'El disco nuevo entra con --add y el rebuild arranca automáticamente. Verificar que la partición del nuevo disco coincide en tamaño con las demás (un disco menor deja espacio sin usar; uno mayor funciona pero desperdicia).',
        command: 'mdadm /dev/md0 --add /dev/sdc1'
      },
      {
        title: 'Vigilar el rebuild hasta el final',
        detail: 'watch sobre /proc/mdstat muestra el avance en tiempo real. El rebuild tarda horas según tamaño y carga: evitar reinicios evitables a mitad, y saber que la E/S del servidor estará más lenta mientras dura. De degraded a clean solo al 100%.',
        command: 'watch cat /proc/mdstat'
      },
      {
        title: 'Verificar redundancia y persistencia',
        detail: 'Confirmar estado clean con todos los discos activos [UU]. Actualizar mdadm.conf con la composición actual (y regenerar initramfs si cambió) para que el array ensamble igual tras un reinicio: el rebuild perfecto que no sobrevive al reboot es un rebuild a medias.',
        command: 'mdadm --detail --scan >> /etc/mdadm/mdadm.conf'
      }
    ],
    verification: '/proc/mdstat muestra el array en clean con todos los miembros activos, el rebuild llegó al 100%, una prueba de escritura funciona y el ticket documenta disco reemplazado, serie del nuevo y duración del rebuild.',
    escalation: 'Soporte del fabricante / Data Center (reemplazo físico del disco en garantía)',
    relatedTerms: ['RAID', 'mdadm', 'hot spare', 'rebuild'],
    relatedTickets: ['sa-011', 'sa-037']
  },
  {
    id: 'sakb-backup-failed',
    title: 'Backup fallido: diagnóstico',
    category: 'SysAdmin - Storage & Backup',
    environment: 'Storage / Backup',
    symptoms: 'El job nocturno de backup terminó en error o ni siquiera corrió: la consola del sistema de backup reporta la falla y el repositorio no tiene la copia de hoy. Cada hora de diagnóstico con el job caído es RPO acumulándose: la prioridad es doble, restaurar el ciclo y entender la causa.',
    cause: 'Repositorio sin espacio, credenciales caducadas hacia el destino, cambio de red o firewall que rompió la ruta, ventana excedida por timeout, o datos de origen bloqueados/corruptos. El patrón general: el backup depende de infraestructura que cambió y nadie avisó al job.',
    steps: [
      {
        title: 'Acotar el alcance exacto',
        detail: '¿Falló un job, un servidor o todos los de la noche? Revisar la consola del sistema de backup y el último resultado exitoso de cada job. Un fallo general apunta al repositorio, la red o las credenciales; un fallo puntual, al servidor de origen. El alcance define la hipótesis inicial.',
        command: 'ls -lht /backup/ | head'
      },
      {
        title: 'Leer el log del job',
        detail: 'El log tiene la línea exacta del error (espacio agotado, autenticación rechazada, timeout, archivo bloqueado). Buscar el PRIMER error de la ejecución: los reintentos posteriores generan ruido y ocultan la causa original.',
        command: 'tail -100 /var/log/nexora/respaldo.log'
      },
      {
        title: 'Verificar el repositorio',
        detail: 'Confirmar espacio disponible en el destino y que las copias previas siguen ahí (listar por fecha y tamaño). Calcular cuántos días de RPO se han perdido ya con el job caído: ese número decide la urgencia y si hay que escalar.',
        command: 'df -h /backup && ls -lht /backup/srv-bd-prod | head'
      },
      {
        title: 'Validar ruta y credenciales al destino',
        detail: 'Las credenciales caducadas (contraseña rotada, llave sin permiso) son causa frecuente. El ping confirma alcance y la conexión SSH en BatchMode falla rápido si la llave no sirve, sin colgar el diagnóstico. Probar exactamente la misma ruta que usa el job, no una parecida.',
        command: 'ssh -o BatchMode=yes backup@nas-backup.nexora.local echo CONEXION_OK'
      },
      {
        title: 'Corregir la causa y relanzar a mano',
        detail: 'Corregida la causa (espacio liberado, credencial renovada, regla de firewall ajustada), relanzar el job manualmente y vigilarlo hasta el final. No esperar a la ventana nocturna: cada hora extra es RPO perdido. Documentar qué se corrigió.',
        command: 'restic backup /srv/app-nexora --tag relanzo-manual'
      },
      {
        title: 'Verificar resultado y restaurabilidad',
        detail: 'Confirmar que el job terminó exitoso, que la copia nueva existe en el repositorio con tamaño coherente con los días anteriores, y que la siguiente ejecución programada corre sola sin intervención. Si el fallo fue de datos de origen corruptos, evaluar prueba de restore (sakb-restore-verify).'
      }
    ],
    verification: 'El job reejecutado termina exitoso, el repositorio contiene la copia nueva con timestamp y tamaño coherentes, y la ejecución programada siguiente completa sola.',
    escalation: 'Líder de Infra & Ops (si el RPO acumulado supera lo tolerado o queda una única copia en riesgo)',
    relatedTerms: ['RPO', 'Regla 3-2-1', 'NAS'],
    relatedTickets: ['sa-012', 'sa-038']
  },
  {
    id: 'sakb-restore-verify',
    title: 'Verificación de restore: prueba de recuperación',
    category: 'SysAdmin - Storage & Backup',
    environment: 'Storage / Backup',
    symptoms: 'Los backups completan en verde pero nunca se ha restaurado nada. Para cerrar el ciclo de la Regla 3-2-1 y conocer el RTO real hace falta una prueba de restauración: recuperar datos concretos en un entorno aislado, compararlos contra el original y medir tiempos.',
    cause: 'No es un fallo puntual sino una brecha metodológica: confiar en el estado exitoso del job como prueba de recuperabilidad. Copias cifradas sin llave a la mano, dependencias faltantes, versiones de herramienta sin probar o rutas cambiadas solo salen a la luz al restaurar.',
    steps: [
      {
        title: 'Definir el objetivo de la prueba',
        detail: 'Elegir qué se restaura (un archivo, un directorio, un servidor completo), desde qué fecha y con qué criterio de éxito escrito de antemano (checksums iguales, árbol completo, aplicación arranca). Sin criterio previo, la prueba "pasa" por inercia y no demuestra nada.',
        command: 'restic snapshots'
      },
      {
        title: 'Aislar el entorno de restauración',
        detail: 'Restaurar jamás sobre producción ni sobre red con usuarios: usar el entorno de labs o una red aislada. Un restore apuntado a la ruta equivocada pisa datos buenos. El aislamiento convierte la prueba en un experimento seguro en lugar de un riesgo nuevo.'
      },
      {
        title: 'Ejecutar la restauración',
        detail: 'Ejecutar el restore con la herramienta real del pipeline hacia el destino aislado. Registrar hora de inicio y fin: ese tiempo es el RTO medido (parcial: solo datos). Guardar cualquier advertencia de la herramienta (permisos, archivos saltados, degradación).',
        command: 'restic restore latest --target /srv/restore-test'
      },
      {
        title: 'Verificar integridad y contenido',
        detail: 'Comparar checksums del restaurado contra el original de la misma fecha, o árboles completos con diff recursivo. Revisar también los metadatos que importan al servicio: permisos, owner y fechas. La prueba no es "terminó sin error": es "los datos son los correctos".',
        command: 'diff -r /srv/origen /srv/restore-test'
      },
      {
        title: 'Medir contra los objetivos',
        detail: 'Comparar el RTO medido contra el objetivo declarado y la antigüedad de la última copia buena contra el RPO objetivo. Si no se cumple, el resultado es un hallazgo con acción correctiva, no un fracaso que esconder: para eso existe la prueba.',
        command: 'sha256sum /srv/origen/datos.csv /srv/restore-test/datos.csv'
      },
      {
        title: 'Documentar la evidencia',
        detail: 'Dejar en el reporte: qué se restauró, desde qué copia, tiempos, checksums, problemas encontrados (llaves, permisos, versiones) y acciones con dueño. Ese documento es la evidencia auditable de recuperabilidad y la respuesta a la pregunta de dirección: ¿y si perdemos el servidor?'
      },
      {
        title: 'Programar la periodicidad',
        detail: 'La prueba pierde valor con el tiempo. Agendar la siguiente (trimestral es el mínimo razonable en Nexora) y revisar el triggers: cambio de herramienta de backup, de repositorio, de versión o de volumen de datos dispara prueba antes de fecha.'
      }
    ],
    verification: 'El restore pasa la comparación de integridad (diff -r sin diferencias o checksums iguales), el RTO medido queda documentado y las brechas encontradas tienen acciones asignadas con dueño.',
    escalation: 'Líder de Infra & Ops (si la prueba revela que no hay recuperabilidad real: copia única, llaves perdidas o datos corruptos)',
    relatedTerms: ['RPO', 'RTO', 'Regla 3-2-1'],
    relatedTickets: ['sa-013', 'sa-039']
  },
  {
    id: 'sakb-win-service-down',
    title: 'Servicio de Windows detenido: Event Viewer + PowerShell',
    category: 'SysAdmin - Windows Server',
    environment: 'Windows Server',
    symptoms: 'Un servicio de Windows Server (aplicación interna, agente de monitoreo, servicio de integración) aparece detenido o en ciclo de arranque y caída. Los usuarios notan la función caída o el monitoreo reporta el puerto sin responder, y el RDP al servidor sigue funcionando.',
    cause: 'Cuenta de servicio con contraseña caducada o sin permisos (error 1069), crash de la aplicación tras una actualización, dependencia de otro servicio detenido, o el SCM deteniéndolo tras fallos repetidos sin recuperación configurada.',
    steps: [
      {
        title: 'Confirmar estado y tipo de arranque',
        detail: 'Get-Service muestra estado y StartType. Un StartType Manual explica "no vuelve tras reiniciar" sin que el servicio esté "roto". Este es el chequeo de 10 segundos que ordena todo el diagnóstico posterior.',
        command: 'Get-Service NexoraSync | Format-List Name,Status,StartType'
      },
      {
        title: 'Leer el registro de eventos del SCM',
        detail: 'El Service Control Manager registra cada caída con Event ID 7031 (proceso terminado inesperadamente) o 7034 junto al código de salida del proceso. Ese código es la causa raíz en la mayoría de los casos: filtrar el log System por el proveedor SCM y leer los últimos eventos.',
        command: "Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Service Control Manager'} -MaxEvents 20"
      },
      {
        title: 'Ver la cuenta con la que corre el servicio',
        detail: 'sc qc muestra la cuenta de servicio, el tipo de arranque y las dependencias declaradas. Si la cuenta es de servicio con contraseña caducada, el arranque falla con 1069: la solución es renovar la credencial, no reinstalar el servicio.',
        command: 'sc qc NexoraSync'
      },
      {
        title: 'Comprobar dependencias',
        detail: 'Un servicio que depende de SQL, colas o red no arranca si su base no está. Listar los servicios dependientes y las dependencias: el orden de arranque importa más que el número de reintentos.',
        command: 'Get-Service NexoraSync -DependentServices'
      },
      {
        title: 'Reintentar el arranque y capturar el error exacto',
        detail: 'Start-Service devuelve el mensaje real del fallo (1069 cuenta, 1053 timeout, 1067 proceso muerto). Leerlo antes de tocar nada más: reinstalar o "recrear" sin entender el error convierte un problema diagnosticable en una caja negra.',
        command: 'Start-Service NexoraSync'
      },
      {
        title: 'Configurar recuperación automática',
        detail: 'La política de recovery reinicia el servicio tras un fallo (con retardo y número de intentos configurables). No reemplaza la causa raíz, pero protege la operación mientras se corrige de fondo. Configurarla en el mismo ticket, no "para la próxima".',
        command: 'sc failure NexoraSync reset= 86400 actions= restart/60000/restart/60000/restart/60000'
      },
      {
        title: 'Verificar estabilidad en el tiempo',
        detail: 'El Event ID 7036 marca inicios y paradas normales. Vigilar 24 horas: si el servicio vuelve a caer con el mismo código de salida, el problema es de la aplicación y va a L2 con la evidencia ya recolectada, no a empezar de cero.',
        command: "Get-WinEvent -FilterHashtable @{LogName='System'; Id=7036} -MaxEvents 10"
      }
    ],
    verification: 'El servicio queda Running, responde a su healthcheck o puerto, y el registro de eventos muestra un 7036 de inicio sin nuevos 7031/7034 en las horas siguientes.',
    escalation: 'L2 - Aplicaciones (crash repetido con el mismo código de salida)',
    relatedTerms: ['GPO', 'Rollback'],
    relatedTickets: ['sa-014', 'sa-040']
  },
  {
    id: 'sakb-dns-interno',
    title: 'Resolución DNS interna fallida',
    category: 'SysAdmin - Redes & Firewalls',
    environment: 'Windows Server',
    symptoms: 'Varios usuarios o servidores no resuelven nombres internos (intranet, aplicaciones, controladores) mientras por IP todo responde. Puede afectar un sitio completo, solo algunos clientes, o empezar justo después de un cambio en AD o en la red.',
    cause: 'Servicio DNS caído en uno de los DC, registros stale tras scavening agresivo, replicación de AD partida (zonas DNS integradas desincronizadas), o clientes apuntando a un DNS que ya no existe o a uno público que no conoce la zona interna.',
    steps: [
      {
        title: 'Confirmar el patrón del fallo',
        detail: 'Probar la resolución desde un cliente afectado y desde uno sano. Si falla en ambos sitios, el problema es del DNS del dominio; si solo en uno, es del sitio o del cliente. El patrón acota el diagnóstico antes de tocar nada.',
        command: 'Resolve-DnsName intranet.nexora.local'
      },
      {
        title: 'Consultar directamente los DNS del dominio',
        detail: 'Consultar a cada DC por su IP evita la caché del cliente y responde quién resuelve y quién no. Si un DC responde y el otro no, ahí está el incidente: servicio DNS caído o zona sin cargar en ese controlador.',
        command: 'nslookup intranet.nexora.local 10.10.10.10'
      },
      {
        title: 'Verificar la zona en cada DC',
        detail: 'Get-DnsServerZone confirma que la zona nexora.local existe y carga en cada DC. En DNS integrado a AD, una zona que no carga en un solo controlador rompe a todos los clientes que lo tienen como DNS preferido: el monitoreo por servidor importa.',
        command: 'Get-DnsServerZone'
      },
      {
        title: 'Validar la salud del DNS del dominio',
        detail: 'dcdiag con el test de DNS valida la configuración completa: delegaciones, forwarders, registros de los DC y capacidad de resolver. Reporta errores concretos por controlador y es el argumento técnico para escalar a identidad/AD si toca.',
        command: 'dcdiag /test:dns /v'
      },
      {
        title: 'Revisar la replicación de AD',
        detail: 'Las zonas DNS integradas viajan por la replicación de AD: si está retrasada o partida, los registros nuevos existen en un DC y no en otro, y la resolución depende de a quién le pregunte cada cliente. repadmin resume el estado de replicación de un vistazo.',
        command: 'repadmin /replsummary'
      },
      {
        title: 'Corregir el lado cliente',
        detail: 'Limpiar la caché (ipconfig /flushdns) y verificar que los clientes usan los DNS corporativos. Un cliente con DNS público fijo resuelve internet perfectamente y los nombres internos nunca: es el diagnóstico diferencial básico del DNS interno.',
        command: 'ipconfig /flushdns'
      },
      {
        title: 'Verificar y prevenir',
        detail: 'Resolver el mismo nombre desde ambos sitios sin especificar servidor y confirmar la recuperación en el monitoreo. Si la causa fue scavening agresivo, revisar la política (ventanas y timestamps) para no repetir; si fue replicación, dejar el repadmin limpio como evidencia.',
        command: 'nslookup intranet.nexora.local'
      }
    ],
    verification: 'nslookup resuelve los nombres internos desde los dos sitios sin especificar servidor, dcdiag /test:dns sale limpio y los usuarios acceden a la intranet por nombre.',
    escalation: 'L2 - Identidad / AD (problemas de replicación entre controladores)',
    relatedTerms: ['DNS', 'DHCP'],
    relatedTickets: ['sa-015', 'sa-041']
  },
  {
    id: 'sakb-dhcp-scope-full',
    title: 'Scope DHCP agotado',
    category: 'SysAdmin - Windows Server',
    environment: 'Windows Server',
    symptoms: 'Equipos nuevos o reconectados no reciben IP y quedan en APIPA (169.254.x.x) mientras los ya conectados siguen funcionando. La consola DHCP muestra el scope con uso del 100% o muy cerca, y el teléfono empieza a sonar por pisos.',
    cause: 'Scope demasiado pequeño para el crecimiento real, leases larguísimos (8 días o más) que retienen direcciones de dispositivos ya ausentes, dispositivos móviles consumiendo direcciones del scope corporativo, o una VLAN enrutada pidiendo leases a un scope equivocado (fuga de alcance).',
    steps: [
      {
        title: 'Confirmar el agotamiento',
        detail: 'Get-DhcpServerv4ScopeStatistics muestra el uso por scope. El 100% (o 98% con reservas) confirma el diagnóstico. Prioridad inmediata: liberar direcciones para los equipos que van llegando, y luego tratar la causa de fondo.',
        command: 'Get-DhcpServerv4ScopeStatistics'
      },
      {
        title: 'Listar las leases activas',
        detail: 'Revisar quién tiene las direcciones: hosts conocidos, dispositivos viejos retirados, impresoras y cualquier patrón anómalo (por ejemplo 40 móviles en el scope corporativo). La lista de leases es la radiografía del scope y revela la causa dominante.',
        command: 'Get-DhcpServerv4Lease -ScopeId 10.20.30.0'
      },
      {
        title: 'Liberar leases de dispositivos ausentes',
        detail: 'Los leases de equipos retirados o de visitas puntuales liberan direcciones al instante. Eliminar las identificadas con su ClientId y documentar cuáles se liberaron y por qué: es un cambio con evidencia, no un borrado a ciegas.',
        command: 'Remove-DhcpServerv4Lease -ScopeId 10.20.30.0 -ClientId 00-1A-2B-3C-4D-5E'
      },
      {
        title: 'Reducir la duración de las leases',
        detail: 'En redes con rotación de dispositivos (oficinas con visitantes, BYOD, laboratorios), leases de 8 días retienen direcciones sin necesidad. Bajar la duración libera el scope de forma orgánica en las horas siguientes, sin tocar el addressing.',
        command: 'Set-DhcpServerv4Scope -ScopeId 10.20.30.0 -LeaseDuration 1.00:00:00'
      },
      {
        title: 'Ampliar el scope si el problema es estructural',
        detail: 'Si el número real de dispositivos supera el rango, la solución es de diseño: ampliar el scope o corregir el subnetting. Es un cambio formal (toca la red, no solo el DHCP): ventana, plan y rollback, con L2 de redes.'
      },
      {
        title: 'Verificar la renovación',
        detail: 'Renovar en un equipo afectado y confirmar que recibe dirección del scope correcto con gateway y DNS correctos. Verificar también que no hay fuga (los móviles de visitantes pidiendo al scope corporativo): el síntoma de fuga es el scope lleno con la mitad de la gente conectada.',
        command: 'ipconfig /renew'
      },
      {
        title: 'Prevenir con monitoreo del uso del scope',
        detail: 'Crear alerta de uso de scope por encima del 85%. El agotamiento nunca debería ser sorpresa: es una tendencia visible semanas antes y es más barato gestionarla el lunes que apagarla el viernes.'
      }
    ],
    verification: 'Un equipo nuevo obtiene IP del scope con gateway y DNS correctos, Get-DhcpServerv4ScopeStatistics muestra holgura bajo el umbral y la alerta de uso quedó configurada.',
    escalation: 'L2 - Redes (rediseño de addressing o subnetting)',
    relatedTerms: ['DHCP', 'DNS'],
    relatedTickets: ['sa-016', 'sa-042']
  },
  {
    id: 'sakb-gpo-not-applying',
    title: 'GPO que no aplica',
    category: 'SysAdmin - Windows Server',
    environment: 'Windows Server',
    symptoms: 'Una directiva configurada en el dominio no se refleja en los equipos objetivo: mapeos que no aparecen, políticas de seguridad sin efecto, o settings que aplican en algunos equipos y en otros no. gpupdate no arregla la situación y el usuario ya lo intentó dos veces.',
    cause: 'Filtrado de seguridad que excluye al equipo o usuario, vínculo de OU equivocado (el objeto vive en otra OU), replicación de AD lenta o partida (el equipo ve una versión vieja de la GPO), otra GPO con mayor precedencia ganándose los settings, o procesamiento fallido por eventos.',
    steps: [
      {
        title: 'Ver qué GPOs aplican realmente',
        detail: 'gpresult /r muestra las GPOs aplicadas y las denegadas con su origen. Si la GPO esperada no aparece en la lista, el problema es de alcance o filtrado, no de contenido: la política puede estar perfecta y simplemente no estar llegando al equipo.',
        command: 'gpresult /r'
      },
      {
        title: 'Generar el reporte completo',
        detail: 'El reporte HTML de gpresult muestra los settings efectivos con la precedencia de GPOs que los produce. Si la GPO aplica pero el setting concreto no está, otra GPO la está ganando (o el setting está en Computer y se miró en User, o viceversa).',
        command: 'gpresult /h C:\\temp\\gpreporte.html'
      },
      {
        title: 'Revisar los eventos de procesamiento de directivas',
        detail: 'El log operativo de Group Policy registra cada ciclo de procesamiento y sus errores. Un 7016 marca lentitud extrema, un 1129 apunta a problemas de red o DNS para localizar el DC durante el procesamiento. Los eventos convierten "no aplica" en una causa concreta.',
        command: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-GroupPolicy/Operational'} -MaxEvents 30"
      },
      {
        title: 'Verificar alcance y filtrado',
        detail: 'En la GPO: OU vinculada (y confirmar que el equipo o usuario vive realmente ahí), Security Filtering (grupo correcto, equipo no excluido), filtros WMI y flags de Enforced/Block Inheritance. La mitad de los casos se resuelven en esta pantalla sin tocar nada más.'
      },
      {
        title: 'Verificar el DC y la replicación',
        detail: 'El equipo procesa GPOs contra el DC que localiza: nltest muestra cuál eligió. Si la replicación va retrasada, el equipo ve una versión vieja de la directiva aunque en el DC principal ya esté bien. repadmin /replsummary resume el estado.',
        command: 'nltest /dsgetdc:nexora.local'
      },
      {
        title: 'Forzar reproceso y verificar',
        detail: 'Corregida la causa, forzar el procesamiento y confirmar que la GPO aparece en Applied Group Policy Objects y que el setting se refleja en el equipo. Si persiste sin aparecer, escalar a identidad/AD con el reporte y repadmin como evidencia.',
        command: 'gpupdate /force'
      }
    ],
    verification: 'gpresult /r lista la GPO en Applied Group Policy Objects, el setting se refleja en el equipo (mapeo visible, permiso aplicado) y el log operativo de Group Policy no muestra errores nuevos.',
    escalation: 'L2 - Identidad / AD (replicación o infraestructura de directivas)',
    relatedTerms: ['GPO', 'DNS'],
    relatedTickets: ['sa-017', 'sa-043']
  },
  {
    id: 'sakb-patching-window',
    title: 'Ventana de parches: proceso y rollback',
    category: 'SysAdmin - Automatización',
    environment: 'Multi',
    symptoms: 'Llegó la ventana mensual de parcheo o una actualización crítica de seguridad que no puede esperar: hay que actualizar servidores Linux y Windows con riesgo mínimo, verificación por oleadas y rollback listo. El reto no es aplicar parches: es aplicarlos sin incidentes y con evidencia.',
    cause: 'No es un fallo sino mantenimiento planificado. Los incidentes clásicos de parcheo nacen de: sin snapshot previo, sin staging, sin verificación post-reinicio, o aplicando a todos a la vez. El proceso existe para cerrar exactamente esas cuatro puertas.',
    steps: [
      {
        title: 'Preparar el inventario y clasificar',
        detail: 'Listar qué hay por aplicar en cada plataforma: apt list --upgradable en Linux, Get-HotFix para revisar lo instalado en Windows. Clasificar: seguridad críticos primero, luego funcionales. Definir el orden de servidores: no productivos, secundarios y al final los críticos.',
        command: 'apt list --upgradable'
      },
      {
        title: 'Preparar el punto de retorno',
        detail: 'Snapshot del servidor en el hipervisor (o backup consistente verificado) ANTES de tocar nada, por servidor de la ventana. Sin punto de retorno no hay ventana de parches: hay una apuesta con fecha. El snapshot se elimina al cerrar (sakb-snapshot-bloat).'
      },
      {
        title: 'Probar en staging primero',
        detail: 'Aplicar el mismo set de parches en los servidores de pruebas y validar la aplicación ahí: dependencias, versiones de librerías y reinicio limpio. Descubrir en staging el parche que rompe la app es barato; descubrirlo en producción a medianoche es carísimo.'
      },
      {
        title: 'Aplicar por oleadas',
        detail: 'Aplicar por grupos: una oleada, verificar, y solo entonces la siguiente. Reiniciar al final de cada servidor y esperar el arranque completo antes de continuar. Nunca en paralelo a toda la flota: el radio de impacto debe ser controlable.',
        command: 'apt-get upgrade -y'
      },
      {
        title: 'Verificar post-parche',
        detail: 'Servicios activos, healthchecks y logs tras el reinicio: la verificación es parte de la ventana, no de la mañana siguiente. Confirmar que el servidor volvió al monitoreo antes de pasar al siguiente de la oleada.',
        command: 'systemctl is-active app-nexora'
      },
      {
        title: 'Ejecutar rollback si algo falla',
        detail: 'El rollback por avance: desinstalar el parche problemático en Windows, el downgrade del paquete en Linux, o volver al snapshot del hipervisor. Tener el comando y el plan listos ANTES de empezar acorta el incidente de horas a minutos: es la diferencia entre ventana y madrugada.',
        command: 'wusa /uninstall /kb:5034411 /quiet'
      },
      {
        title: 'Cerrar con evidencia',
        detail: 'Documentar por servidor: parches aplicados, reinicios, verificaciones y problemas. Registrar las exclusiones con su justificación y aprobador. Ese reporte alimenta la siguiente ventana y es la evidencia de cumplimiento de auditoría.'
      }
    ],
    verification: 'Todos los servidores de la ventana parcheados o excluidos con justificación aprobada, servicios verificados tras reinicio, snapshots limpiados y el reporte de la ventana guardado con evidencia.',
    escalation: 'CAB / Líder de Infra & Ops (exclusiones de parches de seguridad o desviaciones de ventana)',
    relatedTerms: ['Ventana de mantenimiento', 'Rollback', 'Ansible'],
    relatedTickets: ['sa-018', 'sa-044']
  },
  {
    id: 'sakb-cert-expiring',
    title: 'Certificado TLS a punto de expirar',
    category: 'SysAdmin - Seguridad & Hardening',
    environment: 'Multi',
    symptoms: 'La alerta de monitoreo indica que un certificado TLS (intranet, API, VPN, balanceador) expira en menos de 30/15 días. Los navegadores aún confían y todo funciona, pero la fecha se acerca: un certificado expirado en producción es outage visible e inmediato para todos los usuarios.',
    cause: 'Renovación manual olvidada (sin inventario ni alerta temprana), certificado comprado cuyo proceso dependía de una persona que ya no está, o CA interna con plantilla o cadena cambiada. La expiración de certificados es el incidente más predecible que existe: tiene fecha y hora.',
    steps: [
      {
        title: 'Confirmar la expiración real del certificado en vivo',
        detail: 'Consultar el servicio con openssl s_client y leer la fecha de vencimiento del certificado desplegado (no el archivo: el que sirve el puerto). Comparar contra la alerta para confirmar de qué certificado se trata y en qué servidor.',
        command: 'echo | openssl s_client -connect intranet.nexora.local:443 2>/dev/null | openssl x509 -noout -enddate'
      },
      {
        title: 'Inventariar los certificados del servidor',
        detail: 'Revisar los archivos de certificados con su fecha y mapear cuál está realmente en uso por cada servicio: renovar el archivo equivocado no evita el incidente. El s_client del paso anterior es la referencia de la verdad (el puerto manda sobre el archivo).',
        command: 'openssl x509 -noout -enddate -in /etc/ssl/certs/intranet.crt'
      },
      {
        title: 'Generar la CSR con la clave y SAN correctos',
        detail: 'Renovar con la misma clave o rotarla según el procedimiento de la CA. La CSR debe llevar los SAN completos: un certificado sin un SAN que la aplicación usa rompe por otro lado (los clientes modernos ignoran el CN suelto).',
        command: 'openssl req -new -key srv-web.key -out srv-web.csr -subj "/CN=intranet.nexora.local"'
      },
      {
        title: 'Emitir y custodiar',
        detail: 'Con CA interna: firmar con la plantilla correcta. Con CA pública: completar el challenge, descargar el certificado y la cadena completa (entidades intermedias incluidas). Guardar llave, certificado y cadena en la bóveda de secretos: la renovación de emergencia empieza por poder encontrarlos.'
      },
      {
        title: 'Desplegar y recargar el servicio',
        detail: 'Reemplazar el archivo y recargar el servicio (reload, no restart: no corta conexiones establecidas). Verificar que el usuario del servicio puede leer la llave (permisos) y que el ruta en la configuración apunta al archivo nuevo.',
        command: 'systemctl reload nginx'
      },
      {
        title: 'Verificar cadena y vigencia en vivo',
        detail: 'Confirmar desde un cliente limpio que el certificado nuevo sirve (fechas nuevas, issuer correcto) y que la cadena completa valida: el clásico post-despliegue es el certificado nuevo sin la intermedia, que en algunos navegadores funciona y en otros rompe.',
        command: 'echo | openssl s_client -connect intranet.nexora.local:443 2>/dev/null | openssl x509 -noout -dates,issuer'
      },
      {
        title: 'Prevenir el próximo ciclo',
        detail: 'Recalcular la alerta de monitoreo sobre la nueva fecha con avisos a 30/15/7 días y registrar el certificado en el inventario con dueño, servicio, CA y método de renovación. La próxima expiración debe encontrarse por alerta, nunca por usuarios reportando el sitio roto.'
      }
    ],
    verification: 'openssl s_client muestra el certificado nuevo con fechas y issuer correctos, el cliente accede sin advertencias y la alerta de monitoreo quedó recalculada sobre la nueva fecha de expiración.',
    escalation: 'Líder de Infra & Ops / Seguridad (compras de CA pública o cambios en la PKI interna)',
    relatedTerms: ['Certificado TLS', 'PKI'],
    relatedTickets: ['sa-019', 'sa-045']
  },
  {
    id: 'sakb-vlan-misconfig',
    title: 'VLAN mal configurada',
    category: 'SysAdmin - Redes & Firewalls',
    environment: 'Red',
    symptoms: 'Un segmento completo queda aislado o con comportamiento parcial: no llega al gateway, el DHCP no entrega (o entrega IP de otra red), o un servicio interno dejó de responder justo después de un cambio en los switches. Suele correlacionar con una ventana de cambio reciente.',
    cause: 'Puerto de access configurado en la VLAN equivocada (o caído a la VLAN 1 por defecto), troncal que dejó de transportar esa VLAN (allowed list o pruning), SVI o IP helper mal configurados, o el cambio aplicado en el switch incorrecto. El "a medias" es lo más común: un extremo bien y otro mal.',
    steps: [
      {
        title: 'Acotar el impacto',
        detail: '¿Un equipo, un piso o una red completa? Ping al gateway desde un equipo afectado: si el gateway no responde, el problema está en capa 2 del switch o en la SVI, no en el equipo. Ese único dato evita horas de diagnóstico en el equipo equivocado.',
        command: 'ping 10.20.30.1'
      },
      {
        title: 'Verificar la VLAN del puerto de access',
        detail: 'Confirmar que el puerto está en modo access, en la VLAN correcta y sin VLAN de voz extraña. Un cambio de puerto "rápido" o una reposición de patch suelen dejarlo en la VLAN 1 por defecto: el equipo linkea pero no llega a ninguna parte.',
        command: 'show interfaces gi1/0/12 switchport'
      },
      {
        title: 'Verificar la VLAN en los troncales',
        detail: 'En cada troncal del camino, la VLAN afectada debe aparecer en la lista de allowed VLANs. Un cambio de allowed list o un pruning que la excluyó rompe el segmento aunque el access esté perfecto: verificar ida y vuelta, no solo el extremo conocido.',
        command: 'show interfaces trunk'
      },
      {
        title: 'Verificar la SVI y el relay de DHCP',
        detail: 'La interfaz VLAN del switch (o del router) debe estar up con la IP de gateway correcta y con el ip helper apuntando al DHCP corporativo si el servidor está en otra VLAN. Sin helper, los clientes de la VLAN no obtienen IP aunque todo lo demás esté bien.',
        command: 'show ip interface vlan 30'
      },
      {
        title: 'Corregir en ambos extremos',
        detail: 'Corregir access y troncal según lo hallado, verificando ida y vuelta: el puerto del usuario Y el troncal hacia el core. Aplicar un solo extremo es dejar la red a medias y garantiza el ticket reincidente de la mañana siguiente.'
      },
      {
        title: 'Verificar conectividad end-to-end',
        detail: 'Renovar DHCP en un cliente afectado y probar la cadena completa: IP del scope correcto, ping al gateway, resolución DNS y acceso al servicio que originó el reporte. Verificar también que otra VLAN no quedó afectada por el mismo cambio.',
        command: 'ipconfig /renew'
      },
      {
        title: 'Documentar la matriz del sitio',
        detail: 'Actualizar la matriz VLAN/puerto del sitio: qué puertos son access de qué VLAN y qué troncales la transportan. La mitad de estas incidencias nacen de documentación desactualizada: el próximo técnico que busque el mapa debe encontrar la verdad.'
      }
    ],
    verification: 'El cliente afectado recibe IP del scope correcto, alcanza su gateway y los servicios por nombre, y una estación de otra VLAN sigue operando sin impacto colateral.',
    escalation: 'L2 - Redes (cambios en troncales del core o redes de storage/iSCSI)',
    relatedTerms: ['VLAN', 'iSCSI', 'DHCP'],
    relatedTickets: ['sa-020', 'sa-046']
  },
  {
    id: 'sakb-vpn-site-down',
    title: 'VPN site-to-site caída',
    category: 'SysAdmin - Redes & Firewalls',
    environment: 'Red',
    symptoms: 'El túnel entre la sede principal y un sitio remoto (o hacia la nube) está caído: los equipos del sitio no alcanzan los servicios centrales y el monitoreo marca el peer como down. Puede haber caído tras un cambio, tras un evento del ISP, o "solo" sin causa aparente.',
    cause: 'Cambio de IP pública del peer (rotación del ISP), desalineación de propuestas de fase 1/2, PSK o certificado inválidos tras rotación de credenciales, NAT-T bloqueado por un cambio de firewall intermedio, o DPD/keepalive que derriba el túnel por inactividad percibida.',
    steps: [
      {
        title: 'Verificar el estado del túnel',
        detail: 'ipsec status (strongSwan) o el equivalente del gateway muestra si la fase 1 está establecida y si existen SAs de fase 2. Fase 1 down apunta al peer, credenciales o red; fase 1 up con fase 2 down apunta a propuestas de tráfico o subredes de interés.',
        command: 'ipsec status'
      },
      {
        title: 'Leer los logs de negociación',
        detail: 'El log del gateway VPN muestra la causa exacta de la negociación fallida: "no proposal chosen", "PSK mismatch", timeouts de respuesta. Cada mensaje lleva a un camino distinto de corrección: leerlo primero evita tocar configuración sana.',
        command: 'journalctl -u strongswan -n 50 --no-pager'
      },
      {
        title: 'Verificar reachability del peer',
        detail: 'Confirmar que el peer responde a nivel IP. Si la IP pública del sitio remoto cambió (rotación del ISP), el túnel no se levantará nunca con la configuración vieja: verificar con el sitio y ajustar el peer antes de pelear con propuestas.',
        command: 'ping 203.0.113.7'
      },
      {
        title: 'Comparar la configuración de ambos extremos',
        detail: 'Revisar lado a lado: propuestas de fase 1 (cifrado, hash, grupo DH), fase 2 (subredes exactas y PFS), PSK/certificados y DPD. Los túneles mueren por detalles: una subred de interés que creció en un lado y no en el otro es el clásico silencioso.'
      },
      {
        title: 'Restaurar el túnel',
        detail: 'Tras corregir, reiniciar el servicio o limpiar las SAs viejas: una asociación a medias puede impedir la renegociación limpia. El flapeo previo deja estado residual que el restart barre.',
        command: 'ipsec restart'
      },
      {
        title: 'Verificar el tráfico interesante end-to-end',
        detail: 'Probar el flujo real que usan los usuarios (la aplicación central desde el sitio, no solo el ping entre gateways) y confirmar en el monitoreo que el túnel queda estable sin flapping en las horas siguientes. Túnel up sin tráfico de usuario es media solución.',
        command: 'ping 10.10.10.20'
      },
      {
        title: 'Prevenir y documentar',
        detail: 'Si la causa fue cambio de IP del ISP: evaluar peer dinámico por hostname y registrar el par (endpoints, subredes, dueño) en el inventario de túneles. Si fue inactividad: ajustar DPD/keepalive. El inventario de túneles evita el arqueológico "¿quién administra este túnel?".'
      }
    ],
    verification: 'El túnel aparece establecido en ambos extremos, el tráfico entre subredes fluye desde el sitio remoto y el monitoreo marca el peer UP sin flapping en las horas siguientes.',
    escalation: 'L2 - Redes / Proveedor ISP (cambio de IP pública o fallo de transporte)',
    relatedTerms: ['VPN site-to-site', 'Firewall'],
    relatedTickets: ['sa-021', 'sa-047']
  },
  {
    id: 'sakb-switch-port',
    title: 'Puerto de switch down / err-disable',
    category: 'SysAdmin - Redes & Firewalls',
    environment: 'Red',
    symptoms: 'Un dispositivo (PC, impresora, AP, servidor) pierde conexión: el puerto del switch aparece down, err-disabled o notconnect sin cambio aparente. A veces se recupera solo y vuelve a caer (flapping), y el reporte del usuario es "la red se cae a ratos".',
    cause: 'Cable o patch cord dañado, loop detectado (BPDU guard por conectar dos puertos entre sí), port-security que se activa por MACs inesperadas (mini-switch no autorizado), negociación de velocidad/dúplex desalineada, o el propio dispositivo con NIC fallando.',
    steps: [
      {
        title: 'Identificar el puerto y su estado',
        detail: 'El estado del puerto (notconnect, err-disabled, connected) y sus contadores de errores orientan la causa antes de tocar nada. Un puerto en connected con errores de CRC creciendo es un problema de cable/autonegociación, no de configuración.',
        command: 'show interfaces status | include Gi1/0/12'
      },
      {
        title: 'Si está err-disabled, encontrar el motivo',
        detail: 'El switch registra la causa del err-disable: psecure-violation, bpduguard, link-flap, udld. Levantar el puerto sin corregir la causa reproduce la caída en segundos y añade un evento más al log. Verificar el motivo con el recovery y el port-security del puerto.',
        command: 'show errdisable recovery'
      },
      {
        title: 'Leer el log del switch',
        detail: 'El registro muestra el evento exacto que derribó el puerto y su hora: correlacionarlo con cambios de configuración, ventanas de mantenimiento o reportes de usuarios de la misma hora. El timestamp del switch es el hilo que cose el diagnóstico.',
        command: 'show logging | include Gi1/0/12'
      },
      {
        title: 'Inspección física y del extremo',
        detail: 'Probar con otro patch cord y, si es posible, otro puerto del mismo switch. Si el error sigue al dispositivo y no al puerto ni al cable, el problema está en la NIC o el extremo: escalar al dueño del dispositivo con la evidencia de red sana.'
      },
      {
        title: 'Corregir la causa raíz',
        detail: 'Según el motivo: reemplazar el cable dañado; si fue port-security por un mini-switch no autorizado, corregir el origen con el usuario y revisar la política; si fue loop por BPDU, encontrar quién conectó dos cables. La causa raíz, no el síntoma.'
      },
      {
        title: 'Recuperar el puerto',
        detail: 'Los puertos err-disabled no vuelven solos (salvo recovery configurado): administrativamente down y up de nuevo, ya corregida la causa. En modo de configuración de interfaz: shutdown para asegurar estado conocido y no shutdown para habilitar.',
        command: 'interface gi1/0/12 ; shutdown ; no shutdown'
      },
      {
        title: 'Verificar y documentar',
        detail: 'Confirmar estado connected sin contadores de error creciendo (CRC, input errors) en los minutos siguientes. Documentar causa y corrección en el ticket y actualizar la matriz del switch si el puerto cambió de uso o de política.',
        command: 'show interfaces gi1/0/12'
      }
    ],
    verification: 'El puerto queda en connected, sin err-disable recurrente ni errores de CRC creciendo en 24 horas, y el dispositivo comunica de forma estable.',
    escalation: 'L2 - Redes (cambios de port-security, BPDU guard o políticas de puerto)',
    relatedTerms: ['VLAN', 'NOC'],
    relatedTickets: ['sa-022', 'sa-048']
  },
  {
    id: 'sakb-firewall-rule',
    title: 'Apertura/cierre de puerto en firewall con evidencia',
    category: 'SysAdmin - Redes & Firewalls',
    environment: 'Red',
    symptoms: 'Un flujo nuevo necesita cruzar el firewall (una aplicación hacia su base de datos, un proveedor hacia un servicio interno) o una regla temporal llegó su fecha de cierre. Toda apertura o cierre es un cambio con evidencia y aprobación: nunca un ajuste rápido sin rastro.',
    cause: 'No es un fallo sino una operación sensible. El riesgo es doble: abrir de más (superficie de ataque que la auditoría encuentra después) o cerrar de más (servicio productivo caído). Por eso la regla de firewall se trata como cambio formal.',
    steps: [
      {
        title: 'Definir el flujo exacto',
        detail: 'Documentar origen (IP, host o subred), destino, puerto, protocolo, dirección y justificación de negocio. "Abrir del servidor X a la BD en 1521/tcp por la integración de proveedores": nada de reglas any a any ni por host cuando el flujo es de subred a subred.'
      },
      {
        title: 'Verificar el estado actual',
        detail: 'Revisar las reglas existentes antes de tocar: el flujo quizá ya está cubierto por otra regla, o quizá existe una en sentido contrario bloqueando. En ufw, la lista numerada permite ubicar la posición exacta; en nftables, el ruleset completo.',
        command: 'ufw status numbered'
      },
      {
        title: 'Probar que hoy no pasa',
        detail: 'Antes del cambio, confirmar el fallo del flujo con una prueba de conexión: es la evidencia del "antes". La misma prueba tras el cambio demostrará el "después". Sin antes y después, el ticket de cambio queda en "creo que ya funciona".',
        command: 'nc -zv 10.10.20.15 1521'
      },
      {
        title: 'Implementar la regla específica',
        detail: 'La regla debe ser lo más estrecha posible: origen concreto, destino concreto, puerto y protocolo concretos. Las reglas amplias "para que no vuelva a fallar" se convierten en deuda de seguridad que nadie se atreve a borrar.',
        command: 'ufw allow from 10.10.10.0/24 to 10.10.20.15 port 1521 proto tcp'
      },
      {
        title: 'Verificar el flujo y el servicio',
        detail: 'Repetir la prueba de conexión: ahora debe pasar. Y verificar la aplicación real de punta a punta: a veces el firewall era solo la mitad del problema y el flujo sigue roto por DNS, rutas o la propia aplicación.',
        command: 'nc -zv 10.10.20.15 1521'
      },
      {
        title: 'Registrar el cambio',
        detail: 'Adjuntar al ticket: solicitud con aprobador, regla exacta aplicada (comando o captura), pruebas antes/después y vigencia (permanente o fecha de expiración si es temporal). El auditor futuro (o uno mismo en un año) debe poder reconstruir por qué existe la regla.'
      },
      {
        title: 'Cerrar lo temporal de verdad',
        detail: 'Las reglas temporales expiran de verdad: agendar la fecha de revisión y eliminarlas con la misma evidencia del cierre. El firewall lleno de reglas "temporales" de hace un año es el hallazgo clásico de auditoría y el inventario mentiroso de la seguridad.',
        command: 'ufw delete 4'
      }
    ],
    verification: 'El flujo pasa (prueba de conexión exitosa), la aplicación funciona, la regla queda documentada en el ticket con aprobador y vigencia, y las reglas temporales tienen fecha de cierre registrada.',
    escalation: 'Seguridad / CAB (aperturas hacia internet o desde redes no confiables)',
    relatedTerms: ['Firewall', 'nftables', 'ufw'],
    relatedTickets: ['sa-023', 'sa-049']
  },
  {
    id: 'sakb-vm-wont-boot',
    title: 'VM que no arranca',
    category: 'SysAdmin - Virtualización',
    environment: 'Virtualización',
    symptoms: 'Una VM no arranca o se queda colgada en el boot: pantalla negra, kernel panic, "no bootable device", o el bootloader esperando. El hipervisor muestra la VM como running pero el sistema invitado no sube, y el servicio que aloja está caído.',
    cause: 'Cadena de snapshots rota o disco base movido/renombrado, orden de arranque cambiado (una ISO quedó como primer dispositivo), filesystem del invitado sucio tras un apagón, o corrupción del disco virtual tras un datastore lleno o una consolidación interrumpida.',
    steps: [
      {
        title: 'Observar dónde se queda el arranque',
        detail: 'La consola de la VM dice la fase: POST y nada (orden de arranque o disco), grub prompt (bootloader), kernel panic (invitado). Cada síntoma lleva a un camino distinto de reparación. qm status o el vCenter confirman el estado desde el hipervisor.',
        command: 'qm status 101'
      },
      {
        title: 'Verificar el disco y el datastore',
        detail: 'Confirmar que el disco existe, su ruta es válida y el datastore tiene espacio. Un datastore lleno o un disco huérfano (movido a mano fuera de su ruta) explica el "no bootable device" y cambia todo el diagnóstico hacia el hipervisor.',
        command: 'esxcli storage filesystem list'
      },
      {
        title: 'Revisar snapshots y cadena de discos',
        detail: 'Snapshot pendiente de consolidación o cadena rota tras mover archivos: la VM no encuentra el disco base. NO consolidar a ciegas con el datastore lleno: es la receta para perder el disco. Primero espacio, luego consolidación.',
        command: 'vim-cmd vmsvc/snapshot.get 12'
      },
      {
        title: 'Corregir el orden de arranque',
        detail: 'Verificar en las opciones de la VM: sin ISO residual como primer dispositivo de arranque y con el disco correcto primero. Es la causa más simple y la más vergonzosa de encontrar después de dos horas de diagnóstico profundo.'
      },
      {
        title: 'Reparar el sistema invitado si llegó a bootloader o kernel',
        detail: 'Con Linux: modo rescue y fsck sobre el filesystem sucio. Con Windows: ISO de instalación y reparación de arranque (bootrec /fixboot y /rebuildbcd). La reparación de invitado se hace con la VM aislada de producción hasta confirmar que sube limpia.',
        command: 'bootrec /rebuildbcd'
      },
      {
        title: 'Arrancar y verificar la VM',
        detail: 'Arrancar, entrar por consola y confirmar login y servicios. Revisar los logs del invitado para entender la causa original (apagón, disco lleno, parche) y cerrar esa causa: si no, la VM vuelve a caerse con la misma condición.',
        command: 'qm start 101'
      },
      {
        title: 'Escalar si hay corrupción de disco',
        detail: 'Si el disco virtual está corrupto (no arranca tras fsck/reparación), escalar con la evidencia y NO improvisar recuperación sobre el archivo original: clonar primero y trabajar sobre la copia. La recuperación amateur sobre el original es la forma de convertir incidente en pérdida de datos.',
        command: 'cp --reflink=auto vm-disk.qcow2 vm-disk-recovery.qcow2'
      }
    ],
    verification: 'La VM arranca, responde por red y consola, los servicios del invitado quedan activos y los logs no muestran la condición original recurrente.',
    escalation: 'Líder de Virtualización / Soporte del hipervisor (corrupción de discos o datastores)',
    relatedTerms: ['vSphere', 'Proxmox', 'Snapshot'],
    relatedTickets: ['sa-024', 'sa-050']
  },
  {
    id: 'sakb-datastore-full',
    title: 'Datastore lleno',
    category: 'SysAdmin - Virtualización',
    environment: 'Virtualización',
    symptoms: 'El vCenter o Proxmox alerta el datastore por encima del umbral (85-95%), las VMs nuevas no encienden, los snapshots fallan al consolidar, o las VMs thin con alto provisioned dejan de escribir en el pico. Suele ser una tendencia silenciosa que explota de golpe un martes.',
    cause: 'Crecimiento de discos thin provisioned, snapshots acumulados con deltas grandes, ISOs y VMs retiradas sin borrar, o tamaño del datastore subestimado respecto al crecimiento real. El provisioned total por encima del capacidad física es la bomba de tiempo silenciosa.',
    steps: [
      {
        title: 'Verificar el uso real y el provisionado',
        detail: 'pvesm status (Proxmox) o esxcli storage filesystem list (ESXi) muestran el uso real. El dato crítico adicional es el provisioned: un datastore 70% usado pero 130% provisionado está a un pico de escrituras de quedarse en cero. Ambos números van al diagnóstico.',
        command: 'pvesm status'
      },
      {
        title: 'Identificar los consumidores',
        detail: 'Ordenar por tamaño: discos de VM crecidos, deltas de snapshots, ISOs montables y discos huérfanos (sin VM dueña). Los huérfanos y las VMs retiradas son espacio recuperable inmediato; los discos crecidos exigen decisión de ampliación o limpieza.',
        command: 'vim-cmd vmsvc/getallvms'
      },
      {
        title: 'Consolidar o eliminar snapshots antiguos',
        detail: 'Cada snapshot mantiene un delta que crece con las escrituras: consolidar libera ese espacio. Verificar que queda margen suficiente ANTES de consolidar (la consolidación misma necesita espacio libre): con el datastore al 95%, consolidar a lo bruto puede empeorar el incidente.',
        command: 'vim-cmd vmsvc/snapshot.removeall 12'
      },
      {
        title: 'Eliminar huérfanos con evidencia',
        detail: 'ISOs que ya nadie monta, VMs retiradas y archivos dead: listar, verificar que nadie los reclama y borrar con la lista en el ticket. Lo "huérfano" de hoy es "activo y crítico" al mes siguiente si la eliminación no queda registrada con criterio.',
        command: 'pvesm list local | sort -k3 -h'
      },
      {
        title: 'Mover o ampliar si es estructural',
        detail: 'Con crecimiento real y sostenido: mover el disco de la VM hacia otro almacenamiento con margen o ampliación formal del datastore/LUN (cambio con plan y rollback, con el equipo de storage). El parche de "borrar logs de VMs" solo compra días.',
        command: 'qm move-disk 101 scsi0 storage-nvme2'
      },
      {
        title: 'Verificar y alarmar la tendencia',
        detail: 'Tras liberar, confirmar el nuevo uso y que las VMs afectadas encienden. Activar la alarma de capacidad al 80% con tendencia (sakb-capacity-trend) para que la próxima vez sea un ticket de planificación y no un incidente del martes.'
      }
    ],
    verification: 'El datastore queda por debajo del umbral con margen para consolidaciones, las VMs encienden sin errores y la alarma de capacidad quedó activa con el umbral recalibrado.',
    escalation: 'Líder de Virtualización / Storage (ampliación de LUN o datastore)',
    relatedTerms: ['Datastore', 'Snapshot', 'vSphere'],
    relatedTickets: ['sa-025', 'sa-051']
  },
  {
    id: 'sakb-snapshot-bloat',
    title: 'Snapshots inflados u huérfanos',
    category: 'SysAdmin - Virtualización',
    environment: 'Virtualización',
    symptoms: 'Un snapshot creado "solo para la ventana de parches" sigue ahí semanas después: su archivo delta crece sin control, el datastore se llena, la VM rinde peor y el sistema de backup empieza a fallar o a advertir cadenas de snapshot largas.',
    cause: 'Snapshots olvidados porque el runbook de la ventana no tiene paso de limpieza, cadenas largas acumuladas por repetición, o snapshots huérfanos tras tareas interrumpidas (consolidación fallida a medias, VM movida con snapshot activo).',
    steps: [
      {
        title: 'Detectar los snapshots existentes',
        detail: 'vim-cmd vmsvc/snapshot.get (ESXi) o la pestaña Snapshots de vCenter/Proxmox listan snapshots con su edad y descripción. En producción, un snapshot de más de 72 horas ya es una anomalía, no un mecanismo: la vida útil de un snapshot es una ventana, no un mes.',
        command: 'vim-cmd vmsvc/snapshot.get 12'
      },
      {
        title: 'Medir el impacto',
        detail: 'Tamaño del delta contra el disco base y uso del datastore. Un delta del 50-60% del disco base significa que consolidar requiere ese espacio libre: si no hay, primero liberar o ampliar (sakb-datastore-full). Medir antes de actuar evita consolidar contra la pared.',
        command: 'ls -lht /vmfs/volumes/datastore1/srv-bd-prod | head'
      },
      {
        title: 'Coordinar la consolidación',
        detail: 'Consolidar destruye el punto de retorno del snapshot: hacerlo en ventana coordinada y DESPUÉS de verificar que el backup de la VM es bueno y reciente. Nunca consolidar con el backup apoyado en snapshots si la herramienta no lo soporta: leer la documentación del sistema de backup antes.'
      },
      {
        title: 'Consolidar y vigilar',
        detail: 'Delete All desde el Snapshot Manager (o snapshot.removeall) consolida los deltas al disco base. Es E/S intensiva y puede tardar: no apagar la VM a mitad (alarga todo) y monitorear el espacio del datastore durante el proceso.',
        command: 'vim-cmd vmsvc/snapshot.removeall 12'
      },
      {
        title: 'Verificar la VM después',
        detail: 'Encendida (o arrancada limpia), rendimiento normal, disco accesible y Snapshot Manager vacío. Verificar que el backup de esa noche corre bien: post-consolidación es el momento clásico en que aparecen cadenas rotas si algo quedó a medias.',
        command: 'vim-cmd vmsvc/snapshot.get 12'
      },
      {
        title: 'Prevenir con política',
        detail: 'Regla de oro: vida máxima de 24-72 horas y SIEMPRE un paso de cierre en el runbook de la ventana de cambio (sakb-change-window) que elimine el snapshot. Automatizar la detección de snapshots viejos con alerta: la memoria del sysadmin no es una política de retención.'
      }
    ],
    verification: 'El Snapshot Manager queda vacío (o solo con snapshots justificados de menos de 24 horas), el datastore recuperó espacio, la VM rinde normal y el backup nocturno completa sin advertencias de cadena.',
    escalation: 'Líder de Virtualización (consolidaciones masivas o cadenas rotas)',
    relatedTerms: ['Snapshot', 'Datastore', 'Proxmox'],
    relatedTickets: ['sa-006', 'sa-052']
  },
  {
    id: 'sakb-vm-resource-alert',
    title: 'Alerta de recursos de VM: CPU/RAM',
    category: 'SysAdmin - Virtualización',
    environment: 'Virtualización',
    symptoms: 'El monitoreo alerta uso alto de CPU o memoria en una VM. La pregunta clave antes de tocar nada: ¿el problema es la VM (consumo real de la aplicación) o el host (contención que hace sufrir a la VM)? Dar CPU o RAM a la VM equivocada no arregla un host sobresuscrito.',
    cause: 'Crecimiento real de carga de la aplicación, contención en el host (CPU ready alto por sobresuscripción, ballooning/swap de memoria), sizing insuficiente desde el diseño, o un proceso desbocado dentro del invitado (fuga de memoria, bucle, GC agresivo).',
    steps: [
      {
        title: 'Confirmar la alerta con métricas reales',
        detail: 'Métricas de vCenter/Proxmox del periodo alertado (no el pico de 5 segundos). Una alerta puntual durante el batch nocturno es distinta a una tendencia sostenida de días: la primera es calibración de umbral, la segunda es capacidad.',
        command: 'qm status 101 --verbose'
      },
      {
        title: 'Distinguir invitado contra host',
        detail: 'Dentro del invitado, top y free -h muestran el consumo real por proceso. En el host, el CPU ready time es la métrica que importa: ready por encima del 5% significa que la VM pide CPU y el host no la atiende. Ahí la VM no es el problema: el host sí.',
        command: 'top -b -n1 | head -20'
      },
      {
        title: 'Identificar el proceso o la causa en el invitado',
        detail: 'Si el consumo es real: qué proceso creció (log de la aplicación, GC de JVM, proceso zombie). Muchas veces la solución es de aplicación (reinicio, parche, parámetro de memoria) y no de infraestructura: añadir RAM a una fuga de memoria solo alarga el plazo del mismo incidente.',
        command: 'ps aux --sort=-%mem | head -10'
      },
      {
        title: 'Ajustar recursos con criterio',
        detail: 'Si el sizing es insuficiente: vCPU y memoria con moderación. Más vCPU puede EMPEORAR la contención por co-scheduling del host. En memoria, revisar el ballooning crónico (memoria asignada contra activa): asignar más sin quitar presión solo oculta el síntoma.',
        command: 'qm set 101 --memory 8192 --cores 4'
      },
      {
        title: 'Revisar la colocación en el host',
        detail: 'Si la contención es del host, vMotion VMs hacia hosts con margen. Balancear no es repartir bonito: es asegurar ready time bajo en todos los hosts del pool. Documentar la colocación resultante para no re-pisar la VM en el próximo balanceo.'
      },
      {
        title: 'Verificar y calibrar el umbral de la alerta',
        detail: 'Tras el ajuste, ventana de observación de 24-48 horas y ajustar el umbral para que mida sufrimiento real (ready time, swap) y no picos de uso benignos. La alerta de CPU al 90% en un batch nocturno conocido es ruido, no señal.'
      }
    ],
    verification: 'La métrica se estabiliza bajo el umbral en la ventana de observación, la aplicación responde con tiempos normales y la alerta no reaparece (o reaparece solo por algo accionable).',
    escalation: 'Líder de Virtualización (decisiones de sobresuscripción y balanceo del pool)',
    relatedTerms: ['vSphere', 'Umbral', 'Zabbix'],
    relatedTickets: ['sa-004', 'sa-053']
  },
  {
    id: 'sakb-docker-container-crash',
    title: 'Contenedor Docker en restart loop',
    category: 'SysAdmin - Cloud / Contenedores',
    environment: 'Cloud / Contenedores',
    symptoms: 'Un contenedor aparece en Restarting perpetuo: docker ps lo muestra levantándose y muriendo, el endpoint responde a ratos y el monitoreo alerta inestabilidad. A veces lleva días así, compenso por la política de restart, sin que nadie lo notara.',
    cause: 'La aplicación dentro del contenedor crashea al arrancar (configuración inválida, variable faltante, dependencia no disponible, migración pendiente), un healthcheck demasiado estricto que mata contenedores sanos, o OOM kill por límite de memoria por debajo del pico del proceso.',
    steps: [
      {
        title: 'Ver el ciclo real del contenedor',
        detail: 'docker ps -a muestra el estado (Restarting, Exited) y docker inspect el RestartCount acumulado: 40 reinicios en dos horas confirma el loop. Con restart policy activa, el contenedor "parece vivo" en las herramientas pero el servicio está caído.',
        command: 'docker ps -a --filter name=api'
      },
      {
        title: 'Leer los logs del contenedor',
        detail: 'docker logs entrega el stdout/stderr de la aplicación: el error exacto del arranque fallido (excepción, variable de entorno faltante, conexión rechazada). Empezar por aquí ahorra horas: la app casi siempre dice por qué muere.',
        command: 'docker logs --tail 100 api'
      },
      {
        title: 'Identificar el código de salida',
        detail: 'docker inspect con el formato de estado muestra ExitCode y OOMKilled. Exit 137 (o OOMKilled true) es kill por memoria: el límite está por debajo del pico. Exit 1 es error de aplicación; 125/126/127 son problemas de runtime, comando o permisos. Cada código es un camino distinto.',
        command: 'docker inspect --format "{{.State.ExitCode}} {{.State.OOMKilled}}" api'
      },
      {
        title: 'Corregir la causa raíz',
        detail: 'Según lo hallado: la configuración (variable o secret faltante), la dependencia (orden de arranque: la API necesita la BD lista: healthcheck con start_period o depends_on con condition), el límite de memoria o el healthcheck mal calibrado (interval, retries, start_period).'
      },
      {
        title: 'Recrear con límites y política correctas',
        detail: 'Recrear el contenedor con límite de memoria acorde al pico real y restart policy razonable: on-failure con max-retries evita el loop infinito de un contenedor condenado, y unless-stopped protege el arranque del host. La política de restart es contención, no cura.',
        command: 'docker run -d --name api --memory 512m --restart unless-stopped nexora/api:2.4'
      },
      {
        title: 'Estabilizar y verificar',
        detail: 'docker stats confirma el consumo dentro del límite con margen, y una ventana de 30-60 minutos de observación con peticiones reales al endpoint valida la estabilidad. El healthcheck debe pasar de starting a healthy y quedarse ahí.',
        command: 'docker stats --no-stream'
      },
      {
        title: 'Llevarlo a método',
        detail: 'Si el despliegue era manual, moverlo a compose o a definición versionada con las lecciones aprendidas (límites, healthcheck, dependencias). El contenedor que solo una persona sabe levantar, con su configuración en la memoria, es infraestructura frágil.'
      }
    ],
    verification: 'El contenedor queda Up (healthy) sin reinicios en la ventana de observación, el endpoint responde de forma estable y el monitoreo no vuelve a alertar.',
    escalation: 'L2 - Aplicaciones (crash por bug de la aplicación o fuga de memoria)',
    relatedTerms: ['Docker', 'Contenedor', 'Kubernetes'],
    relatedTickets: ['sa-008', 'sa-054']
  },
  {
    id: 'sakb-monitor-alert-storm',
    title: 'Tormenta de alertas / umbral mal calibrado',
    category: 'SysAdmin - Monitoreo & Observabilidad',
    environment: 'Multi',
    symptoms: 'El NOC recibe decenas o cientos de alertas por hora: triggers que se disparan y se recuperan solos (flapping), umbrales rozados por los picos periódicos del batch, y alertas sin dueño claro. El ruido entrena al equipo para ignorar el monitoreo, justo cuando llega la alerta buena.',
    cause: 'Umbrales fijados sin conocer el perfil de carga del sistema, triggers sin histéresis (disparo y recuperación en el mismo nivel), alertas por picos de segundos, hosts en mantenimiento sin silenciar, y la misma falla generando 30 alertas de métricas dependientes (eco).',
    steps: [
      {
        title: 'Cuantificar el ruido',
        detail: 'Exportar los problemas de las últimas 2-4 semanas (UI de Zabbix/Grafana o la API con problem.get) y contar: alertas por día, top de triggers disparados y tasa de auto-recuperación en minutos. Sin línea base numérica, cualquier mejora es anécdota y cualquier discusión es opinión.',
        command: 'curl -s -X POST https://zbx.nexora.local/api_jsonrpc.php -H "Content-Type: application/json" -d @cuerpo.json'
      },
      {
        title: 'Identificar los patrones',
        detail: 'Los tres patrones clásicos: flapping (dispara y se recupera en minutos: umbral rozado), pico benigno periódico (batch, backup, antivirus a la misma hora cada noche) y eco (un incidente real que dispara 30 alertas de métricas dependientes). Cada patrón tiene cura distinta y confundirlos empeora todo.'
      },
      {
        title: 'Calibrar umbrales con histéresis y promedios',
        detail: 'Disparar a un nivel pero recuperar a otro (histéresis) mata el flapping, y promediar sobre ventanas de 5-10 minutos en lugar de picos instantáneos filtra el ruido conocido. El umbral bien calibrado dispara antes el problema real y nunca el pico benigno documentado.'
      },
      {
        title: 'Silenciar lo planificado',
        detail: 'Ventanas de mantenimiento para backups, parcheo y cambios programados: silenciar DURANTE la ventana, no después de que suenen las alertas. El silencio programado es parte del cambio (sakb-change-window), no un parche del NOC reaccionando.',
        command: 'curl -s -X POST https://zbx.nexora.local/api_jsonrpc.php -H "Content-Type: application/json" -d @mantenimiento.json'
      },
      {
        title: 'Consolidar y correlacionar',
        detail: 'Una dependencia caída (host, router, hypervisor) debe generar UNA alerta raíz, no 30 síntomas: usar dependencias de hosts y triggers dependientes. El NOC debe ver el incidente, no su eco multiplicado por cada métrica que dependía del caído.'
      },
      {
        title: 'Hacer cada alerta accionable',
        detail: 'Revisión trigger por trigger: cada alerta activa debe tener dueño (equipo o persona), significado claro y acción definida (runbook o artículo de KB enlazado). La alerta que nadie sabe atender es candidata a corregirse o borrarse: ruido con apariencia de control.'
      },
      {
        title: 'Medir la mejora',
        detail: 'Después de la calibración, volver a medir con el mismo método: alertas por día y tasa de auto-recuperación. El objetivo no es "menos alertas": es que cada alerta restante merezca la interrupción de alguien. Publicar el antes/después al equipo.'
      }
    ],
    verification: 'La tasa de alertas cae de forma medible (por ejemplo más de 50%) manteniendo o mejorando el tiempo de detección de incidentes reales, y ninguna alerta queda sin dueño asignado.',
    escalation: 'NOC / Líder de Monitoreo (cambios globales en plantillas de triggers)',
    relatedTerms: ['Zabbix', 'Grafana', 'Umbral', 'Prometheus'],
    relatedTickets: ['sa-001', 'sa-055']
  },
  {
    id: 'sakb-capacity-trend',
    title: 'Tendencia de capacidad: proyección y umbrales',
    category: 'SysAdmin - Monitoreo & Observabilidad',
    environment: 'Multi',
    symptoms: 'La pregunta de dirección después del incidente resuelto: ¿cuándo nos quedamos sin espacio, CPU o ancho de banda? Convertir la historia de métricas en una proyección con fecha, umbrales escalonados y un plan de acción: eso es gestión de capacidad, no bomberos.',
    cause: 'No es un fallo: la capacidad sin gestión formal siempre termina en incidente. El patrón clásico es alertar solo al 90% (cuando ya es urgente y la ampliación no llega a tiempo) en lugar de gestionar desde el 70%, cuando aún hay semanas de margen para decidir.',
    steps: [
      {
        title: 'Exportar la historia de la métrica',
        detail: 'Exportar 6-12 meses de la métrica (disco, datastore, CPU, ancho de banda) desde Zabbix, Grafana o Prometheus. Con menos de tres meses de historia la proyección es adivinanza: los saltos puntuales (proyectos, retenciones nuevas) no aparecen en una serie corta.',
        command: 'zabbix_get -s 10.10.20.15 -k "vfs.fs.size[/,pused]"'
      },
      {
        title: 'Calcular la tasa de crecimiento',
        detail: 'Con la serie, calcular el crecimiento (GB por día o porcentaje mensual) y separar el crecimiento base del lineal de los saltos puntuales (proyecto nuevo, cambio de retención, backup crecido). La tasa promedio de todo mezclado engaña: desagregar antes de proyectar.',
        command: 'zabbix_get -s 10.10.20.15 -k "vfs.fs.size[/datos,pfree]"'
      },
      {
        title: 'Proyectar la fecha de llenado',
        detail: 'La línea de tendencia contra el techo del recurso da la fecha estimada. Calcular dos escenarios: crecimiento base y el peor trimestre observado. Y proyectar hacia el umbral (80-90%), no hacia el 100%: el incidente empieza cuando se activa el umbral, no cuando se llena del todo.'
      },
      {
        title: 'Definir umbrales escalonados',
        detail: '70%: revisión y planificación (ticket de capacidad, no incidente). 80%: acción (limpiar o ampliar). 90%: riesgo inminente con cambio urgente. El 70% es donde la gestión de capacidad gana; el 90% es el bombero llegando tarde al fuego previsto.'
      },
      {
        title: 'Decidir la respuesta',
        detail: 'Con la proyección sobre la mesa: ¿alcanza con higiene (rotación de logs, snapshots, archivos viejos, sakb-disk-full)? ¿o es crecimiento estructural que requiere ampliar (sakb-lvm-extend, datastore, licencias)? Documentar la decisión, su costo y su fecha en el informe.',
        command: 'lvextend -r -L +50G /dev/vg-app/lv_datos'
      },
      {
        title: 'Documentar y revisar periódicamente',
        detail: 'El informe de capacidad: métrica, historia, tasa, proyección, umbrales, decisión y fecha de próxima revisión. Revisión trimestral o al cambiar la carga (proyecto nuevo, migración). Una proyección sin fecha de revisión caduca en silencio y miente.'
      }
    ],
    verification: 'Los umbrales escalonados quedan configurados en el monitoreo, el informe existe con proyección, decisión y dueño, y la primera alerta del 70% llega con semanas de margen, no con horas.',
    escalation: 'Líder de Infra & Ops / Gerencia IT (aprobación de inversión en capacidad)',
    relatedTerms: ['Umbral', 'Prometheus', 'Datastore'],
    relatedTickets: ['sa-026', 'sa-056']
  },
  {
    id: 'sakb-change-window',
    title: 'Gestión de un cambio: plan, ventana y rollback',
    category: 'SysAdmin - Automatización',
    environment: 'Multi',
    symptoms: 'Un cambio de infraestructura (migración, upgrade, regla de red, parcheo mayor, ampliación) necesita ejecutarse con riesgo controlado: plan aprobado, ventana definida, rollback listo y verificación post-cambio. Sin ese marco, cada cambio es una apuesta con producción en la mesa.',
    cause: 'No es un fallo sino el proceso que evita incidentes por cambio: la mayoría de los incidentes graves de infraestructura nacen de cambios sin plan, sin rollback o con verificación incompleta. El marco existe para convertir el riesgo en un valor conocido y gestionado.',
    steps: [
      {
        title: 'Registrar el RFC',
        detail: 'Registrar el cambio ANTES de ejecutar: qué se hace, por qué, sistemas afectados, riesgo e impacto si falla, duración estimada, plan paso a paso y plan de rollback. El RFC escrito antes es la diferencia entre un cambio y una improvisación documentada.'
      },
      {
        title: 'Clasificar y aprobar',
        detail: 'Clasificar el riesgo (estándar, normal, emergencia) y llevarlo al nivel de aprobación que toque: CAB para los normales, flujo de emergencia para los urgentes con aprobación posterior formalizada. Los cambios estándar pre-aprobados liberan al CAB de lo repetitivo.'
      },
      {
        title: 'Preparar el punto de retorno',
        detail: 'Backup verificado, snapshot del hipervisor, export de la configuración actual o credenciales a la mano, según el cambio. Verificado significa probado que se puede restaurar, no "supongo que el de anoche sirve": el momento del incidente es tarde para descubrir que no.',
        command: 'qm snapshot 101 pre-cambio'
      },
      {
        title: 'Comunicar y ejecutar en ventana',
        detail: 'Avisar a afectados y NOC, y ejecutar dentro de la ventana aprobada con el checklist paso a paso, anotando tiempos reales. Si la ventana se desborda, la decisión es criterio, no heroísmo: activar rollback en lugar de estirarla "un poquito más".'
      },
      {
        title: 'Verificar post-cambio',
        detail: 'Checklist de verificación: servicios activos, healthchecks, métricas normales en monitoreo y una prueba de negocio (login, transacción de prueba). La verificación es parte del cambio, no un extra: sin ella el cambio nunca termina de cerrarse.',
        command: 'systemctl is-active nginx && curl -s -o /dev/null -w "%{http_code}" http://intranet.nexora.local'
      },
      {
        title: 'Ejecutar rollback si toca',
        detail: 'El rollback es decisión de criterio, no de orgullo: verificación fallida sin causa clara y rápido de corregir = volver al estado anterior. Se ejecuta con la misma disciplina que el cambio (ventana, checklist, comunicación) y queda documentado como resultado válido del cambio.',
        command: 'qm rollback 101 pre-cambio'
      },
      {
        title: 'Cerrar con revisión',
        detail: 'Cierre del RFC con resultado, tiempos, desviaciones y lecciones (qué se haría distinto). Los cambios problemáticos alimentan la checklist del siguiente: así mejora el proceso y no solo la cicatriz del equipo.'
      }
    ],
    verification: 'El cambio queda cerrado con resultado exitoso (o rollback documentado), la verificación adjunta como evidencia y el RFC completo en el sistema de cambios con sus tiempos reales.',
    escalation: 'CAB / Líder de Infra & Ops (excepciones de ventana y cambios emergencia)',
    relatedTerms: ['Ventana de mantenimiento', 'Rollback', 'SRE'],
    relatedTickets: ['sa-018', 'sa-027', 'sa-044']
  },
  {
    id: 'sakb-postmortem',
    title: 'Postmortem de incidente sin culpa',
    category: 'SysAdmin - Monitoreo & Observabilidad',
    environment: 'Multi',
    symptoms: 'Tras un incidente mayor resuelto queda pendiente el aprendizaje: entender la causa raíz, los factores que contribuyeron, los tiempos de detección y recuperación, y convertirlo en acciones que eviten repetirlo o al menos detectarlo antes. Sin postmortem, el mismo incidente cobra la cuota de nuevo.',
    cause: 'No es un fallo sino la práctica SRE del blameless postmortem. El supuesto de trabajo: la gente actúa con la información que tiene y los sistemas fallan por diseño, no por culpables. Buscar culpables garantiza que la próxima vez nadie reporte a tiempo: el silencio se vuelve el riesgo mayor.',
    steps: [
      {
        title: 'Convocar pronto y fijar los hechos',
        detail: 'Convocar a los involucrados (ops, aplicaciones, NOC) en días, no meses, mientras la memoria y los logs están frescos. Construir la línea de tiempo con evidencia: alertas, tickets, logs, decisiones y horas. Sin línea de tiempo acordada, cada uno discute su versión del incidente.',
        command: 'journalctl --since "2026-01-14 03:00" --until "2026-01-14 06:00" --no-pager > postmortem-timeline.txt'
      },
      {
        title: 'Medir impacto y tiempos',
        detail: 'Impacto (usuarios, servicios, SLA), tiempo de detección (MTTD) y de recuperación (MTTR), y las fases: qué detectó primero al usuario y qué detectó primero el monitoreo. Estos números marcan qué mejorar primero: detectar antes suele ser más barato que arreglar más rápido.'
      },
      {
        title: 'Buscar la causa raíz con 5 whys',
        detail: 'Preguntar "¿por qué?" hasta llegar a un nivel sistémico (proceso, herramienta, automatización), no a una persona. "Porque alguien se equivocó" no es causa raíz; "porque el proceso permite cambiar producción sin checklist" sí lo es, y tiene arreglo.'
      },
      {
        title: 'Listar los factores contributivos sin culpa',
        detail: 'Todo lo que hizo el incidente más lento o más grande: alerta que no sonó, dependencia oculta, documentación vieja, ventana con poca gente, escalado tardío. Se listan sin nombres: el objetivo es el sistema, no las personas: la cultura que castiga el reporte consigue que el próximo incidente sea una sorpresa.',
        command: 'last -n 50 | head -20'
      },
      {
        title: 'Definir acciones correctivas con dueño y fecha',
        detail: 'Acciones concretas (umbral recalibrado, runbook nuevo, automatización del paso manual, alerta de detección temprana), cada una con dueño y fecha. Sin dueño y fecha, la lista de acciones es una lista de deseos que se archiva junto al incidente.'
      },
      {
        title: 'Publicar y difundir',
        detail: 'Documento de postmortem accesible para el equipo y los interesados, con la lección principal resumida arriba. La difusión multiplica el aprendizaje: el incidente que sufrió un equipo, prevenido o detectado antes por todos.'
      },
      {
        title: 'Hacer seguimiento de las acciones',
        detail: 'Revisar en las semanas siguientes el estado de cada acción correctiva. El postmortem termina cuando sus acciones están hechas, no cuando el documento queda bonito: una acción vencida sin replanificación es el germen del próximo postmortem.'
      }
    ],
    verification: 'El documento existe con línea de tiempo, causa raíz, factores contributivos y acciones con dueño y fecha, y la revisión de seguimiento encuentra las acciones completadas o replanificadas con justificación.',
    escalation: 'Líder de Infra & Ops / SRE (acciones que requieren inversión o cambios de proceso)',
    relatedTerms: ['Postmortem', 'SRE', 'NOC'],
    relatedTickets: ['sa-026', 'sa-027', 'sa-056']
  }
];

/** Índice id → artículo (para resolver kbRef de tickets sin buscar). */
export const SYSADMIN_KB_BY_ID: Map<string, SysAdminKbArticle> = new Map(
  SYSADMIN_KB_ARTICLES.map((a) => [a.id, a])
);
