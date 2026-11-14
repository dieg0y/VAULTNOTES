# Seguridad

## Naturaleza del proyecto

VaultNotes es una PWA educativa de estudio de ciberseguridad (SOC / IAM / Service Desk / SysAdmin), 100% offline y sin backend. Los datasets bajo `src/vault/data/` describen técnicas de ataque con fines de estudio y detección: **no contienen ni ejecutan malware**.

## Convención defang

Los payloads literales del material educativo usan corchetes tipográficos `‹ ›` en lugar de `< >` (igual que `hxxp://` en los informes de amenazas): idéntico valor didáctico, cero ejecutabilidad. Las consultas de detección KQL/SPL/Sigma se mantienen literales porque su propósito es copiarlas tal cual en Sentinel/Splunk.

## Falsos positivos de antivirus

Por la naturaleza del contenido, algunas heurísticas ML (p. ej. `Trojan:Script/Wacatac.H!ml` de Windows Defender) pueden marcar archivos de datos al descargar el ZIP del repo. Es un falso positivo conocido: consulta el README para añadir una exclusión y reportarlo a Microsoft.

## Reportar vulnerabilidades de la app

Abre un issue en el repo describiendo el problema. Nota de arquitectura: todo el HTML persistido se sanitiza con **DOMPurify** en todos los límites de confianza, y las rutas locales rechazan solicitudes cross-site y limitan el tamaño de los datos JSON.
