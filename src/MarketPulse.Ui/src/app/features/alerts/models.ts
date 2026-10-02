export type PriceSide = 'Bid' | 'Ask';
export type AlertDirection = 'Above' | 'Below';
export type AlertEventStatus = 'Pending' | 'Notified' | 'Failed';
export type NotificationChannel = 'Email' | 'InApp';
export type DeliveryStatus = 'Pending' | 'Sent' | 'Failed';
export const ALERT_EVENT_STATUSES: readonly AlertEventStatus[] = ['Pending', 'Notified', 'Failed'];

export interface PriceAlert {
  id: string;
  instrumentId: string;
  symbol: string;
  priceSide: PriceSide;
  direction: AlertDirection;
  threshold: number;
  isEnabled: boolean;
  createdAt: string;
}

export interface PriceAlertQuery {
  instrumentId?: string;
  isEnabled?: boolean;
  page: number;
}

export interface CreatePriceAlert {
  instrumentId: string;
  priceSide: PriceSide;
  direction: AlertDirection;
  threshold: number;
}

export interface Delivery {
  channel: NotificationChannel;
  status: DeliveryStatus;
  attemptCount: number;
  sentAt: string | null;
}

export interface AlertEvent {
  id: string;
  priceAlertId: string;
  observedPrice: number;
  triggeredAt: string;
  status: AlertEventStatus;
  deliveries: Delivery[];
}

export interface AlertEventQuery {
  alertId?: string;
  status?: AlertEventStatus;
  page: number;
}
