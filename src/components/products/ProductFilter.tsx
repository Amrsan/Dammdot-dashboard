import React from 'react';
import { Search, Filter, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { BloodTypeGroup, ProductTypeItem } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

export interface ProductFilterState {
  search: string;
  bloodType: string;
  productType: string;
  availability: string;
  sortBy: 'price-asc' | 'price-desc' | 'name' | 'newest';
}

interface ProductFilterProps {
  filterState: ProductFilterState;
  onChange: (updates: Partial<ProductFilterState>) => void;
  onReset: () => void;
  productTypes: ProductTypeItem[];
  bloodTypes: { name: BloodTypeGroup; active: boolean }[];
}

export const ProductFilter: React.FC<ProductFilterProps> = ({
  filterState,
  onChange,
  onReset,
  productTypes,
  bloodTypes,
}) => {
  const { language, t, isRTL } = useLanguage();

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4 text-left rtl:text-right">
      {/* Top Search Bar & Sort */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search
            className={`w-4 h-4 text-slate-400 absolute top-3.5 ${
              isRTL ? 'right-3.5' : 'left-3.5'
            }`}
          />
          <input
            id="product-search-input"
            type="text"
            value={filterState.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder={t('searchPlaceholder')}
            className={`w-full py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-600/30 focus:border-red-600 transition ${
              isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-52">
            <select
              id="product-sort-select"
              value={filterState.sortBy}
              onChange={(e) => onChange({ sortBy: e.target.value as any })}
              className="w-full px-3 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-600/30 text-slate-700"
            >
              <option value="newest">{t('sortNewest')}</option>
              <option value="price-asc">{t('sortPriceLow')}</option>
              <option value="price-desc">{t('sortPriceHigh')}</option>
              <option value="name">{t('sortName')}</option>
            </select>
          </div>

          <button
            id="reset-filter-btn"
            onClick={onReset}
            className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition shrink-0"
            title={t('resetFilters')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Blood Type Quick Pills */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {language === 'ar' ? 'فصيلة دم المريض (ABO/Rh)' : 'Blood Type Group'}
          </span>
          <span className="text-[11px] text-slate-400">
            {language === 'ar' ? 'يشترط التوافق السريري المخبري' : 'Strict clinical match required'}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <button
            onClick={() => onChange({ bloodType: 'all' })}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition border ${
              filterState.bloodType === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
            }`}
          >
            {t('allBloodTypes')}
          </button>
          {bloodTypes
            .filter((b) => b.active)
            .map((bt) => {
              const active = filterState.bloodType === bt.name;
              return (
                <button
                  key={bt.name}
                  id={`filter-blood-${bt.name}`}
                  onClick={() => onChange({ bloodType: active ? 'all' : bt.name })}
                  className={`px-3.5 py-1.5 text-xs font-black rounded-xl transition border tracking-wide ${
                    active
                      ? 'bg-red-600 text-white border-red-700 shadow-sm shadow-red-600/30'
                      : 'bg-slate-50 text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 border-slate-200'
                  }`}
                  dir="ltr"
                >
                  {bt.name}
                </button>
              );
            })}
        </div>
      </div>

      {/* Product Type Filter Row */}
      <div className="pt-1 border-t border-slate-100 text-xs">
        <div>
          <label className="block text-slate-500 font-bold uppercase tracking-wider text-[11px] mb-1">
            {language === 'ar' ? 'نوع المشتق البيولوجي' : 'Blood Product Type'}
          </label>
          <select
            id="filter-product-type"
            value={filterState.productType}
            onChange={(e) => onChange({ productType: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-red-600/30 font-medium text-slate-700"
          >
            <option value="all">{t('allProductTypes')}</option>
            {productTypes
              .filter((pt) => pt.active)
              .map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {language === 'ar' && pt.name === 'Stack Blood'
                    ? 'أكياس دم مكدسة'
                    : language === 'ar' && pt.name === 'Radiant'
                    ? 'وحدات دم مشعة'
                    : pt.name}
                </option>
              ))}
          </select>
        </div>
      </div>
    </div>
  );
};
