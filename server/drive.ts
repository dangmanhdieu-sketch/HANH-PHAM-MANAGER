import { createSign } from 'node:crypto';

type DriveCredentials = { client_email: string; private_key: string };

const credentials = (): DriveCredentials => {
  const raw = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Chưa cấu hình Google Drive. Hãy thêm GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON trên Render.');
  const parsed = JSON.parse(raw);
  if (!parsed.client_email || !parsed.private_key) throw new Error('Thông tin Google Drive service account không hợp lệ.');
  return parsed;
};

async function accessToken() {
  const account = credentials();
  const now = Math.floor(Date.now() / 1000);
  const enc = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = enc({ alg: 'RS256', typ: 'JWT' }) + '.' + enc({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/drive.file',
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
  return data.access_token;
}

export async function uploadInventoryImage(dataUrl: string, fileName: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!match) throw new Error('Ảnh phải là JPG, PNG hoặc WebP.');
  const mimeType = match[1];
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new Error('Ảnh sau nén phải nhỏ hơn 8 MB.');
  const token = await accessToken();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const metadata: Record<string, unknown> = { name: fileName.replace(/[^\w.-]/g, '_'), mimeType };
  if (folderId) metadata.parents = [folderId];
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
  const file = await response.json() as { id?: string; error?: { message?: string } };
  if (!response.ok || !file.id) throw new Error(file.error?.message || 'Tải ảnh lên Google Drive thất bại.');
  const permission = await fetch('https://www.googleapis.com/drive/v3/files/' + file.id + '/permissions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'anyone', role: 'reader' }),
  });
  if (!permission.ok) throw new Error('Ảnh đã tải lên nhưng không thể cấp quyền xem ảnh. Kiểm tra chính sách chia sẻ Google Drive.');
  return { fileId: file.id, imageUrl: 'https://drive.google.com/uc?export=view&id=' + file.id, webViewLink: file.webViewLink || '' };
}
