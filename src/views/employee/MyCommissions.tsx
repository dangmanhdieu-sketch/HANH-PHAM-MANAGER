import React, { useState } from 'react';
import {
  Award,
  CheckCircle,
  Clock,
  Sparkles,
  DollarSign,
  Plus,
  Eye,
  Filter,
  FileText,
  Image as ImageIcon,
  XCircle,
} from 'lucide-react';
import type { HoaHong, NhanVien } from '../../types';
import { DailyShowCommissionModal } from '../../components/DailyShowCommissionModal';
import { api } from '../../api';

interface MyCommissionsProps {
  currentUser: NhanVien;
  commissionList: HoaHong[];
  onRefresh: () => void;
}

export const MyCommissions: React.FC<MyCommissionsProps> = ({
  currentUser,
  commissionList,
  onRefresh,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'Tiền Show' | 'Hoa Hồng'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Filter list
  const filteredList = commissionList.filter((c) => {
    const matchType =
      filterType === 'ALL' ||
      (filterType === 'Tiền Show' && (c.LoaiKhoan === 'Tiền Show' || c.NoiDung.includes('Tiền Show'))) ||
      (filterType === 'Hoa Hồng' && (c.LoaiKhoan === 'Hoa Hồng' || (!c.LoaiKhoan && !c.NoiDung.includes('Tiền Show'))));

    const matchStatus = filterStatus === 'ALL' || c.TrangThai === filterStatus;
    return matchType && matchStatus;
  });

  const approvedTotal = commissionList
    .filter((c) => c.TrangThai === 'Đã duyệt')
    .reduce((sum, c) => sum + c.SoTienHoaHong, 0);

  const pendingTotal = commissionList
    .filter((c) => c.TrangThai === 'Chờ duyệt')
    .reduce((sum, c) => sum + c.SoTienHoaHong, 0);

  const showFeeTotal = commissionList
    .filter((c) => c.TrangThai === 'Đã duyệt' && (c.LoaiKhoan === 'Tiền Show' || c.NoiDung.includes('Tiền Show')))
    .reduce((sum, c) => sum + c.SoTienHoaHong, 0);

  const handleSubmitClaim = async (data: any) => {
    await api.commission.create(data);
    alert('Đã gửi kê khai tiền show / hoa hồng thành công! Quản trị viên sẽ kiểm tra và phê duyệt.');
    onRefresh();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      {/* Header with Call to Action */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E7DFD5] shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-bridal text-stone-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#bf954f]" />
            Kê khai Show & Hoa hồng
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-[#f3dfa2] rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition border border-[#c5a059]/40"
        >
          <Plus className="w-4 h-4 text-[#c5a059]" />
          <span>KÊ KHAI MỚI</span>
        </button>
      </div>

      {/* KPI mini */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[#E7DFD5] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-stone-400">Đã Duyệt (Cộng Vào Lương)</span>
            <p className="text-2xl font-bold font-bridal text-emerald-800 mt-0.5">
              +{approvedTotal.toLocaleString('vi-VN')} đ
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              <span>Được tính vào phiếu lương tháng</span>
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E7DFD5] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-stone-400">Đang Chờ Admin Duyệt</span>
            <p className="text-2xl font-bold font-bridal text-amber-800 mt-0.5">
              {pendingTotal.toLocaleString('vi-VN')} đ
            </p>
            <p className="text-[11px] text-amber-600 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Chờ xác nhận từ quản trị viên</span>
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E7DFD5] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-stone-400">Tiền Show Đã Thực Hiện</span>
            <p className="text-2xl font-bold font-bridal text-indigo-900 mt-0.5">
              {showFeeTotal.toLocaleString('vi-VN')} đ
            </p>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Show makeup, photo tiệc & may đo
            </p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-[#E7DFD5] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-stone-600">Loại khoản:</span>
          <div className="inline-flex p-1 bg-stone-100 rounded-lg text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-md transition ${filterType === 'ALL' ? 'bg-stone-900 text-white font-bold' : 'text-stone-600 hover:text-stone-900'}`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setFilterType('Tiền Show')}
              className={`px-3 py-1 rounded-md transition ${filterType === 'Tiền Show' ? 'bg-stone-900 text-white font-bold' : 'text-stone-600 hover:text-stone-900'}`}
            >
              Tiền Đi Show
            </button>
            <button
              type="button"
              onClick={() => setFilterType('Hoa Hồng')}
              className={`px-3 py-1 rounded-md transition ${filterType === 'Hoa Hồng' ? 'bg-stone-900 text-white font-bold' : 'text-stone-600 hover:text-stone-900'}`}
            >
              Hoa Hồng Hợp Đồng
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-stone-600">Trạng thái:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 border border-stone-200 rounded-lg bg-[#FAF8F5] text-xs focus:ring-1 focus:ring-[#bf954f]"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="Chờ duyệt">Chờ duyệt</option>
            <option value="Đã duyệt">Đã duyệt</option>
            <option value="Từ chối">Từ chối</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E7DFD5] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] text-stone-500 uppercase tracking-wider border-b border-[#E7DFD5]">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Ngày</th>
                <th className="px-5 py-3.5 font-semibold">Phân Loại</th>
                <th className="px-5 py-3.5 font-semibold">Nội Dung Chi Tiết</th>
                <th className="px-5 py-3.5 font-semibold">Số Tiền Đề Nghị</th>
                <th className="px-5 py-3.5 font-semibold">Chứng Từ</th>
                <th className="px-5 py-3.5 font-semibold">Trạng Thái Duyệt</th>
                <th className="px-5 py-3.5 font-semibold">Ghi Chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7DFD5]">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-stone-400">
                    <Award className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                    Chưa có khoản tiền show hoặc hoa hồng nào. Bấm nút <strong>"Kê Khai Tiền Show / Hoa Hồng"</strong> ở trên để gửi duyệt khoản đầu tiên.
                  </td>
                </tr>
              ) : (
                filteredList.map((hh) => {
                  const isShow = hh.LoaiKhoan === 'Tiền Show' || hh.NoiDung.includes('Tiền Show');
                  return (
                    <tr key={hh.HoaHongID} className="hover:bg-[#FAF8F5] transition">
                      <td className="px-5 py-4 font-mono font-semibold text-stone-700 whitespace-nowrap">
                        {new Date(hh.Ngay).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            isShow
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-[#FAF8F5] text-[#a97d3e] border border-[#ebdcc3]'
                          }`}
                        >
                          {isShow ? 'Tiền Show' : 'Hoa Hồng'}
                        </span>
                      </td>
                      <td className="px-5 py-4 max-w-[280px]">
                        <p className="font-semibold text-stone-900">{hh.NoiDung}</p>
                        {hh.TaoBoi && (
                          <span className="text-[10px] text-stone-400">
                            Người kê khai: {hh.TaoBoi === 'Nhân viên' ? 'Bản thân' : 'Admin'}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-[#a97d3e] text-sm whitespace-nowrap">
                        +{hh.SoTienHoaHong.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="px-5 py-4">
                        {hh.AnhChungTu ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImage(hh.AnhChungTu!)}
                            className="p-1 rounded-lg border border-stone-200 hover:border-[#bf954f] flex items-center gap-1 text-[11px] text-stone-600 hover:text-stone-900 transition"
                            title="Xem ảnh chứng từ"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-[#bf954f]" />
                            <span>Xem ảnh</span>
                          </button>
                        ) : (
                          <span className="text-stone-300">--</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            hh.TrangThai === 'Đã duyệt'
                              ? 'bg-emerald-100 text-emerald-800'
                              : hh.TrangThai === 'Chờ duyệt'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {hh.TrangThai === 'Đã duyệt' ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : hh.TrangThai === 'Chờ duyệt' ? (
                            <Clock className="w-3 h-3 mr-1" />
                          ) : (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {hh.TrangThai}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-stone-500 italic max-w-[160px] truncate" title={hh.GhiChu}>
                        {hh.GhiChu || '--'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-md w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-2 border border-[#c5a059]">
            <img src={previewImage} alt="Proof" className="w-full h-auto rounded-xl object-cover" />
            <p className="text-center text-xs text-stone-500 mt-2 font-mono">
              Ảnh chứng từ / nghiệm thu kê khai
            </p>
          </div>
        </div>
      )}

      {/* Daily Submission Modal */}
      <DailyShowCommissionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        currentUser={currentUser}
        onSubmit={handleSubmitClaim}
      />
    </div>
  );
};
