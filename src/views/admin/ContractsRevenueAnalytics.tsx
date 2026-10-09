import React, { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp, Wallet, ReceiptText, FileCheck2, CircleCheck,
  Clock3, Search, RefreshCw, AlertTriangle
} from 'lucide-react';
import { api } from '../../api';
import type { QuanLyRecord } from '../../types';

type Period = 'week' | 'month' | 'year';
type ContractRow = { record: QuanLyRecord; data: Record<string, any>; signedDate: string; value: number; collected: number; remaining: number; status: string };

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);
const dateText = (value: string) => {
  if (!value) return '—';
  const d = new Date(value.length === 10 ? value + 'T00:00:00' : value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
};
const localDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const startOfWeek = (date: Date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};

export const ContractsRevenueAnalytics: React.FC = () => {
  const now = new Date();
  const [period, setPeriod] = useState<Period>('month');
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [weekDate, setWeekDate] = useState(localDate(now));
  const [contracts, setContracts] = useState<QuanLyRecord[]>([]);
  const [receipts, setReceipts] = useState<QuanLyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [contractData, receiptData] = await Promise.all([
        api.quanLy.getAll('HOP_DONG'),
        api.quanLy.getAll('THU_CHI'),
      ]);
      setContracts(contractData);
      setReceipts(receiptData);
    } catch (e: any) {
      setError(e?.message || 'Không tải được dữ liệu hợp đồng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const bounds = useMemo(() => {
    if (period === 'year') return { start: `${year}-01-01`, end: `${Number(year) + 1}-01-01` };
    if (period === 'month') {
      const y = Number(year);
      const m = Number(month);
      const start = `${year}-${month}-01`;
      const next = new Date(y, m, 1);
      return { start, end: localDate(next) };
    }
    const selected = new Date(weekDate + 'T00:00:00');
    const start = startOfWeek(selected);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start: localDate(start), end: localDate(end) };
  }, [period, year, month, weekDate]);

  const rows = useMemo<ContractRow[]>(() => {
    const approvedReceipts = receipts.filter(r => {
      const d = r.DuLieu || {};
      return String(d.Loai || '').toUpperCase() === 'THU' && String(d.TrangThaiDuyet || '') === 'Đã duyệt';
    });
    return contracts.map(record => {
      const data = record.DuLieu || {};
      const signedDate = String(data.NgayKy || data.NgayTao || record.TaoLuc || '').slice(0, 10);
      const value = Math.max(0, Number(data.TongGiaTri ?? data.GiaGoiBanDau ?? 0) || 0);
      const code = String(data.MaHopDong || record.QuanLyID);
      // Hợp đồng cũ có thể lưu tiền cọc ở đợt thanh toán đầu thay vì TienDatCoc.
      const installments = Array.isArray(data.LichThanhToan) ? data.LichThanhToan : [];
      const explicitDeposit = Math.max(0, Number(data.TienDatCoc || 0));
      const legacyFirstInstallment = Math.max(0, Number(installments[0]?.SoTienDuKien || 0));
      const deposit = explicitDeposit > 0 ? explicitDeposit : legacyFirstInstallment;
      // Nhận diện phiếu thu theo cả mã hợp đồng và ID bản ghi để khớp dữ liệu cũ.
      const approvedReceiptTotal = approvedReceipts
        .filter(receipt =>
          String(receipt.DuLieu?.HopDongID || '') === code ||
          String(receipt.DuLieu?.HopDongQuanLyID || '') === String(record.QuanLyID)
        )
        .reduce((sum, receipt) => sum + Math.max(0, Number(receipt.DuLieu?.SoTien || 0)), 0);
      // Tiền cọc đã ghi nhận trên hợp đồng là tiền khách đã giao; không đợi duyệt phiếu
      // mới trừ công nợ. Nếu phiếu cọc đã duyệt, max() tránh cộng cọc hai lần.
      const collected = Math.min(value, Math.max(deposit, approvedReceiptTotal));
      return {
        record, data, signedDate, value, collected,
        remaining: Math.max(0, value - collected),
        status: String(data.TrangThai || 'Nháp'),
      };
    });
  }, [contracts, receipts]);

  const periodRows = useMemo(() => rows.filter(row =>
    row.signedDate >= bounds.start && row.signedDate < bounds.end &&
    !['Đã hủy', 'Hủy'].includes(row.status)
  ), [rows, bounds]);

  // Các chỉ số Tổng doanh số, Đã thu và Còn phải thu dùng cùng nhóm hợp đồng ký trong kỳ.
  // Tiền đã thu lũy kế của mỗi hợp đồng bao gồm tiền cọc (kể cả dữ liệu cũ) và phiếu thu đã duyệt,
  // không cộng trùng tiền cọc với phiếu thu cọc.
  const collectedInPeriod = periodRows.reduce((sum, row) => sum + row.collected, 0);

  const signedCount = periodRows.length;
  const completeCount = periodRows.filter(r => ['Hoàn thành', 'Đã hoàn tất', 'Hoàn tất'].includes(r.status)).length;
  const activeCount = periodRows.filter(r => !['Hoàn thành', 'Đã hoàn tất', 'Hoàn tất'].includes(r.status)).length;
  const totalSales = periodRows.reduce((sum, r) => sum + r.value, 0);
  const totalRemaining = Math.max(0, totalSales - collectedInPeriod);
  const completeRatio = signedCount ? Math.round(completeCount / signedCount * 100) : 0;

  const chartData = useMemo(() => {
    const slots: { label: string; start: string; end: string }[] = [];
    if (period === 'year') {
      for (let i = 1; i <= 12; i++) {
        const start = `${year}-${String(i).padStart(2, '0')}-01`;
        const end = localDate(new Date(Number(year), i, 1));
        slots.push({ label: `T${i}`, start, end });
      }
    } else if (period === 'month') {
      const days = new Date(Number(year), Number(month), 0).getDate();
      for (let day = 1; day <= days; day += 7) {
        const startDate = new Date(Number(year), Number(month) - 1, day);
        const endDate = new Date(Number(year), Number(month) - 1, Math.min(day + 7, days + 1));
        slots.push({ label: `Tuần ${Math.ceil(day / 7)}`, start: localDate(startDate), end: localDate(endDate) });
      }
    } else {
      const start = new Date(bounds.start + 'T00:00:00');
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const end = new Date(d);
        end.setDate(end.getDate() + 1);
        slots.push({ label: d.toLocaleDateString('vi-VN', { weekday: 'short' }), start: localDate(d), end: localDate(end) });
      }
    }
    return slots.map(slot => {
      const signed = rows.filter(r => r.signedDate >= slot.start && r.signedDate < slot.end && !['Đã hủy', 'Hủy'].includes(r.status));
      const paid = receipts.filter(r => {
        const d = r.DuLieu || {};
        const date = String(d.Ngay || r.TaoLuc || '').slice(0, 10);
        return String(d.Loai || '').toUpperCase() === 'THU' && String(d.TrangThaiDuyet || '') === 'Đã duyệt' && date >= slot.start && date < slot.end;
      }).reduce((sum, r) => sum + Number(r.DuLieu?.SoTien || 0), 0);
      return { ...slot, sales: signed.reduce((sum, r) => sum + r.value, 0), collected: paid };
    });
  }, [period, year, month, bounds, rows, receipts]);

  const filteredRows = periodRows.filter(row => {
    const q = search.trim().toLowerCase();
    return !q || [row.data.MaHopDong, row.data.KhachHang, row.data.GoiDichVu, row.status].some(v => String(v || '').toLowerCase().includes(q));
  });
  const maxChart = Math.max(1, ...chartData.flatMap(d => [d.sales, d.collected]));

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-[#E7DFD5] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#E7DFD5] bg-gradient-to-r from-[#191714] to-[#373025] p-5 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#D8BC83]"><TrendingUp className="h-5 w-5" /><span className="text-[11px] font-bold uppercase tracking-[0.18em]">Báo cáo tài chính</span></div>
            <h2 className="mt-1 text-lg font-bold sm:text-xl">Phân tích doanh thu hợp đồng</h2>
            <p className="mt-1 text-xs text-stone-300">Theo dõi doanh số, tiền thu và tiến độ thực hiện hợp đồng</p>
          </div>
          <button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8BC83]/40 px-3 py-2 text-xs font-bold text-[#E8D5A8] hover:bg-white/10"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới dữ liệu</button>
        </div>

        <div className="flex flex-col gap-3 border-b border-[#E7DFD5] p-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-wrap gap-2">
            {([['week', 'Theo tuần'], ['month', 'Theo tháng'], ['year', 'Theo năm']] as [Period, string][]).map(([value, label]) =>
              <button key={value} onClick={() => setPeriod(value)} className={`rounded-xl px-4 py-2 text-xs font-bold transition ${period === value ? 'bg-stone-900 text-[#E8D5A8] shadow-sm' : 'border border-stone-200 bg-white text-stone-600 hover:border-[#C5A059]'}`}>{label}</button>
            )}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {period !== 'week' ? <label className="flex flex-col gap-1 text-[11px] font-semibold text-stone-500">Năm
              <select value={year} onChange={e => setYear(e.target.value)} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-[#C5A059]">{Array.from({ length: 7 }, (_, i) => now.getFullYear() - 3 + i).map(y => <option key={y} value={y}>{y}</option>)}</select>
            </label> : null}
            {period === 'month' ? <label className="flex flex-col gap-1 text-[11px] font-semibold text-stone-500">Tháng
              <select value={month} onChange={e => setMonth(e.target.value)} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-[#C5A059]">{Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={String(m).padStart(2, '0')}>Tháng {m}</option>)}</select>
            </label> : null}
            {period === 'week' ? <label className="flex flex-col gap-1 text-[11px] font-semibold text-stone-500">Chọn ngày trong tuần
              <input type="date" value={weekDate} onChange={e => setWeekDate(e.target.value)} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-[#C5A059]" />
            </label> : null}
          </div>
        </div>

        {error && <div className="mx-4 mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Tổng doanh số', value: money(totalSales), sub: 'Giá trị HĐ ký trong kỳ', icon: FileCheck2, tone: 'gold' },
            { label: 'Đã thu trong kỳ', value: money(collectedInPeriod), sub: 'Tiền đã thu lũy kế của HĐ ký trong kỳ, gồm tiền cọc', icon: Wallet, tone: 'green' },
            { label: 'Còn phải thu', value: money(totalRemaining), sub: 'Công nợ của HĐ ký trong kỳ', icon: ReceiptText, tone: 'amber' },
          ].map((item) => {
            const Icon = item.icon;
            const tone = item.tone === 'gold' ? 'text-[#A98743] bg-[#F8F2E6]' : item.tone === 'green' ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50';
            return <div key={item.label} className="rounded-xl border border-[#E7DFD5] p-4 transition hover:shadow-sm">
              <div className="flex items-start justify-between gap-2"><span className="text-xs font-semibold text-stone-500">{item.label}</span><span className={`rounded-lg p-2 ${tone}`}><Icon className="h-4 w-4" /></span></div>
              <div className="mt-3 break-words text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">{loading ? 'Đang tải…' : item.value}</div>
              <div className="mt-2 text-[11px] text-stone-400">{item.sub}</div>
            </div>;
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-3">
          {[
            { label: 'Hợp đồng đã ký', value: signedCount, sub: 'Trong kỳ đang chọn', icon: FileCheck2, tone: 'gold' },
            { label: 'Đã hoàn tất', value: completeCount, sub: `${completeRatio}% số HĐ trong kỳ`, icon: CircleCheck, tone: 'green' },
            { label: 'Chưa hoàn tất', value: activeCount, sub: 'Cần tiếp tục theo dõi', icon: Clock3, tone: 'amber' },
          ].map(item => { const Icon = item.icon; return <div key={item.label} className="flex items-center gap-3 rounded-xl bg-[#FAF8F5] p-4"><span className={`rounded-xl p-3 ${item.tone === 'gold' ? 'bg-[#F3E7CB] text-[#987536]' : item.tone === 'green' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}><Icon className="h-5 w-5" /></span><div><div className="text-xs font-semibold text-stone-500">{item.label}</div><div className="text-2xl font-bold text-stone-900">{loading ? '—' : item.value}</div><div className="text-[11px] text-stone-400">{item.sub}</div></div></div>; })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="rounded-2xl border border-[#E7DFD5] bg-white p-5 shadow-sm xl:col-span-3">
          <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="font-bold text-stone-900">Xu hướng doanh số & tiền thu</h3><p className="mt-1 text-xs text-stone-500">{period === 'year' ? 'So sánh theo từng tháng' : period === 'month' ? 'So sánh theo từng tuần trong tháng' : 'So sánh theo từng ngày trong tuần'}</p></div><TrendingUp className="h-5 w-5 text-[#B18A4A]" /></div>
          <div className="flex flex-wrap gap-4 text-[11px] text-stone-500"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#B18A4A]" /> Giá trị HĐ ký</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Phiếu thu đã duyệt</span></div>
          <div className="mt-5 flex h-48 items-end gap-2 border-b border-stone-200 px-1 sm:gap-3">
            {chartData.map(item => <div key={item.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
              <div className="flex h-[calc(100%-22px)] w-full items-end justify-center gap-1">
                <div title={`Doanh số: ${money(item.sales)}`} className="w-1/2 max-w-7 rounded-t-md bg-[#B18A4A] transition-all" style={{ height: `${Math.max(item.sales ? 4 : 0, item.sales / maxChart * 100)}%` }} />
                <div title={`Đã thu: ${money(item.collected)}`} className="w-1/2 max-w-7 rounded-t-md bg-emerald-600 transition-all" style={{ height: `${Math.max(item.collected ? 4 : 0, item.collected / maxChart * 100)}%` }} />
              </div>
              <span className="w-full truncate text-center text-[10px] text-stone-400">{item.label}</span>
            </div>)}
          </div>
          <div className="mt-3 flex justify-between text-[10px] text-stone-400"><span>Doanh số tính theo ngày ký</span><span>Thu tiền tính theo ngày phiếu thu</span></div>
        </div>

        <div className="rounded-2xl border border-[#E7DFD5] bg-white p-5 shadow-sm xl:col-span-2">
          <h3 className="font-bold text-stone-900">Tiến độ hợp đồng</h3>
          <p className="mt-1 text-xs text-stone-500">Tỷ lệ hoàn tất trong kỳ đã chọn</p>
          <div className="mt-5 flex items-end justify-between"><div><span className="text-3xl font-bold text-stone-900">{completeRatio}%</span><p className="mt-1 text-xs text-stone-500">{completeCount} / {signedCount} hợp đồng</p></div><CircleCheck className="mb-1 h-8 w-8 text-emerald-600" /></div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${completeRatio}%` }} /></div>
          <div className="mt-5 space-y-3 text-xs"><div className="flex justify-between"><span className="flex items-center gap-2 text-stone-500"><i className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Đã hoàn tất</span><b>{completeCount}</b></div><div className="flex justify-between"><span className="flex items-center gap-2 text-stone-500"><i className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Chưa hoàn tất</span><b>{activeCount}</b></div></div>
          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> Theo dõi riêng các hợp đồng chưa hoàn tất và còn công nợ trước ngày cưới.</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#E7DFD5] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#E7DFD5] p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold text-stone-900">Chi tiết hợp đồng trong kỳ</h3><p className="mt-1 text-xs text-stone-500">{filteredRows.length} hợp đồng phù hợp bộ lọc</p></div><div className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2"><Search className="h-4 w-4 text-stone-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã HĐ, khách hàng..." className="min-w-0 flex-1 text-xs outline-none sm:w-52" /></div></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-[#FAF8F5] text-[10px] uppercase tracking-wider text-stone-500"><tr><th className="px-4 py-3">Hợp đồng / Khách hàng</th><th className="px-4 py-3">Ngày ký</th><th className="px-4 py-3">Gói dịch vụ</th><th className="px-4 py-3 text-right">Giá trị HĐ</th><th className="px-4 py-3 text-right">Đã thu lũy kế</th><th className="px-4 py-3 text-right">Còn phải thu</th><th className="px-4 py-3">Trạng thái</th></tr></thead>
            <tbody className="divide-y divide-[#EEE8DF]">
              {loading ? <tr><td colSpan={7} className="p-8 text-center text-stone-400">Đang tải dữ liệu hợp đồng…</td></tr> : filteredRows.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-stone-400">Không có hợp đồng trong kỳ đã chọn.</td></tr> : filteredRows.map(row => <tr key={row.record.QuanLyID} className="hover:bg-[#FCFAF6]"><td className="px-4 py-3"><div className="font-bold text-stone-900">{row.data.MaHopDong || row.record.QuanLyID}</div><div className="mt-1 text-stone-500">{row.data.KhachHang || 'Chưa có tên khách hàng'}</div></td><td className="px-4 py-3 text-stone-600">{dateText(row.signedDate)}</td><td className="px-4 py-3 text-stone-600">{row.data.GoiDichVu || row.data.TenGoi || '—'}</td><td className="px-4 py-3 text-right font-semibold">{money(row.value)}</td><td className="px-4 py-3 text-right font-semibold text-emerald-700">{money(row.collected)}</td><td className={`px-4 py-3 text-right font-semibold ${row.remaining > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{money(row.remaining)}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${['Hoàn thành', 'Đã hoàn tất', 'Hoàn tất'].includes(row.status) ? 'bg-emerald-100 text-emerald-800' : ['Đã hủy', 'Hủy'].includes(row.status) ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{row.status}</span></td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-1 border-t border-[#E7DFD5] bg-[#FAF8F5] px-4 py-3 text-[11px] text-stone-500 sm:flex-row sm:justify-between"><span>Tiền đã thu lũy kế: chỉ tính phiếu THU đã được Admin duyệt.</span><span>Doanh số theo kỳ dựa trên ngày ký hợp đồng.</span></div>
      </div>
    </section>
  );
};
