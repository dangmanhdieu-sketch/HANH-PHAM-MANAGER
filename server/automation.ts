import { dbService } from './db.ts';

class AutomationManager {
  private timer: NodeJS.Timeout | null = null;
  private lastExecutedMonth: string = '';
  private isRunning: boolean = false;

  constructor() {
    this.startScheduler();
  }

  public startScheduler() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    console.log('[Automation] Hanh Pham Bridal Automation Service initialized.');
    
    // Check every 60 seconds
    this.timer = setInterval(() => {
      this.checkScheduledJobs();
    }, 60 * 1000);

    // Initial check on server start
    this.checkScheduledJobs();
  }

  public stopScheduler() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async checkWeddingReminders() {
    const now = Date.now();
    const reminders = [
      { key: 'Nhac7NgayDaGui', threshold: 7 * 24 * 60, window: 24 * 60, label: '7 ngày' },
      { key: 'Nhac3NgayDaGui', threshold: 3 * 24 * 60, window: 24 * 60, label: '3 ngày' },
      { key: 'Nhac1NgayDaGui', threshold: 24 * 60, window: 22 * 60, label: '1 ngày' },
      { key: 'Nhac2GioDaGui', threshold: 2 * 60, window: 2 * 60, label: '2 giờ' },
    ];
    let changed = false;
    const systemUser = { HoTen: 'Hệ thống nhắc lịch cưới', Email: 'system@hanhphambridal.vn' };

    for (const record of dbService.getQuanLyRecords('LICH_CUOI')) {
      const data = record.DuLieu || {};
      if (['Đã hủy', 'Hủy', 'Hoàn thành'].includes(String(data.TrangThai || ''))) continue;
      const startAt = Date.parse(String(data.Ngay || '') + 'T' + String(data.Gio || '') + ':00+07:00');
      if (!Number.isFinite(startAt)) continue;
      const minutesLeft = Math.floor((startAt - now) / 60000);
      if (minutesLeft <= 0) continue;
      const reminder = reminders.find(item => !data[item.key] && minutesLeft <= item.threshold && minutesLeft > item.threshold - item.window);
      if (!reminder) continue;

      const dateText = String(data.Ngay || '') + ' lúc ' + String(data.Gio || '');
      const placeText = data.DiaDiem ? ' · Địa điểm: ' + data.DiaDiem : '';
      const message = String(data.DichVu || 'Công việc cưới') + ' – ' + String(data.KhachHang || 'Khách hàng') + ', ' + dateText + placeText + '. Còn khoảng ' + reminder.label + '. Vui lòng kiểm tra lịch và chuẩn bị.';
      dbService.updateQuanLyRecord(record.QuanLyID, { [reminder.key]: new Date().toISOString() }, systemUser);
      const assignedIds = Array.from(new Set([data.ThoChupID, data.MakeupID, data.ThoQuayID, data.NguoiPhuTrachID].filter(Boolean).map(String)));
      for (const staffId of assignedIds) dbService.addNotification('Nhắc lịch cưới trước ' + reminder.label, message, 'warning', staffId);
      dbService.addNotification('Sắp đến lịch cưới', message, 'warning');
      changed = true;
    }

    if (changed) await dbService.saveAndVerify();
  }

  /**
   * Check schedule in GMT+7 (Vietnam Time)
   */
  public async checkScheduledJobs() {
    if (this.isRunning) return;
    try {
      await this.checkWeddingReminders();
    } catch (err) {
      console.error('[Automation] Wedding reminder error:', err);
    }

    const config = dbService.getConfig();
    if (!config.AutomationEnabled) return;

    try {
      // Calculate Vietnam Time (UTC+7)
      const nowUtc = new Date();
      const vnTime = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000);

      const day = vnTime.getUTCDate();
      const month = vnTime.getUTCMonth() + 1; // 1-12
      const year = vnTime.getUTCFullYear();
      const hours = String(vnTime.getUTCHours()).padStart(2, '0');
      const minutes = String(vnTime.getUTCMinutes()).padStart(2, '0');
      const currentTimeStr = `${hours}:${minutes}`;

      const currentMonthStr = `${String(month).padStart(2, '0')}/${year}`;

      // Check monthly payroll automation condition:
      // Day === 1 && time === config.TuDongTaoLuongGio (default "00:05")
      if (
        day === (config.TuDongTaoLuongNgay || 1) &&
        currentTimeStr === (config.TuDongTaoLuongGio || '00:05') &&
        this.lastExecutedMonth !== currentMonthStr
      ) {
        this.isRunning = true;
        console.log(`[Automation] Triggering monthly payroll for ${currentMonthStr}...`);
        
        const result = dbService.taoBangLuongThang(currentMonthStr, {
          HoTen: 'Hệ thống Automation',
          Email: 'system@hanhphambridal.vn',
        });

        this.lastExecutedMonth = currentMonthStr;
        dbService.updateConfig({ LanChayCuoi: new Date().toISOString() }, {
          HoTen: 'Hệ thống Automation',
          Email: 'system@hanhphambridal.vn',
        });

        dbService.logAudit(
          'Hệ thống Automation',
          'system@hanhphambridal.vn',
          'Tự động tạo bảng lương định kỳ (Scheduled Job)',
          `Đã tạo ${result.createdCount} bảng lương cho tháng ${currentMonthStr}. Bỏ qua ${result.skippedCount} nhân viên đã có.`
        );

        // Scheduled jobs run outside HTTP middleware, so explicitly await the
        // same verified Firestore durability barrier before marking the job done.
        await dbService.saveAndVerify();
        this.isRunning = false;
      }
    } catch (err) {
      console.error('[Automation] Error during scheduled job check:', err);
      this.isRunning = false;
    }
  }

  /**
   * Trigger automation manually (e.g. from UI button or API)
   */
  public runManualMonthlyPayroll(monthStr?: string): {
    createdCount: number;
    skippedCount: number;
    createdItems: string[];
    skippedItems: string[];
    month: string;
  } {
    const vnTime = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const defaultMonth = `${String(vnTime.getUTCMonth() + 1).padStart(2, '0')}/${vnTime.getUTCFullYear()}`;
    const targetMonth = monthStr || defaultMonth;

    const result = dbService.taoBangLuongThang(targetMonth, {
      HoTen: 'Admin (Kích hoạt thủ công)',
      Email: 'admin@hanhphambridal.vn',
    });

    dbService.updateConfig({ LanChayCuoi: new Date().toISOString() }, {
      HoTen: 'Admin (Kích hoạt thủ công)',
      Email: 'admin@hanhphambridal.vn',
    });

    return {
      ...result,
      month: targetMonth,
    };
  }

  public getStatus() {
    const config = dbService.getConfig();
    const vnTime = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const day = vnTime.getUTCDate();
    const month = vnTime.getUTCMonth() + 1;
    const year = vnTime.getUTCFullYear();

    // Next run estimate
    let nextMonth = month;
    let nextYear = year;
    if (day > 1 || (day === 1 && vnTime.getUTCHours() > 0)) {
      nextMonth = month === 12 ? 1 : month + 1;
      nextYear = month === 12 ? year + 1 : year;
    }
    const nextRun = `01/${String(nextMonth).padStart(2, '0')}/${nextYear} lúc ${config.TuDongTaoLuongGio || '00:05'} (GMT+7)`;

    return {
      enabled: config.AutomationEnabled,
      lastRun: config.LanChayCuoi || 'Chưa chạy trong phiên này',
      nextScheduledRun: nextRun,
      schedulePattern: `Ngày ${config.TuDongTaoLuongNgay || 1} hàng tháng lúc ${config.TuDongTaoLuongGio || '00:05'} (GMT+7)`,
      status: 'Đang hoạt động (Background Worker Ready)',
    };
  }
}

export const automationManager = new AutomationManager();
