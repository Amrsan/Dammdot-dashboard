import React from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export interface ProductFilterState {
  search: string;
  sortBy: 'price-asc' | 'price-desc' | 'name' | 'newest';
}

interface ProductFilterProps {
  filterState: ProductFilterState;
  onChange: (updates: Partial<ProductFilterState>) => void;
  onReset: () => void;
}

export const ProductFilter: React.FC<ProductFilterProps> = ({
  filterState,
  onChange,
  onReset,
}) => {
  const { t, isRTL } = useLanguage();

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
              onChange={(e) => onChange({ sortBy: e.target.value as ProductFilterState['sortBy'] })}
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
            aria-label={t('resetFilters')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
