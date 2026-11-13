import { gzipSync } from 'node:zlib';
import { createCipheriv, randomBytes, scryptSync } from 'node:crypto';
import { dbService } from './db.ts';

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1YL_HvA_D_FGPn2dwqolkWhuQPwF918qX';
const BACKUP_FOLDER_NAME = '00 - SAO LUU DU LIEU';
const TIME_ZONE = process.env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh';
const DAILY_HOUR = 2;
const DAILY_MINUTE = 15;
const BACKUP_MAGIC = Buffer.from('HPB1');

function encryptBackup(compressed: Buffer): Buffer {
  const passphrase = requiredEnv('GOOGLE_DRIVE_BACKUP_ENCRYPTION_KEY');
  if (passphrase.length < 24) throw new Error('GOOGLE_DRIVE_BACKUP_ENCRYPTION_KEY phải có ít nhất 24 ký tự.');
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(passphrase, salt, 32);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([BACKUP_MAGIC, salt, iv, tag, ciphertext]);
}

type GoogleToken = { access_token?: string; expires_in?: number; error?: string; error_description?: string };
let cachedToken: { value: string; expiresAt: number } | null = null;
let timer: NodeJS.Timeout | null = null;
let running = false;
let lastAttemptKey = '';
let firstRunPending = true;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Thiếu biến môi trường ${name} trên Render.`);
  return value;
}

function localParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (key: string) => parts.find((part) => part.type === key)?.value || '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')), minute: Number(get('minute')) };
}

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: requiredEnv('GOOGLE_CLIENT_ID'),
      client_secret: requiredEnv('GOOGLE_CLIENT_SECRET'),
      refresh_token: requiredEnv('GOOGLE_DRIVE_REFRESH_TOKEN'),
      grant_type: 'refresh_token',
    }),
  });
  const data = await response.json() as GoogleToken;
  if (!response.ok || !data.access_token) {
    cachedToken = null;
    throw new Error(data.error_description || data.error || 'Không lấy được Google Drive access token.');
  }
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (Math.max(300, data.expires_in || 3600) - 60) * 1000 };
  return data.access_token;
}

async function driveRequest(url: string, token: string, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
  const raw = await response.text();
  let data: any = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { /* handled by status below */ }
  if (!response.ok) throw new Error(data.error?.message || `Google Drive API HTTP ${response.status}`);
  return data;
}

async function findOrCreateBackupFolder(token: string): Promise<string> {
  const escaped = BACKUP_FOLDER_NAME.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const q = `mimeType='application/vnd.google-apps.folder' and name='${escaped}' and '${ROOT_FOLDER_ID}' in parents and trashed=false`;
  const found = await driveRequest('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id,name)&pageSize=10', token);
  if (found.files?.length) return String(found.files[0].id);
  const created = await driveRequest('https://www.googleapis.com/drive/v3/files?fields=id,name', token, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: BACKUP_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder', parents: [ROOT_FOLDER_ID] }),
  });
  if (!created.id) throw new Error('Không tạo được thư mục sao lưu trên Google Drive.');
  return String(created.id);
}

async function alreadyUploaded(name: string, folderId: string, token: string): Promise<boolean> {
  const escaped = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const q = `name='${escaped}' and '${folderId}' in parents and trashed=false`;
  const found = await driveRequest('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id,name,size)&pageSize=5', token);
  return Array.isArray(found.files) && found.files.length > 0;
}

async function uploadPrivateBackup(name: string, folderId: string, compressed: Buffer, token: string) {
  const boundary = 'hp_backup_' + Date.now();
  const metadata = { name, mimeType: 'application/gzip', parents: [folderId], description: 'HẠNH PHẠM MANAGER daily Firestore backup. Private; contains confidential business and employee records.' };
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/gzip\r\n\r\n`),
    compressed,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const result = await driveRequest('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,createdTime', token, {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
    body,
  });
  if (!result.id) throw new Error('Google Drive không xác nhận đã tạo file sao lưu.');
  return result;
}

async function createBackup() {
  await dbService.waitUntilReady();
  const now = new Date();
  const date = localParts(now).date;
  const filename = `HANH_PHAM_MANAGER_${date}.json.gz.enc`;
  const token = await getToken();
  const folderId = await findOrCreateBackupFolder(token);
  if (await alreadyUploaded(filename, folderId, token)) {
    console.info('[Drive Backup] Bản sao lưu hôm nay đã tồn tại; bỏ qua để tránh tạo trùng:', filename);
    return;
  }

  const database = dbService.getRawData();
  const inventory: any[] = [];
  let cursor: string | undefined;
  do {
    const page = await dbService.listVayCuoiItems(50, cursor);
    inventory.push(...page.items);
    cursor = page.nextCursor || undefined;
  } while (cursor);

  const payload = {
    backupFormat: 'hanh-pham-manager-full-v1',
    createdAt: now.toISOString(),
    timeZone: TIME_ZONE,
    source: 'Firestore',
    database,
    bridalInventory: inventory,
    counts: {
      employees: database.NHANVIEN?.length || 0,
      attendance: database.CHAMCONG?.length || 0,
      payroll: database.LUONG?.length || 0,
      advances: database.TAM_UNG?.length || 0,
      commissions: database.HOAHONG?.length || 0,
      contractsAndOperations: database.QUAN_LY?.length || 0,
      inventory: inventory.length,
    },
  };
  const compressed = gzipSync(Buffer.from(JSON.stringify(payload), 'utf8'), { level: 6 });
  const encrypted = encryptBackup(compressed);
  const uploaded = await uploadPrivateBackup(filename, folderId, encrypted, token);
  console.info('[Drive Backup] Upload verified by Drive API:', {
    filename, fileId: uploaded.id, bytes: encrypted.length, counts: payload.counts,
  });
}

export function startDailyDriveBackup() {
  if (timer) clearInterval(timer);
  console.info('[Drive Backup] Daily backup scheduler enabled at 02:15', TIME_ZONE);
  const check = async () => {
    if (running) return;
    const local = localParts();
    const key = local.date;
    if (!firstRunPending && (local.hour < DAILY_HOUR || (local.hour === DAILY_HOUR && local.minute < DAILY_MINUTE))) return;
    if (lastAttemptKey === key) return;
    running = true;
    lastAttemptKey = key;
    try {
      await createBackup();
      firstRunPending = false;
    } catch (error: any) {
      // Permit retry on the next scheduler tick after transient API/network errors.
      lastAttemptKey = '';
      console.error('[Drive Backup] Daily backup failed; will retry:', error?.message || error);
    } finally {
      running = false;
    }
  };
  void check();
  timer = setInterval(() => { void check(); }, 60_000);
}

export function stopDailyDriveBackup() {
  if (timer) clearInterval(timer);
  timer = null;
}
