import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Product, ProductTypeItem, BloodTypeGroup } from '../types';
import { ProductCard } from '../components/products/ProductCard';
import { ProductFilter, ProductFilterState } from '../components/products/ProductFilter';
import { ShieldCheck, Sparkles, AlertCircle, HeartPulse, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface ProductsPageProps {
  onSelectProductForOrder: (product: Product) => void;
  onBackHome?: () => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  onSelectProductForOrder,
  onBackHome,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [productTypes, setProductTypes] = useState<ProductTypeItem[]>([]);
  const [bloodTypes, setBloodTypes] = useState<{ name: BloodTypeGroup; active: boolean }[]>([]);
  const { language, t, isRTL } = useLanguage();
  const BackChevron = isRTL ? ChevronRight : ChevronLeft;

  const initialFilter: ProductFilterState = {
    search: '',
    bloodType: 'all',
    productType: 'all',
    availability: 'all',
    sortBy: 'newest',
  };

  const [filterState, setFilterState] = useState<ProductFilterState>(initialFilter);

  const loadData = () => {
    setProducts(db.getProducts());
    setProductTypes(db.getProductTypes());
    setBloodTypes(db.getBloodTypes());
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return () => unsub();
  }, []);

  // Filter and sort products
  const filteredProducts = products.filter((p) => {
    // Search match
    if (filterState.search.trim()) {
      const q = filterState.search.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchDesc = p.description.toLowerCase().includes(q);
      const matchBlood = p.blood_type.toLowerCase().includes(q);
      const matchType = (p.product_type_name || '').toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchBlood && !matchType) return false;
    }

    // Blood type match
    if (filterState.bloodType !== 'all' && p.blood_type !== filterState.bloodType) {
      return false;
    }

    // Product type match
    if (filterState.productType !== 'all' && p.product_type_id !== filterState.productType) {
      return false;
    }

    // Availability match
    if (filterState.availability !== 'all' && p.availability !== filterState.availability) {
      return false;
    }

    // Do not display products for inactive categories (e.g. phlebotomy removed for now)
    const matchedType = productTypes.find((pt) => pt.id === p.product_type_id);
    if (matchedType && !matchedType.active) {
      return false;
    }
    if (
      p.product_type_id === 'pt-phlebotomy' ||
      p.name?.toLowerCase().includes('phlebotom') ||
      p.name?.includes('فصد')
    ) {
      return false;
    }

    return true;
  });

  // Sort
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (filterState.sortBy === 'price-asc') return a.price - b.price;
    if (filterState.sortBy === 'price-desc') return b.price - a.price;
    if (filterState.sortBy === 'name') return a.name.localeCompare(b.name);
    return 0; // newest/featured
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left rtl:text-right">
      {/* Navigation Breadcrumb / Back button */}
      <div className="flex items-center justify-between">
        <button
          id="products-back-home-btn"
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

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
          <HeartPulse className="w-3.5 h-3.5 text-red-600" />
          <span>{language === 'ar' ? 'قائمة الفصائل والمنتجات' : 'Products & Blood Types'}</span>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-bold uppercase tracking-wider mb-2">
            <HeartPulse className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'مخزون بيولوجي معتمد' : 'Accredited Biological Inventory'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {t('productsPageTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            {t('productsPageSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 shrink-0">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <span className="font-bold text-slate-800 block">{t('temperatureControlled')}</span>
            <span>{t('temperatureRange')}</span>
          </div>
        </div>
      </div>

      {/* Filter Component */}
      <ProductFilter
        filterState={filterState}
        onChange={(updates) => setFilterState((prev) => ({ ...prev, ...updates }))}
        onReset={() => setFilterState(initialFilter)}
        productTypes={productTypes}
        bloodTypes={bloodTypes}
      />

      {/* Products Grid & Results Counter */}
      <div>
        <div className="flex items-center justify-between mb-4 text-xs text-slate-500 font-medium">
          <span>
            {t('showingProductsCount', { count: sortedProducts.length })}
          </span>
          {sortedProducts.length > 0 && (
            <span className="hidden sm:inline-block text-amber-700 font-semibold">
              {t('crossMatchMandatory')}
            </span>
          )}
        </div>

        {sortedProducts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
            <Filter className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">{t('noProductsFound')}</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {t('noProductsDesc')}
            </p>
            <button
              onClick={() => setFilterState(initialFilter)}
              className="mt-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-xl text-xs"
            >
              {t('resetFilters')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedProducts.map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                onSelect={(p) => onSelectProductForOrder(p)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
