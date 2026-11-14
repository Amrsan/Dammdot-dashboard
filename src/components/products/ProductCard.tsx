import React from 'react';
import { Product } from '../../types';
import { ShieldCheck, Plus, AlertCircle, Sparkles, CheckCircle, Clock, PhoneCall } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const { language, t, isRTL } = useLanguage();
  const isOutOfStock = product.availability === 'Out of Stock' || product.stock_quantity <= 0;
  const isLimited = product.availability === 'Limited Stock';

  const getBloodBadgeColor = (type: string) => {
    switch (type) {
      case 'O-':
        return 'bg-red-900 text-white border-red-950 font-black';
      case 'O+':
        return 'bg-red-700 text-white border-red-800 font-extrabold';
      case 'A+':
      case 'A-':
        return 'bg-rose-700 text-white border-rose-800';
      case 'B+':
      case 'B-':
        return 'bg-amber-700 text-white border-amber-800';
      case 'AB+':
      case 'AB-':
        return 'bg-indigo-700 text-white border-indigo-800';
      default:
        return 'bg-slate-700 text-white border-slate-800';
    }
  };

  const getTranslatedTypeName = (name?: string) => {
    if (!name) return language === 'ar' ? 'دم مكثف' : 'Standard';
    if (name === 'Radiant') return language === 'ar' ? 'دم مشع' : 'Radiant';
    if (name === 'Stack Blood') return language === 'ar' ? 'أكياس مكدسة' : 'Stack Blood';
    return name;
  };

  return (
    <div
      id={`product-card-${product.id}`}
      className={`group bg-white rounded-2xl border transition-all duration-200 flex flex-col overflow-hidden text-left rtl:text-right ${
        isOutOfStock
          ? 'border-slate-200 opacity-75 bg-slate-50/50'
          : 'border-slate-200 hover:border-red-300 hover:shadow-xl hover:shadow-slate-200/60'
      }`}
    >
      {/* Product Image & Badges */}
      <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
        <img
          src={product.image_url}
          alt={product.name}
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover transition-transform duration-300 ${
            isOutOfStock ? 'grayscale' : 'group-hover:scale-105'
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Blood Group Badge Top Start */}
        <div className="absolute top-3 left-3 rtl:left-auto rtl:right-3 flex items-center gap-1.5">
          <span
            className={`px-3 py-1 rounded-xl text-xs font-black shadow-md border tracking-wide ${getBloodBadgeColor(
              product.blood_type
            )}`}
            dir="ltr"
          >
            {product.blood_type}
          </span>
          <span className="bg-white/90 backdrop-blur-xs text-slate-800 text-[11px] font-bold px-2 py-0.5 rounded-lg shadow-xs border border-white/40">
            {getTranslatedTypeName(product.product_type_name)}
          </span>
        </div>

        {/* Search Sourcing Badge Top End */}
        <div className="absolute top-3 right-3 rtl:right-auto rtl:left-3">
          <span className="bg-slate-900/90 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1 border border-slate-700/60">
            <Clock className="w-3 h-3 text-red-400" />
            {language === 'ar' ? 'توفير فوري عند الطلب' : 'Sourced on Demand'}
          </span>
        </div>

        {/* Price on bottom image banner */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
          <div>
            <span className="text-xs text-slate-300 font-medium">
              {language === 'ar' ? 'رسوم التوفير المقدرة' : 'Estimated Sourcing Fee'}
            </span>
            <div className="text-xl font-extrabold tracking-tight">
              {language === 'ar' ? (
                <>
                  {product.price.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                </>
              ) : (
                `EGP ${product.price.toLocaleString()}`
              )}
            </div>
          </div>
          {product.product_type_name === 'Radiant' && (
            <span className="flex items-center gap-1 text-[11px] bg-indigo-950/80 text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-700/50">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              {language === 'ar' ? 'مشع' : 'Irradiated'}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-red-700 transition">
              {product.name}
            </h3>
          </div>
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {product.description}
          </p>

          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">
                {language === 'ar' ? 'النوع البيولوجي' : 'Biological Type'}
              </span>
              <span className="font-semibold text-slate-800">
                {getTranslatedTypeName(product.product_type_name)}
              </span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">
                {language === 'ar' ? 'آلية الصرف' : 'Fulfillment Model'}
              </span>
              <span className="font-semibold text-emerald-700">
                {language === 'ar' ? 'بحث وتوريد مباشر' : 'Direct Bank Sourcing'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-5">
          {product.product_type_id === 'pt-phlebotomy' ||
          product.product_type_name?.toLowerCase().includes('phlebotom') ||
          product.name?.toLowerCase().includes('phlebotom') ||
          product.name?.includes('فصد') ? (
            <button
              id={`btn-add-to-order-${product.id}`}
              onClick={() => onSelect(product)}
              className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition shadow-xs bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 hover:shadow-md cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              <span>{language === 'ar' ? 'الاتصال لحجز موعد فصد' : 'Call Us to Book'}</span>
            </button>
          ) : (
            <button
              id={`btn-add-to-order-${product.id}`}
              onClick={() => onSelect(product)}
              className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition shadow-xs bg-red-600 hover:bg-red-700 text-white shadow-red-600/20 hover:shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'ar' ? 'طلب هذه الفصيلة للمريض' : 'Request Blood Unit'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
