import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Award,
  Users,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
} from 'lucide-react';
import type { Luong, HoaHong, NhanVien } from '../types';

interface SalaryCommissionTrendChartProps {
  payrollList: Luong[];
  commissionList: HoaHong[];
  staffList: NhanVien[];
}

export const SalaryCommissionTrendChart: React.FC<SalaryCommissionTrendChartProps> = ({
  payrollList,
  commissionList,
  staffList,
}) => {
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [activeMetric, setActiveMetric] = useState<'all' | 'net' | 'commission'>('all');

  // Month sorting helper: MM/YYYY -> YYYYMM number for correct chronological order
  const getMonthSortKey = (thang: string) => {
    const [m, y] = thang.split('/').map(Number);
    return (y || 0) * 100 + (m || 0);
  };

  // Process data grouped by month
  const chartData = useMemo(() => {
    // Filter payroll by selected staff
    const filteredPayroll = selectedStaffId === 'ALL'
      ? payrollList
      : payrollList.filter((l) => l.NhanVienID === selectedStaffId);

    // Filter commission by selected staff
    const filteredCommissions = selectedStaffId === 'ALL'
      ? commissionList
      : commissionList.filter((h) => h.NhanVienID === selectedStaffId);

    // Collect all unique months
    const monthSet = new Set<string>();
    filteredPayroll.forEach((l) => monthSet.add(l.Thang));

    // Also include months from commissions (YYYY-MM -> MM/YYYY)
    filteredCommissions.forEach((h) => {
      const parts = h.Ngay.split('-');
      if (parts.length >= 2) {
        monthSet.add(`${parts[1]}/${parts[0]}`);
      }
    });

    const sortedMonths = Array.from(monthSet).sort(
      (a, b) => getMonthSortKey(a) - getMonthSortKey(b)
    );

    return sortedMonths.map((thang) => {
      const [m, y] = thang.split('/');
      const shortYear = y ? y.slice(-2) : '26';
      const label = `Th ${m}/${shortYear}`;

      // Payrolls for this month
      const payInMonth = filteredPayroll.filter((l) => l.Thang === thang);

      const tongThucLanh = payInMonth.reduce((sum, l) => sum + (l.ThucLanh || 0), 0);
      const tongLuongCoBan = payInMonth.reduce((sum, l) => sum + (l.LuongCoBan || 0), 0);
      const tongHoaHongTrongLuong = payInMonth.reduce((sum, l) => sum + (l.HoaHong || 0), 0);
      const tongPhuCapThuong = payInMonth.reduce(
        (sum, l) => sum + (l.PhuCap || 0) + (l.Thuong || 0),
        0
      );

      // If no payroll was generated yet, fallback to sum of approved commissions in that month
      let tongHoaHong = tongHoaHongTrongLuong;
      if (tongHoaHong === 0) {
        const commInMonth = filteredCommissions.filter((h) => {
          const [yr, mo] = h.Ngay.split('-');
          return mo === m && yr === y && h.TrangThai === 'Đã duyệt';
        });
        tongHoaHong = commInMonth.reduce((sum, h) => sum + (h.SoTienHoaHong || 0), 0);
      }

      // Percentage of income that came from commissions
      const tyLeHoaHong = tongThucLanh > 0
        ? Math.round((tongHoaHong / tongThucLanh) * 1000) / 10
        : 0;

      const soNhanVien = payInMonth.length;
      const thuNhapBinhQuan = soNhanVien > 0 ? Math.round(tongThucLanh / soNhanVien) : 0;

      return {
        thang,
        label,
        tongThucLanh,
        tongLuongCoBan,
        tongHoaHong,
        tongPhuCapThuong,
        tyLeHoaHong,
        soNhanVien,
        thuNhapBinhQuan,
        // In millions of VNĐ for clean chart tooltips & axes
        thucLanhTrieu: Math.round((tongThucLanh / 1000000) * 10) / 10,
        luongCoBanTrieu: Math.round((tongLuongCoBan / 1000000) * 10) / 10,
        hoaHongTrieu: Math.round((tongHoaHong / 1000000) * 10) / 10,
      };
    });
  }, [payrollList, commissionList, selectedStaffId]);

  // Overall statistics for summary cards
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return {
        totalNetAllMonths: 0,
        totalCommAllMonths: 0,
        peakMonth: '--',
        peakNet: 0,
        avgCommRatio: 0,
        momGrowthNet: 0,
        momGrowthComm: 0,
      };
    }

    const totalNetAllMonths = chartData.reduce((sum, d) => sum + d.tongThucLanh, 0);
    const totalCommAllMonths = chartData.reduce((sum, d) => sum + d.tongHoaHong, 0);

    let peakNet = 0;
    let peakMonth = '--';
    chartData.forEach((d) => {
      if (d.tongThucLanh > peakNet) {
        peakNet = d.tongThucLanh;
        peakMonth = d.thang;
      }
    });

    const avgCommRatio = totalNetAllMonths > 0
      ? Math.round((totalCommAllMonths / totalNetAllMonths) * 1000) / 10
      : 0;

    // Month-over-Month calculation between last 2 available months
    let momGrowthNet = 0;
    let momGrowthComm = 0;
    if (chartData.length >= 2) {
      const curr = chartData[chartData.length - 1];
      const prev = chartData[chartData.length - 2];
      if (prev.tongThucLanh > 0) {
        momGrowthNet = Math.round(((curr.tongThucLanh - prev.tongThucLanh) / prev.tongThucLanh) * 100);
      }
      if (prev.tongHoaHong > 0) {
        momGrowthComm = Math.round(((curr.tongHoaHong - prev.tongHoaHong) / prev.tongHoaHong) * 100);
      }
    }

    return {
      totalNetAllMonths,
      totalCommAllMonths,
      peakMonth,
      peakNet,
      avgCommRatio,
      momGrowthNet,
      momGrowthComm,
    };
  }, [chartData]);

  // Custom luxury tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-stone-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-[#c5a059]/60 max-w-xs text-xs space-y-2 animate-fade-in font-sans">
          <div className="flex items-center justify-between pb-2 border-b border-stone-800">
            <span className="font-bridal text-sm font-bold tracking-wider text-[#dfc79f] uppercase">
              Tháng {data.thang}
            </span>
            {data.soNhanVien > 0 && selectedStaffId === 'ALL' && (
              <span className="text-[10px] text-stone-400 font-mono">
                {data.soNhanVien} nhân sự
              </span>
            )}
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-stone-300">
                <span className="w-2.5 h-2.5 rounded-full bg-[#c5a059]"></span>
                <span>Tổng Thực Lãnh:</span>
              </span>
              <span className="font-mono font-bold text-[#dfc79f] text-sm">
                {data.tongThucLanh.toLocaleString('vi-VN')} đ
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-stone-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Hoa hồng dịch vụ:</span>
              </span>
              <span className="font-mono font-bold text-emerald-400">
                +{data.tongHoaHong.toLocaleString('vi-VN')} đ
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-stone-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                <span>Lương cơ bản:</span>
              </span>
              <span className="font-mono text-stone-300">
                {data.tongLuongCoBan.toLocaleString('vi-VN')} đ
              </span>
            </div>

            {data.tongPhuCapThuong > 0 && (
              <div className="flex items-center justify-between text-[11px] text-stone-400">
                <span>Phụ cấp & Thưởng:</span>
                <span className="font-mono">+{data.tongPhuCapThuong.toLocaleString('vi-VN')} đ</span>
              </div>
            )}
          </div>

          {/* Commission Share Pill */}
          <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-[11px]">
            <span className="text-stone-400">Tỷ trọng hoa hồng:</span>
            <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
              {data.tyLeHoaHong}% thu nhập
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Format currency on Y-axis
  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `${Math.round(value / 1000000)}tr`;
    }
    return `${value}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E7DFD5] shadow-sm p-6 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#a97d3e]">
            <TrendingUp className="w-4 h-4 text-[#bf954f]" />
            <span>Biểu Đồ Xu Hướng Thu Nhập • Hanh Pham Bridal</span>
          </div>
          <h2 className="text-xl font-bold font-bridal text-stone-900 mt-1">
            Biến Động Lương & Hoa Hồng Theo Từng Tháng
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Dễ dàng quan sát chu kỳ mùa cưới, tỷ trọng hoa hồng chốt gói váy/makeup và tốc độ tăng trưởng thu nhập nhân viên.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Staff Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-stone-500 font-semibold hidden sm:inline">Nhân viên:</span>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="text-xs px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#bf954f] bg-[#FAF8F5] font-medium text-stone-800"
            >
              <option value="ALL">Toàn bộ Studio (~20 nhân sự)</option>
              {staffList.map((s) => (
                <option key={s.NhanVienID} value={s.NhanVienID}>
                  {s.HoTen} ({s.ChucVu})
                </option>
              ))}
            </select>
          </div>

          {/* Metric View Switcher */}
          <div className="inline-flex p-1 bg-stone-100 rounded-xl text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setActiveMetric('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeMetric === 'all'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tất cả chỉ số
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('commission')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeMetric === 'commission'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Chỉ Hoa hồng
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('net')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeMetric === 'net'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Chỉ Thực lãnh
            </button>
          </div>
        </div>
      </div>

      {/* 4 Summary Highlight Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* Metric 1 */}
        <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E7DFD5]">
          <span className="text-[10px] uppercase font-bold text-stone-400">
            Tổng Thực Lãnh Chu Kỳ
          </span>
          <p className="text-lg font-bold font-bridal text-stone-900 mt-0.5">
            {stats.totalNetAllMonths.toLocaleString('vi-VN')} đ
          </p>
          <div className="flex items-center gap-1 mt-1 text-[11px]">
            {stats.momGrowthNet >= 0 ? (
              <span className="text-emerald-600 flex items-center font-semibold">
                <ArrowUpRight className="w-3.5 h-3.5" />
                +{stats.momGrowthNet}% MoM
              </span>
            ) : (
              <span className="text-rose-600 flex items-center font-semibold">
                <ArrowDownRight className="w-3.5 h-3.5" />
                {stats.momGrowthNet}% MoM
              </span>
            )}
            <span className="text-stone-400">tháng gần nhất</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E7DFD5]">
          <span className="text-[10px] uppercase font-bold text-stone-400">
            Tổng Hoa Hồng Đã Chi
          </span>
          <p className="text-lg font-bold font-bridal text-emerald-800 mt-0.5">
            {stats.totalCommAllMonths.toLocaleString('vi-VN')} đ
          </p>
          <div className="flex items-center gap-1 mt-1 text-[11px]">
            {stats.momGrowthComm >= 0 ? (
              <span className="text-emerald-600 flex items-center font-semibold">
                <ArrowUpRight className="w-3.5 h-3.5" />
                +{stats.momGrowthComm}%
              </span>
            ) : (
              <span className="text-amber-600 flex items-center font-semibold">
                {stats.momGrowthComm}%
              </span>
            )}
            <span className="text-stone-400">tăng trưởng hoa hồng</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E7DFD5]">
          <span className="text-[10px] uppercase font-bold text-stone-400">
            Tỷ Trọng Hoa Hồng TB
          </span>
          <p className="text-lg font-bold font-bridal text-[#a97d3e] mt-0.5">
            {stats.avgCommRatio}% <span className="text-xs font-sans font-normal text-stone-500">tổng thu nhập</span>
          </p>
          <p className="text-[11px] text-stone-500 mt-1">
            Động lực kinh doanh mạnh
          </p>
        </div>

        {/* Metric 4 */}
        <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E7DFD5]">
          <span className="text-[10px] uppercase font-bold text-stone-400">
            Tháng Thu Nhập Đỉnh Điểm
          </span>
          <p className="text-lg font-bold font-bridal text-indigo-900 mt-0.5">
            Tháng {stats.peakMonth}
          </p>
          <p className="text-[11px] text-stone-500 mt-1 font-mono">
            {stats.peakNet.toLocaleString('vi-VN')} đ
          </p>
        </div>
      </div>

      {/* Main Recharts Container */}
      <div className="h-[340px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
          >
            <defs>
              {/* Gradient for Net Salary Area */}
              <linearGradient id="netSalaryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c5a059" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#c5a059" stopOpacity={0.0} />
              </linearGradient>

              {/* Gradient for Commission Area */}
              <linearGradient id="commissionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e7dfd5"
              vertical={false}
            />

            <XAxis
              dataKey="label"
              stroke="#78716c"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#e7dfd5' }}
            />

            <YAxis
              stroke="#78716c"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#e7dfd5' }}
              tickFormatter={formatYAxis}
              domain={[0, 'auto']}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingBottom: '16px', fontSize: '11px' }}
            />

            {/* Area under Net Salary when active */}
            {(activeMetric === 'all' || activeMetric === 'net') && (
              <Area
                type="monotone"
                dataKey="tongThucLanh"
                name="Thực Lãnh (Net)"
                stroke="#c5a059"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#netSalaryGradient)"
                activeDot={{ r: 6, fill: '#c5a059', stroke: '#ffffff', strokeWidth: 2 }}
              />
            )}

            {/* Line for Base Salary */}
            {activeMetric === 'all' && (
              <Line
                type="monotone"
                dataKey="tongLuongCoBan"
                name="Lương Cơ Bản"
                stroke="#64748b"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: '#64748b' }}
              />
            )}

            {/* Line/Area for Commission */}
            {(activeMetric === 'all' || activeMetric === 'commission') && (
              <Area
                type="monotone"
                dataKey="tongHoaHong"
                name="Hoa Hồng Hợp Đồng"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#commissionGradient)"
                activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Insight Footer Note */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#FAF8F5] rounded-xl border border-[#E7DFD5] text-[11px] text-stone-600">
        <div className="flex items-center gap-1.5 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-[#bf954f] flex-shrink-0" />
          <span>
            <strong>Phân tích chu kỳ:</strong> Thu nhập tháng 9 - 10 tăng vọt nhờ hoa hồng các gói váy cưới Haute Couture & Makeup VIP mùa cưới thu - đông.
          </span>
        </div>
        <span className="text-stone-400 italic">Dữ liệu được cập nhật tự động theo thời gian thực</span>
      </div>
    </div>
  );
};
