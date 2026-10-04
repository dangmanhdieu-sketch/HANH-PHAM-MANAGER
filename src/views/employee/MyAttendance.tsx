import React, { useState } from 'react';
import { Clock, Calendar, MapPin, Eye, CheckCircle, AlertTriangle } from 'lucide-react';
import type { ChamCong } from '../../types';

interface MyAttendanceProps {
  attendanceList: ChamCong[];
}

export const MyAttendance: React.FC<MyAttendanceProps> = ({ attendanceList }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  const filteredList = attendanceList.filter((cc) => {
    if (!selectedMonth) return true;
    const [m, y] = selectedMonth.split('/');
    return cc.Ngay.startsWith(`${y}-${m.padStart(2, '0')}`);
  });

  const totalDays = filteredList.filter((c) => c.CheckIn).length;
  const totalHours = filteredList.reduce((sum, c) => sum + (c.SoGioLam || 0), 0);
  const onTimeDays = filteredList.filter((c) => c.TrangThai === 'Có mặt').length;
  const lateDays = filteredList.filter((c) => c.TrangThai === 'Đi trễ').length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E7DFD5] shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-bridal text-stone-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#bf954f]" />
            Lịch sử công
          </h1>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-stone-600">Chọn tháng:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f] bg-white text-xs"
          >
            <option value="">Tất cả thời gian</option>
            <option value="10/2026">Tháng 10/2026</option>
            <option value="09/2026">Tháng 09/2026</option>
          </select>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-xl border border-[#E7DFD5] text-xs">
          <span className="text-stone-400 font-semibold uppercase text-[10px]">Ngày đi làm</span>
          <p className="text-2xl font-bold font-bridal text-stone-900 mt-1">{totalDays} ngày</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-[#E7DFD5] text-xs">
          <span className="text-stone-400 font-semibold uppercase text-[10px]">Tổng giờ làm việc</span>
          <p className="text-2xl font-bold font-bridal text-indigo-700 mt-1">
            {Math.round(totalHours * 10) / 10} giờ
          </p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-[#E7DFD5] text-xs">
          <span className="text-stone-400 font-semibold uppercase text-[10px]">Đúng giờ</span>
          <p className="text-2xl font-bold font-bridal text-emerald-700 mt-1">{onTimeDays} buổi</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-[#E7DFD5] text-xs">
          <span className="text-stone-400 font-semibold uppercase text-[10px]">Đi trễ</span>
          <p className="text-2xl font-bold font-bridal text-amber-700 mt-1">{lateDays} buổi</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E7DFD5] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] text-stone-500 uppercase tracking-wider border-b border-[#E7DFD5]">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Ngày</th>
                <th className="px-5 py-3.5 font-semibold">Check-in</th>
                <th className="px-5 py-3.5 font-semibold">Ảnh Check-in</th>
                <th className="px-5 py-3.5 font-semibold">Check-out</th>
                <th className="px-5 py-3.5 font-semibold">Số Giờ Làm</th>
                <th className="px-5 py-3.5 font-semibold">Vị trí GPS</th>
                <th className="px-5 py-3.5 font-semibold">Trạng Thái</th>
                <th className="px-5 py-3.5 font-semibold">Ghi Chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7DFD5]">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-stone-400">
                    Chưa có dữ liệu chấm công trong khoảng thời gian này.
                  </td>
                </tr>
              ) : (
                filteredList.map((cc) => (
                  <tr key={cc.ChamCongID} className="hover:bg-[#FAF8F5] transition">
                    <td className="px-5 py-4 font-mono font-semibold text-stone-800">
                      {new Date(cc.Ngay).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-5 py-4 font-mono text-emerald-700 font-bold">
                      {cc.CheckIn || '--:--:--'}
                    </td>
                    <td className="px-5 py-4">
                      {cc.AnhCheckIn ? (
                        <button
                          type="button"
                          onClick={() => setViewPhoto(cc.AnhCheckIn!)}
                          className="w-8 h-8 rounded-lg overflow-hidden border border-stone-200"
                        >
                          <img src={cc.AnhCheckIn} alt="Selfie" className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <span className="text-stone-300">--</span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-indigo-700 font-bold">
                      {cc.CheckOut || '--:--:--'}
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-stone-900">
                      {cc.SoGioLam ? `${cc.SoGioLam} giờ` : '--'}
                    </td>
                    <td className="px-5 py-4 max-w-[180px] truncate" title={cc.GPSCheckIn}>
                      <span className="text-stone-600 truncate">{cc.GPSCheckIn || '--'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          cc.TrangThai === 'Có mặt'
                            ? 'bg-emerald-100 text-emerald-800'
                            : cc.TrangThai === 'Đi trễ'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {cc.TrangThai}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-stone-500 italic max-w-[160px] truncate">
                      {cc.GhiChu || '--'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setViewPhoto(null)}
        >
          <div className="relative max-w-sm w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-2 border border-[#c5a059]">
            <img src={viewPhoto} alt="Selfie" className="w-full h-auto rounded-xl object-cover" />
          </div>
        </div>
      )}
    </div>
  );
};
