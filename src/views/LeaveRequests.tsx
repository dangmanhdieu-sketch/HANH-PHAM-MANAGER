import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Check, Clock3, FileText, RefreshCw, X, Trash2 } from 'lucide-react';
import { api } from '../api';
import type { NhanVien, QuanLyRecord } from '../types';

interface LeaveRequestsProps {
  currentUser: NhanVien;
  isAdmin: boolean;
  onRefresh: () => Promise<void>;
}

const today = () => new Date().toISOString().slice(0, 10);
const statusClass = (status: string) => status === 'Đã duyệt'
  ? 'bg-emerald-50 text-emerald-700'
  : status === 'Từ chối'
    ? 'bg-rose-50 text-rose-700'
    : 'bg-amber-50 text-amber-700';

export const LeaveRequests: React.FC<LeaveRequestsProps> = ({ currentUser, isAdmin, onRefresh }) => {
  const [records, setRecords] = useState<QuanLyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loaiNghi, setLoaiNghi] = useState('Nghỉ phép năm');
  const [tuNgay, setTuNgay] = useState(today());
  const [denNgay, setDenNgay] = useState(today());
  const [lyDo, setLyDo] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.quanLy.getAll('NGHI_PHEP');
      setRecords(data.sort((a, b) => String(b.DuLieu?.NgayGui || b.TaoLuc).localeCompare(String(a.DuLieu?.NgayGui || a.TaoLuc))));
    } catch (error: any) {
      alert(error?.message || 'Không tải được danh sách nghỉ phép.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!lyDo.trim()) { alert('Vui lòng nhập lý do xin nghỉ.'); return; }
    if (denNgay < tuNgay) { alert('Ngày kết thúc không được trước ngày bắt đầu.'); return; }
    setSaving(true);
    try {
      await api.quanLy.create('NGHI_PHEP', {
        LoaiNghi: loaiNghi,
        TuNgay: tuNgay,
        DenNgay: denNgay,
        LyDo: lyDo.trim(),
        GhiChu: ghiChu.trim(),
      });
      setLyDo('');
      setGhiChu('');
      setSaving(false);
      alert('Đã gửi đơn nghỉ phép thành công. Đơn đang chờ Admin xét duyệt.');
      // Tải lại lịch sử và KPI ở nền; không giữ nút gửi ở trạng thái chờ vì refresh.
      void load();
      void onRefresh().catch((refreshError) => console.error('Làm mới sau gửi đơn nghỉ phép thất bại:', refreshError));
    } catch (error: any) {
      alert(error?.message || 'Không gửi được đơn nghỉ phép.');
    } finally {
      setSaving(false);
    }
  };

  const removeLeaveRequest = async (record: QuanLyRecord) => {
    const employeeName = record.DuLieu?.HoTen || currentUser.HoTen;
    if (!window.confirm(`Xóa đơn nghỉ phép của ${employeeName} từ ${record.DuLieu?.TuNgay || ''} đến ${record.DuLieu?.DenNgay || ''}? Thao tác này không thể hoàn tác.`)) return;
    setSaving(true);
    try {
      await api.quanLy.delete(record.QuanLyID);
      await load();
      await onRefresh();
    } catch (error: any) {
      alert(error?.message || 'Không thể xóa đơn nghỉ phép.');
    } finally {
      setSaving(false);
    }
  };

  const review = async (record: QuanLyRecord, status: 'Đã duyệt' | 'Từ chối') => {
    setSaving(true);
    try {
      await api.quanLy.update(record.QuanLyID, {
        TrangThai: status,
        GhiChuAdmin: reviewNotes[record.QuanLyID] || '',
      });
      await load();
      await onRefresh();
    } catch (error: any) {
      alert(error?.message || 'Không cập nhật được đơn nghỉ phép.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a97d3e]">Nhân sự</p>
          <h1 className="text-2xl font-bold text-stone-900">{isAdmin ? 'Duyệt đơn nghỉ phép' : 'Xin nghỉ phép'}</h1>
          <p className="text-sm text-stone-500 mt-1">{isAdmin ? 'Xem lý do và quyết định duyệt hoặc từ chối từng đơn.' : 'Gửi đơn nghỉ theo ngày hoặc nhiều ngày và theo dõi kết quả duyệt.'}</p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700">
          <RefreshCw className="h-4 w-4" /> Làm mới
        </button>
      </div>

      {!isAdmin && (
        <form onSubmit={submit} className="rounded-2xl border border-[#E7DFD5] bg-white p-4 sm:p-6 space-y-4 shadow-sm">
          <h2 className="font-semibold text-stone-900 flex items-center gap-2"><FileText className="h-5 w-5 text-[#bf954f]" /> Tạo đơn xin nghỉ</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-sm text-stone-600">Loại nghỉ
              <select value={loaiNghi} onChange={e => setLoaiNghi(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-stone-900">
                <option>Nghỉ phép năm</option><option>Nghỉ việc riêng</option><option>Nghỉ ốm</option><option>Nghỉ không lương</option>
              </select>
            </label>
            <label className="text-sm text-stone-600">Từ ngày
              <input type="date" min={today()} value={tuNgay} onChange={e => { setTuNgay(e.target.value); if (denNgay < e.target.value) setDenNgay(e.target.value); }} className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-stone-900" required />
            </label>
            <label className="text-sm text-stone-600">Đến ngày
              <input type="date" min={tuNgay} value={denNgay} onChange={e => setDenNgay(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-stone-900" required />
            </label>
          </div>
          <label className="block text-sm text-stone-600">Lý do xin nghỉ
            <textarea value={lyDo} onChange={e => setLyDo(e.target.value)} rows={3} maxLength={1000} required placeholder="Nhập lý do cụ thể để Admin xem xét..." className="mt-1 w-full rounded-lg border border-stone-200 p-3 text-stone-900" />
          </label>
          <label className="block text-sm text-stone-600">Ghi chú thêm (không bắt buộc)
            <input value={ghiChu} onChange={e => setGhiChu(e.target.value)} maxLength={500} placeholder="Thông tin bổ sung..." className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-stone-900" />
          </label>
          <button disabled={saving} className="rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Đang gửi...' : 'Gửi đơn xin nghỉ'}</button>
        </form>
      )}

      <section className="rounded-2xl border border-[#E7DFD5] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-stone-100 px-4 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-stone-900">{isAdmin ? 'Danh sách đơn của nhân viên' : 'Lịch sử đơn của tôi'}</h2>
          <span className="text-xs text-stone-500">{records.length} đơn</span>
        </div>
        {loading ? <div className="p-8 text-center text-sm text-stone-500">Đang tải dữ liệu...</div> : records.length === 0 ? <div className="p-8 text-center text-sm text-stone-500">Chưa có đơn nghỉ phép.</div> : (
          <div className="divide-y divide-stone-100">
            {records.map(record => {
              const d = record.DuLieu || {};
              return (
                <article key={record.QuanLyID} className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-stone-900">{d.HoTen || currentUser.HoTen}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-stone-500">
                        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {d.TuNgay} đến {d.DenNgay}</span>
                        <span>{d.LoaiNghi || 'Nghỉ phép'}</span>
                      </div>
                    </div>
                    <span className={'rounded-full px-3 py-1 text-xs font-semibold ' + statusClass(d.TrangThai || 'Chờ duyệt')}>{d.TrangThai || 'Chờ duyệt'}</span>
                  </div>
                  <div className="rounded-xl bg-stone-50 p-3 text-sm text-stone-700"><span className="font-semibold">Lý do: </span>{d.LyDo}</div>
                  {d.GhiChu && <p className="text-sm text-stone-500">Ghi chú: {d.GhiChu}</p>}
                  {d.GhiChuAdmin && <p className="text-sm text-stone-600"><span className="font-semibold">Phản hồi Admin: </span>{d.GhiChuAdmin}</p>}
                  {d.NguoiXuLy && <p className="text-xs text-stone-400">Xử lý bởi {d.NguoiXuLy}</p>}
                  {isAdmin && d.TrangThai === 'Chờ duyệt' && (
                    <div className="space-y-2 border-t border-stone-100 pt-3">
                      <input value={reviewNotes[record.QuanLyID] || ''} onChange={e => setReviewNotes(prev => ({ ...prev, [record.QuanLyID]: e.target.value }))} placeholder="Ghi chú phản hồi cho nhân viên (không bắt buộc)" className="w-full rounded-lg border border-stone-200 p-2.5 text-sm" />
                      <div className="flex flex-wrap gap-2">
                        <button disabled={saving} onClick={() => void review(record, 'Đã duyệt')} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Check className="h-4 w-4" /> Duyệt đơn</button>
                        <button disabled={saving} onClick={() => void review(record, 'Từ chối')} className="inline-flex items-center gap-2 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><X className="h-4 w-4" /> Từ chối</button>
                      </div>
                    </div>
                  )}
                  <div className="text-[11px] text-stone-400 inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> Gửi lúc {d.NgayGui ? new Date(d.NgayGui).toLocaleString('vi-VN') : new Date(record.TaoLuc).toLocaleString('vi-VN')}</div>
                  {isAdmin && (
                    <div className="flex justify-end border-t border-stone-100 pt-2">
                      <button type="button" disabled={saving} onClick={() => void removeLeaveRequest(record)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                        <Trash2 className="h-3.5 w-3.5" /> Xóa đơn
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
