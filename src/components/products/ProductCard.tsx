import React from 'react';
import { Plus } from 'lucide-react';
import type { Product } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const { language, t } = useLanguage();
  const price = product.price.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-EG');

  return (
    <article id={`product-card-${product.id}`} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {product.image_url && (
        <img src={product.image_url} alt="" loading="lazy" referrerPolicy="no-referrer"
          className="h-44 w-full object-cover" />
      )}
      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-base font-bold text-slate-900">{product.name}</h2>
        {product.description && <p className="mt-1 text-sm text-slate-600">{product.description}</p>}
        <div className="mt-auto pt-5">
          <p className="text-xs text-slate-600">{language === 'ar' ? 'رسوم التوفير' : 'Sourcing fee'}</p>
          <p className="text-lg font-bold text-slate-900">{price} {t('currency')}</p>
          <button
            type="button"
            onClick={() => onSelect(product)}
            className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700"
          >
            <Plus className="h-4 w-4" />
            {language === 'ar' ? 'طلب توفير المنتج' : 'Request sourcing'}
          </button>
        </div>
      </div>
    </article>
  );
};
