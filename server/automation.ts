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

  /**
   * Check schedule in GMT+7 (Vietnam Time)
   */
  public async checkScheduledJobs() {
    const config = dbService.getConfig();
    if (!config.AutomationEnabled || this.isRunning) {
      return;
    }

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
