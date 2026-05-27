const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');

const SHEET_NAMES = {
  'cliente': 'fila de errores dopll (nativo) - cliente',
  'driver': 'fila de errores dopll - driver',
  'sos': 'fila de errores dopll - SOS'
};

const APP_PREFIXES = {
  'cliente': 'App Cliente Android - ',
  'driver': 'App Driver Android - ',
  'sos': 'App SOS Android - '
};

exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if(event.httpMethod === 'OPTIONS'){
    return {statusCode:200, headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'}, body:''};
  }

  if(event.httpMethod !== 'POST'){
    return {statusCode:405, headers, body: JSON.stringify({error:'Method not allowed'})};
  }

  try {
    const body = JSON.parse(event.body);
    const { bug, app } = body;

    const serviceKey = JSON.parse(process.env.GOOGLE_SERVICE_KEY);
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const auth = new GoogleAuth({
      credentials: serviceKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const appKey = (app || 'cliente').toLowerCase();
    const sheetName = SHEET_NAMES[appKey] || SHEET_NAMES['cliente'];
    const prefix = APP_PREFIXES[appKey] || APP_PREFIXES['cliente'];

    // Get current rows to determine next row number
    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!A:A`
    });

    const rows = readRes.data.values || [];
    const nextNum = rows.length + 1;

    const fecha = new Date().toLocaleDateString('es-MX', {day:'2-digit', month:'2-digit', year:'numeric'});

    const row = [
      nextNum,                           // A: Numero de caso
      prefix + (bug.title || ''),        // B: Titulo
      bug.reporter || 'QA',             // C: Quien abrió
      '',                                // D: Vacía
      fecha,                             // E: Fecha
      '',                                // F: Vacía
      '',                                // G: Vacía
      '',                                // H: Vacía
      bug.status || 'Nuevo',            // I: Estatus
      bug.notes || '',                   // J: Notas
      bug.assignee || '',               // K: Dev asignado
      bug.type || 'Issue',              // L: Tipo
      bug.reportedBy || 'QA',          // M: Quien reporta
      bug.description || '',            // N: Descripción
      bug.evidenceLink || ''            // O: Link evidencia
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${sheetName}'!A:O`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [row] }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, row: nextNum })
    };

  } catch(e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message })
    };
  }
};
