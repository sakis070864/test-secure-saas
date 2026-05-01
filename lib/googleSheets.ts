import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

const SPREADSHEET_ID = '19NVFuzAgrO8XlLWkaYzyOtU_eSpESEOPQxR9T-iN7Pk';

export async function saveLeadToSheet(data: {
  email: string;
  url: string;
  grade: string;
  score: number;
}) {
  try {
    const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!credentialsJson) {
      console.error('GOOGLE_SERVICE_ACCOUNT_JSON not set');
      return;
    }

    let credentials;
    try {
      credentials = JSON.parse(credentialsJson);
    } catch {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON');
      return;
    }

    const auth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];

    // Load existing headers or create new ones
    let headers: string[] = [];
    try {
      await sheet.loadHeaderRow();
      headers = sheet.headerValues;
    } catch {
      // No headers yet — will create below
    }

    // If headers exist but missing "Source" column, add it
    if (headers.length > 0 && !headers.includes('Source')) {
      const newHeaders = [...headers, 'Source'];
      await sheet.setHeaderRow(newHeaders);
    } else if (headers.length === 0) {
      // Brand new sheet — set all headers
      await sheet.setHeaderRow(['Date', 'Email', 'Website', 'Grade', 'Score', 'Source']);
    }

    // Reload headers after potential update
    await sheet.loadHeaderRow();

    await sheet.addRow({
      Date: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }),
      Email: data.email,
      Website: data.url,
      Grade: data.grade,
      Score: `${data.score}%`,
      Source: 'DeepSearch',
    });

    console.log(`Lead saved to Google Sheet: ${data.email} — DeepSearch`);
  } catch (error) {
    console.error('Google Sheets Error:', error);
  }
}
