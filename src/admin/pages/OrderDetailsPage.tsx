import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  MapPin,
  Package,
  Phone,
  Save,
  ShieldAlert,
  StickyNote,
  User,
} from 'lucide-react';
import { useAdminI18n } from '../lib/i18n';
import {
  getAdminSession,
  fetchOrder,
  fetchOrderHistory,
  updateInternalNotes,
  updateOrderPaymentStatus,
  updateOrderStatus,
} from '../data/adminApi';
import type { AdminOrder, StatusHistoryEntry } from '../lib/types';
import type { OrderStatus } from '../../types';
import { useAsync } from '../lib/useAsync';
import { currency, formatDate, formatDateTime } from '../lib/format';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  Field,
  InlineNotice,
  Modal,
  OrderStatusBadge,
  PageHeader,
  PaymentStatusBadge,
  Select,
  Skeleton,
  Textarea,
  ErrorState,
  useToast,
} from '../components/ui';
import { ADMIN_ROUTES } from '../components/AdminLayout';

const STATUS_OPTIONS: OrderStatus[] = [
  'Order Received',
  'Pending Verification',
  'Verification',
  'Confirmed',
  'Preparing',
  'Out for Delivery',
  'Delivered',
  'On Hold',
  'Cancelled',
  'Rejected',
];

const DetailRow: React.FC<{ label: string; value: React.ReactNode; icon?: React.ReactNode }> = ({
  label,
  value,
  icon,
}) => (
  <div className="flex items-start justify-between gap-4 py-2">
    <span className="flex items-center gap-1.5 text-[11.5px] text-slate-500">
      {icon}
      {label}
    </span>
    <span className="max-w-[62%] text-end text-[12.5px] font-medium text-slate-800">{value || '—'}</span>
  </div>
);

export const OrderDetailsPage: React.FC<{
  orderId: string;
  navigate: (path: string) => void;
}> = ({ orderId, navigate }) => {
  const { t, locale } = useAdminI18n();
  const toast = useToast();
  const session = getAdminSession();
  const canWrite = Boolean(session?.permissions.includes('orders.write'));
  const canCancel = Boolean(session?.permissions.includes('orders.cancel'));

  const orderQuery = useAsync(() => fetchOrder(orderId), [orderId]);
  const order = orderQuery.data;

  const historyQuery = useAsync<StatusHistoryEntry[]>(
    () => (order ? fetchOrderHistory(order.id) : Promise.resolve([])),
    [order?.id]
  );

  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>('Confirmed');
  const [statusNotes, setStatusNotes] = useState('');
  const [confirm, setConfirm] = useState<null | 'cancel' | 'reject' | 'hold' | 'paid'>(null);
  const [reason, setReason] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (order) {
      setNotes(order.internal_notes || '');
      setSelectedStatus(order.order_status);
    }
  }, [order?.id, order?.internal_notes, order?.order_status]);

  const timeline = useMemo(() => {
    const entries = historyQuery.data || [];
    if (entries.length) return entries;
    if (!order) return [];
    return [
      {
        id: `current-${order.id}`,
        order_id: order.id,
        status: order.order_status,
        notes: null,
        created_at: order.created_at,
        created_by: 'Customer requisition',
      },
    ] as StatusHistoryEntry[];
  }, [historyQuery.data, order]);

  const reloadAll = () => {
    orderQuery.reload();
    historyQuery.reload();
  };

  const applyStatus = async (status: OrderStatus, note?: string) => {
    if (!order) return;
    setWorking(true);
    try {
      await updateOrderStatus(order.id, status, { notes: note, actorName: session?.name });
      toast.push(t('orders.statusUpdated'));
      setStatusModal(false);
      setConfirm(null);
      setReason('');
      reloadAll();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : t('error.load'), 'error');
    } finally {
      setWorking(false);
    }
  };

  const saveNotes = async () => {
    if (!order) return;
    setSavingNotes(true);
    try {
      await updateInternalNotes(order.id, notes);
      toast.push(t('orders.notesSaved'));
      orderQuery.reload();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : t('error.load'), 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  const markPaid = async () => {
    if (!order) return;
    setWorking(true);
    try {
      await updateOrderPaymentStatus(order.id, 'Paid');
      toast.push(t('orders.paymentUpdated'));
      setConfirm(null);
      orderQuery.reload();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : t('error.load'), 'error');
    } finally {
      setWorking(false);
    }
  };

  if (orderQuery.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (orderQuery.error || !order) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate(ADMIN_ROUTES.orders)}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5 rtl:-scale-x-100" /> {t('orders.back')}
        </button>
        <Card>
          <ErrorState message={t('orders.notFoundHint')} onRetry={reloadAll} />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(ADMIN_ROUTES.orders)}
        className="mb-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-3.5 w-3.5 rtl:-scale-x-100" /> {t('orders.back')}
      </button>

      <PageHeader
        title={order.order_number}
        breadcrumb={t('orders.detailsTitle')}
        subtitle={`${formatDateTime(order.created_at, locale)} · ${order.customer_name}`}
        actions={
          <>
            <Badge tone="neutral">
              <PaymentStatusBadge status={order.payment_status} />
            </Badge>
            <OrderStatusBadge status={order.order_status} />
            {canWrite ? (
              <Button size="sm" variant="primary" onClick={() => setStatusModal(true)}>
                {t('orders.updateStatus')}
              </Button>
            ) : null}
          </>
        }
      />

      {!canWrite ? (
        <div className="mb-4">
          <InlineNotice tone="warning">{t('common.readOnly')}</InlineNotice>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title={t('orders.customerInfo')} action={<User className="h-3.5 w-3.5 text-slate-400" />} />
            <div className="divide-y divide-slate-100 px-5 pb-3">
              <DetailRow label={t('common.customer')} value={order.customer_name} />
              <DetailRow label={t('common.phone')} value={order.customer_phone} icon={<Phone className="h-3 w-3" />} />
              <DetailRow label={t('common.email')} value={order.customer_email} />
              <DetailRow label={t('orders.patient')} value={`${order.patient_name || order.customer_name}${order.patient_age ? ` · ${order.patient_age}` : ''}`} />
              <DetailRow label={t('orders.hospital')} value={order.hospital_name || order.department} icon={<Building2 className="h-3 w-3" />} />
            </div>
          </Card>

          <Card>
            <CardHeader title={t('orders.productInfo')} action={<Package className="h-3.5 w-3.5 text-slate-400" />} />
            <div className="divide-y divide-slate-100 px-5 pb-3">
              <DetailRow label={t('orders.colProduct')} value={order.product_name} />
              <DetailRow label={t('orders.filterProduct')} value={order.product_type_name} />
              <DetailRow
                label={t('orders.colBlood')}
                value={
                  <span className="inline-flex min-w-8 items-center justify-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11.5px] font-bold">
                    {order.blood_type}
                  </span>
                }
              />
              <DetailRow label={t('orders.unitPrice')} value={currency(order.unit_price, locale)} />
              <DetailRow label={t('orders.colQty')} value={order.quantity} />
              <DetailRow label={t('orders.subtotal')} value={currency(order.subtotal, locale)} />
              <DetailRow label={t('orders.deliveryFee')} value={currency(order.delivery_fee, locale)} />
              <DetailRow
                label={t('orders.total')}
                value={<span className="text-[14px] font-semibold text-slate-900">{currency(order.total, locale)}</span>}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title={t('orders.deliveryInfo')} action={<MapPin className="h-3.5 w-3.5 text-slate-400" />} />
            <div className="divide-y divide-slate-100 px-5 pb-3">
              <DetailRow label={t('delivery.filterGov')} value={order.governorate_name} />
              <DetailRow label={t('delivery.filterCity')} value={order.city_name} />
              <DetailRow label={t('orders.colArea')} value={order.area_name} />
              <DetailRow
                label={t('common.notes')}
                value={
                  [order.delivery_address, order.manual_delivery_address, order.delivery_building, order.delivery_floor, order.delivery_apartment, order.delivery_landmark]
                    .filter(Boolean)
                    .join(' · ') || '—'
                }
              />
              <DetailRow label={t('common.phone')} value={order.delivery_phone} />
              {order.notes ? <DetailRow label={t('orders.customerNotes')} value={order.notes} /> : null}
            </div>
          </Card>

          <Card>
            <CardHeader
              title={t('orders.internalNotes')}
              subtitle={t('orders.internalNotesHint')}
              action={<StickyNote className="h-3.5 w-3.5 text-slate-400" />}
            />
            <div className="px-5 pb-5">
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('orders.internalNotesHint')}
                disabled={!canWrite}
              />
              {canWrite ? (
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={saveNotes}
                    loading={savingNotes}
                    disabled={notes === (order.internal_notes || '')}
                    icon={<Save className="h-3.5 w-3.5" />}
                  >
                    {t('common.save')}
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title={t('orders.paymentInfo')} />
            <div className="divide-y divide-slate-100 px-5 pb-4">
              <DetailRow label={t('orders.method')} value={order.payment_method} />
              <DetailRow label={t('common.amount')} value={currency(order.total, locale)} />
              <DetailRow label={t('common.status')} value={<PaymentStatusBadge status={order.payment_status} />} />
              <DetailRow label={t('orders.paymobRef')} value={order.paymob_order_id || '—'} />
              <DetailRow label={t('orders.transactionId')} value={order.paymob_transaction_id || '—'} />
              <DetailRow
                label={t('orders.paymentDate')}
                // Only a verified gateway reference gives us a trustworthy payment timestamp;
                // updated_at moves on every status change and must not be shown as one.
                value={
                  order.paymob_transaction_id && order.payment_status === 'Paid'
                    ? formatDateTime(order.updated_at || order.created_at, locale)
                    : '—'
                }
              />
            </div>
            {canWrite && order.payment_status !== 'Paid' ? (
              <div className="border-t border-slate-100 px-5 py-3">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setConfirm('paid')}
                  icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                >
                  {t('orders.markPaid')}
                </Button>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-slate-400">{t('orders.markPaidHint')}</p>
              </div>
            ) : null}
          </Card>

          {canWrite ? (
            <Card>
              <CardHeader title={t('orders.updateStatus')} />
              <div className="space-y-2 px-5 pb-4">
                <Select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
                  aria-label={t('orders.selectStatus')}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  onClick={() => setConfirm('hold')}
                  disabled={order.order_status === 'On Hold'}
                >
                  {t('orders.placeOnHold')}
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setConfirm('cancel')}
                    disabled={!canCancel || ['Cancelled', 'Rejected', 'Delivered'].includes(order.order_status)}
                  >
                    {t('orders.cancelOrder')}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setConfirm('reject')}
                    disabled={!canCancel || ['Cancelled', 'Rejected', 'Delivered'].includes(order.order_status)}
                  >
                    {t('orders.rejectOrder')}
                  </Button>
                </div>
                <p className="pt-1 text-[10.5px] leading-relaxed text-slate-400">{t('orders.auditHint')}</p>
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title={t('orders.timeline')} />
            <div className="px-5 pb-5">
              {historyQuery.loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <ol className="relative space-y-4 border-s border-slate-200 ps-4">
                  {timeline.map((entry, index) => (
                    <li key={entry.id} className="relative">
                      <span
                        className={`absolute -start-[22px] top-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-white ${
                          index === timeline.length - 1 ? 'bg-[#c8102e]' : 'bg-slate-300'
                        }`}
                      />
                      <div className="flex flex-wrap items-center gap-1.5">
                        <OrderStatusBadge status={entry.status} />
                        <span className="text-[10.5px] text-slate-400">
                          {formatDateTime(entry.created_at, locale)}
                        </span>
                      </div>
                      {entry.notes ? (
                        <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600">{entry.notes}</p>
                      ) : null}
                      {entry.created_by ? (
                        <p className="mt-0.5 text-[10.5px] text-slate-400">
                          {langPrefix(entry.created_by)} {entry.created_by}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Status change modal */}
      <Modal
        open={statusModal}
        onClose={() => setStatusModal(false)}
        title={t('orders.updateStatus')}
        description={`${order.order_number} · ${order.order_status}`}
        footer={
          <>
            <Button size="sm" variant="ghost" onClick={() => setStatusModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              size="sm"
              variant="primary"
              loading={working}
              onClick={() =>
                applyStatus(
                  selectedStatus,
                  statusNotes || `Status changed from ${order.order_status} to ${selectedStatus}.`
                )
              }
            >
              {t('common.confirm')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t('orders.selectStatus')} required>
            <Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('common.notes')} hint={t('orders.auditHint')}>
            <Textarea
              rows={3}
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder={t('orders.reasonPlaceholder')}
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm === 'paid'}
        title={t('orders.confirmMarkPaid')}
        description={t('orders.confirmMarkPaidBody')}
        confirmLabel={t('orders.markPaid')}
        loading={working}
        onConfirm={markPaid}
        onClose={() => setConfirm(null)}
      />

      <ConfirmDialog
        open={confirm === 'hold'}
        title={t('orders.confirmHold')}
        description={t('orders.confirmHoldBody')}
        confirmLabel={t('orders.placeOnHold')}
        loading={working}
        onConfirm={() => applyStatus('On Hold')}
        onClose={() => setConfirm(null)}
      />

      <ConfirmDialog
        open={confirm === 'cancel' || confirm === 'reject'}
        title={confirm === 'reject' ? t('orders.confirmReject') : t('orders.confirmCancel')}
        description={confirm === 'reject' ? t('orders.confirmRejectBody') : t('orders.confirmCancelBody')}
        confirmLabel={confirm === 'reject' ? t('orders.rejectOrder') : t('orders.cancelOrder')}
        danger
        loading={working}
        onConfirm={() =>
          applyStatus(
            confirm === 'reject' ? 'Rejected' : 'Cancelled',
            `Reason: ${reason || (confirm === 'reject' ? 'Rejected by operations' : 'Cancelled by operations')}`
          )
        }
        onClose={() => {
          setConfirm(null);
          setReason('');
        }}
      >
        <Field label={t('orders.reason')}>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('orders.reasonPlaceholder')} />
        </Field>
        <div className="mt-3">
          <InlineNotice tone="warning">
            <span className="inline-flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" /> {t('orders.confirmCancelBody')}
            </span>
          </InlineNotice>
        </div>
      </ConfirmDialog>
    </div>
  );
};

const langPrefix = (actor: string) => (/[\u0600-\u06FF]/.test(actor) ? 'بواسطة' : 'by');
