export type BloodTypeGroup =
  | 'A+'
  | 'A-'
  | 'B+'
  | 'B-'
  | 'AB+'
  | 'AB-'
  | 'O+'
  | 'O-'
  | 'A'
  | 'B'
  | 'AB'
  | 'O';

export interface BloodTypeItem {
  id: string;
  name: BloodTypeGroup;
  active: boolean;
  created_at: string;
}

export interface ProductTypeItem {
  id: string;
  name: string; // e.g. 'Stack Blood', 'Radiant'
  description?: string;
  active: boolean;
  created_at: string;
  updated_at?: string;
}

export type StockAvailability = 'In Stock' | 'Limited Stock' | 'Out of Stock';

export interface Product {
  id: string;
  name: string;
  description: string;
  blood_type: BloodTypeGroup;
  product_type_id: string;
  product_type_name?: string;
  price: number;
  stock_quantity: number;
  availability: StockAvailability;
  image_url: string;
  created_at: string;
  updated_at?: string;
}

export interface Governorate {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface City {
  id: string;
  governorate_id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface DeliveryArea {
  id: string;
  city_id: string;
  name: string;
  delivery_fee: number;
  active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DeliveryAddress {
  id: string;
  user_id: string;
  governorate_id: string;
  city_id: string;
  area_id: string;
  governorate_name?: string;
  city_name?: string;
  area_name?: string;
  address: string;
  building?: string;
  apartment?: string;
  floor?: string;
  landmark?: string;
  phone: string;
  is_default?: boolean;
  created_at: string;
  updated_at?: string;
}

export type UserRole = 'customer' | 'admin';

export interface UserProfile {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  role: UserRole;
  password?: string;
  blood_type?: BloodTypeGroup;
  national_id?: string;
  age?: number;
  gender?: 'male' | 'female';
  emergency_contact_name?: string;
  emergency_phone?: string;
  willing_to_donate?: boolean;
  medical_notes?: string;
  preferred_hospital?: string;
  governorate_name?: string;
  city_name?: string;
  area_name?: string;
  default_address?: string;
  building_floor?: string;
  landmark?: string;
  account_type?: 'individual' | 'family';
  created_at: string;
  updated_at?: string;
  // Legacy optional fields
  hospital_name?: string;
  department?: string;
  medical_id?: string;
}

export type PaymentMethod = 'Cash on Delivery' | 'Online Payment';

export type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded' | 'Cash on Delivery';

export type OrderStatus =
  | 'Order Received'
  | 'Verification'
  | 'Confirmed'
  | 'Preparing'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Pending Verification'
  | 'On Hold'
  | 'Cancelled'
  | 'Rejected';

export interface OrderStatusHistoryItem {
  id: string;
  order_id: string;
  status: OrderStatus;
  notes?: string;
  created_at: string;
  created_by?: string;
}

export interface Order {
  id: string;
  order_number: string; // e.g. BB-20260912-0001
  user_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  patient_name?: string;
  patient_age: number;
  hospital_name?: string;
  department?: string;
  blood_type: BloodTypeGroup;
  product_type_id: string;
  product_type_name: string;
  product_id?: string;
  product_category?: ProductCategoryKey;
  product_name: string;
  selected_options?: string[];
  quantity: number;
  unit_price: number;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  notes?: string;
  internal_notes?: string;
  // Delivery location details
  governorate_id?: string;
  governorate_name: string;
  city_id?: string;
  city_name: string;
  area_id?: string;
  area_name: string;
  delivery_address: string;
  manual_delivery_address?: string;
  delivery_building?: string;
  delivery_apartment?: string;
  delivery_floor?: string;
  delivery_landmark?: string;
  delivery_phone: string;
  // Checkboxes
  accuracy_confirmed: boolean;
  compliance_acknowledged: boolean;
  created_at: string;
  updated_at?: string;
}

export type ProductCategoryKey =
  | 'blood-bag'
  | 'plasma'
  | 'phlebotomy'
  | 'platelets'
  | 'other-products';

export type BloodProductOption =
  // Blood Bag
  | 'Packed Red Blood'
  | 'Filtered Blood'
  | 'Washed Blood'
  | 'Irradiated Blood'
  | 'Leukoreduced Blood'
  // Plasma
  | 'Fresh Frozen Plasma'
  | 'Cryoprecipitate'
  | 'Solvent-Detergent Plasma'
  // Platelets
  | 'Apheresis Platelets'
  | 'Random Donor Platelets'
  | 'Irradiated Platelets'
  // Therapeutic Phlebotomy
  | 'Standard Phlebotomy'
  | 'Saline-Replacement Phlebotomy'
  | 'De-ironing Phlebotomy'
  // Other Products
  | 'Cryoprecipitate (cryo)'
  | 'Intravenous immunoglobulin (IVIG)'
  | 'Cryoprecipitate (Cryo)'
  | 'Intravenous Immunoglobulin (IVIG)';

export interface OrderDraft {
  productId?: string;
  product?: Product;
  productCategory?: ProductCategoryKey;
  bloodProductOption?: BloodProductOption;
  selectedOptions?: BloodProductOption[];
  patientName?: string;
  patientAge?: number | '';
  hospitalName?: string;
  department?: string;
  bloodType?: BloodTypeGroup;
  productTypeId?: string;
  productTypeName?: string;
  quantity: number;
  notes?: string;
  governorateId?: string;
  governorateName?: string;
  cityId?: string;
  cityName?: string;
  areaId?: string;
  areaName?: string;
  deliveryFee: number;
  address?: string;
  manualDeliveryAddress?: string;
  building?: string;
  apartment?: string;
  floor?: string;
  landmark?: string;
  phone?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentMethod: PaymentMethod;
  accuracyConfirmed: boolean;
  complianceAcknowledged: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'compliance' | 'delivery' | 'inventory';
  channel?: 'in_app' | 'sms' | 'whatsapp' | 'email';
  read: boolean;
  order_number?: string;
  created_at: string;
}
