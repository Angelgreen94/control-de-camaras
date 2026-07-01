# Control de Camaras

Dashboard web para Google Apps Script que muestra conteos y listados de camaras VVU y LPR desde Google Sheets.

## Contenido

- `Codigo.gs`: backend de Google Apps Script. Lee las hojas `go` y `date_lpr`.
- `index.html`: interfaz del dashboard con pestañas para Control VVU y Control LPR.
- `appsscript.json`: manifiesto basico del proyecto Apps Script.

## Hojas esperadas

### `go`

Columnas principales:

- `Municipio`
- `IP`
- `Afiliacion`
- `Dispositivo`
- `Servidor`
- `Coordenadas`

### `date_lpr`

Columnas principales:

- `Direccion IP`
- `Afiliacion Cliente`
- `Server ID`
- `Device ID`
- `Nombre`
- `Afiliacion SGT`
- `Subcentro`
- `N de LPR`
- `Tecnologia`

## Publicacion

1. Copiar `Codigo.gs`, `index.html` y `appsscript.json` en Google Apps Script.
2. Verificar el `SHEET_ID` en `Codigo.gs`.
3. Implementar como aplicacion web.
