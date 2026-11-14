import { NotificationItem, OrderStatus } from '../types';

export interface DispatchNotificationParams {
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  phone: string;
  email: string;
  deliveryArea: string;
}

export interface NotificationConfig {
  enable_in_app: boolean;
  enable_sms: boolean;
  enable_whatsapp: boolean;
}

class NotificationService {
  private static instance: NotificationService;
  private listeners: Array<(notifications: NotificationItem[]) => void> = [];
  private notifications: NotificationItem[] = [];
  private config: NotificationConfig = {
    enable_in_app: true,
    enable_sms: true,
    enable_whatsapp: true,
  };

  constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public getConfig(): NotificationConfig {
    return { ...this.config };
  }

  public updateConfig(updated: Partial<NotificationConfig>) {
    this.config = { ...this.config, ...updated };
    try {
      localStorage.setItem('hemoportal_notif_config', JSON.stringify(this.config));
    } catch (e) {
      console.warn('Failed to save notif config', e);
    }
  }

  public sendNotification(payload: {
    type: string;
    channel: 'in_app' | 'sms' | 'whatsapp';
    title: string;
    message: string;
    recipient?: string;
  }) {
    const item: NotificationItem = {
      id: `manual-${Date.now()}`,
      title: payload.title,
      message: payload.recipient ? `[Recipient: ${payload.recipient}] ${payload.message}` : payload.message,
      type: 'order',
      channel: payload.channel,
      read: false,
      created_at: new Date().toISOString(),
    };
    this.notifications.unshift(item);
    this.notifyListeners();
  }

  private loadFromStorage() {
    try {
      const data = localStorage.getItem('hemoportal_notifications');
      if (data) {
        this.notifications = JSON.parse(data);
      } else {
        this.notifications = [
          {
            id: 'notif-welcome',
            title: 'Welcome to damdot Healthcare Platform',
            message: 'Your healthcare blood ordering portal is active. Review regulatory compliance requirements before submitting requests.',
            type: 'compliance',
            channel: 'in_app',
            read: false,
            created_at: new Date().toISOString(),
          },
        ];
        this.saveToStorage();
      }
    } catch {
      this.notifications = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('hemoportal_notifications', JSON.stringify(this.notifications));
    } catch (e) {
      console.warn('Failed to save notifications', e);
    }
  }

  public subscribe(callback: (notifications: NotificationItem[]) => void): () => void {
    this.listeners.push(callback);
    callback([...this.notifications]);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((callback) => callback([...this.notifications]));
    this.saveToStorage();
  }

  public getNotifications(): NotificationItem[] {
    return [...this.notifications];
  }

  public markAsRead(id: string) {
    this.notifications = this.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    this.notifyListeners();
  }

  public markAllAsRead() {
    this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
    this.notifyListeners();
  }

  public clearAll() {
    this.notifications = [];
    this.notifyListeners();
  }

  /**
   * Broadcasts events across multi-channel notification adapters (In-app, SMS, WhatsApp, Email)
   */
  public triggerOrderEvent(params: DispatchNotificationParams) {
    const { orderNumber, status, customerName, phone, email, deliveryArea } = params;
    const now = new Date().toISOString();

    let title = '';
    let message = '';
    let type: NotificationItem['type'] = 'order';

    switch (status) {
      case 'Order Received':
        title = `Order Received (${orderNumber})`;
        message = `Dear ${customerName}, your request for blood products has been registered. Our medical team is initiating document verification.`;
        break;
      case 'Verification':
        title = `Order in Verification (${orderNumber})`;
        message = `Medical verification in progress for order #${orderNumber}. Cross-matching and physician authorization check active.`;
        type = 'compliance';
        break;
      case 'Confirmed':
        title = `Order Confirmed (${orderNumber})`;
        message = `Order #${orderNumber} is confirmed! Blood bank inventory allocated. Packaging under cold-chain standards initiated.`;
        break;
      case 'Preparing':
        title = `Order Being Prepared (${orderNumber})`;
        message = `Thermal container calibration and cold-chain staging completed for #${orderNumber}.`;
        break;
      case 'Out for Delivery':
        title = `Out for Delivery (${orderNumber})`;
        message = `Courier dispatched to ${deliveryArea}. Temperature sensor logging 2°C–6°C. Delivery contact: ${phone}.`;
        type = 'delivery';
        break;
      case 'Delivered':
        title = `Order Delivered (${orderNumber})`;
        message = `Order #${orderNumber} successfully delivered and signed by authorized medical receiver.`;
        type = 'delivery';
        break;
      case 'On Hold':
        title = `Order On Hold (${orderNumber})`;
        message = `Order #${orderNumber} requires clinical clarification or additional cross-match authorization.`;
        type = 'compliance';
        break;
      case 'Cancelled':
        title = `Order Cancelled (${orderNumber})`;
        message = `Order #${orderNumber} has been cancelled. Allocated blood inventory returned to active reserve.`;
        type = 'order';
        break;
      case 'Rejected':
        title = `Order Rejected (${orderNumber})`;
        message = `Order #${orderNumber} did not meet clinical verification criteria or compatible supply is depleted.`;
        type = 'compliance';
        break;
      default:
        title = `Order Status Update: ${status} (${orderNumber})`;
        message = `Status updated for order #${orderNumber} to "${status}".`;
    }

    // 1. Add In-App notification
    const inAppNotification: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title,
      message,
      type,
      channel: 'in_app',
      order_number: orderNumber,
      read: false,
      created_at: now,
    };

    // 2. Simulated SMS Notification
    const smsNotification: NotificationItem = {
      id: `sms-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: `[SMS to ${phone}] ${title}`,
      message: `SMS Sent: "${message}"`,
      type,
      channel: 'sms',
      order_number: orderNumber,
      read: false,
      created_at: now,
    };

    // 3. Simulated WhatsApp Notification
    const whatsappNotification: NotificationItem = {
      id: `wa-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: `[WhatsApp to ${phone}] Blood Supply Alert`,
      message: `WA Message: "damdot alert for #${orderNumber}: ${message}"`,
      type,
      channel: 'whatsapp',
      order_number: orderNumber,
      read: false,
      created_at: now,
    };

    this.notifications.unshift(inAppNotification, smsNotification, whatsappNotification);
    this.notifyListeners();
  }
}

export const notificationService = NotificationService.getInstance();
