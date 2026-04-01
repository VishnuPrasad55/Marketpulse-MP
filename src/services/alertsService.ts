/**
 * Price Alerts Service
 * Monitors stock prices and fires browser notifications when thresholds are crossed.
 */

export type AlertCondition = 'above' | 'below' | 'change_pct_up' | 'change_pct_down';
export type AlertStatus = 'active' | 'triggered' | 'dismissed';

export interface PriceAlert {
  id: string;
  symbol: string;
  name: string;
  condition: AlertCondition;
  targetValue: number;
  currentValue: number;
  status: AlertStatus;
  createdAt: string;
  triggeredAt?: string;
  note?: string;
}

const STORAGE_KEY = 'mp_price_alerts';

class AlertsService {
  private alerts: PriceAlert[] = [];
  private listeners: ((alerts: PriceAlert[]) => void)[] = [];
  private notificationPermission: NotificationPermission = 'default';

  constructor() {
    this.load();
    this.requestNotificationPermission();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.alerts = JSON.parse(raw);
    } catch { this.alerts = []; }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.alerts));
    } catch { /* storage full */ }
    this.listeners.forEach(fn => fn([...this.alerts]));
  }

  private async requestNotificationPermission(): Promise<void> {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      this.notificationPermission = 'granted';
      return;
    }
    if (Notification.permission !== 'denied') {
      this.notificationPermission = await Notification.requestPermission();
    }
  }

  private fireNotification(alert: PriceAlert, price: number): void {
    const body = this.conditionDescription(alert, price);
    // In-app toast always fires
    this.listeners.forEach(fn => fn([...this.alerts]));

    // Browser notification if permitted
    if (this.notificationPermission === 'granted' && 'Notification' in window) {
      try {
        new Notification(`🔔 ${alert.symbol} Alert`, {
          body,
          icon: '/vite.svg',
          tag: alert.id,
        });
      } catch { /* ignore */ }
    }
  }

  private conditionDescription(alert: PriceAlert, price: number): string {
    const fmt = (v: number) => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    switch (alert.condition) {
      case 'above':       return `${alert.symbol} rose above ${fmt(alert.targetValue)} — now at ${fmt(price)}`;
      case 'below':       return `${alert.symbol} fell below ${fmt(alert.targetValue)} — now at ${fmt(price)}`;
      case 'change_pct_up':   return `${alert.symbol} is up ${alert.targetValue}%+ today`;
      case 'change_pct_down': return `${alert.symbol} is down ${alert.targetValue}%+ today`;
      default: return `${alert.symbol} alert triggered at ${fmt(price)}`;
    }
  }

  // ─── Check prices (call this every minute with fresh quotes) ──────────────
  checkPrices(quotes: Record<string, { price: number; changePercent: number }>): PriceAlert[] {
    const triggered: PriceAlert[] = [];

    this.alerts
      .filter(a => a.status === 'active')
      .forEach(alert => {
        const q = quotes[alert.symbol];
        if (!q) return;

        let shouldTrigger = false;
        switch (alert.condition) {
          case 'above':           shouldTrigger = q.price >= alert.targetValue; break;
          case 'below':           shouldTrigger = q.price <= alert.targetValue; break;
          case 'change_pct_up':   shouldTrigger = q.changePercent >= alert.targetValue; break;
          case 'change_pct_down': shouldTrigger = q.changePercent <= -Math.abs(alert.targetValue); break;
        }

        if (shouldTrigger) {
          alert.status = 'triggered';
          alert.triggeredAt = new Date().toISOString();
          alert.currentValue = q.price;
          triggered.push(alert);
          this.fireNotification(alert, q.price);
        }
      });

    if (triggered.length > 0) this.save();
    return triggered;
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────
  addAlert(params: Omit<PriceAlert, 'id' | 'status' | 'createdAt' | 'currentValue'>): PriceAlert {
    const alert: PriceAlert = {
      ...params,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      status: 'active',
      currentValue: 0,
      createdAt: new Date().toISOString(),
    };
    this.alerts.unshift(alert);
    this.save();
    return alert;
  }

  dismissAlert(id: string): void {
    const a = this.alerts.find(x => x.id === id);
    if (a) { a.status = 'dismissed'; this.save(); }
  }

  deleteAlert(id: string): void {
    this.alerts = this.alerts.filter(x => x.id !== id);
    this.save();
  }

  reactivateAlert(id: string): void {
    const a = this.alerts.find(x => x.id === id);
    if (a) { a.status = 'active'; a.triggeredAt = undefined; this.save(); }
  }

  getAlerts(filter?: AlertStatus): PriceAlert[] {
    if (filter) return this.alerts.filter(a => a.status === filter);
    return [...this.alerts];
  }

  getActiveCount(): number {
    return this.alerts.filter(a => a.status === 'active').length;
  }

  subscribe(fn: (alerts: PriceAlert[]) => void): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  conditionLabel(condition: AlertCondition): string {
    const map: Record<AlertCondition, string> = {
      above: 'Price rises above',
      below: 'Price falls below',
      change_pct_up: 'Day change % up by',
      change_pct_down: 'Day change % down by',
    };
    return map[condition];
  }
}

export const alertsService = new AlertsService();
