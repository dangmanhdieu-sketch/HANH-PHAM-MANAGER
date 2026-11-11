type TokenResponse = { access_token?: string; refresh_token?: string; expires_in?: number; error?: string; error_description?: string };
let cachedToken: { value: string; expiresAt: number } | null = null;
const folderCache = new Map<string, string>();
const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1YL_HvA_D_FGPn2dwqolkWhuQPwF918qX';
const FOLDER_NAMES: Record<string, string> = {
  dresses: '01 - VAY CUOI', suits: '02 - VEST', aoDai: '03 - AO DAI',
  accessories: '04 - PHU KIEN', tryOn: '05 - HINH KHACH THU VA CHON VAY',
};
function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Render chưa cấu hình biến môi trường ${name}.`);
  return value;
}
export function createGoogleDriveAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env('GOOGLE_CLIENT_ID'), redirect_uri: env('GOOGLE_REDIRECT_URI'),
    response_type: 'code', scope: 'https://www.googleapis.com/auth/drive',
    access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state,
  });
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
}
export async function exchangeGoogleDriveCode(code: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: env('GOOGLE_CLIENT_ID'), client_secret: env('GOOGLE_CLIENT_SECRET'),
      redirect_uri: env('GOOGLE_REDIRECT_URI'), grant_type: 'authorization_code',
    }),
  });
  const data = await response.json() as TokenResponse;
  if (!response.ok) throw new Error(data.error_description || data.error || 'Google OAuth exchange failed.');
  if (!data.refresh_token) throw new Error('Google không trả Refresh Token. Hãy cấp quyền lại với access_type=offline và prompt=consent.');
  return data.refresh_token;
}
async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) return cachedToken.value;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env('GOOGLE_CLIENT_ID'), client_secret: env('GOOGLE_CLIENT_SECRET'),
      refresh_token: env('GOOGLE_DRIVE_REFRESH_TOKEN'), grant_type: 'refresh_token',
    }),
  });
  const data = await response.json() as TokenResponse;
  if (!response.ok || !data.access_token) {
    cachedToken = null;
    throw new Error(data.error_description || data.error || 'Không lấy được access token Google Drive.');
  }
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (Math.max(300, data.expires_in || 3600) - 60) * 1000 };
  return data.access_token;
}
async function driveRequest(path: string, token: string, init: RequestInit = {}): Promise<any> {
  const response = await fetch('https://www.googleapis.com/drive/v3/' + path, {
    ...init, headers: { Authorization: 'Bearer ' + token, ...(init.headers || {}) },
  });
  const raw = await response.text();
  let data: any = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { /* retain empty response */ }
  if (!response.ok) throw new Error(data.error?.message || `Google Drive API HTTP ${response.status}`);
  return data;
}
async function ensureFolder(name: string, parentId: string, token: string): Promise<string> {
  const key = parentId + ':' + name;
  const cached = folderCache.get(key);
  if (cached) return cached;
  const escaped = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const q = `mimeType='application/vnd.google-apps.folder' and name='${escaped}' and '${parentId}' in parents and trashed=false`;
  const found = await driveRequest('files?q=' + encodeURIComponent(q) + '&fields=files(id,name)&pageSize=10', token);
  if (found.files?.length) {
    const id = String(found.files[0].id); folderCache.set(key, id); return id;
  }
  const created = await driveRequest('files?fields=id,name', token, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
  });
  if (!created.id) throw new Error('Không tạo được thư mục trên Google Drive: ' + name);
  folderCache.set(key, String(created.id)); return String(created.id);
}
export async function uploadInventoryImage(dataUrl: string, fileName: string, folderKey: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!match) throw new Error('Ảnh phải là JPG, PNG hoặc WebP.');
  const mimeType = match[1];
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new Error('Ảnh sau nén phải nhỏ hơn 8 MB.');
  const folderName = FOLDER_NAMES[folderKey];
  if (!folderName) throw new Error('Không xác định được thư mục lưu ảnh.');
  const token = await accessToken();
  const folderId = await ensureFolder(folderName, ROOT_FOLDER_ID, token);
  const metadata = { name: String(fileName || 'bridal-image.jpg').replace(/[^\w.-]/g, '_').slice(0,180), mimeType, parents: [folderId] };
  const boundary = 'hp_drive_' + Date.now();
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    bytes, Buffer.from(`\r\n--${boundary}--`),
  ]);
  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'multipart/related; boundary=' + boundary }, body,
  });
  const raw = await response.text();
  let file: any = {};
  try { file = raw ? JSON.parse(raw) : {}; } catch { /* ignore */ }
  if (!response.ok || !file.id) throw new Error(file.error?.message || `Tải ảnh lên Google Drive thất bại (HTTP ${response.status}).`);
  if (folderKey !== 'tryOn') {
    await driveRequest('files/' + encodeURIComponent(file.id) + '/permissions', token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'anyone', role: 'reader' }),
    });
  }
  return { fileId: String(file.id), imageUrl: 'https://drive.google.com/uc?export=view&id=' + encodeURIComponent(file.id), webViewLink: file.webViewLink || '', folderName };
}
