import { createSign } from 'node:crypto';

type DriveCredentials = { client_email: string; private_key: string };

let cachedToken: { value: string; expiresAt: number } | null = null;
const folderCache = new Map<string, string>();

const credentials = (): DriveCredentials => {
  const raw = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Chưa cấu hình Google Drive. Hãy thêm GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON trên Render.');
  const parsed = JSON.parse(raw);
  if (!parsed.client_email || !parsed.private_key) throw new Error('Thông tin Google Drive service account không hợp lệ.');
  return parsed;
};

async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const account = credentials();
  const now = Math.floor(Date.now() / 1000);
  const enc = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = enc({ alg: 'RS256', typ: 'JWT' }) + '.' + enc({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  });
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  const assertion = unsigned + '.' + signer.sign(account.private_key, 'base64url');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const data = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !data.access_token) throw new Error(data.error_description || 'Không xác thực được Google Drive.');
  cachedToken = { value: data.access_token, expiresAt: Date.now() + 55 * 60 * 1000 };
  return data.access_token;
}


const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1YL_HvA_D_FGPn2dwqolkWhuQPwF918qX';
const FOLDER_NAMES: Record<string, string> = {
  dresses: '01 - VAY CUOI',
  suits: '02 - VEST',
  aoDai: '03 - AO DAI',
  accessories: '04 - PHU KIEN',
  tryOn: '05 - HINH KHACH THU VA CHON VAY',
};

async function driveRequest(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch('https://www.googleapis.com/drive/v3/' + path, {
    ...init,
    headers: { Authorization: 'Bearer ' + token, ...(init.headers || {}) },
  });
  const data = await response.json() as any;
  if (!response.ok) throw new Error(data.error?.message || 'Google Drive không phản hồi thành công.');
  return data;
}

async function ensureFolder(name: string, parentId: string, token: string) {
  const cacheKey = parentId + ':' + name;
  const cached = folderCache.get(cacheKey);
  if (cached) return cached;
  const query = "mimeType='application/vnd.google-apps.folder' and name='" + name.replace(/'/g, "\\'") + "' and '" + parentId + "' in parents and trashed=false";
  const found = await driveRequest('files?q=' + encodeURIComponent(query) + '&fields=files(id,name)&pageSize=10', token);
  if (found.files?.length) { const id = found.files[0].id as string; folderCache.set(cacheKey, id); return id; }
  const created = await driveRequest('files?fields=id,name', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
  });
  folderCache.set(cacheKey, created.id as string);
  return created.id as string;
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
  const metadata = { name: fileName.replace(/[^\w.-]/g, '_'), mimeType, parents: [folderId] };
  const boundary = 'hp_drive_' + Date.now();
  const body = Buffer.concat([
    Buffer.from('--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + '\r\n--' + boundary + '\r\nContent-Type: ' + mimeType + '\r\n\r\n'),
    bytes,
    Buffer.from('\r\n--' + boundary + '--'),
  ]);
  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'multipart/related; boundary=' + boundary },
    body,
  });
  const file = await response.json() as { id?: string; webViewLink?: string; error?: { message?: string } };
  if (!response.ok || !file.id) throw new Error(file.error?.message || 'Tải ảnh lên Google Drive thất bại.');
  // Product images need browser-readable links. Customer try-on photos stay private by default.
  if (folderKey !== 'tryOn') {
    await driveRequest('files/' + file.id + '/permissions', token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'anyone', role: 'reader' }),
    });
  }
  return { fileId: file.id, imageUrl: 'https://drive.google.com/uc?export=view&id=' + file.id, webViewLink: file.webViewLink || '', folderName };
}
