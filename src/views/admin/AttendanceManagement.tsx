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
  const nowLocal = new Date();
  const todayStr = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, '0')}-${String(nowLocal.getDate()).padStart(2, '0')}`;
  // Mặc định chỉ hiển thị chấm công của ngày hiện tại; ngày khác xem bằng bộ chọn ngày.
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [viewPhoto, setViewPhoto] = useState<{ url: string; title: string } | null>(null);
  const [loadingPhotoId, setLoadingPhotoId] = useState<string | null>(null);

  const openAttendancePhoto = async (record: ChamCong, kind: 'checkin' | 'checkout') => {
    setLoadingPhotoId(record.ChamCongID);
    try {
      const photos = await api.attendance.getPhotos(record.ChamCongID);
      const url = kind === 'checkin' ? photos.AnhCheckIn : photos.AnhCheckOut;
      if (!url) {
        alert('Bản ghi này không có ảnh.');
        return;
      }
      setViewPhoto({ url, title: `${kind === 'checkin' ? 'Check-in' : 'Check-out'}: ${record.HoTen} lúc ${kind === 'checkin' ? record.CheckIn : record.CheckOut}` });
    } catch (error: any) {
      alert(error?.message || 'Không tải được ảnh chấm công.');
    } finally {
      setLoadingPhotoId(null);
    }
  };

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

  const exportEmployeeMonthlyAttendance = () => {
    if (selectedStaffId === 'ALL' || !selectedMonth) {
      alert('Vui lòng chọn một nhân viên và một tháng trước khi xuất hồ sơ.');
      return;
    }

    const staff = staffList.find((item) => item.NhanVienID === selectedStaffId);
    if (!staff) {
      alert('Không tìm thấy thông tin nhân viên.');
      return;
    }

    const [monthText, yearText] = selectedMonth.split('/');
    const month = Number(monthText);
    const year = Number(yearText);
    if (!month || !year) {
      alert('Tháng không hợp lệ.');
      return;
    }

    const monthRecords = attendanceList
      .filter((item) => item.NhanVienID === selectedStaffId && item.Ngay.startsWith(`${year}-${String(month).padStart(2, '0')}-`))
      .sort((a, b) => a.Ngay.localeCompare(b.Ngay));

    const recordsByDate = new Map(monthRecords.map((item) => [item.Ngay, item]));
    const daysInMonth = new Date(year, month, 0).getDate();
    const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows: string[][] = [
      ['HỒ SƠ ĐỐI CHIẾU CHẤM CÔNG THÁNG', selectedMonth],
      ['Đơn vị', 'HẠNH PHẠM LUXURY BRIDAL'],
      ['Nhân viên', staff.HoTen],
      ['Mã nhân viên', staff.NhanVienID],
      ['Tổng bản ghi chấm công', String(monthRecords.length)],
      ['Tổng giờ ghi nhận', String(Math.round(monthRecords.reduce((sum, item) => sum + (Number(item.SoGioLam) || 0), 0) * 100) / 100)],
      [],
      ['Ngày', 'Thứ', 'Check-in', 'Check-out', 'Số giờ', 'Trạng thái', 'GPS Check-in', 'GPS Check-out', 'Ảnh Check-in', 'Ảnh Check-out', 'Ghi chú', 'Mã bản ghi'],
    ];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const record = recordsByDate.get(date);
      const weekday = new Date(year, month - 1, day).toLocaleDateString('vi-VN', { weekday: 'long' });
      rows.push(record
        ? [date, weekday, record.CheckIn || '', record.CheckOut || '', String(record.SoGioLam ?? ''), record.TrangThai, record.GPSCheckIn || '', record.GPSCheckOut || '', (record.HasCheckInPhoto || record.AnhCheckIn) ? 'Có ảnh check-in (mở trong ứng dụng)' : 'Không có', (record.HasCheckOutPhoto || record.AnhCheckOut) ? 'Có ảnh check-out (mở trong ứng dụng)' : 'Không có', record.GhiChu || '', record.ChamCongID]
        : [date, weekday, '', '', '', 'Không có bản ghi chấm công - không tự động tính là nghỉ/trừ lương', '', '', 'Không có', 'Không có', '', '']);
    }

    rows.push([]);
    rows.push(['XÁC NHẬN ĐỐI CHIẾU', 'Nhân viên và quản lý kiểm tra dữ liệu chấm công, ảnh và GPS gốc trên ứng dụng.']);
    rows.push(['Lưu ý', 'Ngày không có bản ghi check-in không mặc định là ngày nghỉ và không tự động khấu trừ lương.']);

    const csv = '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Doi-chieu-cham-cong-${staff.NhanVienID}-${monthText}-${yearText}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
          <button
            type="button"
            onClick={exportEmployeeMonthlyAttendance}
            disabled={selectedStaffId === 'ALL' || !selectedMonth}
            title="Chọn một nhân viên và một tháng để tải hồ sơ đối chiếu đầy đủ"
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5 text-[#d6b16f]" />
            <span>Hồ sơ tháng của nhân viên</span>
          </button>
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
            {Array.from({ length: 24 }, (_, index) => {
              const date = new Date();
              date.setDate(1);
              date.setMonth(date.getMonth() - index);
              const value = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
              return <option key={value} value={value}>Tháng {value}</option>;
            })}
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
                <th className="px-5 py-3.5 font-semibold">Lý do / xét duyệt</th>
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
                      {(cc.HasCheckInPhoto || cc.AnhCheckIn) ? (
                        <button
                          type="button"
                          onClick={() => void openAttendancePhoto(cc, 'checkin')}
                          className="relative group w-8 h-8 rounded-lg overflow-hidden border border-stone-200"
                        >
                          <Eye className="w-3 h-3 text-stone-600" />
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
                      {(cc.HasCheckOutPhoto || cc.AnhCheckOut) ? (
                        <button
                          type="button"
                          onClick={() => void openAttendancePhoto(cc, 'checkout')}
                          className="relative group w-8 h-8 rounded-lg overflow-hidden border border-stone-200"
                        >
                          <Eye className="w-3 h-3 text-stone-600" />
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
                    <td className="px-5 py-3.5 text-stone-600 max-w-[220px]">
                      <p className="whitespace-normal break-words" title={cc.GhiChu}>{cc.GhiChu || '--'}</p>
                      {cc.KetQuaGiaiTrinh && <p className={`mt-1 text-[10px] font-bold ${cc.KetQuaGiaiTrinh === 'Chấp nhận' ? 'text-emerald-700' : 'text-rose-700'}`}>Admin: {cc.KetQuaGiaiTrinh}</p>}
                      {cc.GhiChuDuyet && <p className="mt-1 text-[10px] text-stone-500 whitespace-normal">Phản hồi: {cc.GhiChuDuyet}</p>}
                      {((!!cc.CheckIn && cc.CheckIn >= '08:30:00') || (!!cc.CheckOut && cc.CheckOut < '20:30:00')) && !cc.KetQuaGiaiTrinh && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          <button type="button" onClick={async () => {
                            const note = window.prompt('Ghi chú xét duyệt (không bắt buộc):') || '';
                            try { await api.attendance.reviewExplanation(cc.ChamCongID, 'Chấp nhận', note); onRefresh(); }
                            catch (error: any) { alert(error?.message || 'Không thể lưu xét duyệt.'); }
                          }} className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">Chấp nhận</button>
                          <button type="button" onClick={async () => {
                            const note = window.prompt('Lý do không chấp nhận (không bắt buộc):') || '';
                            try { await api.attendance.reviewExplanation(cc.ChamCongID, 'Không chấp nhận', note); onRefresh(); }
                            catch (error: any) { alert(error?.message || 'Không thể lưu xét duyệt.'); }
                          }} className="rounded bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700">Không chấp nhận</button>
                        </div>
                      )}
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
