import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Order, UserProfile, OrderStatusHistoryItem, BloodTypeGroup } from '../types';
import { OrderStatusBadge } from '../components/common/OrderStatusBadge';
import {
  User,
  Package,
  RotateCcw,
  Phone,
  Mail,
  Calendar,
  Building,
  ShieldCheck,
  Clock,
  Search,
  CheckCircle,
  Edit3,
  MapPin,
  FileText,
  X,
  Printer,
  Copy,
  Check,
  Droplets,
  Eye,
  CreditCard,
  Truck,
  Sparkles,
  LogIn,
  Heart,
  PhoneCall,
  AlertCircle,
  Activity,
  FileCheck,
  Database,
  RefreshCw,
  Terminal,
  Code2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface CustomerAccountPageProps {
  onReorder: (order: Order) => void;
  onNavigateProducts: () => void;
  onOpenAuth?: (mode?: 'login' | 'register') => void;
  onBackHome?: () => void;
}

const BLOOD_TYPES: BloodTypeGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const CustomerAccountPage: React.FC<CustomerAccountPageProps> = ({
  onReorder,
  onNavigateProducts,
  onOpenAuth,
  onBackHome,
}) => {
  const { language, t, isRTL } = useLanguage();
  const BackChevron = isRTL ? ChevronRight : ChevronLeft;
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderHistory, setOrderHistory] = useState<OrderStatusHistoryItem[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'delivered'>('all');

  // Profile editing state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const SUPABASE_ALTER_SQL = `-- 1. Add Address and Medical Details to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS governorate_name TEXT,
ADD COLUMN IF NOT EXISTS city_name TEXT,
ADD COLUMN IF NOT EXISTS area_name TEXT,
ADD COLUMN IF NOT EXISTS default_address TEXT,
ADD COLUMN IF NOT EXISTS building_floor TEXT,
ADD COLUMN IF NOT EXISTS landmark TEXT,
ADD COLUMN IF NOT EXISTS blood_type TEXT,
ADD COLUMN IF NOT EXISTS emergency_phone TEXT,
ADD COLUMN IF NOT EXISTS national_id TEXT;

-- 2. (Optional) Create delivery_addresses table for multiple saved addresses
CREATE TABLE IF NOT EXISTS public.delivery_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    governorate_name TEXT NOT NULL,
    city_name TEXT NOT NULL,
    area_name TEXT NOT NULL,
    address TEXT NOT NULL,
    building TEXT,
    landmark TEXT,
    phone TEXT,
    is_default BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_ALTER_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleManualSupabaseSync = async () => {
    setIsSyncingSupabase(true);
    try {
      const res = await db.forceSupabaseSync();
      loadData();
      setSyncNotice(res.message);
      setTimeout(() => setSyncNotice(null), 4500);
    } catch (e: any) {
      setSyncNotice('Sync failed: ' + (e?.message || 'Unknown error'));
      setTimeout(() => setSyncNotice(null), 4500);
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  // Edit form state tailored for normal individuals / families
  const [editForm, setEditForm] = useState<{
    full_name: string;
    phone: string;
    emergency_contact_name: string;
    emergency_phone: string;
    blood_type: BloodTypeGroup;
    national_id: string;
    age: number | string;
    gender: 'male' | 'female';
    account_type: 'individual' | 'family';
    willing_to_donate: boolean;
    preferred_hospital: string;
    medical_notes: string;
    default_address: string;
    building_floor: string;
    landmark: string;
    city_name: string;
    area_name: string;
    governorate_name: string;
  }>({
    full_name: '',
    phone: '',
    default_address: '',
    building_floor: '',
    landmark: '',
    city_name: '',
    area_name: '',
    governorate_name: '',
  });

  const loadData = () => {
    const user = db.getCurrentUser();
    setCurrentUser(user);
    if (user) {
      const userOrders = db.getOrdersByUser(user.id);
      setOrders(userOrders);
      setEditForm({
        full_name: user.full_name || '',
        phone: user.phone || '',
        default_address: user.default_address || '',
        building_floor: user.building_floor || '',
        landmark: user.landmark || '',
        city_name: user.city_name || '',
        area_name: user.area_name || '',
        governorate_name: user.governorate_name || '',
      });
    } else {
      const guestOrders = db.getGuestOrders();
      setOrders(guestOrders.length > 0 ? guestOrders : db.getOrders());
    }
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return () => unsub();
  }, []);

  const handleOpenOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    const hist = db.getOrderHistory(order.id);
    setOrderHistory(hist);
  };

  const handleCopyOrderNumber = (orderNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(orderNumber);
    setCopiedOrderId(orderNumber);
    setTimeout(() => setCopiedOrderId(null), 2500);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      db.updateProfile(currentUser.id, {
        full_name: editForm.full_name.trim(),
        phone: editForm.phone.trim(),
        default_address: editForm.default_address.trim(),
        building_floor: editForm.building_floor.trim(),
        landmark: editForm.landmark.trim(),
        city_name: editForm.city_name.trim(),
        area_name: editForm.area_name.trim(),
        governorate_name: editForm.governorate_name.trim(),
      });
      setIsEditModalOpen(false);
      setSaveSuccessNotice(true);
      setTimeout(() => setSaveSuccessNotice(false), 3500);
      loadData();
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  const handleQuickLoginAsPatient = () => {
    db.login('amribrahim924@gmail.com', 'password123');
    loadData();
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const q = searchFilter.toLowerCase().trim();
    const matchesQuery =
      !q ||
      o.order_number.toLowerCase().includes(q) ||
      o.product_name.toLowerCase().includes(q) ||
      o.blood_type.toLowerCase().includes(q) ||
      (o.patient_name && o.patient_name.toLowerCase().includes(q)) ||
      (o.hospital_name && o.hospital_name.toLowerCase().includes(q));

    if (!matchesQuery) return false;

    if (statusFilter === 'active') {
      return ['Order Received', 'Verification', 'Confirmed', 'Preparing', 'Out for Delivery'].includes(
        o.order_status
      );
    }
    if (statusFilter === 'delivered') {
      return o.order_status === 'Delivered';
    }
    return true;
  });

  // Calculate statistics
  const totalUnits = orders.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const deliveredCount = orders.filter((o) => o.order_status === 'Delivered').length;
  const activeCount = orders.filter((o) =>
    ['Order Received', 'Verification', 'Confirmed', 'Preparing', 'Out for Delivery'].includes(
      o.order_status
    )
  ).length;

  const currentBloodType: BloodTypeGroup = currentUser?.blood_type || 'A+';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 text-left rtl:text-right">
      {/* Navigation Breadcrumb / Back button */}
      <div className="flex items-center justify-between">
        <button
          id="account-back-home-btn"
          type="button"
          onClick={() => {
            if (onBackHome) {
              onBackHome();
            } else if (window.history.length > 1) {
              window.history.back();
            }
          }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 px-3.5 py-2 rounded-xl transition shadow-2xs cursor-pointer"
        >
          <BackChevron className="w-4 h-4" />
          <span>{language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</span>
        </button>
      </div>

      {/* Toast Notification on Save */}
      {saveSuccessNotice && (
        <div className="fixed top-20 right-4 rtl:right-auto rtl:left-4 z-50 bg-emerald-700 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm font-semibold animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="w-5 h-5 text-emerald-200 shrink-0" />
          <span>{t('profileSaveSuccess')}</span>
        </div>
      )}

      {/* Toast Notification on Supabase Sync */}
      {syncNotice && (
        <div className="fixed top-20 right-4 rtl:right-auto rtl:left-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-sm font-semibold animate-in fade-in slide-in-from-top-4 border border-slate-700">
          <Database className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* If Not Logged In */}
      {!currentUser && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <User className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'ar'
                  ? 'سجل الدخول لعرض ملفك الشخصي وطلبات أكياس الدم'
                  : 'Sign in to access your personal profile & blood bag requests'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ar'
                  ? 'يمكنك متابعة وتكرار طلبات أكياس الدم لنفسك أو لعائلتك وتعديل بيانات الاتصال وموقع التوصيل.'
                  : 'Track and reorder matching blood units, update your emergency contacts, and manage delivery addresses.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleQuickLoginAsPatient}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{language === 'ar' ? 'دخول سريع بحساب عمرو إبراهيم' : 'Login as Amr Ibrahim'}</span>
            </button>
            {onOpenAuth && (
              <>
                <button
                  id="btn-account-signin"
                  onClick={() => onOpenAuth('login')}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</span>
                </button>
                <button
                  id="btn-account-register"
                  onClick={() => onOpenAuth('register')}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm shadow-red-600/20"
                >
                  <User className="w-4 h-4" />
                  <span>{language === 'ar' ? 'إنشاء حساب جديد' : 'Create Account'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* User Profile Header Card */}
      {currentUser && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            {/* Avatar & Main Identity */}
            <div className="flex items-start sm:items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-red-500 text-white flex items-center justify-center font-black text-3xl shadow-lg shadow-red-600/20 shrink-0 ring-4 ring-red-50">
                {currentUser.full_name ? currentUser.full_name.charAt(0) : 'A'}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {currentUser.full_name}
                  </h1>

                  {/* Registered Customer Badge */}
                  <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200/80 flex items-center gap-1.5 shadow-2xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>{t('profileRequesterBadge')}</span>
                  </span>
                </div>

                {/* Subtitle with Location & Account status */}
                <p className="text-xs sm:text-sm text-slate-600 font-medium flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 text-slate-700 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-red-600" />
                    <span>
                      {currentUser.area_name || 'Corniche El Nile'}, {currentUser.city_name || 'Maadi'}, {currentUser.governorate_name || 'Cairo'}
                    </span>
                  </span>
                  <span>•</span>
                  <span className="text-slate-500">
                    {language === 'ar' ? 'حساب معتمد للطلب السريع والتوصيل المبرد' : 'Verified account for express cold-chain orders'}
                  </span>
                </p>

                {/* Contact Bar - Clean & Simple */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{currentUser.email}</span>
                  </span>

                  <span className="flex items-center gap-1.5 font-medium">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span dir="ltr">{currentUser.phone}</span>
                  </span>

                  <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 font-semibold">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    <span>{t('profileStatusActive')}</span>
                  </span>

                  <span className="flex items-center gap-1.5 text-slate-700 bg-slate-100/90 px-2.5 py-0.5 rounded-lg border border-slate-200 font-semibold text-xs">
                    <Database className="w-3 h-3 text-emerald-600" />
                    <span>Supabase: Connected</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Header Action Buttons: Edit Profile & Request Blood Bags */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto shrink-0 pt-2 lg:pt-0">
              <button
                id="btn-edit-profile"
                onClick={() => setIsEditModalOpen(true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold transition shadow-2xs"
              >
                <Edit3 className="w-4 h-4 text-slate-500" />
                <span>{t('profileEditBtn')}</span>
              </button>

              <button
                id="btn-request-blood-bags"
                onClick={onNavigateProducts}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs sm:text-sm font-bold transition shadow-md shadow-red-600/20"
              >
                <Droplets className="w-4 h-4 text-red-200" />
                <span>{t('requestBloodBagsBtn')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repurposed Digital Card: damdot Member Pass & Quick Order Card */}
      {currentUser && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 rounded-3xl p-6 sm:p-7 text-white border border-slate-700/80 shadow-xl relative overflow-hidden">
          {/* Subtle background decorative shapes */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-red-600/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-rose-500/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/10">
            {/* Header / Brand of Member Pass */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-600/30 text-white font-black text-xl shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold tracking-wider uppercase text-red-400">
                    {language === 'ar' ? 'دم دوت • بطاقة العضوية والطلب السريع' : 'damdot • Digital Member Pass'}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  {t('profileDigitalCard')}
                </h2>
              </div>
            </div>

            {/* Verified Member Badge */}
            <div className="flex items-center gap-3 bg-white/10 px-3.5 py-1.5 rounded-2xl border border-white/15">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-xs font-bold text-white">
                {language === 'ar' ? 'عضوية نشطة وموثقة' : 'Verified Member Pass'}
              </div>
            </div>
          </div>

          {/* Member Pass Body: 4 Functional Tiles */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-5 text-xs">
            {/* Tile 1: Member Name & Pass ID */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-1">
              <span className="text-slate-400 block text-[11px]">{t('profileFullName')}</span>
              <span className="font-bold text-white text-sm block truncate">{currentUser.full_name}</span>
              <div className="text-red-300 font-mono text-[11px] pt-1" dir="ltr">
                ID: DAM-{(currentUser.id || '92401').substring(0, 8).toUpperCase()}
              </div>
            </div>

            {/* Tile 2: Cold-Chain Courier Priority */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-1">
              <span className="text-slate-400 block text-[11px]">
                {language === 'ar' ? 'أولوية التوصيل السريع:' : 'Courier Service Priority:'}
              </span>
              <span className="font-bold text-emerald-300 text-xs block leading-relaxed flex items-center gap-1 pt-0.5">
                <Truck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>2°C–6°C Monitored Dispatch</span>
              </span>
              <span className="text-[10px] text-slate-300 block">
                {language === 'ar' ? 'تتبع فوري مع صندوق التبريد الطبي' : 'Real-time GPS & medical thermal box'}
              </span>
            </div>

            {/* Tile 3: Default Delivery Zone */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-1">
              <span className="text-slate-400 block text-[11px]">
                {language === 'ar' ? 'منطقة التوصيل المعتمدة:' : 'Primary Delivery Area:'}
              </span>
              <span className="font-bold text-white text-xs block truncate pt-0.5">
                {currentUser.city_name || 'Maadi'}, {currentUser.governorate_name || 'Cairo'}
              </span>
              <span className="text-[10px] text-slate-300 block truncate">
                {currentUser.default_address || 'Corniche El Nile'}
              </span>
            </div>

            {/* Tile 4: Total Requisitions */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-1">
              <span className="text-slate-400 block text-[11px]">
                {language === 'ar' ? 'إجمالي الطلبات:' : 'Requisitions Placed:'}
              </span>
              <span className="font-extrabold text-white text-base block pt-0.5">
                {orders.length} <span className="text-xs font-normal text-slate-300">{language === 'ar' ? 'طلب مسجل' : 'orders'}</span>
              </span>
              <span className="text-[10px] text-emerald-300 block">
                {activeCount > 0 ? `${activeCount} ${language === 'ar' ? 'قيد التوصيل الآن' : 'in active delivery'}` : (language === 'ar' ? 'جاهز لطلب جديد' : 'Ready for new order')}
              </span>
            </div>
          </div>

          {/* Member Pass Footer */}
          <div className="relative z-10 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{t('profileMemberPassDesc')}</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition flex items-center justify-center gap-1.5 border border-white/20"
                title="Print your digital member pass"
              >
                <FileCheck className="w-4 h-4 text-red-300" />
                <span>{t('profilePrintCard')}</span>
              </button>

              <button
                type="button"
                onClick={onNavigateProducts}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-red-600/30"
              >
                <Droplets className="w-4 h-4 text-red-200" />
                <span>{t('requestBloodBagsBtn')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simple Profile Information: 2 Clean Cards (Account Info & Delivery Address) */}
      {currentUser && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Account Information */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
                <User className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">{t('profilePersonalTitle')}</h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">{t('profileFullName')}</span>
                <span className="font-semibold text-slate-800 text-sm">{currentUser.full_name}</span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">{t('profileEmail')}</span>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800">{currentUser.email}</span>
                  <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                    {language === 'ar' ? 'موثق' : 'Verified'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">{t('profilePhone')}</span>
                <span className="font-mono font-semibold text-slate-800" dir="ltr">
                  {currentUser.phone}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500">
                <span>{t('profileStatus')}:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md">
                  {t('profileStatusActive')}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Default Delivery Address */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <MapPin className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">{t('profileDeliveryTitle')}</h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">{t('profileAddress')}</span>
                <span className="font-semibold text-slate-800">
                  {currentUser.default_address || (
                    <span className="text-slate-400 italic">
                      {language === 'ar' ? 'لم يتم تحديد عنوان بعد' : 'Not specified yet'}
                    </span>
                  )}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">{t('profileBuildingFloor')}</span>
                <span className="font-medium text-slate-800">
                  {currentUser.building_floor || (
                    <span className="text-slate-400 italic">
                      {language === 'ar' ? 'غير محدد' : 'Not specified'}
                    </span>
                  )}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">{t('profileLandmark')}</span>
                <span className="font-medium text-slate-700">
                  {currentUser.landmark || (
                    <span className="text-slate-400 italic">
                      {language === 'ar' ? 'غير محدد' : 'Not specified'}
                    </span>
                  )}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">{t('profileAreaCity')}</span>
                <span className="font-medium text-slate-700">
                  {[currentUser.area_name || currentUser.city_name, currentUser.governorate_name]
                    .filter(Boolean)
                    .join(', ') || (
                    <span className="text-slate-400 italic">
                      {language === 'ar' ? 'غير محدد' : 'Not specified'}
                    </span>
                  )}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500">
                <span>{language === 'ar' ? 'التوصيل المبرد السريع:' : 'Priority Cold-Chain:'}</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>2°C–6°C Monitored</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assistance Guidance Banner */}
      <div className="bg-gradient-to-r from-red-700 via-red-600 to-rose-700 text-white rounded-3xl p-6 sm:p-7 shadow-lg shadow-red-600/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-xs">
            <AlertCircle className="w-3.5 h-3.5 text-amber-300" />
            <span>{language === 'ar' ? 'خدمة توصيل أكياس الدم المبردة السريعة' : 'Express Monitored Blood Bag Delivery'}</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
            {language === 'ar' ? 'هل تحتاج أكياس دم لمريض أو عملية جراحية الآن؟' : 'Need blood bags for a patient or upcoming procedure?'}
          </h3>
          <p className="text-xs sm:text-sm text-red-100 max-w-2xl leading-relaxed">
            {language === 'ar'
              ? 'تتيح لك منصة دم دوت طلب أكياس دم مفحوصة ومطابقة مباشرة، مع نقل فوري مبرد بين 2° و 6° مئوية إليك .'
              : 'damdot lets you directly request screened, cross-matched blood bags with rapid cold-chain transport (2°C–6°C) to you.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0 w-full sm:w-auto">
          <a
            href="tel:+201015570651"
            className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition flex items-center gap-2 border border-white/30"
          >
            <PhoneCall className="w-4 h-4 text-amber-300" />
            <span>+20 101 557 0651</span>
          </a>

          <button
            onClick={onNavigateProducts}
            className="px-5 py-2.5 rounded-xl bg-white text-red-700 hover:bg-red-50 text-xs sm:text-sm font-black transition shadow-md flex items-center gap-2"
          >
            <Droplets className="w-4 h-4 text-red-600" />
            <span>{t('requestBloodBagsBtn')}</span>
          </button>
        </div>
      </div>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">{t('profileStatsOrders')}</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">{orders.length}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">{t('profileStatsUnits')}</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">{totalUnits}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">{t('profileStatsDelivered')}</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">{deliveredCount}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">{t('profileStatsActive')}</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">{activeCount}</div>
          </div>
        </div>
      </div>

      {/* Requisitions & Previous Orders Section */}
      <div className="space-y-5">
        {/* Controls: Title, Filter Tabs, and Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">{t('recentOrders')}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'ar'
                ? 'استعرض تفاصيل طلبات أكياس الدم الخاصة بك، تتبع درجات حرارة التوصيل، أو أعد طلب نفس الفصيلة بسهولة.'
                : 'Review your blood bag requests, view cold-chain temperature telemetry, and easily reorder matching blood units.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Filter Tabs */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('profileFilterAll')} ({orders.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === 'active'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('profileFilterActive')} ({activeCount})
              </button>
              <button
                onClick={() => setStatusFilter('delivered')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === 'delivered'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('profileFilterDelivered')} ({deliveredCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search
                className={`w-4 h-4 text-slate-400 absolute top-2.5 ${
                  isRTL ? 'right-3' : 'left-3'
                }`}
              />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder={
                  language === 'ar'
                    ? 'بحث بالرقم أو الفصيلة أو المريض...'
                    : 'Search order #, blood group, patient...'
                }
                className={`w-full py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-600/30 shadow-2xs ${
                  isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 mx-auto flex items-center justify-center">
              <Package className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">{t('noPastOrders')}</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {language === 'ar'
                  ? 'لم تقم بطلب أي أكياس دم حتى الآن. يمكنك تصفح المخزون المتاح وإرسال أول طلب بسهولة.'
                  : 'You have not submitted any blood bag requests yet. Browse certified inventory to place an order.'}
              </p>
            </div>
            <button
              onClick={onNavigateProducts}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition"
            >
              <Droplets className="w-4 h-4" />
              <span>{t('requestBloodBagsBtn')}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((ord) => (
              <div
                key={ord.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:border-red-200 hover:shadow-xs transition flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
              >
                {/* Left details */}
                <div className="space-y-2 flex-1">
                  {/* Top Badge Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={(e) => handleCopyOrderNumber(ord.order_number, e)}
                      className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition group"
                      title="Copy requisition number"
                    >
                      <span>#{ord.order_number}</span>
                      {copiedOrderId === ord.order_number ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
                      )}
                    </button>

                    <OrderStatusBadge status={ord.order_status} size="sm" />

                    <span
                      className="bg-red-700 text-white font-black text-xs px-2.5 py-1 rounded-md shadow-2xs flex items-center gap-1"
                      dir="ltr"
                    >
                      <Droplets className="w-3 h-3 text-red-200" />
                      <span>{ord.blood_type}</span>
                    </span>

                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                      {ord.product_type_name}
                    </span>

                    {ord.product_category && ord.product_category !== 'blood-bag' && (
                      <span className="text-[11px] font-bold text-red-800 bg-red-100 px-2.5 py-1 rounded-md border border-red-200">
                        {ord.product_category === 'plasma'
                          ? language === 'ar' ? 'بلازما' : 'Plasma'
                          : ord.product_category === 'phlebotomy'
                          ? language === 'ar' ? 'فصد علاجي' : 'Phlebotomy'
                          : ord.product_category === 'platelets'
                          ? language === 'ar' ? 'صفائح دموية' : 'Platelets'
                          : ord.product_category === 'other-products'
                          ? language === 'ar' ? 'منتجات أخرى' : 'Other Products'
                          : ord.product_category}
                      </span>
                    )}

                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100 hidden sm:inline-flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>2°C–6°C Monitored</span>
                    </span>
                  </div>

                  {/* Main Product Title */}
                  <h3 className="font-black text-slate-900 text-base sm:text-lg">
                    {language === 'ar'
                      ? `${ord.quantity} ${
                          ord.product_category === 'phlebotomy'
                            ? 'جلسة'
                            : ord.product_category === 'blood-bag'
                            ? 'أكياس'
                            : 'وحدات'
                        } من ${ord.product_name}`
                      : `${ord.quantity} ${
                          ord.product_category === 'phlebotomy'
                            ? 'Session(s)'
                            : ord.product_category === 'blood-bag'
                            ? 'Bag(s)'
                            : 'Unit(s)'
                        } of ${ord.product_name}`}
                  </h3>

                  {/* Secondary Details Row */}
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(ord.created_at).toLocaleDateString()}</span>
                    </span>

                    {ord.patient_name && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-slate-700">
                          {language === 'ar' ? `المريض: ${ord.patient_name}` : `Patient: ${ord.patient_name}`}
                          {ord.patient_age ? ` (${ord.patient_age} yrs)` : ''}
                        </span>
                      </>
                    )}

                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {ord.area_name}, {ord.city_name}
                      </span>
                    </span>

                    <span>•</span>
                    <span className="font-black text-slate-900 text-sm">
                      {language === 'ar'
                        ? `الإجمالي: ${ord.total.toLocaleString()} ج.م`
                        : `Total: EGP ${ord.total.toLocaleString()}`}
                    </span>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center gap-2.5 w-full lg:w-auto shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  {/* View Details Button */}
                  <button
                    onClick={() => handleOpenOrderDetails(ord)}
                    className="flex-1 lg:flex-initial px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/90 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-2xs"
                    title="View complete order and temperature logs"
                  >
                    <Eye className="w-4 h-4 text-slate-500" />
                    <span>{t('profileViewDetails')}</span>
                  </button>

                  {/* Reorder Button */}
                  <button
                    onClick={() => onReorder(ord)}
                    className="flex-1 lg:flex-initial px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-2xs"
                    title="Request same blood group and specifications again"
                  >
                    <RotateCcw className="w-4 h-4 text-red-600" />
                    <span>{t('reorderBtn')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: Edit Normal User Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 text-left rtl:text-right">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{t('profileEditBtn')}</h3>
                  <p className="text-xs text-slate-500">
                    {language === 'ar'
                      ? 'تعديل بيانات الاتصال، فصيلة الدم المسجلة، جهات اتصال الطوارئ، وعنوان الإقامة'
                      : 'Update your contact details, registered blood group, emergency contacts, and default address.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Section 1: Personal & Contact Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t('profilePersonalTitle')}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('profileFullName')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      className="w-full text-xs py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-600/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('profilePhone')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full text-xs py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-600/30"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Default Delivery Address */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t('profileDeliveryTitle')}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('profileAddress')}
                    </label>
                    <input
                      type="text"
                      value={editForm.default_address}
                      onChange={(e) => setEditForm({ ...editForm, default_address: e.target.value })}
                      placeholder={language === 'ar' ? 'اسم الشارع ورقم العقار...' : 'Street name & building number...'}
                      className="w-full text-xs py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-600/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('profileBuildingFloor')}
                    </label>
                    <input
                      type="text"
                      value={editForm.building_floor}
                      onChange={(e) => setEditForm({ ...editForm, building_floor: e.target.value })}
                      placeholder={language === 'ar' ? 'الدور الخامس، شقة 22' : 'Floor 5, Apt 22'}
                      className="w-full text-xs py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-600/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('profileLandmark')}
                    </label>
                    <input
                      type="text"
                      value={editForm.landmark}
                      onChange={(e) => setEditForm({ ...editForm, landmark: e.target.value })}
                      placeholder={language === 'ar' ? 'بجوار المعادي جراند مول' : 'Beside Maadi Grand Mall'}
                      className="w-full text-xs py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-600/30"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('profileAreaCity')}
                    </label>
                    <input
                      type="text"
                      value={editForm.city_name}
                      onChange={(e) => setEditForm({ ...editForm, city_name: e.target.value })}
                      placeholder={language === 'ar' ? 'المعادي، القاهرة' : 'Maadi, Cairo'}
                      className="w-full text-xs py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-600/30"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  {t('profileCancelBtn')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{t('profileSaveBtn')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Full Order Details & Timeline Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 text-left rtl:text-right">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">
                      {t('profileOrderDetailsTitle')}
                    </h3>
                    <OrderStatusBadge status={selectedOrder.order_status} size="sm" />
                  </div>
                  <p className="text-xs text-slate-500 font-mono" dir="ltr">
                    #{selectedOrder.order_number} • {new Date(selectedOrder.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                  title="Print receipt"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t('profilePrintReceipt')}</span>
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Product & Patient */}
              <div className="bg-slate-50 rounded-2xl p-5 space-y-3 border border-slate-200/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-red-600" />
                  <span>{language === 'ar' ? 'المنتج والمريض' : 'Product & Patient'}</span>
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{language === 'ar' ? 'المنتج المطلوب:' : 'Product:'}</span>
                    <span className="font-bold text-slate-900">{selectedOrder.product_name}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{language === 'ar' ? 'فصيلة الدم:' : 'Blood Group:'}</span>
                    <span className="bg-red-700 text-white font-black px-2 py-0.5 rounded text-xs" dir="ltr">
                      {selectedOrder.blood_type}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{language === 'ar' ? 'الكمية المطلوبة:' : 'Quantity:'}</span>
                    <span className="font-bold text-slate-900">
                      {selectedOrder.quantity} {language === 'ar' ? 'أكياس دم معتمدة' : 'Bags'}
                    </span>
                  </div>

                  {selectedOrder.patient_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{language === 'ar' ? 'اسم المريض:' : 'Patient Name:'}</span>
                      <span className="font-semibold text-slate-800">{selectedOrder.patient_name}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{language === 'ar' ? 'عمر المريض:' : 'Patient Age:'}</span>
                    <span className="font-medium text-slate-800">{selectedOrder.patient_age} yrs</span>
                  </div>

                  {selectedOrder.notes && (
                    <div className="pt-2 border-t border-slate-200 text-slate-600 italic">
                      "{selectedOrder.notes}"
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery & Destination */}
              <div className="bg-slate-50 rounded-2xl p-5 space-y-3 border border-slate-200/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  <span>{language === 'ar' ? 'الوجهة والاستلام' : 'Destination & Dispatch'}</span>
                </h4>

                <div className="space-y-2 text-xs">
                  {selectedOrder.hospital_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{language === 'ar' ? 'المستشفى:' : 'Hospital:'}</span>
                      <span className="font-bold text-slate-900">
                        {selectedOrder.hospital_name}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{language === 'ar' ? 'القسم / العنوان الفرعي:' : 'Unit / Notes:'}</span>
                    <span className="font-medium text-slate-800">
                      {selectedOrder.delivery_apartment || selectedOrder.department || 'Direct Delivery'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{language === 'ar' ? 'العنوان:' : 'Address:'}</span>
                    <span className="font-medium text-slate-800 text-right rtl:text-left truncate max-w-[180px]">
                      {selectedOrder.delivery_address}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{language === 'ar' ? 'المنطقة والمدينة:' : 'Area & City:'}</span>
                    <span className="font-medium text-slate-800">
                      {selectedOrder.area_name}, {selectedOrder.city_name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{language === 'ar' ? 'هاتف الاستلام:' : 'Recipient Phone:'}</span>
                    <span className="font-mono font-bold text-slate-800" dir="ltr">
                      {selectedOrder.delivery_phone}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financials & Billing Breakdown */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                <span>{language === 'ar' ? 'البيانات المالية والفاتورة' : 'Billing & Invoice Breakdown'}</span>
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>
                    {language === 'ar'
                      ? `سعر الوحدة (${selectedOrder.quantity} × ${selectedOrder.unit_price} ج.م)`
                      : `Unit Price (${selectedOrder.quantity} × EGP ${selectedOrder.unit_price})`}
                  </span>
                  <span className="font-medium">{selectedOrder.subtotal.toLocaleString()} EGP</span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>{language === 'ar' ? 'رسوم النقل المبرد الطارئ:' : 'Cold-Chain Dispatch Fee:'}</span>
                  <span className="font-medium">{selectedOrder.delivery_fee.toLocaleString()} EGP</span>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-black text-slate-900">
                  <span>{language === 'ar' ? 'الإجمالي النهائي:' : 'Total Amount:'}</span>
                  <span className="text-red-600 text-base">
                    {selectedOrder.total.toLocaleString()} {t('currency')}
                  </span>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    {language === 'ar' ? 'طريقة السداد:' : 'Payment Method:'}{' '}
                    <strong className="text-slate-700">{selectedOrder.payment_method}</strong>
                  </span>
                  <span className="bg-slate-100 px-2.5 py-0.5 rounded text-[11px] font-bold text-slate-700">
                    {selectedOrder.payment_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Cold-Chain Compliance Certificate */}
            <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200/80 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold text-emerald-900">
                  {language === 'ar'
                    ? 'شهادة المطابقة ونقل سلسلة التبريد المعتمدة'
                    : 'Validated Cold-Chain & Biological Screening Certificate'}
                </div>
                <p className="text-emerald-700 leading-relaxed">
                  {selectedOrder.internal_notes ||
                    (language === 'ar'
                      ? 'تم فحص ومطابقة فصيلة الدم مع العينات المصلية لمركز بنك الدم المعتمد. تم نقل الشحنة في حاوية حرارية مبردة مزودة بمسجل بيانات حراري مستمر (درجة الحرارة مسجلة بين 2° و 6° مئوية).'
                      : 'Screened against regional accredited blood-bank inventory. Transported in calibrated thermal cold-chain container with active continuous temperature logger (verified between 2°C and 6°C).')}
                </p>
              </div>
            </div>

            {/* Status Progression Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{t('profileTimelineTitle')}</span>
              </h4>

              <div className="space-y-3 relative before:absolute before:top-2 before:bottom-2 before:left-[17px] rtl:before:left-auto rtl:before:right-[17px] before:w-0.5 before:bg-slate-200">
                {orderHistory.map((item, index) => (
                  <div key={item.id || index} className="flex items-start gap-3 relative z-10 text-xs">
                    <div className="w-9 h-9 rounded-full bg-white border-2 border-red-600 text-red-600 flex items-center justify-center shrink-0 shadow-2xs font-bold">
                      <Check className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-bold text-slate-900">{item.status}</span>
                        <span className="text-[11px] text-slate-400 font-mono" dir="ltr">
                          {new Date(item.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {item.notes && <p className="text-slate-600 mt-1">{item.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  const ord = selectedOrder;
                  setSelectedOrder(null);
                  onReorder(ord);
                }}
                className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center gap-1.5 border border-red-200 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('reorderBtn')}</span>
              </button>

              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
              >
                {t('profileClose')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supabase Schema / Address Columns Setup Modal */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8">
            <button
              onClick={() => setIsSqlModalOpen(false)}
              className="absolute top-6 right-6 rtl:right-auto rtl:left-6 text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  {language === 'ar' ? 'إضافة أعمدة العنوان إلى جدول profiles في Supabase' : 'Add Address Columns to Supabase Profiles'}
                </h3>
                <p className="text-xs text-slate-500">
                  {language === 'ar'
                    ? 'نفذ هذه الأوامر في محرر SQL في لوحة تحكم Supabase لتخزين بيانات المحافظة والمدينة والعنوان تلقائياً'
                    : 'Run this in your Supabase SQL Editor so address fields are stored directly in your profiles table'}
                </p>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-4 my-4 relative overflow-hidden font-mono text-xs text-slate-200 border border-slate-800">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Supabase SQL Editor Query</span>
                </span>
                <button
                  onClick={handleCopySql}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">{language === 'ar' ? 'تم النسخ!' : 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'نسخ الكود' : 'Copy SQL'}</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="overflow-x-auto whitespace-pre leading-relaxed text-emerald-300 py-1" dir="ltr">
                {SUPABASE_ALTER_SQL}
              </pre>
            </div>

            <div className="bg-blue-50/80 rounded-2xl p-4 border border-blue-100 text-xs text-blue-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>{language === 'ar' ? 'كيف يعمل النظام تلقائياً؟' : 'How does registration handle this?'}</span>
              </p>
              <p className="text-blue-800/90 leading-relaxed">
                {language === 'ar'
                  ? '1. يتم حفظ كافة بيانات العنوان وفصيلة الدم تلقائياً داخل بيانات المستخدم (User Metadata) في Supabase Auth فور التسجيل. 2. بعد تشغيل أمر ALTER TABLE أعلاه، سيقوم النظام تلقائياً بملء أعمدة الجدول المباشرة عند التسجيل أو عند الضغط على "مزامنة سوبابيز".'
                  : '1. All address and medical details are immediately saved into Supabase Auth User Metadata (raw_user_meta_data) upon registration. 2. Once you execute the ALTER TABLE statement above in Supabase, the app will also automatically populate the direct columns in your profiles table upon registration and sync.'}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsSqlModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
              >
                {t('profileClose')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
