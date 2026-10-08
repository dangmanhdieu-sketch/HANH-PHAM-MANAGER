import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, TrendingUp, Wallet, FileText, CheckSquare } from 'lucide-react';
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

    const thu = records
      .filter(
        (record) =>
          record.Module === 'THU_CHI' &&
          String(record.DuLieu.Loai || '').trim().toUpperCase() === 'THU'
      )
      .reduce((sum, record) => sum + Number(record.DuLieu.SoTien || 0), 0);

    const chi = records
      .filter(
        (record) =>
          record.Module === 'THU_CHI' &&
          String(record.DuLieu.Loai || '').trim().toUpperCase() === 'CHI'
      )
      .reduce((sum, record) => sum + Number(record.DuLieu.SoTien || 0), 0);

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
      thu,
      chi,
      approvedCommission,
      pendingPayroll,
      balance: thu - chi,
    };
  }, [records, staffList, payrollList, commissionList]);

  const cards: Card[] = [
    { label: 'Nhân viên đang làm', value: stats.staff, icon: TrendingUp },
    { label: 'Công việc', value: stats.tasks, icon: CheckSquare },
    { label: 'Hợp đồng', value: stats.contracts, icon: FileText },
    { label: 'Tổng thu', value: stats.thu, money: true, icon: Wallet },
    { label: 'Tổng chi', value: stats.chi, money: true, icon: Wallet },
    { label: 'Hoa hồng đã duyệt', value: stats.approvedCommission, money: true, icon: TrendingUp },
    { label: 'Lương chờ duyệt', value: stats.pendingPayroll, money: true, icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-[#E7DFD5]">
        <h1 className="text-xl font-bold flex gap-2 items-center">
          <BarChart3 className="w-5 h-5 text-[#bf954f]" />
          Thống kê
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Tổng hợp dữ liệu từ các module nghiệp vụ.
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
                      ? card.value.toLocaleString('vi-VN') + ' đ'
                      : card.value.toLocaleString('vi-VN')}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E7DFD5]">
            <h2 className="font-bold mb-3">Dòng tiền</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-stone-500">Tổng thu</span>
                <b className="block text-emerald-700">
                  {stats.thu.toLocaleString('vi-VN')} đ
                </b>
              </div>
              <div>
                <span className="text-stone-500">Tổng chi</span>
                <b className="block text-rose-700">
                  {stats.chi.toLocaleString('vi-VN')} đ
                </b>
              </div>
              <div>
                <span className="text-stone-500">Chênh lệch</span>
                <b className={stats.balance >= 0 ? 'block text-emerald-700' : 'block text-rose-700'}>
                  {stats.balance.toLocaleString('vi-VN')} đ
                </b>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
