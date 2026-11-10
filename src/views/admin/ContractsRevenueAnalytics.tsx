import React, { useEffect, useMemo, useState } from 'react';
import { Wallet, ReceiptText, FileCheck2, RefreshCw } from 'lucide-react';
import { api } from '../../api';
import type { QuanLyRecord } from '../../types';

type Period = 'week' | 'month' | 'year';

const money = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(value || 0);

const localDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const startOfWeek = (date: Date) => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
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

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const reportData = await api.reports.getContractsRevenue();
      setContracts(reportData.contracts);
      setReceipts(reportData.receipts);
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
      const next = new Date(Number(year), Number(month), 1);
      return { start: `${year}-${month}-01`, end: localDate(next) };
    }
    const start = startOfWeek(new Date(weekDate + 'T00:00:00'));
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start: localDate(start), end: localDate(end) };
  }, [period, year, month, weekDate]);

  const summary = useMemo(() => {
    const contractsByCode = new Map<string, string[]>();
    const contractIds = new Set(contracts.map(record => String(record.QuanLyID)));
    for (const record of contracts) {
      const code = String(record.DuLieu?.MaHopDong || record.QuanLyID);
      const ids = contractsByCode.get(code) || [];
      ids.push(String(record.QuanLyID));
      contractsByCode.set(code, ids);
    }

    const collectedByContractId = new Map<string, number>();
    for (const receipt of receipts) {
      const data = receipt.DuLieu || {};
      if (String(data.Loai || '').toUpperCase() !== 'THU' || String(data.TrangThaiDuyet || '') !== 'Đã duyệt') continue;
      const matched = new Set<string>();
      const code = String(data.HopDongID || data.MaHopDong || '');
      if (code) for (const id of contractsByCode.get(code) || []) matched.add(id);
      const linkedId = String(data.HopDongQuanLyID || '');
      if (linkedId && contractIds.has(linkedId)) matched.add(linkedId);
      const amount = Math.max(0, Number(data.SoTien || 0));
      for (const id of matched) collectedByContractId.set(id, (collectedByContractId.get(id) || 0) + amount);
    }

    const periodContracts = contracts.filter(record => {
      const data = record.DuLieu || {};
      const signedDate = String(data.NgayKy || data.NgayTao || record.TaoLuc || '').slice(0, 10);
      const status = String(data.TrangThai || 'Nháp');
      return signedDate >= bounds.start && signedDate < bounds.end && !['Đã hủy', 'Hủy'].includes(status);
    });

    const totalSales = periodContracts.reduce((sum, record) =>
      sum + Math.max(0, Number(record.DuLieu?.TongGiaTri ?? record.DuLieu?.GiaGoiBanDau ?? 0) || 0), 0);
    const collected = periodContracts.reduce((sum, record) => {
      const value = Math.max(0, Number(record.DuLieu?.TongGiaTri ?? record.DuLieu?.GiaGoiBanDau ?? 0) || 0);
      return sum + Math.min(value, collectedByContractId.get(String(record.QuanLyID)) || 0);
    }, 0);

    return {
      signedCount: periodContracts.length,
      totalSales,
      collected,
      remaining: Math.max(0, totalSales - collected),
    };
  }, [contracts, receipts, bounds]);

  const cards = [
    { label: 'Doanh số hợp đồng', value: money(summary.totalSales), hint: 'Giá trị hợp đồng ký trong kỳ', icon: FileCheck2, color: 'gold' },
    { label: 'Đã thu', value: money(summary.collected), hint: 'Tiền thu đã duyệt', icon: Wallet, color: 'green' },
    { label: 'Còn phải thu', value: money(summary.remaining), hint: 'Công nợ hợp đồng trong kỳ', icon: ReceiptText, color: 'amber' },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-[#E7DFD5] bg-white shadow-sm">
      <div className="bg-gradient-to-r from-[#191714] to-[#373025] p-4 text-white sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D8BC83]">Báo cáo kinh doanh</p>
            <h2 className="mt-1 text-base font-bold sm:text-lg">Doanh số & thu chi hợp đồng</h2>
            <p className="mt-1 text-xs text-stone-300">Số liệu tổng hợp theo thời gian</p>
          </div>
          <button type="button" onClick={() => void load()} aria-label="Làm mới dữ liệu"
            className="shrink-0 rounded-xl border border-[#D8BC83]/40 p-2.5 text-[#E8D5A8] hover:bg-white/10">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-b border-[#EEE8DF] p-3 sm:gap-3 sm:p-4">
        {([['week', 'Tuần'], ['month', 'Tháng'], ['year', 'Năm']] as [Period, string][]).map(([value, label]) => (
          <button key={value} type="button" onClick={() => setPeriod(value)}
            className={`rounded-xl px-2 py-2.5 text-xs font-bold transition sm:px-4 ${period === value ? 'bg-stone-900 text-[#E8D5A8]' : 'border border-stone-200 bg-white text-stone-600'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 sm:flex sm:flex-wrap sm:items-end sm:p-4">
        {period !== 'week' && <label className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold text-stone-500">
          Năm
          <select value={year} onChange={e => setYear(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 sm:w-auto">
            {Array.from({ length: 7 }, (_, i) => now.getFullYear() - 3 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>}
        {period === 'month' && <label className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold text-stone-500">
          Tháng
          <select value={month} onChange={e => setMonth(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 sm:w-auto">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={String(m).padStart(2, '0')}>Tháng {m}</option>)}
          </select>
        </label>}
        {period === 'week' && <label className="col-span-2 flex min-w-0 flex-col gap-1 text-[11px] font-semibold text-stone-500">
          Chọn ngày trong tuần
          <input type="date" value={weekDate} onChange={e => setWeekDate(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800" />
        </label>}
        <div className="col-span-2 self-center text-xs text-stone-500 sm:col-span-1 sm:ml-auto">
          {loading ? 'Đang cập nhật số liệu…' : `${summary.signedCount} hợp đồng được ký trong kỳ`}
        </div>
      </div>

      {error && <div className="mx-3 mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 sm:mx-4">{error}</div>}

      <div className="grid grid-cols-1 gap-3 p-3 pt-0 sm:grid-cols-3 sm:p-4 sm:pt-0">
        {cards.map(({ label, value, hint, icon: Icon, color }) => (
          <div key={label} className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#EEE8DF] bg-[#FFFEFC] p-3 sm:block sm:p-4">
            <span className={`shrink-0 rounded-xl p-2.5 ${color === 'gold' ? 'bg-[#F8F2E6] text-[#A98743]' : color === 'green' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 sm:mt-3">
              <p className="text-xs font-semibold text-stone-500">{label}</p>
              <p className="mt-1 break-words text-lg font-bold leading-tight tracking-tight text-stone-900 sm:text-xl">{loading ? '—' : value}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-stone-400">{hint}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
