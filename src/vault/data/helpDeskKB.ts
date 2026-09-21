/**
 * helpDeskKB — GENERATED FILE (scripts/mergeHelpdeskData.mjs).
 * NO editar a mano: editar /tmp/hd/kb.json y re-ejecutar el merge.
 *
 * 28 artículos de la base de conocimiento HelpDesk (SIMULADOS —
 * empresa ficticia Nexora S.A.). Dataset ESTÁTICO de solo lectura (viene de
 * fábrica, no vive en Dexie ni en el backup). relatedTickets es
 * auto-calculado desde los kbRef del dataset de tickets.
 */
import type { HelpDeskKbArticle } from '../types';

export const HELPDESK_KB_ARTICLES: HelpDeskKbArticle[] = [
  {
    "id": "kb-account-locked",
    "title": "Cuenta bloqueada: diagnóstico y desbloqueo",
    "category": "HelpDesk - AD / Identidad",
    "symptoms": "El usuario no puede iniciar sesión y Windows o OWA indican que la cuenta está bloqueada por intentos fallidos. Suele ocurrir de repente, a veces tras un cambio de contraseña o al usar un segundo dispositivo con credenciales viejas guardadas.",
    "cause": "Intentos fallidos que superan el umbral de la directiva de bloqueo (por ejemplo 5 intentos en 15 minutos). Orígenes típicos: contraseña olvidada, credenciales cacheadas en el móvil u otro equipo, una app con contraseña antigua o, menos frecuente, un intento de adivinación de contraseñas.",
    "steps": [
      {
        "title": "Confirmar identidad del solicitante",
        "detail": "Verificar contra RRHH y con devolución de llamada al número registrado antes de tocar la cuenta. Nunca desbloquear solo por un correo o mensaje entrante: el bloqueo y el desbloqueo son operaciones sensibles que un atacante puede intentar aprovechar."
      },
      {
        "title": "Comprobar el estado de la cuenta",
        "detail": "Confirmar que está realmente bloqueada y no deshabilitada o caducada. Search-ADAccount devuelve todas las cuentas bloqueadas del dominio; filtrar por el usuario del ticket.",
        "command": "Search-ADAccount -LockedOut"
      },
      {
        "title": "Descartar cuenta deshabilitada o caducada",
        "detail": "Si el error del usuario es 'cuenta deshabilitada' en lugar de 'cuenta bloqueada', el flujo es otro: revisar el Event ID 4726 y verificar con RRHH que no es una baja en curso. Enabled a false o AccountExpirationDate vencida requieren re-habilitación, no desbloqueo.",
        "command": "Get-ADUser mtorres -Properties Enabled,LockedOut,AccountLockoutTime,AccountExpirationDate"
      },
      {
        "title": "Identificar el origen del bloqueo",
        "detail": "El Event ID 4740 en el emulador de PDC registra el equipo (Caller Computer Name) desde el que llegaron los intentos fallidos. Ese dato evita el re-bloqueo: hay que corregir el origen (móvil, segundo equipo, servicio) y no solo desbloquear.",
        "command": "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4740} -MaxEvents 5"
      },
      {
        "title": "Desbloquear la cuenta",
        "detail": "Ejecutar el desbloqueo una vez verificado el solicitante y localizado el origen. Comprobar después que badPwdCount vuelve a cero y que el usuario inicia sesión sin errores.",
        "command": "Unlock-ADAccount -Identity mtorres"
      },
      {
        "title": "Resetear la contraseña si hace falta",
        "detail": "Si el usuario no recuerda la contraseña con seguridad, mejor resetear en el mismo ticket que arriesgar un segundo bloqueo. Marcar el cambio obligatorio en el siguiente inicio de sesión y verificar que no queda la contraseña vieja guardada en dispositivos.",
        "command": "Set-ADAccountPassword -Identity mtorres -Reset"
      },
      {
        "title": "Prevenir el re-bloqueo",
        "detail": "Repasar con el usuario qué dispositivos guardan la contraseña (móvil, tablet, segundo portátil, apps) y actualizarlos en el momento. Si el origen del bloqueo es desconocido o apunta a intentos externos, tratarlo como posible compromiso y escalarlo.",
        "command": "Get-ADUser mtorres -Properties badPwdCount, badPasswordTime"
      }
    ],
    "verification": "El usuario inicia sesión correctamente desde su equipo habitual y el bloqueo no reaparece en las horas siguientes. badPwdCount en 0 y dispositivos con credenciales actualizadas.",
    "escalation": "SOC (posible compromiso)",
    "relatedTerms": [
      "Bloqueo de cuenta (lockout)",
      "Active Directory (AD)",
      "Event ID 4740",
      "Smart Lockout"
    ],
    "relatedTickets": [
      "hdt-002",
      "hdt-020"
    ]
  },
{
    "id": "kb-password-expired",
    "title": "Contraseña caducada u olvidada: reset y SSPR",
    "category": "HelpDesk - AD / Identidad",
    "symptoms": "Al iniciar sesión el aviso indica que la contraseña ha caducado y hay que cambiarla, o el usuario directamente no la recuerda. El cambio guiado falla si no se acuerda de la contraseña actual y hay riesgo de bloqueo si sigue intentando.",
    "cause": "Directiva de expiración (por ejemplo 90 días), olvido tras vacaciones o uso de credenciales guardadas durante demasiado tiempo. En entornos híbridos, un SSPR con escritura diferida averiada también produce cambios que no llegan a aplicarse.",
    "steps": [
      {
        "title": "Verificar la identidad del solicitante",
        "detail": "Devolver la llamada al número registrado en RRHH y contrastar un par de datos personales antes del reset. Es el paso que separa un reset legítimo de una entrega de cuenta a un atacante."
      },
      {
        "title": "Probar primero el autoservicio SSPR",
        "detail": "Si el usuario está registrado en SSPR, puede resolverse solo en https://aka.ms/sspr desde cualquier dispositivo con navegador. Es más rápido y entrena al usuario. Comprobar el registro si falla y anotarlo para darlo de alta al cerrar."
      },
      {
        "title": "Resetear la contraseña en AD",
        "detail": "Con la identidad verificada, hacer el reset administrativo y entregar la contraseña temporal por un canal distinto al de la petición (verbal por teléfono, nunca por correo entrante). Usar una contraseña compleja y aleatoria, no un patrón adivinable.",
        "command": "Set-ADAccountPassword -Identity mgomez -Reset -NewPassword (Read-Host 'Nueva contraseña' -AsSecureString)"
      },
      {
        "title": "Forzar el cambio en el primer inicio",
        "detail": "Marcar el cambio obligatorio para que la contraseña temporal no viva más de una sesión. Así el usuario estrena algo que solo él sabe y la temporal deja de ser un riesgo.",
        "command": "Set-ADUser -Identity mgomez -ChangePasswordAtLogon $true"
      },
      {
        "title": "Comprobar la escritura diferida en entornos híbridos",
        "detail": "Si la contraseña se cambia en la nube (SSPR) y debe llegar a AD, la escritura diferida (password writeback) tiene que estar operativa en Entra Connect. Si los cambios 'no llegan', revisar ese componente antes de resetear una y otra vez."
      },
      {
        "title": "Verificar la propagación y cerrar",
        "detail": "Confirmar el inicio de sesión en el equipo, en OWA y en el móvil (donde suelen quedar credenciales viejas). Dejar al usuario registrado en SSPR para que la próxima vez se autogestione."
      }
    ],
    "verification": "El usuario inicia sesión y completa el cambio obligatorio. La nueva contraseña funciona en equipo, OWA y móvil sin bucles de autenticación ni bloqueos posteriores.",
    "escalation": "L2 - Infraestructura",
    "relatedTerms": [
      "Self-Service Password Reset (SSPR)",
      "Restablecimiento de contraseña por admin",
      "Active Directory (AD)",
      "Escritura diferida (writeback)"
    ],
    "relatedTickets": [
      "hdt-001",
      "hdt-019"
    ]
  },
{
    "id": "kb-outlook-not-syncing",
    "title": "Outlook no sincroniza: perfil, modo y credenciales",
    "category": "HelpDesk - Microsoft 365",
    "symptoms": "El usuario reporta que no le llegan correos, que los enviados se quedan en la bandeja de salida o que la barra inferior muestra 'Trabajando sin conexión'. En muchos casos el correo web o el móvil funcionan bien, señal de que la cuenta está sana.",
    "cause": "Modo 'Trabajar sin conexión' activado sin darse cuenta, credenciales antiguas cacheadas tras un cambio de contraseña, perfil de Outlook dañado u OST con problemas, o una incidencia del servicio (en cuyo caso OWA también falla).",
    "steps": [
      {
        "title": "Probar Outlook en la web (OWA)",
        "detail": "Abrir outlook.office.com con las mismas credenciales. Si OWA funciona, el problema es del cliente de escritorio (perfil, credenciales o modo). Si OWA también falla, escalarlo como posible incidencia del servicio o de red, no pelear con el equipo."
      },
      {
        "title": "Comprobar el modo 'Trabajar sin conexión'",
        "detail": "En la pestaña Enviar y recibir, verificar que no esté marcado 'Trabajar sin conexión'. Es la causa más frecuente y más rápida de descartar: un clic accidental lo activa y el síntoma parece 'Outlook roto'."
      },
      {
        "title": "Leer la barra de estado de conexión",
        "detail": "La barra inferior debe indicar 'Conectado a: Microsoft Exchange'. Manteniendo Ctrl y haciendo clic en el icono de conectividad de la bandeja se abre el cuadro de estado de conexión, útil para ver qué backend se está usando y si hay fallos de red."
      },
      {
        "title": "Limpiar credenciales guardadas",
        "detail": "Tras un cambio de contraseña, las entradas viejas del Administrador de credenciales provocan bucles de autenticación. Listar las entradas y eliminar las de MicrosoftOffice16 del usuario; al reabrir, Outlook pedirá las credenciales nuevas una sola vez.",
        "command": "cmdkey /list"
      },
      {
        "title": "Probar Outlook sin complementos",
        "detail": "El modo seguro arranca Outlook con los complementos deshabilitados. Si en modo seguro funciona, el culpable es un complemento (módulo de CRM, antivirus de correo) y hay que deshabilitarlos uno a uno.",
        "command": "outlook.exe /safe"
      },
      {
        "title": "Recrear el perfil de Outlook",
        "detail": "Si persiste, crear un perfil nuevo desde el applet de Correo del Panel de control; el switch /manageprofiles abre directamente el panel de perfiles. El perfil nuevo regenera el OST y resuelve la mayoría de corrupciones de configuración.",
        "command": "outlook.exe /manageprofiles"
      },
      {
        "title": "Comprobar el tamaño del OST",
        "detail": "Un OST de varios gigabytes ralentiza la sincronización y multiplica los síntomas intermitentes. Con el perfil nuevo se regenera; si vuelve a crecer, revisar con el usuario qué carpetas realmente necesita en caché.",
        "command": "Get-ChildItem $env:LOCALAPPDATA\\Microsoft\\Outlook\\*.ost | Select-Object Name,Length"
      }
    ],
    "verification": "La barra de estado muestra 'Conectado a: Microsoft Exchange'. Un correo de prueba enviado llega y otro recibido aparece en menos de un minuto, y la bandeja de salida queda vacía.",
    "relatedTerms": [
      "Microsoft 365 admin center",
      "Bloqueo de autenticación heredada (legacy auth)",
      "Triage"
    ],
    "relatedTickets": [
      "hdt-015",
      "hdt-025"
    ]
  },
{
    "id": "kb-printer-offline",
    "title": "Impresora de red offline: cola y conectividad",
    "category": "HelpDesk - Windows / Endpoint",
    "symptoms": "La impresora aparece como 'Sin conexión' y los trabajos se acumulan sin imprimir. A veces solo afecta a un usuario y a veces a todo un pasillo, dato clave para el diagnóstico.",
    "cause": "Cola local con un trabajo corrupto, servicio de cola (spooler) del equipo detenido, impresora sin red (cable, IP cambiada por DHCP o apagada) o cola del servidor de impresión caída.",
    "steps": [
      {
        "title": "Comprobar la impresora físicamente",
        "detail": "Confirmar que está encendida, sin atasco de papel, con tóner y con panel sin errores. Suena obvio, pero descarta la mitad de los casos antes de tocar el equipo."
      },
      {
        "title": "Probar la conectividad a la impresora",
        "detail": "Hacer ping a la IP de la impresora desde el equipo del usuario. Si responde, el problema es de cola o de puerto; si no responde, seguir la pista de red (cable, switch o IP). Imprimir la página de configuración desde el panel de la impresora confirma que su pila de red está viva.",
        "command": "ping 10.10.20.55"
      },
      {
        "title": "Reiniciar la cola local",
        "detail": "Reiniciar el servicio de cola del equipo afectado purga los trabajos colgados en la mayoría de los casos. Hacerlo con el usuario delante para que vea que los trabajos en cola se pierden y hay que reenviarlos.",
        "command": "net stop spooler && net start spooler"
      },
      {
        "title": "Cancelar los trabajos atascados",
        "detail": "Si tras reiniciar el spooler la cola sigue con un trabajo que no baja, listarlo y eliminarlo. Un PDF corrupto o gigante puede quedarse indefinidamente en cola y bloquear a los demás.",
        "command": "Get-PrintJob -PrinterName 'HP Pasillo 2' | Remove-PrintJob"
      },
      {
        "title": "Verificar el puerto de la cola",
        "detail": "La cola debe apuntar al puerto correcto (RAW 9100 a la IP de la impresora, o a la cola compartida del servidor de impresión). Si la impresora cambió de IP por DHCP, el puerto queda apuntando a una dirección vieja y hay que corregirlo o reinstalar la cola.",
        "command": "Get-Printer -Name 'HP Pasillo 2' | Format-List Name,PortName,DriverName"
      },
      {
        "title": "Evaluar el alcance y elevar si toca",
        "detail": "Si varios usuarios fallan a la vez con la misma impresora o con varias, el problema es del servidor de impresión o de red: subir la prioridad y tratarlo como incidente multiusuario, no caso a caso."
      }
    ],
    "verification": "Se imprime una página de prueba desde el equipo del usuario y desde un segundo equipo de la zona. La cola se vacía y el spooler permanece en ejecución sin reinicios adicionales.",
    "escalation": "L2 - Infraestructura",
    "relatedTerms": [
      "Triage",
      "Escalamiento",
      "Runbook"
    ],
    "relatedTickets": [
      "hdt-021"
    ]
  },
{
    "id": "kb-dns-troubleshooting",
    "title": "Fallo de resolución DNS: diagnóstico de cliente",
    "category": "HelpDesk - Redes (Networking)",
    "symptoms": "El usuario no puede abrir la intranet ni las carpetas de red por nombre, pero el ping a direcciones IP funciona. Los servicios en la nube pueden seguir funcionando (usan sus propios mecanismos), lo que despista al diagnóstico.",
    "cause": "Servidores DNS incorrectos en el adaptador (por ejemplo un DNS externo fijado a mano), caché de resolución corrupta, servicio de cliente DNS parado o, multiusuario, fallo en los propios servidores DNS internos.",
    "steps": [
      {
        "title": "Identificar el patrón del fallo",
        "detail": "Comparar ping por IP con ping por nombre. Si la IP responde y el nombre no, es resolución de nombres: DNS. Documentar el patrón antes de cambiar nada, porque define todo el diagnóstico posterior.",
        "command": "ping 10.10.10.10"
      },
      {
        "title": "Revisar los DNS configurados",
        "detail": "En un puesto de la empresa los DNS deben ser los controladores de dominio (aquí 10.10.10.10 y 10.10.10.11). ipconfig /all muestra los servidores por adaptador; un 8.8.8.8 fijado a mano rompe la resolución de nombres internos aunque internet siga funcionando.",
        "command": "ipconfig /all"
      },
      {
        "title": "Probar la resolución contra el DNS interno",
        "detail": "Consultar directamente al servidor interno evita la caché local y responde a la pregunta de si el servidor responde. Si el interno resuelve y el equipo no usa ese servidor, el fallo es de configuración del cliente; si el interno no resuelve, escalar.",
        "command": "Resolve-DnsName intranet.nexora.local -Server 10.10.10.10"
      },
      {
        "title": "Detectar DNS fijados por interfaz",
        "detail": "Get-DnsClientServerAddress lista los servidores de cada adaptador. Cualquier valor que no sea los DCs internos en un puesto corporativo es sospechoso y suele ser resto de pruebas de técnicos o de software de diagnóstico.",
        "command": "Get-DnsClientServerAddress -AddressFamily IPv4"
      },
      {
        "title": "Limpiar la caché del cliente",
        "detail": "La caché guarda respuestas negativas: aunque el DNS ya funcione, el equipo sigue fallando un rato. Vaciar la caché y volver a probar antes de concluir que no se ha arreglado nada.",
        "command": "ipconfig /flushdns"
      },
      {
        "title": "Corregir la configuración del adaptador",
        "detail": "Lo ideal es devolver el adaptador a DHCP, que ya asigna los DNS correctos. Si el puesto exige fijarlos, usar los DCs internos y nunca DNS públicos como únicos servidores en un equipo de dominio.",
        "command": "Set-DnsClientServerAddress -InterfaceAlias 'Ethernet' -ServerAddresses 10.10.10.10,10.10.10.11"
      },
      {
        "title": "Verificar la resolución final",
        "detail": "Cerrar con una consulta por nombre desde el propio equipo y comprobar que la aplicación original del usuario (intranet, carpeta, VPN) ya localiza el recurso. Sin este paso el ticket rebota a las pocas horas.",
        "command": "nslookup intranet.nexora.local"
      }
    ],
    "verification": "nslookup resuelve nombres internos desde el equipo del usuario sin especificar servidor, la intranet y las carpetas abren por nombre y la VPN ya localiza su gateway.",
    "escalation": "L2 - Redes",
    "relatedTerms": [
      "Triage",
      "Controlador de dominio (DC)",
      "Escalamiento"
    ],
    "relatedTickets": [
      "hdt-013",
      "hdt-031"
    ]
  },
{
    "id": "kb-dhcp-troubleshooting",
    "title": "Sin IP por DHCP (APIPA 169.254): diagnóstico",
    "category": "HelpDesk - Redes (Networking)",
    "symptoms": "El equipo no tiene red y la bandeja muestra 'red no identificada' con un icono de exclamación. El ipconfig muestra una IP 169.254.x.x que el usuario no reconoce y ningún gateway definido.",
    "cause": "El equipo no recibió oferta DHCP: servidor DHCP inalcanzable, ámbito agotado, el puerto del switch en otra VLAN (sin relay DHCP), cable o link caído, o el servicio DhcpClient del equipo parado. La IP 169.254 es la autoconfiguración APIPA de Windows al no obtener arrendamiento.",
    "steps": [
      {
        "title": "Confirmar el síntoma APIPA",
        "detail": "Ejecutar ipconfig /all y buscar una IPv4 169.254.x.x con 'Autoconfiguración habilitada' y sin puerta de enlace. Ese patrón confirma que el problema es de obtención de IP, no de DNS ni de permisos.",
        "command": "ipconfig /all"
      },
      {
        "title": "Renovar el arrendamiento",
        "detail": "Liberar y renovar fuerza una nueva negociación DHCP. Si tras esto el equipo recibe su IP 10.10.x.x, era un arrendamiento caducado o un problema transitorio; si no, continuar por las capas siguientes.",
        "command": "ipconfig /release && ipconfig /renew"
      },
      {
        "title": "Verificar el servicio y el link del cliente",
        "detail": "Comprobar que el servicio DhcpClient corre y que el adaptador está Up (estado del medio, luces del switch). Un link Down apunta a cable, toma o puerto y no a DHCP.",
        "command": "Get-Service DhcpClient"
      },
      {
        "title": "Ver el estado del adaptador",
        "detail": "Get-NetAdapter resume el estado de los adaptadores. Correlacionar el adaptador en fallo (ethernet frente a Wi-Fi) con la toma física y el número de inventario del puesto para el informe a Redes.",
        "command": "Get-NetAdapter | Format-List Name,Status,MacAddress"
      },
      {
        "title": "Aislar equipo frente a segmento",
        "detail": "Probar otro equipo en la misma toma y el equipo del usuario en otra toma o en Wi-Fi. Si solo ese equipo falla, el problema es local (driver, servicio, hardware); si falla toda la zona, es del segmento: ámbito, relay o VLAN."
      },
      {
        "title": "Evaluar el alcance del fallo",
        "detail": "Si hay varios usuarios afectados a la vez, registrar un P1 multiusuario y escalar a Redes con la evidencia recogida. Un ámbito agotado o un relay DHCP mal configurado tras un mantenimiento no lo resuelve L1, pero L1 lo detecta y lo documenta."
      }
    ],
    "verification": "El equipo obtiene una IP del rango corporativo con gateway y DNS correctos, navega y accede a los recursos internos. Si hubo escalado, confirmar con usuarios de la zona afectada.",
    "escalation": "L2 - Redes",
    "relatedTerms": [
      "Segmentación de red",
      "Triage",
      "Escalamiento"
    ],
    "relatedTickets": [
      "hdt-032",
      "hdt-035"
    ]
  },
{
    "id": "kb-wifi-troubleshooting",
    "title": "Wi-Fi se desconecta o no conecta",
    "category": "HelpDesk - Redes (Networking)",
    "symptoms": "El usuario se conecta a la red corporativa pero la conexión cae cada pocos minutos, o directamente no encuentra o no completa la conexión al SSID de empresa. Suele pasar por zonas concretas mientras otros puestos funcionan.",
    "cause": "Ahorro de energía del adaptador inalámbrico, roaming agresivo entre puntos de acceso, cobertura débil o interferencias, perfil inalámbrico dañado (802.1X), driver antiguo, o incidencia del AP o del controlador en esa zona.",
    "steps": [
      {
        "title": "Medir señal y estado de la conexión",
        "detail": "netsh wlan show interfaces muestra el SSID activo, la intensidad de señal, la banda y el motivo de la última desconexión. Es la foto objetiva del problema: señal débil o motivo de desconexión repetido orientan el resto del diagnóstico.",
        "command": "netsh wlan show interfaces"
      },
      {
        "title": "Revisar el historial de desconexiones",
        "detail": "El registro operativo de WLAN-AutoConfig registra cada conexión y desconexión con su motivo. Si el motivo se repite (por ejemplo timeout de autenticación 802.1X o de asociación), la causa se estrecha muchísimo.",
        "command": "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-WLAN-AutoConfig/Operational'} -MaxEvents 20"
      },
      {
        "title": "Olvidar la red y reconectar",
        "detail": "Ver primero los perfiles guardados y olvidar el SSID problemático desde Configuración > Red. Al reconectar se rehace el perfil 802.1X completo (credenciales y certificados), que resuelve los perfiles dañados. Es el equivalente inalámbrico de 'quitar y poner'.",
        "command": "netsh wlan show profiles"
      },
      {
        "title": "Deshabilitar la suspensión de energía del adaptador",
        "detail": "Windows apaga la radio para ahorrar batería y en zonas con señal justa provoca microcortes. En Administrador de dispositivos > adaptador Wi-Fi > Administración de energía, desmarcar 'Permitir que el equipo apague este dispositivo'."
      },
      {
        "title": "Comprobar banda, driver y cobertura",
        "detail": "Si el portátil se queda en 2,4 GHz lejos del AP, la señal degradada explica los cortes: forzar 5 GHz si el SSID lo permite. Actualizar el driver del adaptador y, si el problema es solo en una sala, tomarlo como dato de cobertura para Redes.",
        "command": "Get-NetAdapter -Name 'Wi-Fi' | Format-List Name,DriverVersion,DriverDate"
      },
      {
        "title": "Diferenciar equipo frente a entorno",
        "detail": "Probar el mismo SSID con otro dispositivo en el mismo punto. Si el móvil o un portátil de prueba van bien, el problema es del equipo del usuario; si todos fallan en esa zona, es infraestructura inalámbrica y escala a Redes."
      }
    ],
    "verification": "La conexión se mantiene estable durante un periodo de trabajo representativo (por ejemplo una reunión completa) sin caídas en netsh wlan show interfaces, y el usuario confirma la mejora.",
    "escalation": "L2 - Redes",
    "relatedTerms": [
      "Dispositivo administrado (managed device)",
      "Triage",
      "Segmentación de red"
    ],
    "relatedTickets": [
      "hdt-033"
    ]
  },
{
    "id": "kb-bitlocker-recovery",
    "title": "Recuperación de BitLocker: entrega controlada de la clave",
    "category": "HelpDesk - Windows / Endpoint",
    "symptoms": "Al encender el portátil aparece la pantalla azul de recuperación de BitLocker pidiendo una clave de 48 dígitos. Suele suceder tras un cambio de hardware (RAM, disco, placa), una actualización de firmware/BIOS o cambios en el orden de arranque.",
    "cause": "El TPM detectó una modificación en las mediciones de arranque y BitLocker exige la clave de recuperación como protección anti-manipulación. No significa disco dañado: los datos están intactos detrás de la clave. Si la clave no está depositada (escrow) en Entra/AD, el problema se agrava.",
    "steps": [
      {
        "title": "Verificar la identidad antes de dar nada",
        "detail": "La clave de recuperación desbloquea el disco completo: solo se entrega tras verificar la identidad con devolución de llamada y contraste con RRHH. Desconfiar especialmente de peticiones con prisa o por canales no habituales, aunque el solicitante 'suene' de TI."
      },
      {
        "title": "Anotar el ID de clave de recuperación",
        "detail": "La pantalla muestra un identificador de 8 dígitos que permite buscar la clave exacta entre las depositadas. Pedir al usuario que lo lea con calma: es el dato que evita entregar una clave de otro dispositivo."
      },
      {
        "title": "Recuperar la clave desde el portal",
        "detail": "En entornos con Entra ID, las claves de los dispositivos inscritos se consultan en https://aka.ms/aadrecoverykey (el usuario también puede ver las suyas con su cuenta). Un administrador puede buscar por el ID de clave o por el nombre del dispositivo."
      },
      {
        "title": "Entregar la clave por canal verificado",
        "detail": "Dictar la clave por teléfono a la persona verificada y registrar la entrega en el ticket: quién, cuándo, qué clave (ID) y por qué se disparó la recuperación. Esa pista de auditoría es obligatoria en cualquier auditoría de cifrado."
      },
      {
        "title": "Comprobar el estado tras el arranque",
        "detail": "Una vez dentro, verificar que la protección sigue activa y que el volumen está sano. Si la petición de clave se repite en cada arranque, hay que investigar la causa raíz (firmware, TPM) y no acostumbrar al usuario a pedir la clave cada mañana.",
        "command": "manage-bde -status C:"
      },
      {
        "title": "Rotar y custodiar la nueva clave",
        "detail": "Tras resolver el disparo, rotar la clave de recuperación desde la consola o portal para que la clave usada quede desfasada, y confirmar que la nueva queda depositada. Documentar el motivo original del disparo para estadística de causas."
      }
    ],
    "verification": "El equipo arranca dos veces seguidas sin pedir la clave, manage-bde -status muestra protección activa y la clave nueva está depositada en el portal. El ticket registra la entrega verificada.",
    "escalation": "L2 - Infraestructura",
    "relatedTerms": [
      "Verificación de identidad (identity proofing)",
      "Cadena de custodia",
      "Evidencia (evidence)"
    ],
    "relatedTickets": [
      "hdt-040"
    ]
  },
{
    "id": "kb-bsod-first-response",
    "title": "Pantalla azul (BSOD): primera respuesta L1",
    "category": "HelpDesk - Windows / Endpoint",
    "symptoms": "El equipo muestra la pantalla azul con un código de parada y se reinicia, de forma aislada o repetida. El usuario suele reportar pérdida de trabajo no guardado y miedo a que 'se haya roto el disco'.",
    "cause": "Drivers defectuosos (el más habitual), memoria RAM defectuosa, disco en mal estado, actualizaciones o software recientes, y menos frecuente malware o fallos de hardware de placa. El código de parada es la brújula: cada uno apunta a un subsistema.",
    "steps": [
      {
        "title": "Documentar el código de parada",
        "detail": "Pedir al usuario una foto de la pantalla azul y anotar el código (MEMORY_MANAGEMENT, IRQL_NOT_LESS_OR_EQUAL, VIDEO_TDR_FAILURE...). Códigos variables entre caídas apuntan a hardware; un código fijo apunta a driver o software concreto."
      },
      {
        "title": "Revisar los reinicios inesperados",
        "detail": "El Event ID 41 (Kernel-Power) confirma cada caída no limpia con su marca de tiempo. Correlacionar la hora de los 41 con lo que el usuario estaba haciendo permite anticipar la causa.",
        "command": "Get-WinEvent -FilterHashtable @{LogName='System'; Id=41} -MaxEvents 10"
      },
      {
        "title": "Probar la memoria",
        "detail": "Programar el diagnóstico de memoria de Windows para el próximo reinicio. Un fallo de RAM produce códigos de parada variables e impredecibles; si el test reporta errores, el camino es hardware (y probable RMA).",
        "command": "mdsched.exe"
      },
      {
        "title": "Comprobar el estado del disco",
        "detail": "Get-PhysicalDisk resume salud y tipo del disco. Un estado distinto de Healthy o un HDD con años de uso y caídas asociadas a acceso a disco sugieren sustitución.",
        "command": "Get-PhysicalDisk"
      },
      {
        "title": "Revertir cambios recientes",
        "detail": "Repasar las actualizaciones y software instalados en las fechas previas al primer BSOD y desinstalar o retroceder drivers de vídeo, dock o periféricos. El Monitor de confiabilidad ayuda a ver exactamente qué cambió antes de que empezara a caer.",
        "command": "Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 5"
      },
      {
        "title": "Verificar la integridad del sistema",
        "detail": "SFC repara archivos de sistema dañados que a veces acompañan o causan las caídas. Ejecutarlo después de DISM si hubo sospecha de almacén de componentes dañado.",
        "command": "sfc /scannow"
      },
      {
        "title": "Recopilar evidencia para escalar",
        "detail": "Si persiste, adjuntar los minidumps de C:\\Windows\\Minidump y el historial de códigos. L2 o el proveedor los analizan con herramientas de depuración; llegar con la evidencia completa acelera el RMA.",
        "command": "Get-ChildItem C:\\Windows\\Minidump | Sort-Object LastWriteTime -Descending | Select-Object -First 5 Name,LastWriteTime"
      }
    ],
    "verification": "El equipo pasa 48 horas de uso real sin pantallas azules, el usuario trabaja con normalidad y no hay nuevos Event ID 41 en el registro.",
    "escalation": "Proveedor externo (RMA)",
    "relatedTerms": [
      "Evidencia (evidence)",
      "Triage",
      "Playbook"
    ],
    "relatedTickets": [
      "hdt-014",
      "hdt-041"
    ]
  },
{
    "id": "kb-slow-windows",
    "title": "Equipo lento: diagnóstico de rendimiento",
    "category": "HelpDesk - Windows / Endpoint",
    "symptoms": "El usuario reporta arranques eternos, aplicaciones que tardan en responder y ventilador a máximo. Suele ser una degradación progresiva de semanas o meses, no un fallo de un día.",
    "cause": "Disco HDD degradado o casi lleno, sobrecarga de programas de inicio, procesos con fugas de recursos, malware (menos frecuente en equipos administrados) o simplemente hardware antiguo para las cargas actuales.",
    "steps": [
      {
        "title": "Cuantificar el problema",
        "detail": "Medir antes de tocar: tiempo de arranque, segundos de apertura de la app que el usuario usa como referencia y captura del Administrador de tareas. Sin números de 'antes' no se puede demostrar la mejora al cerrar el ticket."
      },
      {
        "title": "Identificar los procesos que consumen",
        "detail": "Listar los mayores consumidores de CPU y memoria. Un proceso concreto en cabeza suele explicar el síntoma; si es software corporativo conocido, el camino es distinto (actualizar/reinstalar) que si es desconocido (investigar malware).",
        "command": "Get-Process | Sort-Object CPU -Descending | Select-Object -First 10"
      },
      {
        "title": "Evaluar el disco",
        "detail": "El disco es el cuello de botella clásico: comprobar tipo (HDD frente a SSD) y estado de salud. Un HDD de años con salud degradada explica lentitud creciente mejor que cualquier otro factor, y su sustitución por SSD es la mejora más visible.",
        "command": "Get-PhysicalDisk"
      },
      {
        "title": "Comprobar el espacio libre",
        "detail": "Menos del 10-15% de espacio libre degrada actualizaciones, cachés y sistema en general. Si el disco está lleno, el ticket de 'lento' se convierte primero en un ticket de espacio y después se reevalúa el rendimiento.",
        "command": "Get-Volume"
      },
      {
        "title": "Reducir los programas de inicio",
        "detail": "Enumerar lo que arranca con la sesión y deshabilitar lo innecesario desde la pestaña Inicio del Administrador de tareas. Cada elemento de inicio suma segundos a cada arranque de cada día.",
        "command": "Get-CimInstance Win32_StartupCommand"
      },
      {
        "title": "Correlacionar con el Monitor de confiabilidad",
        "detail": "perfmon /rel grafica fallos de aplicaciones e instalaciones día a día. Las coincidencias de fecha ('se puso lento tras aquella instalación') convierten una intuición en una causa.",
        "command": "perfmon /rel"
      }
    ],
    "verification": "Se repiten las mediciones del inicio (arranque, apertura de la app de referencia) y mejoran de forma demostrable; el usuario confirma durante un día de trabajo real que el equipo responde.",
    "escalation": "Proveedor externo (RMA)",
    "relatedTerms": [
      "Derechos de administrador local",
      "Triage",
      "Evidencia (evidence)"
    ],
    "relatedTickets": [
      "hdt-037"
    ]
  },
{
    "id": "kb-windows-update-failure",
    "title": "Windows Update falla: reparación de componentes",
    "category": "HelpDesk - Windows / Endpoint",
    "symptoms": "La actualización falla siempre en el mismo punto (por ejemplo al 70%), deshace los cambios y se reinicia en bucle. El historial muestra un código de error repetido y el equipo acumula parches pendientes.",
    "cause": "Almacén de componentes de Windows dañado, caché de actualización (SoftwareDistribution) corrupta, falta de espacio en disco o, en gestiones centralizadas, problemas del servicio de actualizaciones del lado infraestructura.",
    "steps": [
      {
        "title": "Documentar el error y la KB",
        "detail": "Anotar el código exacto del historial de actualizaciones y la KB que falla. Códigos como 0x80070002, 0x800f0922 o 0x800f081f orientan el diagnóstico y son el dato que se pide si hay que escalar. Get-WindowsUpdateLog genera el registro legible en el escritorio.",
        "command": "Get-WindowsUpdateLog"
      },
      {
        "title": "Comprobar espacio y conectividad",
        "detail": "Las actualizaciones necesitan varios GB libres y acceso al servicio. Verificar volumen y, si el equipo navega, descartar bloqueos de proxy para las URL de Windows Update.",
        "command": "Get-Volume"
      },
      {
        "title": "Reparar el almacén de componentes",
        "detail": "DISM comprueba y repara el almacén que las actualizaciones necesitan para instalarse. Es la causa número uno de fallos repetidos y debe ejecutarse completo, aunque tarde, antes de reintentar.",
        "command": "DISM /Online /Cleanup-Image /RestoreHealth"
      },
      {
        "title": "Reparar los archivos de sistema",
        "detail": "SFC detecta y repara archivos de sistema dañados. Ejecutarlo después de DISM es el orden correcto: primero el almacén sano, luego los archivos que dependen de él.",
        "command": "sfc /scannow"
      },
      {
        "title": "Detener los servicios de actualización",
        "detail": "Para resetear la caché hay que parar el servicio de Windows Update y BITS. Si están ocupados, reiniciar el equipo antes de continuar.",
        "command": "net stop wuauserv && net stop bits"
      },
      {
        "title": "Renombrar la caché de actualización",
        "detail": "Renombrar SoftwareDistribution (y catroot2 si hace falta) obliga a que Windows la regenere limpia en el próximo arranque de los servicios. Los contenidos se descargan de nuevo, así que conviene espacio libre.",
        "command": "ren C:\\Windows\\SoftwareDistribution SoftwareDistribution.old"
      },
      {
        "title": "Reiniciar servicios y reintentar",
        "detail": "Arrancar los servicios y buscar actualizaciones de nuevo. Verificar en el historial y con Get-HotFix que la KB que fallaba queda instalada y que no queda reinicio pendiente en bucle.",
        "command": "net start wuauserv && net start bits"
      }
    ],
    "verification": "La actualización se instala al 100% sin revertir, Get-HotFix muestra la KB instalada y el equipo vuelve a figurar como conforme en Intune (si aplica).",
    "relatedTerms": [
      "Microsoft Intune",
      "Dispositivo administrado (managed device)",
      "Runbook"
    ],
    "relatedTickets": [
      "hdt-038"
    ]
  },
{
    "id": "kb-disk-space",
    "title": "Disco lleno (C:) en puesto de trabajo",
    "category": "HelpDesk - Windows / Endpoint",
    "symptoms": "Avisos constantes de poco espacio en disco, fallos al guardar archivos, actualizaciones que no instalan y navegación lenta por caché sin sitio. El usuario suele acumular descargas y material antiguo sin darse cuenta.",
    "cause": "Descargas acumuladas, archivos temporales, cachés de navegador, componentes antiguos de Windows (WinSxS), OST de Outlook enormes y datos personales guardados en local en vez de OneDrive o el servidor.",
    "steps": [
      {
        "title": "Medir el espacio disponible",
        "detail": "Partir de los números reales: volumen y uso. Todo lo que se libere se contrasta contra esta primera medida para demostrar la mejora.",
        "command": "Get-PSDrive C"
      },
      {
        "title": "Localizar los mayores consumidores",
        "detail": "Descargas, %TEMP%, cachés y OST son los sospechosos habituales. Listar por tamaño los ficheros de Descargas da al usuario una foto de lo que ocupa y facilita decidir qué mover o borrar.",
        "command": "Get-ChildItem $env:USERPROFILE\\Downloads | Sort-Object Length -Descending | Select-Object -First 10 Name,Length"
      },
      {
        "title": "Ejecutar el liberador de espacio",
        "detail": "cleanmgr ofrece limpieza de sistema (archivos temporales, caché de actualizaciones, papelera). Marcar también las opciones de 'limpiar archivos del sistema' para acceso a componentes antiguos.",
        "command": "cleanmgr /d C:"
      },
      {
        "title": "Vaciar las carpetas temporales",
        "detail": "Los temporales de usuario se pueden vaciar en caliente. Ignorar errores de archivos en uso: se limpia lo que se pueda y el resto cae en el próximo reinicio.",
        "command": "Remove-Item $env:TEMP\\* -Recurse -Force -ErrorAction SilentlyContinue"
      },
      {
        "title": "Mover datos a OneDrive o al servidor",
        "detail": "El patrón correcto es mover a OneDrive/SharePoint y compartir enlaces (no adjuntos). Los vídeos y material de campañas antiguas a la carpeta departamental del servidor según la política de retención. Esto libera de verdad y de forma duradera."
      },
      {
        "title": "Limpiar componentes de Windows",
        "detail": "StartComponentCleanup reduce el tamaño del almacén de componentes eliminando versiones antiguas. Es la limpieza 'avanzada' cuando lo básico no basta, y no debe confundirse con ResetBase, que es más agresivo.",
        "command": "DISM /Online /Cleanup-Image /StartComponentCleanup"
      },
      {
        "title": "Activar Storage Sense y verificar",
        "detail": "Dejar Storage Sense activado para que la limpieza sea automática y el ticket no se repita en tres meses. Verificar que queda más del 15% libre y que la app crítica del usuario ya guarda."
      }
    ],
    "verification": "Get-Volume muestra más del 15% libre, la aplicación crítica del usuario guarda archivos sin error y Storage Sense queda activado.",
    "relatedTerms": [
      "Clasificación de datos",
      "Retención de datos",
      "Triage"
    ],
    "relatedTickets": [
      "hdt-039"
    ]
  },
{
    "id": "kb-shared-folder-access",
    "title": "Carpeta compartida inaccesible: red y mapeo",
    "category": "HelpDesk - Redes (Networking)",
    "symptoms": "El usuario no ve la unidad de red o recibe 'no se puede obtener acceso a la ruta de red' al abrir la carpeta compartida. Si el problema es de un solo usuario suele ser mapeo o permisos; si es de un grupo entero, apunta al servidor.",
    "cause": "Unidad mapeada perdida (GPO de unidades sin aplicar o filtrada), permisos del grupo retirados o incompletos, resolución de nombres fallida, servidor de archivos o share caído, o el usuario trabajando sin VPN.",
    "steps": [
      {
        "title": "Probar la conectividad al servidor",
        "detail": "SMB viaja por el puerto 445. Test-NetConnection valida nombre, ruta y puerto en un solo paso: si 445 responde, el servidor y la red están; si no, es conectividad y ahí acaba el trabajo de permisos.",
        "command": "Test-NetConnection FS01.nexora.local -Port 445"
      },
      {
        "title": "Comprobar la resolución del nombre",
        "detail": "Si el ping o TNC fallan por nombre pero no por IP, es DNS. Resolver el nombre del servidor confirma la pista antes de mezclar un problema de nombres con uno de permisos.",
        "command": "Resolve-DnsName FS01.nexora.local"
      },
      {
        "title": "Abrir la ruta UNC directamente",
        "detail": "Sustituir la letra de unidad por la ruta UNC (\\\\FS01\\Compartidos) desde Ejecutar. Si la UNC abre, el problema es del mapeo (GPO o net use); si la UNC también falla, es de permisos o del share. net view lista los shares que el servidor publica y discrimina servidor caído frente a permisos.",
        "command": "net view \\\\FS01.nexora.local"
      },
      {
        "title": "Verificar los grupos del usuario",
        "detail": "El acceso a los recursos se concede por grupo de seguridad, no por usuario. whoami /groups muestra los grupos del token actual: si el usuario acaba de entrar en un grupo, hay que cerrar y reabrir sesión para refrescar el token.",
        "command": "whoami /groups"
      },
      {
        "title": "Revisar la unidad mapeada",
        "detail": "net use lista las conexiones actuales y sus estados. Mapeos huérfanos o con estado 'no disponible' se eliminan y se vuelven a crear: a veces el mapeo viejo apunta a un servidor retirado.",
        "command": "net use"
      },
      {
        "title": "Remapear la unidad",
        "detail": "Mapear a mano valida la ruta y los permisos de escritura de una vez. Si el mapeo manual funciona pero el usuario la pierde al reiniciar, el problema definitivo es la GPO de unidades (ámbito o filtrado).",
        "command": "net use G: \\\\FS01.nexora.local\\Compartidos\\Ventas /persistent:yes"
      }
    ],
    "verification": "La unidad abre desde el Explorador, el usuario crea y guarda un archivo de prueba en la carpeta, y el mapeo sobrevive a un reinicio de sesión.",
    "escalation": "L2 - Infraestructura",
    "relatedTerms": [
      "Grupos de seguridad de AD",
      "Triage",
      "Escalamiento"
    ],
    "relatedTickets": [
      "hdt-005",
      "hdt-018"
    ]
  },
{
    "id": "kb-ntfs-vs-share-permissions",
    "title": "Permisos NTFS vs permisos de recurso compartido",
    "category": "HelpDesk - AD / Identidad",
    "symptoms": "El usuario puede ver una carpeta compartida pero no guardar cambios, o pierde acceso justo después de un cambio de grupos. Otros compañeros con 'el mismo acceso' funcionan sin problema.",
    "cause": "El permiso efectivo de un recurso compartido es el MÁS RESTRICTIVO entre el permiso del share (Lectura/Cambio/Control total) y la ACL NTFS. A ello se suman denegaciones explícitas (que prevalecen), grupos mal anidados y tokens sin refrescar tras entrar en un grupo nuevo.",
    "steps": [
      {
        "title": "Listar los grupos de seguridad del usuario",
        "detail": "El acceso se concede por grupos y whoami /groups muestra el token actual, incluidos los grupos anidados. Si el grupo esperado no aparece y se acaba de añadir al usuario, el token no está refrescado: cerrar sesión y volver a entrar antes de concluir que falta el permiso.",
        "command": "whoami /groups"
      },
      {
        "title": "Inspeccionar la ACL NTFS",
        "detail": "icacls muestra la ACL con sus banderas de herencia: (OI) herencia a objetos, (CI) a carpetas, (I) permiso heredado. Verificar que el grupo del usuario tiene Modify y que no hay un Deny heredado pisándolo.",
        "command": "icacls D:\\Compartidos\\Contabilidad"
      },
      {
        "title": "Recordar la regla del más restrictivo",
        "detail": "El permiso efectivo combina ambas capas: NTFS Lectura + share Control total = solo lectura; NTFS Modify + share Lectura = solo lectura. Al diagnosticar, mirar SIEMPRE las dos pestañas (Compartir y Seguridad) antes de tocar nada."
      },
      {
        "title": "Buscar denegaciones explícitas",
        "detail": "Un solo Deny (a un usuario o a un grupo del que el usuario es miembro) anula todos los Allow de esa capa. Las denegaciones son raras pero cuando existen son casi siempre la causa y suelen ser restos de cambios antiguos."
      },
      {
        "title": "Verificar el anidamiento de grupos",
        "detail": "Si el permiso está en un grupo local del servidor que contiene al grupo global del usuario, el anidamiento tiene que estar correcto. net group muestra los miembros de un grupo global del dominio y confirma la cadena completa.",
        "command": "net group GG-CONTAB-EDIT /domain"
      },
      {
        "title": "Aplicar cambios por grupo, nunca por usuario",
        "detail": "Los permisos directos a usuarios crean una maraña imposible de auditar. La corrección correcta es la pertenencia al grupo correcto (tramitada por IAM si L1 no gestiona grupos), no un icacls /grant al usuario suelto."
      },
      {
        "title": "Refrescar el token y verificar",
        "detail": "Tras cualquier cambio de grupo, cierre de sesión y reapertura. Verificar con un archivo de prueba: crear y modificar en la carpeta. Si funciona, el ticket se cierra con evidencia; si no, volver a whoami /groups y repetir la cadena."
      }
    ],
    "verification": "El usuario, tras reiniciar sesión, crea y modifica un archivo de prueba en la carpeta. whoami /groups muestra el grupo correcto y no hay denegaciones activas.",
    "escalation": "IAM (accesos/grupos)",
    "relatedTerms": [
      "Grupos de seguridad de AD",
      "Principio de mínimo privilegio (Least Privilege)",
      "Auditoría de accesos"
    ],
    "relatedTickets": [
      "hdt-004"
    ]
  },
{
    "id": "kb-vpn-troubleshooting",
    "title": "VPN corporativa no conecta",
    "category": "HelpDesk - Redes (Networking)",
    "symptoms": "El usuario no puede conectar a la VPN desde casa o desde el hotel: el cliente se queda 'verificando' o devuelve un error. El resto de sus servicios de internet funcionan con normalidad.",
    "cause": "Credenciales o MFA (contraseña caducada, notificación no aprobada), cliente VPN desactualizado, puertos bloqueados por la red del usuario o el router (UDP 500/4500), incumplimiento de directiva (Conditional Access, dispositivo no conforme) o caída del gateway corporativo.",
    "steps": [
      {
        "title": "Documentar el error exacto",
        "detail": "Pedir el código del cliente VPN o leerlo del registro del equipo. 691 apunta a autenticación, 809 a bloqueo de puertos/NAT-T y 812 a directiva del servidor. Diagnosticar sin código es adivinar."
      },
      {
        "title": "Comprobar la conectividad base",
        "detail": "Confirmar que el equipo del usuario tiene internet real. Un ping a una IP externa valida ruta y NAT de la red doméstica; muchas 'VPN caídas' son en realidad routers domésticos reiniciados.",
        "command": "ping 8.8.8.8"
      },
      {
        "title": "Probar el alcance del gateway",
        "detail": "Validar que el nombre del gateway resuelve y que el puerto del túnel responde. Test-NetConnection solo prueba TCP (útil para SSL VPN 443); para IKEv2 (UDP 500/4500) un TNC fallido no descarta el puerto, y eso conviene saberlo antes de culpar a Redes.",
        "command": "Test-NetConnection vpn.nexora.local -Port 443"
      },
      {
        "title": "Verificar credenciales y MFA",
        "detail": "Probar el inicio de sesión del usuario en el portal de M365: si falla ahí, la VPN fallará igual (y con mensajes peores). Comprobar también que el teléfono recibe la aprobación MFA: sin señal o con notificaciones pendientes, la VPN se queda 'verificando' eternamente."
      },
      {
        "title": "Revisar el perfil del cliente",
        "detail": "Get-VpnConnection lista los perfiles VPN del equipo con su tipo de túnel y servidor. Un perfil apuntando a un gateway retirado es un clásico tras migraciones de infraestructura.",
        "command": "Get-VpnConnection"
      },
      {
        "title": "Comprobar la política del lado servidor",
        "detail": "Si el usuario y el gateway están bien, revisar si Conditional Access bloquea al usuario por dispositivo no conforme o por ubicación de riesgo. Ese diagnóstico se ve en los sign-in logs de Entra y a menudo requiere a L2 o IAM."
      },
      {
        "title": "Ofrecer una alternativa temporal",
        "detail": "Si la reunión del usuario es antes de la solución, un acceso remoto temporal a su equipo de oficina (herramienta de asistencia remota) salva el compromiso. Documentarlo como plan B y volver al diagnóstico después."
      }
    ],
    "verification": "El túnel se establece, ipconfig muestra el adaptador VPN con IP corporativa y el usuario accede a un recurso interno por nombre (que además valida DNS a través del túnel).",
    "escalation": "L2 - Redes",
    "relatedTerms": [
      "Conditional Access",
      "Dispositivo administrado (managed device)",
      "Triage"
    ],
    "relatedTickets": [
      "hdt-034"
    ]
  },
{
    "id": "kb-mfa-reset",
    "title": "Reset de MFA con verificación segura",
    "category": "HelpDesk - AD / Identidad",
    "symptoms": "El usuario cambió de móvil, perdió el dispositivo o borró la app authenticator y ya no puede completar el segundo factor. Sin MFA no entra a ningún servicio protegido, así que suele llegar con mucha prisa.",
    "cause": "Método MFA registrado en el dispositivo anterior, app desinstalada o re-instalada sin restaurar las cuentas, o pérdida del dispositivo. Es también el escenario de moda para ingeniería social: los atacantes llaman al service desk fingiendo esta situación exacta.",
    "steps": [
      {
        "title": "Nunca resetear por una petición entrante",
        "detail": "El correo o chat entrante que pide el reset de MFA NO es verificación. La regla de oro: la petición inicia el proceso, pero la confirmación de identidad va siempre por un canal de vuelta controlado por Soporte. La prisa del solicitante es una señal de alerta, no de urgencia real."
      },
      {
        "title": "Verificar con devolución de llamada",
        "detail": "Llamar al número registrado en el sistema (RRHH/AD/Entra), no al número que facilita el solicitante. Contrastar un par de datos de empleo (departamento, responsable, fecha de alta) durante la llamada."
      },
      {
        "title": "Contrastar con RRHH o el responsable",
        "detail": "Para cuentas sensibles o peticiones con detalles raros, verificar con el responsable directo que la persona sigue en la empresa y que el cambio de móvil es real. Dos vías de verificación para operaciones de alto impacto."
      },
      {
        "title": "Revocar las sesiones activas",
        "detail": "Antes de re-registrar, revocar sesiones y tokens de refresco: así ninguna sesión vieja (posiblemente del atacante) sobrevive al reset. Es la contención estándar del procedimiento.",
        "command": "Revoke-MgUserSignInSession -UserId cblanco@nexora.local"
      },
      {
        "title": "Exigir el re-registro de MFA",
        "detail": "En el portal de Entra, métodos de autenticación del usuario, usar 'Requerir el nuevo registro de autenticación multifactor'. El siguiente inicio de sesión guiará al usuario por el registro del nuevo método."
      },
      {
        "title": "Emitir un pase de acceso temporal si aplica",
        "detail": "Si la política lo permite, un Temporary Access Pass (TAP) de vida corta permite al usuario entrar y registrar el nuevo método sin depender del factor antiguo. Es la forma controlada de romper el círculo 'sin MFA no puedo registrar MFA'."
      },
      {
        "title": "Acompañar el registro y verificar",
        "detail": "Guiar el registro del authenticator en el móvil nuevo (código QR) y confirmar un inicio de sesión completo de principio a fin. Aprovechar para registrar SSPR en el mismo flujo y que la próxima vez no dependa del service desk."
      }
    ],
    "verification": "El usuario completa un inicio de sesión con el nuevo método MFA (push u OTP) y confirma el acceso a correo y recursos. Las sesiones previas quedaron revocadas y SSPR queda registrado.",
    "escalation": "SOC (posible compromiso)",
    "relatedTerms": [
      "Multi-Factor Authentication (MFA)",
      "Verificación de identidad (identity proofing)",
      "Temporary Access Pass (TAP)",
      "Reinicio de MFA por ingeniería social"
    ],
    "relatedTickets": [
      "hdt-044"
    ]
  },
{
    "id": "kb-suspicious-email",
    "title": "Correo sospechoso: actuación y escalado",
    "category": "HelpDesk - Seguridad para Soporte",
    "symptoms": "Un usuario reporta un correo raro: remitente parecido al corporativo, tema de nómina o factura urgente, adjunto comprimido o enlace a una página de inicio de sesión. A veces varios usuarios lo reciben a la vez.",
    "cause": "Campañas de phishing con suplantación de dominio y marca, cosecha de credenciales mediante enlaces a portales falsos o distribución de malware en adjuntos. Los dominios 'casi iguales' (nexora-corp.com en vez de nexora.com) son su firma habitual.",
    "steps": [
      {
        "title": "Contener: no clicar, no responder",
        "detail": "Confirmar al usuario que hizo bien reportándolo y que NO abra el adjunto ni responda. Si aún lo tiene abierto, no interactuar más. Este mensaje inmediato evita la interacción accidental mientras se tramita el resto."
      },
      {
        "title": "Recabar el mensaje original",
        "detail": "Pedir el correo reenviado como archivo (.msg/.eml) o la función de reporte integrada del cliente. El archivo conserva las cabeceras completas; una captura de pantalla no sirve para análisis."
      },
      {
        "title": "Analizar las cabeceras",
        "detail": "En las cabeceras, Authentication-Results resume SPF, DKIM y DMARC del mensaje: un fallo combinado con un dominio look-alike confirma la suplantación. Anotar la IP de origen y las URLs del cuerpo como IOCs."
      },
      {
        "title": "Buscar el alcance en el tenant",
        "detail": "Message trace (Exchange Online Protection) responde cuántos buzones internos recibieron ese remitente o asunto. Es el dato que decide si es un caso aislado o una campaña a purgar.",
        "command": "Get-MessageTrace -SenderAddress sospechoso@dominio-falso.com -StartDate (Get-Date).AddDays(-2) -EndDate (Get-Date)"
      },
      {
        "title": "Bloquear y purgar",
        "detail": "Bloquear el remitente en el filtro de correo y, si hay campaña, purgar los mensajes de los buzones con Threat Explorer o búsqueda de cumplimiento, para que nadie más los abra después del reporte.",
        "command": "Set-HostedContentFilterPolicy -Identity Default -BlockedSendersAndDomains sospechoso@dominio-falso.com"
      },
      {
        "title": "Averiguar si hubo interacción",
        "detail": "Preguntar directamente si el usuario (u otros destinatarios) abrió el adjunto, clicó el enlace o introdujo credenciales. Si hay credenciales entregadas: reset inmediato de contraseña, revocación de sesiones y escalado al SOC, sin esperar más diagnóstico.",
        "command": "Revoke-MgUserSignInSession -UserId usuario@nexora.local"
      },
      {
        "title": "Escalar al SOC con los IOCs",
        "detail": "Remitente, dominios, IPs, URLs y hash del adjunto alimentan la detección del resto de la organización. Aun sin compromiso confirmado, el SOC decide bloqueos perimetrales y avisos generales."
      }
    ],
    "verification": "El mensaje está purgado de los buboxes afectados, el remitente bloqueado, los IOCs entregados al SOC y los usuarios confirmados sin interacción (o con credenciales ya rotadas si interactuaron).",
    "escalation": "SOC (posible compromiso)",
    "relatedTerms": [
      "Phishing",
      "Análisis de cabeceras de correo",
      "IOC (Indicator of Compromise)",
      "SOC (Security Operations Center)"
    ],
    "relatedTickets": [
      "hdt-043"
    ]
  },
{
    "id": "kb-onboarding-checklist",
    "title": "Onboarding: checklist de alta (JML)",
    "category": "HelpDesk - Service Desk / ITSM",
    "symptoms": "RRHH o el responsable de un equipo solicitan el alta de una incorporación: cuenta de usuario, correo, licencias, equipos y accesos, con fecha de incorporación concreta. No hay incidente: hay una checklist que ejecutar de principio a fin.",
    "cause": "Proceso Joiner del ciclo JML: cada incorporación necesita aprovisionamiento coordinado de identidad, licencias, hardware y accesos, con origen autoritativo en RRHH (HRIS) y responsable que avala los permisos.",
    "steps": [
      {
        "title": "Verificar la solicitud contra el HRIS",
        "detail": "Contrastar nombre completo, iniciales, fecha de incorporación, departamento y rol con el sistema de RRHH. Toda alta nace de un registro de RRHH, nunca de un correo suelto: es la fuente autoritativa y evita cuentas fantasmas."
      },
      {
        "title": "Crear la cuenta de AD",
        "detail": "Aplicar la convención de naming corporativa (primera letra + primer apellido) y crear la cuenta en la OU del departamento. Dejarla habilitada y con cambio de contraseña obligatorio en el primer inicio.",
        "command": "New-ADUser -Name 'Sofía Ramos' -SamAccountName sramos -Path 'OU=Marketing,OU=Usuarios,DC=nexora,DC=local' -Enabled $true"
      },
      {
        "title": "Añadir a los grupos del rol",
        "detail": "Los permisos se otorgan por grupos del rol, definidos en la matriz de roles. Añadir solo los grupos del puesto: los extras se piden después con justificación (mínimo privilegio desde el día uno).",
        "command": "Add-ADGroupMember -Identity GG-MKT-USUARIOS -Members sramos"
      },
      {
        "title": "Asignar la licencia de M365",
        "detail": "Fijar primero el país de uso (obligatorio antes de licenciar) y asignar la SKU del puesto. Verificar en el admin center que la licencia quedó efectivamente aplicada.",
        "command": "Set-MgUser -UserId sramos@nexora.local -UsageLocation ES"
      },
      {
        "title": "Preparar el equipo",
        "detail": "Asignar el portátil del stock, inscribirlo en Intune, verificar BitLocker activo y probar un inicio de sesión con la cuenta nueva antes del primer día. Un equipo listo el viernes evita un ticket el lunes a las 9:05."
      },
      {
        "title": "Configurar el primer día",
        "detail": "Con el usuario en persona: registrar SSPR y MFA (guía presencial, no por correo), probar correo, Teams, unidad compartida y el buzón compartido del equipo si el rol lo requiere."
      },
      {
        "title": "Entregar, verificar y cerrar",
        "detail": "Firmar el inventario de entrega (equipo, periféricos, cableado), confirmar que el usuario trabaja con lo mínimo del puesto y cerrar la solicitud con la checklist completa como evidencia."
      }
    ],
    "verification": "El usuario inicia sesión el primer día, tiene correo, Teams, licencia, unidad de red y permisos del rol; el inventario de hardware está firmado y la checklist completa adjunta al ticket.",
    "relatedTerms": [
      "Joiner-Mover-Leaver (JML)",
      "User provisioning",
      "Onboarding / Offboarding de accesos",
      "HRIS (sistema de RR. HH.)"
    ],
    "relatedTickets": [
      "hdt-007"
    ]
  },
{
    "id": "kb-offboarding-checklist",
    "title": "Offboarding: checklist de baja (JML)",
    "category": "HelpDesk - Service Desk / ITSM",
    "symptoms": "RRHH comunica la baja de un empleado con fecha y hora exactas. El service desk debe desprovisionar cuenta, correo, dispositivos y accesos físicos de forma inmediata y auditable, sin olvidar ningún frente.",
    "cause": "Proceso Leaver del ciclo JML. Las cuentas que quedan activas tras la baja son el clásico 'cuenta huérfana': vía de acceso no autorizado y hallazgo seguro en cualquier auditoría de accesos.",
    "steps": [
      {
        "title": "Confirmar la baja con RRHH",
        "detail": "Verificar identidad del empleado, fecha y HORA exacta de fin de contrato y si es baja voluntaria, despido o cese inmediato (el cese inmediato se ejecuta sin esperar al final de la jornada). No actuar nunca por un aviso no verificado."
      },
      {
        "title": "Deshabilitar la cuenta de inmediato",
        "detail": "A la hora acordada, deshabilitar la cuenta en AD y resetear la contraseña como contención (por si alguien la conocía). Deshabilitar, no borrar: el historial y el buzón se conservan según la política de retención.",
        "command": "Disable-ADAccount -Identity vjimenez"
      },
      {
        "title": "Revocar sesiones y tokens",
        "detail": "En entornos híbridos y en la nube, deshabilitar la cuenta no cierra las sesiones abiertas ni invalida los tokens ya emitidos. Revocarlos expresamente para cerrar también M365 y las apps con tokens activos.",
        "command": "Revoke-MgUserSignInSession -UserId vjimenez@nexora.local"
      },
      {
        "title": "Retirar de los grupos de seguridad",
        "detail": "Quitar la membresía de todos los grupos excepto Domain Users (que no se puede retirar). Así, si la cuenta se re-habilitara por error, no arrastra permisos. Los grupos de recursos son el vector clásico de accesos residuales.",
        "command": "Get-ADPrincipalGroupMembership vjimenez | Where-Object {$_.Name -ne 'Domain Users'} | Remove-ADGroupMember -Members vjimenez -Confirm:$false"
      },
      {
        "title": "Gestionar el buzón",
        "detail": "Según la política y el puesto: convertir el buzón a compartido (conserva el historial sin licencia y sin inicio de sesión), reasignar delegaciones al sustituto o configurar un responder con el contacto nuevo. La decisión la avala el responsable."
      },
      {
        "title": "Recuperar y limpiar los dispositivos",
        "detail": "Recuperar portátil, móvil corporativo, periféricos y tarjetas, cotejando con el inventario de alta. Ejecutar el borrado (wipe) desde Intune de los dispositivos gestionados y confirmar que desaparecen como activos asignados."
      },
      {
        "title": "Cerrar accesos físicos y verificar",
        "detail": "Notificar a seguridad física la anulación de la tarjeta de acceso. Verificación final: intentar un inicio de sesión con la cuenta y confirmar el rechazo, y revisar que no quedan accesos de servicio con su cuenta personal."
      }
    ],
    "verification": "El inicio de sesión con la cuenta falla, no hay sesiones activas en los registros, los grupos están retirados, los dispositivos recuperados y limpiados, y la checklist firmada por RRHH adjunta al ticket.",
    "escalation": "SOC (posible compromiso)",
    "relatedTerms": [
      "Joiner-Mover-Leaver (JML)",
      "Account deprovisioning",
      "Revocación de sesiones y tokens",
      "Onboarding / Offboarding de accesos"
    ],
    "relatedTickets": [
      "hdt-047"
    ]
  },
{
    "id": "kb-teams-no-audio",
    "title": "Teams sin audio en reuniones (auriculares)",
    "category": "HelpDesk - Microsoft 365",
    "symptoms": "En las reuniones de Teams los demás no oyen al usuario, o el usuario no oye nada, o ambos. Fuera de Teams el headset parece funcionar y la cuenta del usuario está bien (el móvil o la web van perfectos).",
    "cause": "Dispositivo incorrecto seleccionado en Teams (micrófono del portátil en vez del headset), dispositivo predeterminado de Windows apuntando a otro aparato, otra aplicación reteniendo el micrófono, driver de audio antiguo o, menos frecuente, caché del cliente degradada.",
    "steps": [
      {
        "title": "Probar el audio fuera de Teams",
        "detail": "Reproducir un sonido local o una web de música y grabar con la grabadora de Windows. Esto separa el problema de hardware/Windows del problema de configuración de Teams, que son caminos distintos."
      },
      {
        "title": "Revisar los dispositivos en Teams",
        "detail": "Teams > Configuración > Dispositivos: verificar micrófono, altavoz y cámara apuntando al headset y hablar para ver moverse la barra de nivel. La 'llamada de prueba' (Make a test call) graba y reproduce la propia voz: es el verificador definitivo."
      },
      {
        "title": "Comprobar los dispositivos de Windows",
        "detail": "mmsys.cpl abre las opciones de sonido: en la pestaña Grabación, el headset debe ser el dispositivo predeterminado. Teams suele seguir al sistema, pero si el sistema apunta al micro integrado, la mezcla de dispositivos se rompe.",
        "command": "mmsys.cpl"
      },
      {
        "title": "Descartar aplicaciones que retienen el micrófono",
        "detail": "Otros clientes de videollamada o grabadoras pueden tomar el micrófono en exclusiva. Cerrarlos todos y probar de nuevo; revisar también los permisos de micrófono de Windows por aplicación."
      },
      {
        "title": "Reconectar y actualizar el driver",
        "detail": "Desconectar el headset, esperarse unos segundos y conectarlo en otro puerto USB. Si sigue fallando, actualizar el driver de audio desde el Administrador de dispositivos o Windows Update; los USB de audio son sensibles a drivers viejos.",
        "command": "Get-PnpDevice -Class MEDIA"
      },
      {
        "title": "Limpiar la caché de Teams si persiste",
        "detail": "Cerrar Teams por completo y vaciar la carpeta de caché (la ruta depende de Teams clásico o nuevo). Es el último recurso y a la vez el fix de muchos problemas raros de cámara y dispositivos."
      }
    ],
    "verification": "La llamada de prueba de Teams graba y reproduce la voz del usuario con el headset y una reunión real de 10 minutos se completa sin incidencias de audio.",
    "relatedTerms": [
      "Microsoft 365 admin center",
      "Triage"
    ],
    "relatedTickets": [
      "hdt-026"
    ]
  },
{
    "id": "kb-onedrive-not-syncing",
    "title": "OneDrive no sincroniza",
    "category": "HelpDesk - Microsoft 365",
    "symptoms": "Los archivos que el usuario guarda no aparecen en la versión web ni en el móvil, o los cambios compartidos no llegan al resto del equipo. El icono de OneDrive de la bandeja está en pausa, con una cruz o con signo de exclamación.",
    "cause": "Sincronización en pausa (manual o por batería), sesión caducada, archivos bloqueados por otra aplicación, nombres o rutas no admitidos, cuota de OneDrive agotada o cliente necesitando un reinicio limpio.",
    "steps": [
      {
        "title": "Comprobar el estado del icono",
        "detail": "Abrir OneDrive desde la bandeja y leer el estado: 'Pausado hasta...' se reanuda con un clic y es la causa más frecuente. El estado del icono (nube azul, pausa, cruz roja) resume el problema sin abrir nada más. Verificar también que el proceso está corriendo.",
        "command": "Get-Process OneDrive | Select-Object Name,Id,StartTime"
      },
      {
        "title": "Verificar la sesión y la cuota",
        "detail": "Confirmar que OneDrive tiene la sesión abierta con la cuenta corporativa correcta (no una personal) y que la cuota del usuario no está llena en el portal: sin espacio, la sincronización se detiene sin mensajes claros para el usuario."
      },
      {
        "title": "Revisar los elementos con problemas",
        "detail": "El estado de OneDrive enlaza a 'Ver problemas de sincronización': archivos bloqueados por un programa abierto, caracteres no válidos en el nombre o rutas demasiado largas. Cada elemento listado explica qué no sube y por qué."
      },
      {
        "title": "Reiniciar OneDrive de forma limpia",
        "detail": "El reset reinicia el cliente sin perder datos locales: corta las conexiones, reconstruye la cola y resuelve la mayoría de estados atascados. Tras ejecutarlo, OneDrive tarda unos minutos en volver a arrancar y sincronizar.",
        "command": "& $env:LOCALAPPDATA\\Microsoft\\OneDrive\\onedrive.exe /reset"
      },
      {
        "title": "Comprobar nombres y rutas de archivo",
        "detail": "Caracteres no permitidos, nombres que empiezan/acaban en espacio o rutas que superan el límite de OneDrive dejan al archivo 'eternamente pendiente'. Renombrar en local y verlo subir confirma la causa."
      },
      {
        "title": "Verificar espacio local y Files On-Demand",
        "detail": "Si el disco local está lleno, la sincronización no puede bajar archivos. Verificar también que Files On-Demand sigue activo: si el usuario lo desactivó y marcó 'simpre conservar en este dispositivo', el disco se llena solo.",
        "command": "Get-Volume C"
      }
    ],
    "verification": "El icono queda en nube azul sin símbolos de error y un archivo de prueba creado en local aparece en la versión web de OneDrive en menos de un minuto (y viceversa).",
    "relatedTerms": [
      "Gestión de licencias (SKU)",
      "Microsoft 365 admin center",
      "Triage"
    ],
    "relatedTickets": [
      "hdt-027"
    ]
  },
{
    "id": "kb-corrupt-user-profile",
    "title": "Perfil de usuario corrupto: reparación o recreado",
    "category": "HelpDesk - Windows / Endpoint",
    "symptoms": "Al iniciar sesión aparece el aviso 'ha iniciado sesión con un perfil temporal': escritorio vacío, sin documentos ni configuraciones. El usuario suele creer que ha perdido sus archivos (casi nunca es así).",
    "cause": "Entrada del perfil dañada en el registro (ProfileList con sufijo .bak), ntuser.dat bloqueado por un apagón o antivirus, perfil descargado a medias por software de gestión o, en casos raros, disco con errores.",
    "steps": [
      {
        "title": "Confirmar el perfil temporal",
        "detail": "El aviso de Windows es explícito, y la variable USERPROFILE confirmando C:\\Users\\TEMP elimina toda duda. Avisar inmediatamente al usuario de que NO guarde trabajo en ese estado: lo que se guarde se pierde al cerrar sesión.",
        "command": "Write-Output $env:USERPROFILE"
      },
      {
        "title": "Advertir y proteger los datos",
        "detail": "El perfil original sigue en C:\\Users\\nombre. Antes de tocar el registro, comprobar que la carpeta existe y su tamaño es coherente. Si hay datos críticos, copiarlos a un sitio seguro antes de cualquier reparación."
      },
      {
        "title": "Inspeccionar ProfileList en el registro",
        "detail": "Bajo ProfileList hay una entrada por SID de usuario. Buscar el SID del usuario (whoami /user) y detectar dobles entradas: la original con sufijo .bak es la buena que Windows ignoró al cargar.",
        "command": "Get-ChildItem 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\ProfileList'"
      },
      {
        "title": "Reparar la entrada .bak",
        "detail": "Con la entrada buena con sufijo .bak: eliminar la entrada sin sufijo (la corrupta) y renombrar la .bak quitándole el sufijo. Exportar la rama antes de tocar (reversibilidad) y reiniciar para que cargue el perfil correcto."
      },
      {
        "title": "Recrear el perfil si no se repara",
        "detail": "Cuando la reparación no funciona, crear un perfil nuevo, copiar Documentos, Escritorio, Favoritos y firmas desde la carpeta antigua y repuntar ProfileImagePath. Es más lento pero es la solución definitiva y limpia."
      },
      {
        "title": "Comprobar la integridad del disco",
        "detail": "Los perfiles que se corrompen 'solas' veces seguidas delatan errores de disco. Un chkdsk en modo solo-lectura (scan) detecta problemas sin agendar reinicio y evita repetir la reparación cada semana.",
        "command": "chkdsk C: /scan"
      }
    ],
    "verification": "El usuario inicia sesión dos veces seguidas sin aviso de perfil temporal, su escritorio y documentos están presentes y Outlook/OneDrive cargan su configuración propia.",
    "escalation": "L2 - Infraestructura",
    "relatedTerms": [
      "Dispositivo administrado (managed device)",
      "Runbook",
      "Evidencia (evidence)"
    ],
    "relatedTickets": [
      "hdt-009"
    ]
  },
{
    "id": "kb-ost-repair",
    "title": "Outlook no arranca: reconstrucción del OST",
    "category": "HelpDesk - Microsoft 365",
    "symptoms": "Outlook se cierra solo al abrir, se queda bloqueado en el arranque o muestra 'no se puede abrir el conjunto de carpetas'. El correo web (OWA) funciona con normalidad, señal de que la cuenta está intacta.",
    "cause": "OST (caché local del buzón) dañado por apagones o cierres forzosos, perfil de Outlook corrupto, o un complemento que tumba el cliente en el arranque. El buzón en la nube está bien: lo local es lo que falla.",
    "steps": [
      {
        "title": "Descartar la cuenta: probar OWA",
        "detail": "Abrir outlook.office.com con las mismas credenciales. Si OWA va bien, el problema es local (perfil, OST o complemento) y no hay que tocar la cuenta ni las licencias: ahorra medios resets innecesarios."
      },
      {
        "title": "Probar Outlook en modo seguro",
        "detail": "El modo seguro deshabilita complementos. Si arranca, deshabilitar complementos uno a uno hasta dar con el culpable (módulos de CRM, antivirus de correo, conectores viejos). Si no arranca, seguir al perfil.",
        "command": "outlook.exe /safe"
      },
      {
        "title": "Recrear el perfil de Outlook",
        "detail": "El applet de Correo del Panel de control gestiona los perfiles; el switch /manageprofiles lo abre directamente. Crear un perfil nuevo: hereda el buzón de la cuenta pero estrena configuración y OST.",
        "command": "outlook.exe /manageprofiles"
      },
      {
        "title": "Renombrar el OST para regenerarlo",
        "detail": "Con Outlook cerrado, renombrar el OST (no borrarlo: es el plan de retorno). Al abrir el perfil nuevo, Outlook descarga el buzón desde Exchange y crea un OST limpio. Con buzones grandes conviene avisar del tiempo de descarga.",
        "command": "Rename-Item $env:LOCALAPPDATA\\Microsoft\\Outlook\\cruiz.ost cruiz.ost.old"
      },
      {
        "title": "Comprobar espacio antes de la descarga",
        "detail": "La regeneración del OST necesita espacio libre comparable al buzón. Verificar el volumen antes de empezar para no dejar al usuario a medias con la descarga y el disco lleno.",
        "command": "Get-Volume C"
      },
      {
        "title": "Dejar sincronizar y verificar",
        "detail": "Esperar a que la barra muestre 'Conectado a: Microsoft Exchange' y que las carpetas populen. Verificar búsqueda, envío y recepción. Eliminar el OST renombrado solo después de confirmar días de estabilidad."
      }
    ],
    "verification": "Outlook abre en menos de 15 segundos, sincroniza en ambos sentidos (correo de prueba ida y vuelta) y el usuario trabaja sin cierres durante varios días. El OST viejo renombrado se elimina tras confirmar.",
    "relatedTerms": [
      "Microsoft 365 admin center",
      "Triage"
    ],
    "relatedTickets": [
      "hdt-028"
    ]
  },
{
    "id": "kb-rdp-not-connecting",
    "title": "RDP no conecta al equipo de trabajo",
    "category": "HelpDesk - Redes (Networking)",
    "symptoms": "El usuario intenta conectarse por escritorio remoto a su equipo de oficina (normalmente vía VPN desde casa) y recibe 'no se puede conectar' o un timeout. Ayer funcionaba y no ha cambiado nada, según él.",
    "cause": "VPN caída o mal conectada, equipo destino apagado o dormido, Escritorio remoto deshabilitado (por GPO o configuración), usuario fuera del grupo Remote Desktop Users, firewall bloqueando el 3389 o resolución de nombres fallida.",
    "steps": [
      {
        "title": "Verificar la conectividad base y la VPN",
        "detail": "Sin túnel no hay RDP. Comprobar que la VPN está conectada y que ipconfig muestra el adaptador VPN con IP corporativa. Si la VPN está caída, ese es el ticket (y otro runbook).",
        "command": "ipconfig"
      },
      {
        "title": "Comprobar la resolución del nombre",
        "detail": "El cliente debe resolver el nombre del equipo destino. Resolve-DnsName confirma la IP a la que apunta; un nombre que no resuelve (o resuelve a una IP vieja) explica el timeout.",
        "command": "Resolve-DnsName PC-CONTAB-08.nexora.local"
      },
      {
        "title": "Probar el puerto 3389",
        "detail": "Test-NetConnection al puerto del Escritorio remoto es la prueba definitiva de ruta y servicio. TcpTestSucceeded a true significa que hay alguien escuchando: el problema es de permisos; false significa servicio o firewall.",
        "command": "Test-NetConnection PC-CONTAB-08.nexora.local -Port 3389"
      },
      {
        "title": "Verificar el Escritorio remoto habilitado",
        "detail": "En el equipo destino (o por registro remoto), el valor fDenyTSComponents a 0 significa RDP habilitado. Un 1 delata una GPO o un cambio manual que lo desactivó: comparar con otros equipos del mismo OU.",
        "command": "Get-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server' -Name fDenyTSComponents"
      },
      {
        "title": "Comprobar el grupo Remote Desktop Users",
        "detail": "El acceso RDP se concede por membresía en el grupo local Remote Desktop Users (más la política 'Permitir inicio de sesión a través de Servicios de Escritorio remoto'). Si el usuario falta, tramitar el grupo con IAM en lugar de tocar reglas sueltas.",
        "command": "net localgroup 'Remote Desktop Users'"
      },
      {
        "title": "Revisar firewall y GPO de acceso",
        "detail": "La regla de firewall del Escritorio remoto (grupo 'Remote Desktop') debe estar habilitada en el perfil activo, y la GPO de restricción de RDP puede excluir al usuario o a su equipo. Comparar con un equipo que sí funciona.",
        "command": "Get-NetFirewallRule -DisplayGroup 'Escritorio remoto' | Select-Object DisplayName,Enabled,Profile"
      },
      {
        "title": "Conectar y verificar la sesión",
        "detail": "Cerrar con una conexión real por mstsc y la sesión del usuario funcionando (escritorio, aplicaciones, impresión redirigida). Dejar atajos e instrucciones al usuario para el próximo teletrabajo.",
        "command": "mstsc /v:PC-CONTAB-08.nexora.local"
      }
    ],
    "verification": "El usuario completa una sesión RDP desde su casa (VPN + mstsc) y trabaja con su escritorio de oficina, con teclado, ratón y sonido correctos.",
    "escalation": "IAM (accesos/grupos)",
    "relatedTerms": [
      "Grupos de seguridad de AD",
      "Triage",
      "Escalamiento"
    ],
    "relatedTickets": [
      "hdt-036"
    ]
  },
{
    "id": "kb-intune-noncompliant",
    "title": "Dispositivo no conforme o no inscrito en Intune",
    "category": "HelpDesk - AD / Identidad",
    "symptoms": "El usuario no puede entrar al correo u otros servicios y ve un aviso de que su dispositivo no cumple las directivas de la empresa. Suele pasar con equipos recién entregados o tras grandes cambios de la plataforma.",
    "cause": "Inscripción (enrollment) incompleta o perdida, actualizaciones pendientes que marcan el dispositivo no conforme, BitLocker sin activar, sistema operativo fuera de versión soportada o estado obsoleto en la consola (falta de sincronización).",
    "steps": [
      {
        "title": "Comprobar el acceso profesional o educativo",
        "detail": "En Configuración > Cuentas > Acceso profesional o educativo debe aparecer la cuenta corporativa conectada. Un estado 'Conectado' sin datos de MDM apunta a inscripción a medias: hay que desconectar y volver a inscribir."
      },
      {
        "title": "Forzar la sincronización desde el Portal de empresa",
        "detail": "El Portal de empresa permite sincronizar el dispositivo con Intune manualmente y muestra el estado de cumplimiento con sus motivos. Es la vista del usuario y el primer paso para refrescar estados obsoletos."
      },
      {
        "title": "Revisar los motivos de incumplimiento",
        "detail": "Los motivos típicos son parches pendientes y cifrado pendiente. Con manage-bde se ve el estado de BitLocker del equipo y si está cifrando a medias; las actualizaciones se comprueban en Windows Update.",
        "command": "manage-bde -status C:"
      },
      {
        "title": "Comprobar la versión del sistema",
        "detail": "Un sistema operativo por debajo de la versión mínima de la directiva marca el dispositivo no conforme hasta actualizarlo. La versión instalada se comprueba con winver o con la configuración del sistema.",
        "command": "winver"
      },
      {
        "title": "Reinscribir el dispositivo",
        "detail": "Si la inscripción está rota: desconectar la cuenta en Acceso profesional o educativo y volver a conectarla (inscribir). El dispositivo reaparece en la consola y recibe directivas de nuevo. Los datos de usuario no se pierden en la reinscripción estándar."
      },
      {
        "title": "Verificar en la consola de Intune",
        "detail": "En endpoint.microsoft.com > Dispositivos, buscar el equipo por nombre o usuario y comprobar el estado de cumplimiento y de inscripción tras la sincronización (puede tardar 15-30 minutos). Si no aparece, hay problema de inscripción real."
      },
      {
        "title": "Confirmar el acceso condicional",
        "detail": "El bloqueo de correo es la consecuencia (Conditional Access exige dispositivo conforme), no la causa. Corregir el cumplimiento tiene que restaurar el acceso: si no lo hace tras la sincronización, revisar la política o el usuario con IAM."
      }
    ],
    "verification": "El dispositivo figura conforme en la consola, el usuario completa un inicio de sesión en Outlook/webmail sin bloqueos y el estado se mantiene al día siguiente.",
    "escalation": "L2 - Infraestructura",
    "relatedTerms": [
      "Microsoft Intune",
      "Device compliance",
      "Conditional Access",
      "Dispositivo administrado (managed device)"
    ],
    "relatedTickets": [
      "hdt-006"
    ]
  },
{
    "id": "kb-spooler-print-server",
    "title": "Spooler caído en servidor de impresión (multiusuario)",
    "category": "HelpDesk - Windows / Endpoint",
    "symptoms": "De golpe, nadie de una o varias zonas puede imprimir: todas las colas aparecen sin conexión aunque las impresoras están encendidas. Varios usuarios y varias impresoras a la vez delatan el servidor de impresión.",
    "cause": "Servicio de cola de impresión (spooler) detenido o en bucle de caídas, normalmente por un trabajo corrupto o gigante atascado, un driver problemático o los reinicios en bucle tras un parche.",
    "steps": [
      {
        "title": "Confirmar el alcance multiusuario",
        "detail": "Verificar con 2-3 usuarios de zonas e impresoras distintas que el fallo es generalizado. Un solo usuario con una sola impresora es otro runbook: el spooler del servidor no es el culpable hasta que el patrón lo diga."
      },
      {
        "title": "Comprobar el servicio en el servidor",
        "detail": "Consultar el estado del spooler en PRINT01 de forma remota. Si está detenido, el síntoma encaja al 100% con el reporte de los usuarios y el siguiente paso lo revierte.",
        "command": "Get-Service Spooler -ComputerName PRINT01"
      },
      {
        "title": "Reiniciar el servicio de forma controlada",
        "detail": "Reiniciar el spooler suele recuperar la impresión de inmediato. Avisar a los usuarios de que los trabajos en cola se pierden y hay que reenviarlos, para evitar una segunda oleada de tickets.",
        "command": "Invoke-Command -ComputerName PRINT01 { Restart-Service Spooler }"
      },
      {
        "title": "Limpiar la carpeta de spool si reincide",
        "detail": "Si el servicio vuelve a caerse, hay un trabajo corrupto en la carpeta de spool. Parar el servicio, vaciar C:\\Windows\\System32\\spool\\PRINTERS por completo y arrancarlo: el bucle desaparece con el trabajo problemático.",
        "command": "Invoke-Command -ComputerName PRINT01 { Stop-Service Spooler; Remove-Item C:\\Windows\\System32\\spool\\PRINTERS\\* -Force; Start-Service Spooler }"
      },
      {
        "title": "Identificar el trabajo o driver que lo tumba",
        "detail": "Recuperar el trabajo problemático de lo que cuentan los usuarios (PDFs gigantes, impresiones de planos) y avisar a su dueño. Si las caídas son sistemáticas y sin trabajo claro, el sospechoso pasa a ser un driver compartido por muchas colas."
      },
      {
        "title": "Verificar y monitorizar",
        "detail": "Confirmar impresión de prueba desde al menos tres departamentos y vigilar el servicio durante 24 horas antes de cerrar el P1. Documentar la causa raíz y la acción definitiva (límite de tamaño, actualización de driver) en el ticket."
      }
    ],
    "verification": "Usuarios de tres zonas imprimen correctamente y el servicio Spooler permanece Running 24 horas sin reinicios adicionales.",
    "escalation": "L2 - Infraestructura",
    "relatedTerms": [
      "Escalamiento",
      "Tier 1 / Tier 2 / Tier 3",
      "Caso (case management)"
    ],
    "relatedTickets": [
      "hdt-046"
    ]
  },
{
    "id": "kb-software-install-request",
    "title": "Instalación de software: solicitud estándar",
    "category": "HelpDesk - Service Desk / ITSM",
    "symptoms": "Un usuario pide instalar una aplicación que no está en el catálogo de autoservicio, normalmente con una justificación de negocio y prisa moderada. No hay nada roto: hay una solicitud que tramitar.",
    "cause": "Necesidad de negocio legítima (software específico del puesto o del proyecto). El riesgo no es la instalación en sí, sino el software sin validar: seguridad, licencias y mantenimiento del parque.",
    "steps": [
      {
        "title": "Validar la justificación y la aprobación",
        "detail": "La solicitud necesita justificación escrita y aprobación del responsable. Sin aval del negocio no se tramita: el service desk no es quien decide compras, pero sí quien exige que la decisión esté documentada."
      },
      {
        "title": "Comprobar el catálogo de autoservicio",
        "detail": "Antes de pedir nada a nadie: si la aplicación ya está en el catálogo (Company Portal), el usuario la instala solo y el ticket se cierra con educación de autoservicio. Es el desenlace más frecuente y más barato."
      },
      {
        "title": "Verificar la lista de software permitido",
        "detail": "El SOC mantiene la lista de software permitido en la empresa. Un producto no listado (o con una versión vulnerable) se detiene aquí: la decisión de excepción la toma seguridad, no Soporte ni el solicitante."
      },
      {
        "title": "Comprobar requisitos del equipo",
        "detail": "RAM, GPU, espacio y compatibilidad con el sistema del puesto. Instalar software que no cumple requisitos genera un ticket de rendimiento a la semana: mejor comprobarlo antes.",
        "command": "Get-Volume C"
      },
      {
        "title": "Desplegar o instalar",
        "detail": "Siempre que el paquete lo permita, desplegar por Intune (instalación silenciosa, desinstalable, auditada). La instalación manual asistida queda para casos sin empaquetado, documentando qué se instaló y dónde."
      },
      {
        "title": "Registrar licencia e inventario",
        "detail": "La licencia comprada queda registrada (SKU, número, vencimiento) y el CMDB/inventario del puesto actualizado con la nueva aplicación. Sin ese registro, la renovación del año que viene será una sorpresa."
      },
      {
        "title": "Verificar con el usuario",
        "detail": "Que el usuario abra la aplicación y haga una operación real de su trabajo (abrir el proyecto, renderizar un vídeo). El cierre con verificación funcional evita el rebote a las dos horas."
      }
    ],
    "verification": "La aplicación está instalada, abre y realiza la operación de negocio esperada; la licencia consta registrada y el inventario del puesto refleja el software nuevo.",
    "relatedTerms": [
      "Flujo de aprobación",
      "Derechos de administrador local",
      "Principio de mínimo privilegio (Least Privilege)"
    ],
    "relatedTickets": [
      "hdt-008"
    ]
  },
{
    "id": "kb-vishing-call",
    "title": "Vishing: llamada sospechosa al service desk",
    "category": "HelpDesk - Seguridad para Soporte",
    "symptoms": "Llama alguien con prisa y presión pidiendo un reset de contraseña o MFA, o pide al usuario que lea un código del móvil, suplantando a TI o a un directivo. A veces el propio usuario reporta la llamada que recibió 'de soporte'.",
    "cause": "Ingeniería social telefónica (vishing): el atacante suplanta al service desk o a una figura de autoridad para conseguir credenciales, códigos OTP o que se ejecuten resets de MFA sobre cuentas que luego controla.",
    "steps": [
      {
        "title": "No ceder datos ni ejecutar nada en la llamada",
        "detail": "Regla absoluta: Soporte jamás pide contraseñas (ni las necesita) ni códigos de un solo uso. Ante cualquier petición de credenciales por teléfono, la llamada se corta y se verifica por otra vía. La prisa y la autoridad son las herramientas del atacante."
      },
      {
        "title": "Verificar con devolución de llamada",
        "detail": "Si el asunto parece legítimo, colgar y devolver la llamada al número del registro corporativo, nunca al que facilita el llamante. La persona real no tiene problema en recibir la llamada en su extensión oficial."
      },
      {
        "title": "Contrastar con el responsable o RRHH",
        "detail": "Si el llamante dice ser un directivo sin acceso a su registro, contrastar con su asistente o con RRHH. El falso directivo 'en reunión' que no puede recibir llamadas es el pretexto más común."
      },
      {
        "title": "Registrar los detalles del intento",
        "detail": "Anotar número llamante, hora, pretexto exacto y qué se llegó a pedir/compartir. Ese registro alimenta al SOC: los intentos rara vez son aislados y el patrón (números, pretextos) permite avisar a toda la organización."
      },
      {
        "title": "Actuar si se compartieron credenciales",
        "detail": "Si el usuario llegó a entregar contraseña, OTP o aprobó una notificación MFA, tratarlo como compromiso: reset inmediato de contraseña, revocación de sesiones y tokens, y revisión de la actividad de la cuenta.",
        "command": "Revoke-MgUserSignInSession -UserId atorres@nexora.local"
      },
      {
        "title": "Escalar al SOC y avisar a la organización",
        "detail": "Escalar el patrón (aunque no haya compromiso) para que el SOC valore bloqueos y avisos generales. Recordar a toda la empresa la regla: TI nunca pide contraseñas ni códigos por teléfono, chat ni correo."
      }
    ],
    "verification": "La identidad se verificó por canal de retorno (o el intento quedó documentado y reportado), no se ejecutó ningún reset sin verificación y, si hubo entrega de datos, la cuenta quedó con contraseña nueva y sesiones revocadas.",
    "escalation": "SOC (posible compromiso)",
    "relatedTerms": [
      "Phishing",
      "Reinicio de MFA por ingeniería social",
      "Verificación de identidad (identity proofing)",
      "SOC (Security Operations Center)"
    ],
    "relatedTickets": [
      "hdt-045"
    ]
  }
];

/** Índice id → artículo (para resolver kbRef de tickets sin buscar). */
export const HELPDESK_KB_BY_ID: Map<string, HelpDeskKbArticle> = new Map(
  HELPDESK_KB_ARTICLES.map((a) => [a.id, a])
);
