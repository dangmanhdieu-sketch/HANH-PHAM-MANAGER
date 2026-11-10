import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import type { VayCuoiItem, LoaiSanPhamKho, TrangThaiSanPhamKho } from '../../types';
import { Plus, Search, RefreshCw, QrCode, Printer, Edit2, ChevronLeft, ChevronRight, Package, Shirt, X, Save } from 'lucide-react';

const CATEGORIES: LoaiSanPhamKho[] = ['Váy cưới', 'Vest', 'Áo dài', 'Phụ kiện'];
const STATUSES: TrangThaiSanPhamKho[] = ['Có sẵn', 'Đã đặt', 'Đang thuê', 'Đang giặt', 'Đang sửa', 'Hư hỏng', 'Thanh lý'];
const EMPTY_FORM: Partial<VayCuoiItem> = {
  TenSanPham: '', LoaiSanPham: 'Váy cưới', BoSuuTap: '', Size: '', MauSac: '',
  GiaNhap: 0, GiaThue: 0, GiaBan: 0, AnhUrl: '', ViTri: '', TinhTrang: 'Tốt', GhiChu: '',
};
const money = (value?: number) => Number(value || 0).toLocaleString('vi-VN') + ' đ';
const qrImage = (code: string) => 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=' + encodeURIComponent(code);

export const BridalInventoryManagement: React.FC = () => {
  const [items, setItems] = useState<VayCuoiItem[]>([]);
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([undefined]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VayCuoiItem | null>(null);
  const [form, setForm] = useState<Partial<VayCuoiItem>>(EMPTY_FORM);
  const [selected, setSelected] = useState<VayCuoiItem | null>(null);
  const [qrInput, setQrInput] = useState('');

  const loadPage = useCallback(async (cursor?: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await api.bridalInventory.getPage({ limit: 30, cursor });
      setItems(result.items || []);
      setNextCursor(result.nextCursor);
    } catch (err: any) {
      setError(err.message || 'Không thể tải kho sản phẩm.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPage(); }, [loadPage]);

  const visibleItems = useMemo(() => items.filter((item) => {
    const q = search.trim().toLocaleLowerCase('vi');
    const matchesSearch = !q || [item.MaQR, item.TenSanPham, item.BoSuuTap, item.Size].some((value) => String(value || '').toLocaleLowerCase('vi').includes(q));
    return matchesSearch && (category === 'ALL' || item.LoaiSanPham === category) && (status === 'ALL' || item.TrangThai === status);
  }), [items, search, category, status]);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setFormOpen(true); };
  const openEdit = (item: VayCuoiItem) => { setEditing(item); setForm({ ...item }); setFormOpen(true); };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        const updated = await api.bridalInventory.update(editing.VayCuoiID, form);
        setItems((current) => current.map((item) => item.VayCuoiID === updated.VayCuoiID ? updated : item));
        if (selected?.VayCuoiID === updated.VayCuoiID) setSelected(updated);
      } else {
        const created = await api.bridalInventory.create(form);
        setItems((current) => [created, ...current].slice(0, 30));
      }
      setFormOpen(false);
    } catch (err: any) {
      setError(err.message || 'Không thể lưu sản phẩm.');
    } finally {
      setSaving(false);
    }
  };

  const lookupQr = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!qrInput.trim()) return;
    setLoading(true);
    setError('');
    try {
      const found = await api.bridalInventory.getByQr(qrInput.trim());
      setSelected(found);
    } catch (err: any) {
      setError(err.message || 'Không tìm thấy mã QR.');
      setSelected(null);
    } finally {
      setLoading(false);
    }
  };

  const printQr = (item: VayCuoiItem) => {
    const win = window.open('', '_blank', 'width=520,height=640');
    if (!win) { setError('Trình duyệt đang chặn cửa sổ in. Hãy cho phép cửa sổ bật lên rồi thử lại.'); return; }
    const image = qrImage(item.MaQR);
    const safeName = item.TenSanPham.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char] || char));
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>QR ${item.MaQR}</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:30px;color:#211e1b}.label{width:320px;margin:0 auto;border:1px solid #ddd;padding:22px;border-radius:12px}img{width:210px;height:210px}.code{font-size:22px;font-weight:700;letter-spacing:2px;margin:12px 0}.name{font-size:16px}</style></head><body><div class="label"><div style="font-weight:bold;letter-spacing:3px">HẠNH PHẠM LUXURY BRIDAL</div><img src="${image}" alt="QR"><div class="code">${item.MaQR}</div><div class="name">${safeName}</div><div>${item.LoaiSanPham} · ${item.Size || 'Không chọn size'}</div></div><script>window.onload=()=>setTimeout(()=>window.print(),500)</script></body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#a97d3e]">HẠNH PHẠM LUXURY BRIDAL</p>
          <h1 className="mt-1 text-xl font-bold text-stone-900 sm:text-2xl">Quản lý kho sản phẩm & QR</h1>
          <p className="mt-1 text-xs text-stone-500">Váy cưới · Vest · Áo dài · Phụ kiện</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-sm font-bold text-white shadow-sm"><Plus className="h-4 w-4"/> Thêm sản phẩm</button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CATEGORIES.map((name) => <div key={name} className="rounded-xl border border-[#E7DFD5] bg-white p-3"><p className="text-[11px] text-stone-500">{name}</p><p className="mt-1 text-xl font-bold text-stone-900">{items.filter((item) => item.LoaiSanPham === name).length}<span className="ml-1 text-xs font-normal text-stone-400">trên trang</span></p></div>)}
      </div>

      <form onSubmit={lookupQr} className="flex gap-2 rounded-2xl border border-[#E7DFD5] bg-white p-3 shadow-sm">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-stone-200 px-3">
          <QrCode className="h-5 w-5 shrink-0 text-[#a97d3e]"/>
          <input value={qrInput} onChange={(e) => setQrInput(e.target.value)} placeholder="Quét QR bằng camera điện thoại hoặc nhập mã HP-..." className="min-w-0 flex-1 py-3 text-sm outline-none"/>
        </div>
        <button type="submit" className="rounded-xl bg-[#a97d3e] px-4 text-sm font-bold text-white"><Search className="h-4 w-4"/></button>
      </form>

      {selected && <section className="rounded-2xl border border-[#c5a059] bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-bold tracking-wider text-[#a97d3e]">HỒ SƠ QR ĐÃ TRA CỨU</p><h2 className="mt-1 font-bold text-stone-900">{selected.TenSanPham}</h2><p className="text-xs text-stone-500">{selected.MaQR} · {selected.LoaiSanPham}</p></div>
          <button type="button" onClick={() => setSelected(null)} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"><X className="h-4 w-4"/></button>
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          {selected.AnhUrl && <img src={selected.AnhUrl} alt={selected.TenSanPham} className="h-28 w-24 rounded-lg object-cover"/>}
          <div className="flex-1 space-y-1 text-sm"><p>Tình trạng: <b>{selected.TrangThai}</b></p><p>Size: {selected.Size || '—'} · Màu: {selected.MauSac || '—'}</p><p>Vị trí: {selected.ViTri || '—'}</p><p>Giá thuê: <b>{money(selected.GiaThue)}</b></p></div>
          <img src={qrImage(selected.MaQR)} alt="QR code" className="h-28 w-28 rounded-lg border border-stone-100 p-1"/>
        </div>
        <div className="mt-3 flex gap-2"><button type="button" onClick={() => openEdit(selected)} className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold">Sửa hồ sơ</button><button type="button" onClick={() => printQr(selected)} className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white"><Printer className="h-3.5 w-3.5"/> In tem QR</button></div>
      </section>}

      <section className="overflow-hidden rounded-2xl border border-[#E7DFD5] bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-2 border-b border-[#E7DFD5] p-3 sm:grid-cols-3">
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-stone-400"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên, mã QR, bộ sưu tập..." className="w-full rounded-lg border border-stone-200 py-2.5 pl-9 pr-3 text-sm"/></div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-stone-200 px-3 py-2.5 text-sm"><option value="ALL">Tất cả loại sản phẩm</option>{CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-stone-200 px-3 py-2.5 text-sm"><option value="ALL">Tất cả tình trạng</option>{STATUSES.map((value) => <option key={value}>{value}</option>)}</select>
        </div>
        {error && <div className="m-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
        {loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-stone-500"><RefreshCw className="h-4 w-4 animate-spin"/> Đang tải kho sản phẩm...</div> : visibleItems.length === 0 ? <div className="p-12 text-center text-sm text-stone-400"><Package className="mx-auto mb-2 h-8 w-8"/>Chưa có sản phẩm phù hợp trên trang này.</div> : (
          <div className="divide-y divide-stone-100">
            {visibleItems.map((item) => <article key={item.VayCuoiID} className="flex items-center gap-3 p-3 sm:p-4">
              {item.AnhUrl ? <img src={item.AnhUrl} alt={item.TenSanPham} loading="lazy" className="h-20 w-16 rounded-lg bg-stone-100 object-cover"/> : <div className="flex h-20 w-16 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#a97d3e]"><Shirt className="h-7 w-7"/></div>}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-stone-900">{item.TenSanPham}</p>
                <p className="mt-0.5 text-[11px] text-stone-500">{item.MaQR} · {item.LoaiSanPham} · {item.Size || 'Không size'}</p>
                <p className="mt-1 text-xs font-semibold text-stone-700">{money(item.GiaThue)} <span className="font-normal text-stone-400">/ giá thuê</span></p>
                <span className={'mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ' + (item.TrangThai === 'Có sẵn' ? 'bg-emerald-50 text-emerald-700' : item.TrangThai === 'Đang thuê' ? 'bg-amber-50 text-amber-700' : 'bg-stone-100 text-stone-600')}>{item.TrangThai}</span>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button type="button" onClick={() => setSelected(item)} className="rounded-lg border border-stone-200 p-2 text-stone-600" title="Xem QR"><QrCode className="h-4 w-4"/></button>
                <button type="button" onClick={() => openEdit(item)} className="rounded-lg border border-stone-200 p-2 text-stone-600" title="Chỉnh sửa"><Edit2 className="h-4 w-4"/></button>
              </div>
            </article>)}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-[#E7DFD5] p-3">
          <button type="button" disabled={cursorStack.length <= 1 || loading} onClick={() => { const next = cursorStack.slice(0, -1); setCursorStack(next); void loadPage(next[next.length - 1]); }} className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold disabled:opacity-40"><ChevronLeft className="h-4 w-4"/> Trang trước</button>
          <span className="text-[11px] text-stone-500">Mỗi trang tối đa 30 sản phẩm</span>
          <button type="button" disabled={!nextCursor || loading} onClick={() => { setCursorStack((prev) => [...prev, nextCursor || undefined]); void loadPage(nextCursor || undefined); }} className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold disabled:opacity-40">Trang sau <ChevronRight className="h-4 w-4"/></button>
        </div>
      </section>

      {formOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3">
        <form onSubmit={submitForm} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-100 bg-white p-4"><div><h2 className="font-bold text-stone-900">{editing ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}</h2><p className="text-[11px] text-stone-500">Mã QR được hệ thống tự sinh và không thay đổi</p></div><button type="button" onClick={() => setFormOpen(false)} className="rounded-lg p-2 hover:bg-stone-100"><X className="h-4 w-4"/></button></div>
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-stone-600 sm:col-span-2">Tên sản phẩm *<input required maxLength={160} value={form.TenSanPham || ''} onChange={(e) => setForm({ ...form, TenSanPham: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal"/></label>
            <label className="text-xs font-semibold text-stone-600">Loại sản phẩm<select value={form.LoaiSanPham || 'Váy cưới'} onChange={(e) => setForm({ ...form, LoaiSanPham: e.target.value as LoaiSanPhamKho })} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal">{CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label>
            {editing && <label className="text-xs font-semibold text-stone-600">Tình trạng<select value={form.TrangThai || 'Có sẵn'} onChange={(e) => setForm({ ...form, TrangThai: e.target.value as TrangThaiSanPhamKho })} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal">{STATUSES.map((value) => <option key={value}>{value}</option>)}</select></label>}
            <label className="text-xs font-semibold text-stone-600">Bộ sưu tập<input value={form.BoSuuTap || ''} onChange={(e) => setForm({ ...form, BoSuuTap: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal"/></label>
            <label className="text-xs font-semibold text-stone-600">Size<input value={form.Size || ''} onChange={(e) => setForm({ ...form, Size: e.target.value })} placeholder="XS, S, M, L..." className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal"/></label>
            <label className="text-xs font-semibold text-stone-600">Màu sắc<input value={form.MauSac || ''} onChange={(e) => setForm({ ...form, MauSac: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal"/></label>
            <label className="text-xs font-semibold text-stone-600">Vị trí lưu kho<input value={form.ViTri || ''} onChange={(e) => setForm({ ...form, ViTri: e.target.value })} placeholder="Kệ A · Tầng 2..." className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal"/></label>
            <label className="text-xs font-semibold text-stone-600">Giá nhập<input type="number" min="0" value={form.GiaNhap || 0} onChange={(e) => setForm({ ...form, GiaNhap: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal"/></label>
            <label className="text-xs font-semibold text-stone-600">Giá thuê<input type="number" min="0" value={form.GiaThue || 0} onChange={(e) => setForm({ ...form, GiaThue: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal"/></label>
            <label className="text-xs font-semibold text-stone-600">Giá bán<input type="number" min="0" value={form.GiaBan || 0} onChange={(e) => setForm({ ...form, GiaBan: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal"/></label>
            <label className="text-xs font-semibold text-stone-600 sm:col-span-2">Đường dẫn ảnh sản phẩm<input type="url" value={form.AnhUrl || ''} onChange={(e) => setForm({ ...form, AnhUrl: e.target.value })} placeholder="https://..." className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal"/></label>
            <label className="text-xs font-semibold text-stone-600">Tình trạng chất lượng<input value={form.TinhTrang || ''} onChange={(e) => setForm({ ...form, TinhTrang: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal"/></label>
            <label className="text-xs font-semibold text-stone-600 sm:col-span-2">Ghi chú<textarea value={form.GhiChu || ''} onChange={(e) => setForm({ ...form, GhiChu: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal"/></label>
            {editing && <div className="sm:col-span-2 rounded-xl bg-[#FAF8F5] p-3 text-xs text-stone-600">Mã QR cố định: <b>{editing.MaQR}</b></div>}
          </div>
          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-stone-100 bg-white p-4"><button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-semibold">Hủy</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4"/>{saving ? 'Đang lưu...' : 'Lưu sản phẩm'}</button></div>
        </form>
      </div>}
    </div>
  );
};
