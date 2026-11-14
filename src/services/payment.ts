import { PaymentMethod, PaymentStatus } from '../types';

export interface PaymentProcessRequest {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency?: string;
  method: PaymentMethod;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  cardDetails?: {
    cardholderName: string;
    cardNumberLast4: string; // ONLY last 4 digits stored or passed
    expiry: string;
    // Security note: raw PAN & CVV are strictly handled in frontend memory only, never stored in DB
  };
}

export interface PaymentProcessResult {
  success: boolean;
  transactionId: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  timestamp: string;
  gatewayMessage: string;
  provider: 'Simulator' | 'Stripe' | 'Paymob' | 'Fawry' | 'CashCourier';
}

export interface PaymobIntentionResponse {
  success: boolean;
  isTestMode: boolean;
  clientSecret: string;
  publicKey: string;
  intentionId: string;
  orderId?: number | string;
  unifiedCheckoutUrl?: string;
  amount?: number;
  currency?: string;
  message?: string;
}

export interface PaymobConfigResponse {
  configured: boolean;
  publicKey: string;
  testMode: boolean;
  currency: string;
  supportedMethods: string[];
}

/**
 * Payment Gateway Adapter Interface.
 * Allows effortless plug-and-play swapping of actual gateways (e.g. Stripe, Paymob, Fawry)
 * without touching checkout or order management logic.
 */
export class PaymentService {
  private static instance: PaymentService;

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  /**
   * Create Paymob Unified Checkout Intention via Backend
   */
  public async createPaymobIntention(params: {
    amount: number;
    currency?: string;
    orderNumber?: string;
    customer: {
      first_name?: string;
      last_name?: string;
      name?: string;
      email: string;
      phone_number?: string;
      phone?: string;
    };
    billing_data?: {
      first_name?: string;
      last_name?: string;
      email?: string;
      phone_number?: string;
      apartment?: string;
      floor?: string;
      street?: string;
      building?: string;
      city?: string;
      state?: string;
      country?: string;
    };
    items?: Array<{
      name: string;
      amount: number;
      quantity: number;
      description?: string;
    }>;
  }): Promise<PaymobIntentionResponse> {
    // Sanitize phone number for Paymob (strictly max 15 characters, no spaces, international format)
    const sanitizePhone = (raw?: string): string => {
      if (!raw || typeof raw !== 'string') return '+201000000000';
      const englishDigits = raw.replace(/[٠-٩]/g, (d) => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
      const hasPlus = englishDigits.trim().startsWith('+');
      let clean = englishDigits.replace(/[^\d]/g, '');
      if (!clean) return '+201000000000';
      if (hasPlus) {
        clean = '+' + clean;
      } else if (clean.startsWith('01')) {
        clean = '+20' + clean.slice(1);
      } else if (clean.startsWith('201')) {
        clean = '+' + clean;
      } else {
        clean = '+' + clean;
      }
      return clean.slice(0, 15);
    };

    const splitName = (name?: string) => {
      if (!name || typeof name !== 'string') return { first: 'Medical', last: 'Requester' };
      const parts = name.trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return { first: 'Medical', last: 'Requester' };
      if (parts.length === 1) return { first: parts[0], last: 'Requester' };
      return { first: parts[0], last: parts.slice(1).join(' ') };
    };

    const parsed = splitName(params.customer.name || `${params.customer.first_name || ''} ${params.customer.last_name || ''}`);
    const firstName = (params.customer.first_name && params.customer.first_name.trim()) || parsed.first;
    const lastName = (params.customer.last_name && params.customer.last_name.trim()) || parsed.last;
    const sanitizedPhone = sanitizePhone(params.customer.phone_number || params.customer.phone);
    const sanitizedEmail = (params.customer.email && params.customer.email.trim()) || 'requisition@damdot.eg';

    const sanitizedParams = {
      ...params,
      customer: {
        ...params.customer,
        first_name: firstName,
        last_name: lastName,
        email: sanitizedEmail,
        phone_number: sanitizedPhone,
      },
      billing_data: {
        first_name: firstName,
        last_name: lastName,
        email: sanitizedEmail,
        phone_number: sanitizedPhone,
        apartment: (params.billing_data?.apartment && String(params.billing_data.apartment).trim()) || '1',
        floor: (params.billing_data?.floor && String(params.billing_data.floor).trim()) || '1',
        street: (params.billing_data?.street && String(params.billing_data.street).trim()) || 'Medical Facility Road',
        building: (params.billing_data?.building && String(params.billing_data.building).trim()) || '1',
        city: (params.billing_data?.city && String(params.billing_data.city).trim()) || 'Cairo',
        state: (params.billing_data?.state && String(params.billing_data.state).trim()) || 'Cairo',
        country: 'EG',
      },
    };

    // All Paymob API calls must go through the backend (never expose secrets in browser)
    try {
      const res = await fetch('/api/paymob/create-intention', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedParams),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && (data.unifiedCheckoutUrl || data.clientSecret)) {
          return data;
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create Paymob payment intention');
      }
    } catch (err: any) {
      console.error('[PaymentService] Failed to create Paymob intention via backend:', err);
      throw err;
    }
  }

  /**
   * Query Paymob gateway status and public keys
   */
  public async getPaymobConfig(): Promise<PaymobConfigResponse> {
    try {
      const res = await fetch('/api/paymob/config');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('[PaymentService] Failed to load Paymob config:', e);
    }

    return {
      configured: false,
      publicKey: '',
      testMode: false,
      currency: 'EGP',
      supportedMethods: [
        'Cards (Visa, Mastercard, Meeza)',
        'Mobile Wallets (Vodafone Cash, InstaPay, Orange, Etisalat, WE)',
        'Kiosks / Cash',
      ],
    };
  }

  /**
   * Process payment request with simulated gateway handling or COD registration
   */
  public async processPayment(req: PaymentProcessRequest): Promise<PaymentProcessResult> {
    const timestamp = new Date().toISOString();

    if (req.method === 'Cash on Delivery') {
      return {
        success: true,
        transactionId: `COD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        status: 'Cash on Delivery',
        paymentMethod: 'Cash on Delivery',
        timestamp,
        gatewayMessage: 'Cash on delivery authorized. Verification required upon medical courier arrival.',
        provider: 'CashCourier',
      };
    }

    // Online Payment Simulation (Mock 3DS / Tokenization)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulation: if amount > 100000 reject, else accept
    if (req.amount > 100000) {
      return {
        success: false,
        transactionId: `TX-FAIL-${Date.now()}`,
        status: 'Failed',
        paymentMethod: 'Online Payment',
        timestamp,
        gatewayMessage: 'Transaction declined: Exceeds single clinical transaction authorization limit.',
        provider: 'Simulator',
      };
    }

    const txId = `TX-GATEWAY-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      success: true,
      transactionId: txId,
      status: 'Paid',
      paymentMethod: 'Online Payment',
      timestamp,
      gatewayMessage: `Online payment approved via clinical payment gateway. Auth Ref: ${txId}`,
      provider: 'Simulator',
    };
  }

  /**
   * Refund process abstraction
   */
  public async processRefund(orderNumber: string, amount: number, reason: string): Promise<boolean> {
    console.log(`[PaymentService] Processing refund of ${amount} for order ${orderNumber}. Reason: ${reason}`);
    await new Promise((resolve) => setTimeout(resolve, 800));
    return true;
  }
}

export const paymentService = PaymentService.getInstance();
