import { randomUUID } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore, type Query, type Transaction } from 'firebase-admin/firestore';
import type { InventoryCategory, InventoryEvent, InventoryItem, InventoryStatus } from '../src/types.ts';

const ROOT_COLLECTION = process.env.FIREBASE_COLLECTION || 'hanh_pham_manager';
const ROOT_DOCUMENT = process.env.FIREBASE_DOCUMENT || 'database';

class InventoryService {
  private firestore: Firestore | null = null;
  private localItems = new Map<string, InventoryItem>();
  private localEvents = new Map<string, InventoryEvent[]>();

  constructor() {
    try {
      if (getApps().length > 0) {
        this.firestore = getFirestore(getApps()[0]);
      } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        const projectId = process.env.FIREBASE_EXPECTED_PROJECT_ID || 'hanhpham-manager-new';
        if (credentials.project_id !== projectId) throw new Error('Firebase project mismatch.');
        this.firestore = getFirestore(initializeApp({ credential: cert(credentials), projectId }));
      }
    } catch (error) {
      console.error('[INVENTORY] Firestore initialization failed:', error);
    }
  }

  private items() {
    if (!this.firestore) throw new Error('Kho QR cần kết nối Firebase Firestore.');
    return this.firestore.collection(ROOT_COLLECTION).doc(ROOT_DOCUMENT).collection('inventoryItems');
  }

  private events() {
    if (!this.firestore) throw new Error('Kho QR cần kết nối Firebase Firestore.');
    return this.firestore.collection(ROOT_COLLECTION).doc(ROOT_DOCUMENT).collection('inventoryEvents');
  }

  private async assertActiveWriter(transaction: Transaction) {
    if (!this.firestore) throw new Error('Firestore chưa kết nối.');
    const lease = this.firestore.collection(ROOT_COLLECTION).doc(ROOT_DOCUMENT).collection('_runtime').doc('activeWriter');
    const snapshot = await transaction.get(lease);
    if (snapshot.data()?.owner == null) throw new Error('Không xác nhận được máy chủ đang có quyền ghi dữ liệu.');
  }

  async list(options: { limit?: number; cursor?: string; category?: string; status?: string; q?: string }) {
    const limit = Math.min(50, Math.max(1, Number(options.limit) || 25));
    const q = String(options.q || '').trim().toLocaleLowerCase('vi');
    if (!this.firestore) {
      let rows = [...this.localItems.values()];
      if (options.category) rows = rows.filter(x => x.category === options.category);
      if (options.status) rows = rows.filter(x => x.status === options.status);
      if (q) rows = rows.filter(x => x.qrCode.toLowerCase().includes(q) || x.name.toLocaleLowerCase('vi').includes(q));
      const offset = Math.max(0, Number(options.cursor) || 0);
      return { items: rows.slice(offset, offset + limit), nextCursor: offset + limit < rows.length ? String(offset + limit) : null };
    }
    if (q) {
      const exact = await this.items().doc(q.toUpperCase()).get();
      if (exact.exists) {
        const item = exact.data() as InventoryItem;
        if ((!options.category || item.category === options.category) && (!options.status || item.status === options.status)) return { items: [item], nextCursor: null };
      }
      const prefix = await this.items().orderBy('nameSearch').startAt(q).endAt(q + '\uf8ff').limit(limit).get();
      const rows = prefix.docs.map(doc => doc.data() as InventoryItem)
        .filter(item => (!options.category || item.category === options.category) && (!options.status || item.status === options.status));
      return { items: rows, nextCursor: null };
    }
    // Keep the primary query on the single-field updatedAt index. Category/status
    // filters are applied to the small page in memory to avoid requiring composite
    // indexes or scanning the complete 3,000-item collection.
    let query: Query = this.items().orderBy('updatedAt', 'desc').limit(limit + 1);
    if (options.cursor) {
      const cursor = await this.items().doc(options.cursor).get();
      if (cursor.exists) query = query.startAfter(cursor);
    }
    const snapshot = await query.get();
    const docs = snapshot.docs.slice(0, limit);
    const pageItems = docs.map(doc => doc.data() as InventoryItem)
      .filter(item => (!options.category || item.category === options.category) && (!options.status || item.status === options.status));
    return {
      items: pageItems,
      nextCursor: snapshot.docs.length > limit ? docs[docs.length - 1]?.id || null : null,
    };
  }

  async get(id: string) {
    if (!this.firestore) return this.localItems.get(id) || null;
    const snapshot = await this.items().doc(id).get();
    return snapshot.exists ? snapshot.data() as InventoryItem : null;
  }

  async create(input: Partial<InventoryItem>, actor: string) {
    const name = '';
    const category = String(input.category || '') as InventoryCategory;
    if (!['Váy cưới', 'Vest', 'Áo dài', 'Phụ kiện'].includes(category)) throw new Error('Danh mục sản phẩm không hợp lệ.');
    const id = randomUUID();
    const prefix = category === 'Váy cưới' ? 'VAY' : category === 'Vest' ? 'VEST' : category === 'Áo dài' ? 'AODAI' : 'PK';
    const now = new Date().toISOString();
    const item: InventoryItem = {
      id,
      qrCode: '',
      name: '',
      category,
      size: category === 'Vest' || category === 'Áo dài' ? String(input.size || '').trim() : '',
      color: '',
      collection: '',
      rentalPrice: 0,
      salePrice: 0,
      status: 'Có sẵn',
      location: String(input.location || 'Kho chính').trim(),
      locationNote: String(input.locationNote || '').trim(),
      imageUrl: String(input.imageUrl || '').trim(),
      notes: '',
      description: String(input.description || '').trim(),
      createdAt: now,
      updatedAt: now,
      createdBy: actor,
    };
    if (this.firestore) {
      const counterRef = this.firestore.collection(ROOT_COLLECTION).doc(ROOT_DOCUMENT).collection('_counters').doc('inventory_' + prefix);
      await this.firestore.runTransaction(async transaction => {
        await this.assertActiveWriter(transaction);
        const counterSnapshot = await transaction.get(counterRef);
        const sequence = Number(counterSnapshot.data()?.value || 0) + 1;
        item.name = prefix + '-' + String(sequence).padStart(4, '0');
        item.qrCode = 'HP-' + item.name;
        transaction.set(counterRef, { value: sequence, updatedAt: now }, { merge: true });
        transaction.create(this.items().doc(item.qrCode), { ...item, nameSearch: item.name.toLocaleLowerCase('vi') });
        const event: InventoryEvent = { id: randomUUID(), itemId: item.id, action: 'Nhập kho', note: 'Tạo hồ sơ sản phẩm', performedBy: actor, createdAt: now };
        transaction.create(this.events().doc(event.id), event);
      });
    } else {
      const sequence = [...this.localItems.values()].filter(x => x.name.startsWith(prefix + '-')).length + 1;
      item.name = prefix + '-' + String(sequence).padStart(4, '0');
      item.qrCode = 'HP-' + item.name;
      this.localItems.set(item.qrCode, item);
      this.localEvents.set(item.id, [{ id: randomUUID(), itemId: item.id, action: 'Nhập kho', note: 'Tạo hồ sơ sản phẩm', performedBy: actor, createdAt: now }]);
    }
    return item;
  }

  async update(qrCode: string, input: Partial<InventoryItem>, actor: string) {
    const current = await this.get(qrCode);
    if (!current) throw new Error('Không tìm thấy sản phẩm.');
    if (current.status === 'Thanh lý') throw new Error('Sản phẩm đã thanh lý, không thể chỉnh sửa.');
    const next: InventoryItem = {
      ...current,
      name: input.name === undefined ? current.name : String(input.name).trim(),
      category: input.category === undefined ? current.category : input.category,
      size: input.category === undefined ? current.size : (input.category === 'Vest' || input.category === 'Áo dài' ? String(input.size || '').trim() : ''),
      color: '',
      collection: '',
      rentalPrice: 0,
      salePrice: 0,
      status: input.status === undefined ? current.status : input.status as InventoryStatus,
      location: input.location === undefined ? (current.location || 'Kho chính') : String(input.location || '').trim(),
      locationNote: input.locationNote === undefined ? (current.locationNote || '') : String(input.locationNote || '').trim(),
      imageUrl: input.imageUrl === undefined ? current.imageUrl : String(input.imageUrl).trim(),
      notes: '',
      description: input.description === undefined ? current.description : String(input.description).trim(),
      updatedAt: new Date().toISOString(),
    };
    if (!next.name || !['Váy cưới', 'Vest', 'Áo dài', 'Phụ kiện'].includes(next.category)) throw new Error('Tên hoặc danh mục sản phẩm không hợp lệ.');
    if (!['Có sẵn', 'Đang đặt', 'Đang thuê', 'Đang giặt', 'Đang sửa', 'Hư hỏng', 'Thanh lý'].includes(next.status)) throw new Error('Tình trạng sản phẩm không hợp lệ.');
    if (this.firestore) {
      await this.firestore.runTransaction(async transaction => {
        await this.assertActiveWriter(transaction);
        transaction.set(this.items().doc(qrCode), { ...next, nameSearch: next.name.toLocaleLowerCase('vi') }, { merge: false });
        if (next.location !== (current.location || 'Kho chính') || next.locationNote !== (current.locationNote || '')) {
          const event: InventoryEvent = { id: randomUUID(), itemId: current.id, action: 'Kiểm kê', note: `Cập nhật vị trí: ${current.location || 'Kho chính'} → ${next.location || 'Kho chính'}${next.locationNote ? ' · ' + next.locationNote : ''}`, performedBy: actor, createdAt: next.updatedAt };
          transaction.create(this.events().doc(event.id), event);
        }
        if (next.status !== current.status) {
          const event: InventoryEvent = { id: randomUUID(), itemId: current.id, action: next.status === 'Đang thuê' ? 'Xuất thuê' : next.status === 'Có sẵn' ? 'Trả kho' : 'Cập nhật', note: `Đổi tình trạng: ${current.status} → ${next.status}`, performedBy: actor, createdAt: next.updatedAt };
          transaction.create(this.events().doc(event.id), event);
        }
      });
    } else this.localItems.set(qrCode, next);
    return next;
  }

  async delete(qrCode: string, actor: string) {
    const current = await this.get(qrCode);
    if (!current) throw new Error('Không tìm thấy sản phẩm.');
    if (this.firestore) {
      const itemRef = this.items().doc(qrCode);
      const eventQuery = this.events().where('itemId', '==', current.id);
      await this.firestore.runTransaction(async transaction => {
        await this.assertActiveWriter(transaction);
        const snapshot = await transaction.get(itemRef);
        if (!snapshot.exists) throw new Error('Sản phẩm đã được xóa hoặc không còn tồn tại.');
        const events = await transaction.get(eventQuery);
        transaction.delete(itemRef);
        events.docs.forEach(doc => transaction.delete(doc.ref));
      });
    } else {
      this.localItems.delete(qrCode);
      this.localEvents.delete(current.id);
    }
    console.log('[INVENTORY] Product deleted:', { qrCode, actor });
    return { success: true };
  }

  async history(id: string) {
    if (!this.firestore) return this.localEvents.get(id) || [];
    const snapshot = await this.events().where('itemId', '==', id).orderBy('createdAt', 'desc').limit(100).get();
    return snapshot.docs.map(doc => doc.data() as InventoryEvent);
  }
}

export const inventoryService = new InventoryService();
