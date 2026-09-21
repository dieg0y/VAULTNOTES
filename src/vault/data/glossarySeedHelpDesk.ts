/**
 * glossarySeedHelpDesk — GENERATED FILE (scripts/mergeHelpdeskData.mjs).
 * NO editar a mano: editar los JSON staged y re-ejecutar el merge.
 *
 * 250 términos HelpDesk (dedup aplicado contra los
 * 389 términos existentes: 0 descartados por duplicado).
 * Distribución: HelpDesk - Fundamentos IT: 46 · HelpDesk - Service Desk / ITSM: 49 · HelpDesk - Windows / Endpoint: 50 · HelpDesk - Redes (Networking): 47 · HelpDesk - Microsoft 365: 26 · HelpDesk - AD / Identidad: 14 · HelpDesk - Seguridad para Soporte: 18.
 *
 * Se siembran vía glossarySeed.ts (GLOSSARY_SEED_TERMS) con el mismo
 * mecanismo idempotente del glosario base: dedupe por nombre normalizado
 * (incluidos soft-deleted) + nombres descartados definitivamente.
 */
import { type SeedTerm } from './glossarySeedBase';

export const GLOSSARY_SEED_HELPDESK_TERMS: SeedTerm[] = [
  {
    "id": "seed-hd-cpu",
    "term": "CPU (procesador)",
    "acronym": "CPU",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "El cerebro del equipo: ejecuta las instrucciones de todo el software. Se mide en GHz y núcleos.",
    "longDefinition": "Unidad Central de Proceso: el chip que ejecuta las instrucciones de cada programa. Cuando un usuario dice 'va lento', el Administrador de tareas (uso de CPU) es el primer sitio donde mirar para distinguir si el equipo está saturado de cómputo o de otra cosa. Los núcleos e hilos determinan cuántas tareas pesadas aguanta a la vez, y la temperatura y frecuencia actuales delatan estrangulamiento térmico. Es el componente que más se beneficia de buena ventilación y pasta térmica en buen estado.",
    "example": "Ticket 'el portátil va lentísimo': abres el Administrador de tareas, ves la CPU al 100% por un proceso de antivirus atascado, lo cierras y el equipo responde normal. Cerrado en 5 minutos."
  },
{
    "id": "seed-hd-ram",
    "term": "RAM (memoria)",
    "acronym": "RAM",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Memoria de trabajo temporal: guarda lo que se está usando ahora. Se vacía al apagar.",
    "longDefinition": "Random Access Memory: memoria volátil donde el sistema carga los programas y datos en uso. Más RAM permite más aplicaciones abiertas a la vez sin ralentización; con poca RAM el sistema cae en memoria virtual (disco) y eso se nota mucho. Es una de las ampliaciones más rentables y más pedidas en tickets de lentitud. Un síntoma típico de módulo defectuoso: pantallas azules aleatorias que Memtest86 ayuda a confirmar.",
    "example": "Usuario con 8 GB y 40 pestañas de Chrome abiertas quejándose de lentitud: el uso de memoria está al 95%; amplías a 16 GB y el ticket queda resuelto."
  },
{
    "id": "seed-hd-memoria-virtual-pagefile",
    "term": "Memoria virtual (pagefile)",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Espacio en disco que Windows usa como RAM de emergencia cuando la memoria física se llena.",
    "longDefinition": "Cuando la RAM se agota, Windows mueve a pagefile.sys las páginas de memoria menos usadas. Es mucho más lento que la RAM real: un equipo con poca memoria empieza a golpear el disco sin parar y se siente 'pegado'. Como técnico lo gestionas cuando el pagefile está desactivado o mal dimensionado (errores de 'memoria insuficiente' con RAM libre) o cuando el disco lleno le impide crecer. Ajustarlo bien evita falsos diagnósticos de 'necesito más RAM'.",
    "example": "Error 'memoria virtual insuficiente' en un equipo cuyo pagefile desactivó una 'optimización' previa: lo restauras a gestión automática y el error desaparece."
  },
{
    "id": "seed-hd-rom",
    "term": "ROM",
    "acronym": "ROM",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Memoria de solo lectura: guarda instrucciones fijas y no se borra al apagar el equipo.",
    "longDefinition": "Read-Only Memory: memoria no volátil grabada en fábrica con instrucciones básicas. Hoy casi no existe ROM pura: el BIOS/UEFI y el firmware residen en memorias flash que sí se pueden actualizar, pero el concepto sigue siendo la referencia para explicar la diferencia con la RAM. En soporte te aparece al explicar por qué un equipo 'recuerda' cómo arrancar aunque no tenga sistema operativo instalado. Un CD-ROM de instalación también lleva el nombre del concepto: datos grabados de solo lectura.",
    "example": "Usuario pregunta por qué su equipo nuevo 'no tiene ROM': explicas que el firmware vive en un chip flash de la placa y cumple ese papel, solo que actualizable."
  },
{
    "id": "seed-hd-bios",
    "term": "BIOS",
    "acronym": "BIOS",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Firmware clásico de arranque: comprueba el hardware (POST) y lanza el sistema. Interfaz de texto.",
    "longDefinition": "Basic Input/Output System: el firmware legacy que ejecuta el POST (chequeo de hardware al encender) y decide desde qué dispositivo arrancar. Sigue presente en equipos antiguos del parque, y en soporte lo tocas para cambiar el orden de arranque, activar o desactivar dispositivos y poner contraseñas de arranque. Una BIOS con contraseña perdida o con fecha incorrecta (batería CMOS agotada) es ticket clásico. Es el predecesor directo de UEFI.",
    "example": "Equipo que arranca a 'no bootable device': entras al BIOS con F2, compruebas que el disco aparece, lo pones primero en el boot order y arranca normal."
  },
{
    "id": "seed-hd-uefi",
    "term": "UEFI",
    "acronym": "UEFI",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "El firmware moderno que sustituyó a la BIOS: interfaz gráfica, discos grandes y Secure Boot.",
    "longDefinition": "Unified Extensible Firmware Interface: el firmware moderno, con interfaz gráfica, soporte de discos GPT de más de 2 TB y arranque rápido. Incorpora Secure Boot para bloquear bootloaders sin firmar y es requisito de Windows 11. En soporte lo distingues de la BIOS porque los equipos UEFI arrancan con GPT y un modo distinto: mezclar 'equipo UEFI + USB grabado para BIOS legacy' es la causa número uno de 'el USB booteable no aparece'. Convertir discos de MBR a GPT con mbr2gpt es tarea frecuente en refrescos.",
    "example": "USB de instalación que no sale en el menú de arranque: el equipo es UEFI y el USB se grabó para BIOS legacy; lo regruebas con Rufus en modo GPT/UEFI y ya aparece."
  },
{
    "id": "seed-hd-secure-boot",
    "term": "Secure Boot",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Protección de UEFI que solo permite arrancar cargadores firmados digitalmente: bloquea bootkits.",
    "longDefinition": "Función de UEFI que verifica la firma digital del bootloader antes de ejecutarlo. Evita malware de arranque (bootkits) y es requisito obligatorio para Windows 11. En soporte aparece en dos escenarios: activarlo cuando la comprobación de compatibilidad de Windows 11 lo exige, y desactivarlo temporalmente para arrancar ciertos live USB o herramientas de borrado no firmadas. Siempre se reactiva al terminar, porque desactivarlo permanentemente deja la puerta abierta al arranque de código no verificado.",
    "example": "El upgrade a Windows 11 falla por requisitos: entras al UEFI, activas Secure Boot, reinicias y el PC Health Check lo aprueba."
  },
{
    "id": "seed-hd-firmware",
    "term": "Firmware",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Software grabado en el hardware que gobierna su comportamiento: BIOS, SSD, docks, impresoras.",
    "longDefinition": "Programa residente en el chip de un dispositivo: la placa base, el SSD, el dock o la impresora. Las actualizaciones de firmware corrigen errores graves (SSD que se corrompe, dock que no detecta monitores, batería que no carga) y en soporte suele ser el paso 'ya probaste a actualizar el firmware' antes de declarar hardware roto. Se aplican con las herramientas del fabricante (Dell Command Update, Lenovo Vantage) o descargas específicas. Regla práctica: firmware al día antes de diagnóstico profundo o RMA.",
    "example": "Dock que no saca vídeo a dos monitores: actualizas el firmware del dock desde la web del fabricante y ambos monitores funcionan sin tocar nada más."
  },
{
    "id": "seed-hd-driver-controlador",
    "term": "Driver (controlador)",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Software que traduce entre el sistema operativo y un hardware concreto: sin él, el dispositivo no funciona.",
    "longDefinition": "El driver es el traductor entre el hardware y el sistema operativo. Buena parte de los problemas de 'no reconoce el dispositivo', sonido, WiFi, gráficos o impresora se resuelven reinstalando o actualizando el driver. Orden práctico: Administrador de dispositivos, desinstalar el dispositivo, buscar cambios de hardware y, si persiste, driver oficial del fabricante (evita los genéricos de Windows Update cuando hay problemas). Un driver incorrecto o corrupto es causa clásica de pantallas azules (BSOD).",
    "example": "Portátil sin WiFi tras un upgrade de Windows: el adaptador aparece con triángulo amarillo en el Administrador de dispositivos; instalas el driver oficial del fabricante y el WiFi vuelve."
  },
{
    "id": "seed-hd-periferico",
    "term": "Periférico",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Cualquier dispositivo conectado al equipo: teclado, ratón, monitor, impresora, auriculares.",
    "longDefinition": "Hardware externo (o interno adicional) que añade funciones al núcleo del equipo (CPU, RAM, disco). La mayoría de tickets L1 son periféricos: no imprime, no suena, no detecta el USB. La metodología básica de aislamiento: probar el periférico en otro equipo y probar otro periférico en el mismo puerto; con eso decides si la culpa es del dispositivo, del cable o del puerto. Ese aislamiento resuelve el 80% de los casos sin abrir nada.",
    "example": "'El ratón no funciona': lo pruebas en otro PC (funciona) y pruebas otro ratón en el mismo puerto (falla): el problema es el puerto USB dañado, no el ratón."
  },
{
    "id": "seed-hd-monitor-y-resolucion",
    "term": "Monitor y resolución",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "La resolución es cuántos píxeles dibuja la pantalla (1920x1080); define nitidez, no tamaño físico.",
    "longDefinition": "El monitor es el periférico de salida visual; la resolución es el número de píxeles que muestra (Full HD 1920x1080, 4K 3840x2160). Los tickets típicos que resuelves: imagen borrosa (resolución que no es la nativa en Ajustes de pantalla), imagen recortada o con barras (relación de aspecto incorrecta) y 'se ve todo pequeño' en pantallas 4K, que casi siempre se arregla con el escalado (125%, 150%) en lugar de bajar la resolución. Mantener la resolución nativa y tocar solo el escalado es la buena práctica.",
    "example": "Monitor 4K nuevo con texto diminuto: mantienes la resolución nativa 3840x2160 y subes el escalado a 150% en Ajustes de pantalla; el usuario vuelve a leer con comodidad."
  },
{
    "id": "seed-hd-docking-station",
    "term": "Docking station",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Base que conecta el portátil a monitores, red y periféricos con un solo cable, y lo carga.",
    "longDefinition": "Convierte el portátil en estación de trabajo completa: vídeo múltiple, Ethernet, USB y carga en una sola conexión. Los problemas típicos en soporte: monitores que no se detectan (orden de conexión, driver de gráficos o firmware del dock), red que cae al acoplar, o dock que no carga (fuente insuficiente o no soportada). Distingue los docks específicos del modelo de los universales USB-C/Thunderbolt: cambian los síntomas y la solución. Actualizar firmware del dock es el primer paso casi siempre.",
    "example": "Usuario reporta 'los monitores parpadean con el dock': actualizas el firmware del dock y el driver de gráficos, y le enseñas a conectar primero la corriente del dock y después el portátil."
  },
{
    "id": "seed-hd-usb-tipos-velocidades",
    "term": "USB (tipos y velocidades)",
    "acronym": "USB",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Conexión universal de periféricos: tipos A (clásico) y C (reversible); de 480 Mbps a 40 Gbps.",
    "longDefinition": "Universal Serial Bus: el estándar de conexión de periféricos. El conector tipo A es el rectangular clásico; el tipo C, reversible, domina en portátiles modernos. Las versiones marcan la velocidad: USB 2.0 (480 Mbps), 3.x (5-20 Gbps) y USB4/Thunderbolt (hasta 40 Gbps); los puertos 3.x se distinguen por el color azul o la sigla SS (SuperSpeed). En soporte: un disco o dock 'lento' suele ser cable 2.0 o puerto equivocado, y un puerto tipo C puede ser solo carga, solo datos o todo a la vez, fuente número uno de confusión.",
    "example": "Usuario copia a su disco USB nuevo a 35 MB/s: le cambias el cable negro 2.0 por el azul SS que traía el disco y pasa a 300 MB/s."
  },
{
    "id": "seed-hd-hdmi-displayport",
    "term": "HDMI y DisplayPort",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Los dos estándares de vídeo digital: HDMI (TV, proyectores) y DisplayPort (monitores de PC).",
    "longDefinition": "Ambos llevan vídeo y audio digitales. HDMI es el estándar en TVs y proyectores, con versiones (1.4, 2.0, 2.1) que marcan qué resolución y tasa de refresco aguanta; DisplayPort es habitual en monitores de PC y soporta conectar varios monitores en cadena (MST). En soporte, el 'no hay señal' casi siempre es cable o versión insuficiente para lo pedido, entrada mal seleccionada en el monitor o adaptador pasivo donde hacía falta uno activo. Saber qué versión soporta qué resolución evita comprar cables caros que no arreglan nada.",
    "example": "Monitor 4K que solo muestra 1080p por un adaptador HDMI 1.4: lo conectas por DisplayPort directo y el monitor trabaja a 4K60."
  },
{
    "id": "seed-hd-ssd-vs-hdd",
    "term": "SSD vs HDD",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "SSD: chips sin piezas móviles, 10-30 veces más rápido. HDD: discos magnéticos, baratos por TB.",
    "longDefinition": "El SSD guarda los datos en chips de memoria sin piezas móviles: arranca en segundos y es la diferencia entre un equipo usable y uno lento. El HDD mecánico es barato por terabyte (archivado, copias frías) pero es el cuello de botella clásico de los portátiles antiguos. Cambiar un HDD por un SSD es la mejora más rentable del refresco: da segunda vida al equipo. En soporte, un HDD con clics o ruido metálico es sospecha de fallo físico inminente: SMART y copia de seguridad inmediata.",
    "example": "Portátil de 2016 'imposible de usar': clonas su HDD a un SSD de 500 GB, el arranque baja de 2,5 minutos a 20 segundos y no hace falta comprar equipo nuevo."
  },
{
    "id": "seed-hd-nvme",
    "term": "NVMe",
    "acronym": "NVMe",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "SSD que va directo al bus PCIe: los más rápidos (3.500-7.000 MB/s) y en formato M.2 fino.",
    "longDefinition": "Non-Volatile Memory Express: protocolo de SSD que se conecta por PCIe en lugar de SATA, multiplicando la velocidad. Físicamente son módulos M.2 delgados montados en la placa. Ojo: no todos los M.2 son NVMe (existen M.2 SATA) y no son intercambiables. En soporte, un equipo moderno lento a veces lleva un SATA que el usuario creía NVMe; y al pedir repuestos, verificar el tipo exacto (M.2 NVMe, M.2 SATA o 2,5 pulgadas) evita devoluciones y tickets de ida y vuelta.",
    "example": "Ampliación de disco: abres el equipo y el módulo M.2 tiene las muescas B+M: es SATA, no NVMe; pides el módulo correcto a la primera."
  },
{
    "id": "seed-hd-smart",
    "term": "SMART (salud del disco)",
    "acronym": "SMART",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Telemetría del disco: horas, errores y sectores reasignados. Anticipa fallos antes de que ocurran.",
    "longDefinition": "Self-Monitoring, Analysis and Reporting Technology: el disco reporta métricas como sectores reasignados, errores pendientes y horas de encendido. Se lee con CrystalDiskInfo o las herramientas del fabricante. En soporte es tu criterio objetivo para distinguir 'disco a reemplazar' de 'software corrupto': sectores reasignados creciendo o errores pendientes significan copia de datos ya y apertura de RMA. Un SMART limpio no descarta todo, pero cambia la prioridad del diagnóstico.",
    "example": "Equipo con cuelgues aleatorios: CrystalDiskInfo marca 1.200 sectores reasignados y creciendo; haces backup inmediato y abres el RMA del disco."
  },
{
    "id": "seed-hd-particion",
    "term": "Partición",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "División lógica de un disco: cada partición se ve como una unidad independiente (C:, D:).",
    "longDefinition": "Un disco físico se divide en particiones que el sistema monta como unidades separadas. Windows crea varias por defecto (recuperación, EFI, sistema) y por eso en Gestión de discos se ven más de las que el usuario espera. En soporte las tocas al reinstalar (Gestión de discos o diskpart), al recuperar datos (partición borrada no equivale a datos perdidos) y al explicar por qué 'el disco de 512 GB solo muestra 476 GB': el fabricante cuenta en decimal y hay particiones ocultas. Eliminar la partición de recuperación es el error clásico de 'limpieza'.",
    "example": "Usuario borra la unidad D: para 'ganar espacio' y pierde sus datos: recuperas la partición con TestDisk antes de que algo se escriba encima."
  },
{
    "id": "seed-hd-formateo",
    "term": "Formateo",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Preparar una partición con su sistema de archivos. El formateo rápido no borra los datos, solo el índice.",
    "longDefinition": "Al formatear se crea el sistema de archivos (el índice) de la partición. El formateo rápido de Windows solo reescribe la tabla: los datos siguen en el disco y se pueden recuperar, clave en tickets de 'formateé sin querer'; el formateo completo sí los sobrescribe. En soporte lo aplicas al reimaging y a pendrives corrompidos. Antes de formatear hay que confirmar la copia de seguridad siempre; ante un formateo accidental con datos valiosos, no escribir nada en la unidad y pasar directamente a recuperación.",
    "example": "'Perdí la carpeta tras formatear el USB por error': detienes el uso del pendrive, recuperas con Recuva y devuelves 9 de cada 10 archivos."
  },
{
    "id": "seed-hd-sistema-de-archivos",
    "term": "Sistema de archivos (NTFS / FAT32 / exFAT)",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Cómo el disco organiza los datos: NTFS en Windows, FAT32 universal con límite de 4 GB, exFAT para USB.",
    "longDefinition": "El sistema de archivos define cómo se guardan, indexan y recuperan los datos. NTFS es el nativo de Windows: permisos, cifrado y discos grandes. FAT32 es el más universal entre dispositivos, pero no admite archivos de más de 4 GB. exFAT es el punto medio para pendrives y tarjetas SD grandes. En soporte: 'no puedo copiar la ISO al pendrive' es FAT32 con su límite de 4 GB; y 'el USB no se lee en la TV' es un NTFS en un dispositivo que solo entiende FAT/exFAT. Elegir bien el formato evita tickets de compatibilidad.",
    "example": "Error al copiar una ISO de 5,4 GB a un pendrive FAT32: reformateas el pendrive a exFAT y la copia pasa sin protestar."
  },
{
    "id": "seed-hd-placa-base",
    "term": "Placa base (motherboard)",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "La tarjeta principal que conecta CPU, RAM, discos y periféricos: si falla, no arranca nada.",
    "longDefinition": "El circuito central del equipo: aloja la CPU y la RAM, y conecta discos, alimentación y periféricos. En soporte la reconoces como sospechosa cuando el equipo no enciende, se apaga solo o no arranca habiendo probado ya fuente, RAM y disco en otros equipos. Sus partes útiles para el técnico: la pila CMOS, el botón o jumper de clear CMOS, las ranuras de RAM y los conectores de alimentación. Un fallo de placa en portátil fuera de garantía suele ser condena económica: criterio para proponer refresco en vez de reparación.",
    "example": "Equipo que no enciende probando con otra fuente y otra RAM: diagnóstico de placa base; al estar fuera de garantía se propone el refresco en el mismo ticket."
  },
{
    "id": "seed-hd-fuente-de-poder-psu",
    "term": "Fuente de poder (PSU)",
    "acronym": "PSU",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Convierte la corriente de la red en las tensiones que usa el equipo. Si falla: reinicios y apagados.",
    "longDefinition": "Power Supply Unit: transforma la corriente alterna en la continua de 12V, 5V y 3,3V que consumen los componentes. Síntomas de una PSU degradada: reinicios bajo carga, apagados totales o no encender. En sobremesos se prueba sustituyéndola por otra conocida buena; en portátiles el cargador hace de fuente y es lo primero que se sustituye. Una fuente insuficiente tras añadir una tarjeta gráfica potente es un clásico. Nunca se abre el interior de una PSU: sus condensadores guardan tensión peligrosa incluso desenchufada.",
    "example": "PC que se reinicia al abrir juegos: la fuente de 450W no aguanta la tarjeta gráfica nueva; se sustituye por una de 750W y se cierra el ticket."
  },
{
    "id": "seed-hd-bateria-cmos",
    "term": "Batería CMOS (pila)",
    "acronym": "CMOS",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Pila de la placa que mantiene fecha, hora y ajustes al apagar. Agotada: reloj desconfigurado.",
    "longDefinition": "La pila de botón (CR2032) alimenta la memoria CMOS donde la placa guarda el reloj y los ajustes del firmware. Síntomas de pila agotada: la fecha se resetea a un valor absurdo, la hora queda incorrecta (y eso rompe certificados y logins web) y se pierde el orden de arranque. Es la reparación más barata que existe: dos euros y diez minutos. Tras cambiarla hay que reponer fecha, hora y configuración de arranque antes de devolver el equipo.",
    "example": "Equipo con 'hora incorrecta' que no navega por errores de certificado: cambias la CR2032, ajustas el reloj y la navegación vuelve a funcionar."
  },
{
    "id": "seed-hd-sobrecalentamiento-thermal-throttling",
    "term": "Sobrecalentamiento y estrangulamiento térmico (thermal throttling)",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Al superar la temperatura límite, la CPU se frena sola para protegerse: el equipo 'va a tirones'.",
    "longDefinition": "Los chips reducen su frecuencia al superar cierta temperatura (90-100 grados en CPU) para no dañarse: eso es el throttling. El usuario lo percibe como lentitud, apagados en carga o rendimiento que cae a mitad de una tarea. Las causas son casi siempre las mismas: ventiladores sucios, disipación bloqueada (portátil sobre la cama o el sofá) o pasta térmica seca. El flujo de diagnóstico: comprobar temperaturas con HWMonitor o la herramienta del fabricante, limpiar, y verificar el ventilador. Si sigue recalentando limpio, toca mirar ventilador muerto o disipación mal montada.",
    "example": "Portátil que 'va lento al jugar' desde hace meses: HWMonitor marca 97 grados y el ventilador apenas gira; limpias, cambias la pasta térmica y vuelve a 75 con rendimiento normal."
  },
{
    "id": "seed-hd-limpieza-fisica-ventiladores",
    "term": "Limpieza física y ventiladores",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Mantenimiento básico: retirar el polvo de ventiladores y disipadores. Causa número uno de recalentamiento.",
    "longDefinition": "El polvo tapa disipadores y ventiladores, sube temperaturas y acorta la vida de discos, baterías y placas. La limpieza programada (cada 6-12 meses) con aire comprimido, equipo apagado y desenchufado, es el mantenimiento más rentable que existe. En soporte forma parte del checklist de 'lentitud' y del proceso de reacondicionado de equipos devueltos. Precauciones: ráfagas cortas de aire, sujetar el ventilador para que no gire en falso, y nunca soplar hacia el interior de la fuente en sobremesos.",
    "example": "Ronda preventiva trimestral de limpieza a los 40 equipos del almacén: se evitan tickets de sobrecalentamiento y se alarga la vida útil del parque."
  },
{
    "id": "seed-hd-inalambricos-bluetooth-vs-24ghz",
    "term": "Teclado y ratón inalámbricos (Bluetooth vs 2,4 GHz)",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Dos tecnologías sin cables: Bluetooth (emparejamiento, sin receptor) o dongle USB de 2,4 GHz.",
    "longDefinition": "Los periféricos inalámbricos usan Bluetooth directo o un receptor USB de 2,4 GHz. El dongle suele ser más estable y no depende de la pila de Bluetooth del equipo; Bluetooth libera un puerto USB y sirve para varios dispositivos. Diagnóstico típico del 'no responde': pilas o carga primero, luego reemparejar o cambiar el dongle de puerto, y probar en otro equipo para aislar. Las interferencias en 2,4 GHz (WiFi denso, puertos USB 3.0 con su ruido eléctrico) causan cortes raros: apartar el dongle de los puertos 3.0 es un truco de oro.",
    "example": "'El ratón va a tirones': pilas nuevas no arreglan nada, pero mover el dongle del puerto USB 3.0 pegado al WiFi al puerto frontal sí."
  },
{
    "id": "seed-hd-impresora-laser-vs-tinta",
    "term": "Impresora láser vs inyección de tinta",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Láser: tóner en polvo, rápida y barata por página (oficina). Inyección: tinta líquida, mejor color y fotos.",
    "longDefinition": "La láser fusiona tóner en polvo con calor: rápida, precisa en texto y con el coste por página más bajo; la inyección lanza tinta líquida: mejor calidad fotográfica y precio de compra bajo, pero la tinta se seca si no se usa. La recomendación en soporte depende del volumen: oficina es territorio láser; un despacho que imprime poco con inyección acaba generando tickets recurrentes de cabezales secos e 'imprime con rayas'. Los cartuchos originales frente a compatibles también cambian la tasa de averías.",
    "example": "Pequeña oficina con tres impresoras de tinta atascadas por poco uso: se propone una láser monocromo de red y los tickets de inyección se acaban."
  },
{
    "id": "seed-hd-cola-de-impresion",
    "term": "Cola de impresión (print queue)",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Lista de trabajos esperando su turno en la impresora. Atascada: no imprime nada hasta vaciarla.",
    "longDefinition": "Los trabajos se encolan en orden de llegada (FIFO) hasta que la impresora los procesa. La cola atascada está en el top 3 de tickets de impresión: un solo trabajo en error bloquea a todos los demás. La solución estándar: cancelar todos los documentos de la cola, reiniciar el servicio de impresión y reenviar el trabajo. En impresoras compartidas conviene distinguir la cola local del Windows del cliente de la cola del servidor de impresión: el atasco puede estar en cualquiera de las dos.",
    "example": "'No imprime nada desde ayer': hay 14 trabajos atascados y el primero está en error; vacías la cola, reinicias el Spooler y el usuario imprime en segundos."
  },
{
    "id": "seed-hd-spooler",
    "term": "Spooler (servicio de impresión)",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Servicio de Windows que gestiona la cola de impresión. Caído: los trabajos no salen ni se cancelan.",
    "longDefinition": "Print Spooler es el servicio de Windows que recibe los trabajos, los encola y los envía a la impresora. Si se detiene o se cuelga, no se imprime y la cola deja de responder a cancelaciones. Reiniciarlo (services.msc, o net stop spooler y net start spooler) es LA solución de impresión más usada en soporte. Si falla en cada arranque, sospecha de driver corrupto: se purgan los archivos de C:\\Windows\\System32\\spool\\PRINTERS y se reinstala el driver.",
    "example": "Cola que no se vacía ni reiniciando: net stop spooler, borras los archivos de la carpeta spool, net start spooler; la cola queda limpia y vuelve a imprimir."
  },
{
    "id": "seed-hd-driver-de-impresora",
    "term": "Driver de impresora",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Software que traduce los trabajos al idioma de la impresora: mal instalado, salen rayas o símbolos.",
    "longDefinition": "Traduce el trabajo del sistema al lenguaje de la impresora (PCL, PostScript). Errores típicos: driver genérico que pierde opciones (dúplex, bandeja 2, grapado), driver corrupto que cuelga el Spooler, o driver de 32 bits instalado en un sistema de 64. La reinstalación limpia (eliminar la impresora y quitar el driver del servidor de impresión antes de volver a instalar) resuelve casi todo lo que reiniciar la cola no arregla. En servidores de impresión, estandarizar con drivers universales del fabricante simplifica el parque.",
    "example": "Impresora que saca símbolos raros: desinstalas el driver genérico, instalas el PCL6 oficial del fabricante y el documento sale perfecto."
  },
{
    "id": "seed-hd-cable-ethernet-rj45",
    "term": "Cable Ethernet (RJ45 y categorías)",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Par trenzado con conector RJ45: Cat5e hasta 1 Gbps y Cat6/6a hasta 10 Gbps cubren la oficina.",
    "longDefinition": "El par trenzado con conector RJ45 es el estándar de la red cableada. La categoría marca la velocidad: Cat5e llega a 1 Gbps y Cat6/6a a 10 Gbps en distancias cortas. En soporte, 'la red va lenta' en un solo puesto a veces es negociación a 100 Mbps por un cable dañado o mal crimpado: comprobar la velocidad negociada en el estado del adaptador es un diagnóstico de 30 segundos. Los latiguillos de mala calidad y los crimpados flojos son la causa clásica de caídas intermitentes.",
    "example": "Puesto que 'navega lento': el estado del adaptador muestra 100 Mbps en vez de 1 Gbps; cambias el cable dañado y vuelve a gigabit."
  },
{
    "id": "seed-hd-switch-router-access-point",
    "term": "Switch, router y punto de acceso",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Switch: reparte red cableada. Router: une redes y hace NAT/DHCP. Punto de acceso: crea la WiFi.",
    "longDefinition": "El switch conecta muchos dispositivos en la misma red local por cable; el router une redes distintas (la oficina con Internet) y suele hacer DHCP y NAT; el punto de acceso crea la WiFi sobre esa red. Para el técnico lo importante es el patrón de afectados: un solo usuario sin red cableada apunta a puerto, cable o switch; todos sin red apunta a router o línea; y solo la WiFi mal apunta al AP. Identificar el dispositivo sospechoso por quién está afectado es la lección práctica de red del L1.",
    "example": "Planta 2 sin WiFi pero con red cableada bien: patrón claro de AP caído; compruebas su alimentación PoE desde el switch y lo reinicias."
  },
{
    "id": "seed-hd-punto-de-acceso-wifi",
    "term": "Punto de acceso Wi-Fi (AP)",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Dispositivo que crea la red inalámbrica: define cobertura, banda (2,4/5/6 GHz) y roaming.",
    "longDefinition": "El AP conecta los clientes inalámbricos a la red cableada. Las bandas tienen personalidad: 2,4 GHz atraviesa muros pero es lenta y está saturada; 5 y 6 GHz son rápidas con menor alcance. En soporte, 'la WiFi va mal aquí' suele ser cobertura (el cliente enganchado al AP más lejano) o saturación de canal en 2,4 GHz en edificios densos. Saber distinguir si el problema es del AP, del portátil (driver o tarjeta) o del entorno es el triage inalámbrico básico: probar con otro dispositivo y desde otro punto de la oficina.",
    "example": "Sala de reuniones con cortes de WiFi: el análisis muestra el portátil enganchado al AP del pasillo con 2 barras; se ajusta el roaming y el cliente salta al AP cercano."
  },
{
    "id": "seed-hd-maquina-virtual",
    "term": "Máquina virtual (VM)",
    "acronym": "VM",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Equipo completo emulado en software sobre un host: aislado, con snapshots y desechable.",
    "longDefinition": "Una VM es un ordenador dentro de otro: el hipervisor (Hyper-V, VirtualBox, VMware) reparte CPU, RAM y disco del equipo anfitrión. En soporte se usan para probar software arriesgado sin tocar el equipo real, reproducir entornos de usuario y ejecutar herramientas de diagnóstico en cuarentena. Aíslan el problema: si en la VM funciona y en el equipo físico no, la culpa es del entorno base. Cuidado con las licencias y el rendimiento, porque la VM compite con el host por los recursos.",
    "example": "Antes de desplegar un software dudoso a 200 usuarios, lo pruebas en una VM Hyper-V con snapshot: falla, reviertes y nadie más se entera."
  },
{
    "id": "seed-hd-virtualizacion-hyper-v",
    "term": "Virtualización (Hyper-V)",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Tecnología que ejecuta varias máquinas sobre un mismo hardware: el hipervisor reparte recursos.",
    "longDefinition": "El hipervisor crea y gestiona VMs sobre el hardware físico; Hyper-V es el de Windows, activable como característica del sistema, y necesita soporte de virtualización en la CPU (VT-x / AMD-V). En soporte: activar Hyper-V puede entrar en conflicto con otras herramientas (VirtualBox antiguo, algunos anticheat y software de análisis forense), y las VMs de segunda generación solo arrancan en modo UEFI. Es también la base de Windows Sandbox y de WSL2, así que entenderlo explica media rama de funcionalidades de Windows.",
    "example": "Un analista necesita laboratorio de pruebas: activas Hyper-V en su portátil de 32 GB, creas dos VMs y puede romper cosas sin tocar su equipo real."
  },
{
    "id": "seed-hd-snapshot",
    "term": "Snapshot",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Fotografía del estado de una VM en un instante: reviertes a ella y borras cualquier desastre.",
    "longDefinition": "Congela el estado de disco y memoria de una máquina virtual para poder volver a ese punto en segundos. En soporte es el botón de deshacer de las pruebas: parches experimentales, software sospechoso, cambios de configuración; se revierte sin reinstalar nada. No es una copia de seguridad: el snapshot depende del disco original y no protege ante fallo del almacenamiento. Buena práctica: etiquetar con fecha, y borrar los viejos, porque crecen y degradan el rendimiento de la VM.",
    "example": "Vas a probar un parche en la VM de pruebas: snapshot 'antes-parche', lo aplicas, rompe el arranque; reviertes y en un minuto está como nuevo."
  },
{
    "id": "seed-hd-imagen-iso",
    "term": "Imagen ISO",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Archivo que replica el contenido exacto de un disco: sistemas operativos y herramientas de arranque.",
    "longDefinition": "Una ISO es una copia sector a sector de un disco óptico empaquetada en un único archivo. Es el formato de distribución de sistemas operativos y herramientas arrancables: Windows, Memtest86, utilidades de borrado. En soporte la descargas del portal oficial, verificas su hash (SHA-256) contra el publicado y la grabas a un USB para instalar o arrancar. No basta con copiar el archivo al pendrive: hay que grabarla con una herramienta como Rufus para que el USB sea booteable.",
    "example": "Refresco de 20 equipos: descargas la ISO de Windows del portal de licencias, compruebas su SHA-256 y preparas el USB maestro una sola vez."
  },
{
    "id": "seed-hd-usb-booteable-rufus",
    "term": "USB booteable (Rufus)",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Pendrive preparado para arrancar el equipo e instalar o reparar sistemas. Rufus es la herramienta típica.",
    "longDefinition": "Un USB booteable contiene los archivos de arranque para que el equipo inicie desde él: instalar Windows, ejecutar Memtest o lanzar herramientas offline. Rufus graba la ISO al pendrive eligiendo el esquema de particiones (GPT para UEFI o MBR para BIOS legacy), y esa elección debe coincidir con el firmware del equipo destino o el USB no aparecerá en el menú de arranque. Es la herramienta de trabajo diaria del reimaging, y usar pendrives USB 3.0 o mejor acelera las instalaciones notablemente.",
    "example": "El USB no aparece al arrancar y pulsar F12: Rufus lo grabó en MBR para BIOS y el equipo es UEFI; lo regrabas en GPT y arranca."
  },
{
    "id": "seed-hd-reimaging-reacondicionado",
    "term": "Reimaging y reacondicionado de equipo",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Reinstalar la imagen corporativa en un equipo (nuevo o devuelto) para dejarlo listo para su siguiente usuario.",
    "longDefinition": "Reimaging es grabar la imagen estandarizada del sistema con el software corporativo, en lugar de instalar a mano cada cosa. Reacondicionado es el proceso completo de la devolución de un equipo: borrado seguro de los datos, diagnóstico, limpieza física, sustitución de piezas si hace falta y reimaging final. Así un equipo de baja vuelve al pool en estado auditoriable y listo para reasignar. Dominar el proceso convierte pilas de equipos devueltos en stock reutilizable, que es la forma más barata de 'comprar' portátiles.",
    "example": "Baja de 30 personas: sus portátiles pasan por borrado seguro, limpieza, ampliación de RAM y reimaging; 24 vuelven al almacén como stock listo."
  },
{
    "id": "seed-hd-inventario-de-hardware",
    "term": "Inventario de hardware",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Registro de todos los equipos del parque: modelo, serie, usuario, ubicación, estado y garantía.",
    "longDefinition": "El inventario es la fuente de verdad del soporte: sin él no hay garantías que reclamar, equipos que localizar ni refrescos que planificar. Datos mínimos por equipo: marca y modelo, número de serie, asset tag, usuario asignado, estado y garantía. Se alimenta en cada alta, baja y movimiento, y se verifica con recuentos físicos periódicos, porque un inventario sin verificar se degrada rápido. El CMDB o el propio ServiceNow suelen alojarlo, y de ahí salen los reportes de refresco y de averías por modelo.",
    "example": "Fallo masivo en un modelo concreto de SSD: filtras el inventario por modelo, sacas los 47 equipos afectados y planificas su sustitución proactiva."
  },
{
    "id": "seed-hd-asset-tag",
    "term": "Asset tag (etiqueta de activo)",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Etiqueta con el identificador único corporativo del equipo: lo une al inventario y al historial de tickets.",
    "longDefinition": "El asset tag es el número interno que identifica cada activo físicamente, en pegatina o grabado. Es la referencia que usas en cada ticket para saber exactamente qué equipo es: el número de serie pertenece al fabricante, el asset tag a la empresa. Con él consultas historial de reparaciones, garantía y usuario asignado sin depender del recuerdo del usuario ('el portátil gris del de contabilidad' no es un identificador). Reponer las etiquetas dañadas es mantenimiento del propio inventario.",
    "example": "Ticket 'el portátil de contabilidad': preguntas el asset tag, sacas el historial, ves que ya fue dos veces por el mismo problema y propones refresco."
  },
{
    "id": "seed-hd-ciclo-de-vida-refresh",
    "term": "Ciclo de vida del equipo (refresh)",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Del alta al retiro: compra, despliegue, soporte, reasignación y baja. El refresh renueva el parque.",
    "longDefinition": "Cada equipo corporativo recorre compra, despliegue, soporte, posible reasignación y baja con disposición final. El refresh es la renovación programada (3-5 años es lo típico) que evita un parque envejecido: los equipos fuera de ciclo cuestan más en soporte de lo que cuesta sustituirlos, y dejan de soportar los upgrades de sistema operativo. El técnico participa con datos: averías por modelo, edad media y coste de mantener frente a sustituir. Una buena política de refresh también reduce los tickets de 'no puede actualizar Windows'.",
    "example": "Informe trimestral: los equipos de 5 años generan el 60% de los tickets; el refresh planificado de 80 unidades los retira en dos oleadas."
  },
{
    "id": "seed-hd-garantia-rma",
    "term": "Garantía y RMA",
    "acronym": "RMA",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "La garantía cubre fallos de fábrica en plazo; el RMA es el proceso de devolver o reparar con el fabricante.",
    "longDefinition": "La garantía (1-3 años típico, más con extensiones) cubre fallos de hardware no causados por mal uso; el RMA (Return Merchandise Authorization) es el trámite: abrir caso con el fabricante, correr sus diagnósticos, obtener el número de autorización y enviar el equipo o pieza. En soporte, verifica el estado de la garantía por número de serie ANTES de prometer reparación; el código de error del diagnóstico del fabricante suele ser requisito para abrir el caso. El tiempo de reparación (5-10 días laborables) obliga a dejar equipo de sustitución al usuario.",
    "example": "SSD muerto en un portátil Dell: corres el ePSA, el error queda registrado, abres RMA con el service tag y Dell envía el disco en 48 horas."
  },
{
    "id": "seed-hd-esd",
    "term": "ESD (descarga electrostática)",
    "acronym": "ESD",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Chispa invisible que degrada componentes al tocarlos sin estar descargado: fallan hoy o semanas después.",
    "longDefinition": "Electrostatic Discharge: la electricidad estática de tu cuerpo puede dañar componentes sin que lo notes, a veces de forma diferida (el equipo funciona y falla semanas más tarde, cuando ya nadie relaciona la avería con la manipulación). La prevención estándar: pulsera antiestática conectada a tierra, tocar la carcasa metálica del equipo antes de los componentes, trabajar sobre superficie no sintética y evitar alfombras. Las bolsas gris metálico protegían piezas sueltas. Sin control ESD, los RMA se repiten y todo parece 'mala suerte'.",
    "example": "En el taller de reacondicionado: pulsera antiestática puesta y bolsa gris para cada módulo de RAM extraído; cero piezas muertas en la última auditoría de calidad."
  },
{
    "id": "seed-hd-diagnosticos-de-fabricante",
    "term": "Diagnósticos de fabricante",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Pruebas oficiales del fabricante (Dell ePSA, Lenovo, HP): verifican hardware y validan el RMA.",
    "longDefinition": "Cada fabricante incluye diagnósticos integrados (tecla durante el arranque) o herramientas booteables que testean RAM, disco, batería, pantalla y teclado. Son la prueba objetiva que separa hardware de software: si el test de disco falla, el problema es físico y va a RMA; si pasa, miras software. Además, su código de error suele ser requisito para abrir el RMA, así que correrlo antes de llamar ahorra un round-trip completo. Aprenderse la tecla de diagnóstico de cada marca ahorra horas de elucubración.",
    "example": "Portátil con pantallazos azules: corres el ePSA (F12 al encender), falla el test de memoria con código 2000-0314, y ese código abre el RMA directamente."
  },
{
    "id": "seed-hd-duplicar-vs-extender-pantalla",
    "term": "Duplicar vs extender pantalla",
    "category": "HelpDesk - Fundamentos IT",
    "shortDefinition": "Duplicar: lo mismo en ambas pantallas (proyectores, salas). Extender: escritorio repartido (trabajo real).",
    "longDefinition": "Duplicar clona la imagen: ideal para proyectores y salas, pero limita la resolución común a la más baja de las dos pantallas. Extender convierte el segundo monitor en espacio de trabajo adicional: el modo productivo. La combinación Windows+P cambia el modo al vuelo, y los problemas típicos son el monitor no detectado (cable o driver) o el orden de pantallas equivocado en Ajustes, que se corrige arrastrándolas a su posición física real. Configurar esto en dos minutos es de lo más agradecido del soporte.",
    "example": "Reunión con proyector: Windows+P y Duplicar, todos ven la presentación. Después, el usuario pide 'mi monitor a la derecha': lo arrastras en Ajustes y listo."
  },
{
    "id": "seed-hd-incidente-itil",
    "term": "Incidente (ITIL)",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Interrupción o degradación no planeada de un servicio que ya funcionaba: se restaura lo antes posible.",
    "longDefinition": "En ITIL, interrupción no planificada o reducción de calidad de un servicio: el correo no llega, la VPN cae, una impresora falla. Su gestión NO busca la causa raíz (eso es problem management), sino restaurar el servicio cuanto antes, aunque sea con un workaround. Es la moneda diaria del service desk: la mayoría de tickets que registras son incidentes. Distinguirlo de la solicitud de servicio es lo primero del intake: algo se rompió (incidente) frente a alguien que necesita algo nuevo (solicitud).",
    "example": "Usuario reporta 'Outlook se queda cargando y no sincroniza': lo registras como incidente del servicio Correo con prioridad P3; tu meta es devolverle la sincronización ya, no descubrir por qué Exchange falla."
  },
{
    "id": "seed-hd-solicitud-de-servicio",
    "term": "Solicitud de servicio (Service Request)",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Petición predefinida de algo nuevo: acceso, hardware, información o un servicio del catálogo.",
    "longDefinition": "Solicitud formal y estandarizada de un usuario: acceso a una aplicación, un portátil nuevo, un restablecimiento de contraseña, ampliar una cuota. No implica que algo esté roto: es pedir algo que el proceso ya contempla, por eso se tramita con flujos predefinidos y aprobaciones, no con diagnóstico. ITIL la separa del incidente porque el ciclo, los SLA y las métricas son distintos: una solicitud no se 'resuelve', se cumple (fulfillment). El analista típico las mueve por el catálogo de servicios y el flujo de aprobación.",
    "example": "'Necesito acceso a la carpeta contable del equipo de Finanzas': entrada del catálogo, aprobación del dueño del recurso y entrega del permiso; cumplimiento en 4 horas, sin diagnóstico."
  },
{
    "id": "seed-hd-gestion-de-problemas",
    "term": "Gestión de problemas (Problem Management)",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Práctica que busca la causa raíz de incidentes recurrentes para eliminarla de forma permanente.",
    "longDefinition": "Un problema en ITIL es la causa (o causa potencial) de uno o varios incidentes; su gestión va de identificarla (análisis de tendencias, 5 porqués, Kepner-Tregoe), documentarla como error conocido y empujar el cambio que la corrige. Mientras el incidente se apaga con urgencia, el problema se investiga con método: por eso vive en Tier 2/3 y no en primera línea. Es la práctica que reduce el volumen de tickets a largo plazo: cada problema eliminado son decenas de incidentes que nunca ocurrirán. Sin ella, el service desk se condena a apagar el mismo fuego cada semana.",
    "example": "Tres tickets en dos días por lentitud en el ERP: abres un problema, Tier 3 encuentra un índice de base de datos corrupto y el cambio que lo reconstruye deja muerta la serie de incidentes."
  },
{
    "id": "seed-hd-error-conocido",
    "term": "Error conocido (Known Error)",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Problema con causa raíz diagnosticada y documentada, junto a un workaround, pendiente de solución definitiva.",
    "longDefinition": "Estado clave del problem management: la causa raíz ya se conoce y se documenta formalmente (registro de error conocido, KEDB) junto con el workaround disponible. La solución definitiva suele requerir un cambio, así que mientras llega, el error conocido alimenta la base de conocimiento y las búsquedas del analista. Para la primera línea es oro puro: dice qué esperar, cómo estabilizar al usuario y cuándo llegará el fix real. Registrarlo es obligatorio en incidentes recurrentes: sin KEDB, el conocimiento se pierde con cada turno.",
    "example": "Error conocido: 'fallos de impresión en planta 2 por driver v4.11 corrupto; workaround: reinstalar el driver desde el servidor de despliegue; fix definitivo en el cambio CHG0092'. El próximo ticket se resuelve en minutos."
  },
{
    "id": "seed-hd-workaround",
    "term": "Workaround (solución provisional)",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Solución temporal que restaura el servicio sin eliminar la causa raíz del incidente.",
    "longDefinition": "Medida que devuelve el servicio o mitiga el impacto sin corregir el problema de fondo: conectarse por cable cuando falla el Wi-Fi, usar la versión web mientras la app de escritorio falla, imprimir en otra impresora. En gestión de incidentes es legítimo y a menudo la opción correcta: SLA primero, ingeniería después. La regla es documentarlo y comunicar que es temporal, para que la causa entre en el radar del problem management. El riesgo clásico: el workaround que se vuelve permanente porque nadie abrió el problema detrás.",
    "example": "La app de escritorio del CRM no abre por una actualización corrupta: mientras Tier 2 investiga, habilitas el acceso web y el usuario sigue vendiendo; después abres el registro de problema para el fix definitivo."
  },
{
    "id": "seed-hd-gestion-de-cambios",
    "term": "Gestión de cambios (Change Enablement)",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Práctica que controla la evaluación, aprobación y despliegue de cambios para minimizar el riesgo.",
    "longDefinition": "Todo cambio en producción (despliegue, parche, configuración, hardware) pasa por registro, evaluación de riesgo, aprobación proporcional y calendarización. El objetivo no es frenar el cambio sino evitar que uno mal pensado genere un incidente mayor: la mayoría de las caídas grandes nacen de un cambio sin control. El service desk participa recibiendo el aviso de cambio, comunicando ventanas a los usuarios y verificando el impacto tras el despliegue. En ITIL 4 se llama change enablement: habilitar cambios seguros, no burocratizarlos.",
    "example": "Cambio CHG0145: actualización del firewall este sábado de 02:00 a 04:00. El service desk recibe el aviso previo: si el lunes llegan tickets de VPN, el primer sospechoso ya tiene nombre y número."
  },
{
    "id": "seed-hd-tipos-de-cambio",
    "term": "Cambio estándar vs normal vs emergente",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Estándar: preaprobado y de bajo riesgo; normal: evalúa riesgo y pasa por CAB; emergente: urgente y acelerado.",
    "longDefinition": "Tres velocidades del cambio. Estándar: repetitivo, documentado y de riesgo conocido (crear una cuenta, ampliar una cuota); se ejecuta sin CAB porque el procedimiento ya es la aprobación. Normal: riesgo medio o alto, requiere evaluación, ventana y paso por el CAB. Emergente: necesario ya para restaurar un servicio o cerrar un agujero crítico, con aprobación acelerada (ECAB o dirección) y revisión posterior obligatoria. Clasificar mal el tipo es el error clásico: colar cambios normales como estándar es como se rompen redes enteras.",
    "example": "Ampliar la cuota de un buzón: cambio estándar en 5 minutos sin CAB. Migrar el servidor de correo a una versión nueva: cambio normal con CAB. Sustituir el certificado expirado un domingo con el portal caído: cambio de emergencia."
  },
{
    "id": "seed-hd-cab",
    "term": "CAB (Change Advisory Board)",
    "acronym": "CAB",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Comité que asesora la aprobación de cambios normales: evalúa riesgo, plan, comunicación y rollback.",
    "longDefinition": "Foro donde se presentan los cambios normales: asisten el change manager, los técnicos implicados, los dueños de servicio y a menudo el service desk, que aporta la vista del impacto sobre usuarios. El CAB asesora: la decisión formal la toma el change manager o el autorizador designado. Agenda típica: qué cambia, por qué, riesgo, plan de pruebas, ventana, comunicación y plan de reversión. La versión exprés para urgencias es el ECAB (emergency CAB), con menos gente y sesión inmediata. Un CAB bien usado evita el clásico '¿y quién aprobó tocar eso un viernes a las 17:00?'.",
    "example": "Presentas en el CAB la migración del servidor de ficheros con pruebas, rollback y ventana del sábado; el comité pide comunicarlo 72 horas antes, se aprueba y queda agendado."
  },
{
    "id": "seed-hd-catalogo-de-servicios",
    "term": "Catálogo de servicios",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "La vitrina del portafolio: los servicios en operación, con cómo se piden, quién los usa y sus SLA.",
    "longDefinition": "El subconjunto visible del portafolio: solo lo que hoy está en operación y puede pedir el cliente (restablecer contraseña, alta en aplicaciones, préstamo de portátil). Cada entrada define descripción, categorías, canal de solicitud, aprobaciones y SLA. Para el analista es la fuente de verdad del intake: si está en el catálogo, existe un camino definido; si no, es una excepción que hay que enrutar. Un buen catálogo convierte tickets ambiguos en solicitudes clicables y alimenta el autoservicio, que desvía volumen de la cola.",
    "example": "Pides 'acceso a SAP' en el portal de autoservicio: te aparece la entrada del catálogo con su formulario, aprobador y SLA de 2 días; eliges y envías, sin llamar a nadie."
  },
{
    "id": "seed-hd-sla",
    "term": "SLA (Service Level Agreement)",
    "acronym": "SLA",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Acuerdo entre proveedor y cliente sobre el nivel de servicio: tiempos de respuesta y resolución.",
    "longDefinition": "Acuerdo (formal o interno) que fija qué se promete y cómo se mide: tiempo de respuesta y resolución por prioridad, disponibilidad, horario de soporte. Es la vara que ordena el día del analista: define qué ticket atiendes primero y contra qué reloj. Un SLA bien escrito diferencia respuesta de resolución y excluye lo que no controla (averías de terceros). El error de novato: prometer 'ya lo resuelvo' cuando el SLA dice 8 horas para P3; la expectativa se gestiona con el acuerdo, no con el pánico.",
    "example": "SLA interno: P1 responde en 15 minutos y resuelve en 4 horas; P4 responde en 1 día. Tu cola se ordena sola: primero el P2 de la directiva, después el P3 del buzón compartido."
  },
{
    "id": "seed-hd-ola",
    "term": "OLA (Operational Level Agreement)",
    "acronym": "OLA",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Acuerdo entre equipos internos que sostiene el SLA externo: qué aporta cada unidad y en cuánto tiempo.",
    "longDefinition": "El SLA promete al cliente, pero el servicio lo sostienen varios equipos (redes, base de datos, proveedor cloud): el OLA es el compromiso interno que reparte el tiempo que le toca a cada uno. Ejemplo: SLA de resolución de 4 horas para el servicio de correo, con OLA de redes de 30 minutos para diagnosticar y OLA del proveedor de 2 horas en su plataforma. Si los OLA no cuadran con el SLA, prometes algo que por dentro no se puede cumplir. Conocer el OLA explica al analista por qué un ticket 'está' en otro equipo y cuándo exigirle.",
    "example": "Incidente P2 en la web: el SLA da 4 horas; tu OLA con redes es diagnóstico en 30 minutos y el del hosting 1 hora. La cadena completa cabe dentro de lo prometido al cliente."
  },
{
    "id": "seed-hd-prioridad",
    "term": "Prioridad (P1-P4)",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Orden de atención de un ticket, calculado del impacto y la urgencia; P1 es lo más crítico.",
    "longDefinition": "La P define en qué orden trabajas y qué SLA aplica. Escala típica: P1, servicio caído para toda la empresa o incidente mayor; P2, equipo o proceso grave degradado; P3, usuario individual bloqueado pero con alternativa; P4, solicitud o consulta sin dolor. La prioridad no se decide a sentimiento: se calcula con la matriz de impacto x urgencia, y ajustarla es una negociación documentada (la prioridad en conflicto la resuelve el coordinador). El error clásico: todo es P1 para quien llama; tu trabajo es traducir grito a matriz.",
    "example": "Finanzas llama gritando por un Excel con macros: un usuario con alternativa (la versión web) es impacto bajo y urgencia media: P3. La empresa entera sin correo: P1 y bridge de incidente mayor."
  },
{
    "id": "seed-hd-impacto-vs-urgencia",
    "term": "Impacto vs urgencia",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Impacto: cuánto daño causa; urgencia: cuán rápido hace falta. Combinados, dan la prioridad.",
    "longDefinition": "Los dos ejes de la matriz de prioridad, confundidos constantemente. Impacto: magnitud del daño (cuántos usuarios, qué proceso de negocio, cuánta pérdida). Urgencia: velocidad que exige el asunto (una ventana de nómina que cierra hoy tiene urgencia altísima aunque afecte a tres personas). Un corte de VPN a las 03:00 tiene impacto enorme y urgencia baja si nadie trabaja a esa hora. La prioridad se calcula combinando ambos: la fórmula ordena la cola y desarma el 'para mí es urgente'. Medir impacto en usuarios y procesos, y urgencia en relojes, es lo que separa triage de lotería.",
    "example": "Un directivo sin imprimir (impacto bajo, urgencia alta) puede salir P2; 200 operarios con el terminal lento el día de inventario (impacto alto, urgencia alta) es P1 sin discusión."
  },
{
    "id": "seed-hd-matriz-de-prioridad",
    "term": "Matriz de prioridad",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Tabla impacto x urgencia que asigna P1-P4 de forma consistente y defendible ante el usuario.",
    "longDefinition": "Tabla cruzada de niveles de impacto (alto/medio/bajo) contra niveles de urgencia; cada celda da una P. Su valor no es teórico: elimina la arbitrariedad, porque dos analistas con el mismo ticket sacan la misma prioridad y frente al usuario que exige P1 tienes un marco publicado que respaldar. Cada organización la calibra; la celda crítica (impacto alto con urgencia alta) suele definir también el umbral de incidente mayor. Cuando una matriz falla es por categorías farragosas: cinco niveles de impacto que nadie distingue. Tres por tres es el estándar pragmático.",
    "example": "Celda impacto alto con urgencia media igual a P2. El usuario pide P1 'porque soy director'; muestras la matriz publicada en el portal y el ticket se queda en P2 con el reloj correcto."
  },
{
    "id": "seed-hd-escalamiento-funcional-vs-jerarquico",
    "term": "Escalamiento funcional vs jerárquico",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Funcional: pasar a quien sabe (Tier 2/3); jerárquico: subir a management por autoridad o presión.",
    "longDefinition": "Dos razones distintas para subir un ticket. Funcional: transferirlo a un equipo con más conocimiento o permisos; el ticket cambia de manos y el SLA sigue corriendo (con aviso al usuario). Jerárquico: no se transfiere, se involucra a la dirección (tuya o del cliente) porque el SLA se incumple, la decisión excede tu nivel o el negocio exige presión; el ticket no cambia de dueño, gana una capa de autoridad. Confundirlos produce los peores casos: escalados a Tier 3 sin contexto, o managers llamando a managers porque nadie avisó a tiempo.",
    "example": "P2 del ERP sin avance a las 2 horas: escalamiento funcional a Tier 3 (tienen acceso a la base de datos) y jerárquico a tu coordinador porque el SLA de 4 horas está en riesgo. Dos movimientos, dos propósitos."
  },
{
    "id": "seed-hd-incidente-mayor",
    "term": "Incidente mayor (Major Incident)",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Incidente de máximo impacto que activa protocolo especial: bridge, roles y comunicación ejecutiva.",
    "longDefinition": "Subcategoría del incidente con impacto crítico (empresa o unidad completa parada) que merece su propio procedimiento: se declara formalmente, se abre un bridge permanente, se asignan roles (incident manager, comunicaciones, actuario) y se emiten actualizaciones ejecutivas periódicas aunque no haya novedad. La diferencia con un P1 normal es protocolo y comunicación: el negocio no acepta silencio. En un incidente mayor el service desk es la cara: alimenta al bridge con síntomas de usuarios, emite los avisos y luego absorbe la ola. El cierre incluye revisión posincidente y, casi siempre, un problema detrás.",
    "example": "Se cae el ERP nacional: se declara incidente mayor, bridge con el proveedor y actualizaciones cada 30 minutos a dirección; el service desk canaliza 200 llamadas con el guion aprobado y luego se abre el problema 'nodo único de base de datos'."
  },
{
    "id": "seed-hd-gestion-del-conocimiento",
    "term": "Gestión del conocimiento (base de conocimiento)",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Práctica de capturar, estructurar, mantener y reutilizar el conocimiento operativo del soporte.",
    "longDefinition": "Práctica ITIL para que lo aprendido no muera en la cabeza del analista: capturar (del ticket al artículo), estructurar (título, síntomas, causa, workaround), publicar en la base de conocimiento, mantener (revisión y caducidad) y reutilizar (buscar antes de diagnosticar). El ciclo maduro: Tier 1 crea borradores, Tier 2/3 valida y publica, y el feedback de los tickets poda lo obsoleto. Es la palanca de escala del service desk: sube el FCR, baja el MTTA y acelera la curva de los nuevos. El anti-patrón: una base de 3.000 artículos sin revisar donde nadie encuentra nada.",
    "example": "Resuelves el fallo raro de Outlook y del ticket nace un artículo con síntomas y workaround; al mes, otro analista lo encuentra en 2 minutos y el FCR de ese tema sube un 20%."
  },
{
    "id": "seed-hd-articulo-de-kb",
    "term": "Artículo de KB",
    "acronym": "KB",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Unidad de la base de conocimiento: síntomas, causa, pasos y workaround de un caso concreto.",
    "longDefinition": "El átomo de la base de conocimiento. Buen artículo: título con los síntomas tal como los teclea el usuario (no 'error 0x8007', sino 'Outlook pide contraseña en bucle'), alcance (versión, sistema), síntomas, causa, pasos de diagnóstico, workaround o solución y fecha de revisión. La regla de oro del título: piensa cómo buscaría el usuario, no cómo lo llamas tú. Los artículos se miden: visitas, uso en resolución de tickets y valoraciones. Cada ticket resuelto sin artículo es deuda de conocimiento; cada artículo sin fecha de revisión es una bomba.",
    "example": "Ticket: 'no puedo abrir los adjuntos'. Creas 'Outlook bloquea adjuntos tras la actualización de mayo'. La próxima llamada se resuelve sola en el portal de autoservicio."
  },
{
    "id": "seed-hd-cmdb",
    "term": "CMDB (Configuration Management Database)",
    "acronym": "CMDB",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Base de datos de todos los CIs y sus relaciones: el mapa de qué depende de qué en la infraestructura.",
    "longDefinition": "Repositorio que almacena los elementos de configuración (CI) y, sobre todo, las relaciones entre ellos: esta aplicación depende de ese servidor, que depende de esa base de datos y ese switch. Para el service desk es la radiografía: ante una caída, la CMDB dice qué servicios se ven afectados y qué más va a caer (análisis de impacto). Su talón es la calidad: una CMDB sucia da tickets apuntando a CI inexistentes y confianza cero. No es el inventario de activos: el activo dice 'tengo 300 servidores'; la CMDB dice 'el servicio de nómina depende de estos 12'.",
    "example": "Caída de un host de virtualización: la CMDB lista las 40 máquinas afectadas y mapea que 3 servicios con SLA P1 van a notificarlo; preparas el aviso y la ola de tickets con nombre y apellido."
  },
{
    "id": "seed-hd-elemento-de-configuracion",
    "term": "Elemento de configuración (CI)",
    "acronym": "CI",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Cualquier componente bajo gestión de configuración: servidor, aplicación, licencia, contrato o persona.",
    "longDefinition": "Todo lo que necesita control para entregar un servicio puede ser CI: un servidor, una instancia de base de datos, una licencia, un contrato de soporte, un script de despliegue y hasta personal clave. Cada CI tiene atributos (versión, ubicación, dueño, estado) y enlaces a otros CI; lo que lo hace útil no es la ficha sino la relación. El analista lo toca a diario: el ticket ideal referencia los CI afectados, y el escalamiento a Tier 3 llega con contexto si la relación está bien capturada. La prueba de algodón: si cambia y nadie lo registra, la CMDB miente.",
    "example": "Ticket 'VPN lenta': le adjuntas los CI (pasarela VPN-02, perfil de cliente, circuito MPLS) y Tier 3 abre la CMDB viendo a qué más se conecta esa pasarela."
  },
{
    "id": "seed-hd-gestion-de-activos",
    "term": "Gestión de activos (Asset Management)",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Ciclo de vida del inventario TI: comprar, desplegar, mantener, reubicar y retirar cada activo.",
    "longDefinition": "Práctica de seguir cada activo (portátil, monitor, licencia, móvil) durante su vida completa: compra, asignación, soporte, reubicación y baja. Para el service desk es la ficha de identidad de cada interacción: ¿este portátil es de la empresa?, ¿está en garantía?, ¿a quién está asignado?, ¿qué licencias lleva? Se solapa con la CMDB pero no es igual: los activos miran propiedad y coste; los CI miran soporte del servicio y relaciones técnicas. Un asset management flojo produce los clásicos: portátiles fantasma, licencias pagadas dos veces y 'no consta que se le entregara nada'.",
    "example": "Usuario con pantalla rota: consultas el activo, está en garantía y asignado a él desde 2023; generas el reemplazo por RMA, actualizas la asignación y todo queda auditado."
  },
{
    "id": "seed-hd-ciclo-de-vida-del-ticket",
    "term": "Ciclo de vida del ticket",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Estados por los que pasa un ticket: nuevo, en curso, en espera, resuelto, cerrado (y reabierto).",
    "longDefinition": "El recorrido formal del ticket desde el contacto hasta su muerte: registro (nuevo), clasificación y asignación, en curso, en espera (pendiente del usuario o de un proveedor), resuelto (solución aplicada, a la espera de confirmación) y cerrado. Reabierto aparece cuando el usuario dice 'sigue igual': la reapertura es un evento que se mide, no un capricho. Cada estado tiene reglas de reloj: la espera detiene o descuenta SLA según política, y lo resuelto sin respuesta se auto-cierra tras N días. Entenderlo explica tus métricas: el MTTR cuenta del registro a resuelto, no a cerrado.",
    "example": "Resuelves el ticket y pasa a 'resuelto' con nota al usuario; a los 3 días sin respuesta se auto-cierra; si el usuario vuelve quejándose, se reabre y queda registrada en la tasa de reapertura."
  },
{
    "id": "seed-hd-intake",
    "term": "Registro inicial del ticket (intake)",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Captura del primer contacto: registrar el ticket con datos completos antes de diagnosticar nada.",
    "longDefinition": "El arte del primer minuto: convertir 'no me funciona el correo' (que no sirve para nada) en un registro con usuario, servicio, síntomas exactos (mensaje de error, desde cuándo, a quién más le pasa), contexto (oficina o VPN, tras qué cambio) y canal. Un intake pobre contamina todo lo que sigue: triage imposible, base de conocimiento que no encuentra, Tier 2 a ciegas y el usuario repitiendo su historia en cada turno. Es también el momento de la primera impresión: número de ticket, SLA aplicado y qué esperar. En teléfono lo estandariza el guion; en chat y portal, el formulario. Regla: no se diagnostica antes de registrar.",
    "example": "Llamada: 'el Outlook va raro' se convierte en 'desde ayer a las 15:00, al abrir sale el aviso de sin conexión, solo en tu portátil, en la oficina, ya reiniciaste'. Con eso, el triage y el artículo de KB salen solos."
  },
{
    "id": "seed-hd-triage-y-categorizacion",
    "term": "Triage y categorización de tickets",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Primer análisis del ticket: clasificar por servicio y categoría, y decidir prioridad y equipo destino.",
    "longDefinition": "Los primeros minutos de un ticket valen más que las dos horas siguientes. La categorización asigna servicio y subcategoría (Correo > Sincronización); el triage evalúa impacto y urgencia para la prioridad y decide la ruta: Tier 1 lo resuelve, Tier 2 lo investiga, el proveedor externo lo recibe. Mal categorizado, el ticket rebota entre colas y cada rebote son horas de SLA. Buen triage: el ticket llega al equipo correcto con la información mínima (usuario, servicio, síntomas, ya probado). Los reportes nacen de aquí: si la categoría miente, el análisis de tendencias mide nada.",
    "example": "'No me funciona el Excel' se registra como Ofimática > Excel > Rendimiento; triage: un usuario con alternativa es P3; ruta: Tier 1 con un artículo de KB candidato. En 5 minutos el ticket ya tiene dueño, prioridad y camino."
  },
{
    "id": "seed-hd-backlog-y-envejecimiento",
    "term": "Backlog y envejecimiento de tickets",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Backlog: tickets abiertos pendientes; aging: cuánto llevan abiertos y a qué distancia del SLA.",
    "longDefinition": "El backlog es la pila de tickets abiertos sin resolver; su salud se mide con el envejecimiento: antigüedad por ticket y distancia al vencimiento del SLA. Un analista gestiona su cola por edad y prioridad, no por comodidad: primero lo que vence, no lo que apetece. A nivel equipo, el aging expone a los olvidados crónicos (tickets de hace 20 días 'en curso' sin nota) y alimenta la limpieza semanal: reasignar, pedir al usuario o cerrar por inactividad con política publicada. Backlog creciente con FCR estable significa que faltan manos, no eficiencia.",
    "example": "Revisión del lunes: 40 abiertos y 7 con más de 3 días sin actualización. Contactas a los usuarios de 5, cierras 2 por inactividad y escalas 1 a redes: backlog bajo control antes de que se enquiste."
  },
{
    "id": "seed-hd-tasa-de-reapertura",
    "term": "Tasa de reapertura (reopen rate)",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Porcentaje de tickets resueltos que el usuario reabre porque el problema persiste o volvió.",
    "longDefinition": "Tickets reabiertos sobre tickets resueltos: la métrica más honesta sobre la calidad de la resolución. Un cierre prematuro (para salvar el SLA del mes) se cobra con reapertura y con la confianza del usuario. Causas típicas: cerrar sin confirmar que funciona, workaround que caduca, diagnóstico a medias o el clásico 'resuelto: reinicia' sin verificar. Un umbral sano ronda el 5-8%; por encima, revisa el patrón por analista, categoría y servicio (a veces la causa es una integración que auto-cierra). Reducirla empieza por no cerrar sin confirmación del usuario.",
    "example": "Un analista acumula 25% de reaperturas en tickets de Outlook: la revisión muestra que cerraba al aplicar el workaround sin probar la sincronización; con la verificación de cierre baja al 4%."
  },
{
    "id": "seed-hd-tasa-de-escalamiento",
    "term": "Tasa de escalamiento",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Porcentaje de tickets que la primera línea pasa a Tier 2/3: mide la capacidad y el conocimiento de Tier 1.",
    "longDefinition": "Tickets escalados sobre el total atendido por Tier 1. Alta sostenida significa: base de conocimiento floja (nadie encuentra cómo resolver), permisos insuficientes o tickets mal triageados que nunca eran de primera línea. Baja sospechosa también avisa: quizá se cierra por debajo de calidad, y la tasa de reapertura sube junto a ella. El valor sano depende del servicio: los entornos complejos escalan más. La palanca de mejora clásica: coger los 10 motivos de escalamiento más frecuentes del mes, escribir el artículo de cada uno y reentrenar; la tasa cae sin tocar la plantilla.",
    "example": "Escalamiento del 38%: el análisis mensual muestra que el 60% son restablecimientos con casos raros; un artículo de KB con los 5 escenarios y una directiva delegada bajan la tasa al 21%."
  },
{
    "id": "seed-hd-mtta",
    "term": "MTTA (Mean Time to Acknowledge)",
    "acronym": "MTTA",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Tiempo medio desde que se registra el ticket hasta que un analista lo toma y lo reconoce.",
    "longDefinition": "El tiempo entre el registro y el primer 'lo tengo'. Es la métrica del silencio: cuánto tarda el usuario en saber que alguien mira su problema. No mide resolución, mide respuesta, y es la que más pesa en la percepción: un ticket tomado en 2 minutos con un 'lo estoy viendo' genera más satisfacción que uno resuelto rápido pero ignorado 3 horas. Se mejora con reconocimiento automático (el portal confirma número y SLA) y colas vigiladas por envejecimiento, no por heroísmo. Es la primera métrica que se hunde si la cola no se mira por prioridad.",
    "example": "P2 a las 09:02, lo tomas a las 09:09 y escribes al usuario: tu MTTA en ese ticket son 7 minutos, dentro del SLA de 15; el usuario no llama dos veces para preguntar."
  },
{
    "id": "seed-hd-mttr",
    "term": "MTTR (Mean Time to Resolve)",
    "acronym": "MTTR",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Tiempo medio de resolución: del registro del ticket (o del primer contacto) hasta que queda resuelto.",
    "longDefinition": "La métrica reina del soporte: promedio del tiempo desde que el ticket nace hasta que queda resuelto (a veces se mide desde la primera respuesta: conviene leer la letra pequeña de cada informe). A diferencia de su prima del SOC (tiempo de recuperación en seguridad), aquí mide el ciclo completo del ticket, esperas incluidas si el reloj corre. Se descompone para diagnosticar: si el MTTR es alto pero el tiempo de trabajo es bajo, el problema son esperas, no el equipo. Ojo al promedio: un incidente mayor de 3 días sesga el mes; usa medianas o percentiles para discutir con datos.",
    "example": "MTTR mensual de 9 horas que nadie entiende; al descomponer: 2 horas de trabajo y 7 de 'en espera del usuario' porque nadie avisaba que faltaba información; con recordatorios automáticos cae a 4."
  },
{
    "id": "seed-hd-mtbf",
    "term": "MTBF (Mean Time Between Failures)",
    "acronym": "MTBF",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Tiempo medio entre fallos de un servicio o componente: mide estabilidad, no velocidad de soporte.",
    "longDefinition": "Promedio entre una avería y la siguiente de un CI o servicio: la métrica de fiabilidad. MTBF alto: pocas caídas; MTTR bajo: cuando cae, se recupera rápido; juntas dan la disponibilidad. Para el service desk es la métrica que da voz en prevención: cuando el MTBF de un servicio cae mes a mes, no es mala suerte, es un problema sin gestionar o un cambio arriesgado, y la conversación correcta es 'abramos un problema', no 'hagamos más turno'. Se alimenta de la categorización honesta: si cada fallo se registra con categoría distinta, la señal se pierde.",
    "example": "El servicio de impresión cae 6 veces en 2 meses: el MTBF se desploma; el service desk aporta la serie de tickets como evidencia y problem management abre investigación del driver."
  },
{
    "id": "seed-hd-fcr",
    "term": "FCR (First Contact Resolution)",
    "acronym": "FCR",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Porcentaje de tickets resueltos en el primer contacto, sin escalar ni nuevas llamadas.",
    "longDefinition": "Resolución en la primera interacción: el usuario llama, chatea o escribe una vez y se va resuelto. Es la métrica de eficiencia con mejor relación con la satisfacción: al usuario no le importa tu organigrama, le importa no volver a explicar. Sus palancas: base de conocimiento buscable, permisos de autoservicio en Tier 1 (restablecer, desbloquear, reasignar licencias) y un triage que no mande a Tier 2 lo que Tier 1 puede. Cuidado con optimizarla en falso: FCR alta con reapertura alta significa que se cierra sin resolver. Meta realista: 65-75% en un service desk maduro.",
    "example": "Usuario sin acceso a la app de gastos: es su MFA sin registrar; lo verificas, le reactivas el registro y lo completa en el mismo chat: FCR, sin pasar por Tier 2."
  },
{
    "id": "seed-hd-csat",
    "term": "CSAT (Customer Satisfaction)",
    "acronym": "CSAT",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Satisfacción del usuario medida tras el cierre: encuesta breve, típicamente de 1 a 5.",
    "longDefinition": "La encuesta post-cierre (¿cómo valoras la atención?) que convierte la percepción en número. Sufre vicios conocidos: solo contestan los muy contentos o los furiosos, y el que tenía prisa no responde; por eso se lee junto a la tasa de respuesta y segmentada por servicio, prioridad y canal. Lo que más la mueve no es la velocidad pura sino la comunicación: tickets resueltos con actualizaciones honestas puntúan mejor que rápidos en silencio. Un CSAT que cae con MTTR estable dice que el problema es trato o expectativa, no técnica. Ninguna estrella se castiga sin leer el comentario.",
    "example": "Mes con CSAT 3.9 y comentarios repetidos de 'nadie me decía nada'. Activas actualizaciones automáticas cuando un ticket pasa 24 horas en curso y el mes siguiente sube a 4.4 sin tocar tiempos."
  },
{
    "id": "seed-hd-cumplimiento-de-sla",
    "term": "Cumplimiento de SLA (SLA breach)",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Porcentaje de tickets resueltos dentro del tiempo pactado; el incumplimiento es el SLA breach.",
    "longDefinition": "Mide contra el reloj: de cada 100 tickets, cuántos cumplieron los tiempos de respuesta y resolución de su SLA. El breach (incumplimiento) tiene consecuencias según el acuerdo: penalización económica si el cliente es externo, informe de excepción si es interno; y siempre análisis, porque un incumplimiento por 'en espera del usuario' se pelea distinto que uno por falta de capacidad. Los breach se gestionan honestamente: avisar antes de vencer (el usuario perdona el retraso, no la sorpresa), documentar la causa y, si es recurrente, revisar si el SLA es realista. Cambiar prioridades a última hora para 'cumplir' siempre se descubre.",
    "example": "P2 con resolución a 4 horas lleva 3 h 20 sin solución: avisas al usuario y al coordinador del riesgo, documentas la espera del proveedor y el incumplimiento llega con causa registrada, no con sorpresa."
  },
{
    "id": "seed-hd-kpi-de-service-desk",
    "term": "KPI de service desk",
    "acronym": "KPI",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Indicadores clave del soporte: volumen, FCR, MTTR, cumplimiento de SLA, CSAT y coste por contacto.",
    "longDefinition": "El tablero mínimo que dirige un service desk: volumen de contactos, FCR, MTTA y MTTR, cumplimiento de SLA, tasa de reapertura, de escalamiento, CSAT y coste por contacto. Ninguna métrica manda sola: FCR sin reapertura engaña; MTTR bajo con CSAT bajo es trato, no técnica; volumen sin tendencia no dimensiona plantilla. La regla práctica es emparejar cada métrica de velocidad con una de calidad (MTTR con reapertura, FCR con CSAT) y presentarlas segmentadas por servicio y cola. Un KPI sin umbral ni dueño no es un KPI, es decoración.",
    "example": "Panel semanal del equipo: SLA 94%, FCR 68%, reapertura 6%, CSAT 4.3. Se cae el SLA de la cola de redes: el coordinador mueve refuerzo del turno tarde: decisión con datos, no con pánico."
  },
{
    "id": "seed-hd-itil-4",
    "term": "ITIL 4",
    "acronym": "ITIL",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Marco de referencia de gestión de servicios de TI: vocabulario y prácticas comunes de la industria.",
    "longDefinition": "La cuarta generación del framework ITIL (Information Technology Infrastructure Library), publicado por AXELOS en 2019. Aporta el lenguaje común de la profesión (incidente, problema, cambio, práctica, SVS) que permite que dos técnicos de empresas distintas se entiendan. Frente a v3 se flexibiliza: menos proceso rígido, más valor y prácticas ajustables al tamaño de cada organización. No enseña a apagar tickets: es el mapa conceptual que ordena el trabajo; el trato al usuario lo pone la experiencia. Es la base conceptual de las herramientas ITSM (ServiceNow, Jira Service Management, BMC).",
    "example": "En la entrevista te preguntan la diferencia entre incidente y solicitud de servicio: respondes con ITIL y el entrevistador comprueba en 30 segundos que hablas el idioma del service desk."
  },
{
    "id": "seed-hd-sistema-de-valor",
    "term": "Sistema de valor (SVS)",
    "acronym": "SVS",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "El modelo central de ITIL 4: cómo la demanda entra y sale del sistema convertida en valor.",
    "longDefinition": "El dibujo grande de ITIL 4: la demanda y las oportunidades del entorno entran al sistema, atraviesan prácticas, recursos y socios (con los principios rectores y la gobernanza como marco) y salen como valor. Su mensaje práctico: el service desk no existe para cerrar tickets, existe para convertir esa demanda en valor con la menor fricción posible. Cada ticket es una entrada al SVS y cada mejora continua es un ajuste del sistema. Situarse en el SVS responde a la pregunta del novato ('¿por qué tanta burocracia?'): cada paso existe para proteger el valor, y si no lo hace, sobra.",
    "example": "La dirección pregunta para qué sirve el portal de autoservicio y respondes en términos del SVS: convierte demanda repetitiva en respuesta inmediata 24x7, liberando a Tier 1 para lo que sí requiere persona."
  },
{
    "id": "seed-hd-principios-rectores",
    "term": "Principios rectores de ITIL 4",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Las 7 recomendaciones de ITIL 4 que guían toda decisión, aplicables a cualquier contexto.",
    "longDefinition": "Siete consejos de diseño, no procesos: enfocarse en el valor; empezar donde se está; progresar iterativamente con retroalimentación; colaborar y promover la visibilidad; pensar y trabajar holísticamente; mantenerlo simple y práctico; optimizar y automatizar. Son deliberadamente universales: valen para diseñar un service desk, ordenar una cola o elegir herramienta. El que más cambia el día a día del analista es 'mantenerlo simple': un formulario de 12 campos obligatorios para un restablecimiento no es proceso, es fricción. Y 'colaborar y dar visibilidad' explica por qué el ticket con notas legibles salva al compañero del turno siguiente.",
    "example": "Quieren rediseñar el intake con 15 campos nuevos; aplicas 'mantenlo simple' y 'empieza donde estás': piloto de 2 semanas con 5 campos y feedback del equipo antes de tocar el portal entero."
  },
{
    "id": "seed-hd-cuatro-dimensiones",
    "term": "Las 4 dimensiones de ITIL 4",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Cuatro perspectivas de todo servicio: personas, información y tecnología, socios, flujos y procesos.",
    "longDefinition": "ITIL 4 exige mirar cada servicio desde cuatro ángulos simultáneos: organizaciones y personas (roles, cultura, competencias); información y tecnología (datos, aplicaciones, infraestructura); socios y proveedores (externalización, cloud); y flujos de valor y procesos (cómo la demanda se convierte en valor). La utilidad práctica es diagnóstica: un service desk que falla rara vez falla solo en tecnología; suele fallar en personas (rotación, sin formación) o en procesos (intake caótico). Cuando el ticket no avanza, pregunta qué dimensión está rota antes de culpar a la herramienta.",
    "example": "MTTR alto: descubres que no es la aplicación, es que nadie entrenó a los nuevos (dimensión de personas) y que el proveedor cloud responde en 2 días (dimensión de socios): el fix toca dos dimensiones distintas."
  },
{
    "id": "seed-hd-practicas-itil",
    "term": "Prácticas de ITIL 4",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Unidades organizativas de ITIL 4 que hacen el trabajo: generales, de gestión de servicio y técnicas.",
    "longDefinition": "ITIL 4 sustituye los 'procesos' de v3 por prácticas: conjuntos de recursos organizados para un objetivo. Son 34, agrupadas en 14 generales (mejora continua, gestión de relaciones, seguridad de la información...), 17 de gestión de servicios (gestión de incidentes, de problemas, de cambios, de solicitudes, service desk, de niveles de servicio, del conocimiento...) y 3 técnicas (despliegues, infraestructura y plataformas, y desarrollo de software). El analista de soporte vive dentro de varias a la vez. La diferencia clave con 'proceso': la práctica se adapta al tamaño de la organización; una empresa pequeña no necesita las 34.",
    "example": "Tu día: gestión de incidentes (3 tickets), gestión de solicitudes (2 restablecimientos), gestión del conocimiento (un artículo) y service desk (todo lo demás): cuatro prácticas antes del mediodía."
  },
{
    "id": "seed-hd-mejora-continua",
    "term": "Mejora continua (CSI)",
    "acronym": "CSI",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Ciclo permanente de medir, detectar brechas y mejorar: el modelo de mejora continua de ITIL 4.",
    "longDefinition": "Práctica general (heredera de la Continual Service Improvement de v3) que ordena el perfeccionamiento: el modelo de mejora continua responde en orden ¿cuál es la visión?, ¿dónde estamos?, ¿dónde queremos estar?, ¿cómo llegamos?, actuar y comprobar si se logró, montado sobre el ciclo PDCA. Para el service desk no es un proyecto trimestral: es revisar los 10 motivos de ticket más comunes y escribir el artículo que falta, o ajustar la matriz cuando una celda produce prioridades absurdas. El requisito son datos: sin métricas honestas no hay mejora, solo opiniones. El error clásico es querer mejorarlo todo: se eligen una o dos brechas de alto impacto y se cierran por iteración.",
    "example": "El informe mensual muestra que el 30% de los tickets son restablecimientos de MFA: iteración con guía ilustrada en el portal y QR en la sala de reuniones; al mes siguiente el volumen cae al 18% y se vuelve a medir."
  },
{
    "id": "seed-hd-cliente-vs-usuario",
    "term": "Cliente vs usuario (ITIL)",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Cliente: quien paga y decide el servicio; usuario: quien lo usa a diario. Expectativas distintas.",
    "longDefinition": "Distinción fundacional de ITIL. El cliente define qué servicio, paga y firma el SLA (el director de operaciones, el negocio); el usuario es la persona que cada día abre el correo y la app de ventas. El service desk atiende a usuarios pero rinde cuentas a clientes: el CSAT lo miden los usuarios, el SLA lo firma el cliente. La confusión genera el conflicto de prioridad típico: para el usuario lo suyo es urgente; el cliente definió en el SLA qué es P1. Conocer ambos papeles permite contestar al usuario sin insultar al acuerdo.",
    "example": "El usuario de ventas exige que su reporte sea P1; el SLA del servicio BI, firmado por su director, define P1 como caída total. Mantienes el P3 y explicas el marco con tacto: el acuerdo manda."
  },
{
    "id": "seed-hd-comunicacion-y-seguimiento",
    "term": "Comunicación y seguimiento al usuario",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Actualizaciones proactivas y contacto de verificación: el usuario nunca tiene que preguntar qué pasa.",
    "longDefinition": "La mitad del servicio. Comunicación: cada cambio de estado, espera o decisión relevante se refleja al usuario en su idioma y con expectativa ('espero al proveedor; te escribo antes de las 16:00'). Seguimiento: contactar cuando lo prometiste aunque no haya novedad, y verificar que la solución sigue funcionando días después. Es la palanca más barata del CSAT y de la tasa de reapertura a la vez: el usuario informado no llama dos veces y el usuario seguido no descubre solo que 'sigue roto'. Regla operativa: ningún ticket en curso supera 24 horas sin actualización, y toda promesa de contacto se cumple o se renegocia antes de vencer.",
    "example": "Ticket en espera del proveedor: escribes 'sigue con el proveedor, te escribo antes de las 17:00' y a las 16:45 escribes de nuevo, aunque la respuesta sea 'nada aún'. El usuario no llamó ni una sola vez."
  },
{
    "id": "seed-hd-empatia-tecnica",
    "term": "Empatía técnica (manejo del usuario frustrado)",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Reconocer la frustración antes de diagnosticar: primero validar el problema, luego técnica.",
    "longDefinition": "Habilidad blanda con impacto técnico medible: un usuario furioso describe mal el problema y sabotea el diagnóstico. La secuencia funciona: validar sin juzgar ('entiendo, en cierre de mes esto es grave'), hacerte cargo del caso (no del universo: 'esto lo llevo yo'), dar un marco de tiempo realista y solo entonces preguntar técnica. Lo que no funciona: abrir con '¿ha probado a reiniciar?', culpar a otro equipo delante del usuario o minimizar ('es solo un aviso'). El límite: empatía no es soportar abusos; el guion de incidente y el escalamiento jerárquico existen para los casos que escalan de tono.",
    "example": "El usuario grita que lleva 3 días sin imprimir: 'tres días sin imprimir en tu cierre, lo entiendo; hoy lo llevamos entre manos'. Baja el tono, te describe el error exacto y en 10 minutos lo tienes resuelto."
  },
{
    "id": "seed-hd-documentacion-del-ticket",
    "term": "Documentación del ticket (notas de trabajo)",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Notas de trabajo en el ticket: qué se probó, qué se encontró y qué falta: la memoria del caso.",
    "longDefinition": "Cada acción deja rastro: hora, qué comprobaste, resultado y siguiente paso. Su valor es triple: el compañero que tome el ticket no parte de cero, el escalamiento llega con contexto (Tier 3 odia los tickets desnudos) y el postmortem o el problema se construyen sobre tus notas. Estándar pragmático: primera nota con síntomas exactos y contexto; notas intermedias con comandos y resultados ('ping OK, servicio caído, reiniciado, persiste'); cierre con causa, solución y referencias (artículos, CI, número de cambio). 'Mirado, nada' no es una nota: es un insulto al siguiente turno.",
    "example": "Turno de noche: '14:20 reiniciado el servicio de impresión; 14:25 cola vacía y prueba con PDF correcta; pendiente: driver v4.11'. El de mañana escala a Tier 3 con 3 líneas y el caso avanza sin volver a llamar al usuario."
  },
{
    "id": "seed-hd-lenguaje-no-tecnico",
    "term": "Lenguaje no técnico (traducir para el usuario)",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Traducir el diagnóstico técnico a consecuencias y acciones que el usuario entiende y puede ejecutar.",
    "longDefinition": "El usuario no necesita que le expliques DNS: necesita saber que la dirección de internet del correo está tardando en responder y que tu equipo ya lo ve. La traducción tiene tres reglas: habla de efectos ('no puedes enviar ni recibir'), no de mecanismos; instrucciones numeradas paso a paso, sin siglas sin desempacar; y expectativa honesta en tiempo ('en 30 minutos te vuelvo a escribir'). El nivel de detalle depende de la audiencia: efectos al usuario final, algo más de fondo al usuario avanzado, impacto de negocio a la dirección. Frases prohibidas: 'es cosa de la red', 'está caído' sin contexto y 'ya sabes, lo de siempre'.",
    "example": "En lugar de 'el token expiró por desfase de reloj', dices: 'el reloj de tu portátil va desincronizado y eso confunde al sistema de seguridad; lo ajusto ahora, 2 minutos'."
  },
{
    "id": "seed-hd-confirmacion-de-cierre",
    "term": "Confirmación de cierre (closure confirmation)",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Verificar con el usuario que la solución funciona antes de cerrar el ticket.",
    "longDefinition": "El paso que separa 'resuelto' de 'cerrado': pedir al usuario confirmación explícita de que la solución funciona y ya puede trabajar. Reduce reaperturas (la causa número uno es cerrar sin verificar), blinda la calidad del dato de resolución y da al usuario el control final del caso. Si el usuario no responde, se cierra con política (auto-cierre a 3-5 días con aviso previo), nunca en silencio. La confirmación debe ser específica: no '¿ya está?' sino '¿puedes enviar el correo de prueba con el adjunto?'. Cerrar con confirmación alimenta métricas limpias; cerrar sin ella alimenta la tasa de reapertura.",
    "example": "Antes de cerrar escribes: '¿me confirmas que ya puedes abrir los adjuntos en Outlook?'. El usuario prueba, confirma, y cierras con 'resuelto y confirmado por el usuario' y la fecha."
  },
{
    "id": "seed-hd-reasignacion-vs-escalamiento",
    "term": "Reasignación vs escalamiento",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Reasignar: corregir la ruta (equipo equivocado); escalar: subir por conocimiento o autoridad.",
    "longDefinition": "La reasignación mueve el ticket a la cola correcta porque el intake lo mandó mal: no es subir, es enrutar de nuevo; idealmente ocurre en minutos y el reloj de SLA sigue desde el registro. El escalamiento (funcional) transfiere porque el equipo actual no tiene conocimiento o permisos: la diferencia real es la causa, 'no es mío' frente a 'no puedo'. Reasignaciones frecuentes del mismo servicio indican que el árbol de categorización está mal diseñado: cada rebote son minutos de MTTR y paciencia de usuario. Protocolo: al reasignar, nota breve del motivo y aviso al usuario para que no crea que su ticket viaja a la deriva.",
    "example": "Un ticket de 'no arranca la app de diseño' cae en la cola de redes: reasignación inmediata a soporte de estaciones con nota de 'intake erróneo'. El usuario no percibe escalamiento: solo una corrección de rumbo."
  },
{
    "id": "seed-hd-cola-y-carga",
    "term": "Cola de tickets y carga por analista",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Queue: bandeja del equipo trabajada por prioridad; carga: tickets activos por analista.",
    "longDefinition": "La cola es la bandeja del equipo: se trabaja por prioridad y antigüedad, no por orden de llegada ni por gustos. La carga es el número de tickets activos por analista y su sostenibilidad: 10 a 15 activos simultáneos es el rango manejable típico de Tier 1; por encima, el multitasking degrada el MTTR y vacía las notas. Gestionar la cola es repartir equilibrado, vigilar el envejecimiento y mover refuerzos cuando llega la ola. Las olas se predicen con el calendario (lunes a primera hora, cierre de mes, día de parche) y se absorben con autoservicio, no con heroísmo.",
    "example": "Lunes 09:00: 30 tickets en cola y 4 analistas; el coordinador reparte 7 u 8 por persona priorizando los 3 más viejos como foco del día y activa el aviso de 'tiempos altos' en el portal."
  },
{
    "id": "seed-hd-traspaso-de-turno",
    "term": "Traspaso de turno (shift handoff)",
    "category": "HelpDesk - Service Desk / ITSM",
    "shortDefinition": "Transferencia formal de la cola entre turnos: qué sigue abierto, qué vence y qué se prometió.",
    "longDefinition": "El cambio de turno es el momento de mayor riesgo de un service desk 24x7: lo que no se transmite, se pierde. El traspaso formal mínimo: tickets abiertos por prioridad con su último estado, los que están a menos de una hora del SLA, los compromisos con usuarios ('prometí escribir a las 16:00') y los incidentes mayores en curso con su enlace al bridge. Se hace por escrito (panel o plantilla) además de verbal: la memoria del compañero no es un sistema. Lo delata la métrica: reaperturas y tickets 'perdidos' tras cambios de turno. Buena señal de madurez: el usuario no nota que cambiaste de turno.",
    "example": "Traspaso de las 14:00: 'P1 del ERP en bridge (enlace), dos promesas de contacto a las 15:30, P3 de impresión listo para cerrar pendiente de confirmación'. El turno de tarde entra pisando firme, no adivinando."
  },
{
    "id": "seed-hd-event-viewer",
    "term": "Visor de eventos (Event Viewer)",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Consola de registro de Windows (eventvwr.msc): el primer sitio donde buscar la causa cuando algo falla.",
    "longDefinition": "Herramienta que centraliza los registros de Windows: Application (crashes de aplicaciones), System (controladores, servicios, disco) y Security (inicios de sesión, si hay auditoría activa). En soporte se usa para correlacionar la hora del incidente del usuario con errores concretos: filtrar por nivel Crítico y Error dentro de una ventana de tiempo. Casi todo deja rastro aquí: un BSOD, un servicio que no arranca, un crash de app o un reinicio inesperado. Ruta corta: Windows+R, eventvwr.msc, y Filtrar registro actual para acotar.",
    "example": "El equipo se reinició solo a las 14:32: abres eventvwr.msc, filtras el registro System por Crítico en esa ventana y aparece un Kernel-Power 41 justo después de un error de disco: ya tienes la pista del componente sospechoso."
  },
{
    "id": "seed-hd-servicios-windows",
    "term": "Servicios de Windows (services.msc)",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Procesos en segundo plano que corren sin sesión abierta; se gestionan con services.msc.",
    "longDefinition": "Un servicio es un proceso que arranca con el sistema y corre sin usuario conectado (cola de impresión, agente de Windows Update, motor del antivirus). Es la parada obligatoria cuando algo falla sin error visible: comprobar si está En ejecución, su tipo de inicio (Automático, Manual, Deshabilitado) y con qué cuenta corre. Reiniciar el servicio concreto suele resolver más rápido y con menos impacto que reiniciar el equipo entero, y es un fix documentable en el ticket. Si un servicio se cae de forma repetida, el registro de Application guarda el error del proceso.",
    "example": "El usuario no puede imprimir: abres services.msc, localizas Cola de impresión (Spooler), lo detienes, vacías C:\\Windows\\System32\\spool\\PRINTERS y lo arrancas de nuevo: la impresión vuelve sin reiniciar el equipo."
  },
{
    "id": "seed-hd-task-manager",
    "term": "Administrador de tareas (Task Manager)",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Panel en tiempo real de procesos, CPU, RAM y disco: la primera herramienta ante un equipo lento.",
    "longDefinition": "Ctrl+Shift+Esc: muestra los procesos con su consumo de CPU, memoria, disco y red, además de las aplicaciones de inicio y los usuarios conectados. Es el primer paso ante un equipo lento: ordenar por CPU o disco y ver qué proceso se está comiendo la máquina. Permite finalizar tareas colgadas, anotar el PID (para cruzar con eventvwr o taskkill) y distinguir si el problema es CPU, RAM agotada o disco al 100%. La pestaña Rendimiento da la vista de conjunto y Detalles da PID y usuario de cada proceso.",
    "example": "El portátil va lentísimo: Ctrl+Shift+Esc, ordenas por Disco y hay un proceso de indexado al 99%; lo finalizas, el equipo responde de nuevo y anotas el PID y el nombre del proceso en el ticket antes de investigar más."
  },
{
    "id": "seed-hd-device-manager",
    "term": "Administrador de dispositivos (Device Manager)",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Inventario de hardware y controladores (devmgmt.msc): los iconos amarillos delatan drivers rotos.",
    "longDefinition": "Muestra todo el hardware por categorías (red, gráfica, audio, USB) y el estado de sus controladores. El triángulo amarillo significa dispositivo con error, con su código visible en Propiedades; los Dispositivos desconocidos suelen ser drivers faltantes. Usos típicos en soporte: desinstalar y reinstalar un driver problemático, actualizar o revertir controlador, deshabilitar un dispositivo conflictivo y comprobar si el Wi-Fi o el Bluetooth aparece siquiera, que distingue fallo hardware de fallo de driver.",
    "example": "Sin Wi-Fi tras una actualización: devmgmt.msc, el adaptador inalámbrico con triángulo amarillo y código 10 en Propiedades; usas Revertir al controlador anterior y la red vuelve en el acto, con la actualización anotada como causa."
  },
{
    "id": "seed-hd-administrador-de-discos",
    "term": "Administrador de discos (diskmgmt.msc)",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Gestión de particiones y volúmenes: letras de unidad, discos sin conexión y espacio sin asignar.",
    "longDefinition": "Consola de particionado de Windows: asignar letras de unidad, formatear, extender o reducir volúmenes y ver el estado de cada disco (En línea, Sin conexión, Solo lectura). Es la parada típica cuando el disco nuevo no aparece o la unidad D ha desaparecido: casi siempre es letra sin asignar o disco Sin conexión. También muestra si el disco es MBR o GPT y si tiene BitLocker activo. Precaución: formatear o borrar volúmenes es destructivo e irreversible, así que se confirma dos veces y con respaldo del usuario.",
    "example": "Un disco USB de 1 TB no aparece en el Explorador: diskmgmt.msc lo muestra En línea pero sin letra; clic derecho en el volumen, Agregar letra de unidad, y el disco aparece con sus datos intactos."
  },
{
    "id": "seed-hd-apps-de-inicio",
    "term": "Aplicaciones de inicio (startup)",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Programas que arrancan con la sesión; su exceso explica gran parte de los equipos lentos de arranque.",
    "longDefinition": "Apps que se cargan al iniciar sesión; desde Windows 10 se gestionan en la pestaña Inicio del Administrador de tareas (ya no en MSConfig). Cada entrada muestra su impacto en el inicio según lo que consume al arrancar. Deshabilitar lo que no aporta (actualizadores, helpers de impresora, barras de utilidades) es el fix más barato para arranques lentos, sobre todo en equipos con disco HDD. Ojo: hay entradas por Registro (las claves Run de HKLM y HKCU) y por la carpeta de Inicio del menú que la pestaña no siempre lista.",
    "example": "Portátil que tarda 6 minutos en ser utilizable: Inicio en el Administrador de tareas muestra 14 apps de alto impacto; deshabilitas actualizadores y helpers y el arranque baja a la mitad sin tocar hardware."
  },
{
    "id": "seed-hd-registro-windows",
    "term": "Registro de Windows (regedit)",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Base de datos central de configuración de Windows y apps: claves y valores que gobiernan casi todo.",
    "longDefinition": "Estructura jerárquica de claves y valores donde Windows y las aplicaciones guardan su configuración. En soporte se usa para cambios puntuales documentados (borrar una clave huérfana, verificar un valor de directiva, entradas Run de inicio), nunca para explorar a ciegas: un cambio errado puede dejar el equipo sin arrancar. Regla de oro: exportar la clave antes de tocar (clic derecho, Exportar) para poder restaurarla con doble clic si sale mal. Los cambios aplican sin reiniciar, y muchos ajustes sin interfaz gráfica solo se cambian aquí.",
    "example": "Una app desinstalada sigue lanzándose al inicio: regedit, navegas a HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run, exportas la rama por seguridad y borras solo el valor de esa app."
  },
{
    "id": "seed-hd-hklm-vs-hkcu",
    "term": "HKLM vs HKCU",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Configuración de toda la máquina (HKLM) frente a la del usuario concreto (HKCU): quién ve el cambio.",
    "longDefinition": "HKLM (HKEY_LOCAL_MACHINE) aplica al equipo entero y requiere permisos de administrador; HKCU (HKEY_CURRENT_USER) es la configuración del usuario con sesión iniciada y viaja con su perfil. La misma clave puede existir en ambos y, para ese usuario, suele ganar la de HKCU. En soporte esta distinción orienta el diagnóstico: si el problema solo le pasa a un usuario, la causa vive en su HKCU o en su perfil; si le pasa a todos los que usan el equipo, está en HKLM. Con HKLM se va con más cuidado todavía porque afecta a servicios y al arranque.",
    "example": "La app de firma de correo falla solo en un usuario: comparas su rama HKCU\\Software de esa app contra la de un usuario sano, ves un valor corrupto y lo corriges en su HKCU sin arriesgar HKLM para el resto."
  },
{
    "id": "seed-hd-gpedit",
    "term": "Editor de directivas de grupo locales (gpedit.msc)",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Directivas de la máquina local sin dominio (gpedit.msc): ajustes que Windows aplica y re-aplica.",
    "longDefinition": "Versión local de las directivas de grupo: configura políticas de seguridad y comportamiento del propio equipo sin necesidad de dominio. En soporte sirve para desbloquear ajustes capados por directiva local (Windows Update desactivado, opciones de antivirus o Edge bloqueadas) o para imponer uno puntual en un equipo concreto. Limitaciones: solo ediciones Pro y Enterprise (no Home), y una directiva local no se va sola: hay que devolverla a No configurada. En equipos de dominio las GPO del dominio prevalecen sobre las locales: si algo sigue capado tras tocar gpedit, el origen es el dominio.",
    "example": "Un equipo Pro tiene Windows Update deshabilitado por una directiva local que dejó una prueba: gpedit.msc, Configuración de equipo, Plantillas administrativas, Componentes de Windows, Windows Update; pones la directiva en No configurada y el equipo vuelve a actualizarse."
  },
{
    "id": "seed-hd-msconfig",
    "term": "MSConfig (Configuración del sistema)",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Panel de arranque selectivo y servicios (msconfig): la herramienta para aislar qué rompe el equipo.",
    "longDefinition": "Herramienta clásica de diagnóstico de arranque. En Arranque selectivo puedes desactivar los servicios de terceros y los elementos de inicio: si el equipo queda estable, la causa es del software del fabricante y no de Windows. La pestaña Servicios, con Ocultar todos los servicios de Microsoft marcado, permite deshabilitar en lote los de terceros para triangular cuál falla. La pestaña Arranque incluye Arranque seguro, que mete el equipo en modo seguro en el siguiente reinicio. Hoy las apps de inicio viven en el Administrador de tareas: MSConfig queda para arranque y servicios.",
    "example": "Pantallazos azules aleatorios desde que se instaló una suite de seguridad: msconfig, Arranque selectivo sin servicios de terceros; el equipo queda estable un día y vas reactivando por mitades hasta dar con el servicio culpable."
  },
{
    "id": "seed-hd-sfc",
    "term": "SFC /scannow",
    "acronym": "SFC",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Comando que verifica y repara los archivos del sistema: primera línea ante corrupción de Windows.",
    "longDefinition": "System File Checker escanea los binarios de Windows contra el almacén de componentes y restaura los dañados. Se ejecuta en una consola elevada con sfc /scannow; la variante /verifyonly solo informa sin cambiar nada, y desde WinRE se puede lanzar contra un Windows que ni siquiera arranca. Síntomas que lo justifican: menú Inicio roto, apps de Windows que no abren, errores raros de DLL tras una actualización. Si SFC reporta corrupción que no puede reparar, el almacén está dañado: se pasa DISM RestoreHealth primero y se repite SFC.",
    "example": "La Configuración se abre en blanco y el menú Inicio casca: consola elevada, sfc /scannow detecta y repara 8 archivos, y tras reiniciar todo vuelve a responder."
  },
{
    "id": "seed-hd-dism",
    "term": "DISM (RestoreHealth)",
    "acronym": "DISM",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Repara el almacén de componentes de Windows: el fix cuando SFC no puede arreglar la corrupción.",
    "longDefinition": "DISM mantiene el almacén de componentes del que SFC toma los archivos sanos. La poción de soporte es DISM /Online /Cleanup-Image /RestoreHealth en consola elevada: descarga o repara los componentes y deja el almacén utilizable; después se repite sfc /scannow para cerrar la reparación. Con /CheckHealth y /ScanHealth se diagnostica sin cambiar nada. Es la escalada natural por niveles: SFC falla, DISM RestoreHealth, SFC de nuevo; si la corrupción persiste, toca actualización in-place o restablecer el equipo.",
    "example": "sfc /scannow insiste en corrupción irreparable: ejecutas DISM /Online /Cleanup-Image /RestoreHealth (unos 20 minutos), repites sfc /scannow y sale limpio: Windows reparado sin reinstalar nada."
  },
{
    "id": "seed-hd-chkdsk",
    "term": "CHKDSK",
    "acronym": "CHKDSK",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Comprobación de disco y sistema de archivos: repara metadatos y marca sectores defectuosos.",
    "longDefinition": "Verifica el sistema de archivos y la superficie del disco: repara errores de metadatos (índices, tablas) y marca los sectores dañados para que no se usen. Formato práctico: chkdsk D: /f repara el volumen; añadir /r incluye la búsqueda de sectores defectuosos (mucho más lento); si es el disco del sistema, pide programarse al reinicio. Señales que lo piden: errores de estructura en el Visor de eventos, carpetas que desaparecen o discos con clics. Si reporta sectores defectuosos en aumento, el dato manda: respaldo inmediato y escalamiento a reemplazo de hardware.",
    "example": "Una carpeta de fotos quedó inaccesible: chkdsk D: /f repara los índices y el acceso vuelve; como reportó 4 KB en sectores defectuosos, marcas el ticket para seguimiento del estado del disco."
  },
{
    "id": "seed-hd-bitlocker",
    "term": "BitLocker",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Cifrado de disco completo integrado en Windows: un disco robado y cifrado no expone los datos.",
    "longDefinition": "Cifra el volumen completo del sistema o de datos; con TPM el arranque es transparente para el usuario porque el chip libera la clave solo si el entorno de arranque no ha cambiado. En soporte aparece en dos momentos: comprobar el estado (manage-bde -status o el panel de BitLocker del Explorador) y atender bloqueos, porque el equipo puede pedir la clave de recuperación tras un cambio de firmware, un TPM desactivado o una reparación de placa. Para el negocio, BitLocker cambia la categoría del incidente: un portátil robado cifrado es pérdida de hardware, no fuga de datos.",
    "example": "Roban el portátil de un comercial: verificas en el ticket que manage-bde -status reportaba cifrado activo; con BitLocker en marcha el dato no se expone y el incidente se trata como pérdida de equipo, no como brecha."
  },
{
    "id": "seed-hd-bitlocker-clave-recuperacion",
    "term": "Clave de recuperación de BitLocker",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Clave de 48 dígitos que desbloquea el disco cuando el TPM no libera la clave de cifrado.",
    "longDefinition": "Se genera al activar BitLocker y debe custodiarse fuera del equipo (en entornos gestionados, en Entra ID o en AD). Es la única vía cuando el arranque la pide en pantalla: cambios de TPM o firmware, arranque desde otro medio o reparaciones de placa. El flujo de soporte: pedir al usuario el identificador de clave de 8 caracteres que muestra la pantalla, buscarla en el portal de administración, teclear los 48 dígitos y, ya dentro, investigar qué la disparó para evitar que se repita. Si no está custodiada, el dato es irrecuperable: no existe puerta trasera.",
    "example": "Tras un cambio de placa el portátil pide la clave de recuperación con identificador 1A2B3C4D: la buscas por ese identificador en el portal de Entra, la introduces, el equipo arranca y documentas la causa para el nuevo TPM."
  },
{
    "id": "seed-hd-tpm",
    "term": "TPM (módulo de plataforma de confianza)",
    "acronym": "TPM",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Chip que custodia claves criptográficas ancladas al hardware: la base de BitLocker y Windows Hello.",
    "longDefinition": "Trusted Platform Module: chip criptográfico de la placa que guarda claves y mide el estado del arranque. BitLocker deposita en él su clave y solo la libera si las mediciones de arranque no han cambiado; Windows Hello también se apoya en él para proteger sus claves. Se administra con tpm.msc o el cmdlet Get-Tpm (habilitar, borrar, tomar propiedad). Los escenarios de soporte típicos: TPM desactivado en BIOS tras un reset de fábrica, firmware actualizado que cambia las mediciones y dispara la clave de recuperación de BitLocker, y placas nuevas con el chip limpio que hay que re-provisionar.",
    "example": "El equipo pide clave de BitLocker en cada arranque desde que se actualizó la BIOS: el firmware cambió las mediciones del TPM; introduces la clave, verificas con tpm.msc que el chip sigue operativo y documentas el patrón."
  },
{
    "id": "seed-hd-bsod",
    "term": "BSOD (pantalla azul)",
    "acronym": "BSOD",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Cuelgue fatal del kernel: Windows se detiene y muestra la pantalla azul con un código de error.",
    "longDefinition": "Blue Screen of Death: el kernel encuentra un error irrecuperable (controlador, hardware, memoria) y detiene el sistema para proteger los datos. Para L1 lo crítico es recoger bien el síntoma: qué hacía el usuario, si es aleatorio o empezó tras un cambio (update, software nuevo), y el código que muestra la pantalla. Algunos patrones útiles: DRIVER_IRQL_NOT_LESS_OR_EQUAL apunta a controlador, MEMORY_MANAGEMENT a RAM, NTFS_FILE_SYSTEM y KERNEL_DATA_INPAGE_ERROR a disco, VIDEO_TDR_FAILURE a la gráfica. Un BSOD aislado se vigila; los recurrentes piden minidumps y escalamiento.",
    "example": "Tres pantallas azules en dos días desde un update de gráficos: pides foto del BSOD, anotas el código VIDEO_TDR_FAILURE en el ticket y preparas la revertida del controlador como siguiente paso."
  },
{
    "id": "seed-hd-stop-code-minidump",
    "term": "Código de parada (stop code) y minidump",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "El código del BSOD dice qué falló; el minidump es el volcado que permite confirmarlo y analizarlo.",
    "longDefinition": "El código de parada es la etiqueta del error fatal (por ejemplo PAGE_FAULT_IN_NONPAGED_AREA): aparece en pantalla y también en el Visor de eventos como BugCheck, y orienta la causa aunque no la prueba. El minidump es el volcado pequeño que Windows escribe en C:\\Windows\\Minidump: contiene el estado del crash y, en la mayoría de los casos, el módulo culpable. Con BlueScreenView o WinDbg se ve qué controlador firma el error en el stack. Conviene verificar que el sistema esté configurado para escribir minidumps (Configuración de inicio y recuperación) y adjuntar el archivo al escalar.",
    "example": "BSOD recurrente DPC_WATCHDOG_VIOLATION: abres C:\\Windows\\Minidump con BlueScreenView y todos los volcados apuntan al mismo controlador NVMe; reviertes su versión y los pantallazos cesan."
  },
{
    "id": "seed-hd-modo-seguro",
    "term": "Modo seguro (Safe Mode)",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Arranque mínimo con drivers y servicios esenciales: el campo de pruebas para aislar causas de software.",
    "longDefinition": "Windows arranca solo con controladores y servicios básicos, sin software de terceros ni la mayoría de drivers. Es una prueba de diagnóstico en sí misma: si el problema desaparece en modo seguro, la causa es software o controlador de terceros; si persiste, apunta a hardware o al propio Windows. Se entra manteniendo Shift al pulsar Reiniciar, desde Configuración de inicio, o marcando Arranque seguro en la pestaña Arranque de msconfig. Sirve para desinstalar la app que bloquea el arranque normal, pasar sfc /scannow o limpiar infecciones que se resisten con el sistema en marcha.",
    "example": "El equipo se congela a los dos minutos de iniciar sesión: en modo seguro se comporta estable, así que desinstalas la suite de seguridad actualizada ayer desde Panel de control y el arranque normal queda limpio."
  },
{
    "id": "seed-hd-restaurar-sistema",
    "term": "Restaurar sistema y punto de restauración",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Devuelve el registro y los archivos del sistema a un punto anterior sin tocar los datos del usuario.",
    "longDefinition": "Restaurar sistema toma instantáneas del registro y de archivos de sistema (puntos de restauración) que Windows crea automáticamente antes de cambios relevantes como updates, drivers o instalaciones. La restauración se lanza con rstrui.exe y devuelve el sistema a ese punto: NO borra los documentos del usuario, pero los programas y controladores instalados después del punto suelen quedar inservibles y hay que reinstalarlos. Es la vía rápida cuando un update o un driver rompen arranque o sesión, mucho más barata que una reparación in-place. Requisito: la función debe estar activada y con puntos recientes.",
    "example": "Un update de audio dejó el equipo sin sonido y con cuelgues: ejecutas rstrui.exe, eliges el punto de tres días antes, el sonido vuelve al reiniciar y documentas la KB implicada para el reporte."
  },
{
    "id": "seed-hd-windows-update",
    "term": "Windows Update",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "El motor de parches de Windows: acumulativos mensuales, drivers y features, con reinicio pendiente.",
    "longDefinition": "Servicio que descarga e instala actualizaciones de seguridad y calidad (el acumulativo mensual del Patch Tuesday, segundo martes), además de controladores y actualizaciones opcionales. La rutina de soporte: comprobar que el equipo está al día (Configuración, Windows Update, Buscar actualizaciones), revisar el historial cuando algo se rompe justo tras un parche, y gestionar los reinicios pendientes, porque hasta que el reinicio no se completa el parche no está aplicado. Los problemas típicos: descargas atascadas (se resuelven limpiando la caché de SoftwareDistribution) y features que no llegan por compatibilidad o por anillo de despliegue.",
    "example": "Seguridad reporta un equipo sin el parche del mes: Configuración, Windows Update, Buscar actualizaciones; el acumulativo instala, se fuerza el reinicio avisando al usuario y el ticket se cierra con la KB aplicada."
  },
{
    "id": "seed-hd-anillo-actualizacion",
    "term": "Canal o anillo de actualización (ring)",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Agrupaciones de despliegue gradual: el anillo de validación recibe el parche antes que la flota entera.",
    "longDefinition": "Las organizaciones no parchean todo a la vez: dividen los equipos en anillos o canales (validación, ampliado, general) para que un parche defectuoso afecte a pocos antes que a todos. Windows Insider tiene sus propios canales (Dev, Beta, Release Preview) y en flotas gestionadas los anillos se definen con WSUS, Intune o directivas de aplazamiento. Para soporte importa al responder por qué este equipo aún no tiene el parche o la feature nueva: casi siempre es el anillo, no un fallo del equipo. Y al escalar una incidencia post-parche, el anillo del usuario indica cuánta flota está expuesta al mismo problema.",
    "example": "Preguntas por la cobertura del parche del mes: consultas el anillo de cada equipo afectado y reportas que la mitad está en el anillo ampliado con despliegue programado a 7 días: es cobertura diferida, no un bloqueo."
  },
{
    "id": "seed-hd-historial-actualizaciones-wusa",
    "term": "Historial de actualizaciones y desinstalación (wusa)",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Listado de qué KB se instaló y cuándo, y el comando wusa para retirar la actualización que rompió algo.",
    "longDefinition": "El historial de actualizaciones (Configuración, Windows Update, Historial de actualizaciones) muestra cada KB con su fecha: es el primer cruce temporal cuando un incidente empezó justo después del parche. Si la KB es la culpable, se retira desde el propio historial o en consola elevada con wusa /uninstall /kb:XXXXXXX /quiet /norestart. Mientras se investiga, conviene pausar actualizaciones y avisar al equipo de parcheo para frenar el anillo antes de que llegue al resto. Los controladores también aparecen en el historial y se revierten igual o desde el Administrador de dispositivos.",
    "example": "Tres tickets de impresión rota, todos empezados el jueves: el historial de un equipo afectado muestra la KB del miércoles; wusa /uninstall /kb:5041585 /norestart la retira, la impresión vuelve y avisas a parcheo para frenar el anillo."
  },
{
    "id": "seed-hd-perfil-usuario",
    "term": "Perfil de usuario",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Carpeta y configuración personal de cada usuario en C:\\Users: escritorio, AppData y su NTUSER.DAT.",
    "longDefinition": "Todo lo que hace que una sesión sea de esa persona: las carpetas (Escritorio, Documentos, AppData con la configuración de las apps) y el archivo NTUSER.DAT, que es su registro HKCU montado al iniciar sesión. Windows lo gestiona con la rama ProfileList del registro y crea un perfil por cuenta y equipo, salvo perfiles itinerantes. Entenderlo evita el clásico borrar y recrear, que pierde configuración y datos de AppData (a veces correo o favoritos locales). Conviene distinguir qué vive en el perfil de qué está en OneDrive o en la red antes de tocar nada.",
    "example": "Un usuario nuevo no ve sus archivos: resulta que inició con otra cuenta y su perfil es C:\\Users\\ana.lopez; sus datos siguen en su carpeta original y no hace falta recrear nada, solo aclarar con qué cuenta debe iniciar sesión."
  },
{
    "id": "seed-hd-perfil-danado-temporal",
    "term": "Perfil de usuario dañado y perfil temporal",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Cuando el perfil no carga, Windows firma en un perfil temporal: lo que se guarde ahí se pierde al salir.",
    "longDefinition": "Síntoma clásico: el usuario inicia sesión y encuentra el escritorio vacío con el aviso de perfil temporal. Causas habituales: NTUSER.DAT dañado, entrada corrupta o duplicada en ProfileList (SIDs con sufijo .bak) o un apagado incorrecto que dejó el perfil bloqueado. Diagnóstico: errores del servicio User Profile Service en el Visor de eventos y la rama ProfileList del registro. Fix conservador: corregir la entrada del registro y renombrar la carpeta del perfil para que Windows la regenere, migrando después los datos que importan (Escritorio, Documentos, AppData clave). Regla de oro con el usuario: no guardar nada mientras esté en sesión temporal.",
    "example": "Usuario con perfil temporal: eventvwr muestra errores del User Profile Service; en ProfileList encuentras su SID duplicado con .bak, corriges la entrada, renombras su carpeta a .old para regenerarla y devuelves Escritorio, Documentos y el AppData imprescindible."
  },
{
    "id": "seed-hd-lusrmgr",
    "term": "Usuarios y grupos locales (lusrmgr.msc)",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Cuentas y grupos del propio equipo (lusrmgr.msc): quién es administrador local y quién no.",
    "longDefinition": "Consola de las cuentas locales: crear usuarios, restablecer contraseñas locales y administrar membresías de grupos (Administradores, Usuarios, Invitados). Es la respuesta a quién es administrador en este equipo y la vía para dar o quitar privilegios locales a un usuario concreto sin tocar el dominio. La cuenta Administrador local viene deshabilitada por defecto y su contraseña debe gestionarse con LAPS en entornos gestionados, nunca fijarla a mano. En equipos de dominio la membresía local se controla con directivas o grupos restringidos: lusrmgr es la vista puntual. No está en Windows Home.",
    "example": "Un usuario de campo necesita instalar software puntualmente: lusrmgr.msc, grupo Administradores, Agregar, su cuenta de dominio, cerrar sesión y volver; queda documentado en el ticket con fecha de retirada prevista."
  },
{
    "id": "seed-hd-uac",
    "term": "UAC (Control de cuentas de usuario)",
    "acronym": "UAC",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "El aviso que pide confirmación o contraseña de administrador antes de que algo se ejecute con privilegios.",
    "longDefinition": "User Account Control ejecuta las sesiones con permisos normales aunque el usuario sea administrador, y eleva solo cuando algo lo pide: el diálogo con el escudo. Su propósito es que los cambios de sistema no ocurran en silencio. En soporte aparece como el usuario estándar al que se piden credenciales de administrador para instalar (el flujo over-the-shoulder: su cuenta normal y las credenciales de una cuenta admin solo para ese acto), y como apps que piden elevación constante. El nivel del aviso se ajusta en el panel de UAC: bajarlo al mínimo es mala práctica, no un fix.",
    "example": "Un usuario estándar no puede instalar su app de diseño: en el diálogo de UAC introduces las credenciales de la cuenta de soporte (over-the-shoulder), la instalación prosigue y su cuenta sigue siendo estándar para todo lo demás."
  },
{
    "id": "seed-hd-ejecutar-como-administrador",
    "term": "Ejecutar como administrador (elevación)",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Lanzar un proceso con privilegios elevados: obligatorio para sfc, DISM, chkdsk e instalar software.",
    "longDefinition": "La acción de elevar un programa: clic derecho sobre el ejecutable o acceso directo y Ejecutar como administrador, o lanzarlo desde una consola ya elevada. Sin elevación, tareas como sfc /scannow, DISM, chkdsk del disco de sistema o ciertas instalaciones fallan con acceso denegado, o peor, fallan en silencio y parece que no hicieron nada. Saber si una consola está elevada es oficio: el título dice Administrador, o whoami /groups lo confirma. Regla práctica: elevar solo la tarea concreta, no trabajar todo el día con todo elevado, porque cualquier error o malware tendría privilegios máximos.",
    "example": "Un script de mapeo falla con acceso denegado aunque el usuario es administrador: abres la consola con clic derecho, Ejecutar como administrador (el título cambia a Administrador) y el mismo script corre sin errores."
  },
{
    "id": "seed-hd-pagefile",
    "term": "Archivo de paginación (pagefile.sys)",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Memoria de reserva en disco que Windows usa al agotarse la RAM (pagefile.sys).",
    "longDefinition": "Archivo en el que Windows pagina memoria cuando la RAM física se llena; sin él o mal dimensionado, las apps fallan con memoria insuficiente aunque la RAM parezca libre. Se configura en Configuración avanzada del sistema, Rendimiento, Memoria virtual, y lo habitual es dejarlo gestionado por el sistema. En soporte: equipo lento con RAM al 100% y disco activo es paginación masiva (menos apps abiertas o más RAM), quejas de apps que citan pagefile, y el detalle de que los volcados de memoria de los BSOD dependen de esta configuración. Nunca se borra a mano: se gestiona desde el diálogo.",
    "example": "El Excel dice que no hay memoria: el Administrador de tareas muestra RAM al 97% y el disco saturado por paginación; cierras el navegador con 40 pestañas y anotas en el ticket que 8 GB son justos para ese perfil de uso."
  },
{
    "id": "seed-hd-liberador-espacio",
    "term": "Liberador de espacio en disco y Storage Sense",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Limpieza clásica de espacio (cleanmgr) más el automatismo moderno de Storage Sense.",
    "longDefinition": "El Liberador de espacio en disco (cleanmgr, o Propiedades del disco) limpia temporales, caché de Windows Update y Papelera con selección manual; su opción Limpiar archivos del sistema añade versiones antiguas de Windows y restos de updates, que a veces liberan varios GB. Storage Sense (Configuración, Sistema, Almacenamiento) automatiza esa limpieza en segundo plano: Papelera a los 30 días, temporales y descargas si se configura. Son el fix del disco lleno, causa frecuente de updates que no instalan, respaldos que fallan y equipos lentos. Antes de vaciar la Papelera, confirmar con el usuario: puede haber borrado algo por error que aún quiere.",
    "example": "Disco C al 98% y el update no cabe: cleanmgr con Limpiar archivos del sistema libera 14 GB entre Windows.old y actualizaciones antiguas; activas Storage Sense para que no vuelva a suceder y el update instala."
  },
{
    "id": "seed-hd-archivos-temporales",
    "term": "Archivos temporales (%temp%)",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Archivos de trabajo de apps e instaladores en la carpeta %temp%: primera limpieza cuando falta espacio.",
    "longDefinition": "Las aplicaciones escriben temporales en %temp%, que apunta a C:\\Users\\usuario\\AppData\\Local\\Temp, y los instaladores a menudo no los borran: se acumulan gigas. Provocan dos quejas clásicas: disco lleno e instaladores que fallan reutilizando temporales corruptos de intentos anteriores. Limpieza segura: cerrar apps, Win+R, escribir %temp%, seleccionar todo y borrar; lo que esté en uso se salta sin drama. La carpeta de sistema (C:\\Windows\\Temp) requiere consola elevada. Storage Sense y cleanmgr cubren esto de forma automática; la manual es para triage puntual en el ticket.",
    "example": "Casi sin espacio en C y lentitud general: Win+R, %temp%, 6 GB de temporales de instaladores viejos; los borras (algunos en uso se omiten), reinicias el Explorador y ganas espacio visible sin tocar los documentos del usuario."
  },
{
    "id": "seed-hd-appwiz",
    "term": "Programas y características (appwiz.cpl)",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "El panel clásico de desinstalar y reparar programas (appwiz.cpl): qué hay instalado y desde cuándo.",
    "longDefinition": "La vista veterana del software instalado (la moderna es Configuración, Aplicaciones; la clásica se abre con appwiz.cpl). Se usa para desinstalar la app conflictiva, usar su reparación integrada cuando el instalador la ofrece (Cambiar o Reparar), y ver tamaño y fecha de instalación, útil para correlacionar falla desde que instalé X. El registro de desinstalación vive en HKLM, bajo SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall. Para desinstalaciones masivas o silenciosas hay herramientas específicas, pero appwiz sigue siendo el estándar manual de L1.",
    "example": "La app de VPN se abre y se cierra al instante: appwiz.cpl, seleccionas la VPN, su entrada ofrece Cambiar, la reparas con las conexiones intactas y la app vuelve a funcionar sin reinstalar desde cero."
  },
{
    "id": "seed-hd-reparacion-office",
    "term": "Reparación de Office (Quick / Online Repair)",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Reparación integrada de Office: Quick Repair (local y rápida) u Online Repair (reinstala desde la nube).",
    "longDefinition": "Office trae su propio mecanismo de reparación: desde appwiz.cpl, sobre la entrada de Microsoft 365 u Office, la opción Cambiar ofrece Quick Repair, que repara archivos y claves locales en minutos, y Online Repair, que reinstala la suite en línea de forma más agresiva y completa. Es el paso estándar ante Outlook que no abre, Word que casca al guardar, add-ins rotos o problemas de activación: Quick primero y Online si reincide. Online Repair respeta los documentos del usuario, pero pide reautenticar la cuenta Microsoft o 365, así que hay que tener las credenciales a mano. Reiniciar Office no arregla una instalación dañada.",
    "example": "Outlook se cierra al abrir adjuntos: appwiz.cpl, Office, Cambiar, Quick Repair en 10 minutos; como reincide al día siguiente, repites con Online Repair y el problema desaparece sin reinstalar desde cero."
  },
{
    "id": "seed-hd-activacion-windows",
    "term": "Activación de Windows",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Validación de la licencia con Microsoft: sin activar hay marca de agua y personalizaciones bloqueadas.",
    "longDefinition": "La activación vincula la licencia (clave o licencia digital) a ese hardware y, en equipos de consumo, a la cuenta Microsoft. Estados: activado; no activado (marca de agua en el escritorio y sin personalización); y activado con licencia digital vinculada a la cuenta. En soporte: tras cambiar de placa el equipo suele perder la activación, y el Solucionador de problemas de activación la recupera con la opción de cambio de hardware si estaba vinculada a la cuenta. En corporativo la activación es por volumen (KMS o claves ADBA) y las incidencias se escalan al equipo de licencias; slmgr /xpr muestra el estado. Claves de dudosa procedencia son incidencia de licenciamiento, no de soporte.",
    "example": "Un portátil con placa nueva muestra Activar Windows: ejecutas el Solucionador de problemas de activación (Configuración, Sistema, Activación), marcas la opción de cambio de hardware, la licencia digital de la cuenta del usuario se reaplica y queda activado."
  },
{
    "id": "seed-hd-rdp",
    "term": "RDP (Escritorio remoto, mstsc)",
    "acronym": "RDP",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Protocolo de Microsoft para tomar control gráfico de otro Windows (mstsc): la base del soporte remoto.",
    "longDefinition": "Remote Desktop Protocol conecta a la sesión gráfica de otro Windows: mstsc es el cliente, y el equipo destino necesita Windows Pro o Enterprise con Escritorio remoto habilitado. Es la herramienta base del soporte remoto: ver lo que ve el usuario, reproducir el error en su contexto y aplicar el fix sin desplazarse. Detalles operativos: al conectarte tomas su sesión (no la compartes), se necesitan credenciales válidas y el puerto 3389 salvo redirección, y el acceso desde fuera suele pasar por VPN o gateway corporativo. Con el usuario delante, se avisa antes de tomar la pantalla.",
    "example": "Incidencia en una sucursal: mstsc contra el nombre del equipo del usuario por la red interna, te autentificas con tu cuenta de soporte, reproduces el fallo de impresión en su sesión y lo corriges sin desplazarte; cierras y su escritorio queda intacto."
  },
{
    "id": "seed-hd-smb-carpetas-unidades",
    "term": "SMB (carpetas compartidas y unidades de red mapeadas)",
    "acronym": "SMB",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Protocolo de archivos e impresoras de red: shares por UNC y unidades mapeadas con net use.",
    "longDefinition": "Server Message Block es el protocolo con el que Windows comparte carpetas, imprime en red y accede a servidores de archivos: puertos 445 (directo) y 139 (legacy), y direcciones UNC del estilo \\\\servidor\\recurso. La carpeta compartida (share) es el recurso publicado, y sus permisos de recurso compartido se combinan con los NTFS de la carpeta. La unidad de red mapeada es ese mismo share montado como letra (Z:) para que usuarios y apps lo usen como disco local: se crea desde el Explorador o con net use Z: \\\\servidor\\recurso /persistent:yes. Los mapeos son por usuario y suelen romperse por credenciales cacheadas o por falta de conectividad al servidor.",
    "example": "El usuario pierde la unidad Z: cada mañana: net use muestra el mapeo fallido; lo borras con net use Z: /delete, reconectas con net use Z: \\\\fs01\\contabilidad /persistent:yes usando sus credenciales de dominio y queda estable."
  },
{
    "id": "seed-hd-permisos-ntfs",
    "term": "Permisos NTFS (y herencia)",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "ACL de cada carpeta y archivo: quién puede leer o escribir; la herencia propaga los permisos del padre.",
    "longDefinition": "Cada carpeta y archivo NTFS lleva su lista de permisos: usuarios y grupos con permitir o denegar sobre leer, escribir, modificar o control total. La herencia hace que una subcarpeta reciba los permisos de su padre: se gestiona en Propiedades, Seguridad, Avanzadas, donde se puede desactivar la herencia y convertir los permisos heredados en explícitos. Dos reglas de oro: denegar gana a permitir (úsalo con pinzas, es fuente de accesos imposibles inexplicables), y los permisos efectivos de un usuario se comprueban con Acceso efectivo. Un denegar accidental heredado por una rama entera es incidencia clásica de L2.",
    "example": "Todo el equipo sin acceso a una carpeta de proyecto: en Seguridad, Avanzadas aparece un Denegar a Todos heredado por error desde la carpeta padre; quitas el denegar, la herencia reaplica los permisos correctos y el acceso se restablece."
  },
{
    "id": "seed-hd-share-vs-ntfs",
    "term": "Permisos de recurso compartido (share) vs NTFS",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Al acceder por red aplican dos capas, share y NTFS: el resultado es siempre el más restrictivo de ambas.",
    "longDefinition": "Por SMB, Windows evalúa primero los permisos del recurso compartido (quién entra al share: Lectura, Cambio o Control total) y después los NTFS (qué puede hacer dentro). El acceso final es la intersección: gana lo más restrictivo de las dos capas. El patrón recomendado, y que evita tickets, es dar Control total en el share a Usuarios autenticados y restringir con detalle en NTFS, para tener una sola capa que administrar. En el diagnóstico, el truco es el acceso local: sentado en el servidor solo aplican los NTFS, así que si en local funciona y por red no, la capa share es la sospechosa.",
    "example": "Un usuario ve la carpeta de marketing pero no puede guardar: el share da solo Lectura a su grupo aunque NTFS le permite Modificar; pones Control total en el share (la restricción real sigue en NTFS) y ya puede guardar."
  },
{
    "id": "seed-hd-usuarios-dominio-vs-local",
    "term": "Usuarios del dominio vs usuarios locales",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Membresía local (el equipo) frente a membresía de dominio (el directorio): de dónde sale cada credencial.",
    "longDefinition": "En un equipo unido al dominio conviven cuentas locales (la SAM del propio equipo) y cuentas de dominio (el AD). El grupo local Usuarios contiene por defecto a Usuarios del dominio, y por eso cualquier cuenta del dominio puede iniciar sesión en cualquier equipo unido; el grupo local Administradores es el que se audita para saber quién tiene privilegios en cada máquina. En soporte: distinguir DOMINIO\\usuario de EQUIPO\\usuario, entender que una cuenta local sirve aunque el dominio esté caído (clave para emergencias), y detectar cuentas de dominio metidas en Administradores local fuera de política.",
    "example": "Con el AD caído, el usuario no inicia sesión en su portátil (cuenta de dominio sin credenciales cacheadas) y la cuenta local de soporte sí entra: la usas para trabajar el incidente y documentas el caso para valorar credenciales cacheadas o una cuenta de emergencia."
  },
{
    "id": "seed-hd-defender",
    "term": "Windows Defender Antivirus",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "El antivirus integrado en Windows: protección en tiempo real, cuarentena e inteligencia de amenazas.",
    "longDefinition": "Microsoft Defender Antivirus viene activado por defecto en Windows 10 y 11, salvo que otra solución lo sustituya. En soporte se toca en: Protección en tiempo real (se desactiva solo de forma temporal y para diagnóstico, nunca como fix), Historial de protección (detecciones y cuarentena, para explicar al usuario qué pasó) y la versión de inteligencia de amenazas, clave en los falsos positivos. No hay que confundirlo con Defender para Endpoint, la plataforma EDR corporativa: el motor es el mismo, pero políticas, alertas y aislamiento se gestionan desde la consola de seguridad. El falso positivo que bloquea una app interna del negocio es el ticket clásico: se reporta y solo se excluye con aprobación de seguridad.",
    "example": "La app interna de facturación se bloquea al ejecutarse: el Historial de protección muestra la detección con la ruta y el hash; verificas que es un falso positivo de la build de ayer, lo reportas al equipo de seguridad y aplican la exclusión aprobada."
  },
{
    "id": "seed-hd-firewall-avanzado",
    "term": "Firewall de Windows con seguridad avanzada (wf.msc)",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Firewall host por perfiles (Dominio, Privado, Público) con consola wf.msc y netsh advfirewall.",
    "longDefinition": "La consola avanzada del firewall (wf.msc, o netsh advfirewall en línea de comandos) administra el firewall local por perfiles que se activan según la red conectada: Dominio, Privado y Público. La política por defecto es bloquear conexiones entrantes no solicitadas y permitir las salientes, lo que explica la mayoría de los casos de la app interna no llega. En soporte: verificar el perfil de la red del usuario (una red clasificada como Pública activa más bloqueos), crear la regla del puerto o programa que falta, y leer el log de descartes (pfirewall.log dentro de LogFiles\\Firewall) para confirmar qué se está bloqueando.",
    "example": "La app de transferencia interna no conecta: la red del usuario está marcada como Pública y el perfil bloquea más de la cuenta; la cambias a Privada, añades por wf.msc la regla de entrada del puerto 8443 solo para ese ejecutable y la app conecta."
  },
{
    "id": "seed-hd-reglas-firewall",
    "term": "Reglas de entrada y salida del firewall",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Excepciones del firewall por programa o puerto: el fix estándar de la app interna que no conecta.",
    "longDefinition": "Las reglas definen qué tráfico pasa: de entrada (conexiones hacia el equipo, las más sensibles) o de salida (las que el equipo inicia). Cada regla se puede atar a un programa (mejor opción: viaja con el ejecutable) o a un puerto, y activarse por perfil, por ejemplo solo en Privado y no en Público. El síntoma clásico de falta de regla: en local funciona y en remoto no, porque el instalador no creó la excepción o el usuario la denegó. Se crean desde wf.msc o con netsh advfirewall firewall add rule para despliegues por script. Las reglas de permitir todo a puertos genéricos se reportan como riesgo, no se replican como fix.",
    "example": "El agente de respaldo instalado en el PC del usuario no acepta conexiones del servidor central: añades en wf.msc una regla de entrada por programa apuntando al ejecutable del agente, activa en los perfiles Dominio y Privado, y el backup vuelve a alcanzarlo."
  },
{
    "id": "seed-hd-winre",
    "term": "WinRE (entorno de recuperación de Windows)",
    "acronym": "WinRE",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Entorno de reparación pre-arranque: reparar inicio, restaurar sistema, desinstalar update y cmd offline.",
    "longDefinition": "Windows Recovery Environment es el mini-Windows que aparece con la pantalla de Reparación automática o forzándolo con Shift y Reiniciar. Incluye Reparación de inicio (automática), Restaurar sistema, Desinstalar la actualización de calidad más reciente, acceso al firmware UEFI y un símbolo del sistema elevado desde el que lanzar sfc /scannow o CHKDSK contra el disco offline. También se llega interrumpiendo el arranque tres veces seguidas, o con un medio de instalación si el WinRE local está dañado. Para L2 es el taller: cuando el equipo no entra a Windows, el trabajo se hace desde aquí, incluido retirar el controlador culpable de un BSOD de arranque con el sistema offline.",
    "example": "Equipo con BSOD en bucle tras un controlador: tres arranques interrumpidos para forzar WinRE, en Opciones avanzadas abres el símbolo del sistema, retiras el controlador culpable con pnputil contra el sistema offline y el arranque normal vuelve."
  },
{
    "id": "seed-hd-reset",
    "term": "Restablecer este equipo (Reset)",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Reinstalación de fábrica desde Configuración: conservando archivos o borrando todo; el último recurso local.",
    "longDefinition": "Restablecer reinstala Windows sin medio externo desde Configuración, Sistema, Recuperación. Conservar mis archivos reinstala el sistema y elimina las aplicaciones de escritorio (genera un listado de lo eliminado) conservando los datos personales; Quitar todo borra el contenido del disco, con opción de limpieza profunda para bajas o reasignación a otro usuario. En el flujo de soporte es el final del camino local: corrupción irreparable cuando SFC y DISM ya han fallado, infección persistente o equipo que cambia de manos. Antes de restablecer: respaldo de datos, inventario de apps, licencias y la clave de recuperación de BitLocker si el disco va cifrado.",
    "example": "Portátil que pasa a otro usuario tras una baja: Configuración, Sistema, Recuperación, Restablecer equipo, Quitar todo con limpieza del disco; tras el proceso aplicas las apps corporativas y el equipo queda listo para su nuevo dueño."
  },
{
    "id": "seed-hd-actualizacion-in-place",
    "term": "Actualización in-place",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Reinstalar Windows encima de sí mismo conservando apps y datos: la reparación mayor antes del reset.",
    "longDefinition": "Ejecutar el setup.exe de una versión igual o superior desde dentro del propio Windows eligiendo Conservar archivos y aplicaciones: reemplaza los binarios del sistema dejando perfiles y aplicaciones de escritorio intactos. Es la cirugía mayor cuando SFC, DISM y Restaurar sistema no han curado (corrupción en bucle, tienda de apps rota, updates que no aplican) pero el usuario no puede perder su entorno. Requisitos: espacio libre suficiente, la ISO de la misma build o superior, y tiempo (una hora o más). En flotas gestionadas suele ser decisión de L2 o del equipo de escritorio, siempre con respaldo previo documentado.",
    "example": "Un Windows con SFC y DISM fallidos en bucle: montas la ISO de la misma build, ejecutas setup.exe con Conservar archivos y aplicaciones; tras 90 minutos el sistema queda saneado con las apps y los perfiles intactos."
  },
{
    "id": "seed-hd-mbr-vs-gpt",
    "term": "MBR vs GPT",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Esquemas de partición del disco: MBR (clásico, 2 TB máximo) frente a GPT (moderno, requisito de UEFI).",
    "longDefinition": "MBR es el esquema clásico: tabla de particiones en el primer sector, cuatro particiones primarias como máximo, discos de hasta 2 TB y arranque con BIOS legacy. GPT es el moderno: tabla redundante con comprobación de integridad, particiones casi ilimitadas, discos enormes y el requisito del arranque UEFI, que a su vez habilita Secure Boot. En soporte aparece al clonar discos o migrar HDD a SSD: un medio de instalación en modo legacy no ve discos GPT, al revés tampoco, y un clon MBR no arranca en un firmware configurado solo UEFI. La conversión sin perder datos se hace con mbr2gpt, validando antes con /validate; el diskpart clean con reconstrucción desde cero, solo con datos respaldados.",
    "example": "Al migrar un equipo antiguo a SSD, el clon arranca como MBR y el firmware va en UEFI puro: lanzas mbr2gpt /validate /allowFullOS y luego /convert, activas el arranque UEFI en la BIOS y el disco arranca con soporte de Secure Boot."
  },
{
    "id": "seed-hd-credential-manager",
    "term": "Administrador de credenciales (Credential Manager)",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Almacén de Windows para credenciales web y de red: donde vive el acceso denegado con permisos correctos.",
    "longDefinition": "Panel con dos zonas: Credenciales de Windows (sesiones de dominio para SMB, escritorio remoto y certificados) y Credenciales web (sitios y apps modernas). El caso estrella de soporte: mapeos o carpetas de red que fallan con acceso denegado aunque el usuario tiene permisos, causados por una credencial vieja cacheada contra ese servidor; se borra desde el panel o con cmdkey /list y cmdkey /delete, y se reconecta con la cuenta correcta. Otra entrada típica son las credenciales de sesiones RDP que reutilizan la cuenta de otra persona. No es un gestor de contraseñas corporativo: es un caché de sesión del sistema, y las contraseñas de empresa van a la bóveda que corresponda.",
    "example": "El usuario cambió de contraseña y desde entonces el servidor de archivos le niega el acceso: cmdkey /list muestra una credencial de dominio vieja guardada para ese servidor; la borras, reconecta con las credenciales nuevas y el acceso se restablece."
  },
{
    "id": "seed-hd-taskkill-get-process",
    "term": "taskkill y Get-Process",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Finalizar y consultar procesos desde consola: taskkill /F por nombre o PID, y Get-Process en PowerShell.",
    "longDefinition": "taskkill cierra procesos desde el símbolo del sistema: taskkill /IM nombre.exe o /PID 1234, con /F para forzar cuando el proceso no responde y /T para llevarse el árbol de hijos. El PID se obtiene con tasklist o desde la pestaña Detalles del Administrador de tareas. En PowerShell, Get-Process lista procesos con CPU, memoria (WS) y PID, y se combina con Sort y Select para el top de consumidores; su pareja para matar es Stop-Process con -Id y -Force. Usos de soporte: procesos zombis que el Administrador de tareas no logra matar, cerrar apps antes de un update por script y diagnosticar quién consume la máquina. Matar procesos de otros usuarios o del sistema requiere consola elevada: el acceso denegado lo avisa.",
    "example": "El agente de inventario se queda zombi y no se reinstala: consola elevada, taskkill /F /IM agente.exe /T para llevarte el proceso y sus hijos, relanzas el instalador y el agente se registra de nuevo; en PowerShell, el equivalente es Get-Process agente con Stop-Process -Force."
  },
{
    "id": "seed-hd-get-service",
    "term": "Get-Service / Restart-Service",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Cmdlets de PowerShell para consultar y reciclar servicios, en local o en remoto: el Restart-Service de L1.",
    "longDefinition": "Get-Service lista servicios con nombre, nombre para mostrar y estado (por ejemplo filtrando los detenidos), y Start-Service, Stop-Service y Restart-Service los gestionan. Restart-Service Spooler -Force es el equivalente de tres clics en services.msc pero scripteable, remoto (con Invoke-Command hacia otros equipos) y documentable: un one-liner puede reciclar el servicio en 20 equipos a la vez, cosa que la consola gráfica no hace. Consultar no exige elevación; cambiar el estado de servicios del sistema sí. Es el cmdlet natural para comprobar el estado de agentes corporativos antes de escalar una incidencia.",
    "example": "20 quejas de impresión en una planta: Invoke-Command sobre la lista de equipos con Restart-Service Spooler -Force recicla el servicio en todas a la vez y las colas vuelven a fluir antes de desplazar a nadie."
  },
{
    "id": "seed-hd-get-winevent",
    "term": "Get-WinEvent",
    "category": "HelpDesk - Windows / Endpoint",
    "shortDefinition": "Consulta del registro de eventos desde PowerShell con filtros de tiempo, nivel e Id: eventvwr scripteable.",
    "longDefinition": "Cmdlet para leer el registro de eventos con filtros potentes, típicamente con -FilterHashtable: combinación de LogName, Level, StartTime y Id en una sola consulta. Es la herramienta para correlacionar incidentes (todo lo crítico de ayer entre las 14:00 y las 15:00), extraer patrones de eventos recurrentes y exportar a CSV para el ticket. Supera al Visor de eventos cuando hay que cruzar varios equipos con Invoke-Command o afinar un rango temporal. Si el log o proveedor no se encuentra, Get-WinEvent -ListLog lista los nombres exactos disponibles. Leer el registro Security exige consola elevada.",
    "example": "Reinicios misteriosos nocturnos: Get-WinEvent con FilterHashtable sobre el registro System filtrando el Id 41 revela tres Kernel-Power anoche en dos ventanas de tiempo; cruzas con la ventana de mantenimiento de updates y localizas el disparador."
  },
{
    "id": "seed-hd-direccion-ip",
    "term": "Dirección IP",
    "acronym": "IP",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Identificador numérico de un equipo en una red: puede ser pública, privada, fija o dinámica.",
    "longDefinition": "Toda comunicación empieza por saber qué IP tiene el equipo y si es válida para su red. En una LAN es una IP privada (10.x, 172.16-31.x, 192.168.x) que solo existe dentro de la organización, mientras que la pública es la que ve internet a través de NAT. Se consulta con ipconfig /all o Get-NetIPConfiguration y se compara siempre con la de un equipo que funciona: mismo rango, misma máscara, mismo gateway. Es el primer dato que se pide en cualquier ticket de red porque descarta en segundos si el problema es del equipo o del entorno.",
    "example": "El usuario reporta 'no tengo internet': ipconfig /all muestra 192.168.1.50 con gateway 192.168.1.1 y DNS correctos, así que el equipo está bien conectado y el problema está más arriba; si apareciera 169.254.x.x, el problema sería de DHCP."
  },
{
    "id": "seed-hd-ipv4",
    "term": "IPv4",
    "acronym": "IPv4",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Direccionamiento de 32 bits en cuatro octetos (192.168.1.10); sigue siendo el dominante en redes locales.",
    "longDefinition": "Cada IPv4 son cuatro números de 0 a 255 separados por puntos, con una parte de red y una de host definidas por la máscara. El agotamiento de direcciones públicas llevó al uso masivo de rangos privados (RFC 1918) y NAT. En soporte, leer la IPv4 del usuario sirve para situarlo: rango correcto, subred correcta, rango de otra VLAN o dirección absurda. Muchos diagnósticos ('veo la impresora pero no el servidor') se resuelven mirando si dos IPv4 son vecinos según la máscara.",
    "example": "Un puesto nuevo coge 10.9.20.15 cuando toda su planta usa 10.5.20.x: el puerto del switch está en otra VLAN; el equipo está sano y se reporta el puerto al equipo de redes."
  },
{
    "id": "seed-hd-ipv6",
    "term": "IPv6",
    "acronym": "IPv6",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Direccionamiento de 128 bits en hexadecimal; convive con IPv4 (doble pila) y a veces rompe aplicaciones.",
    "longDefinition": "Formato tipo 2001:db8::1 y direcciones link-local fe80:: que se autoasignan por interfaz. Windows viene con doble pila activa: si una ruta IPv6 existe pero está rota, el equipo la prefiere y las conexiones se cuelgan aunque IPv4 funcione perfectamente. El diagnóstico clásico es comparar: ping por nombre (que puede resolver a IPv6) frente a ping forzando IPv4. Deshabilitar IPv6 en el adaptador es una prueba temporal válida, no una solución definitiva, y el hallazgo se escala a redes.",
    "example": "Outlook no conecta pero ping al servidor por IPv4 responde: prueba deshabilitar IPv6 en el adaptador y Outlook abre; hay una ruta o DNS IPv6 a medias en la red y se escala con la evidencia."
  },
{
    "id": "seed-hd-mascara-de-subred",
    "term": "Máscara de subred",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Define qué parte de la IP identifica la red y qué parte el equipo: decide quién es vecino y quién no.",
    "longDefinition": "Una /24 (255.255.255.0) deja 254 equipos en la misma red; los que quedan dentro se hablan por ARP directamente y el resto va vía gateway. En soporte importa porque dos equipos solo se ven si comparten red según la máscara. El error típico es una configuración manual con máscara o rango equivocados tras tocar la IP fija de un puesto. Se comprueba en ipconfig /all y se corrige dejando DHCP salvo que el puesto exija IP fija.",
    "example": "Un puesto con IP manual 192.168.1.60 y máscara 255.255.255.128 solo alcanza la mitad del rango y 'pierde' la impresora de 192.168.1.200: corriges la máscara a /24 y el puesto la vuelve a ver."
  },
{
    "id": "seed-hd-gateway",
    "term": "Gateway (puerta de enlace)",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "El router que saca el tráfico de tu subred: si falla hay red local pero no internet ni otras redes.",
    "longDefinition": "Toda IP con destino fuera de la propia subred se envía al default gateway, que es el primer salto de cualquier tracert. El diagnóstico se hace en dos pasos: ping al gateway (¿llego al router?) y ping a una IP pública como 8.8.8.8 (¿sale a internet?). El estado 'puerta de enlace no disponible' en Windows significa que el equipo no ve al gateway: cable, puerto de switch, IP fuera de rango o AP caído; si afecta a toda la planta, el problema está en el router o en el enlace hacia arriba.",
    "example": "Usuario sin internet: ping a su compañero responde pero ping 192.168.1.1 (gateway) no; el equipo está bien y el AP o el router de la planta está caído, se escala con ambos resultados en el ticket."
  },
{
    "id": "seed-hd-nat",
    "term": "NAT (Network Address Translation)",
    "acronym": "NAT",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Traduce las IP privadas de muchos equipos a una IP pública compartida al salir a internet.",
    "longDefinition": "El router mantiene una tabla de traducciones y multiplexa por puertos, por eso toda la oficina aparece en internet con la misma IP pública. En soporte explica fenómenos cotidianos: por qué no se puede acceder desde fuera a un equipo interno sin configurar port forwarding, y por qué el 'doble NAT' (router detrás de router) rompe VPN, consolas y conexiones entrantes raras. Para saber la IP pública se usa un servicio web tipo whatismyip, que no coincide con la del ipconfig.",
    "example": "Un teletrabajador con router nuevo del ISP detrás de su propio router no consigue conectar la VPN corporativa: doble NAT; se pone el router del ISP en modo bridge o se retira el intermedio y la VPN conecta."
  },
{
    "id": "seed-hd-mac-address",
    "term": "MAC address",
    "acronym": "MAC",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Identificador físico hexadecimal de 48 bits de la tarjeta de red (AA:BB:CC:DD:EE:FF), único por interfaz.",
    "longDefinition": "Trabaja en capa 2 y es la dirección con la que realmente hablan los equipos vecinos y los switches; ARP se encarga de relacionarla con la IP. En soporte aparece al configurar reservas DHCP, filtrados Wi-Fi por MAC y autenticación 802.1X de equipo. Se consulta con ipconfig /all o getmac. Ojo con la randomización de MAC de iOS y Android: al cambiar de MAC aparente, rompe reservas y filtros que dependan de ella.",
    "example": "El iPhone de un directivo deja de coger su IP reservada: iOS usa una dirección privada (aleatoria) por SSID; se desactiva la dirección privada para esa red o se rehace la reserva con la MAC que ahora reporta."
  },
{
    "id": "seed-hd-dns",
    "term": "DNS (Domain Name System)",
    "acronym": "DNS",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Traduce nombres (intranet.empresa.com) a direcciones IP; si falla, la red funciona pero 'nada abre'.",
    "longDefinition": "Es la agenda telefónica de internet y de la intranet: el equipo pregunta a sus servidores DNS (visibles en ipconfig /all) y guarda respuestas en caché. Su fallo produce el síntoma más confuso para el usuario: internet 'no abre' aunque la conectividad esté perfecta. El diagnóstico de diez segundos: ping por IP funciona y ping por nombre no, luego nslookup contra el servidor configurado y contra 8.8.8.8 para comparar. La mayoría de incidencias de navegación de un solo equipo terminan siendo DNS.",
    "example": "El portal corporativo 'no existe' para un usuario: ping 10.20.30.40 responde pero ping portal.empresa.com falla; nslookup contra el DNS interno da timeout y contra 8.8.8.8 resuelve: el DNS interno está caído, se escala y como workaround temporal se prueba con DNS público."
  },
{
    "id": "seed-hd-registros-dns",
    "term": "Registros DNS (A, CNAME, MX y PTR)",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Entradas DNS: A (nombre a IPv4), CNAME (alias), MX (servidores de correo) y PTR (IP a nombre, inverso).",
    "longDefinition": "Cada registro tiene un tipo que dice qué se consulta. El A apunta un nombre a una IP, el CNAME crea un alias hacia otro nombre (si el destino cae, el alias también), el MX decide a qué servidor llega el correo y el PTR resuelve al revés (IP a nombre), típico en verificaciones antispam. En soporte se consultan con nslookup -type=A / CNAME / MX para verificar si un nombre existe y a dónde apunta; un registro A que apunta a la IP vieja tras una migración explica por qué 'solo a algunos les falla'.",
    "example": "Tras migrar el CRM, a media oficina les falla: nslookup -type=A crm.empresa.com devuelve la IP anterior; los afectados tienen la resolución cacheada, con ipconfig /flushdns se limpia y se avisa al admin DNS por el TTL alto."
  },
{
    "id": "seed-hd-cache-dns",
    "term": "Caché DNS (flushdns)",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Memoria local de resoluciones DNS que caduca según el TTL; entradas viejas rompen solo a algunos.",
    "longDefinition": "Windows y el navegador guardan las traducciones nombre-IP para no consultar cada vez, durante el TTL del registro. Cuando un servicio cambia de IP, la caché mantiene a los usuarios en la dirección vieja: síntoma clásico de 'a mí me funciona y a ti no'. Se inspecciona con ipconfig /displaydns y se limpia con ipconfig /flushdns seguido de reiniciar el navegador (que tiene caché propia). Es uno de los fixes más rentables del HelpDesk: treinta segundos y sin escalado.",
    "example": "El usuario no entra al CRM recién migrado y su compañero sí: ipconfig /displaydns muestra la entrada del CRM con la IP antigua; ipconfig /flushdns, cierre del navegador y al reabrir ya entra."
  },
{
    "id": "seed-hd-dns-vs-ip-diagnostico",
    "term": "DNS no resuelve vs IP responde (diagnóstico diferencial)",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Diagnóstico diferencial clave: si la IP responde y el nombre no, el problema es DNS y no la conectividad.",
    "longDefinition": "La secuencia ordenada es ping 8.8.8.8 (¿hay red?) y luego ping google.com (¿resuelve DNS?). Si lo primero funciona y lo segundo falla, se acota a resolución de nombres: servidor DNS caído, registro ausente, caché vieja o sufijo interno mal configurado (el nombre corto no resuelve pero el FQDN sí). Se confirma con nslookup indicando explícitamente el servidor. Este diferencial evita el error más común de L1: escalar 'sin red' cuando la red está perfecta.",
    "example": "Ticket 'sin internet': ping 8.8.8.8 OK y ping outlook.office365.com falla; nslookup contra el DNS interno no responde: el problema es el servidor DNS interno, no la red; se escala señalando el servidor exacto."
  },
{
    "id": "seed-hd-dns-interno-vs-isp",
    "term": "DNS del ISP vs DNS interno (forwarders)",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "El DNS interno resuelve nombres privados y reenvía (forwarders) al ISP o a públicos el resto de consultas.",
    "longDefinition": "Las empresas usan un DNS interno que conoce intranet.empresa.com y demás nombres privados, y delega en forwarders (ISP, 8.8.8.8, 1.1.1.1) lo que no es interno. También permite split DNS: el mismo nombre resuelve distinto dentro y fuera. El fallo típico es un equipo con DNS público configurado a mano: internet perfecto pero la intranet 'no existe'. Se comprueba en ipconfig /all qué servidores DNS tiene el equipo y se comparan con la política corporativa (normalmente DHCP).",
    "example": "Un portátil nuevo no encuentra el ERP interno pero navega perfecto: sus DNS son 8.8.8.8 en manual; al pasar a obtener DNS automáticamente (DHCP), el ERP resuelve al instante."
  },
{
    "id": "seed-hd-nslookup",
    "term": "nslookup",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Consulta DNS directamente: muestra qué servidor responde y qué devuelve, sin pasar por la caché local.",
    "longDefinition": "A diferencia de ping, nslookup pregunta directamente al servidor, lo que permite comparar respuestas: nslookup intranet resuelve con el servidor por defecto y nslookup intranet 8.8.8.8 fuerza otro. Con -type= se consultan registros A, CNAME o MX. Hay que saber leerlo: timeout significa servidor caído o inalcanzable, 'no encontró el registro' significa que el nombre no existe en ese servidor, y una respuesta correcta confirma que el problema está en otro lado (caché, sufijo, aplicación).",
    "example": "nslookup intranet contra 10.0.0.5 da timeout y contra 8.8.8.8 resuelve: el DNS interno está caído; se escala con ambos resultados y como workaround temporal se apunta al DNS público en el equipo afectado."
  },
{
    "id": "seed-hd-dhcp",
    "term": "DHCP (Dynamic Host Configuration Protocol)",
    "acronym": "DHCP",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Servicio que reparte IP, máscara, gateway y DNS automáticamente; sin él el equipo cae en 169.254.x.x.",
    "longDefinition": "Funciona con un intercambio DORA (Discover, Offer, Request, Acknowledge): el equipo grita que necesita configuración, el servidor ofrece una completa y la presta por un tiempo determinado. Reparte también opciones como DNS, sufijo de dominio y gateway. En soporte, buena parte de los 'sin red' son DHCP: servidor caído, alcance agotado o VLAN sin servicio. El diagnóstico empieza en ipconfig /all: si la IP empieza por 169.254, DHCP no ha llegado; si hay IP válida, el DHCP queda descartado.",
    "example": "Una planta entera amanece sin red tras un corte eléctrico: todos los ipconfig muestran 169.254.x.x; el servidor DHCP no levantó con el resto; se escala el servicio y se documenta que los equipos están sanos."
  },
{
    "id": "seed-hd-lease-dhcp",
    "term": "Lease DHCP (concesión)",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "La configuración DHCP se presta por un tiempo y se renueva a mitad del periodo; al expirar puede cambiar.",
    "longDefinition": "La concesión típica dura horas o días; el equipo intenta renovarla con el mismo servidor al llegar a la mitad de su vida. Importa en soporte por tres motivos: leases muy cortas hacen que las IPs roten (las impresoras sin reserva cambian de dirección), una concesión de otra red 'pegada' mantiene configuración vieja al volver, y si el lease expira sin respuesta del servidor el equipo cae en APIPA. Se ve la concesión y su vencimiento en ipconfig /all; el reset manual es ipconfig /release seguido de ipconfig /renew.",
    "example": "Un portátil vuelve de otra oficina y no conecta en la suya: ipconfig aún muestra la IP y el gateway de la red anterior; con ipconfig /release y /renew pide configuración nueva y conecta."
  },
{
    "id": "seed-hd-dhcp-scope-y-reserva",
    "term": "Ámbito DHCP (scope) y reserva DHCP",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "El scope es el rango de IPs que el DHCP puede repartir; la reserva fija una IP concreta a una MAC.",
    "longDefinition": "El ámbito define rango, exclusiones y opciones para una red, y puede agotarse: síntoma de usuarios con 169.254.x.x aunque el servidor responde. La reserva asigna siempre la misma IP a una MAC determinada dentro del ámbito, y es la práctica estándar para impresoras de red y equipos que otros referencian por dirección. El L1 no suele configurarlos, pero sí aporta lo que redes necesita: la MAC del equipo (getmac o ipconfig /all) y el síntoma exacto (APIPA masiva o IP que rota).",
    "example": "La sala de formación nueva no coge IPs: los equipos muestran 169.254.x.x y el DHCP responde en el resto del edificio; el scope de esa VLAN está lleno o no existe y se escala con la VLAN afectada. En otro caso, la impresora 'cambia de IP' cada semana: se pide a redes una reserva con su MAC."
  },
{
    "id": "seed-hd-apipa",
    "term": "APIPA (169.254.x.x)",
    "acronym": "APIPA",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "IP autoasignada 169.254.x.x cuando DHCP falla: la señal inequívoca de que el equipo no consiguió IP.",
    "longDefinition": "Ante la ausencia de respuesta DHCP, Windows se autoasigna una dirección link-local 169.254.x.x que no permite salir a internet. Verla en ipconfig convierte el ticket en un problema de DHCP o de alcance físico: servidor caído, cable, puerto en VLAN sin DHCP o NIC mal configurada. Primera intentona: ipconfig /release y /renew o reconectar el cable. El criterio de bloque clave: si afecta a varios equipos a la vez, el problema es del servidor o de la red, nunca de cada equipo individual.",
    "example": "Usuario 'sin internet': ipconfig muestra 169.254.43.7; preguntas a los vecinos de planta y están igual: DHCP caído y se escala; si solo él falla, pruebas otro latiguillo y otro puerto antes de escalar."
  },
{
    "id": "seed-hd-tcp",
    "term": "TCP (Transmission Control Protocol)",
    "acronym": "TCP",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Protocolo conectado y fiable: confirma la entrega y reordena; base de web, correo y carpetas compartidas.",
    "longDefinition": "Establece una conexión con handshake (SYN, SYN-ACK, ACK), confirma cada byte y retransmite lo perdido. Por eso los servicios críticos usan TCP. En soporte interesa el patrón inverso: cuando hay pérdida de paquetes, TCP la enmascara retransmitiendo y el usuario percibe lentitud eterna en vez de error. netstat permite ver las conexiones TCP con su estado (ESTABLISHED, SYN_SENT...); un intento clavado en SYN_SENT apunta a firewall o servicio caído en destino.",
    "example": "La sincronización de OneDrive no avanza pese a que Test-NetConnection al endpoint responde: hay pérdida de paquetes intermedia que TCP compensa retransmitiendo; un ping -t durante un minuto muestra el 5% de pérdida que explica la lentitud."
  },
{
    "id": "seed-hd-udp",
    "term": "UDP (User Datagram Protocol)",
    "acronym": "UDP",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Protocolo sin conexión ni confirmación de entrega: rápido y ligero, usado en voz, vídeo y DNS.",
    "longDefinition": "Manda datagramas sin handshake ni retransmisión: si se pierden, se pierden. Es el transporte de voz, videollamadas, streaming y de las consultas DNS simples. La consecuencia práctica en soporte es el síntoma: la pérdida en UDP no da lentitud (como TCP) sino cortes directos, voz metálica y vídeo pixelado. A la inversa: si la llamada se oye mal pero la transferencia de archivos va bien, la sospecha es pérdida o jitter en el camino, medible con ping -t en el momento de la incidencia.",
    "example": "En Teams la voz sale entrecortada pero la pantalla compartida va fluida: el audio UDP sufre pérdida; ping -t durante la llamada muestra picos y pérdida por la Wi-Fi lejana; con cable, la llamada se normaliza."
  },
{
    "id": "seed-hd-icmp",
    "term": "ICMP (Internet Control Message Protocol)",
    "acronym": "ICMP",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Protocolo de control y errores de IP: el de ping y tracert; bloquearlo a veces falsea el diagnóstico.",
    "longDefinition": "ICMP transporta los mensajes de eco de ping, el TTL agotado que alimenta tracert y los destination unreachable de los routers. Muchos servidores lo bloquean por política, así que un ping fallido no demuestra que el destino esté caído. Leer la salida ayuda: Request timed out es silencio absoluto y Destination host unreachable suele señalar problema local de ruta o de ARP. La regla de L1: si ping falla pero el puerto responde con Test-NetConnection, el destino está vivo y filtra ICMP; se anota en el ticket para no repetir el falso diagnóstico ni culpar a la red.",
    "example": "El servidor 'no responde' según el usuario: ping falla pero Test-NetConnection servidor -Port 445 devuelve True: está vivo y su firewall bloquea ICMP; el problema real es otro y el ticket se reencuadra."
  },
{
    "id": "seed-hd-arp",
    "term": "ARP (Address Resolution Protocol)",
    "acronym": "ARP",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Resolución de IP a MAC dentro de la red local: quién es el vecino físico antes de enviarle nada.",
    "longDefinition": "Antes de hablar con una IP de su propia subred, el equipo pregunta por ARP quién tiene esa MAC y guarda la pareja en una tabla caché (se consulta con arp -a). El tráfico que sale de la subred se envía a la MAC del gateway. Es un diagnóstico raro pero memorable: al cambiar un router, la tabla ARP de los equipos puede seguir apuntando a la MAC del viejo y media oficina pierde internet con IP y DNS perfectos; se limpia con arp -d * o reconectando.",
    "example": "Cambiado el router de la planta, media oficina no navega pese a tener IP y DNS correctos: arp -a muestra la MAC del router antiguo asociada al gateway; arp -d * y reconexión, y todos navegan."
  },
{
    "id": "seed-hd-puertos-comunes",
    "term": "Puertos comunes (53, 88, 389, 445, 443, 3389, 9100)",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Puertos de servicio clave: 53 DNS, 88 Kerberos, 389 LDAP, 445 SMB, 443 HTTPS, 3389 RDP, 9100 impresión.",
    "longDefinition": "Un puerto identifica el servicio dentro de un equipo; saber los habituales convierte 'no funciona X' en una prueba concreta con Test-NetConnection equipo -port. Referencia práctica: 80 y 443 web, 445 carpetas compartidas, 3389 escritorio remoto, 88 y 389 autenticación de dominio, 53 DNS, 9100 cola directa a impresora. El patrón diagnóstico: si ping funciona pero el puerto del servicio no, el problema es el servicio o un firewall que filtra ese puerto, no la red en general.",
    "example": "El usuario no ve las carpetas compartidas: Test-NetConnection servidor -Port 445 devuelve False con ping OK; el servicio o una regla bloquea SMB hacia ese servidor, se escala señalando el puerto exacto en vez de 'sin red'."
  },
{
    "id": "seed-hd-ping",
    "term": "ping",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Prueba básica de alcance: envía ICMP echo y mide tiempo de respuesta en ms y pérdida de paquetes.",
    "longDefinition": "Es el primer comando de casi todo diagnóstico de red. ping -t lo hace continuo, ideal para capturar fallos intermitentes mientras el usuario reproduce el problema; con -l se ajusta el tamaño del paquete (útil para sonsacar problemas de MTU). Hay que leer bien la salida: Request timed out es silencio, Destination host unreachable suele indicar problema local de ruta o de ARP, y el TTL aproxima el número de saltos. Límite conocido: muchos destinos bloquean ICMP, así que nunca se concluye 'caído' solo con ping.",
    "example": "Quejas de cortes intermitentes: ping -t 8.8.8.8 durante dos minutos mientras el usuario navega muestra pérdida del 10% coincidiendo con los cortes; evidencia de problema de enlace lista para escalar a redes."
  },
{
    "id": "seed-hd-tracert-pathping",
    "term": "tracert y pathping",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "tracert muestra la ruta salto a salto; pathping añade estadísticas de pérdida por salto durante un rato.",
    "longDefinition": "tracert destino lista los saltos hasta el destino: el diagnóstico está en el último salto que responde, no en los asteriscos intermedios (muchos routers no contestan y es normal). pathping combina la ruta con muestreo de pérdida por salto y tarda unos minutos, pero es la herramienta para localizar si la pérdida es local, del operador o del destino. Con ambos se responde a la pregunta que rompe empates: ¿el problema está dentro o fuera de la empresa?",
    "example": "Un SaaS va lento solo desde la oficina: pathping saas.com muestra pérdida concentrada en los saltos del operador y 0% hasta el gateway propio; se escala al proveedor con el informe completo."
  },
{
    "id": "seed-hd-ipconfig-all",
    "term": "ipconfig /all",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Radiografía completa de la red del equipo: IPs, máscara, gateway, DNS, DHCP, MAC y estado del adaptador.",
    "longDefinition": "El ipconfig básico resume IPs; el /all añade lo que importa en diagnóstico: servidores DNS, gateway, máscara, 'DHCP habilitado', fecha de concesión, sufijo DNS y dirección física del adaptador. Diez segundos de lectura descartan media incidencia, sobre todo si se compara con la salida de un equipo que funciona. La familia completa: ipconfig /flushdns limpia la caché DNS y /release con /renew gestionan la concesión. El 'Media disconnected' avisa de que la interfaz ni siquiera tiene cable conectado.",
    "example": "Comparas ipconfig /all del usuario que falla con el de un compañero sano: mismo gateway y DNS pero distinto sufijo DNS; el usuario está conectado a la SSID de invitados; se cambia a la SSID corporativa y resuelve."
  },
{
    "id": "seed-hd-ipconfig-release-renew",
    "term": "ipconfig /release y /renew",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Devuelve la concesión DHCP y pide una nueva de cero: el apagar-encender de la capa IP.",
    "longDefinition": "/release entrega la IP actual al servidor y /renew solicita una configuración completa nueva. Útil ante APIPA, IP de otra red pegada, conflicto de direcciones, tras cambiar de VLAN o SSID o después de un mantenimiento del DHCP. Hay que usarlo con cabeza: en cuanto se libera, el equipo se queda sin IP, así que nunca en un servidor ni en un equipo remoto al que se accede por esa red. Si el /renew se queda esperando, el DHCP no responde: cable, VLAN o servidor.",
    "example": "Un puesto 'sin red' tras mantenimiento del switch: ipconfig muestra 169.254.x.x; ipconfig /renew devuelve una 10.5.20.x correcta: la concesión anterior estaba atascada; si el renew no devuelve nada, el problema está entre el equipo y el DHCP."
  },
{
    "id": "seed-hd-get-netipconfiguration",
    "term": "Get-NetIPConfiguration",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Cmdlet de PowerShell que resume IP, gateway y DNS por interfaz: el ipconfig /all moderno y filtrable.",
    "longDefinition": "Muestra la configuración completa por interfaz con una salida en objetos, lo que permite filtrar y usarla en scripts: por ejemplo, listar solo las interfaces que tienen IPv4DefaultGateway. Se combina con Get-NetAdapter para ver el estado del medio (Up, Disconnected, Disabled). Es la herramienta natural cuando el triaje se hace desde PowerShell en vez del símbolo de sistema, y para inventariar por qué interfaz sale un equipo que tiene cable y Wi-Fi a la vez.",
    "example": "Un equipo con cable y Wi-Fi simultáneos navega lento: Get-NetIPConfiguration muestra que el default gateway sale por la Wi-Fi débil; al deshabilitar la Wi-Fi (Disable-NetAdapter), el cable asume la ruta y la velocidad se recupera."
  },
{
    "id": "seed-hd-test-netconnection",
    "term": "Test-NetConnection",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Cmdlet de PowerShell todo en uno: ping ICMP más prueba de puerto TCP, con traceroute opcional.",
    "longDefinition": "Test-NetConnection destino hace ping, y con -Port 443 comprueba el servicio concreto: la respuesta se lee en PingSucceeded y TcpTestSucceeded. Es la evolución del telnet de años atrás y responde la pregunta que más se repite: ¿está caído el servicio o es la red? La combinación discriminante: ping falla y puerto responde (el destino filtra ICMP), ping y puerto fallan (red o host caído), ambos responden (mirar aplicación, proxy o DNS en el equipo).",
    "example": "El CRM no abre en el navegador: Test-NetConnection crm.empresa.com -Port 443 da PingSucceeded False y TcpTestSucceeded True; red y servicio OK, el problema está en el navegador o en el proxy del usuario."
  },
{
    "id": "seed-hd-netstat",
    "term": "netstat",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Muestra las conexiones y puertos del equipo: qué escucha, a quién está conectado y en qué estado.",
    "longDefinition": "netstat -ano lista conexiones con PID, lo que permite cruzar con el Administrador de tareas para saber qué aplicación usa cada conexión. Los estados cuentan la historia: LISTENING es un servicio esperando, ESTABLISHED es conexión viva y SYN_SENT repetido es un intento sin respuesta (firewall o servicio caído en destino). Es la herramienta para comprobar si una aplicación local está realmente escuchando en su puerto antes de culpar a la red.",
    "example": "Una app local 'no conecta' al servidor SQL: netstat -ano con filtro por 1433 muestra SYN_SENT repetido; el equipo intenta conectar y no recibe respuesta, Test-NetConnection al puerto 1433 lo confirma: firewall o servicio caído, no el equipo del usuario."
  },
{
    "id": "seed-hd-wifi-2-4-vs-5",
    "term": "Wi-Fi: 2.4 GHz vs 5 GHz",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "2.4 GHz llega más lejos y atraviesa muros; 5 GHz es más rápido pero con menos alcance efectivo.",
    "longDefinition": "Muchas redes corporativas ofrecen la misma SSID en ambas bandas o SSIDs separadas; el equipo engancha donde mejor señal tiene, no donde mejor velocidad tendrá. El 2.4 sufre interferencias (microondas, Bluetooth) y saturación de canales en edificios de oficinas; el 5 no atraviesa bien los muros y pierde velocidad lejos del AP. Síntoma típico: señal excelente en 2.4 con velocidad pésima equivale a canal saturado por decenas de redes vecinas.",
    "example": "La sala de juntas tiene vídeo entrecortado: el portátil está en 2.4 GHz compartiendo canal con 20 redes vecinas; al conectarse al AP cercano en 5 GHz (o por cable), la llamada va fluida."
  },
{
    "id": "seed-hd-ssid",
    "term": "SSID (Service Set Identifier)",
    "acronym": "SSID",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "El nombre de una red Wi-Fi; separa redes de la misma organización (corporativa, invitados, dispositivos).",
    "longDefinition": "Es lo primero que se pregunta en una incidencia Wi-Fi: ¿a qué SSID está conectado? Los problemas más comunes son estar en la red equivocada (invitados en vez de corporativa: portal cautivo, red aislada, sin recursos internos). Con SSID oculto el equipo solo conecta si se configuró manualmente. Varias SSIDs sobre los mismos APs suelen mapear a VLANs distintas, por eso cambiar de SSID cambia de red y de accesos.",
    "example": "Usuario que no accede al ERP por Wi-Fi: está conectado a Empresa-Invitados, que es una red aislada con solo internet; al pasar a la SSID corporativa con sus credenciales, el ERP responde."
  },
{
    "id": "seed-hd-wpa2-psk-vs-enterprise",
    "term": "WPA2-PSK vs WPA2-Enterprise",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "PSK: una contraseña compartida por todos; Enterprise: cada usuario se autentica con su cuenta o certificado.",
    "longDefinition": "En PSK (pre-shared key) la clave es la misma para todo el mundo: dar de baja a una persona no se puede, solo cambiar la clave para todos. En Enterprise la autenticación es individual vía 802.1X y RADIUS: la cuenta deshabilitada pierde la Wi-Fi al instante y hay trazabilidad de quién conectó. El onboarding de Enterprise es más complejo (certificados o credenciales más configuración del suplicante), pero es el estándar corporativo; WPA3 mejora ambos modos.",
    "example": "Un ex-empleado sigue entrando en la Wi-Fi de la sucursal: es PSK compartida y no hay nada que revocar por usuario; se propone migrar la SSID a WPA2-Enterprise contra las cuentas de AD."
  },
{
    "id": "seed-hd-802-1x",
    "term": "802.1X (autenticación de puerto)",
    "acronym": "802.1X",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Autenticación de puerto (cableada o Wi-Fi) contra un servidor RADIUS antes de dejar entrar en la red.",
    "longDefinition": "El equipo (suplicante) se autentica ante el switch o AP (autenticador), que valida contra RADIUS; el puerto solo abre si la autenticación es correcta. Puede usar credenciales o certificados de equipo. El síntoma de fallo es inconfundible: el link está arriba pero el equipo no consigue IP ni acceso, porque el puerto queda cerrado. Causas típicas: certificado caducado o no instalado, cuenta bloqueada o suplicante mal configurado. Es la razón por la que un portátil nuevo no funciona 'solo con enchufarlo'.",
    "example": "Un portátil nuevo no coge IP por cable pese a link correcto: el switch exige 802.1X y al equipo le falta el certificado de máquina; tras el enrollment, el puerto se abre y recibe IP."
  },
{
    "id": "seed-hd-ethernet-poe",
    "term": "Ethernet y PoE (Power over Ethernet)",
    "acronym": "PoE",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Cableado RJ45 de red local; PoE lleva corriente y datos por el mismo cable a teléfonos, APs y cámaras.",
    "longDefinition": "La ventaja diagnóstica del Ethernet es eliminar la capa inalámbrica de la ecuación: si por cable funciona, el problema era la radio. El PoE alimenta dispositivos con un presupuesto de potencia por switch: si se añaden APs o cámaras, un switch sin margen deja 'caídos' dispositivos con cable perfecto. La distancia máxima de un cable de red es de 100 metros. Síntoma PoE clásico: teléfono IP o AP sin luz en un puerto, funcionando en el puerto vecino.",
    "example": "Un teléfono IP queda 'muerto' tras una reubicación de puesto; en el puerto siguiente enciende: el puerto original no entrega PoE o está deshabilitado; se anota el número de puerto para el equipo de redes."
  },
{
    "id": "seed-hd-cable-de-red",
    "term": "Cable de red (link LED y tester)",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "El eslabón físico: LED de link encendido significa capa 1 OK; tester o cambio de cable descartan el fallo.",
    "longDefinition": "Antes de culpar a Windows, mirar los LEDs de la NIC y del switch: encendido o parpadeando es link; apagado es problema físico (cable, puerto o tarjeta). Los latiguillos dañados por sillas, puertas y cajones son la causa clásica de conexiones intermitentes. El descarte en trío: cambiar cable, cambiar puerto y probar el mismo cable en otro equipo; con un tester de cable se verifica continuidad y pares antes de reportar a redes.",
    "example": "'Red intermitente' en un puesto: al mover el latiguillo bajo la mesa, el LED de link parpadea; cambio de latiguillo y la incidencia muere: era el cable, el cierre más clásico del HelpDesk."
  },
{
    "id": "seed-hd-duplex-speed-mismatch",
    "term": "Dúplex y velocidad (mismatch)",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Desacuerdo de velocidad o dúplex entre NIC y switch: link aparentemente bien pero rendimiento lamentable.",
    "longDefinition": "La autonegociación pacta velocidad y dúplex; si un lado se fuerza (100 Full fijado) y el otro queda en automático, la pareja se desincroniza y aparecen colisiones y errores que hunden el rendimiento. Síntoma: transferencias a una fracción de lo esperado con ping perfecto. Se consulta lo negociado en el adaptador (Estado de la conexión o Get-NetAdapter) y la regla es dejar autonegociación en ambos extremos; el historial de 'alguien lo fijó a mano' aparece con frecuencia en puestos antiguos.",
    "example": "Un puesto tarda minutos en abrir carpetas con ping impecable: el adaptador está fijado a 100 Mbps Half Duplex de hace años; se pasa a Auto Negotiation, negocia 1 Gbps Full y la velocidad vuelve a la normalidad."
  },
{
    "id": "seed-hd-vlan",
    "term": "VLAN (Virtual LAN)",
    "acronym": "VLAN",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Redes lógicas aisladas sobre el mismo switch físico: cada puerto pertenece a una sola VLAN.",
    "longDefinition": "Dos equipos en VLANs distintas están en redes distintas: no se ven aunque cuelguen del mismo switch, y cada VLAN suele tener su DHCP y su subred. Para el L1 es clave porque explica el fallo 'enchufa pero no coge IP' o 'coge una IP rara de otra red': el puerto del switch está en una VLAN distinta a la esperada. La acción correcta es identificar el puerto (número de roseta o patch panel) y reportarlo al equipo de redes; no es un problema del equipo del usuario.",
    "example": "Dos puestos reubicados no ven el ERP: ambos cogieron IPs del rango de impresoras porque el patch panel los dejó en puertos de la VLAN de impresión; redes los reasigna a la VLAN de oficinas y los puestos conectan."
  },
{
    "id": "seed-hd-vpn",
    "term": "VPN (túnel)",
    "acronym": "VPN",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Túnel cifrado que conecta el equipo remoto con la red corporativa como si estuviera físicamente en ella.",
    "longDefinition": "El cliente VPN cifra el tráfico y da acceso a las subredes internas; las corporativas suelen exigir MFA y un perfil de cliente gestionado. Fallos típicos en soporte: no conecta (credenciales, MFA o red de origen que bloquea), conecta pero no se llega a nada (DNS del túnel o rutas) y conecta pero todo va lentísimo (sin split tunneling). El diagnóstico dentro del túnel es el mismo de siempre: ping por IP, ping por nombre y route print para ver qué sale por el túnel.",
    "example": "VPN 'conectada' pero el ERP no abre: ping 10.2.3.4 responde pero el nombre no resuelve; el DNS asignado por el túnel no contesta; ipconfig /flushdns y la corrección del DNS interno en el perfil resuelven."
  },
{
    "id": "seed-hd-split-tunneling",
    "term": "Split tunneling",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Solo el tráfico corporativo va por el túnel VPN; el resto sale directo por la conexión local del usuario.",
    "longDefinition": "Sin split, TODO el tráfico del usuario viaja a la empresa y vuelve: más latencia, más carga en la pasarela corporativa y videollamadas que se congelan en cuanto hay VPN puesta. Con split, una lista de destinos corporativos (subredes internas) decide qué va por el túnel. La incidencia típica de configuración: una subred nueva de la oficina no está en la lista y los usuarios con VPN no llegan a ella; se corrige actualizando el perfil en el lado de redes.",
    "example": "Quejas de videollamadas congeladas en cuanto conectan la VPN: el perfil manda todo por el túnel; redes activa split tunneling para los destinos internos y las llamadas salen ya por la conexión local del usuario."
  },
{
    "id": "seed-hd-proxy-web-pac",
    "term": "Proxy web y PAC (autoproxy)",
    "acronym": "PAC",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "El proxy intermedia la navegación web; el archivo PAC indica al navegador cuándo y a dónde usarlo.",
    "longDefinition": "Las empresas sacan la navegación por un proxy (filtrado, registro, caché) y distribuyen la configuración con un archivo PAC: un script con reglas por dominio o IP que el navegador descarga. El fallo característico de un solo equipo: configuración de proxy manual apuntando a un proxy viejo o el PAC caído, con el resultado de 'Teams funciona pero el navegador no abre nada'. Diagnóstico: revisar la configuración de proxy de Windows (manual frente a automática con URL de PAC) y probar navegación directa para aislar.",
    "example": "El navegador del usuario no abre nada pero Teams funciona: la configuración apunta a una URL de PAC interna caída; como prueba se desactiva el proxy y navega; se escala la URL del PAC caído con el hallazgo."
  },
{
    "id": "seed-hd-firewall-perimetral-vs-local",
    "term": "Firewall perimetral vs firewall local",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Perimetral: filtra en la frontera de la empresa para todos; local: reglas en el propio equipo del usuario.",
    "longDefinition": "La distinción dirige el triaje: si solo falla un usuario, mira su firewall local o el antivirus; si falla para todos, sospecha del perímetro o del propio destino. Para despejar el perímetro se prueba el mismo servicio desde otra red (datos móviles). El firewall de Windows además aplica perfiles (dominio, privado, público): una red clasificada como pública aplica reglas más restrictivas y rompe aplicaciones internas; reclasificar la red lo arregla.",
    "example": "Una app de escritorio no sincroniza solo en un portátil: probado desde el móvil con datos funciona; el portátil tenía la red clasificada como pública; al reclasificarla como de dominio, la sincronización arranca."
  },
{
    "id": "seed-hd-dmz",
    "term": "DMZ (zona desmilitarizada)",
    "acronym": "DMZ",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Zona intermedia aislada para servicios expuestos a internet sin que toquen directamente la red interna.",
    "longDefinition": "Servidores públicos (web, pasarela VPN) se colocan en la DMZ, con reglas estrictas y mínimas entre la DMZ y la red interna. Como concepto de soporte explica por qué un servidor accesible desde fuera no ve las carpetas internas: las comunicaciones entre zonas se controlan regla a regla. Cuando un servicio de la DMZ 'deja de enviar' hacia dentro, casi siempre es una regla cerrada en un cambio reciente, y el ticket va al equipo de perímetro, no al de aplicaciones.",
    "example": "El portal de clientes funciona pero sus correos de confirmación no salen: la app está en DMZ y la regla hacia el relay interno de correo se cerró en el último despliegue; perímetro la reabre y las confirmaciones vuelven."
  },
{
    "id": "seed-hd-router-domestico-vs-corporativo",
    "term": "Router doméstico vs equipo de red corporativo",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "El router de casa integra NAT, DHCP, Wi-Fi y switch en una caja; la corporativa separa funciones gestionadas.",
    "longDefinition": "En casa: un aparato, interfaz web sencilla, sin VLANs ni 802.1X, DNS del ISP y reiniciar resuelve el 90% de los casos. En empresa: switches de acceso, controlador de APs, routers y perímetro gestionados y monitorizados; no se reinicia nada sin coordinar. Para el HelpDesk importa delimitar alcance: en una incidencia de teletrabajador, la parte doméstica (router, ISP, latiguillos) es terreno de soporte guiado, y la corporativa (VPN, perfil, DNS) es la que se puede auditar y escalar.",
    "example": "Teletrabajador sin VPN tras un corte de luz en su casa: se le guía para reiniciar su router doméstico y el equipo arranca; se documenta que su portátil y su perfil VPN están OK y el fallo era local de su red."
  },
{
    "id": "seed-hd-latencia-jitter",
    "term": "Latencia y jitter",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Latencia: tiempo que tarda un paquete en llegar; jitter: cuánto varía esa latencia entre paquetes seguidos.",
    "longDefinition": "Se miden con ping -t: los milisegundos de cada respuesta son la latencia y su variación es el jitter. La voz y el vídeo sufren el jitter aunque la latencia media sea buena: una llamada con 30 ms de media pero picos de 300 ms se oye robótica. Causas habituales: Wi-Fi saturada o lejana, enlace saturado en cola y distancia geográfica. La clave de L1: medir en el momento de la queja, no después, y de forma continua (dos minutos de ping -t valen más que cualquier captura posterior).",
    "example": "Queja de 'voz robótica' en las llamadas: ping -t durante una llamada muestra 25, 40, 300, 25 ms (jitter alto) por Wi-Fi; con cable la secuencia se aplana a 1-2 ms de variación: la causa era la radio, no la centralita."
  },
{
    "id": "seed-hd-packet-loss",
    "term": "Pérdida de paquetes (packet loss)",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Paquetes que no llegan a su destino: cortes de voz, vídeo congelado o transferencias que no terminan.",
    "longDefinition": "Se mide con ping -t y se lee en el porcentaje de perdidos: lo normal es 0%, y un 2% ya molesta a la voz. TCP la disfraza retransmitiendo (se percibe lentitud) y UDP la enseña (se perciben cortes): eso orienta el diagnóstico. Para localizarla: ping al gateway (si pierde, el problema es local: Wi-Fi o cable) frente a ping a IP pública (si solo pierde fuera, es del operador o del destino); pathping concreta el salto responsable.",
    "example": "Videollamadas entrecortadas en una planta: ping -t al gateway desde esa planta pierde un 5% mientras el resto del edificio está a 0%; el problema está entre el AP de esa planta y el switch: se prueba por cable para aislar y se escala."
  },
{
    "id": "seed-hd-bandwidth-vs-throughput",
    "term": "Bandwidth vs throughput",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Bandwidth: capacidad teórica del enlace contratado; throughput: lo que de verdad consigues en cada momento.",
    "longDefinition": "La confusión alimenta tickets: 'pago 600 Mbps y navego a 40'. El gap lo explican la Wi-Fi lejana, el mismatch de dúplex, el servidor lento del otro extremo o el propio método de medición (una descarga no mide tu línea, mide el origen). El diagnóstico de L1 compara escenarios: test por cable frente a test por Wi-Fi, en el puesto frente a junto al AP. La conclusión honesta se expresa en hechos medidos, no en promesas de tarifa.",
    "example": "Usuario indignado por 'internet lenta': el test por cable da 580 Mbps y por Wi-Fi en su puesto, 45 Mbps; el cuello es su enlace inalámbrico por distancia e interferencia; se propone punto de red o acercar el AP."
  },
{
    "id": "seed-hd-mtu",
    "term": "MTU (Maximum Transmission Unit)",
    "acronym": "MTU",
    "category": "HelpDesk - Redes (Networking)",
    "shortDefinition": "Tamaño máximo de paquete que admite el enlace; excederlo sin poder fragmentar rompe conexiones a medias.",
    "longDefinition": "El estándar Ethernet es 1500 bytes, pero VPN y algunos enlaces (PPPoE) reducen el espacio útil por su sobrecarga. El síntoma clásico es selectivo y desesperante: páginas pequeñas y ping cargan, pero páginas grandes o formularios no terminan; y solo con la VPN conectada. Se diagnostica con ping destino -f -l 1472 (prohibiendo fragmentar) bajando el tamaño hasta que pase: el valor que funciona más 28 es el MTU real. El ajuste se hace en la interfaz o en el perfil VPN y es un fix legítimo cuando el operador o el túnel lo exigen.",
    "example": "Con la VPN activa el portal del banco carga a medias y el resto va bien: ping banco -f -l 1472 falla y con -l 1400 pasa; se ajusta el MTU de la interfaz a 1400 y el portal carga completo."
  },
{
    "id": "seed-hd-microsoft-365",
    "term": "Microsoft 365 (suites y planes)",
    "acronym": "M365",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "Suscripción que agrupa Office, Exchange, Teams, Intune y seguridad según el plan (Business, E3, E5).",
    "longDefinition": "La suite de suscripción que combina las apps de escritorio, los servicios en la nube y la gestión de dispositivos en un solo plan. Cada SKU (Business Basic/Standard/Premium, E1, E3, E5, F3) habilita características distintas: por ejemplo, solo E5 trae Defender para Office 365 Plan 2, y Autopilot requiere Intune. En soporte, conocer el plan del usuario evita tickets imposibles: si pide una función que su SKU no incluye, la resolución es de licencias, no de configuración. L1 confirma el plan en el Centro de administración, en el usuario, pestaña Licencias y aplicaciones.",
    "example": "Un usuario de Business Standard pide archivado ilimitado en Exchange y cifrado de mensajes: revisas su SKU, esas funciones son de E3/E5 y derivas el ticket al equipo de licencias para evaluar un cambio de plan."
  },
{
    "id": "seed-hd-centro-administracion-m365",
    "term": "Centro de administración de Microsoft 365",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "Portal de gestión del tenant (admin.microsoft.com): usuarios, licencias, salud del servicio y ajustes.",
    "longDefinition": "La consola web donde vive la administración cotidiana del tenant: Usuarios activos (reset, licencias, bloqueo), Salud del servicio, Message Center, facturación y ajustes de la organización. L1 trabaja aquí la mayoría de casos de M365: buscar usuario, ver licencias asignadas, restablecer contraseña o forzar el cierre de sesión. Las opciones visibles dependen de los roles de administrador de la cuenta de soporte (por ejemplo, Helpdesk Admin ve poco más que usuarios). Si una opción aparece gris, casi siempre falta rol: identifica qué rol falta antes de derivar el ticket.",
    "example": "El usuario no puede activar Office: buscas su cuenta en Usuarios activos, abres la pestaña Licencias y aplicaciones y ves que perdió la de E3 tras un cambio de puesto; reasignas y el ticket se cierra en dos minutos."
  },
{
    "id": "seed-hd-service-health",
    "term": "Estado del servicio (Service Health)",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "Panel del Centro de administración con incidentes y degradaciones activas por servicio y región.",
    "longDefinition": "Distingue la masa crítica: si Exchange está degradado en tu región, no diagnostiques 40 tickets de correo uno a uno. Se consulta en el Centro de administración, sección Salud del servicio, filtrando por servicio (Exchange, Teams, Intune) y por tipo de aviso (incidente o asesoramiento). Buena práctica L1: revisarlo al inicio del turno y ante cualquier pico de tickets del mismo tipo; si hay incidente con ID, se referencia en los tickets para cerrarlos como causa conocida. Los administradores suscritos reciben además los avisos por correo, lo que permite anticipar la ola de llamadas.",
    "example": "Ola de llamadas de 'Outlook no conecta': abres Service Health, hay un incidente con ID en Europa sobre conectividad de Exchange; comunicas estado y ETA, y enlazas el incidente en los tickets en vez de diagnosticar cada caso."
  },
{
    "id": "seed-hd-message-center",
    "term": "Message Center",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "Avisos oficiales de cambios próximos en el tenant: nuevas funciones, retiradas y plazos de aplicación.",
    "longDefinition": "El tablón de anuncios de Microsoft para administradores: cambios de producto, retiradas (por ejemplo, fin de la autenticación heredada), configuraciones nuevas por defecto y fechas de despliegue. Para L2 es la primera fuente cuando algo 'dejó de funcionar sin que nadie tocara nada': los cambios del servicio explican muchos comportamientos nuevos. Cada mensaje indica impacto y se puede marcar como leído o compartir por correo. Revisarlo cada semana permite anticipar oleadas de tickets, como las provocadas por cambios de interfaz en Teams.",
    "example": "Usuarios reportan que ya no ven una pestaña de Forms en Teams: en Message Center hay un aviso de despliegue gradual de la nueva interfaz; respondes con el enlace del aviso y evitas escaladas."
  },
{
    "id": "seed-hd-exchange-online",
    "term": "Exchange Online",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "Servidor de correo hospedado en la nube de Microsoft: buzones, grupos y flujo de correo del tenant.",
    "longDefinition": "La versión SaaS de Exchange que aloja los buzones del tenant: reglas de transporte, cuotas (100 GB en E3/E5, más archivado), grupos de distribución y protección antispam. En soporte distingue claramente el servicio (Exchange) del cliente (Outlook): si OWA funciona y Outlook no, el problema es local, no del buzón. L1 gestiona aquí permisos de buzón (Enviar en nombre de, acceso delegado), reglas y reenvíos desde el Centro de administración de Exchange, y deriva a L2 el seguimiento de mensajes (Message trace) cuando un correo no llega. Las cuarentenas antispam se revisan también desde este centro o desde Defender, según el plan.",
    "example": "'No me llega correo de un proveedor': L1 pide cabeceras y un ejemplo, L2 hace Message trace, ve que el mensaje fue rechazado por una regla de transporte y corrige el filtro sin tocar el cliente del usuario."
  },
{
    "id": "seed-hd-outlook-cliente",
    "term": "Outlook (cliente)",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "App de correo y calendario de Microsoft: el cliente más usado y el que más tickets genera en M365.",
    "longDefinition": "El cliente rico de correo y calendario: mantiene un perfil de Windows por usuario, se autentica contra el tenant y sincroniza el buzón a un OST local. En L1, buena parte de los 'problemas de Exchange' son problemas de cliente: caché corrupta, perfil roto, credenciales caducadas en el Administrador de credenciales o versiones antiguas sin autenticación moderna. La regla de oro del triaje: reproducir en OWA; si OWA funciona, se trabaja el cliente (reparar perfil, limpiar caché, actualizar) sin escalar al equipo de mensajería. Antes de nada, comprobar la versión: builds sin soporte provocan fallos raros de conexión.",
    "example": "Usuario con correos que 'desaparecen' en Outlook pero visibles en OWA: era el filtro de vista del cliente; compruebas el filtro 'Todos' y se cierra sin tocar el buzón real."
  },
{
    "id": "seed-hd-modo-cache-exchange",
    "term": "Modo caché de Exchange (OST)",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "Configuración por defecto de Outlook: copia local del buzón (OST) para trabajar rápido y desconectado.",
    "longDefinition": "Outlook descarga el buzón a un archivo OST local y trabaja contra él, sincronizando en segundo plano: por eso abre rápido y funciona sin red. La contrapartida de soporte: lo que ves es la caché, no siempre el buzón real, y un OST dañado produce síntomas raros (carpetas vacías, correos que no salen, discrepancias con OWA). Diagnóstico típico: comparar con OWA; si difieren, la caché miente. Soluciones en orden: actualizar carpetas, comprimir o reparar el archivo de datos, o recrear el perfil para regenerar el OST, que se reconstruye solo desde el servidor sin perder correo.",
    "example": "Usuario ve una carpeta compartida vacía en Outlook pero llena en OWA: sospechas OST corrupto; recreas el perfil, el OST se regenera y la carpeta aparece completa tras la primera sincronización."
  },
{
    "id": "seed-hd-ost-vs-pst",
    "term": "OST vs. PST",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "OST: copia local del buzón que se regenera sola; PST: archivo de datos portable que se puede perder.",
    "longDefinition": "Dos archivos de datos de Outlook con roles opuestos. El OST es espejo del buzón de Exchange/365: se puede borrar sin perder correo porque se resincroniza. El PST es un contenedor independiente (copias locales, archivo histórico, exportaciones): lo que entra ahí solo vive ahí, se corrompe con facilidad, se olvida en discos y es el clásico punto de fuga de datos. En soporte: nunca 'solucionar' la falta de espacio moviendo buzones a PST, y ante un PST dañado, repararlo con la herramienta de Inbox Repair (scanpst) siempre sobre una copia previa. Los archivos viven bajo la carpeta de datos de Outlook en el perfil de usuario.",
    "example": "Usuario con buzón lleno pide 'pasarlo todo a un PST': le explicas el riesgo y ofreces archivado en línea; si insiste, el PST queda registrado en el ticket como excepción fuera del respaldo corporativo."
  },
{
    "id": "seed-hd-reparar-perfil-outlook",
    "term": "Reparación de perfil de Outlook",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "Procedimiento L1: recrear el perfil desde Panel de control (Correo) para regenerar OST y credenciales.",
    "longDefinition": "El comodín del L1 de Outlook: cuando el cliente falla sin causa clara (sincronización rara, pide contraseña en bucle, carpetas fantasma), se crea un perfil nuevo desde Panel de control, applet Correo, Mostrar perfiles, se elimina el viejo y Outlook reconstruye el OST. Antes de nada: respaldar firmas, autocompletado y los PST vinculados, y anotar el modo de caché y las cuentas adicionales. El perfil no borra el buzón, solo la configuración local. Es el paso típico justo antes de reinstalar Office y resuelve más de la mitad de los tickets 'raros' de cliente.",
    "example": "Outlook pide credenciales en bucle tras un cambio de contraseña: limpias las credenciales en el Administrador de credenciales y sigue igual; recreas el perfil y la autenticación moderna vuelve a pedir y guardar el token."
  },
{
    "id": "seed-hd-owa",
    "term": "Outlook en la web (OWA)",
    "acronym": "OWA",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "Outlook por navegador: la herramienta de triaje para separar problema de cliente y problema de servicio.",
    "longDefinition": "El cliente web del buzón: sin caché local, sin perfil y siempre con la versión del servicio. Esa neutralidad lo convierte en el discriminador estrella de L1: si el problema se reproduce en OWA, el buzón o el servicio están en juego (reglas, permisos, incidente); si OWA va bien y Outlook no, el trabajo es de cliente. También sirve para comprobar en segundos que el buzón existe, que la cuenta está habilitada y qué carpetas tiene realmente el usuario. Al iniciar sesión en OWA se valida de paso la autenticación y el MFA del usuario.",
    "example": "'No recibo correos desde ayer': abres OWA con el usuario y ves los correos en bandeja; el problema es del cliente: pasas a reparar perfil en vez de abrir ticket al equipo de mensajería."
  },
{
    "id": "seed-hd-teams-cache",
    "term": "Teams (cliente y caché)",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "Cliente de reuniones y chat: su caché local se corrompe y provoca fallos de login, chats y notificaciones.",
    "longDefinition": "Teams mantiene perfil, caché y tokens en carpetas locales del usuario (distintas en Teams clásico y en la nueva versión) y se daña con facilidad. El sintomario clásico: bucle de inicio de sesión, chats que no cargan, estado 'desconectado' con red fina o notificaciones perdidas. El fix universal L1: cerrar Teams por completo (incluido el proceso de la bandeja) y limpiar la carpeta de caché de la versión instalada; se regenera sola al arrancar. Paso previo: comprobar versión y actualización forzada, porque las builds antiguas provocan fallos que ya están corregidos. Reinstalar es el último recurso, no el primero.",
    "example": "Usuario en bucle de inicio de sesión en Teams: matas el proceso, limpias la caché local del cliente, al reabrir pide MFA una sola vez y entra; ticket cerrado sin reinstalar nada."
  },
{
    "id": "seed-hd-onedrive-sincronizacion",
    "term": "OneDrive (sincronización)",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "Cliente que sincroniza OneDrive y bibliotecas de SharePoint con carpetas locales e iconos de estado.",
    "longDefinition": "El motor de sincronización (OneDrive.exe) replica en el equipo los archivos de OneDrive personal y de las bibliotecas de SharePoint sincronizadas: los iconos de estado (verde sincronizado, círculo en curso, rojo error) son el primer diagnóstico. Problemas típicos de todos los días: sincronización en pausa por falta de espacio o sesión caducada, nombres de archivo con caracteres no admitidos (por ejemplo * : < > ?), rutas demasiado largas, y conflictos de copia que crean carpetas con el sufijo del nombre del PC. El fix escalonado: pausar y reanudar, cerrar sesión y volver a iniciarla, usar el botón Restablecer del cliente (re-sincroniza sin perder datos) y, como último recurso, desvincular y vincular de nuevo el equipo.",
    "example": "Usuario con 'archivos que no suben': icono rojo; abres la lista de errores del cliente, hay un archivo con un '*' en el nombre; lo renombra y la cola de sincronización se vacía sola."
  },
{
    "id": "seed-hd-known-folder-move",
    "term": "Known Folder Move (KFM)",
    "acronym": "KFM",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "Redirección de Escritorio, Documentos e Imágenes a OneDrive para que el respaldo sea automático.",
    "longDefinition": "La configuración que redirige las carpetas conocidas de Windows (Escritorio, Documentos, Imágenes) dentro de OneDrive, de modo que lo que el usuario deja en el escritorio se sincroniza y le espera en el equipo nuevo. Se despliega por directiva (GPO o Intune) y en soporte responde a la pregunta estrella del usuario: '¿por qué mi Escritorio está en OneDrive?'. Consecuencias prácticas: borrar un archivo del escritorio lo borra en la nube (se recupera de la papelera de reciclaje de OneDrive), y un KFM a medias produce escritorios 'vacíos' en el portátil nuevo si la primera sincronización no terminó antes del cambio de equipo.",
    "example": "Usuario con portátil recién reemplazado: 'se ha perdido mi escritorio'; compruebas que KFM estaba activo pero faltaba terminar la sincronización inicial de 20 GB; al completarse reaparecen todos sus accesos directos y documentos."
  },
{
    "id": "seed-hd-sharepoint-sitios-permisos",
    "term": "SharePoint (sitios y permisos)",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "Plataforma de sitios y bibliotecas del tenant: el acceso se hereda del sitio, no se concede archivo a archivo.",
    "longDefinition": "Cada equipo de Microsoft Teams lleva detrás un sitio de SharePoint, y cada canal es una carpeta de la biblioteca de documentos. La regla que evita tickets infinitos: los permisos se heredan del sitio (propietarios, miembros, visitantes); conceder permisos sueltos sobre un documento rompe la herencia y crea un mosaico imposible de auditar. L1 concede acceso añadiendo al usuario al grupo correcto del sitio o al equipo de Teams, nunca compartiendo 'solo ese archivo' salvo excepción aprobada. Para los 'no puedo ver X': localizar primero en qué sitio vive el archivo y qué rol tiene el usuario allí.",
    "example": "'No puedo editar el Excel del canal Finanzas': compruebas que el usuario es visitante del sitio, no miembro del equipo; lo añades al equipo de Teams en vez de compartir el archivo y la herencia vuelve a funcionar."
  },
{
    "id": "seed-hd-licencias-m365",
    "term": "Licencias de Microsoft 365 (asignación)",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "Cada usuario necesita su SKU asignada (y con stock libre) para que funcionen Exchange, Teams u Office.",
    "longDefinition": "La licencia es la llave maestra: sin ella el buzón queda sin cuota, Teams no entra y Office pasa a solo lectura. Se asigna en el usuario, pestaña Licencias y aplicaciones, y cada asignación consume una unidad de las compradas (Facturación, Licencias). Comprobación L1 ante cualquier fallo raro de un usuario: primero mirar si tiene licencia y cuál (Business frente a E3 cambia funciones), luego lo demás. Ojo con los grupos de licencias automáticos: si el usuario sale del grupo, pierde la licencia y sus datos entran en un periodo de gracia de 30 días antes de eliminarse, así que la pérdida de grupo es urgente de corregir.",
    "example": "Usuario 'sin Teams' de un día para otro: en Licencias ya no aparece E3; salió del grupo de licencias por un cambio del atributo de departamento; se corrige el atributo, el grupo reasigna la licencia y Teams vuelve en minutos."
  },
{
    "id": "seed-hd-licencia-sin-asignar",
    "term": "Licencia sin asignar (error de activación)",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "Aviso rojo en las apps de Office ('producto sin licencia') cuando falta la licencia o la sesión es errónea.",
    "longDefinition": "Office y las apps de escritorio muestran banners de 'Producto sin licencia' o pasan a solo lectura cuando la suscripción del usuario no está asignada, expiró o firmó con la cuenta equivocada (una personal en vez de la corporativa). Flujo L1: verificar en el Centro de administración que la licencia está activa, cerrar sesión en todas las apps de Office y volver a iniciarla con la cuenta corporativa; si persiste, reparar la activación con la herramienta SaRA (Support and Recovery Assistant) de Microsoft, que diagnostica y resetea el estado de licencias local. Este error en masa suele ser un incidente de licencias del tenant, no un problema de usuario.",
    "example": "'Word me dice producto sin licencia': la licencia E3 estaba bien pero el usuario había firmado Office con su cuenta personal; cierras sesión, vuelve a firmar con su UPN corporativo y el banner desaparece."
  },
{
    "id": "seed-hd-activacion-office",
    "term": "Activación de Office (suscripción)",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "Office de suscripción comprueba la licencia al firmar y renueva el token; sin conexión prolongada se degrada.",
    "longDefinition": "Office moderno no usa claves perpetuas: se activa al iniciar sesión con la cuenta corporativa contra el servicio de licencias de Microsoft y renueva el token local periódicamente; si el equipo no puede renovar durante semanas (por ejemplo, sin conexión), las apps entran en modo reducido de solo lectura. Fallos típicos en soporte: cuentas personal y corporativa mezcladas en la misma instalación, tokens caducados en el Administrador de credenciales, proxy o firewall que bloquea los puntos de conexión de activación, o licencia retirada al usuario. La herramienta SaRA de Microsoft diagnostica y resetea el estado de activación cuando lo manual no basta.",
    "example": "Portátil de vacaciones dos meses sin conexión: Word abre en modo solo lectura; al firmar de nuevo con la cuenta corporativa y conectarse, la licencia se renueva en minutos y todo vuelve a la normalidad."
  },
{
    "id": "seed-hd-activacion-equipo-compartido",
    "term": "Activación en equipo compartido (SCA)",
    "acronym": "SCA",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "Modo de activación para PCs multiusuario (aulas, salas): cada usuario activa su propia licencia al firmar.",
    "longDefinition": "La activación de equipo compartido permite que un mismo PC con Office instalado sirva a muchos usuarios con licencias distintas: al firmar cada uno, Office toma su licencia y libera la del anterior. Se configura marcando la propiedad SharedComputerLicensing en la instalación, típico en escritorios virtuales no persistentes y PCs de hotelling. En soporte: si en un equipo compartido solo a un usuario le falla Office, mira su licencia o su cuenta, no el PC; y si falla para todos, verifica la marca de SCA del equipo y la carpeta de licencias compartidas en el directorio de datos de programa. Sin SCA, el primero que firma monopoliza la activación y el resto queda en modo reducido.",
    "example": "En un aula con 20 alumnos, uno no puede usar Word: su cuenta no tiene licencia de M365; el resto activa sin problema porque SCA está bien configurado; se resuelve asignándole licencia, no reinstalando Office."
  },
{
    "id": "seed-hd-company-portal",
    "term": "Portal de empresa (Company Portal)",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "App del usuario para inscribirse, ver estado del dispositivo, instalar apps y sincronizar con Intune.",
    "longDefinition": "La aplicación de autoservicio de Intune en Windows, iOS y Android: desde ella el usuario inscribe el dispositivo, comprueba si es conforme, instala las apps publicadas y fuerza una sincronización manual. En L1 es tu brazo extendido: muchos tickets se resuelven pidiendo al usuario que abra el portal, sincronice y lea su estado de cumplimiento, sin que el técnico entre al equipo. También muestra el nombre con el que el dispositivo quedó inscrito, dato clave para localizarlo en Intune. Si el portal marca 'no conforme', el propio estado detalla qué requisito falla (antivirus, versión, cifrado) y eso dirige la solución.",
    "example": "Usuario con correo bloqueado en el móvil: en Company Portal el estado es 'no conforme' con detalle 'versión de iOS antigua'; actualiza, sincroniza y el acceso se restablece sin intervención del técnico."
  },
{
    "id": "seed-hd-windows-autopilot",
    "term": "Windows Autopilot",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "Aprovisionamiento zero-touch: el PC nuevo se configura e inscribe solo al primer inicio de sesión.",
    "longDefinition": "Autopilot asocia el hardware (hash del equipo) a un perfil del tenant: al encender un equipo nuevo de fábrica y firmar con la cuenta corporativa, Windows se une a Entra, se inscribe en Intune y recibe configuración y apps sin que soporte lo toque. El hash se registra al comprar con el fabricante o se captura con el script Get-WindowsAutopilotInfo. Problemas típicos: equipos que no arrancan el flujo (hash no registrado o sin perfil asignado), usuarios atascados en la página de estado de inscripción (ESP) por una app o script que falla, o perfil incorrecto por grupo mal asignado. L1 verifica el estado del dispositivo en Intune antes de asumir hardware defectuoso.",
    "example": "Portátil nuevo se queda 'preparando el dispositivo' 40 minutos: la ESP está atascada en una app de línea de negocio; la marcas como no bloqueante en el perfil ESP y los siguientes equipos terminan el despliegue a tiempo."
  },
{
    "id": "seed-hd-inscripcion-dispositivo",
    "term": "Inscripción de dispositivo (enrollment)",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "Proceso por el que un equipo o móvil queda bajo gestión de Intune y empieza a recibir directivas y apps.",
    "longDefinition": "La inscripción crea el objeto del dispositivo en Intune y establece el canal de gestión (MDM): a partir de ahí recibe perfiles, apps y políticas de cumplimiento. Formas típicas: automática durante Autopilot, manual desde el Portal de empresa, por GPO en entornos híbridos, o bloqueada y permitida según las restricciones del tenant. Síntomas de inscripción rota: el equipo no recibe nada y en Intune figura 'sin contacto' desde hace semanas; el fix suele ser re-inscribir tras comprobar que la cuenta puede inscribir dispositivos y que el equipo no está bloqueado. Diferencia clave: un equipo solo registrado en Entra puede no estar gestionado por Intune, y por eso no le llega ninguna directiva.",
    "example": "PC que no instala las apps corporativas: en Intune figura inscrito pero 'último check-in hace 12 días'; se re-inscribe desde Company Portal y arranca a recibir directivas en la primera sincronización."
  },
{
    "id": "seed-hd-perfil-configuracion-intune",
    "term": "Perfil de configuración (Intune)",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "Directiva de ajustes (Wi-Fi, VPN, cifrado, restricciones) que Intune aplica a los dispositivos asignados.",
    "longDefinition": "Los perfiles son las 'directivas de grupo' del mundo MDM: cada uno define un tipo de ajuste (plantillas administrativas, Wi-Fi, VPN, BitLocker, requisitos de contraseña) y se asigna a grupos de usuarios o dispositivos. En soporte, cuando un ajuste 'no se aplica': comprobar a qué grupo está asignado el perfil y si el usuario o equipo pertenece realmente, el estado del dispositivo (inscrito y conforme) y el error por dispositivo en el propio perfil (filtrado por regla de aplicabilidad o fallo al aplicar). Los perfiles conviven y el último aplicado gana según el tipo, así que un cambio reciente en otro perfil explica las regresiones repentinas.",
    "example": "Usuarios sin el Wi-Fi corporativo en el móvil: el perfil de Wi-Fi estaba asignado a un grupo dinámico que dejó de incluirlos; corriges la regla de pertenencia y el ajuste llega en la próxima sincronización."
  },
{
    "id": "seed-hd-politica-cumplimiento-intune",
    "term": "Política de cumplimiento (Intune)",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "Reglas que un dispositivo debe cumplir (cifrado, antivirus, versión de SO) y las acciones si no las cumple.",
    "longDefinition": "Define los requisitos mínimos del dispositivo (BitLocker, estado del antivirus, versión mínima de Windows o iOS, dispositivo no rooteado) y qué hacer si no se cumplen: marcarlo como no conforme, avisar por correo al usuario o programar acciones como el bloqueo. Su resultado alimenta el acceso condicional: solo los dispositivos conformes entran al correo y al resto de recursos. En soporte es la causa habitual de accesos bloqueados: el usuario dice 'no puedo entrar al correo' y el motivo real es que su dispositivo incumple una regla recién publicada. El detalle del dispositivo en Intune, sección Cumplimiento, dice exactamente qué regla falla.",
    "example": "Nueva política que exige una versión reciente de Windows: 300 equipos pasan a no conformes y pierden el acceso; el detalle de cumplimiento señala 'versión del sistema operativo' y se planifica el despliegue con periodo de gracia."
  },
{
    "id": "seed-hd-dispositivo-no-conforme",
    "term": "Dispositivo no conforme",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "Estado de un dispositivo que incumple una política: el acceso condicional le bloquea los recursos.",
    "longDefinition": "No conforme no significa infectado: significa que alguna regla de cumplimiento no se verifica (cifrado pendiente, antivirus desactualizado, versión vieja, jailbreak detectado). La consecuencia práctica es que el acceso condicional le niega el correo, Teams o SharePoint hasta que cumpla la regla o venza el periodo de gracia. Flujo L1: pedir al usuario que abra el Portal de empresa y lea el motivo exacto del incumplimiento, aplicar la corrección (cifrar, actualizar) y forzar sincronización; si no aparece motivo o no se corrige, mirar el estado del dispositivo en el portal de Intune. Un 'no conforme' masivo y repentino suele ser una política nueva, no cientos de equipos averiados a la vez.",
    "example": "Usuario sin correo en el móvil tras las vacaciones: iOS tenía una actualización pendiente; en Company Portal aparece 'sistema operativo no compatible'; actualiza, sincroniza y a los minutos vuelve a conforme."
  },
{
    "id": "seed-hd-checkin-intune",
    "term": "Check-in / sincronización de Intune",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "Contacto periódico del dispositivo con Intune para reportar estado y recibir directivas; se puede forzar.",
    "longDefinition": "Cada dispositivo gestionado 'llama a casa' cada unas 8 horas (y en eventos como inscripción o arranque) para reportar inventario y cumplimiento y bajar perfiles, apps y acciones remotas. Ese retardo explica que 'la directiva ya está asignada pero el equipo no cambia'. Se fuerza desde el Portal de empresa (Configuración, Sincronizar), desde Windows (Acceso profesional o educativo, Sincronizar) o con la acción Sincronizar remota de Intune sobre el dispositivo. Buena regla L1: tras asignar o cambiar una directiva, pedir sincronización y esperar a que la página del dispositivo muestre el check-in fresco antes de escalar que 'no llega'.",
    "example": "Acabas de asignar el perfil de VPN al grupo del usuario y 'no aparece nada': pides sincronizar desde Company Portal, a los dos minutos el dispositivo reporta el perfil aplicado y el usuario conecta."
  },
{
    "id": "seed-hd-retirar-borrar-dispositivo",
    "term": "Retirar o borrar dispositivo (retire / wipe)",
    "category": "HelpDesk - Microsoft 365",
    "shortDefinition": "Acciones remotas de Intune: retirar desgestiona; borrar restaura de fábrica. Irreversibles y con autorización.",
    "longDefinition": "Retire desinscribe el equipo de la gestión conservando en general los datos del usuario (salvo que marques explícitamente eliminar cuentas y datos) y es lo correcto en cambios de puesto o traspasos de equipo. Wipe formatea el dispositivo (con Autopilot Reset opcional para dejarlo listo para reasignar) y se reserva para pérdidas, robos o bajas definitivas; en iOS se puede enviar incluso si está sin conexión (queda como comando pendiente). Ambas se lanzan desde Intune, sección Dispositivos, dejan registro de auditoría y deben ir respaldadas por ticket con aprobación: son de las pocas acciones de L1 que destruyen datos de usuarios. Antes de un wipe por robo, confirmar con el responsable y valorar localización y bloqueo.",
    "example": "Reportan un portátil robado: verificas el ticket y la aprobación del responsable, lanzas Wipe desde Intune, el equipo se borrará en cuanto se conecte y adjuntas la confirmación al caso con su número de serie."
  },
{
    "id": "seed-hd-unidad-organizativa",
    "term": "Unidad organizativa (OU)",
    "acronym": "OU",
    "category": "HelpDesk - AD / Identidad",
    "shortDefinition": "Contenedor de AD donde viven usuarios, equipos y grupos, y sobre el que se aplican GPO y delegación.",
    "longDefinition": "La OU es la carpeta del árbol de AD con la que se estructura la empresa (por sede, departamento o tipo de objeto) y el punto de aplicación de directivas y permisos delegados: 'los usuarios de la OU de RR. HH. reciben esta directiva' y 'HelpDesk puede restablecer contraseñas solo en la OU de Madrid'. En soporte, la ubicación de un objeto importa: un usuario en la OU equivocada no recibe sus mapeos ni permite el reset delegado. Comprobación rápida: la pestaña Objeto en ADUC (o el distinguishedName por PowerShell) y mover con arrastrar y soltar si el cambio de puesto no se propagó desde RR. HH.",
    "example": "Un técnico intenta restablecer la contraseña de una compañera y 'no tiene permisos': su cuenta sigue en la OU de Empleados y la delegación del HelpDesk solo cubre la OU de Madrid; se tramita el movimiento correcto y el reset vuelve a funcionar."
  },
{
    "id": "seed-hd-grupo-seguridad-vs-distribucion",
    "term": "Grupo de seguridad vs. grupo de distribución",
    "category": "HelpDesk - AD / Identidad",
    "shortDefinition": "Los de seguridad conceden permisos; los de distribución solo reparten correo y no evalúan acceso a recursos.",
    "longDefinition": "AD y Exchange manejan dos tipos: el grupo de seguridad se evalúa en el token de acceso del usuario y sirve para permisos sobre carpetas, aplicaciones y filtrado de directivas; el grupo de distribución solo existe como lista de correo (Exchange lo resuelve al entregar el mensaje) y no autoriza nada. El error clásico de soporte: usar una lista de distribución para 'dar acceso' a una carpeta compartida y ver que nunca funciona. A la inversa, conceder permisos con grupos de seguridad habilitados para correo provoca miembros que reciben mensajes sin pedirlo. Regla L1: permisos con grupo de seguridad; listas de correo con grupo de distribución o grupo de M365.",
    "example": "El nuevo de contabilidad no ve la carpeta del servidor: estaba añadido a la lista de distribución de noticias en vez del grupo de seguridad correcto; se corrige la membresía y el acceso aparece al reiniciar sesión."
  },
{
    "id": "seed-hd-pertenencia-grupos",
    "term": "Pertenencia a grupos (membresía efectiva)",
    "category": "HelpDesk - AD / Identidad",
    "shortDefinition": "El acceso real de un usuario es la suma de sus grupos directos y anidados; se consulta, no se adivina.",
    "longDefinition": "El token de acceso del usuario se construye con todos los grupos a los que pertenece, incluidos los heredados por anidamiento y según el ámbito de cada grupo: eso es la membresía efectiva, y es la que decide el acceso. En soporte no basta con mirar 'su grupo': hay que desplegar el árbol completo con la pestaña Miembro de en ADUC, la vista de pertenencia efectiva del grupo o PowerShell (Get-ADPrincipalGroupMembership, o el atributo tokenGroups para lo efectivo completo). Recuerda el detalle que ahorra tickets: los cambios de membresía solo aplican al iniciar sesión de nuevo, porque la sesión abierta conserva el token viejo.",
    "example": "Usuario con acceso 'fantasma' a una carpeta que ya se le retiró: se quitó del grupo directo pero sigue dentro de un grupo intermedio anidado; el informe de pertenencia efectiva lo delata y basta sacarlo del grupo correcto."
  },
{
    "id": "seed-hd-domain-users",
    "term": "Grupo Domain Users",
    "category": "HelpDesk - AD / Identidad",
    "shortDefinition": "Grupo global por defecto del dominio: todos los usuarios son miembros y no debe conceder nada específico.",
    "longDefinition": "Domain Users es el grupo primario por defecto de toda cuenta de usuario del dominio, así que la membresía es universal y de baja granularidad: sirve para directivas genéricas (GPO de usuarios estándar, acceso básico a internet) y es pésimo para permisos concretos. En soporte lo verás en dos contextos: algo 'extraño' que solo se explica porque un recurso se compartió con Domain Users (entra todo el dominio) y el diagnóstico de 'este usuario no pertenece a ningún grupo' (sí pertenece: a Domain Users, que no aparece en los listados normales de pertenencia precisamente por ser el grupo primario). Nunca usarlo para conceder acceso a datos sensibles.",
    "example": "Una carpeta 'confidencial' accesible para medio edificio: el recurso compartido concedía Modificar a Domain Users por un error de configuración; se sustituye por el grupo de seguridad específico y se vuelve a probar con un usuario ajeno."
  },
{
    "id": "seed-hd-gpupdate-force",
    "term": "gpupdate /force",
    "category": "HelpDesk - AD / Identidad",
    "shortDefinition": "Comando que re-aplica todas las directivas de equipo y usuario al momento, sin esperar el ciclo programado.",
    "longDefinition": "Las directivas de grupo se refrescan en segundo plano cada 90 minutos (más un aleatorio de hasta 30, y en arranque e inicio de sesión), así que los cambios de los administradores no son inmediatos. gpupdate /force re-evalúa todo al instante: se ejecuta en el equipo del usuario como paso L1 para comprobar si la directiva nueva 'ya llegó' o el problema es otro. Es el comando de triaje por excelencia: si tras forzar el ajuste aparece, era cadencia; si no aparece, toca mirar gpresult /r (qué directivas aplican y con qué errores), herencia bloqueada, filtrado de seguridad o ámbito de la OU. Si algo solo funciona ejecutando /force a mano, hay un problema de infraestructura de directivas que se debe reportar.",
    "example": "Activas un ajusto de directiva y el equipo del usuario no cambia: gpupdate /force y a continuación gpresult /r muestra que otra directiva de la OU padre gana la configuración; se reordenan los enlaces y ya aplica."
  },
{
    "id": "seed-hd-cuenta-equipo",
    "term": "Cuenta de equipo (computer account)",
    "category": "HelpDesk - AD / Identidad",
    "shortDefinition": "Objeto de AD que representa a cada PC del dominio; su contraseña la rota la propia máquina cada ~30 días.",
    "longDefinition": "Cada equipo unido al dominio tiene su objeto en AD con nombre terminado en dólar (WKS-1234$) y una contraseña de equipo que la propia máquina rota automáticamente cada 30 días; ese canal seguro es la base de la autenticación del equipo en el dominio. El fallo clásico: 'la relación de confianza entre la estación de trabajo y el dominio principal ha fallado', que significa que la cuenta local y AD desincronizaron la contraseña (imagen restaurada de hace meses, equipo mucho tiempo apagado, o alguien reseteó la cuenta). Solución estándar L1: re-unir el equipo al dominio (salir a grupo de trabajo, reiniciar y volver a unir) o reparar el canal con Test-ComputerSecureChannel -Repair. Antes de tocar: descartar un nombre de equipo duplicado en AD.",
    "example": "Portátil clonado desde una imagen vieja da 'relación de confianza rota': compruebas que no hay nombre duplicado, re-unes el equipo al dominio con la cuenta autorizada y el usuario firma con su perfil intacto."
  },
{
    "id": "seed-hd-contrasena-caducada-vs-bloqueada",
    "term": "Contraseña caducada vs. cuenta bloqueada",
    "category": "HelpDesk - AD / Identidad",
    "shortDefinition": "Diagnósticos distintos: la caducada se resuelve cambiando la contraseña; la bloqueada exige investigar el patrón.",
    "longDefinition": "El síntoma del usuario es el mismo ('no puedo entrar'), pero la acción cambia: la contraseña caducada (PasswordExpired) se resuelve con un cambio del propio usuario o un restablecimiento de soporte; la cuenta bloqueada (LockedOut) es el bloqueo temporal por intentos fallidos y se desbloquea con Unlock-ADAccount o esperando la ventana de la directiva. El valor real de distinguirlas: la cuenta que se bloquea cada cinco minutos revela una credencial vieja cacheada en algún sitio (móvil, servicio, unidad de red, tarea programada) o un ataque de fuerza bruta, y solo el patrón de bloqueo lo delata. El evento 4740 en el DC y los atributos LockedOut y PasswordExpired de Search-ADAccount dan la respuesta en segundos.",
    "example": "Cuenta bloqueada ocho veces en una mañana: Search-ADAccount -LockedOut la desbloquea, pero el 4740 señala un equipo de una planta como origen; allí hay una unidad de red con la contraseña vieja guardada; se corrige y los bloqueos se detienen."
  },
{
    "id": "seed-hd-cuenta-deshabilitada",
    "term": "Cuenta deshabilitada",
    "category": "HelpDesk - AD / Identidad",
    "shortDefinition": "Estado en el que el inicio de sesión se niega de plano: baja del empleado, vacaciones largas o sanción.",
    "longDefinition": "Deshabilitada es distinto de bloqueada y de caducada: la cuenta está apagada a propósito y el inicio de sesión se rechaza de inmediato (mensaje de cuenta deshabilitada o eventos de inicio fallido con ese código). Se gestiona con el atributo Enabled (Enable/Disable-ADAccount) y en soporte aparece en tres escenarios: la baja del empleado (debe permanecer así y el flujo pertenece a RR. HH. e IAM, nunca 'ayudar' re-habilitándola), usuarios de excedencia o vacaciones largas (se re-habilita con aprobación) y deshabilitaciones automáticas por inactividad o por seguridad tras un incidente. Antes de habilitar: verificar el motivo original en el ticket o pedir la aprobación correspondiente; re-habilitar cuentas de baja es un hallazgo de auditoría.",
    "example": "Un 'nuevo' empleado llama porque no puede entrar: la cuenta con su apellido estaba deshabilitada por una baja y la del nuevo aún no existía; se crea lo correcto en vez de re-habilitar la vieja y heredar sus grupos."
  },
{
    "id": "seed-hd-search-adaccount",
    "term": "Search-ADAccount (uso L1)",
    "category": "HelpDesk - AD / Identidad",
    "shortDefinition": "Cmdlet para buscar cuentas por estado: bloqueadas, caducadas, inactivas o deshabilitadas, en una sola línea.",
    "longDefinition": "El buscador de soporte de AD: en lugar de abrir ADUC y filtrar a mano, una línea devuelve las cuentas y equipos en estado anómalo. Uso diario: Search-ADAccount -LockedOut (quién está bloqueado ahora), -PasswordExpired (a quién le toca cambiar), -AccountInactive con -TimeSpan (informe de inactivos), -AccountDisabled, y -SearchBase para limitarlo a una OU. La ventaja real es la velocidad de triaje del 'no puedo entrar': el estado que devuelve (LockedOut, PasswordExpired, Disabled) decide la acción correcta en el primer minuto del ticket. Combínalo con Unlock-ADAccount o un restablecimiento, siempre después de la verificación de identidad del solicitante.",
    "example": "Ticket 'usuario bloqueado': Search-ADAccount -LockedOut confirma la cuenta; tras verificar la identidad por el canal establecido, Unlock-ADAccount y el ticket se cierra en menos de dos minutos."
  },
{
    "id": "seed-hd-unlock-adaccount",
    "term": "Unlock-ADAccount (uso L1)",
    "category": "HelpDesk - AD / Identidad",
    "shortDefinition": "Cmdlet estándar para desbloquear una cuenta; lo importante es averiguar por qué se bloqueó, no solo abrir.",
    "longDefinition": "Unlock-ADAccount desbloquea al instante y, con la delegación adecuada por OU, cualquier técnico lo ejecuta sin ser administrador del dominio. El uso correcto en L1 tiene tres partes: verificar la identidad del solicitante antes de tocar, desbloquear y, sobre todo, investigar el porqué (el evento 4740 en el DC muestra cuándo y desde qué equipo), porque los bloqueos recurrentes indican una credencial cacheada o fuerza bruta que seguirá repitiéndose. Desbloquear en bucle sin diagnóstico es tapar el problema; a la tercera repetición en poco tiempo se escala al equipo de identidades o a seguridad. El comando no cambia la contraseña: si la causa era una contraseña vieja en un dispositivo, hace falta además un cambio.",
    "example": "Tres desbloqueos de la misma cuenta en una hora: el 4740 apunta a un equipo de una planta; en ese PC hay una tarea programada corriendo con las credenciales viejas del usuario; se corrige y el patrón de bloqueos se detiene."
  },
{
    "id": "seed-hd-get-aduser",
    "term": "Get-ADUser (uso L1)",
    "category": "HelpDesk - AD / Identidad",
    "shortDefinition": "Consulta de usuario en AD por PowerShell; con -Properties se ven Enabled, LockedOut y PasswordExpired.",
    "longDefinition": "El cmdlet de consulta más usado del módulo ActiveDirectory: Get-ADUser con -Identity y, para diagnóstico, -Properties Enabled,LockedOut,PasswordExpired,LastLogonDate,PasswordLastSet. El error típico del principiante es olvidar -Properties, porque por defecto el cmdlet devuelve muy pocos atributos. En el triaje del 'no puedo entrar' es la primera línea que se ejecuta (¿existe? ¿habilitado? ¿bloqueado? ¿caducada? ¿cuándo entró por última vez?), y MemberOf explica los permisos. Detalle fino: LastLogonDate es aproximado (viene de la replicación; el exacto por DC es LastLogon), dato que importa al auditar inactividad.",
    "example": "'No puedo entrar' sin más contexto: Get-ADUser -Properties Enabled,LockedOut,PasswordExpired devuelve PasswordExpired en True; la acción es cambio de contraseña, no desbloqueo, y se evita un ciclo de tickets equivocado."
  },
{
    "id": "seed-hd-delegacion-reset-helpdesk",
    "term": "Delegación en AD (reset a HelpDesk)",
    "category": "HelpDesk - AD / Identidad",
    "shortDefinition": "Permiso de reset y desbloqueo concedido a HelpDesk por OU ('Delegar control'), sin dar admin de dominio.",
    "longDefinition": "AD permite delegar tareas finas por OU con el asistente Delegar control: el grupo del HelpDesk recibe Restablecer contraseña de usuario y, si se elige la opción, desbloquear cuenta, limitado a una OU y sin ningún otro derecho. Es el patrón que sostiene el L1: miles de restablecimientos sin repartir Domain Admin, con auditoría de quién ejecutó cada cambio y sin romper el principio de mínimo privilegio. En soporte, si un técnico no puede resetear a alguien, la causa habitual es que el objeto está fuera de la OU delegada (o es una cuenta protegida por AdminSDHolder), y la solución es mover al usuario o derivar la gestión al equipo con permiso.",
    "example": "Incorporación de 50 técnicos nuevos: se les añade al grupo delegado de HelpDesk-Madrid con reset y desbloqueo sobre la OU de Madrid; los eventos de auditoría dejan constancia de cada restablecimiento que ejecutan."
  },
{
    "id": "seed-hd-contrasena-nunca-caduca",
    "term": "Contraseña nunca caduca (flag a auditar)",
    "category": "HelpDesk - AD / Identidad",
    "shortDefinition": "Atributo PasswordNeverExpires: necesario en cuentas de servicio y bandera roja en cuentas de usuario normales.",
    "longDefinition": "El indicador saca la cuenta de la política de caducidad: razonable para cuentas de servicio (con controles compensatorios) y una excepción de riesgo en usuarios normales, porque esa contraseña envejece para siempre sin rotación obligatoria. En soporte aparece en dos momentos: el usuario que 'nunca ha cambiado su contraseña' (se confirma con PasswordLastSet) y los listados de auditoría donde el L1 suele ser el primero en ver la lista (Search-ADAccount -PasswordNeverExpires). Cualquier excepción nueva debe estar justificada y documentada; el remedio de soporte es reportar el hallazgo, nunca activar el indicador 'para que deje de molestar' al usuario.",
    "example": "Revisión trimestral: Search-ADAccount -PasswordNeverExpires devuelve cuatro cuentas de usuario normales con el indicador activo sin justificación; se eleva a seguridad y quedan como acción del informe con plazo."
  },
{
    "id": "seed-hd-logon-hours",
    "term": "Horas de inicio de sesión (logon hours)",
    "category": "HelpDesk - AD / Identidad",
    "shortDefinition": "Restricción horaria por cuenta en AD: fuera de su franja el login se rechaza. Causa de bloqueos 'periódicos'.",
    "longDefinition": "AD puede limitar por cuenta las horas en que se acepta el inicio de sesión (pestaña Cuenta en ADUC, atributo logonHours): típico en entornos con horarios estrictos, quioscos o políticas heredadas de antigüedad. El síntoma es un usuario que entra bien 'a veces' y otros días no, mientras que las sesiones ya abiertas no se cierran solas (la restricción golpea el login nuevo, no la sesión viva, salvo desconexión forzada por directiva). En el diagnóstico del 'no puedo entrar' se comprueba tras los estados básicos: Search-ADAccount no lo muestra, hay que mirar la pestaña de la cuenta. Para cambiarlo se tramita con RR. HH.: es un control de acceso, no un arreglo técnico de soporte.",
    "example": "Usuario de tienda que 'no puede entrar nunca los domingos': su cuenta tiene restringido el fin de semana por una política antigua del local; se tramita la ampliación horaria con el responsable y queda documentado en el ticket."
  },
{
    "id": "seed-hd-ingenieria-social-soporte",
    "term": "Ingeniería social (en soporte)",
    "category": "HelpDesk - Seguridad para Soporte",
    "shortDefinition": "Manipular al personal de soporte para obtener accesos: el helpdesk es el objetivo por excelencia.",
    "longDefinition": "Contra el helpdesk se ataca lo más fácil de engañar: la persona que atiende el teléfono y puede ejecutar restablecimientos, desbloqueos y cambios de MFA. Guiones típicos: urgencia ('estoy en una reunión con el cliente'), autoridad ('hablo de parte del director'), lástima ('es mi primer día') o presión de calendario ('cierra el trimestre hoy'). La defensa del L1 no es desconfiar de todo el mundo, sino seguir el procedimiento igual para todos: verificación de identidad antes de cualquier acción sensible, registro en el ticket y consulta a un L2 ante cualquier atajo que le pidan. La regla de oro: el procedimiento no se suspende por cortesía, prisa ni jerarquía.",
    "example": "Llamada de 'el CFO' pidiendo reset urgente desde un móvil desconocido: el técnico aplica verificación estándar (devolver la llamada al número registrado); era un intento y quedó registrado en el ticket para seguridad."
  },
{
    "id": "seed-hd-vishing",
    "term": "Vishing (phishing por voz)",
    "category": "HelpDesk - Seguridad para Soporte",
    "shortDefinition": "Phishing por llamada telefónica al usuario o al propio helpdesk suplantando a soporte, banco o dirección.",
    "longDefinition": "El ataque llega por teléfono: suplantar al 'departamento de TI' para que el usuario instale un acceso remoto, dicte un código MFA o confirme su contraseña; o suplantar a un ejecutivo llamando al helpdesk para pedir un restablecimiento. Las señas: número externo o desconocido, prisa, peticiones de códigos o de control del equipo, y negativa a usar canales oficiales. En soporte se combate con dos hábitos: nunca pedir ni aceptar contraseñas o códigos por teléfono, y devolver la llamada al número registrado (callback) antes de ejecutar cambios. Si un usuario reporta una llamada sospechosa, se escala a seguridad con la hora y el número.",
    "example": "Usuario recibe llamada de 'soporte' pidiendo el código de seis dígitos 'para bloquear un ataque en curso'; cuelga y llama al helpdesk real: se registra el incidente y se comprueba que su MFA no fue manipulado."
  },
{
    "id": "seed-hd-smishing",
    "term": "Smishing (phishing por SMS)",
    "category": "HelpDesk - Seguridad para Soporte",
    "shortDefinition": "Phishing por SMS o WhatsApp: enlaces a páginas falsas de paquetería, multas o 'su cuenta será bloqueada'.",
    "longDefinition": "El fraude llega por mensaje de texto o mensajería: enlaces a portales falsos que roban credenciales o instalan apps maliciosas, con pretextos de paquete, multa o cuenta bloqueada. En el móvil el usuario tiene menos contexto que en el correo (URLs truncadas, remitente poco visible), y como el SMS personal convive con la app corporativa, los códigos de verificación por SMS son un blanco fácil para el atacante que llama después. El trabajo de soporte: enseñar a no abrir enlaces de mensajes inesperados y verificar por canal oficial, y tratar el 'metí mi contraseña en un enlace' como incidente de credenciales (cambio forzado y revisión de sesiones), nunca como curiosidad.",
    "example": "Empleado abre un SMS de 'reactiva tu suscripción de Office' desde el móvil y mete su contraseña corporativa en la web falsa; al reportarlo se fuerza el cambio, se revisan los inicios de sesión y se alerta al resto con el caso anonimizado."
  },
{
    "id": "seed-hd-reporte-phishing-usuario",
    "term": "Reporte de phishing (flujo del usuario)",
    "category": "HelpDesk - Seguridad para Soporte",
    "shortDefinition": "El botón 'Reportar phishing' del cliente: reportar sin borrar ni reenviar, y avisar rápido si hubo clic.",
    "longDefinition": "La primera línea defensiva de la empresa es que el usuario reporte bien: con el botón integrado de Outlook y OWA el mensaje llega a la cola de análisis con las cabeceras intactas y marca al remitente para investigación, sin reenviar el correo a terceros (los reenvíos pierden cabeceras y propagan el enlace). La instrucción que repite L1: no borrar el correo antes de reportarlo, no pinchar nada, no responder, y si ya se hizo clic o se metieron credenciales, avisar de inmediato por teléfono. El reporte es una carrera contra el tiempo: un reporte en minutos permite purgar el mensaje del resto de buzones antes de que caigan más víctimas.",
    "example": "Campaña de phishing un martes: doce usuarios reportan con el botón, tres reenvían el correo a soporte (sin cabeceras útiles) y uno lo borró; se agradece el reporte, se recupera el borrado de la papelera y el mensaje se purga del tenant."
  },
{
    "id": "seed-hd-flujo-l1-reporte-phishing",
    "term": "Procesamiento de un reporte de phishing (flujo L1)",
    "category": "HelpDesk - Seguridad para Soporte",
    "shortDefinition": "Recibir el reporte, agradecer, comprobar alcance, purgar el mensaje del tenant y escalar si hubo interacción.",
    "longDefinition": "El flujo del lado del soporte: confirmar al usuario (un 'gracias, estamos en ello' multiplica los reportes futuros), revisar el mensaje reportado (¿lo recibió solo él o es una campaña?), comprobar si hubo interacción (clic, credenciales, adjunto abierto) y actuar en consecuencia: purga del mensaje en el resto de buzones desde el Explorador de amenazas o la herramienta antispam, y si hubo interacción tratarlo como posible compromiso: cambio de contraseña, revocación de sesiones y revisión de los métodos MFA antes de escalar. El ticket documenta URLs, remitente, hora y alcance: es la materia prima del SOC. Cerrar un reporte con 'ignóralo y bórralo' sin más es un fallo de proceso.",
    "example": "Un reporte de 'fraude de nómina': L1 comprueba en el Explorador que 60 usuarios lo recibieron, dos clicaron y una metió credenciales; se purga el correo, se restablece a la afectada y se escala a SOC con la lista de usuarios que interactuaron."
  },
{
    "id": "seed-hd-verificacion-identidad-reset",
    "term": "Verificación de identidad antes de un reset",
    "category": "HelpDesk - Seguridad para Soporte",
    "shortDefinition": "Protocolo previo a cualquier reset o cambio de MFA: datos alternativos, callback y aprobación de segundo nivel.",
    "longDefinition": "Antes de ejecutar un restablecimiento de contraseña, desbloqueo o cambio de MFA, el L1 verifica que quien pide es quien dice ser, y no con datos que el propio solicitante puede haber robado (nombre, cargo o DNI son datos públicos o filtrados, no pruebas). Práctica estándar: contrastar con información que el atacante no controla (número de empleado, nombre del responsable directo, ubicación del puesto), devolver la llamada al número registrado en el perfil, exigir aprobación del responsable cuando el canal no convence, o usar un pase de acceso temporal emitido por un L2. El objetivo es que el atacante no pueda auto-verificarse con lo que ha robado: nunca valen como prueba los datos que el propio usuario dicta por teléfono.",
    "example": "Piden reset por teléfono para un director: el nombre y el cargo no bastan; se llama al móvil registrado del director y resulta que él no había pedido nada; se registra el intento y se avisa a seguridad del patrón."
  },
{
    "id": "seed-hd-escalamiento-soc",
    "term": "Escalamiento a SOC",
    "category": "HelpDesk - Seguridad para Soporte",
    "shortDefinition": "Derivar al equipo de seguridad un caso con indicio de compromiso, con evidencia viva y contexto del ticket.",
    "longDefinition": "Al SOC van los casos con indicio de compromiso: phishing interactuado, cuentas comprometidas, malware, accesos anómalos o dispositivos sospechosos. Un buen traspaso incluye: qué se observó y cuándo, usuario y dispositivo afectados, acciones ya ejecutadas (cambio de contraseña, sesiones revocadas), qué NO se ha tocado aún (clave para no destruir evidencia) y los artefactos disponibles (correo original con cabeceras, hora del clic, número de serie del equipo). El error clásico de L1: 'resolverlo todo' antes de escalar (formatear, borrar el correo, resetear sin registro) y dejar al SOC sin nada que investigar. Ante la duda de si es incidente, se escala igual: mejor un falso positivo documentado que un compromiso silencioso.",
    "example": "Usuario con Outlook 'enviando correos solo' a toda su lista de contactos: L1 desactiva las reglas de reenvío sospechosas, no borra nada más y escala a SOC con las reglas exportadas, la hora del cambio y la IP del último inicio de sesión."
  },
{
    "id": "seed-hd-escalamiento-iam",
    "term": "Escalamiento a IAM",
    "category": "HelpDesk - Seguridad para Soporte",
    "shortDefinition": "Derivar al equipo de identidades los casos de permisos, sincronización y estructura, con el contexto completo.",
    "longDefinition": "Al equipo de IAM e identidades van los problemas que no son de credenciales sino de estructura: usuarios sin sincronizar entre AD y Entra, grupos que no aplican, licencias sin stock, accesos que debe conceder el dueño del recurso, MFA por equipo o aplicación, y cuentas de servicio. El L1 ayuda mucho entregando el caso bien hecho: qué comprobó (grupo correcto, pertenencia efectiva, estado de sincronización), qué intentó y el impacto en el negocio. Diferencia práctica con el escalamiento al SOC: a IAM se va por acceso y estructura; al SOC por indicio de compromiso. Confundir el destino alarga los tiempos: la cuenta 'rara' con signos de ataque no es un caso de IAM.",
    "example": "Un usuario 'no existe' en Teams aunque su cuenta de AD está activa: L1 comprueba que no aparece sincronizada en Entra, documenta la comprobación y escala a IAM con el momento exacto y el identificador de correlación del último error de sincronización."
  },
{
    "id": "seed-hd-preservacion-evidencia",
    "term": "Preservación de evidencia (no formatear)",
    "category": "HelpDesk - Seguridad para Soporte",
    "shortDefinition": "Ante un equipo o cuenta comprometida: contener sin destruir; formatear o borrar arruina la investigación.",
    "longDefinition": "La regla del primer respondedor de soporte: aislar sin limpiar. Desconectar de la red o poner en cuarentena, dejar el equipo encendido si seguridad lo indica (la memoria volátil se pierde al apagar), no formatear, no desinstalar el 'software raro', no borrar correos ni registros, y ejecutar solo las acciones aprobadas (cambio de credenciales, revocación de sesiones). Cada acción destructiva hecha 'para arreglarlo' borra la huella que dirá qué pasó, cómo entró y si se movió lateralmente. El orden correcto de la respuesta es contención, preservación e investigación: el formateo llega al final, decidido por seguridad, y el dispositivo se custodia etiquetado como parte de la cadena de custodia.",
    "example": "PC con ransomware detectado: L1 lo aísla de la red y lo deja encendido sin ejecutar limpiadores; el equipo de respuesta llega y extrae memoria y artefactos que permiten identificar el punto de entrada del ataque."
  },
{
    "id": "seed-hd-elevacion-privilegios-rechazo",
    "term": "Solicitud de elevación de privilegios",
    "category": "HelpDesk - Seguridad para Soporte",
    "shortDefinition": "Peticiones de admin local, Domain Admin o 'solo por hoy': se tramitan por proceso, nunca por cortesía.",
    "longDefinition": "Es el intento recurrente de conseguir derechos por el atajo: 'hazme administrador para instalar esto', 'necesito Domain Admin cinco minutos', 'dame acceso a la carpeta del jefe'. El L1 correcto no discute ni juzga: explica el canal oficial (solicitud de acceso con aprobación del dueño del recurso o proceso de excepción de software), registra la petición en el ticket y, si llega con presión o urgencia artificial, la trata como posible ingeniería social. La frase del rechazo profesional: 'para eso existe el proceso, lo inicio yo mismo ahora mismo si quieres'. Si tras el rechazo insiste apelando a la autoridad, se escala a L2 o seguridad, no se cede.",
    "example": "Usuario exige administrador local 'para un plugin de Excel que ya usé en mi empresa anterior': se abre la solicitud de software con su responsable como aprobador; el plugin resulta estar en la lista de prohibidos y el intento queda registrado."
  },
{
    "id": "seed-hd-shadow-it",
    "term": "Software no autorizado (shadow IT)",
    "category": "HelpDesk - Seguridad para Soporte",
    "shortDefinition": "Herramientas y servicios usados sin aprobación de TI: desde conversores hasta almacenamiento personal.",
    "longDefinition": "El shadow IT nace de una intención buena (resolver el trabajo) por el camino corto: herramientas gratuitas de conversión, almacenamiento en cuentas personales, apps de productividad no aprobadas, extensiones de navegador o servicios de IA con datos de la empresa. El riesgo no siempre es el software: es dónde acaban los datos (cuentas personales, terceros sin contrato) y qué puede leer (extensiones con acceso al correo). El papel de soporte no es sancionar: registrar, evaluar si hay alternativa aprobada y derivar al proceso de solicitud de software; un buen catálogo de aplicaciones aprobadas reduce el shadow IT más que cualquier directiva. Si el software detectado aparece en un contexto sospechoso y desconocido, ya no es shadow IT: es posible malware y va al SOC.",
    "example": "Detección de una app portable de compresión en varios PCs de un departamento: la usan para un paso de un proceso; se registra, se aprueba la herramienta equivalente gestionada y se retiran las versiones portables sin control."
  },
{
    "id": "seed-hd-higiene-contrasenas",
    "term": "Higiene de contraseñas (consejos al usuario)",
    "category": "HelpDesk - Seguridad para Soporte",
    "shortDefinition": "Frases de contraseña únicas por servicio, largo sobre complejidad, gestor corporativo y cero reutilización.",
    "longDefinition": "El mensaje que da L1 en cada restablecimiento es la educación de seguridad más repetida de la empresa: contraseñas largas (una frase de cuatro palabras supera a P@ssw0rd), únicas por servicio (la reutilización es lo que convierte el filtrado de una web en el robo de la cuenta corporativa), nunca compartidas ni anotadas en notas adhesivas o chat, y a ser posible custodiadas en el gestor corporativo. Matiz actual: la caducidad obligatoria ya no es la recomendación dominante (NIST favorece contraseñas largas sin rotación forzada salvo indicio de robo), porque el usuario acaba alternando clave1 y clave2. Cada reset es una oportunidad de dos minutos para dejar al usuario un poco más blindado.",
    "example": "En un reset rutinario el usuario admite usar 'la misma clave en todo': se le explica la reutilización con el filtrado reciente de una web de compras y se le instala el gestor corporativo con su primera contraseña generada."
  },
{
    "id": "seed-hd-credenciales-filtradas",
    "term": "Credenciales filtradas (qué hacer)",
    "category": "HelpDesk - Seguridad para Soporte",
    "shortDefinition": "Usuario que aparece en un filtrado: cambio forzado, comprobación de sesiones y revisión de métodos MFA.",
    "longDefinition": "Cuando el correo del empleado aparece en un filtrado público (detectado por inteligencia de amenazas o por servicios tipo HaveIBeenPwned), el protocolo asume que la contraseña usada en ese sitio puede ser la misma que la corporativa. La acción de soporte es un paquete: forzar el cambio de la contraseña corporativa (o ejecutar la campaña preventiva del equipo de seguridad), revisar los inicios de sesión recientes en busca de actividad anómala, comprobar que el MFA sigue siendo del usuario (sin métodos añadidos en fechas recientes) y recordarle la regla de contraseñas únicas. Si además hay signos de uso real de la credencial, deja de ser preventivo y se escala al SOC como posible cuenta comprometida.",
    "example": "Seguridad avisa de que cinco empleados salen en el filtrado de una web de viajes: se les fuerza el cambio, se revisa su último inicio de sesión (todo normal, MFA presente) y se cierra el ciclo con una nota educativa."
  },
{
    "id": "seed-hd-soporte-remoto-seguro",
    "term": "Soporte remoto seguro",
    "category": "HelpDesk - Seguridad para Soporte",
    "shortDefinition": "Sesiones de asistencia con herramienta corporativa, consentimiento, registro y sin contraseñas por chat.",
    "longDefinition": "Buenas prácticas del L1 con acceso remoto a equipos de usuarios: usar solo la plataforma corporativa (con registro de sesión y grabación si procede), que el usuario conceda el control explícitamente y lo recupere al terminar, y cerrar la sesión por completo (las sesiones colgadas son accesos huérfanos). Nunca pedir la contraseña del usuario por chat ni teclearla uno mismo con el teclado compartido: la introduce el usuario, o se usa el flujo de restablecimiento. Y cuidado con la herramienta equivocada: si un 'técnico' pide instalar un control remoto gratuito del que nadie ha oído hablar, es el guion clásico del fraude al usuario y a veces al propio helpdesk.",
    "example": "Sesión remota para configurar el correo: el usuario acepta el aviso de control compartido, el técnico nunca ve su contraseña (la introduce el usuario) y al finalizar se comprueba que no queda ninguna sesión abierta en el cliente."
  },
{
    "id": "seed-hd-acceso-remoto-temporal",
    "term": "Acceso remoto temporal",
    "category": "HelpDesk - Seguridad para Soporte",
    "shortDefinition": "Acceso remoto concedido por horas o días con motivo y expiración, no cuentas permanentes 'por si acaso'.",
    "longDefinition": "Cuando un usuario necesita acceso remoto (viaje, teletrabajo puntual, contratista para una tarea), el patrón seguro es concederlo con caducidad: justificación en el ticket, aprobación del responsable, duración limitada a la necesidad y revocación automática al vencer o al cerrar el caso. La versión insegura que se combate desde soporte: la cuenta permanente 'por comodidad', la VPN eterna del consultor y el acceso concedido verbalmente sin registro. El L1 es quien más ve el abuso: el acceso que nadie revocó hace ocho meses y sigue funcionando; su deber es reportarlo y tramitar la retirada, no ignorarlo porque 'funciona'.",
    "example": "Un consultor necesita VPN tres días para una migración: se concede con expiración automática a 72 horas y aprobación del responsable de la plataforma; el viernes el acceso caduca solo y no hay que perseguirlo a mano."
  },
{
    "id": "seed-hd-mfa-registro-fraudulento",
    "term": "Registro nuevo de MFA fraudulento (señales)",
    "category": "HelpDesk - Seguridad para Soporte",
    "shortDefinition": "Un método MFA añadido junto a un reset o desde IP nueva: patrón típico de cuenta comprometida.",
    "longDefinition": "El objetivo del atacante que ya engañó al usuario (o al helpdesk) es registrar SU método de MFA para conservar el acceso: un Authenticator nuevo, otro teléfono o una clave de seguridad. Señales que el L1 debe conocer: el usuario pide un restablecimiento y minutos antes o después aparece un método nuevo registrado; el registro se hizo desde un dispositivo o IP no habitual; intentos fallidos seguidos de un inicio exitoso desde fuera; o el usuario reporta cambios que no pidió. Ante la sospecha no basta borrar el método: se cambia la contraseña, se revocan sesiones y tokens, se revisan los métodos restantes y se escala a seguridad, porque un MFA añadido implica que alguien logró superar la verificación previa.",
    "example": "Un usuario llama: 'me llegó un aviso de inicio de sesión que no fui yo' y en su perfil hay un Authenticator añadido esa mañana desde otra ciudad; L1 retira el método, fuerza el cambio, revoca sesiones y escala al SOC con la hora del registro."
  },
{
    "id": "seed-hd-ticket-como-evidencia",
    "term": "Mantener el ticket como evidencia",
    "category": "HelpDesk - Seguridad para Soporte",
    "shortDefinition": "Documentar hechos, horas, acciones y respuestas del usuario: el ticket es el registro auditable del caso.",
    "longDefinition": "El ticket no es burocracia: es la memoria del incidente y la evidencia de qué se hizo, cuándo, quién lo pidió y con qué verificación. Buenas entradas: hora y canal de contacto, qué pidió el solicitante (entre comillas si es delicado), qué se verificó y cómo, qué acciones se ejecutaron con su hora, y qué se dejó sin hacer a propósito (preservación). Ese registro sostiene auditorías, investigaciones del SOC y disputas ('yo nunca pedí ese reset') meses después. Las malas prácticas que rompen la evidencia: resolver por teléfono sin dejar nota, resumir 'usuario dice que no puede entrar' sin detalle, o mezclar opiniones con hechos. Si el caso puede acabar en investigación, cada línea del ticket puede leerla un tercero.",
    "example": "Un incidente de cuenta comprometida acaba en investigación: el ticket muestra que el reset se pidió por el canal oficial, se verificó con callback al número registrado y se ejecutó a las 14:03; la trazabilidad descarta al técnico y reconstruye la cronología."
  },
{
    "id": "seed-hd-datos-personales-ticket",
    "term": "Datos personales en el ticket (qué no escribir)",
    "category": "HelpDesk - Seguridad para Soporte",
    "shortDefinition": "Sin contraseñas, códigos MFA ni documentos sensibles en el ticket: es un registro compartido y auditable.",
    "longDefinition": "El ticket lo lee más gente de la que se piensa (otros niveles, auditoría, proveedores) y se retiene años, así que hay contenido prohibido: contraseñas (ni temporales, aunque el usuario las dicte), códigos MFA, capturas con documentos sensibles o datos de terceros, números de cuentas bancarias, y datos de salud o personales que no aportan al caso. Si el usuario pega su contraseña en el chat: no reenviarla, borrarla del canal si es posible, forzar su cambio y anotar en el ticket solo 'el usuario compartió credenciales por error; se forzó el cambio'. Los documentos delicados se referencian por su ubicación ('carpeta X del caso') en vez de adjuntarlos. Menos datos personales, menos superficie para el propio incidente y para el RGPD.",
    "example": "Un usuario pega su contraseña temporal en el chat de soporte: el técnico no la repite en el ticket, marca 'credencial expuesta por chat', fuerza el cambio inmediato y deja una nota educativa; el ticket queda limpio de secretos."
  }
];
