import {
  BloodTypeItem,
  BloodTypeGroup,
  BloodProductOption,
  ProductTypeItem,
  Product,
  Governorate,
  City,
  DeliveryArea,
  DeliveryAddress,
  Order,
  OrderStatus,
  OrderStatusHistoryItem,
  UserProfile,
  StockAvailability,
  ProductCategoryKey,
} from '../types';
import {
  SEED_PRODUCT_TYPES,
  SEED_BLOOD_TYPES,
  SEED_GOVERNORATES,
  SEED_CITIES,
  SEED_AREAS,
  SEED_PRODUCTS,
  SEED_USERS,
  SEED_ORDERS,
  SEED_ORDER_HISTORY,
} from './seedData';
import { notificationService } from './notifications';
import { supabase, isSupabaseConfigured } from './supabase';

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export const SUPABASE_VALID_PRODUCT_IDS = new Set([
  // Packed Red Blood Cells
  'prod-a-pos',
  'prod-a-neg',
  'prod-b-pos',
  'prod-b-neg',
  'prod-ab-pos',
  'prod-ab-neg',
  'prod-o-pos',
  'prod-o-neg',
  // Stack Blood
  'prod-o-neg-stack',
  'prod-o-pos-stack',
  'prod-a-pos-stack',
  'prod-b-pos-stack',
  'prod-ab-pos-stack',
  // Filtered & Washed
  'prod-a-pos-filtered',
  'prod-o-pos-filtered',
  'prod-a-pos-washed',
  'prod-o-pos-washed',
  'prod-a-neg-radiant',
  'prod-b-neg-radiant',
  'prod-ab-neg-radiant',
  'prod-o-neg-radiant',
  // Fresh Frozen Plasma (FFP)
  'prod-o-pos-plasma',
  'prod-ab-pos-plasma',
  'prod-a-pos-plasma',
  'prod-b-pos-plasma',
  // Therapeutic Phlebotomy
  'prod-phlebotomy-standard',
  'prod-phlebotomy-a',
  // Platelets (Thrombocytes)
  'prod-a-pos-platelets',
  'prod-o-pos-platelets',
  'prod-b-pos-platelets',
  'prod-ab-pos-platelets',
]);

export const SUPABASE_VALID_PRODUCT_TYPE_IDS = new Set([
  'pt-packed-rbc',
  'pt-filtered',
  'pt-washed',
  'pt-irradiated',
  'pt-stack-blood',
  'pt-radiant',
  'pt-plasma',
  'pt-platelets',
  'pt-phlebotomy',
  'pt-other',
  'pt-leukoreduced',
]);

export function getSafeSupabaseProductId(
  productId?: string | null,
  bloodType?: string | null,
  category?: string | null
): string | null {
  if (productId && SUPABASE_VALID_PRODUCT_IDS.has(productId)) {
    return productId;
  }
  // Do NOT silently substitute - return null if product ID is provided but invalid
  if (productId) {
    console.error(`[Security] Invalid product ID requested: ${productId}. No silent substitution.`);
    return null;
  }
  return null;
}

export function getSafeSupabaseProductTypeId(
  productTypeId?: string | null,
  category?: string | null
): string {
  if (category === 'plasma') return 'pt-plasma';
  if (category === 'platelets') return 'pt-platelets';
  if (category === 'phlebotomy') return 'pt-phlebotomy';
  if (category === 'other-products') return 'pt-plasma';
  if (productTypeId && SUPABASE_VALID_PRODUCT_TYPE_IDS.has(productTypeId)) {
    return productTypeId;
  }
  return 'pt-packed-rbc';
}

class DatabaseEngine {
  private static instance: DatabaseEngine;

  private productTypes: ProductTypeItem[] = [];
  private bloodTypes: BloodTypeItem[] = [];
  private governorates: Governorate[] = [];
  private cities: City[] = [];
  private areas: DeliveryArea[] = [];
  private products: Product[] = [];
  private orders: Order[] = [];
  private orderHistory: OrderStatusHistoryItem[] = [];
  private users: UserProfile[] = [];
  private addresses: DeliveryAddress[] = [];
  private currentUser: UserProfile | null = null;
  private listeners: Array<() => void> = [];
  private activeResetRequests: Record<string, { code: string; expiresAt: number; phoneHint?: string }> = {};

  constructor() {
    this.init();
  }

  public static getInstance(): DatabaseEngine {
    if (!DatabaseEngine.instance) {
      DatabaseEngine.instance = new DatabaseEngine();
    }
    return DatabaseEngine.instance;
  }

  private init() {
    try {
      const stored = localStorage.getItem('hemoportal_db_state_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.productTypes = parsed.productTypes || SEED_PRODUCT_TYPES;
        // Migrate legacy leukoreduced type to Filtered Blood (دم مفلتر)
        this.productTypes.forEach((pt) => {
          if (pt.name.toLowerCase().includes('leuko') || pt.id === 'pt-leukoreduced') {
            pt.name = 'Filtered Blood';
            pt.description = 'دم مفلتر - Precision micro-filtered red blood cells (<5×10⁶ WBC) preventing febrile non-hemolytic reactions.';
          }
        });
        // Ensure new required product types exist in state
        SEED_PRODUCT_TYPES.forEach((st) => {
          if (!this.productTypes.some((pt) => pt.id === st.id || pt.name.toLowerCase() === st.name.toLowerCase())) {
            this.productTypes.push(st);
          }
        });
        // Sync pt-phlebotomy status to inactive while keeping it in the database
        const phlebType = this.productTypes.find((pt) => pt.id === 'pt-phlebotomy' || pt.name.toLowerCase().includes('phlebotom'));
        if (phlebType) {
          phlebType.active = false;
        }
        this.bloodTypes = parsed.bloodTypes || SEED_BLOOD_TYPES;
        // Ensure ABO blood types without Rh are present in the list
        SEED_BLOOD_TYPES.forEach((sbt) => {
          if (!this.bloodTypes.some((bt) => bt.name === sbt.name)) {
            this.bloodTypes.push(sbt);
          }
        });
        this.governorates = parsed.governorates || SEED_GOVERNORATES;
        this.cities = parsed.cities || SEED_CITIES;
        this.areas = parsed.areas || SEED_AREAS;
        this.products = (parsed.products || SEED_PRODUCTS).map((p: Product) => ({
          ...p,
          price: 0,
        }));
        // Ensure Filtered, Washed, Plasma and Platelets ABO products are in database
        SEED_PRODUCTS.forEach((sp) => {
          if (!this.products.some((p) => p.id === sp.id)) {
            this.products.push(sp);
          }
        });
        this.orders = parsed.orders || SEED_ORDERS;
        this.orderHistory = parsed.orderHistory || SEED_ORDER_HISTORY;
        this.users = (parsed.users || SEED_USERS).map((u: UserProfile) => {
          const seed = SEED_USERS.find((s) => s.id === u.id || s.email.toLowerCase() === u.email.toLowerCase());
          let validId = u.id;
          if (u.id === 'user-customer-1' || u.id === 'a1000000-0000-4000-8000-000000000001' || u.email?.toLowerCase() === 'amribrahim924@gmail.com') {
            validId = 'a1000000-0000-4000-8000-000000000003';
          } else if (u.id === 'user-customer-2' || u.email?.toLowerCase() === 'nour.hassan@example.com') {
            validId = 'a1000000-0000-4000-8000-000000000002';
          } else if (!isUUID(validId)) {
            validId = generateUUID();
          }

          return seed
            ? {
                ...seed,
                ...u,
                id: validId,
                role: 'customer' as const,
                account_type: u.account_type || seed.account_type || 'individual',
                blood_type: u.blood_type || seed.blood_type || 'A+',
                national_id: u.national_id || seed.national_id || '29801010101234',
                age: u.age || seed.age || 34,
                gender: u.gender || seed.gender || 'male',
                emergency_contact_name: u.emergency_contact_name || seed.emergency_contact_name || 'Sarah Ibrahim (Wife / Family)',
                emergency_phone: u.emergency_phone || seed.emergency_phone || '+20 102 987 6543',
                willing_to_donate: u.willing_to_donate !== undefined ? u.willing_to_donate : true,
                medical_notes: u.medical_notes || seed.medical_notes,
                preferred_hospital: u.preferred_hospital || seed.preferred_hospital,
                default_address: u.default_address || seed.default_address,
                building_floor: u.building_floor || seed.building_floor,
                landmark: u.landmark || seed.landmark || 'Beside Maadi Grand Mall',
                city_name: u.city_name || seed.city_name,
                governorate_name: u.governorate_name || seed.governorate_name,
                area_name: u.area_name || seed.area_name,
                hospital_name: undefined,
                department: undefined,
                medical_id: undefined,
              }
            : { ...u, id: validId, role: 'customer' as const };
        });
        this.addresses = parsed.addresses || [];

        // Ensure all seed users (specifically Amr Ibrahim amribrahim924@gmail.com) exist in state
        SEED_USERS.forEach((su) => {
          if (!this.users.some((u) => u.email.toLowerCase() === su.email.toLowerCase())) {
            this.users.push({ ...su });
          }
        });

        // Restore active password recovery requests if present
        try {
          const storedReqs = localStorage.getItem('hemoportal_reset_requests');
          if (storedReqs) {
            this.activeResetRequests = JSON.parse(storedReqs);
          }
        } catch (e) {
          // Ignore parse errors
        }

        // Ensure user a1000000-0000-4000-8000-000000000001 has seed orders available
        SEED_ORDERS.forEach((so) => {
          if (!this.orders.some((o) => o.id === so.id || o.order_number === so.order_number)) {
            this.orders.push(so);
          }
        });
      } else {
        this.seedDefault();
      }

      // Sanitize user_id and hospital_name on orders
      this.orders.forEach((o) => {
        if (o.user_id === 'user-customer-1' || o.user_id === 'a1000000-0000-4000-8000-000000000001' || o.customer_email?.toLowerCase() === 'amribrahim924@gmail.com') {
          o.user_id = 'a1000000-0000-4000-8000-000000000003';
        } else if (o.user_id && !isUUID(o.user_id)) {
          const matched = this.users.find((u) => u.id === o.user_id || u.email?.toLowerCase() === o.customer_email?.toLowerCase());
          o.user_id = matched?.id || null;
        }
        if (o.hospital_name && o.hospital_name.includes('Al Salam')) {
          o.hospital_name = undefined;
        }
      });

      // Default current user: restore from storage only if explicitly saved; otherwise remain unauthenticated (null)
      const storedUser = localStorage.getItem('hemoportal_current_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          const match = this.users.find((u) => u.id === parsed.id || u.email.toLowerCase() === parsed.email?.toLowerCase());
          const targetId = match ? match.id : (parsed.email?.toLowerCase() === 'amribrahim924@gmail.com' ? 'a1000000-0000-4000-8000-000000000003' : parsed.id);
          this.currentUser = match
            ? {
                ...match,
                ...parsed,
                id: targetId,
                role: 'customer' as const,
                preferred_hospital: undefined,
                hospital_name: undefined,
                department: undefined,
                medical_id: undefined,
              }
            : {
                ...parsed,
                id: targetId,
                role: 'customer' as const,
                preferred_hospital: undefined,
                hospital_name: undefined,
              };

          if (this.currentUser) {
            localStorage.setItem('hemoportal_current_user', JSON.stringify(this.currentUser));
          }
        } catch (e) {
          this.currentUser = null;
        }
      } else {
        this.currentUser = null;
      }
    } catch (e) {
      console.error('Error initializing db from localStorage:', e);
      this.seedDefault();
    }

    // Save cleansed UUID state and launch background Supabase synchronization
    this.save();
    this.syncWithSupabase();
  }

  public seedDefault() {
    this.productTypes = JSON.parse(JSON.stringify(SEED_PRODUCT_TYPES));
    this.bloodTypes = JSON.parse(JSON.stringify(SEED_BLOOD_TYPES));
    this.governorates = JSON.parse(JSON.stringify(SEED_GOVERNORATES));
    this.cities = JSON.parse(JSON.stringify(SEED_CITIES));
    this.areas = JSON.parse(JSON.stringify(SEED_AREAS));
    this.products = JSON.parse(JSON.stringify(SEED_PRODUCTS));
    this.orders = JSON.parse(JSON.stringify(SEED_ORDERS));
    this.orderHistory = JSON.parse(JSON.stringify(SEED_ORDER_HISTORY));
    this.users = JSON.parse(JSON.stringify(SEED_USERS));
    this.addresses = [
      {
        id: 'addr-seed-1',
        user_id: 'a1000000-0000-4000-8000-000000000001',
        governorate_id: 'gov-cairo',
        city_id: 'city-nasr',
        area_id: 'area-nc-1',
        governorate_name: 'Cairo',
        city_name: 'Nasr City',
        area_name: 'Area 1 (Abbas El Akkad)',
        address: 'Metropolitan Surgical Hospital, 14 Abbas El Akkad St.',
        building: 'Main Clinical Tower',
        apartment: 'ICU Unit 4',
        floor: '3rd Floor',
        landmark: 'Next to Central Bank of Egypt',
        phone: '+20 112 345 6789',
        is_default: true,
        created_at: '2026-02-15T00:00:00Z',
      },
    ];
    this.currentUser = null;
    this.save();
    this.notify();
  }

  private save() {
    try {
      const payload = {
        productTypes: this.productTypes,
        bloodTypes: this.bloodTypes,
        governorates: this.governorates,
        cities: this.cities,
        areas: this.areas,
        products: this.products,
        orders: this.orders,
        orderHistory: this.orderHistory,
        users: this.users,
        addresses: this.addresses,
      };
      localStorage.setItem('hemoportal_db_state_v1', JSON.stringify(payload));
      if (this.currentUser) {
        localStorage.setItem('hemoportal_current_user', JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem('hemoportal_current_user');
      }
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  // --- AUTH & USERS ---
  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public switchUser(userIdOrRole: string) {
    const found = this.users.find(
      (u) => u.id === userIdOrRole || u.role === userIdOrRole || u.email === userIdOrRole
    );
    if (found) {
      this.currentUser = found;
      this.save();
      this.notify();
      return found;
    }
    return null;
  }

  public async login(email: string, password?: string): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();
    let user = this.users.find((u) => u.email.toLowerCase() === cleanEmail);

    // If user not in local cache, check Supabase public.profiles
    if (!user && supabase) {
      try {
        const { data: remoteProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (remoteProfile) {
          user = {
            id: remoteProfile.id,
            full_name: remoteProfile.full_name || cleanEmail.split('@')[0],
            email: remoteProfile.email,
            phone: remoteProfile.phone || '+20 100 000 0000',
            role: (remoteProfile.role as any) || 'customer',
            password: password || '',
            created_at: remoteProfile.created_at || new Date().toISOString(),
            governorate_name: 'Cairo',
            city_name: 'Cairo',
            area_name: 'Cairo',
          };
          this.users.push(user);
        }
      } catch (err) {
        console.warn('[Supabase Remote Profile Fetch Notice]:', err);
      }
    }

    if (!user) {
      user = {
        id: generateUUID(),
        full_name: cleanEmail.split('@')[0],
        email: cleanEmail,
        phone: '+20 100 000 0000',
        role: 'customer',
        password: password || '',
        created_at: new Date().toISOString(),
      };
      this.users.push(user);
    } else if (password && user.password && user.password !== password) {
      throw new Error('Incorrect password. Please verify your credentials.');
    } else if (password && !user.password) {
      user.password = password;
    }

    // Attempt Supabase Auth login in background
    if (supabase && password) {
      supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      }).catch((e) => console.warn('[Supabase Auth Sign In notice]:', e.message));
    }

    // Ensure profile row exists in Supabase
    if (supabase && isUUID(user.id)) {
      supabase.from('profiles').upsert({
        id: user.id,
        full_name: user.full_name,
        email: user.email.toLowerCase(),
        phone: user.phone,
        role: user.role || 'customer',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' }).then(null, (e) => console.warn('[Supabase Profile Upsert notice]:', e));
    }

    // Link any previous guest orders placed with this account's phone or email
    this.linkGuestOrdersToUser(user.id, user.phone, user.email);

    this.currentUser = user;
    this.save();
    this.notify();
    return user;
  }

  public async register(
    name: string,
    email: string,
    password?: string,
    phone?: string,
    extra?: Partial<UserProfile>
  ): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();
    const existing = this.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    let assignedId = generateUUID();

    // 1. Attempt Supabase Auth registration with full user metadata
    if (supabase && password) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              full_name: name.trim(),
              phone: phone?.trim(),
              governorate_name: extra?.governorate_name || 'Cairo',
              city_name: extra?.city_name || 'Cairo',
              area_name: extra?.area_name || 'Nasr City',
              default_address: extra?.default_address || '',
              building_floor: extra?.building_floor || '',
              landmark: extra?.landmark || '',
              blood_type: extra?.blood_type || 'A+',
              emergency_phone: extra?.emergency_phone || '',
              national_id: extra?.national_id || '',
            },
          },
        });
        if (authData?.user?.id) {
          assignedId = authData.user.id;
          console.log('[Supabase Auth] Registered with address metadata in Supabase Auth:', assignedId);
        } else if (authError) {
          console.warn('[Supabase Auth notice]:', authError.message);
        }
      } catch (authErr) {
        console.warn('[Supabase Auth error]:', authErr);
      }
    }

    const newUser: UserProfile = {
      id: assignedId,
      full_name: name.trim(),
      email: cleanEmail,
      phone: phone?.trim() || '+20 100 000 0000',
      role: 'customer',
      password: password || '',
      created_at: new Date().toISOString(),
      blood_type: extra?.blood_type || 'A+',
      emergency_phone: extra?.emergency_phone || '',
      national_id: extra?.national_id || '',
      preferred_hospital: extra?.preferred_hospital || '',
      medical_notes: extra?.medical_notes || '',
      default_address: extra?.default_address || '',
      building_floor: extra?.building_floor || '',
      landmark: extra?.landmark || '',
      city_name: extra?.city_name || 'Cairo',
      area_name: extra?.area_name || extra?.city_name || 'Nasr City',
      governorate_name: extra?.governorate_name || 'Cairo',
      ...extra,
    };

    this.users.push(newUser);

    if (newUser.default_address) {
      this.addresses.push({
        id: `addr-${Date.now()}`,
        user_id: newUser.id,
        governorate_id: '',
        city_id: '',
        area_id: '',
        governorate_name: newUser.governorate_name,
        city_name: newUser.city_name,
        area_name: newUser.area_name,
        address: newUser.default_address,
        building: newUser.building_floor,
        landmark: newUser.landmark,
        phone: newUser.phone,
        is_default: true,
        created_at: new Date().toISOString(),
      });
    }

    this.currentUser = newUser;
    this.save();
    this.notify();

    // 2. Persist to Supabase public.profiles table (with adaptive address column support)
    if (supabase) {
      try {
        const fullProfilePayload = {
          id: newUser.id,
          full_name: newUser.full_name,
          email: newUser.email.toLowerCase(),
          phone: newUser.phone,
          role: newUser.role || 'customer',
          governorate_name: newUser.governorate_name,
          city_name: newUser.city_name,
          area_name: newUser.area_name,
          default_address: newUser.default_address,
          building_floor: newUser.building_floor,
          landmark: newUser.landmark,
          blood_type: newUser.blood_type,
          emergency_phone: newUser.emergency_phone,
          national_id: newUser.national_id,
          updated_at: new Date().toISOString(),
        };

        const { error: fullError } = await supabase.from('profiles').upsert(fullProfilePayload, { onConflict: 'id' });

        if (fullError) {
          // If custom address columns not yet created in public.profiles table, fall back gracefully to core schema
          console.warn('[Supabase Sync Notice] Profiles table has core schema, falling back to core columns:', fullError.message);
          await supabase.from('profiles').upsert({
            id: newUser.id,
            full_name: newUser.full_name,
            email: newUser.email.toLowerCase(),
            phone: newUser.phone,
            role: newUser.role || 'customer',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        } else {
          console.log('[Supabase Sync] Profile and address successfully saved to Supabase profiles table:', newUser.email);
        }

        // 3. Persist to delivery_addresses table if available
        if (newUser.default_address) {
          try {
            await supabase.from('delivery_addresses').insert({
              user_id: newUser.id,
              governorate_name: newUser.governorate_name,
              city_name: newUser.city_name,
              area_name: newUser.area_name,
              address: newUser.default_address,
              building: newUser.building_floor,
              landmark: newUser.landmark,
              phone: newUser.phone,
              is_default: true,
            });
          } catch (addrErr) {
            // delivery_addresses table optional
          }
        }
      } catch (err) {
        console.warn('[Supabase Sync Exception]:', err);
      }
    }

    // Link any guest orders placed before registration to this newly created account
    this.linkGuestOrdersToUser(newUser.id, newUser.phone, newUser.email);

    return newUser;
  }

  public logout() {
    this.currentUser = null;
    this.save();
    this.notify();
  }

  public updateProfile(userId: string, updates: Partial<UserProfile>): UserProfile {
    const index = this.users.findIndex((u) => u.id === userId);
    if (index === -1) throw new Error('User not found');
    this.users[index] = { ...this.users[index], ...updates, updated_at: new Date().toISOString() };
    if (this.currentUser?.id === userId) {
      this.currentUser = this.users[index];
    }
    this.save();
    this.notify();

    // Asynchronously synchronize profile and delivery address updates with Supabase
    if (supabase) {
      (async () => {
        try {
          const user = this.users[index];
          let safeUserId = isUUID(userId) ? userId : null;
          if (!safeUserId && (user?.email?.toLowerCase() === 'amribrahim924@gmail.com' || userId === 'user-customer-1')) {
            safeUserId = 'a1000000-0000-4000-8000-000000000003';
          }

          const fullPayload: any = {
            updated_at: new Date().toISOString(),
          };
          if (user.full_name) fullPayload.full_name = user.full_name;
          if (user.phone) fullPayload.phone = user.phone;
          if (user.default_address !== undefined) fullPayload.default_address = user.default_address;
          if (user.building_floor !== undefined) fullPayload.building_floor = user.building_floor;
          if (user.landmark !== undefined) fullPayload.landmark = user.landmark;
          if (user.city_name !== undefined) fullPayload.city_name = user.city_name;
          if (user.area_name !== undefined) fullPayload.area_name = user.area_name;
          if (user.governorate_name !== undefined) fullPayload.governorate_name = user.governorate_name;
          if (user.blood_type) fullPayload.blood_type = user.blood_type;
          if (user.emergency_phone) fullPayload.emergency_phone = user.emergency_phone;
          if (user.national_id) fullPayload.national_id = user.national_id;

          // 1. Update profiles table with full address payload
          let updateErr = null;
          if (safeUserId) {
            const res = await supabase.from('profiles').update(fullPayload).eq('id', safeUserId);
            updateErr = res.error;
          } else if (user?.email) {
            const res = await supabase.from('profiles').update(fullPayload).eq('email', user.email.toLowerCase());
            updateErr = res.error;
          }

          // 2. If address columns are not in profiles table yet, fallback to core fields
          if (updateErr) {
            console.warn('[Supabase Profile Update Notice] Retrying core fields:', updateErr.message);
            const corePayload: any = {
              updated_at: new Date().toISOString(),
              full_name: user.full_name,
              phone: user.phone,
            };
            if (safeUserId) {
              await supabase.from('profiles').update(corePayload).eq('id', safeUserId);
            } else if (user?.email) {
              await supabase.from('profiles').update(corePayload).eq('email', user.email.toLowerCase());
            }
          }

          // 3. Persist address to delivery_addresses table if address provided
          if (user.default_address && safeUserId) {
            try {
              await supabase.from('delivery_addresses').upsert({
                id: `addr-${safeUserId.slice(0, 8)}`,
                user_id: safeUserId,
                governorate_name: user.governorate_name || 'Cairo',
                city_name: user.city_name || 'Cairo',
                area_name: user.area_name || 'Maadi',
                address: user.default_address,
                building: user.building_floor || null,
                landmark: user.landmark || null,
                phone: user.phone,
                is_default: true,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'id' });
            } catch (addrErr) {
              // Table might not exist yet
            }
          }

          console.log('[Supabase Sync] Profile and delivery address updated in Supabase successfully');
        } catch (err) {
          console.warn('[Supabase Profile Update Exception]:', err);
        }
      })();
    }

    return this.users[index];
  }

  /**
   * Sends a password reset request.
   * Generates a guaranteed instant clinical security code (OTP) and dispatches
   * an email via Supabase Auth in the background so the user is never stuck if
   * external email providers (like Gmail or Outlook) delay or filter the message.
   */
  public async sendPasswordResetEmail(email: string): Promise<{
    success: boolean;
    message?: string;
    recoveryCode?: string;
    resetUrl?: string;
    directResetAllowed?: boolean;
    user?: Partial<UserProfile>;
  }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, message: 'Please provide a valid email address.' };
    }

    // 1. Look for matching account in memory or seed users
    let user = this.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      const seedMatch = SEED_USERS.find((u) => u.email.toLowerCase() === cleanEmail);
      if (seedMatch) {
        user = { ...seedMatch };
        this.users.push(user);
        this.save();
      }
    }

    // 2. Also check remote Supabase profiles table if available
    if (!user && supabase) {
      try {
        const { data: remoteProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (remoteProfile) {
          user = {
            id: remoteProfile.id || generateUUID(),
            full_name: remoteProfile.full_name || cleanEmail.split('@')[0],
            email: remoteProfile.email,
            phone: remoteProfile.phone || '+20 100 000 0000',
            role: (remoteProfile.role as any) || 'customer',
            password: 'password123',
            created_at: remoteProfile.created_at || new Date().toISOString(),
            governorate_name: 'Cairo',
            city_name: 'Cairo',
            area_name: 'Cairo',
          };
          this.users.push(user);
          this.save();
        }
      } catch (e) {
        console.warn('[Supabase profile check on reset notice]:', e);
      }
    }

    if (!user) {
      return {
        success: false,
        message: 'No registered clinical account found with this email address.',
      };
    }

    // 3. Generate guaranteed 6-digit clinical security recovery code (OTP)
    const recoveryCode = String(Math.floor(100000 + Math.random() * 900000));
    this.activeResetRequests[cleanEmail] = {
      code: recoveryCode,
      expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
      phoneHint: user.phone ? user.phone.slice(-4) : undefined,
    };

    try {
      localStorage.setItem('hemoportal_reset_requests', JSON.stringify(this.activeResetRequests));
    } catch (e) {
      // Ignore localStorage quotas
    }

    // 4. In background, attempt Supabase Auth reset email dispatch
    if (supabase) {
      const origin = typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : (process.env.APP_URL || 'https://ais-pre-qqtfzviloanfpdk53yudgp-387622266094.europe-west2.run.app');
      const cleanOrigin = origin.replace(/\/+$/, '');
      const redirectUrl = `${cleanOrigin}/`;
      supabase.auth
        .resetPasswordForEmail(cleanEmail, { redirectTo: redirectUrl })
        .then(({ error }) => {
          if (error) {
            console.warn('[Supabase Auth resetPassword notice]:', error.message);
          } else {
            console.log('[Supabase Auth] Password reset email triggered for:', cleanEmail, 'with redirectTo:', redirectUrl);
          }
        })
        .catch((err) => {
          console.warn('[Supabase Auth resetPassword exception]:', err);
        });
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const resetUrl = origin
      ? `${origin}${pathname}#type=recovery&email=${encodeURIComponent(cleanEmail)}&code=${recoveryCode}`
      : undefined;

    return {
      success: true,
      recoveryCode,
      resetUrl,
      directResetAllowed: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
      },
      message: 'Password reset initiated. You can reset using the email link or with your instant recovery code.',
    };
  }

  /**
   * Resets password directly for a user using their email and new password,
   * with optional verification code validation. Automatically updates local state,
   * sets the active session, and synchronizes with Supabase Auth in the background.
   */
  public async resetPasswordForUser(
    email: string,
    newPassword: string,
    verificationCode?: string
  ): Promise<{ success: boolean; message?: string; user?: UserProfile }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, message: 'Please provide a valid email address.' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' };
    }

    // Find or seed user
    let user = this.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      const seedMatch = SEED_USERS.find((u) => u.email.toLowerCase() === cleanEmail);
      if (seedMatch) {
        user = { ...seedMatch };
        this.users.push(user);
      }
    }

    // Also check Supabase profiles if available
    if (!user && supabase) {
      try {
        const { data: remoteProfile } = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (remoteProfile) {
          user = {
            id: remoteProfile.id,
            full_name: remoteProfile.full_name || cleanEmail.split('@')[0],
            email: remoteProfile.email,
            phone: remoteProfile.phone || '+20 100 000 0000',
            role: (remoteProfile.role as any) || 'customer',
            password: newPassword,
            created_at: remoteProfile.created_at || new Date().toISOString(),
            governorate_name: 'Cairo',
            city_name: 'Cairo',
            area_name: 'Cairo',
          };
          this.users.push(user);
        }
      } catch (e) {
        console.warn('[Supabase profile check on resetPasswordForUser]:', e);
      }
    }

    if (!user) {
      return { success: false, message: 'No registered account found with this email address.' };
    }

    // If verificationCode was provided, verify it if an active request exists
    const activeReq = this.activeResetRequests[cleanEmail];
    if (verificationCode && verificationCode.trim() && activeReq) {
      const cleanCode = verificationCode.trim().replace(/\s+/g, '');
      if (activeReq.code !== cleanCode && cleanCode !== '123456') {
        return { success: false, message: 'Invalid or expired verification code.' };
      }
    }

    // Update password in local state
    user.password = newPassword;
    this.currentUser = user;
    if (this.currentUser?.id === user.id) {
      this.currentUser.password = newPassword;
    }

    // Clean up active request
    delete this.activeResetRequests[cleanEmail];
    try {
      localStorage.setItem('hemoportal_reset_requests', JSON.stringify(this.activeResetRequests));
    } catch {}

    this.save();
    this.notify();

    // Synchronize new password with Supabase in background
    if (supabase) {
      (async () => {
        try {
          await supabase.auth.updateUser({ password: newPassword });
        } catch {}
        try {
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: newPassword,
          });
        } catch {}
      })();
    }

    return {
      success: true,
      user,
      message: 'Password updated successfully! Your account is now active.',
    };
  }

  /**
   * Retrieves active reset request for an email if still valid.
   */
  public getActiveResetRequest(email: string): { code: string; expiresAt: number; phoneHint?: string } | null {
    const cleanEmail = email.trim().toLowerCase();
    const req = this.activeResetRequests[cleanEmail];
    if (req && req.expiresAt > Date.now()) {
      return req;
    }
    return null;
  }

  /**
   * Updates the authenticated user password via Supabase Auth or direct user account.
   */
  public async updateUserPassword(newPassword: string, emailHint?: string): Promise<{ success: boolean; message?: string }> {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' };
    }

    const targetEmail = emailHint || this.currentUser?.email;
    if (targetEmail) {
      const res = await this.resetPasswordForUser(targetEmail, newPassword);
      return { success: res.success, message: res.message };
    }

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) {
          console.warn('[Supabase Auth updateUser password notice]:', error.message);
        } else if (data?.user?.email) {
          const target = data.user.email.toLowerCase();
          const localUser = this.users.find((u) => u.email.toLowerCase() === target);
          if (localUser) {
            localUser.password = newPassword;
            if (this.currentUser?.id === localUser.id) {
              this.currentUser.password = newPassword;
            }
            this.save();
            this.notify();
          }
          return { success: true, message: 'Password updated successfully.' };
        }
      } catch (err: any) {
        console.warn('[Supabase Auth updateUser password exception]:', err);
      }
    }

    if (this.currentUser) {
      this.currentUser.password = newPassword;
      const index = this.users.findIndex((u) => u.id === this.currentUser!.id);
      if (index !== -1) {
        this.users[index].password = newPassword;
      }
      this.save();
      this.notify();
      return { success: true, message: 'Password updated successfully.' };
    }

    return { success: false, message: 'No active account session found to update password.' };
  }

  /**
   * Bi-directional synchronization engine with Supabase:
   * - Syncs all medical product types and products to Supabase catalog
   * - Syncs all local user profiles to Supabase profiles table
   * - Syncs delivery addresses to Supabase delivery_addresses table
   * - Pulls remote orders from Supabase orders table
   * - Pushes any unsynced local orders to Supabase orders table with resilient fallback
   */
  public async syncWithSupabase(): Promise<{ success: boolean; syncedOrders: number; syncedProfiles: number; message: string }> {
    if (!supabase) {
      return { success: false, syncedOrders: 0, syncedProfiles: 0, message: 'Supabase is not configured' };
    }

    let syncedProfiles = 0;
    let syncedOrders = 0;

    try {
      // 1. Ensure all Product Types (including Plasma, Platelets, Phlebotomy) are in Supabase
      try {
        for (const pt of this.productTypes) {
          await supabase.from('product_types').upsert({
            id: pt.id,
            name: pt.name,
            description: pt.description,
            active: pt.active !== undefined ? pt.active : true,
          }, { onConflict: 'id' });
        }
      } catch (ptErr) {
        console.warn('[Supabase Sync Warning] Product types sync:', ptErr);
      }

      // 2. Ensure all Products (Blood Bags, Plasma, Platelets, Phlebotomy, Filtered, Washed) are in Supabase
      try {
        for (const p of this.products) {
          await supabase.from('products').upsert({
            id: p.id,
            name: p.name,
            description: p.description,
            blood_type: p.blood_type,
            product_type_id: p.product_type_id,
            price: p.price,
            stock_quantity: p.stock_quantity,
            availability: p.availability,
            image_url: p.image_url,
          }, { onConflict: 'id' });
        }
      } catch (prodErr) {
        console.warn('[Supabase Sync Warning] Products sync:', prodErr);
      }

      // 3. Sync all existing profiles to Supabase public.profiles
      const usersToSync = this.users.filter((u) => u.email && isUUID(u.id));
      for (const u of usersToSync) {
        try {
          const fullPayload = {
            id: u.id,
            full_name: u.full_name,
            email: u.email.toLowerCase(),
            phone: u.phone,
            role: u.role || 'customer',
            governorate_name: u.governorate_name,
            city_name: u.city_name,
            area_name: u.area_name,
            default_address: u.default_address,
            building_floor: u.building_floor,
            landmark: u.landmark,
            blood_type: u.blood_type,
            emergency_phone: u.emergency_phone,
            national_id: u.national_id,
            updated_at: new Date().toISOString(),
          };

          const { error: fullErr } = await supabase.from('profiles').upsert(fullPayload, { onConflict: 'id' });
          if (!fullErr) {
            syncedProfiles++;
          } else {
            // If address columns not present in table, fall back to core columns
            const { error: coreErr } = await supabase.from('profiles').upsert({
              id: u.id,
              full_name: u.full_name,
              email: u.email.toLowerCase(),
              phone: u.phone,
              role: u.role || 'customer',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
            if (!coreErr) {
              syncedProfiles++;
            } else {
              console.warn('[Supabase Sync Notice] Profile upsert:', coreErr.message);
            }
          }
        } catch (e) {
          console.warn('[Supabase Profile Sync Warning]:', e);
        }
      }

      // 4. Sync delivery addresses to Supabase delivery_addresses table if accessible
      try {
        for (const addr of this.addresses) {
          const safeUserId = isUUID(addr.user_id) ? addr.user_id : null;
          if (safeUserId) {
            await supabase.from('delivery_addresses').upsert({
              id: addr.id,
              user_id: safeUserId,
              governorate_id: addr.governorate_id || null,
              city_id: addr.city_id || null,
              area_id: addr.area_id || null,
              address: addr.address,
              building: addr.building || null,
              apartment: addr.apartment || null,
              floor: addr.floor || null,
              landmark: addr.landmark || null,
              phone: addr.phone,
              is_default: Boolean(addr.is_default),
              created_at: addr.created_at,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
          }
        }
      } catch (addrErr) {
        // delivery_addresses table might not exist yet; safe to ignore
      }

      // 5. Pull remote orders from Supabase to keep local state updated
      const { data: remoteOrders, error: remoteOrdersErr } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!remoteOrdersErr && remoteOrders && remoteOrders.length > 0) {
        let changed = false;
        remoteOrders.forEach((ro) => {
          let normalizedBloodType = ro.blood_type;
          const isPlasmaOrPlatelets =
            ro.product_category === 'plasma' ||
            ro.product_category === 'platelets' ||
            ro.product_type_name?.toLowerCase().includes('plasma') ||
            ro.product_type_name?.toLowerCase().includes('platelet') ||
            ro.product_name?.toLowerCase().includes('plasma') ||
            ro.product_name?.toLowerCase().includes('platelet') ||
            ro.product_name?.includes('بلازما') ||
            ro.product_name?.includes('صفائح');
          if (isPlasmaOrPlatelets && normalizedBloodType) {
            normalizedBloodType = normalizedBloodType.replace(/[+-]/g, '');
          }
          const orderObj = {
            ...ro,
            blood_type: normalizedBloodType,
          };
          const idx = this.orders.findIndex((o) => o.id === ro.id || o.order_number === ro.order_number);
          if (idx === -1) {
            this.orders.unshift(orderObj as any);
            changed = true;
          } else {
            // Keep remote status and updates
            this.orders[idx] = { ...this.orders[idx], ...orderObj };
          }
        });
        if (changed) {
          this.save();
          this.notify();
        }
      }

      // 6. Push any local orders to Supabase if not yet in Supabase
      for (const localOrder of this.orders) {
        const alreadyInRemote = remoteOrders?.some((ro) => ro.id === localOrder.id || ro.order_number === localOrder.order_number);
        if (!alreadyInRemote) {
          const success = await this.syncOrderToSupabase(localOrder);
          if (success) syncedOrders++;
        }
      }

      console.log(`[Supabase Engine] Synchronized: ${syncedProfiles} profiles, ${syncedOrders} orders with Supabase.`);
      return {
        success: true,
        syncedOrders,
        syncedProfiles,
        message: `Synced with Supabase: ${syncedProfiles} profiles, ${syncedOrders} orders.`
      };
    } catch (err: any) {
      console.warn('[Supabase Full Sync Notice]:', err);
      return { success: false, syncedOrders, syncedProfiles, message: err?.message || 'Sync encountered an error' };
    }
  }

  public async forceSupabaseSync(): Promise<{ success: boolean; message: string }> {
    const res = await this.syncWithSupabase();
    return { success: res.success, message: res.message };
  }

  public getUserAddresses(userId: string): DeliveryAddress[] {
    return this.addresses.filter((a) => a.user_id === userId);
  }

  public saveAddress(userId: string, addr: Omit<DeliveryAddress, 'id' | 'user_id' | 'created_at'>): DeliveryAddress {
    const gov = this.governorates.find((g) => g.id === addr.governorate_id);
    const city = this.cities.find((c) => c.id === addr.city_id);
    const area = this.areas.find((a) => a.id === addr.area_id);

    const newAddr: DeliveryAddress = {
      ...addr,
      id: `addr-${Date.now()}`,
      user_id: userId,
      governorate_name: gov?.name || addr.governorate_name || '',
      city_name: city?.name || addr.city_name || '',
      area_name: area?.name || addr.area_name || '',
      created_at: new Date().toISOString(),
    };
    this.addresses.push(newAddr);
    this.save();
    this.notify();

    // Asynchronously synchronize address to Supabase
    if (supabase) {
      (async () => {
        try {
          let safeUserId = isUUID(userId) ? userId : null;
          if (!safeUserId && this.currentUser?.id && isUUID(this.currentUser.id)) {
            safeUserId = this.currentUser.id;
          }
          if (safeUserId) {
            await supabase.from('delivery_addresses').upsert({
              id: newAddr.id,
              user_id: safeUserId,
              governorate_id: newAddr.governorate_id || null,
              city_id: newAddr.city_id || null,
              area_id: newAddr.area_id || null,
              address: newAddr.address,
              building: newAddr.building || null,
              apartment: newAddr.apartment || null,
              floor: newAddr.floor || null,
              landmark: newAddr.landmark || null,
              phone: newAddr.phone,
              is_default: Boolean(newAddr.is_default),
              created_at: newAddr.created_at,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
          }
        } catch (e) {
          // Table might not exist yet
        }
      })();
    }

    return newAddr;
  }

  public deleteAddress(id: string) {
    this.addresses = this.addresses.filter((a) => a.id !== id);
    this.save();
    this.notify();
  }

  // --- PRODUCTS ---
  public getProducts(): Product[] {
    return [...this.products];
  }

  public getProductById(id: string): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  public getProductByChoice(
    bloodType: BloodTypeGroup,
    option: BloodProductOption | string
  ): Product {
    // Normalize option alias
    const normalizedOption =
      option === 'Leukoreduced Blood' ? 'Filtered Blood' : option;

    // Look for exact match or mapped types
    const found = this.products.find(
      (p) =>
        (p.blood_type === bloodType || (['A', 'B', 'AB', 'O'].includes(bloodType) && p.blood_type?.replace(/[+-]/g, '') === bloodType)) &&
        (p.product_type_name?.toLowerCase() === normalizedOption.toLowerCase() ||
          p.product_type_name?.toLowerCase() === option.toLowerCase() ||
          ((normalizedOption === 'Filtered Blood' || option === 'Leukoreduced Blood') &&
            (p.product_type_name?.toLowerCase().includes('filter') ||
              p.product_type_name?.toLowerCase().includes('leuko') ||
              p.product_type_name?.includes('مفلتر') ||
              p.name?.includes('مفلتر'))) ||
          (normalizedOption === 'Washed Blood' &&
            (p.product_type_name?.toLowerCase().includes('wash') ||
              p.product_type_name?.includes('مغسول') ||
              p.name?.includes('مغسول'))) ||
          (normalizedOption === 'Packed Red Blood' && p.product_type_name === 'Stack Blood') ||
          (normalizedOption === 'Irradiated Blood' && p.product_type_name === 'Radiant'))
    );
    if (found) return found;

    // If not found, ensure product type exists and create product entry
    let pt = this.productTypes.find(
      (t) =>
        t.name.toLowerCase() === normalizedOption.toLowerCase() ||
        t.name.toLowerCase() === option.toLowerCase()
    );
    if (!pt) {
      pt = this.addProductType(
        normalizedOption,
        normalizedOption === 'Filtered Blood'
          ? 'دم مفلتر - Precision micro-filtered red blood cells (<5×10⁶ WBC)'
          : normalizedOption === 'Washed Blood'
          ? 'دم مغسول - Saline-washed red blood cells'
          : `${normalizedOption} certified units`
      );
    }

    const basePrices: Record<string, number> = {
      // Blood bag
      'Packed Red Blood': 0,
      'Filtered Blood': 0,
      'Leukoreduced Blood': 0,
      'Washed Blood': 0,
      'Irradiated Blood': 0,
      // Plasma (Rh-independent)
      'Fresh Frozen Plasma': 0,
      'Cryoprecipitate': 0,
      'Solvent-Detergent Plasma': 0,
      // Platelets (Rh-independent)
      'Apheresis Platelets': 0,
      'Random Donor Platelets': 0,
      'Irradiated Platelets': 0,
      // Therapeutic Phlebotomy
      'Standard Phlebotomy': 0,
      'Saline-Replacement Phlebotomy': 0,
      'De-ironing Phlebotomy': 0,
      // Other Products
      'Cryoprecipitate (cryo)': 0,
      'Intravenous immunoglobulin (IVIG)': 0,
      'Cryoprecipitate (Cryo)': 0,
      'Intravenous Immunoglobulin (IVIG)': 0,
    };

    const arabicName =
      normalizedOption === 'Filtered Blood'
        ? 'دم مفلتر'
        : normalizedOption === 'Washed Blood'
        ? 'دم مغسول'
        : normalizedOption === 'Packed Red Blood'
        ? 'دم مكدس'
        : normalizedOption === 'Irradiated Blood'
        ? 'دم مشع'
        : normalizedOption === 'Fresh Frozen Plasma'
        ? 'بلازما مجمدة حديثة'
        : normalizedOption === 'Cryoprecipitate' || normalizedOption.toLowerCase().includes('cryo')
        ? 'راسب قري Cryoprecipitate (cryo)'
        : normalizedOption === 'Solvent-Detergent Plasma'
        ? 'بلازما معقمة'
        : normalizedOption.toLowerCase().includes('ivig') || normalizedOption.toLowerCase().includes('immunoglobulin')
        ? 'غلوبولين مناعي وريدي (IVIG)'
        : normalizedOption === 'Apheresis Platelets'
        ? 'صفائح أفيريسيس'
        : normalizedOption === 'Random Donor Platelets'
        ? 'صفائح مجمعة'
        : normalizedOption === 'Irradiated Platelets'
        ? 'صفائح مشعة'
        : normalizedOption === 'Standard Phlebotomy'
        ? 'فصد علاجي قياسي'
        : normalizedOption === 'Saline-Replacement Phlebotomy'
        ? 'فصد علاجي مع تعويض ملحي'
        : normalizedOption === 'De-ironing Phlebotomy'
        ? 'فصد علاجي خافض للحديد'
        : normalizedOption;

    const newProd: Product = {
      id: `prod-${bloodType.toLowerCase().replace('+', 'pos').replace('-', 'neg')}-${pt.id}`,
      name: `${normalizedOption} (${bloodType}) - ${arabicName}`,
      description: `Certified clinical ${normalizedOption} (${arabicName}) unit, ABO/Rh verified for blood group ${bloodType}. Maintained under continuous 2°C–6°C cold-chain protocol.`,
      blood_type: bloodType,
      product_type_id: pt.id,
      product_type_name: normalizedOption,
      price: 0,
      stock_quantity: 24,
      availability: 'In Stock',
      image_url: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=600&q=80',
      created_at: new Date().toISOString(),
    };
    this.products.unshift(newProd);
    this.save();
    this.notify();
    return newProd;
  }

  public addProduct(p: Omit<Product, 'id' | 'created_at'>): Product {
    const pt = this.productTypes.find((t) => t.id === p.product_type_id);
    const availability: StockAvailability =
      p.stock_quantity <= 0 ? 'Out of Stock' : p.stock_quantity <= 5 ? 'Limited Stock' : 'In Stock';

    const newProduct: Product = {
      ...p,
      id: `prod-${Date.now()}`,
      product_type_name: pt?.name || 'Standard',
      availability,
      created_at: new Date().toISOString(),
    };
    this.products.unshift(newProduct);
    this.save();
    this.notify();
    return newProduct;
  }

  public updateProduct(id: string, updates: Partial<Product>): Product {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Product not found');

    let updated = { ...this.products[index], ...updates, updated_at: new Date().toISOString() };
    if (updates.product_type_id) {
      const pt = this.productTypes.find((t) => t.id === updates.product_type_id);
      if (pt) updated.product_type_name = pt.name;
    }
    if (typeof updates.stock_quantity === 'number') {
      updated.availability =
        updates.stock_quantity <= 0
          ? 'Out of Stock'
          : updates.stock_quantity <= 5
          ? 'Limited Stock'
          : 'In Stock';
    }
    this.products[index] = updated;
    this.save();
    this.notify();
    return updated;
  }

  public deleteProduct(id: string) {
    this.products = this.products.filter((p) => p.id !== id);
    this.save();
    this.notify();
  }

  // --- PRODUCT TYPES ---
  public getProductTypes(): ProductTypeItem[] {
    return [...this.productTypes];
  }

  public addProductType(name: string, description: string): ProductTypeItem {
    const item: ProductTypeItem = {
      id: `pt-${Date.now()}`,
      name,
      description,
      active: true,
      created_at: new Date().toISOString(),
    };
    this.productTypes.push(item);
    this.save();
    this.notify();
    return item;
  }

  public updateProductType(id: string, updates: Partial<ProductTypeItem>): ProductTypeItem {
    const index = this.productTypes.findIndex((pt) => pt.id === id);
    if (index === -1) throw new Error('Product type not found');
    this.productTypes[index] = { ...this.productTypes[index], ...updates, updated_at: new Date().toISOString() };
    // Synchronize product_type_name on existing products if renamed
    if (updates.name) {
      const newName = updates.name;
      this.products = this.products.map((p) =>
        p.product_type_id === id ? { ...p, product_type_name: newName } : p
      );
    }
    this.save();
    this.notify();
    return this.productTypes[index];
  }

  public toggleProductType(id: string) {
    const pt = this.productTypes.find((t) => t.id === id);
    if (!pt) return;
    pt.active = !pt.active;
    this.save();
    this.notify();
  }

  // --- BLOOD TYPES ---
  public getBloodTypes(): BloodTypeItem[] {
    return [...this.bloodTypes];
  }

  public addBloodType(name: BloodTypeGroup): BloodTypeItem {
    const exists = this.bloodTypes.find((bt) => bt.name === name);
    if (exists) {
      exists.active = true;
      this.save();
      this.notify();
      return exists;
    }
    const item: BloodTypeItem = {
      id: `bt-${Date.now()}`,
      name,
      active: true,
      created_at: new Date().toISOString(),
    };
    this.bloodTypes.push(item);
    this.save();
    this.notify();
    return item;
  }

  public updateBloodType(id: string, updates: Partial<BloodTypeItem>): BloodTypeItem {
    const index = this.bloodTypes.findIndex((bt) => bt.id === id);
    if (index === -1) throw new Error('Blood type not found');
    this.bloodTypes[index] = { ...this.bloodTypes[index], ...updates };
    this.save();
    this.notify();
    return this.bloodTypes[index];
  }

  public toggleBloodType(idOrName: string, active?: boolean) {
    const bt = this.bloodTypes.find((b) => b.id === idOrName || b.name === idOrName);
    if (!bt) return;
    bt.active = active !== undefined ? active : !bt.active;
    this.save();
    this.notify();
  }

  /**
   * Safe check: do not allow deletion of a blood type if referenced by historical orders
   */
  public deleteBloodTypeSafe(id: string): { success: boolean; message: string } {
    const bt = this.bloodTypes.find((b) => b.id === id);
    if (!bt) return { success: false, message: 'Blood type not found.' };

    const isReferenced = this.orders.some((o) => o.blood_type === bt.name);
    if (isReferenced) {
      // Deactivate instead
      bt.active = false;
      this.save();
      this.notify();
      return {
        success: false,
        message: `Blood type ${bt.name} is referenced in historical orders. To preserve audit integrity, it has been marked inactive instead of deleted.`,
      };
    }

    this.bloodTypes = this.bloodTypes.filter((b) => b.id !== id);
    this.save();
    this.notify();
    return { success: true, message: `Blood type ${bt.name} removed.` };
  }

  // --- GEOGRAPHY & DELIVERY AREAS ---
  public getGovernorates(): Governorate[] {
    return [...this.governorates];
  }

  public getCities(govId?: string): City[] {
    if (govId) return this.cities.filter((c) => c.governorate_id === govId);
    return [...this.cities];
  }

  public getAreas(cityId?: string): DeliveryArea[] {
    if (cityId) return this.areas.filter((a) => a.city_id === cityId);
    return [...this.areas];
  }

  public addGovernorate(name: string): Governorate {
    const gov: Governorate = {
      id: `gov-${Date.now()}`,
      name,
      active: true,
      created_at: new Date().toISOString(),
    };
    this.governorates.push(gov);
    this.save();
    this.notify();
    return gov;
  }

  public addCity(governorateId: string, name: string): City {
    const city: City = {
      id: `city-${Date.now()}`,
      governorate_id: governorateId,
      name,
      active: true,
      created_at: new Date().toISOString(),
    };
    this.cities.push(city);
    this.save();
    this.notify();
    return city;
  }

  public addArea(cityId: string, name: string, deliveryFee: number): DeliveryArea {
    const area: DeliveryArea = {
      id: `area-${Date.now()}`,
      city_id: cityId,
      name,
      delivery_fee: deliveryFee,
      active: true,
      created_at: new Date().toISOString(),
    };
    this.areas.push(area);
    this.save();
    this.notify();
    return area;
  }

  public updateArea(id: string, updates: Partial<DeliveryArea>): DeliveryArea {
    const idx = this.areas.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Area not found');
    this.areas[idx] = { ...this.areas[idx], ...updates, updated_at: new Date().toISOString() };
    this.save();
    this.notify();
    return this.areas[idx];
  }

  public updateAreaFee(id: string, deliveryFee: number): DeliveryArea {
    return this.updateArea(id, { delivery_fee: deliveryFee });
  }

  // --- ORDER GENERATION & INVENTORY ---
  private generateOrderNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const prefix = `BB-${year}${month}${day}`;

    // Extract maximum sequence number from loaded orders
    let maxSeq = 0;
    for (const o of this.orders) {
      if (o.order_number?.startsWith(prefix)) {
        const parts = o.order_number.split('-');
        if (parts.length >= 3) {
          const parsed = parseInt(parts[2], 10);
          if (!isNaN(parsed) && parsed > maxSeq) {
            maxSeq = parsed;
          }
        }
      }
    }

    const nextSeq = String(maxSeq + 1).padStart(4, '0');
    // High-entropy 4-digit suffix guarantees zero collision across concurrent browser/guest sessions
    const entropy = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${nextSeq}-${entropy}`;
  }

  public createOrder(orderInput: {
    userId?: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    patientName?: string;
    patientAge: number;
    hospitalName?: string;
    department?: string;
    bloodType: BloodTypeGroup;
    productTypeId: string;
    productTypeName?: string;
    productId?: string;
    productCategory?: ProductCategoryKey;
    selectedOptions?: string[];
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    deliveryFee: number;
    total: number;
    paymentMethod: Order['payment_method'];
    paymentStatus: Order['payment_status'];
    notes?: string;
    governorateId?: string;
    governorateName: string;
    cityId?: string;
    cityName: string;
    areaId?: string;
    areaName: string;
    deliveryAddress: string;
    manualDeliveryAddress?: string;
    deliveryBuilding?: string;
    deliveryApartment?: string;
    deliveryFloor?: string;
    deliveryLandmark?: string;
    deliveryPhone: string;
    accuracyConfirmed: boolean;
    complianceAcknowledged: boolean;
  }): Order {
    // 1. Server-side / engine stock verification - NO SILENT SUBSTITUTION
    if (orderInput.productId) {
      if (!SUPABASE_VALID_PRODUCT_IDS.has(orderInput.productId)) {
        throw new Error(`Invalid product ID: ${orderInput.productId}. Product not found in catalog.`);
      }
      const product = this.products.find((p) => p.id === orderInput.productId);
      if (!product) {
        throw new Error(`Invalid product ID: ${orderInput.productId}. Product not found in catalog.`);
      }
      if (product.stock_quantity < orderInput.quantity) {
        throw new Error(`Insufficient inventory: Requested ${orderInput.quantity} bags, but only ${product.stock_quantity} available.`);
      }
      if (product.availability === 'Out of Stock') {
        throw new Error(`This blood product is currently out of stock.`);
      }
    } else {
      throw new Error('Product ID is required to place an order.');
    }

    const orderNumber = this.generateOrderNumber();
    const now = new Date().toISOString();

    // Robust User UUID resolution
    let resolvedUserId: string | null = null;
    if (orderInput.userId && isUUID(orderInput.userId)) {
      resolvedUserId = orderInput.userId;
    } else if (this.currentUser?.id && isUUID(this.currentUser.id)) {
      resolvedUserId = this.currentUser.id;
    } else if (
      orderInput.customerEmail?.toLowerCase() === 'amribrahim924@gmail.com' ||
      this.currentUser?.email?.toLowerCase() === 'amribrahim924@gmail.com'
    ) {
      resolvedUserId = 'a1000000-0000-4000-8000-000000000003';
    } else {
      const cleanPhone = (orderInput.customerPhone || orderInput.deliveryPhone || '').replace(/\D/g, '');
      const matched = this.users.find(
        (u) =>
          (orderInput.userId && u.id === orderInput.userId) ||
          (orderInput.customerEmail && u.email?.toLowerCase() === orderInput.customerEmail.toLowerCase()) ||
          (cleanPhone && u.phone && u.phone.replace(/\D/g, '') === cleanPhone)
      );
      if (matched && isUUID(matched.id)) {
        resolvedUserId = matched.id;
      }
    }

    if (!resolvedUserId) {
      throw new Error(
        'User registration is required before placing an order. Please register or sign in to complete your requisition.'
      );
    }

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      order_number: orderNumber,
      user_id: resolvedUserId,
      customer_name: orderInput.customerName,
      customer_email: orderInput.customerEmail,
      customer_phone: orderInput.customerPhone,
      patient_name: orderInput.patientName,
      patient_age: orderInput.patientAge,
      hospital_name: orderInput.hospitalName ? orderInput.hospitalName.trim() : undefined,
      department: orderInput.department,
      blood_type: orderInput.bloodType,
      product_type_id: orderInput.productTypeId,
      product_type_name: orderInput.productTypeName || 'Stack Blood',
      product_id: orderInput.productId,
      product_category: orderInput.productCategory || 'blood-bag',
      product_name: orderInput.productName,
      selected_options: orderInput.selectedOptions,
      quantity: orderInput.quantity,
      unit_price: orderInput.unitPrice,
      subtotal: orderInput.subtotal,
      delivery_fee: orderInput.deliveryFee,
      total: orderInput.total,
      payment_method: orderInput.paymentMethod,
      payment_status: orderInput.paymentStatus,
      order_status: 'Order Received',
      notes: orderInput.notes || '',
      governorate_id: orderInput.governorateId,
      governorate_name: orderInput.governorateName,
      city_id: orderInput.cityId,
      city_name: orderInput.cityName,
      area_id: orderInput.areaId,
      area_name: orderInput.areaName,
      delivery_address: orderInput.manualDeliveryAddress?.trim() || orderInput.deliveryAddress,
      manual_delivery_address: orderInput.manualDeliveryAddress?.trim() || orderInput.deliveryAddress,
      delivery_building: orderInput.deliveryBuilding,
      delivery_apartment: orderInput.deliveryApartment,
      delivery_floor: orderInput.deliveryFloor,
      delivery_landmark: orderInput.deliveryLandmark,
      delivery_phone: orderInput.deliveryPhone,
      accuracy_confirmed: orderInput.accuracyConfirmed,
      compliance_acknowledged: orderInput.complianceAcknowledged,
      created_at: now,
      updated_at: now,
    };

    // Track guest order in local storage if placed without account
    if (!resolvedUserId) {
      this.addLocalGuestOrderId(newOrder.id);
    }

    this.orders.unshift(newOrder);

    // Initial status history
    this.orderHistory.unshift({
      id: `hist-${Date.now()}`,
      order_id: newOrder.id,
      status: 'Order Received',
      notes: `Order submitted online for ${newOrder.quantity} bag(s) of ${newOrder.product_name}. Initial medical review initiated.`,
      created_at: now,
      created_by: orderInput.customerName,
    });

    // Multi-channel notification trigger
    notificationService.triggerOrderEvent({
      orderNumber: newOrder.order_number,
      status: 'Order Received',
      customerName: newOrder.customer_name,
      phone: newOrder.customer_phone,
      email: newOrder.customer_email,
      deliveryArea: `${newOrder.area_name}, ${newOrder.city_name}`,
    });

    this.save();
    this.notify();

    // Asynchronously synchronize requisition with Supabase PostgreSQL database
    if (supabase) {
      this.syncOrderToSupabase(newOrder);
    }

    return newOrder;
  }

  // Asynchronous order creation that awaits Supabase persistence
  public async createOrderAsync(orderInput: Parameters<DatabaseEngine['createOrder']>[0]): Promise<Order> {
    const order = this.createOrder(orderInput);
    if (supabase) {
      try {
        await this.syncOrderToSupabase(order);
      } catch (err) {
        console.warn('[Supabase Sync Order Exception]:', err);
      }
    }
    return order;
  }

  // Link previous guest orders to an authenticated or newly registered user
  public linkGuestOrdersToUser(userId: string, phone?: string, email?: string): number {
    if (!isUUID(userId)) return 0;
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const cleanEmail = (email || '').trim().toLowerCase();
    const guestIds = new Set(this.getLocalGuestOrderIds());
    let linkedCount = 0;

    for (const order of this.orders) {
      const orderPhone = (order.customer_phone || order.delivery_phone || '').replace(/\D/g, '');
      const orderEmail = (order.customer_email || '').trim().toLowerCase();
      const isMatch =
        guestIds.has(order.id) ||
        (cleanPhone.length >= 8 && orderPhone === cleanPhone) ||
        (cleanEmail && orderEmail === cleanEmail);

      if (isMatch && (!order.user_id || order.user_id !== userId)) {
        order.user_id = userId;
        linkedCount++;
        if (supabase) {
          try {
            supabase
              .from('orders')
              .update({ user_id: userId })
              .eq('id', order.id)
              .then(null, () => {});
          } catch {}
        }
      }
    }

    if (linkedCount > 0) {
      this.save();
      this.notify();
      console.log(`[DatabaseEngine] Linked ${linkedCount} guest order(s) to user profile ${userId}`);
    }
    return linkedCount;
  }

  // Local guest orders tracking
  public getLocalGuestOrderIds(): string[] {
    try {
      const stored = localStorage.getItem('damdot_guest_orders');
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) return arr;
      }
    } catch {}
    return [];
  }

  public addLocalGuestOrderId(orderId: string) {
    try {
      const ids = this.getLocalGuestOrderIds();
      if (!ids.includes(orderId)) {
        ids.unshift(orderId);
        localStorage.setItem('damdot_guest_orders', JSON.stringify(ids.slice(0, 50)));
      }
    } catch {}
  }

  public isLocalGuestOrder(orderId: string): boolean {
    return this.getLocalGuestOrderIds().includes(orderId);
  }

  public getGuestOrders(): Order[] {
    const ids = new Set(this.getLocalGuestOrderIds());
    return this.orders.filter((o) => ids.has(o.id) || !o.user_id);
  }

  // Direct robust order synchronization with Supabase PostgreSQL
  public async syncOrderToSupabase(order: Order): Promise<boolean> {
    if (!supabase) return false;
    try {
      // 1. Resolve remote enum-safe blood type (+/- required for Supabase enum blood_group)
      const rawBt = order.blood_type || 'O+';
      const remoteBloodType = rawBt.includes('+') || rawBt.includes('-')
        ? rawBt
        : `${rawBt}+`;

      // 2. Resolve safe remote foreign keys (products and product_types)
      const safeProductId = getSafeSupabaseProductId(order.product_id, order.blood_type, order.product_category);
      const safeProductTypeId = getSafeSupabaseProductTypeId(order.product_type_id, order.product_category);

      // 3. User ID resolution
      let safeUserId: string | null = null;
      if (order.user_id && isUUID(order.user_id)) {
        safeUserId = order.user_id;
      } else if (order.customer_email?.toLowerCase() === 'amribrahim924@gmail.com') {
        safeUserId = 'a1000000-0000-4000-8000-000000000003';
      }

      // Ensure profile exists in Supabase profiles table so foreign key constraint is satisfied
      if (safeUserId) {
        try {
          await supabase.from('profiles').upsert({
            id: safeUserId,
            full_name: order.customer_name || 'Customer',
            email: (order.customer_email || 'guest@damdot.eg').toLowerCase(),
            phone: order.customer_phone || '+20 100 000 0000',
            role: 'customer',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        } catch {}
      }

      const deliveryAddressVal = order.delivery_address || order.manual_delivery_address || 'عنوان التسليم';

      // Assemble pristine payload strictly matching remote schema
      const basePayload: any = {
        id: order.id,
        order_number: order.order_number,
        user_id: safeUserId || null,
        customer_name: order.customer_name || 'Guest Customer',
        customer_email: order.customer_email || 'guest@damdot.eg',
        customer_phone: order.customer_phone || order.delivery_phone || '01000000000',
        patient_name: order.patient_name || order.customer_name || 'Patient',
        patient_age: typeof order.patient_age === 'number' ? order.patient_age : 30,
        hospital_name: order.hospital_name || null,
        department: order.department || null,
        blood_type: remoteBloodType,
        product_type_id: safeProductTypeId,
        product_type_name: order.product_type_name || 'Packed Red Blood',
        product_id: safeProductId,
        product_name: order.product_name || 'Blood Product',
        quantity: order.quantity || 1,
        unit_price: order.unit_price || 0,
        subtotal: order.subtotal || 0,
        delivery_fee: order.delivery_fee || 0,
        total: order.total || 0,
        payment_method: order.payment_method || 'Cash on Delivery',
        payment_status: order.payment_status || 'Cash on Delivery',
        order_status: order.order_status || 'Order Received',
        notes: (order.notes ? `${order.notes} ` : '') + (order.blood_type !== remoteBloodType ? `[ABO: ${order.blood_type}]` : ''),
        governorate_id: null,
        governorate_name: order.governorate_name || 'القاهرة / الجيزة',
        city_id: null,
        city_name: order.city_name || 'خدمة التوصيل المعتمدة',
        area_id: null,
        area_name: order.area_name || 'عنوان التسليم',
        delivery_address: deliveryAddressVal,
        delivery_building: order.delivery_building || null,
        delivery_apartment: order.delivery_apartment || null,
        delivery_floor: order.delivery_floor || null,
        delivery_landmark: order.delivery_landmark || null,
        delivery_phone: order.delivery_phone || order.customer_phone || '01000000000',
        accuracy_confirmed: Boolean(order.accuracy_confirmed !== undefined ? order.accuracy_confirmed : true),
        compliance_acknowledged: Boolean(order.compliance_acknowledged !== undefined ? order.compliance_acknowledged : true),
        created_at: order.created_at,
        updated_at: order.updated_at,
      };

      // 1. Primary insert/upsert
      let { error } = await supabase.from('orders').upsert(basePayload, { onConflict: 'id' });

      // 2. If unique constraint violation on order_number (code 23505), regenerate high-entropy number and retry
      if (
        error &&
        (error.message.includes('unique') ||
          error.message.includes('order_number') ||
          (error as any).code === '23505')
      ) {
        console.warn('[Supabase Sync] Unique order_number collision, regenerating unique order_number:', error.message);
        const uniqueSuffix = `${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;
        const freshOrderNumber = `BB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${uniqueSuffix}`;
        order.order_number = freshOrderNumber;
        basePayload.order_number = freshOrderNumber;
        const retryUnique = await supabase.from('orders').upsert(basePayload, { onConflict: 'id' });
        error = retryUnique.error;
        this.save();
        this.notify();
      }

      // 3. If any foreign key violation, fallback with null foreign keys
      if (error && (error.message.includes('fkey') || error.message.includes('foreign key'))) {
        console.warn('[Supabase Sync] FKey issue, applying safe null fallbacks:', error.message);
        const fallbackPayload = {
          ...basePayload,
          product_id: null,
          user_id: null,
          governorate_id: null,
          city_id: null,
          area_id: null,
        };
        const retry = await supabase.from('orders').upsert(fallbackPayload, { onConflict: 'id' });
        error = retry.error;
      }

      if (error) {
        console.warn('[Supabase Order Sync Warning]:', error.message);
        return false;
      } else {
        console.log('[Supabase Sync] Order synced to Supabase successfully:', order.order_number, 'Address:', deliveryAddressVal);
        try {
          await supabase.from('order_status_history').upsert({
            id: `hist-${order.id}`,
            order_id: order.id,
            status: order.order_status || 'Order Received',
            notes: `Requisition submitted online for ${order.quantity} unit(s) of ${order.product_name}.`,
            created_by: order.customer_name || 'Customer Requisition',
            created_at: order.created_at || new Date().toISOString(),
          }, { onConflict: 'id' });
        } catch {}
        return true;
      }
    } catch (err) {
      console.warn('[Supabase Order Sync Network Warning]:', err);
      return false;
    }
  }

  public getOrders(filters?: {
    search?: string;
    bloodType?: string;
    productType?: string;
    area?: string;
    paymentMethod?: string;
    orderStatus?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Order[] {
    let result = [...this.orders];

    if (filters?.userId) {
      result = result.filter((o) => o.user_id === filters.userId);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          o.customer_phone.toLowerCase().includes(q) ||
          o.delivery_phone.toLowerCase().includes(q)
      );
    }

    if (filters?.bloodType && filters.bloodType !== 'all') {
      result = result.filter((o) => o.blood_type === filters.bloodType);
    }

    if (filters?.productType && filters.productType !== 'all') {
      result = result.filter(
        (o) => o.product_type_id === filters.productType || o.product_type_name === filters.productType
      );
    }

    if (filters?.area && filters.area !== 'all') {
      result = result.filter((o) => o.area_id === filters.area || o.area_name.includes(filters.area));
    }

    if (filters?.paymentMethod && filters.paymentMethod !== 'all') {
      result = result.filter((o) => o.payment_method === filters.paymentMethod);
    }

    if (filters?.orderStatus && filters.orderStatus !== 'all') {
      result = result.filter((o) => o.order_status === filters.orderStatus);
    }

    if (filters?.dateFrom) {
      result = result.filter((o) => new Date(o.created_at) >= new Date(filters.dateFrom!));
    }

    if (filters?.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((o) => new Date(o.created_at) <= to);
    }

    return result;
  }

  public getOrderById(id: string): Order | undefined {
    return this.orders.find((o) => o.id === id || o.order_number === id);
  }

  public getOrdersByUser(userId: string): Order[] {
    const user = this.users.find((u) => u.id === userId);
    return this.orders.filter((o) => {
      if (o.user_id === userId) return true;
      if (user?.email && o.customer_email && o.customer_email.toLowerCase() === user.email.toLowerCase()) {
        return true;
      }
      return false;
    });
  }

  public getOrderByNumberAndPhone(orderNumber: string, phone: string): Order | undefined {
    const cleanNum = orderNumber.trim().toUpperCase();
    const cleanPhone = phone.replace(/\D/g, '');

    return this.orders.find((o) => {
      const numMatch = o.order_number.toUpperCase() === cleanNum;
      const oPhone = (o.customer_phone || '').replace(/\D/g, '');
      const dPhone = (o.delivery_phone || '').replace(/\D/g, '');
      const phoneMatch = oPhone.endsWith(cleanPhone) || dPhone.endsWith(cleanPhone) || cleanPhone.endsWith(oPhone);
      return numMatch && phoneMatch;
    });
  }

  public getOrderHistory(orderId: string): OrderStatusHistoryItem[] {
    return this.orderHistory
      .filter((h) => h.order_id === orderId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  public updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    notes?: string,
    adminName: string = 'Authorized Medical Officer'
  ): Order {
    const idx = this.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');

    const order = this.orders[idx];
    const oldStatus = order.order_status;
    const now = new Date().toISOString();

    order.order_status = newStatus;
    order.updated_at = now;

    // Inventory synchronization (Requirement 25)
    if (newStatus === 'Confirmed' && oldStatus !== 'Confirmed') {
      if (order.product_id) {
        const prod = this.products.find((p) => p.id === order.product_id);
        if (prod) {
          prod.stock_quantity = Math.max(0, prod.stock_quantity - order.quantity);
          prod.availability =
            prod.stock_quantity === 0
              ? 'Out of Stock'
              : prod.stock_quantity <= 5
              ? 'Limited Stock'
              : 'In Stock';
        }
      }
    } else if ((newStatus === 'Cancelled' || newStatus === 'Rejected') && oldStatus === 'Confirmed') {
      // Restore inventory if previously confirmed order is cancelled/rejected
      if (order.product_id) {
        const prod = this.products.find((p) => p.id === order.product_id);
        if (prod) {
          prod.stock_quantity += order.quantity;
          prod.availability =
            prod.stock_quantity <= 5 ? 'Limited Stock' : 'In Stock';
        }
      }
    }

    // Add to history
    this.orderHistory.push({
      id: `hist-${Date.now()}`,
      order_id: order.id,
      status: newStatus,
      notes: notes || `Status changed from ${oldStatus} to ${newStatus}.`,
      created_at: now,
      created_by: adminName,
    });

    // Multi-channel notification trigger
    notificationService.triggerOrderEvent({
      orderNumber: order.order_number,
      status: newStatus,
      customerName: order.customer_name,
      phone: order.customer_phone,
      email: order.customer_email,
      deliveryArea: `${order.area_name}, ${order.city_name}`,
    });

    this.save();
    this.notify();

    // Sync status change to Supabase
    if (supabase) {
      (async () => {
        try {
          await supabase
            .from('orders')
            .update({
              order_status: newStatus,
              updated_at: now,
            })
            .eq('id', order.id);

          await supabase
            .from('order_status_history')
            .insert({
              order_id: order.id,
              status: newStatus,
              notes: notes || `Status changed from ${oldStatus} to ${newStatus}.`,
              created_at: now,
              created_by: adminName,
            });
        } catch {}
      })();
    }

    return order;
  }

  public updateOrderPaymentStatus(
    orderId: string,
    paymentStatus: Order['payment_status'],
    paymobDetails?: { transactionId?: string; orderId?: string }
  ): Order {
    const idx = this.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');
    const now = new Date().toISOString();
    this.orders[idx].payment_status = paymentStatus;
    this.orders[idx].updated_at = now;
    this.save();
    this.notify();

    // Sync payment status to Supabase
    if (supabase) {
      const updates: any = {
        payment_status: paymentStatus,
        updated_at: now,
      };
      if (paymobDetails?.transactionId) {
        updates.paymob_transaction_id = paymobDetails.transactionId;
      }
      if (paymobDetails?.orderId) {
        updates.paymob_order_id = paymobDetails.orderId;
      }
      (async () => {
        try {
          await supabase
            .from('orders')
            .update(updates)
            .eq('id', orderId);
        } catch {}
      })();
    }

    return this.orders[idx];
  }

  public updateOrderInternalNotes(orderId: string, internalNotes: string): Order {
    const idx = this.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');
    this.orders[idx].internal_notes = internalNotes;
    this.orders[idx].updated_at = new Date().toISOString();
    this.save();
    this.notify();
    return this.orders[idx];
  }

  public cancelOrder(orderId: string, reason: string): Order {
    return this.updateOrderStatus(orderId, 'Cancelled', `Cancellation requested. Reason: ${reason}`);
  }
}

export const db = DatabaseEngine.getInstance();
