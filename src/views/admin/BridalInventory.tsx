import React, { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../../api';
import type { InventoryCategory, InventoryEvent, InventoryItem, InventoryStatus } from '../../types';
import { Archive, Camera, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Package, Plus, QrCode, Search, Shirt, X } from 'lucide-react';

const CATEGORIES: InventoryCategory[] = ['Váy cưới', 'Vest', 'Áo dài', 'Phụ kiện'];
const STATUSES: InventoryStatus[] = ['Có sẵn', 'Đang đặt', 'Đang thuê', 'Đang giặt', 'Đang sửa', 'Hư hỏng', 'Thanh lý'];
const EMPTY_FORM: Partial<InventoryItem> = {
  name: '', category: 'Váy cưới', size: '', color: '', collection: '',
  rentalPrice: 0, salePrice: 0, imageUrl: '', notes: '',
};
const money = (value: number) => Number(value || 0).toLocaleString('vi-VN') + ' đ';

export const BridalInventory: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<Partial<InventoryItem>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [qrImage, setQrImage] = useState('');
  const [history, setHistory] = useState<InventoryEvent[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanInput, setScanInput] = useState('');

  const load = useCallback(async (cursor?: string | null) => {
    setLoading(true);
    setError('');
    try {
      const result = await api.inventory.list({
        limit: 25,
        cursor: cursor || undefined,
        category: category || undefined,
        status: status || undefined,
        q: query.trim() || undefined,
      });
      setItems(result.items);
      setNextCursor(result.nextCursor);
    } catch (e: any) {
      setError(e?.message || 'Không tải được kho sản phẩm.');
    } finally {
      setLoading(false);
    }
  }, [category, status, query]);

  useEffect(() => { void load(null); setCursorStack([]); }, [load]);

  useEffect(() => {
    let active = true;
    if (!selected) { setQrImage(''); setHistory([]); return; }
    QRCode.toDataURL(selected.qrCode, { width: 320, margin: 2, errorCorrectionLevel: 'M' })
      .then(url => { if (active) setQrImage(url); })
      .catch(() => { if (active) setQrImage(''); });
    api.inventory.history(selected.qrCode)
      .then(rows => { if (active) setHistory(rows); })
      .catch(() => { if (active) setHistory([]); });
    return () => { active = false; };
  }, [selected]);

  useEffect(() => {
    if (!scannerOpen) return;
    const scanner = new Html5Qrcode('bridal-inventory-qr-reader');
    let stopped = false;
    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 230, height: 230 } },
      async (decoded) => {
        if (stopped) return;
        stopped = true;
        try { await scanner.stop(); } catch {}
        setScannerOpen(false);
        const code = decoded.trim().toUpperCase();
        try {
          const item = await api.inventory.get(code);
          setSelected(item);
        } catch (e: any) {
          setError(e?.message || 'Không tìm thấy sản phẩm theo mã QR vừa quét.');
        }
      },
      () => {}
    ).catch((e: any) => {
      setError(e?.message || 'Không mở được camera. Hãy cấp quyền camera cho trình duyệt.');
      setScannerOpen(false);
    });
    return () => {
      stopped = true;
      void scanner.stop().catch(() => {});
      void scanner.clear().catch(() => {});
    };
  }, [scannerOpen]);

  const summary = useMemo(() => ({
    total: items.length,
    ready: items.filter(x => x.status === 'Có sẵn').length,
    rented: items.filter(x => x.status === 'Đang thuê').length,
    care: items.filter(x => ['Đang giặt', 'Đang sửa', 'Hư hỏng'].includes(x.status)).length,
  }), [items]);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setFormOpen(true); };
  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setForm({ ...item });
    setSelected(null);
    setFormOpen(true);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) await api.inventory.update(editing.qrCode, form);
      else await api.inventory.create(form);
      setFormOpen(false);
      await load(null);
      setCursorStack([]);
    } catch (e: any) {
      setError(e?.message || 'Không lưu được sản phẩm.');
    } finally { setSaving(false); }
  };

  const openScannedCode = async () => {
    const code = scanInput.trim().toUpperCase();
    if (!code) return;
    try { setSelected(await api.inventory.get(code)); setError(''); }
    catch (e: any) { setError(e?.message || 'Không tìm thấy mã QR.'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#a97d3e]">HẠNH PHẠM LUXURY BRIDAL</p>
          <h1 className="mt-1 text-2xl font-bold text-stone-900">Quản lý váy & phụ kiện</h1>
          <p className="mt-1 text-sm text-stone-500">Quản lý riêng váy cưới, vest, áo dài và phụ kiện bằng mã QR định danh.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-sm font-bold text-white shadow-sm"><Plus size={17}/> Thêm sản phẩm</button>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#E7DFD5] bg-white p-4"><p className="text-xs text-stone-500">Sản phẩm trang này</p><p className="mt-1 text-2xl font-bold">{summary.total}</p></div>
        <div className="rounded-2xl border border-[#E7DFD5] bg-white p-4"><p className="text-xs text-stone-500">Có sẵn</p><p className="mt-1 text-2xl font-bold text-emerald-700">{summary.ready}</p></div>
        <div className="rounded-2xl border border-[#E7DFD5] bg-white p-4"><p className="text-xs text-stone-500">Đang thuê</p><p className="mt-1 text-2xl font-bold text-amber-700">{summary.rented}</p></div>
        <div className="rounded-2xl border border-[#E7DFD5] bg-white p-4"><p className="text-xs text-stone-500">Đang giặt / sửa / lỗi</p><p className="mt-1 text-2xl font-bold text-rose-700">{summary.care}</p></div>
      </div>

      <div className="rounded-2xl border border-[#E7DFD5] bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm mã QR hoặc tên sản phẩm..." className="w-full rounded-xl border border-stone-200 py-3 pl-10 pr-3 text-sm"/></div>
          <select value={category} onChange={e => setCategory(e.target.value)} className="rounded-xl border border-stone-200 px-3 py-3 text-sm"><option value="">Tất cả danh mục</option>{CATEGORIES.map(x => <option key={x}>{x}</option>)}</select>
          <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-xl border border-stone-200 px-3 py-3 text-sm"><option value="">Tất cả tình trạng</option>{STATUSES.map(x => <option key={x}>{x}</option>)}</select>
          <button onClick={() => setScannerOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#c5a059] px-4 py-3 text-sm font-bold text-[#a97d3e]"><Camera size={17}/> Quét QR</button>
          <button onClick={() => { setScanInput(''); setScannerOpen(false); }} className="rounded-xl border border-stone-200 px-3 py-3 text-sm">Nhập mã</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#FAF8F5] text-xs uppercase text-stone-500"><tr><th className="p-3">Sản phẩm</th><th className="p-3">Mã định danh QR</th><th className="p-3">Danh mục</th><th className="p-3">Size / Màu</th><th className="p-3">Giá thuê</th><th className="p-3">Tình trạng</th></tr></thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? <tr><td colSpan={6} className="p-8 text-center text-stone-400">Đang tải kho...</td></tr> :
                items.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-stone-400">Chưa có sản phẩm. Hãy thêm sản phẩm đầu tiên.</td></tr> :
                items.map(item => <tr key={item.id} onClick={() => setSelected(item)} className="cursor-pointer hover:bg-[#FAF8F5]">
                  <td className="p-3"><div className="flex items-center gap-3">{item.imageUrl ? <img src={item.imageUrl} className="h-12 w-10 rounded-lg object-cover" alt={item.name}/> : <div className="flex h-12 w-10 items-center justify-center rounded-lg bg-stone-100"><Shirt size={18} className="text-stone-400"/></div>}<div><p className="font-semibold text-stone-900">{item.name}</p><p className="text-xs text-stone-400">{item.collection || 'Chưa phân bộ sưu tập'}</p></div></div></td>
                  <td className="p-3 font-mono text-xs text-[#a97d3e]">{item.qrCode}</td><td className="p-3">{item.category}</td><td className="p-3">{[item.size,item.color].filter(Boolean).join(' · ') || '—'}</td><td className="p-3">{money(item.rentalPrice)}</td>
                  <td className="p-3"><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold">{item.status}</span></td>
                </tr>)}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-stone-100 pt-3">
          <span className="text-xs text-stone-500">Tối đa 25 sản phẩm mỗi lần tải</span>
          <div className="flex gap-2"><button disabled={cursorStack.length===0 || loading} onClick={() => { const next=[...cursorStack]; const prev=next.pop() || ''; setCursorStack(next); void load(prev || null); }} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-30"><ChevronLeft size={16}/></button><button disabled={!nextCursor || loading} onClick={() => { setCursorStack(v=>[...v, nextCursor!]); void load(nextCursor); }} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-30"><ChevronRight size={16}/></button></div>
        </div>
      </div>

      {scanInput !== null && <div className="rounded-2xl border border-[#E7DFD5] bg-white p-3"><form onSubmit={e=>{e.preventDefault();void openScannedCode();}} className="flex gap-2"><input value={scanInput} onChange={e=>setScanInput(e.target.value)} placeholder="Nhập hoặc dán mã QR, ví dụ HP-VAY-..." className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm"/><button className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white">Tra cứu</button></form></div>}

      {formOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-3"><form onSubmit={save} className="max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">{editing ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm vào kho'}</h2><button type="button" onClick={()=>setFormOpen(false)}><X/></button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-stone-600 sm:col-span-2">Tên sản phẩm *<input required value={form.name || ''} onChange={e=>setForm({...form,name:e.target.value})} className="mt-1 w-full rounded-lg border p-3 text-sm"/></label>
          <label className="text-xs font-semibold text-stone-600">Danh mục<select value={form.category} onChange={e=>setForm({...form,category:e.target.value as InventoryCategory})} className="mt-1 w-full rounded-lg border p-3 text-sm">{CATEGORIES.map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="text-xs font-semibold text-stone-600">Size<input value={form.size || ''} onChange={e=>setForm({...form,size:e.target.value})} placeholder="S, M, L, 38..." className="mt-1 w-full rounded-lg border p-3 text-sm"/></label>
          <label className="text-xs font-semibold text-stone-600">Màu sắc<input value={form.color || ''} onChange={e=>setForm({...form,color:e.target.value})} className="mt-1 w-full rounded-lg border p-3 text-sm"/></label>
          <label className="text-xs font-semibold text-stone-600">Bộ sưu tập<input value={form.collection || ''} onChange={e=>setForm({...form,collection:e.target.value})} className="mt-1 w-full rounded-lg border p-3 text-sm"/></label>
          <label className="text-xs font-semibold text-stone-600">Giá thuê<input type="number" min="0" value={form.rentalPrice || 0} onChange={e=>setForm({...form,rentalPrice:Number(e.target.value)})} className="mt-1 w-full rounded-lg border p-3 text-sm"/></label>
          <label className="text-xs font-semibold text-stone-600">Giá bán<input type="number" min="0" value={form.salePrice || 0} onChange={e=>setForm({...form,salePrice:Number(e.target.value)})} className="mt-1 w-full rounded-lg border p-3 text-sm"/></label>
          <label className="text-xs font-semibold text-stone-600 sm:col-span-2">Đường dẫn ảnh<input type="url" value={form.imageUrl || ''} onChange={e=>setForm({...form,imageUrl:e.target.value})} placeholder="https://..." className="mt-1 w-full rounded-lg border p-3 text-sm"/></label>
          <label className="text-xs font-semibold text-stone-600 sm:col-span-2">Ghi chú<textarea value={form.notes || ''} onChange={e=>setForm({...form,notes:e.target.value})} className="mt-1 w-full rounded-lg border p-3 text-sm"/></label>
        </div>
        {editing && <label className="block text-xs font-semibold text-stone-600">Tình trạng<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as InventoryStatus})} className="mt-1 w-full rounded-lg border p-3 text-sm">{STATUSES.map(x=><option key={x}>{x}</option>)}</select></label>}
        <div className="flex justify-end gap-2"><button type="button" onClick={()=>setFormOpen(false)} className="rounded-lg border px-4 py-2 text-sm">Hủy</button><button disabled={saving} className="rounded-lg bg-stone-900 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{saving?'Đang lưu...':'Lưu sản phẩm'}</button></div>
      </form></div>}

      {selected && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-3" onClick={()=>setSelected(null)}><div onClick={e=>e.stopPropagation()} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[#a97d3e]">Hồ sơ sản phẩm</p><h2 className="text-xl font-bold">{selected.name}</h2></div><button onClick={()=>setSelected(null)}><X/></button></div>
        <div className="mt-4 grid gap-5 md:grid-cols-[1fr_220px]">
          <div className="space-y-3">{selected.imageUrl && <img src={selected.imageUrl} alt={selected.name} className="max-h-72 w-full rounded-xl object-contain bg-stone-50"/>}<div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-stone-400">Danh mục</p><b>{selected.category}</b></div><div><p className="text-xs text-stone-400">Tình trạng</p><b>{selected.status}</b></div><div><p className="text-xs text-stone-400">Size / màu</p><b>{selected.size || '—'} / {selected.color || '—'}</b></div><div><p className="text-xs text-stone-400">Giá thuê</p><b>{money(selected.rentalPrice)}</b></div><div><p className="text-xs text-stone-400">Giá bán</p><b>{money(selected.salePrice)}</b></div><div><p className="text-xs text-stone-400">Bộ sưu tập</p><b>{selected.collection || '—'}</b></div></div><p className="rounded-xl bg-stone-50 p-3 text-sm text-stone-600">{selected.notes || 'Không có ghi chú.'}</p></div>
          <div className="space-y-3 text-center"><div className="rounded-xl border p-3"><p className="font-mono text-xs font-bold">{selected.qrCode}</p>{qrImage && <img src={qrImage} alt="QR sản phẩm" className="mx-auto mt-2 w-44"/>}<button onClick={()=>window.print()} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm">In tem QR</button></div><button onClick={()=>openEdit(selected)} className="w-full rounded-lg bg-stone-900 px-4 py-3 text-sm font-bold text-white">Chỉnh sửa sản phẩm</button></div>
        </div>
        <div className="mt-5 border-t pt-4"><h3 className="mb-2 flex items-center gap-2 font-bold"><Clock3 size={16}/> Lịch sử thao tác</h3>{history.length===0?<p className="text-sm text-stone-400">Chưa có lịch sử khác.</p>:history.map(row=><div key={row.id} className="flex justify-between gap-3 border-b py-2 text-xs"><div><b>{row.action}</b><p className="text-stone-500">{row.note} · {row.performedBy}</p></div><time className="shrink-0 text-stone-400">{new Date(row.createdAt).toLocaleString('vi-VN')}</time></div>)}</div>
      </div></div>}

      {scannerOpen && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-3"><div className="w-full max-w-md rounded-2xl bg-white p-4"><div className="mb-3 flex items-center justify-between"><b>Quét mã QR sản phẩm</b><button onClick={()=>setScannerOpen(false)}><X/></button></div><div id="bridal-inventory-qr-reader" className="overflow-hidden rounded-xl"/><p className="mt-3 text-xs text-stone-500">Đưa mã QR vào khung hình. Nếu camera không hoạt động, bạn có thể nhập mã định danh ở ô tra cứu.</p></div></div>}
    </div>
  );
};
