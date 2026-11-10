// ==== Isi nilai ini selepas setup Google Cloud + Google Sheet (lihat README.md) ====
export const CONFIG = {
  // OAuth 2.0 Client ID (Web application) dari Google Cloud Console
  GOOGLE_CLIENT_ID: '50199990202-ci36ffnhjq93ej4d842ii0jsmkldkank.apps.googleusercontent.com',

  // ID Google Sheet: bahagian antara /d/ dan /edit dalam URL sheet
  SHEET_ID: '111xT6cwyKGedTlPnajzcBBghlKkBPMKpaMSIHPQNh3w',

  // Nama tab (atau julat, cth 'Sheet1!A1:F201')
  SHEET_RANGE: 'Sheet1',

  // 'oauth'  -> data dibaca guna token akaun Google yang login (sheet kekal private,
  //             hanya akaun yang dikongsi boleh lihat, cth lisa@kasatria.com).
  // 'apikey' -> login Google untuk akses halaman sahaja; data dibaca guna API key
  //             (sheet mesti "Anyone with the link: Viewer").
  AUTH_MODE: 'oauth',

  // Hanya perlu jika AUTH_MODE = 'apikey'
  API_KEY: '',

  // Fallback data tempatan (data.csv) bila Client ID belum diisi — untuk pratonton sahaja.
  ALLOW_LOCAL_DEMO: true,
};
