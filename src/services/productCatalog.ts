import type { Product, ProductCategoryKey, ProductTypeItem } from '../types';

export function catalogProductKey(typeId: string, typeName = ''): string {
  switch (typeId) {
    case 'pt-stack-blood': return 'pt-packed-rbc';
    case 'pt-radiant': return 'pt-irradiated';
    case 'pt-leukoreduced': return 'pt-filtered';
    case 'pt-1789956798153': return 'pt-plasma';
    case 'pt-1790133935375': return 'pt-platelets';
    case 'pt-1790134002398': return 'pt-phlebotomy';
  }
  switch (typeName.trim().toLowerCase()) {
    case 'plasma':
    case 'fresh frozen plasma': return 'pt-plasma';
    case 'blood platelets':
    case 'apheresis platelets': return 'pt-platelets';
    case 'therapeutic phlebotomy':
    case 'standard phlebotomy': return 'pt-phlebotomy';
    default: return typeId;
  }
}

const listingNames: Record<string, string> = {
  'pt-packed-rbc': 'Packed Red Blood',
  'pt-irradiated': 'Irradiated Blood',
  'pt-filtered': 'Filtered Blood',
  'pt-plasma': 'Fresh Frozen Plasma',
  'pt-platelets': 'Blood Platelets',
  'pt-phlebotomy': 'Therapeutic Phlebotomy',
};

export function listCatalogProducts(products: Product[], types: ProductTypeItem[]): Product[] {
  const typesById = new Map(types.map((type) => [type.id, type]));
  const listings = products.filter((product) => product.blood_type === null);
  const groups = new Map<string, Product[]>();
  for (const product of listings.length ? listings : products) {
    const typeName = typesById.get(product.product_type_id)?.name ?? product.product_type_name;
    const key = catalogProductKey(product.product_type_id, typeName);
    const group = groups.get(key) ?? [];
    group.push({ ...product, price: Number(product.price), product_type_name: typeName });
    groups.set(key, group);
  }

  return [...groups.entries()].map(([key, group]) => {
    // Older catalogs have a row per blood group. Prefer an existing priced row
    // as the initial listing and keep its ID available for order references.
    group.sort((a, b) =>
      Number(b.price > 0) - Number(a.price > 0) ||
      (b.updated_at ?? b.created_at).localeCompare(a.updated_at ?? a.created_at) ||
      a.id.localeCompare(b.id)
    );
    const product = group[0];
    if (product.blood_type === null) return product;
    return {
      ...product,
      name: listingNames[key] ?? product.product_type_name ?? product.name,
      description: typesById.get(key)?.description ?? '',
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

export function productCategory(product: Product): ProductCategoryKey {
  const key = catalogProductKey(product.product_type_id, product.product_type_name);
  if (['pt-packed-rbc', 'pt-filtered', 'pt-washed', 'pt-irradiated'].includes(key)) return 'blood-bag';
  if (key === 'pt-plasma' || product.product_type_name?.toLowerCase().includes('plasma')) return 'plasma';
  if (key === 'pt-platelets' || product.product_type_name?.toLowerCase().includes('platelet')) return 'platelets';
  if (key === 'pt-phlebotomy' || product.product_type_name?.toLowerCase().includes('phlebotom')) return 'phlebotomy';
  return 'other-products';
}

export function isListedProduct(product: Product, types: ProductTypeItem[]): boolean {
  const key = catalogProductKey(product.product_type_id, product.product_type_name);
  const type = types.find((entry) => entry.id === key) ?? types.find((entry) => entry.id === product.product_type_id);
  return product.active !== false && type?.active !== false;
}
