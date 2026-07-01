const SHEET_ID = '1Zu6yESMkjGxwlQg4DsIMkCza7ytfLdqQQC5BsvNV6y0';
const VVU_SHEET_NAME = 'go';
const LPR_SHEET_NAME = 'date_lpr';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Control VVU y LPR')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function normalizeHeader_(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w]+/g, ' ')
    .trim();
}

function findHeader_(headers, names) {
  const normalizedHeaders = headers.map(normalizeHeader_);
  for (let i = 0; i < names.length; i++) {
    const target = normalizeHeader_(names[i]);
    const index = normalizedHeaders.indexOf(target);
    if (index !== -1) return index;
  }
  return -1;
}

function findHeaderContaining_(headers, words) {
  const normalizedHeaders = headers.map(normalizeHeader_);
  const normalizedWords = words.map(normalizeHeader_);
  for (let i = 0; i < normalizedHeaders.length; i++) {
    const header = normalizedHeaders[i];
    const matches = normalizedWords.every(function(word) {
      return header.indexOf(word) !== -1;
    });
    if (matches) return i;
  }
  return -1;
}

function getSheetRows_(sheetName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error('No existe la hoja: ' + sheetName);
  }

  const values = sheet.getDataRange().getValues();
  if (values.length === 0) {
    return { data: [], headers: [] };
  }

  const headers = values.shift();
  return { data: values, headers: headers };
}

function getVvuSheetData_() {
  const { data, headers } = getSheetRows_(VVU_SHEET_NAME);

  const idx = {
    municipio: findHeader_(headers, ['Municipio']),
    ip: findHeader_(headers, ['IP', 'Direccion IP', 'Dirección IP']),
    afiliacion: findHeader_(headers, ['Afiliacion', 'Afiliación']),
    dispositivo: findHeader_(headers, ['Dispositivo']),
    servidor: findHeader_(headers, ['Servidor', 'Server']),
    coordenadas: findHeader_(headers, ['Coordenadas'])
  };

  if (idx.municipio === -1 || idx.ip === -1 || idx.afiliacion === -1 || idx.dispositivo === -1) {
    throw new Error('Revisa los encabezados de ' + VVU_SHEET_NAME + '. Deben existir: Municipio, IP, Afiliacion y Dispositivo.');
  }

  return { data, idx };
}

function getDashboardData() {
  const { data, idx } = getVvuSheetData_();
  const fijas = ['F1', 'F2', 'F3', 'F4', 'F5'];

  const resumen = {
    PTZ: 0,
    F1: 0,
    F2: 0,
    F3: 0,
    F4: 0,
    F5: 0,
    totalFijas: 0,
    total: 0
  };

  const municipios = {};
  const registros = [];

  data.forEach(row => {
    const municipio = String(row[idx.municipio] || '').trim();
    if (!municipio) return;

    const ip = String(row[idx.ip] || '').trim();
    const afiliacion = String(row[idx.afiliacion] || '').trim();
    const dispositivo = String(row[idx.dispositivo] || '').trim().toUpperCase();
    const servidor = idx.servidor === -1 ? '' : String(row[idx.servidor] || '').trim();

    resumen.total++;

    if (resumen[dispositivo] !== undefined) {
      resumen[dispositivo]++;
    }

    if (fijas.indexOf(dispositivo) !== -1) {
      resumen.totalFijas++;
    }

    if (!municipios[municipio]) {
      municipios[municipio] = {
        municipio: municipio,
        PTZ: 0,
        F1: 0,
        F2: 0,
        F3: 0,
        F4: 0,
        F5: 0,
        totalFijas: 0,
        total: 0
      };
    }

    municipios[municipio].total++;

    if (municipios[municipio][dispositivo] !== undefined) {
      municipios[municipio][dispositivo]++;
    }

    if (fijas.indexOf(dispositivo) !== -1) {
      municipios[municipio].totalFijas++;
    }

    registros.push({
      municipio: municipio,
      ip: ip,
      afiliacion: afiliacion,
      dispositivo: dispositivo,
      servidor: servidor
    });
  });

  return {
    resumen: resumen,
    municipios: Object.values(municipios),
    registros: registros
  };
}

function getLprSheetData_() {
  const { data, headers } = getSheetRows_(LPR_SHEET_NAME);

  const idx = {
    ip: findHeader_(headers, ['Direccion IP', 'Dirección IP', 'IP']),
    afiliacionCliente: findHeader_(headers, ['Afiliacion Cliente', 'Afiliación Cliente']),
    serverId: findHeader_(headers, ['Server ID']),
    deviceId: findHeader_(headers, ['Device ID']),
    nombre: findHeader_(headers, ['Nombre']),
    afiliacionSgt: findHeader_(headers, ['Afiliacion SGT', 'Afiliación SGT']),
    subcentro: findHeader_(headers, ['Subcentro', 'Municipio']),
    lpr: findHeader_(headers, ['N de LPR', 'No de LPR', 'N° de LPR', 'Numero de LPR', 'Número de LPR', 'LPR']),
    tecnologia: findHeader_(headers, ['Tecnologia', 'Tecnología'])
  };

  if (idx.lpr === -1) {
    idx.lpr = findHeaderContaining_(headers, ['lpr']);
  }

  if (idx.ip === -1 || idx.subcentro === -1) {
    throw new Error('Revisa los encabezados de ' + LPR_SHEET_NAME + '. Deben existir: Direccion IP y Subcentro.');
  }

  return { data, idx };
}

function getLprType_(row, idx, nombre) {
  const value = idx.lpr === -1 ? '' : String(row[idx.lpr] || '').trim().toUpperCase();
  if (value) return value;

  const match = String(nombre || '').toUpperCase().match(/\bLP(?:R)?\s*0?(\d+)\b/);
  if (match) {
    return 'LP ' + ('0' + match[1]).slice(-2);
  }

  return '';
}

function getLprDashboardData() {
  const { data, idx } = getLprSheetData_();
  const resumen = {
    total: 0,
    tipos: {},
    tecnologias: {}
  };

  const subcentros = {};
  const tecnologias = {};
  const registros = [];

  data.forEach(row => {
    const ip = String(row[idx.ip] || '').trim();
    const nombre = idx.nombre === -1 ? '' : String(row[idx.nombre] || '').trim();
    const afiliacionCliente = idx.afiliacionCliente === -1 ? '' : String(row[idx.afiliacionCliente] || '').trim();
    const afiliacionSgt = idx.afiliacionSgt === -1 ? '' : String(row[idx.afiliacionSgt] || '').trim();

    if (!ip && !nombre && !afiliacionCliente && !afiliacionSgt) return;

    const subcentro = String(row[idx.subcentro] || 'Sin subcentro').trim() || 'Sin subcentro';
    const lpr = getLprType_(row, idx, nombre);
    const tecnologia = idx.tecnologia === -1 ? '' : String(row[idx.tecnologia] || '').trim();
    const serverId = idx.serverId === -1 ? '' : String(row[idx.serverId] || '').trim();
    const deviceId = idx.deviceId === -1 ? '' : String(row[idx.deviceId] || '').trim();

    if (!lpr) return;
    if (!tecnologia) return;

    resumen.total++;
    resumen.tipos[lpr] = (resumen.tipos[lpr] || 0) + 1;
    resumen.tecnologias[tecnologia] = (resumen.tecnologias[tecnologia] || 0) + 1;

    if (!tecnologias[tecnologia]) {
      tecnologias[tecnologia] = {
        tecnologia: tecnologia,
        total: 0,
        tipos: {}
      };
    }

    tecnologias[tecnologia].total++;
    tecnologias[tecnologia].tipos[lpr] = (tecnologias[tecnologia].tipos[lpr] || 0) + 1;

    const groupKey = tecnologia + '||' + subcentro;

    if (!subcentros[groupKey]) {
      subcentros[groupKey] = {
        tecnologia: tecnologia,
        subcentro: subcentro,
        total: 0,
        tipos: {}
      };
    }

    subcentros[groupKey].total++;
    subcentros[groupKey].tipos[lpr] = (subcentros[groupKey].tipos[lpr] || 0) + 1;

    registros.push({
      tecnologia: tecnologia,
      subcentro: subcentro,
      ip: ip,
      afiliacionCliente: afiliacionCliente,
      afiliacionSgt: afiliacionSgt,
      serverId: serverId,
      deviceId: deviceId,
      nombre: nombre,
      lpr: lpr
    });
  });

  const lprTipos = Object.keys(resumen.tipos).sort(function(a, b) {
    return a.localeCompare(b, 'es', { numeric: true });
  });

  const lprTecnologias = Object.keys(resumen.tecnologias).sort(function(a, b) {
    return a.localeCompare(b, 'es', { numeric: true });
  });

  return {
    resumen: resumen,
    lprTipos: lprTipos,
    lprTecnologias: lprTecnologias,
    tecnologias: Object.values(tecnologias),
    subcentros: Object.values(subcentros),
    registros: registros
  };
}

function getMapMarkers(limit) {
  const { data, idx } = getVvuSheetData_();
  const markers = [];
  const max = Number(limit) || 10000;

  if (idx.coordenadas === -1) {
    return markers;
  }

  for (let i = 0; i < data.length; i++) {
    if (markers.length >= max) break;

    const row = data[i];
    const municipio = String(row[idx.municipio] || '').trim();
    if (!municipio) continue;

    const coordenadas = String(row[idx.coordenadas] || '').trim();
    if (coordenadas.indexOf(',') === -1) continue;

    const parts = coordenadas.split(',');
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);

    if (!isNaN(lat) && !isNaN(lng)) {
      markers.push({
        lat: lat,
        lng: lng,
        municipio: municipio,
        afiliacion: String(row[idx.afiliacion] || '').trim(),
        ip: String(row[idx.ip] || '').trim(),
        dispositivo: String(row[idx.dispositivo] || '').trim().toUpperCase()
      });
    }
  }

  return markers;
}
