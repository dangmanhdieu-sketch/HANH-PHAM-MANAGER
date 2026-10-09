import React, { useEffect, useMemo, useState } from 'react';
import { formatNumber } from '../../utils/format';
import { BarChart3, TrendingUp, FileText, CheckSquare, CalendarClock } from 'lucide-react';
import type { HoaHong, Luong, NhanVien, QuanLyRecord } from '../../types';
import { api } from '../../api';

interface Props {
  staffList: NhanVien[];
  payrollList: Luong[];
  commissionList: HoaHong[];
}

interface Card {
  label: string;
  value: number;
  money?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

export const BusinessStats: React.FC<Props> = ({
  staffList,
  payrollList,
  commissionList,
}) => {
  const [records, setRecords] = useState<QuanLyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    api.quanLy
      .getAll()
      .then((data) => {
        if (active) setRecords(data);
      })
      .catch((error: any) => {
        console.error('Không thể tải thống kê nghiệp vụ:', error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const count = (module: string) =>
      records.filter((record) => record.Module === module).length;

    const approvedCommission = commissionList
      .filter((item) => item.TrangThai === 'Đã duyệt')
      .reduce((sum, item) => sum + Number(item.SoTienHoaHong || 0), 0);

    const pendingPayroll = payrollList
      .filter((item) => item.TrangThai === 'Chờ duyệt')
      .reduce((sum, item) => sum + Number(item.ThucLanh || 0), 0);

    return {
      staff: staffList.filter((item) => item.TrangThai === 'Đang Làm').length,
      tasks: count('CONG_VIEC'),
      contracts: count('HOP_DONG'),
      approvedCommission,
      pendingPayroll,
    };
  }, [records, staffList, payrollList, commissionList]);

  const upcomingTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(end.getDate() + 10);
    return records
      .filter((record) => {
        if (record.Module !== 'CONG_VIEC') return false;
        const data = record.DuLieu || {};
        const status = String(data.TrangThai || '').trim().toLowerCase();
        if (['hoàn thành', 'hoan thanh', 'đã hoàn thành', 'da hoan thanh', 'completed', 'xong'].includes(status)) return false;
        const dueValue = String(data.Han || '').trim();
        if (!dueValue) return false;
        const due = new Date(`${dueValue.slice(0, 10)}T00:00:00`);
        return !Number.isNaN(due.getTime()) && due >= today && due <= end;
      })
      .sort((a, b) => String(a.DuLieu.Han).localeCompare(String(b.DuLieu.Han)));
  }, [records]);

  const cards: Card[] = [
    { label: 'Nhân viên đang làm', value: stats.staff, icon: TrendingUp },
    { label: 'Công việc', value: stats.tasks, icon: CheckSquare },
    { label: 'Hợp đồng', value: stats.contracts, icon: FileText },
    { label: 'Hoa hồng đã duyệt', value: stats.approvedCommission, money: true, icon: TrendingUp },
    { label: 'Lương chờ duyệt', value: stats.pendingPayroll, money: true, icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-[#E7DFD5]">
        <h2 className="text-base font-bold flex gap-2 items-center">
          <BarChart3 className="w-5 h-5 text-[#bf954f]" />
          Thống kê tổng hợp
        </h2>
        <p className="text-xs text-stone-500 mt-1">
          Nhân sự, công việc, hợp đồng và dòng tiền trên cùng một bảng.
        </p>
      </div>

      {loading ? (
        <div className="bg-white p-10 rounded-2xl border border-[#E7DFD5] text-center text-sm text-stone-400">
          Đang tải thống kê...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="bg-white p-4 rounded-2xl border border-[#E7DFD5]"
                >
                  <Icon className="w-5 h-5 text-[#bf954f]" />
                  <p className="text-[11px] text-stone-500 mt-3">{card.label}</p>
                  <p className="text-xl font-bold mt-1">
                    {card.money
                      ?formatMoney( card.value)
                      : formatNumber(card.value)}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-[#E7DFD5] overflow-hidden">
            <div className="p-5 border-b border-[#E7DFD5] bg-[#FAF8F5] flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-[#bf954f]" />
              <div>
                <h2 className="font-bold">Công việc trong 10 ngày tới</h2>
                <p className="text-xs text-stone-500 mt-1">Từ hôm nay đến hết ngày thứ 10, không bao gồm công việc đã hoàn thành.</p>
              </div>
              <span className="ml-auto text-sm font-bold rounded-full bg-white border border-[#E7DFD5] px-3 py-1">{upcomingTasks.length}</span>
            </div>
            {upcomingTasks.length === 0 ? (
              <div className="p-6 text-center text-sm text-stone-400">Không có công việc nào đến hạn trong 10 ngày tới.</div>
            ) : (
              <div className="divide-y divide-[#F0E9E0]">
                {upcomingTasks.map((record) => {
                  const task = record.DuLieu || {};
                  const staff = staffList.find((item) => item.NhanVienID === String(task.NhanVienID || ''));
                  const due = new Date(`${String(task.Han).slice(0, 10)}T00:00:00`);
                  const daysLeft = Math.round((due.getTime() - new Date(new Date().setHours(0, 0, 0, 0)).getTime()) / 86400000);
                  return (
                    <div key={record.QuanLyID} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-stone-900">{String(task.TieuDe || 'Công việc chưa đặt tên')}</p>
                        <p className="text-xs text-stone-500 mt-1">{staff?.HoTen || String(task.NhanVienID || 'Chưa phân công')} · {String(task.TrangThai || 'Chưa cập nhật trạng thái')}</p>
                      </div>
                      <div className="sm:text-right shrink-0">
                        <p className={`text-sm font-bold ${daysLeft <= 2 ? 'text-rose-600' : 'text-stone-700'}`}>{due.toLocaleDateString('vi-VN')}</p>
                        <p className={`text-[11px] ${daysLeft <= 2 ? 'text-rose-600' : 'text-stone-500'}`}>{daysLeft === 0 ? 'Đến hạn hôm nay' : daysLeft === 1 ? 'Còn 1 ngày' : `Còn ${daysLeft} ngày`}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </>
      )}
    </div>
  );
};
