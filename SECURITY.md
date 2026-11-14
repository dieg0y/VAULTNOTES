# Seguridad

## Naturaleza del proyecto

VaultNotes es una PWA educativa de estudio de ciberseguridad (SOC / IAM / Service Desk / SysAdmin), 100% offline y sin backend. Los datasets bajo `src/vault/data/` describen técnicas de ataque con fines de estudio y detección: **no contienen ni ejecutan malware**.

## Convención defang

Los payloads literales del material educativo usan corchetes tipográficos `‹ ›` en lugar de `< >` (igual que `hxxp://` en los informes de amenazas): idéntico valor didáctico, cero ejecutabilidad. Las consultas de detección KQL/SPL/Sigma se mantienen literales porque su propósito es copiarlas tal cual en Sentinel/Splunk.

## Falsos positivos de antivirus

El repo está diseñado para **no** disparar heurísticas ML de antivirus (`Trojan:Script/Wacatac.H!ml` de Windows Defender incluido): los payloads van defang o descritos en prosa, y `IniciarVaultNotes.bat` descarga Bun con curl + tar nativos (cero PowerShell, cero ejecución de scripts remotos). Si aun así salta una alerta, es un falso positivo: añade una exclusión para la carpeta del proyecto (indicaciones en el README).

## Reportar vulnerabilidades de la app

Abre un issue en el repo describiendo el problema. Nota de arquitectura: todo el HTML persistido se sanitiza con **DOMPurify** en todos los límites de confianza, y las rutas locales rechazan solicitudes cross-site y limitan el tamaño de los datos JSON.
