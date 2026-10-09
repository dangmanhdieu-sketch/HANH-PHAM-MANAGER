import React, { useState } from 'react';
import {
  Clock,
  Calendar,
  Filter,
  Download,
  MapPin,
  Eye,
  CheckCircle,
  AlertCircle,
  Users,
  Trash2,
} from 'lucide-react';
import type { ChamCong, NhanVien } from '../../types';
import { api } from '../../api';

interface AttendanceManagementProps {
  attendanceList: ChamCong[];
  staffList: NhanVien[];
  onRefresh: () => void;
}

export const AttendanceManagement: React.FC<AttendanceManagementProps> = ({
  attendanceList,
  staffList,
  onRefresh,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [viewPhoto, setViewPhoto] = useState<{ url: string; title: string } | null>(null);

  const handleDeleteAttendance = async (record: ChamCong) => {
    const dateLabel = new Date(record.Ngay).toLocaleDateString('vi-VN');
    if (!window.confirm(`Bạn có chắc muốn xóa chấm công của ${record.HoTen} ngày ${dateLabel}? Thao tác này không thể hoàn tác.`)) return;
    try {
      await api.attendance.delete(record.ChamCongID);
      onRefresh();
    } catch (error: any) {
      alert(error?.message || 'Không thể xóa bản ghi chấm công.');
    }
  };

  // Filter attendance records
  const filteredList = attendanceList.filter((cc) => {
    const matchDate = !selectedDate || cc.Ngay === selectedDate;
    const matchMonth =
      !selectedMonth ||
      (() => {
        const [m, y] = selectedMonth.split('/');
        return cc.Ngay.startsWith(`${y}-${m.padStart(2, '0')}`);
      })();
    const matchStaff = selectedStaffId === 'ALL' || cc.NhanVienID === selectedStaffId;
    const matchStatus = selectedStatus === 'ALL' || cc.TrangThai === selectedStatus;

    return matchDate && matchMonth && matchStaff && matchStatus;
  });

  // Calculate quick metrics for current view
  const totalRecords = filteredList.length;
  const onTimeCount = filteredList.filter((cc) => cc.TrangThai === 'Có mặt').length;
  const lateCount = filteredList.filter((cc) => cc.TrangThai === 'Đi trễ').length;
  const totalHours = filteredList.reduce((sum, cc) => sum + (cc.SoGioLam || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#E7DFD5] shadow-sm">
        <div>
          <h1 className="text-xl font-bold font-bridal text-stone-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#bf954f]" />
            Chấm công
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedDate(todayStr);
              setSelectedMonth('');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
              selectedDate === todayStr
                ? 'bg-stone-900 text-white border-stone-900'
                : 'border-[#E7DFD5] text-stone-700 hover:bg-[#FAF8F5]'
            }`}
          >
            Hôm nay ({todayStr})
          </button>

          <a
            href={api.system.getExportUrl('chamcong')}
            download
            className="flex items-center gap-2 px-4 py-2 border border-[#E7DFD5] text-stone-700 hover:bg-[#FAF8F5] rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5 text-[#bf954f]" />
            <span>Xuất CSV Chấm Công</span>
          </a>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-[#E7DFD5] shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block text-stone-500 font-semibold mb-1">Lọc theo ngày:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              if (e.target.value) setSelectedMonth('');
            }}
            className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
          />
        </div>

        <div>
          <label className="block text-stone-500 font-semibold mb-1">Lọc theo tháng:</label>
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              if (e.target.value) setSelectedDate('');
            }}
            className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f] bg-white"
          >
            <option value="">Tất cả các tháng</option>
            <option value="10/2026">Tháng 10/2026</option>
            <option value="09/2026">Tháng 09/2026</option>
            <option value="08/2026">Tháng 08/2026</option>
          </select>
        </div>

        <div>
          <label className="block text-stone-500 font-semibold mb-1">Nhân viên:</label>
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f] bg-white"
          >
            <option value="ALL">Tất cả nhân viên</option>
            {staffList.map((s) => (
              <option key={s.NhanVienID} value={s.NhanVienID}>
                {s.HoTen} ({s.NhanVienID})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-stone-500 font-semibold mb-1">Trạng thái:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f] bg-white"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="Có mặt">Có mặt đúng giờ</option>
            <option value="Đi trễ">Đi trễ</option>
            <option value="Về sớm">Về sớm</option>
            <option value="Nghỉ">Nghỉ việc</option>
            <option value="Nghỉ phép">Nghỉ phép</option>
          </select>
        </div>
      </div>

      {/* Mini Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white rounded-xl border border-[#E7DFD5] text-xs">
          <p className="text-stone-400 uppercase font-semibold text-[10px]">Tổng lượt chấm công</p>
          <p className="text-lg font-bold text-stone-900 font-mono mt-0.5">{totalRecords}</p>
        </div>
        <div className="p-3 bg-white rounded-xl border border-[#E7DFD5] text-xs">
          <p className="text-stone-400 uppercase font-semibold text-[10px]">Đúng giờ</p>
          <p className="text-lg font-bold text-emerald-600 font-mono mt-0.5">{onTimeCount}</p>
        </div>
        <div className="p-3 bg-white rounded-xl border border-[#E7DFD5] text-xs">
          <p className="text-stone-400 uppercase font-semibold text-[10px]">Đi trễ</p>
          <p className="text-lg font-bold text-amber-600 font-mono mt-0.5">{lateCount}</p>
        </div>
        <div className="p-3 bg-white rounded-xl border border-[#E7DFD5] text-xs">
          <p className="text-stone-400 uppercase font-semibold text-[10px]">Tổng số giờ làm</p>
          <p className="text-lg font-bold text-indigo-600 font-mono mt-0.5">
            {Math.round(totalHours * 10) / 10} giờ
          </p>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl border border-[#E7DFD5] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] text-stone-500 uppercase tracking-wider border-b border-[#E7DFD5]">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Nhân viên</th>
                <th className="px-5 py-3.5 font-semibold">Ngày</th>
                <th className="px-5 py-3.5 font-semibold">Check-In</th>
                <th className="px-5 py-3.5 font-semibold">Ảnh Check-In</th>
                <th className="px-5 py-3.5 font-semibold">Check-Out</th>
                <th className="px-5 py-3.5 font-semibold">Ảnh Check-Out</th>
                <th className="px-5 py-3.5 font-semibold">Số Giờ</th>
                <th className="px-5 py-3.5 font-semibold">Tọa độ GPS</th>
                <th className="px-5 py-3.5 font-semibold">Trạng Thái</th>
                <th className="px-5 py-3.5 font-semibold">Ghi Chú</th>
                <th className="px-5 py-3.5 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7DFD5]">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-10 text-center text-stone-400">
                    Không có bản ghi chấm công nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredList.map((cc) => (
                  <tr key={cc.ChamCongID} className="hover:bg-[#FAF8F5] transition">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-stone-900">{cc.HoTen}</p>
                      <p className="text-[10px] text-stone-400">{cc.NhanVienID}</p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-stone-700">
                      {new Date(cc.Ngay).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-semibold text-emerald-700">
                      {cc.CheckIn || '--:--:--'}
                    </td>
                    <td className="px-5 py-3.5">
                      {cc.AnhCheckIn ? (
                        <button
                          type="button"
                          onClick={() => setViewPhoto({ url: cc.AnhCheckIn!, title: `Check-in: ${cc.HoTen} lúc ${cc.CheckIn}` })}
                          className="relative group w-8 h-8 rounded-lg overflow-hidden border border-stone-200"
                        >
                          <img src={cc.AnhCheckIn} alt="CheckIn" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                            <Eye className="w-3 h-3 text-white" />
                          </div>
                        </button>
                      ) : (
                        <span className="text-stone-300">--</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-semibold text-indigo-700">
                      {cc.CheckOut || '--:--:--'}
                    </td>
                    <td className="px-5 py-3.5">
                      {cc.AnhCheckOut ? (
                        <button
                          type="button"
                          onClick={() => setViewPhoto({ url: cc.AnhCheckOut!, title: `Check-out: ${cc.HoTen} lúc ${cc.CheckOut}` })}
                          className="relative group w-8 h-8 rounded-lg overflow-hidden border border-stone-200"
                        >
                          <img src={cc.AnhCheckOut} alt="CheckOut" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                            <Eye className="w-3 h-3 text-white" />
                          </div>
                        </button>
                      ) : (
                        <span className="text-stone-300">--</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-stone-900">
                      {cc.SoGioLam ? `${cc.SoGioLam}h` : '--'}
                    </td>
                    <td className="px-5 py-3.5 max-w-[180px]">
                      {cc.GPSCheckIn ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            cc.GPSCheckIn.split('(')[0].trim()
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-stone-600 hover:text-[#a97d3e] flex items-center gap-1 truncate"
                          title={cc.GPSCheckIn}
                        >
                          <MapPin className="w-3 h-3 text-[#bf954f] flex-shrink-0" />
                          <span className="truncate">{cc.GPSCheckIn}</span>
                        </a>
                      ) : (
                        <span className="text-stone-300">--</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
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
                    <td className="px-5 py-3.5 text-stone-500 italic max-w-[150px] truncate" title={cc.GhiChu}>
                      {cc.GhiChu || '--'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button type="button" onClick={() => void handleDeleteAttendance(cc)} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-rose-700 hover:bg-rose-100 font-semibold" title="Xóa bản ghi chấm công">
                        <Trash2 className="w-3.5 h-3.5" /> Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Photo Viewer Modal */}
      {viewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setViewPhoto(null)}
        >
          <div className="relative max-w-sm w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-3 border border-[#c5a059]">
            <img src={viewPhoto.url} alt="Selfie" className="w-full h-auto rounded-xl object-cover" />
            <p className="text-center text-xs font-semibold text-stone-800 mt-2">
              {viewPhoto.title}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
