/**
 * sysadminLabsData — LAB TEMPLATES de la especialización SysAdmin.
 *
 * Labs guiados que se siembran como plantillas en la tabla `labs` EXISTENTE
 * (misma arquitectura que los labs HelpDesk). Seeding aditivo por id +
 * dismissal. Los labs son SIMULADOS: los comandos son material de estudio,
 * nunca se ejecutan contra sistemas reales. Compañía ficticia Nexora S.A.,
 * equipo Infra & Ops.
 */
import type { Lab } from '../types';

/** Campos que el seeder completa (estado de trabajo del usuario). */
export type SysAdminLabSeed = Omit<
  Lab,
  'status' | 'isFavorite' | 'isDeleted' | 'deletedAt' | 'createdAt' | 'updatedAt'
>;

export const SYSADMIN_LAB_SEEDS: SysAdminLabSeed[] = [
  {
    id: 'labsa-guardia-linux-diagnostico',
    title: 'Lab: Diagnóstico integral de un servidor Linux (servicio caído + disco)',
    organization: 'Nexora S.A. (simulado)',
    topic: 'SysAdmin - Linux / Unix',
    categories: ['SysAdmin - Linux / Unix', 'SysAdmin - Monitoreo & Observabilidad'],
    subtopic: 'Guardia — servicio caído y disco lleno',
    difficulty: 'Media',
    timeSpent: '',
    sourceLink: '',
    parts: [
      {
        id: 'labsa-gld-p1',
        title: '1. Recibir la guardia y acotar el reporte',
        content:
          'Eres el sysadmin de guardia en Nexora S.A. A las 07:10 el NOC te pasa la mano: srv-app-01 con el servicio app-nexora caído y alerta de disco al 93%. Antes de conectarte responde en tus notas: ¿qué afecta al usuario (el servicio, el disco, o ambos)? ¿hubo ventana de cambio anoche (la respuesta casi siempre está ahí)? ¿qué revisarías primero? Regla del lab: incidente con cambio reciente = el cambio es el sospechoso número uno. Anota tu hipótesis inicial ANTES de avanzar: al final del lab la contrastarás contra lo que encontraste.',
        isCompleted: false,
      },
      {
        id: 'labsa-gld-p2',
        title: '2. Diagnóstico del servicio con systemd',
        content:
          'Entra al servidor y lee el estado: "systemctl status app-nexora". Apunta si está failed, inactive o activating, el exit code que reporta y las últimas líneas que muestra. Luego profundiza: "journalctl -u app-nexora -n 50 --no-pager". El lab pregunta: ¿qué diferencia hay entre failed e inactive, y qué te sugiere un exit code 137 frente a un 1? Escribe qué buscarías en el journal: el PRIMER error del arranque fallido, no el último reintento (los reintentos son eco, no causa).',
        isCompleted: false,
      },
      {
        id: 'labsa-gld-p3',
        title: '3. Conectar los síntomas: formular la hipótesis',
        content:
          'El journal muestra líneas de error al abrir un archivo de datos: "No space left on device". Conecta: dos alertas (servicio caído y disco al 93%) con una sola causa. El lab pide: antes de limpiar nada, ¿cómo confirmas la hipótesis del disco? ¿Qué comando te dice QUÉ filesystem está lleno y cuánto queda? Documenta el razonamiento causa → síntoma → verificación: esa estructura es la que conviene a cualquier ticket de guardia y es la que revisará tu líder.',
        isCompleted: false,
      },
      {
        id: 'labsa-gld-p4',
        title: '4. Diagnóstico del disco: df, inodos y du',
        content:
          'Confirma con "df -h" (partición llena y punto de montaje) y descarta el agotamiento de inodos con "df -i": espacio libre en bloques pero IUse% al 100% cambia todo el diagnóstico. Después localiza al culpable: "du -xh --max-depth=2 /var | sort -rh | head -20" y baja de nivel hasta el directorio exacto. Pregunta del lab: ¿por qué la opción -x importa en un servidor con varios filesystems? ¿Qué encontraste (log de la app sin rotación, /var/log crecido, caché)? Documenta la ruta exacta y su tamaño.',
        isCompleted: false,
      },
      {
        id: 'labsa-gld-p5',
        title: '5. Espacio retenido y limpieza segura',
        content:
          'Verifica archivos borrados pero retenidos con "lsof +L1": si el proceso de la app o el rsyslog retienen un log gigante ya borrado, el espacio no vuelve hasta reiniciar el proceso o truncarlo en vivo. Decide y documenta tu limpieza: forzar rotación ("logrotate -f"), truncar el archivo vivo o borrar respaldos locales viejos. Regla de oro del lab: nunca borrar dentro de /var/lib sin saber qué es, jamás un borrado recursivo a ciegas en producción, y toda limpieza queda registrada en el ticket. Escribe qué harías y en qué orden.',
        isCompleted: false,
      },
      {
        id: 'labsa-gld-p6',
        title: '6. Restaurar el servicio y verificar',
        content:
          'Con espacio liberado: "systemctl start app-nexora", confirmar con "systemctl is-active app-nexora" y probar el endpoint real (curl desde tu equipo o el healthcheck del monitoreo). Verifica con "df -h" que quedó margen (mínimo 20%) y que la alerta de Zabbix pasa a resuelta. El lab pregunta: ¿por qué NO basta con que el servicio esté activo para cerrar el ticket? ¿Qué evidencia adjuntarías al cierre (journal con la causa, df antes y después, causa raíz)?',
        isCompleted: false,
      },
      {
        id: 'labsa-gld-p7',
        title: '7. Documentar el ticket de guardia',
        content:
          'Cierra como cerrarías el ticket sa-029 (simulado): hora de inicio y fin, síntoma reportado por el NOC, diagnóstico, causa raíz (log de la aplicación sin rotación que llenó el disco y tumbó el servicio), fix aplicado y acciones preventivas (rotación configurada con tope, umbral de alerta al 80%, revisar los demás servidores con el mismo patrón). Redacta el cierre en 5-8 líneas: un colega que lea tu nota mañana debe poder actuar sin preguntarte nada. Termina contrastando: ¿coincidió la causa con tu hipótesis del paso 1?',
        isCompleted: false,
      },
    ],
    tools: ['Linux CLI', 'systemd', 'journalctl'],
    commands: [
      'systemctl status app-nexora',
      'journalctl -u app-nexora -n 50 --no-pager',
      'df -h && df -i',
      'du -xh --max-depth=2 /var | sort -rh | head -20',
      'lsof +L1',
    ],
    findings: '',
    mitigation: '',
  },
  {
    id: 'labsa-lvm-raid-extend',
    title: 'Lab: Extender almacenamiento: LVM + filesystem bajo presión',
    organization: 'Nexora S.A. (simulado)',
    topic: 'SysAdmin - Storage & Backup',
    categories: ['SysAdmin - Storage & Backup', 'SysAdmin - Linux / Unix'],
    subtopic: 'LVM — extensión de filesystem en producción',
    difficulty: 'Difícil',
    timeSpent: '',
    sourceLink: '',
    parts: [
      {
        id: 'labsa-lvm-p1',
        title: '1. Leer el stack de almacenamiento',
        content:
          'La alerta llegó: srv-bd-prod con /datos al 88% y creciendo 2% por semana. Antes de tocar nada, lee el mapa completo: "df -h /datos" (filesystem, tamaño y punto de montaje), "pvs" (physical volumes), "vgs" (volume groups y su VFree) y "lvs" (logical volumes). Dibuja en tus notas el stack disco → PV → VG → LV → filesystem y responde: ¿hay espacio libre en el VG para extender sin pedir disco nuevo? Ese dato define toda la estrategia.',
        isCompleted: false,
      },
      {
        id: 'labsa-lvm-p2',
        title: '2. Decidir la estrategia',
        content:
          'Dos caminos: extender con el VFree existente o pedir almacenamiento nuevo (al equipo de virtualización: ampliar el disco virtual de la VM; o al de storage: LUN nueva). El lab pide argumentar la elección: ¿cuánta holgura compras con cada opción y cuánto dura? ¿quién aprueba asignar almacenamiento nuevo y con qué evidencia (la proyección del paso 1)? Regla: si el VG no tiene VFree, NO se recorta espacio de otro LV con datos vivos fuera de una ventana de cambio formal.',
        isCompleted: false,
      },
      {
        id: 'labsa-lvm-p3',
        title: '3. Preparar el disco nuevo',
        content:
          'El hipervisor asignó /dev/sdb de 100 GB a la VM. Verifica que el dispositivo es el correcto con "lsblk" (tamaño y serial: regla de supervivencia, porque pvcreate sobre el disco equivocado destruye datos sin pedir confirmación) e inicialízalo con "pvcreate /dev/sdb". Luego "vgextend vg-app /dev/sdb" y confirma con "vgs" que el VFree subió. El lab pregunta: ¿cómo harías el doble chequeo en un servidor con 6 discos (comparar tamaño, serial y punto de montaje)?',
        isCompleted: false,
      },
      {
        id: 'labsa-lvm-p4',
        title: '4. Extender LV + filesystem en un paso',
        content:
          'El comando del profesional: "lvextend -r -L +50G /dev/vg-app/lv_datos". La opción -r redimensiona el filesystem en la misma operación, en línea y sin desmontar (ext4 y XFS lo soportan). El error clásico que -r evita: extender el LV y olvidar el filesystem (df sigue igual y alguien repite el lvextend duplicando la ampliación). El lab pide: ¿qué hace -r por debajo en ext4 y en XFS? ¿cuál de los dos filesystems se puede ENCERRAR con resize2fs y cuál nunca se encoge? Documenta la respuesta y por qué importa para el riesgo del cambio.',
        isCompleted: false,
      },
      {
        id: 'labsa-lvm-p5',
        title: '5. La alternativa manual (y sus riesgos)',
        content:
          'Si el -r no se usó, el filesystem se crece aparte: "resize2fs /dev/vg-app/lv_datos" para ext4 o "xfs_growfs /datos" para XFS montado (con su punto de montaje, no el dispositivo). El lab pide documentar los riesgos de cada paso: ¿qué pasa si ejecutas resize2fs sobre un XFS? ¿por qué XFS solo crece montado y qué implica para un desmonte en producción? Y el anti-patrón definitivo: ¿por qué lvreduce es la operación más peligrosa del kit LVM y qué exige hacer ANTES de siquiera considerarla (backup verificado y reducción del filesystem primero)?',
        isCompleted: false,
      },
      {
        id: 'labsa-lvm-p6',
        title: '6. Verificación y evidencia',
        content:
          'Verifica el resultado: "df -h /datos" (nuevo tamaño y margen), "lvs" (LV crecido a tamaño coherente), una prueba de escritura real del servicio de base de datos y el monitoreo reflejando el nuevo porcentaje. El lab pide: ¿qué evidencia va al ticket de cambio (salidas antes y después, disco añadido con su serial, secuencia ejecutada)? ¿por qué fstab NO se toca en esta operación (el punto de montaje y el LV siguen siendo los mismos)?',
        isCompleted: false,
      },
      {
        id: 'labsa-lvm-p7',
        title: '7. Prevenir: la tendencia no se fue',
        content:
          'Cerrar extendiendo es tratar el síntoma del mes. El lab termina con la preventiva: ¿cómo configuras la alerta escalonada (70/80/90) sobre /datos con la nueva capacidad? Con la tasa de 2% semanal, calcula la fecha en que volvería al umbral y escríbela. ¿Qué alternativa habría si el crecimiento es de datos que no se pueden borrar (retención de base de datos)? Deja la proyección escrita con fecha: es tu argumento objetivo para el próximo ciclo de capacidad y para que no te agarre el mismo incidente en versión mayor.',
        isCompleted: false,
      },
    ],
    tools: ['Linux CLI', 'LVM', 'Filesystems ext4/XFS'],
    commands: [
      'df -h /datos',
      'pvs && vgs && lvs',
      'pvcreate /dev/sdb',
      'vgextend vg-app /dev/sdb',
      'lvextend -r -L +50G /dev/vg-app/lv_datos',
      'resize2fs /dev/vg-app/lv_datos',
    ],
    findings: '',
    mitigation: '',
  },
  {
    id: 'labsa-backup-restore-321',
    title: 'Lab: Verificar un backup de verdad: restore de prueba 3-2-1',
    organization: 'Nexora S.A. (simulado)',
    topic: 'SysAdmin - Storage & Backup',
    categories: ['SysAdmin - Storage & Backup', 'SysAdmin - Automatización'],
    subtopic: 'Restore de prueba — RPO y RTO reales',
    difficulty: 'Media',
    timeSpent: '',
    sourceLink: '',
    parts: [
      {
        id: 'labsa-rst-p1',
        title: '1. Leer la política y el inventario de backups',
        content:
          'Política de Nexora: Regla 3-2-1 (3 copias, 2 medios distintos, 1 fuera de sitio) con RPO objetivo de 24 horas y RTO objetivo de 4 horas para los servidores de archivo. El lab empieza leyendo el inventario simulado: ¿qué jobs existen, hacia dónde copian cada uno y cuándo fue su último resultado exitoso? Responde: ¿qué copias son restaurables en papel y cuándo se probó la última vez? Spoiler del oficio: si la respuesta a lo segundo es "nunca", tu backup es una hipótesis, no un respaldo.',
        isCompleted: false,
      },
      {
        id: 'labsa-rst-p2',
        title: '2. Diseñar la prueba de restauración',
        content:
          'Diseña el restore de prueba: qué se restaura (un archivo concreto, el directorio de un servicio o un servidor completo), desde qué copia y con qué criterio de éxito. Reglas del lab: restaurar siempre a un destino aislado (jamás sobre los datos vivos), registrar hora de inicio y fin (ese tiempo es tu RTO medido), y definir ANTES cómo se comparará el resultado (checksums o diff recursivo). Escribe el diseño como si fuera el plan de un cambio: es exactamente su nivel de seriedad.',
        isCompleted: false,
      },
      {
        id: 'labsa-rst-p3',
        title: '3. Preparar el entorno aislado',
        content:
          'Levanta el destino del restore en el entorno de labs (VM o directorio fuera de la red de producción). Revisa lo que necesitarías si el restore fuera total: la herramienta en la misma versión del servidor de backup, las credenciales o llaves del repositorio (¿dónde están guardadas y quién las tiene?) y espacio suficiente. El lab pregunta: ¿qué pasa en un desastre real si las llaves del backup están guardadas... en el servidor que se perdió? ¿cómo se resuelve (llave fuera de sitio, bóveda de secretos)?',
        isCompleted: false,
      },
      {
        id: 'labsa-rst-p4',
        title: '4. Ejecutar el restore y cronometrarlo',
        content:
          'Ejecuta la restauración educativa: "restic restore latest --target /srv/restore-test" (o el equivalente del inventario simulado: "tar -xzf respaldo.tar.gz -C /srv/restore-test"). Cronometra desde el inicio hasta el fin: tienes el RTO parcial real (solo datos, sin reconstruir el servidor). Anota duración, tamaño restaurado y TODA advertencia de la herramienta: permisos saltados, archivos excluidos, degradación. Las advertencias de hoy son las sorpresas del desastre de mañana.',
        isCompleted: false,
      },
      {
        id: 'labsa-rst-p5',
        title: '5. Verificar integridad y contenido',
        content:
          'La prueba no es "terminó sin error": es "los datos son los correctos". Compara checksums ("sha256sum" del original de la misma fecha contra el restaurado) o árboles completos ("diff -r /srv/origen /srv/restore-test"). Revisa los metadatos que el servicio necesita: permisos, owner y fechas. Pregunta del lab: ¿qué datos pueden pasar una comparación de tamaños y aun estar rotos (una base de datos inconsistente, un log cortado a medias)? ¿cuándo haría falta un restore adicional consistente (base de datos en frío o desde snapshot)?',
        isCompleted: false,
      },
      {
        id: 'labsa-rst-p6',
        title: '6. Medir RPO y RTO contra los objetivos',
        content:
          'Cierra con números: ¿qué tan frescos eran realmente los datos restaurados (RPO medido: antigüedad de la última copia buena contra la política de 24 horas)? ¿cuánto tardó el restore (RTO parcial contra el objetivo de 4 horas)? Si el RTO medido excede el objetivo, anota la causa dominante (ancho de banda, repositorio lento, proceso manual). El lab pide: ¿qué decisión tomarías si el RPO real resulta de 48 horas con política de 24? ¿a quién se le presenta y con qué evidencia?',
        isCompleted: false,
      },
      {
        id: 'labsa-rst-p7',
        title: '7. Documentar la evidencia y agendar la próxima',
        content:
          'Redacta el reporte de la prueba: qué se restauró, desde qué copia, tiempos, verificación realizada, hallazgos (llaves, permisos, versiones) y acciones correctivas con dueño. Ese documento es la evidencia auditable de recuperabilidad y tu respuesta cuando dirección pregunte "¿y si perdemos el servidor?". Agenda la próxima prueba (trimestral en Nexora) y qué la dispararía antes de fecha: cambio de herramienta, de repositorio, de versión o de volumen de datos.',
        isCompleted: false,
      },
    ],
    tools: ['Herramienta de backup', 'Linux CLI'],
    commands: [
      'restic snapshots',
      'restic restore latest --target /srv/restore-test',
      'sha256sum datos.csv',
      'diff -r /srv/origen /srv/restore-test',
      'tar -tzf respaldo.tar.gz | head -20',
    ],
    findings: '',
    mitigation: '',
  },
  {
    id: 'labsa-cambio-parches',
    title: 'Lab: Ventana de cambio: parcheo de Windows/Linux con plan y rollback',
    organization: 'Nexora S.A. (simulado)',
    topic: 'SysAdmin - Automatización',
    categories: ['SysAdmin - Automatización', 'SysAdmin - Windows Server', 'SysAdmin - Linux / Unix'],
    subtopic: 'Ventana de parcheo — plan, ejecución y rollback',
    difficulty: 'Difícil',
    timeSpent: '',
    sourceLink: '',
    parts: [
      {
        id: 'labsa-par-p1',
        title: '1. El RFC y el checklist del CAB',
        content:
          'Llega la ventana mensual de parcheo. Redacta el RFC: alcance (25 servidores Linux y 10 Windows), riesgo, ventana (viernes 22:00 a 02:00), plan por oleadas y rollback. Construye el checklist del CAB del lab: ¿snapshot o backup verificado por servidor? ¿orden (no productivos, secundarios, críticos)? ¿responsable de ejecución y responsable de verificación? ¿criterio para abortar la ventana? Regla del lab: una ventana sin criterio de aborto no está planificada, está deseada.',
        isCompleted: false,
      },
      {
        id: 'labsa-par-p2',
        title: '2. Preparación por servidor',
        content:
          'Para cada servidor de la ventana: inventario de parches ("apt list --upgradable" en Linux, "Get-HotFix" para lo instalado en Windows), snapshot en el hipervisor ("qm snapshot 101 pre-parche" en Proxmox o su equivalente en vSphere) y confirmación de que el backup nocturno es bueno. El lab pregunta: ¿por qué el snapshot NO sustituye al backup (piensa en retención y en corrupción del datastore)? ¿qué debe pasar con los snapshots al CIERRE de la ventana y qué pasa si se olvidan (snapshots inflados, deltas creciendo)?',
        isCompleted: false,
      },
      {
        id: 'labsa-par-p3',
        title: '3. Staging primero, siempre',
        content:
          'La oleada cero es staging: aplicar el mismo set de parches en 2-3 servidores de pruebas y validar la aplicación ahí. El lab pide argumentar: ¿qué se valida en staging que no se puede validar "rápido en producción" (dependencias de la app, versiones de librerías, reinicio limpio)? ¿qué haces si staging falla: parcheas producción igual y confías, o excluyes el parche problemático y documentas la exclusión con aprobación? Escribe el criterio y quién firma la exclusión.',
        isCompleted: false,
      },
      {
        id: 'labsa-par-p4',
        title: '4. Ejecución: oleada Linux',
        content:
          'Oleada Linux: "apt-get upgrade -y" por servidor, reinicio planeado, espera del arranque completo y verificación: "systemctl is-active app-nexora" y revisión del journal post-reinicio. El lab pregunta: ¿por qué se parchea servidor por servidor y no en paralelo a la flota (control del radio de impacto)? ¿cómo automatizarías las oleadas con Ansible (playbook con serial: 1)? Escribe el esqueleto del playbook en tus notas: hosts, become, tareas de parche, tarea de reinicio y tarea de verificación.',
        isCompleted: false,
      },
      {
        id: 'labsa-par-p5',
        title: '5. Ejecución: oleada Windows',
        content:
          'Oleada Windows: instalar los parches aprobados (WSUS o la herramienta de la organización), reiniciar y verificar: servicio clave ("Get-Service NexoraSync"), arranque completo y Event Viewer sin errores nuevos. El lab pregunta: ¿qué verificas distinto en Windows (tiempos de arranque, eventos 7031/7034, GPO que reaplica tras reiniciar)? ¿cómo confirmas que el servidor VOLVIÓ al monitoreo antes de pasar al siguiente de la oleada?',
        isCompleted: false,
      },
      {
        id: 'labsa-par-p6',
        title: '6. Drill de rollback',
        content:
          'Practica el rollback en un servidor de la oleada: en Windows "wusa /uninstall /kb:5034411 /quiet" (o volviendo al snapshot del hipervisor); en Linux, downgrade del paquete o snapshot. El lab pide: ¿cuál es tu criterio para decidir rollback contra seguir depurando a la 01:30 con la ventana acabándose? Escribe el criterio (ejemplo: verificación fallida sin causa clara a 30 minutos del cierre = rollback) y qué implica ejecutarlo: ventana extendida, comunicación a afectados, RFC actualizado con el resultado real.',
        isCompleted: false,
      },
      {
        id: 'labsa-par-p7',
        title: '7. Cierre y lecciones para la próxima ventana',
        content:
          'Cierra la ventana: todos los servidores parcheados o excluidos CON justificación firmada, snapshots eliminados, verificaciones adjuntas por servidor y reporte con tiempos por oleada. El lab termina con la retro: ¿qué oleada fue más lenta y por qué? ¿qué automatizarías para la próxima (Ansible para las oleadas, ventanas de mantenimiento del monitoreo silenciadas durante el parcheo)? ¿qué lección concreta entra al checklist del CAB del mes siguiente? Una ventana que no deja checklist mejorada dejó de aprender.',
        isCompleted: false,
      },
    ],
    tools: ['Linux CLI', 'PowerShell', 'Snapshots de hipervisor'],
    commands: [
      'apt list --upgradable',
      'Get-HotFix',
      'qm snapshot 101 pre-parche',
      'apt-get upgrade -y',
      'wusa /uninstall /kb:5034411 /quiet',
      'systemctl is-active app-nexora',
    ],
    findings: '',
    mitigation: '',
  },
  {
    id: 'labsa-monitor-umbrales',
    title: 'Lab: Calibrar alertas de monitoreo (de tormenta a señal)',
    organization: 'Nexora S.A. (simulado)',
    topic: 'SysAdmin - Monitoreo & Observabilidad',
    categories: ['SysAdmin - Monitoreo & Observabilidad', 'SysAdmin - Linux / Unix'],
    subtopic: 'Calibración de umbrales y alertas accionables',
    difficulty: 'Media',
    timeSpent: '',
    sourceLink: '',
    parts: [
      {
        id: 'labsa-mon-p1',
        title: '1. Cuantificar la tormenta',
        content:
          'El NOC reporta: más de 300 alertas diarias y nadie las mira. Primer paso del lab: cuantificar. Exporta los problemas de las últimas dos semanas (UI de Zabbix/Grafana o la API: "curl -s -X POST https://zbx.nexora.local/api_jsonrpc.php -H \"Content-Type: application/json\" -d @problemas.json" con el cuerpo del problem.get en el archivo) y calcula: alertas por día, top 10 de triggers disparados y qué porcentaje se auto-recuperó en menos de 15 minutos (flapping puro). Sin esta línea base, cualquier mejora es anécdota y cualquier discusión es opinión.',
        isCompleted: false,
      },
      {
        id: 'labsa-mon-p2',
        title: '2. Clasificar el ruido por patrones',
        content:
          'Clasifica el top de triggers en los tres patrones clásicos: flapping (dispara y se recupera en minutos: umbral rozado), pico benigno periódico (batch nocturno, backup o antivirus que sube CPU/IO a la misma hora cada noche) y eco (un incidente real que dispara 30 alertas de métricas dependientes del mismo caído). El lab pide: para cada patrón, escribe la cura: histéresis y promedios para el flapping, umbrales por horario o ventanas de mantenimiento para el pico, y dependencias/correlación para el eco.',
        isCompleted: false,
      },
      {
        id: 'labsa-mon-p3',
        title: '3. Calibrar un trigger con histéresis',
        content:
          'Ejercicio de calibración: el trigger de disco dispara a 85% instantáneo y el filesystem de uno de los servidores "vive" entre 82% y 86% por su workload. Rediseña el trigger: disparo a 90% sostenido 10 minutos con recuperación a 85% (histéresis). Comandos educativos para mirar la realidad del servidor: "zabbix_get -s 10.10.20.15 -k \"vfs.fs.size[/,pused]\"" (uso de disco ahora) y "zabbix_get -s 10.10.20.15 -k \"system.cpu.util[,iowait]\"" (iowait real). El lab pregunta: ¿por qué el promedio móvil reduce el flapping sin retrasar demasiado la detección de un problema real?',
        isCompleted: false,
      },
      {
        id: 'labsa-mon-p4',
        title: '4. Ventanas de mantenimiento: silenciar lo planificado',
        content:
          'Lo planificado no debe alertar: backups, ventanas de parcheo, reinicios acordados. Configura la ventana de mantenimiento del host de parcheo del viernes (en Zabbix: maintenance con recolección de datos activa para que los datos queden y las notificaciones silenciadas). El lab pregunta: ¿qué diferencia hay entre silenciar notificaciones y no recolectar datos (piensa en las gráficas de tendencia)? ¿por qué el mantenimiento del monitoreo debe crearlo el CAMBIO como parte de su plan, y no el NOC reaccionando a las alertas que ya sonaron?',
        isCompleted: false,
      },
      {
        id: 'labsa-mon-p5',
        title: '5. Alertas accionables y con dueño',
        content:
          'Revisión trigger por trigger: cada alerta que quede viva debe tener (a) dueño claro (equipo o persona), (b) significado inequívoco (qué significa y qué NO significa) y (c) acción definida (runbook o artículo de KB enlazado). Audita 5 triggers de tu entorno simulado con ese test. El lab pide: para los que fallen el test, decide y justifica: ¿se corrige el trigger, se documenta la acción o se borra la alerta? Una alerta que no genera acción es ruido con apariencia de control.',
        isCompleted: false,
      },
      {
        id: 'labsa-mon-p6',
        title: '6. Medir la mejora y documentar el antes y después',
        content:
          'Después de calibrar, vuelve a medir con el mismo método del paso 1: alertas por día y tasa de flapping. El objetivo NO es "cero alertas": es que cada alerta restante merezca interrumpir a alguien. Documenta tu tabla antes/después en las conclusiones del lab y responde: ¿qué señal nueva agregarías ahora que el ruido no la tapa (por ejemplo: alerta predictiva de llenado de disco usando la tasa de crecimiento)? Esa es la diferencia entre monitoreo reactivo y observabilidad.',
        isCompleted: false,
      },
    ],
    tools: ['Zabbix', 'Grafana', 'Linux CLI'],
    commands: [
      'zabbix_get -s 10.10.20.15 -k "vfs.fs.size[/,pused]"',
      'zabbix_get -s 10.10.20.15 -k "system.cpu.util[,iowait]"',
      'curl -s -X POST https://zbx.nexora.local/api_jsonrpc.php -H "Content-Type: application/json" -d @problemas.json',
    ],
    findings: '',
    mitigation: '',
  },
];
