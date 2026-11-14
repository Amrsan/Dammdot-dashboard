import React, { useState, useEffect, useMemo } from 'react';
import {
  Check,
  CheckSquare,
  ChevronRight,
  ChevronLeft,
  HeartPulse,
  User,
  MapPin,
  CreditCard,
  AlertCircle,
  ShieldCheck,
  Plus,
  Minus,
  CheckCircle2,
  Building,
  Info,
  Lock,
  Phone,
  Mail,
  Receipt,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Truck,
  Droplet,
  FileText,
  FlaskConical,
  ShieldAlert,
  Zap,
  LogIn,
  Activity,
  Layers,
  PenTool,
  Boxes,
} from 'lucide-react';
import {
  BloodTypeGroup,
  BloodProductOption,
  ProductCategoryKey,
  Product,
  ProductTypeItem,
  Governorate,
  City,
  DeliveryArea,
  OrderDraft,
  Order,
  UserProfile,
} from '../../types';
import { db } from '../../services/db';
import { paymentService } from '../../services/payment';
import { PaymobUnifiedCheckoutModal } from '../checkout/PaymobUnifiedCheckoutModal';
import { useLanguage } from '../../i18n/LanguageContext';

interface MultiStepOrderFlowProps {
  initialProductId?: string;
  initialCategory?: ProductCategoryKey;
  onOrderCompleted: (order: Order) => void;
  onNavigateProducts: () => void;
  onChangeCategory?: () => void;
  onOpenAuth?: (mode?: 'login' | 'register', reason?: string) => void;
}

const BLOOD_GROUPS: { type: BloodTypeGroup; badgeEn: string; badgeAr: string }[] = [
  { type: 'O-', badgeEn: 'Universal Donor', badgeAr: 'مانح عام لجميع الفصائل' },
  { type: 'O+', badgeEn: 'High Demand', badgeAr: 'الفصيلة الأكثر طلباً' },
  { type: 'A+', badgeEn: 'Common', badgeAr: 'شائعة التوافق' },
  { type: 'A-', badgeEn: 'Negative Rh', badgeAr: 'ريسس سالب' },
  { type: 'B+', badgeEn: 'Common', badgeAr: 'شائعة التوافق' },
  { type: 'B-', badgeEn: 'Negative Rh', badgeAr: 'ريسس سالب' },
  { type: 'AB+', badgeEn: 'Universal Recipient', badgeAr: 'مستقبل عام لجميع الفصائل' },
  { type: 'AB-', badgeEn: 'Rare Phenotype', badgeAr: 'فصيلة نادرة' },
];

const ABO_PLASMA_GROUPS: { type: BloodTypeGroup; badgeEn: string; badgeAr: string }[] = [
  { type: 'A', badgeEn: 'High Demand', badgeAr: 'شائعة التوافق' },
  { type: 'B', badgeEn: 'Standard Match', badgeAr: 'متوافقة' },
  { type: 'AB', badgeEn: 'Universal Donor', badgeAr: 'مانح عام للبلازما' },
  { type: 'O', badgeEn: 'Universal Recipient', badgeAr: 'مستقبل عام للبلازما' },
];

const ABO_PLATELETS_GROUPS: { type: BloodTypeGroup; badgeEn: string; badgeAr: string }[] = [
  { type: 'A', badgeEn: 'High Demand', badgeAr: 'شائعة التوافق' },
  { type: 'B', badgeEn: 'Standard Match', badgeAr: 'متوافقة' },
  { type: 'AB', badgeEn: 'Universal Match', badgeAr: 'توافق واسع' },
  { type: 'O', badgeEn: 'Standard Match', badgeAr: 'متوافقة' },
];

const BLOOD_OPTIONS: {
  id: BloodProductOption;
  nameEn: string;
  nameAr: string;
  badgeEn: string;
  badgeAr: string;
  descEn: string;
  descAr: string;
  specEn: string;
  specAr: string;
  basePrice: number;
}[] = [
  {
    id: 'Packed Red Blood',
    nameEn: 'Packed Red Blood',
    nameAr: 'دم مكدس (Packed Red Blood)',
    badgeEn: 'Concentrated Erythrocytes (PRBC)',
    badgeAr: 'كرات دم حمراء مركزة',
    descEn: 'High-viability concentrated red blood cells for acute blood loss, trauma resuscitation, and surgical anemia.',
    descAr: 'كرات دم حمراء مركزة قياسية لتعويض النزيف الحاد في العمليات الجراحية، والحوادث، وفقر الدم الشديد.',
    specEn: 'SAGM/CPDA-1 preserved • Hct 55–65% • Stored at 2°C–6°C',
    specAr: 'محلول حفظ SAGM • تركيز هيماتوكريت 55–65% • حفظ مبرد 2°–6° مئوية',
    basePrice: 0,
  },
  {
    id: 'Filtered Blood',
    nameEn: 'Filtered Blood',
    nameAr: 'دم مفلتر',
    badgeEn: 'Micro-Filtered (<5×10⁶ WBC)',
    badgeAr: 'مصفى مخبرياً من الكرات البيضاء',
    descEn: 'Precision leukocyte-depleted cellular units preventing febrile non-hemolytic transfusion reactions and HLA alloimmunization.',
    descAr: 'دم مفلتر بمرشحات دقيقة لخفض الكرات البيضاء ومنع الحمى التحسسية وتكوين الأجسام المضادة وتجنب الفيروسات.',
    specEn: 'Pre-storage filtration • Reduced CMV risk • Oncology & recurrent transfusion safe',
    specAr: 'فلترة مسبقة قبل التخزين • حماية من الفيروسات • ملائم لمرضى الأورام ونقل الدم المتكرر',
    basePrice: 0,
  },
  {
    id: 'Irradiated Blood',
    nameEn: 'Irradiated Blood',
    nameAr: 'دم مشع (Irradiated Blood)',
    badgeEn: '25-Gy Gamma / X-Ray Irradiated',
    badgeAr: 'معالج إشعاعياً بجرعة 25 جراي',
    descEn: '25-Gy irradiated cellular bags inactivating donor T-lymphocytes to strictly prevent Transfusion-Associated Graft-versus-Host Disease (TA-GvHD).',
    descAr: 'وحدات خلوية مشععة مخبرياً لتعطيل الخلايا اللمفاوية التائية ومنع داء الطعم ضد المضيف الخطير لمرضى المناعة.',
    specEn: 'Anti-TA-GvHD certified • Strict indicator badge • Immunocompromised & neonatal safe',
    specAr: 'معتمد للوقاية من TA-GvHD • مؤشر إشعاعي ملصق • آمن لنقص المناعة والأطفال حديثي الولادة',
    basePrice: 0,
  },
];

const PLASMA_OPTIONS: {
  id: BloodProductOption;
  nameEn: string;
  nameAr: string;
  badgeEn: string;
  badgeAr: string;
  descEn: string;
  descAr: string;
  specEn: string;
  specAr: string;
  basePrice: number;
}[] = [
  {
    id: 'Fresh Frozen Plasma',
    nameEn: 'Fresh Frozen Plasma (FFP)',
    nameAr: 'بلازما مجمدة حديثة (FFP)',
    badgeEn: 'All Coagulation Factors',
    badgeAr: 'عوامل التخثر كاملة (V & VIII)',
    descEn: 'Deep-frozen plasma preserved within 8h of donation, rich in labile coagulation factors for active bleeding and coagulopathies.',
    descAr: 'وحدة بلازما طازجة مجمدة بدرجة -18°C غنية بعوامل التجلط والألبومين لتعويض عوامل التخثر والنزيف الحاد وأمراض الكبد.',
    specEn: '',
    specAr: '',
    basePrice: 0,
  },
];

const PLATELETS_OPTIONS: {
  id: BloodProductOption;
  nameEn: string;
  nameAr: string;
  badgeEn: string;
  badgeAr: string;
  descEn: string;
  descAr: string;
  specEn: string;
  specAr: string;
  basePrice: number;
}[] = [
  {
    id: 'Apheresis Platelets',
    nameEn: 'Single-Donor (SDP)',
    nameAr: 'صفائح دم (Single-Donor SDP)',
    badgeEn: 'High Yield (≥3.0×10¹¹) • Single Donor',
    badgeAr: 'متبرع واحد • تركيز عالٍ جداً',
    descEn: 'Equivalent to 6 pooled whole-blood units from a single donor, minimizing HLA alloimmunization and transfusion reactions.',
    descAr: 'وحدة صفائح مركزة مستخلصة من متبرع واحد بجهاز الفصل الخلوي، تعادل 6 وحدات عادية وتقلل من خطر تكون الأجسام المضادة.',
    specEn: 'Continuous agitation at 20°C–24°C • 5-day viability • Cross-match safe',
    specAr: 'رجاج مستمر 20°–24° مئوية • صلاحية 5 أيام • مطابقة سريعة',
    basePrice: 0,
  },
  {
    id: 'Random Donor Platelets',
    nameEn: 'Random Donor (RDP)',
    nameAr: 'صفائح دم (Random Donor RDP)',
    badgeEn: 'Standard Whole-Blood Derived',
    badgeAr: 'وحدة مركزة قياسية',
    descEn: 'Platelet concentrate separated from whole blood units for rapid clinical response to acute bleeding and surgical support.',
    descAr: 'وحدات صفائح مركزة مشتقة من أكياس الدم الكامل لعلاج حالات النزيف الحاد ونقص الصفائح الطارئة.',
    specEn: 'Agitated 20°C–24°C storage • Bacterial screening negative',
    specAr: 'حفظ مع الرج المستمر 20°–24° مئوية • فحص بكتيري معتمد',
    basePrice: 0,
  },
];

const PHLEBOTOMY_OPTIONS: {
  id: BloodProductOption;
  nameEn: string;
  nameAr: string;
  badgeEn: string;
  badgeAr: string;
  descEn: string;
  descAr: string;
  specEn: string;
  specAr: string;
  basePrice: number;
}[] = [
  {
    id: 'Standard Phlebotomy',
    nameEn: 'Standard 450ml Phlebotomy Session',
    nameAr: 'جلسة فصد علاجي قياسية 450 مل',
    badgeEn: '450ml Evacuation • Vital Monitoring',
    badgeAr: 'سحب 450 مل • فحص علامات حيوية',
    descEn: 'Therapeutic evacuation of 450ml blood under vital signs monitoring for Polycythemia Vera and high hematocrit control.',
    descAr: 'إجراء سحب دم علاجي بحجم 450 مل تحت مراقبة العلامات الحيوية وضغط الدم لتخفيض لزوجة الدم لكثرة الحمر الحقيقية.',
    specEn: 'Administered by certified medical staff • Pre/post hemoglobin & BP check',
    specAr: 'تحت إشراف طبيب أو تمريض مؤهل • قياس هيموجلوبين وضغط • راحة سريرية',
    basePrice: 0,
  },
  {
    id: 'Saline-Replacement Phlebotomy',
    nameEn: 'Saline-Replacement Phlebotomy',
    nameAr: 'فصد علاجي مع تعويض محاليل ملحية',
    badgeEn: 'Simultaneous 0.9% NaCl Infusion',
    badgeAr: 'تسريب محلول ملحي متزامن',
    descEn: 'Therapeutic phlebotomy paired with concurrent I.V. normal saline infusion to maintain hemodynamic stability.',
    descAr: 'سحب دم علاجي متزامن مع تسريب وريدي لمحلول ملحي معقم للحفاظ على ضغط الدم وحجم الدورة الدموية لكبار السن.',
    specEn: '500ml 0.9% Saline replacement • Cardiovascular safe • Zero dizzying protocol',
    specAr: 'محلول ملحي 500 مل متزامن • ملائم لمرضى القلب والضغط • راحة تامة',
    basePrice: 0,
  },
  {
    id: 'De-ironing Phlebotomy',
    nameEn: 'Serial De-ironing Phlebotomy',
    nameAr: 'جلسة تخفيض مخزون الحديد (Ferritin)',
    badgeEn: 'Hemochromatosis Iron Depletion',
    badgeAr: 'بروتوكول هيموكروماتوزيس',
    descEn: 'Targeted phlebotomy session in a serial depletion protocol to lower serum ferritin to safe clinical ranges.',
    descAr: 'جلسة فصد ضمن برنامج مجدول ومنتظم لتخفيض فيريتين الدم وحماية الكبد والقلب من ترسب الحديد الزائد.',
    specEn: 'Serial ferritin monitoring • Patient schedule card • Post-procedure hydration',
    specAr: 'متابعة تحليل الفيريتين • بطاقة جدول جلسات • توصيات تغذية وترطيب',
    basePrice: 0,
  },
];

const OTHER_PRODUCTS_OPTIONS: {
  id: BloodProductOption;
  nameEn: string;
  nameAr: string;
  badgeEn: string;
  badgeAr: string;
  descEn: string;
  descAr: string;
  specEn: string;
  specAr: string;
  basePrice: number;
}[] = [
  {
    id: 'Cryoprecipitate (cryo)',
    nameEn: 'Cryoprecipitate (cryo)',
    nameAr: 'كرايو بريسيبيتات Cryoprecipitate (cryo)',
    badgeEn: 'Factor VIII & Fibrinogen Rich',
    badgeAr: 'غني بالفيبرينوجين وعامل VIII',
    descEn: 'Insoluble plasma fraction rich in Factor VIII, von Willebrand factor, fibrinogen, and Factor XIII for hypofibrinogenemia and massive transfusions.',
    descAr: 'مستخلص بلازمي غير ذائب غني بالفيبرينوجين وعامل التجلط الثامن وعامل فون ويلبراند لعلاج نقص الفيبرينوجين والنزيف الحاد.',
    specEn: 'Stored frozen at -18°C • Rapid clinical thaw • High fibrinogen yield',
    specAr: 'محفوظ في درجة حرارة -18 مئوية • إذابة سريرية سريعة • تركيز فيبرينوجين عالي',
    basePrice: 0,
  },
  {
    id: 'Intravenous immunoglobulin (IVIG)',
    nameEn: 'Intravenous immunoglobulin (IVIG)',
    nameAr: 'غلوبولين مناعي وريدي (IVIG)',
    badgeEn: 'Sterile Concentrated IgG Antibodies',
    badgeAr: 'أجسام مضادة IgG مركزة ومعقمة',
    descEn: 'Sterile, highly purified concentrated immunoglobulin G (IgG) solution for primary immunodeficiencies, ITP, Guillain-Barré syndrome, and autoimmune conditions.',
    descAr: 'مستحضر غلوبولين مناعي وريدي عالي النقاوة غني بالأجسام المضادة المركزة (IgG) لعلاج نقص المناعة الأولي ومتلازمة غيلان باريه ونقص الصفائح المناعي.',
    specEn: 'Calibrated cold storage (2°C–8°C) • Batch & vial traceability • Hospital infusion ready',
    specAr: 'حفظ مبرد (2°–8° مئوية) • تتبع دقيق للمصنع والتشغيلة • جاهز للتسريب السريري',
    basePrice: 0,
  },
];

const ALLOWED_GOVERNORATES = [
  { id: 'gov-cairo', name: 'Cairo', nameAr: 'القاهرة', fee: 0 },
  { id: 'gov-giza', name: 'Giza', nameAr: 'الجيزة', fee: 0 },
];

const CATEGORY_METADATA: Record<
  ProductCategoryKey,
  {
    nameEn: string;
    nameAr: string;
    subtextEn: string;
    subtextAr: string;
    badgeEn: string;
    badgeAr: string;
    choice2TitleEn: string;
    choice2TitleAr: string;
    choice2DescEn: string;
    choice2DescAr: string;
    choice2CountEn: string;
    choice2CountAr: string;
    unitLabelEn: string;
    unitLabelAr: string;
  }
> = {
  'blood-bag': {
    nameEn: 'Blood Bag',
    nameAr: 'كيس دم',
    subtextEn: 'Erythrocyte units.',
    subtextAr: 'وحدات خلوية مركزة.',
    badgeEn: 'Cellular Units',
    badgeAr: 'وحدات خلوية',
    choice2TitleEn: 'Choice 2: Type of blood bag processing',
    choice2TitleAr: 'المرحلة الثانية: نوع المعالجة لكيس الدم',
    choice2DescEn: 'Select processing standard (Leukoreduced / Irradiated / Packed).',
    choice2DescAr: 'حدد مواصفات المعالجة المخبرية المعتمدة (مفلتر / مشعع / مكدس).',
    choice2CountEn: '3 Lab Processing Options',
    choice2CountAr: '3 معالجات مخبرية',
    unitLabelEn: 'Bags',
    unitLabelAr: 'أكياس',
  },
  'plasma': {
    nameEn: 'Plasma',
    nameAr: 'بلازما مجمدة',
    subtextEn: 'Stored at -18°C',
    subtextAr: 'محفوظ في درجة حرارة -18 مئوية',
    badgeEn: 'Coagulation Factors',
    badgeAr: 'عوامل التخثر والألبومين',
    choice2TitleEn: 'Choice 2: Select Plasma Formulation',
    choice2TitleAr: 'المرحلة الثانية: تحديد نوع البلازما',
    choice2DescEn: 'Fresh Frozen Plasma (FFP) preserved at -18°C.',
    choice2DescAr: 'بلازما مجمدة حديثة (FFP) محفوظة في درجة حرارة -18 مئوية.',
    choice2CountEn: '1 Clinical Formulation',
    choice2CountAr: 'فئة علاجية واحدة',
    unitLabelEn: 'Units',
    unitLabelAr: 'وحدات',
  },
  'platelets': {
    nameEn: 'Blood Platelets',
    nameAr: 'صفائح دموية',
    subtextEn: 'Maintained at 20°C–24°C under constant gentle agitation, vital for oncology & trauma.',
    subtextAr: 'محفوظة في حرارة 20°–24° مئوية مع الرج المستمر لعلاج النزيف ونقص الصفائح.',
    badgeEn: 'Agitated 20°C–24°C',
    badgeAr: 'حفظ مع الرج المستمر',
    choice2TitleEn: 'Choice 2: Select Platelet Preparation',
    choice2TitleAr: 'المرحلة الثانية: حدد تركيز ومواصفات الصفائح المطلوبة',
    choice2DescEn: 'Choose between Single-Donor Apheresis (SDP) or Random Donor (RDP) units.',
    choice2DescAr: 'اختر بين صفائح الأفيريسيس (SDP) أو الصفائح المجمعة (RDP).',
    choice2CountEn: '2 Platelet Types',
    choice2CountAr: 'نوعان من الصفائح الدموية',
    unitLabelEn: 'Units',
    unitLabelAr: 'وحدات',
  },
  'phlebotomy': {
    nameEn: 'Therapeutic Phlebotomy',
    nameAr: 'فصد علاجي',
    subtextEn: 'Clinical venesection under vital-signs monitoring for high hematocrit & hemochromatosis.',
    subtextAr: 'إجراء طبي منظم لسحب 450 مل وتخفيض لزوجة الدم والفيريتين بأمان.',
    badgeEn: 'Clinical Procedure',
    badgeAr: 'إجراء علاجي سريري',
    choice2TitleEn: 'Choice 2: Select Phlebotomy Protocol',
    choice2TitleAr: 'المرحلة الثانية: حدد بروتوكول جلسة الفصد العلاجي',
    choice2DescEn: 'Choose standard venesection, saline replacement infusion, or de-ironing protocol.',
    choice2DescAr: 'اختر الجلسة القياسية، أو الفصد مع تعويض المحاليل الملحية، أو بروتوكول تخفيض الحديد.',
    choice2CountEn: '3 Clinical Protocols',
    choice2CountAr: '3 بروتوكولات فصد سريري',
    unitLabelEn: 'Sessions',
    unitLabelAr: 'جلسات',
  },
  'other-products': {
    nameEn: 'Other Products',
    nameAr: 'منتجات أخرى',
    subtextEn: 'Specialized biologics: Cryoprecipitate (cryo) & Intravenous immunoglobulin (IVIG).',
    subtextAr: 'مشتقات حيوية متخصصة: الراسب القري (Cryo) والغلوبولين المناعي الوريدي (IVIG).',
    badgeEn: 'Specialized Biologics',
    badgeAr: 'مشتقات بيولوجية متخصصة',
    choice2TitleEn: 'Choice 2: Select Clinical Product',
    choice2TitleAr: 'المرحلة الثانية: تحديد المنتج الطبي المطلوب',
    choice2DescEn: 'Select Cryoprecipitate (cryo) or Intravenous immunoglobulin (IVIG).',
    choice2DescAr: 'اختر الراسب القري (Cryo) أو الغلوبولين المناعي الوريدي (IVIG).',
    choice2CountEn: '2 Specialized Products',
    choice2CountAr: 'منتجان متخصصان',
    unitLabelEn: 'Units',
    unitLabelAr: 'وحدات',
  },
};

/**
 * Extracts and maps user profile / address defaults to prefill the blood order requisition
 */
const getUserPrefill = (user: UserProfile | null, lang: 'ar' | 'en') => {
  if (!user) return null;

  const savedAddresses = user.id ? db.getUserAddresses(user.id) : [];
  const defaultAddr = savedAddresses.find((a) => a.is_default) || savedAddresses[0];

  const govRaw = (defaultAddr?.governorate_name || user.governorate_name || '').trim();
  let matchedGov = ALLOWED_GOVERNORATES.find(
    (g) =>
      g.name.toLowerCase() === govRaw.toLowerCase() ||
      g.nameAr === govRaw ||
      govRaw.toLowerCase().includes('cairo') ||
      govRaw.includes('قاهر')
  );
  if (!matchedGov && (govRaw.toLowerCase().includes('giza') || govRaw.includes('جيز'))) {
    matchedGov = ALLOWED_GOVERNORATES.find((g) => g.id === 'gov-giza');
  }
  if (!matchedGov && govRaw) {
    matchedGov = ALLOWED_GOVERNORATES[0];
  }

  const patientName = user.full_name || '';
  const patientAge = user.age !== undefined && user.age !== null ? user.age : '';
  const phone = defaultAddr?.phone || user.phone || '';
  const customerName = user.full_name || '';
  const customerEmail = user.email || '';
  const customerPhone = user.phone || '';
  const address = defaultAddr?.address || user.default_address || '';
  const building = defaultAddr?.building || user.building_floor || '';
  const floor = defaultAddr?.floor || '';
  const landmark = defaultAddr?.landmark || user.landmark || '';
  const cityName = defaultAddr?.city_name || user.city_name || '';
  const areaName = defaultAddr?.area_name || user.area_name || '';
  const hospitalName = '';
  const department = user.department || '';

  return {
    bloodType: user.blood_type || undefined,
    patientName,
    patientAge,
    phone,
    customerName,
    customerEmail,
    customerPhone,
    address,
    manualDeliveryAddress: '',
    building,
    floor,
    landmark,
    cityName,
    areaName,
    hospitalName,
    department,
    governorateId: matchedGov ? matchedGov.id : '',
    governorateName: matchedGov ? (lang === 'ar' ? matchedGov.nameAr : matchedGov.name) : '',
    deliveryFee: matchedGov ? matchedGov.fee : 0,
  };
};

export const MultiStepOrderFlow: React.FC<MultiStepOrderFlowProps> = ({
  initialProductId,
  initialCategory,
  onOrderCompleted,
  onNavigateProducts,
  onChangeCategory,
  onOpenAuth,
}) => {
  const { language, t, isRTL } = useLanguage();
  const BackChevron = isRTL ? ChevronRight : ChevronLeft;
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Synchronize step with browser Back button
  useEffect(() => {
    const handlePop = (e: PopStateEvent) => {
      if (currentStep > 1) {
        if (!e.state || e.state.step !== 2) {
          setCurrentStep(1);
        }
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [currentStep]);

  // Selected product category: blood-bag | plasma | platelets | phlebotomy
  const [selectedCategory, setSelectedCategory] = useState<ProductCategoryKey>(
    initialCategory || 'blood-bag'
  );

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  const currentOptions =
    selectedCategory === 'plasma'
      ? PLASMA_OPTIONS
      : selectedCategory === 'platelets'
      ? PLATELETS_OPTIONS
      : selectedCategory === 'phlebotomy'
      ? PHLEBOTOMY_OPTIONS
      : selectedCategory === 'other-products'
      ? OTHER_PRODUCTS_OPTIONS
      : BLOOD_OPTIONS;

  // User state synchronized with database engine
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => db.getCurrentUser());
  const [profileAutoFilledNotice, setProfileAutoFilledNotice] = useState(false);

  // Subscribe to DB changes so currentUser stays in sync upon login or profile updates
  useEffect(() => {
    const handleDbChange = () => {
      setCurrentUser(db.getCurrentUser());
    };
    return db.subscribe(handleDbChange);
  }, []);

  // Selection choices - automatically reflects the signed-in user's blood type if registered
  const [selectedBloodType, setSelectedBloodType] = useState<BloodTypeGroup>(() => {
    const isAboCategory = initialCategory === 'plasma' || initialCategory === 'platelets';
    const u = db.getCurrentUser();
    if (u?.blood_type) {
      return isAboCategory ? (u.blood_type.replace(/[+-]/g, '') as BloodTypeGroup) : u.blood_type;
    }
    return isAboCategory ? 'A' : 'O+';
  });

  // When switching between blood categories (plasma/platelets vs red blood bags), normalize blood type
  useEffect(() => {
    const isAboCategory = selectedCategory === 'plasma' || selectedCategory === 'platelets';
    if (isAboCategory) {
      if (selectedBloodType.includes('+') || selectedBloodType.includes('-')) {
        const stripped = (selectedBloodType.replace(/[+-]/g, '') || 'A') as BloodTypeGroup;
        setSelectedBloodType(stripped);
      }
    } else {
      if (!selectedBloodType.includes('+') && !selectedBloodType.includes('-')) {
        const withRh = `${selectedBloodType}+` as BloodTypeGroup;
        setSelectedBloodType(withRh);
      }
    }
  }, [selectedCategory, selectedBloodType]);

  const [selectedOptions, setSelectedOptions] = useState<BloodProductOption[]>(() => {
    const opts =
      initialCategory === 'plasma'
        ? PLASMA_OPTIONS
        : initialCategory === 'platelets'
        ? PLATELETS_OPTIONS
        : initialCategory === 'phlebotomy'
        ? PHLEBOTOMY_OPTIONS
        : initialCategory === 'other-products'
        ? OTHER_PRODUCTS_OPTIONS
        : BLOOD_OPTIONS;
    return [opts[0].id];
  });

  // Backward compatibility alias for single representation
  const selectedOption = selectedOptions[0] || (currentOptions[0]?.id as BloodProductOption) || 'Packed Red Blood';

  // Ensure selectedOptions match the active category
  useEffect(() => {
    const validSelected = selectedOptions.filter((opt) => currentOptions.some((o) => o.id === opt));
    if (validSelected.length === 0 && currentOptions.length > 0) {
      setSelectedOptions([currentOptions[0].id]);
    } else if (validSelected.length !== selectedOptions.length) {
      setSelectedOptions(validSelected);
    }
  }, [selectedCategory, currentOptions]);

  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);

  // Draft state for Step 2 & 3 initialized with user profile details
  const [draft, setDraft] = useState<OrderDraft>(() => {
    const u = db.getCurrentUser();
    const prefill = getUserPrefill(u, language);

    return {
      productCategory: initialCategory || 'blood-bag',
      bloodType: u?.blood_type || 'O+',
      bloodProductOption: 'Packed Red Blood',
      quantity: 1,
      patientName: prefill?.patientName || '',
      patientAge: prefill?.patientAge ?? '',
      hospitalName: prefill?.hospitalName || '',
      department: prefill?.department || '',
      notes: '',
      governorateId: prefill?.governorateId || '',
      governorateName: prefill?.governorateName || '',
      cityId: prefill?.cityName || '',
      cityName: prefill?.cityName || '',
      areaId: prefill?.areaName || '',
      areaName: prefill?.areaName || '',
      deliveryFee: prefill?.deliveryFee || 0,
      address: prefill?.address || '',
      manualDeliveryAddress: '',
      building: prefill?.building || '',
      apartment: '',
      floor: prefill?.floor || '',
      landmark: prefill?.landmark || '',
      phone: prefill?.phone || '',
      customerName: prefill?.customerName || '',
      customerEmail: prefill?.customerEmail || '',
      customerPhone: prefill?.customerPhone || '',
      paymentMethod: 'Cash on Delivery',
      accuracyConfirmed: false,
      complianceAcknowledged: false,
    };
  });

  // Synchronize currentUser profile into draft fields if they are blank/unset
  useEffect(() => {
    if (!currentUser) return;
    const prefill = getUserPrefill(currentUser, language);
    if (!prefill) return;

    if (currentUser.blood_type && !initialProductId) {
      setSelectedBloodType((prev) => (prev === 'O+' && currentUser.blood_type ? currentUser.blood_type : prev));
    }

    setDraft((prev) => ({
      ...prev,
      patientName: prev.patientName || prefill.patientName,
      patientAge: prev.patientAge !== '' && prev.patientAge !== undefined ? prev.patientAge : prefill.patientAge,
      phone: prev.phone || prefill.phone,
      customerName: prev.customerName || prefill.customerName,
      customerEmail: prev.customerEmail || prefill.customerEmail,
      customerPhone: prev.customerPhone || prefill.customerPhone,
      address: prev.address || prefill.address,
      building: prev.building || prefill.building,
      floor: prev.floor || prefill.floor,
      landmark: prev.landmark || prefill.landmark,
      cityName: prev.cityName || prefill.cityName,
      cityId: prev.cityId || prefill.cityName,
      areaName: prev.areaName || prefill.areaName,
      areaId: prev.areaId || prefill.areaName,
      governorateId: prev.governorateId || prefill.governorateId,
      governorateName: prev.governorateName || prefill.governorateName,
      deliveryFee: prev.governorateId ? prev.deliveryFee : prefill.deliveryFee,
      hospitalName: prev.hospitalName || prefill.hospitalName,
      department: prev.department || prefill.department,
    }));
  }, [currentUser, language]);

  // Handler to force re-fill/reset all fields from the saved profile
  const handleReapplyProfileData = () => {
    if (!currentUser) return;
    const prefill = getUserPrefill(currentUser, language);
    if (!prefill) return;

    if (currentUser.blood_type) {
      setSelectedBloodType(currentUser.blood_type);
    }

    setDraft((prev) => ({
      ...prev,
      patientName: prefill.patientName,
      patientAge: prefill.patientAge,
      phone: prefill.phone,
      customerName: prefill.customerName,
      customerEmail: prefill.customerEmail,
      customerPhone: prefill.customerPhone,
      address: prefill.address,
      building: prefill.building,
      floor: prefill.floor,
      landmark: prefill.landmark,
      cityName: prefill.cityName,
      cityId: prefill.cityName,
      areaName: prefill.areaName,
      areaId: prefill.areaName,
      governorateId: prefill.governorateId,
      governorateName: prefill.governorateName,
      deliveryFee: prefill.deliveryFee,
      hospitalName: prefill.hospitalName,
      department: prefill.department,
    }));

    setProfileAutoFilledNotice(true);
    setTimeout(() => setProfileAutoFilledNotice(false), 4000);
  };

  // Step 3 card data
  const [cardData, setCardData] = useState({
    cardholderName: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [isPaymobModalOpen, setIsPaymobModalOpen] = useState(false);

  // Load initial product if provided
  useEffect(() => {
    if (initialProductId) {
      const prod = db.getProductById(initialProductId);
      if (prod) {
        if (
          prod.product_type_name?.toLowerCase().includes('plasma') ||
          prod.name?.toLowerCase().includes('plasma') ||
          prod.name?.includes('بلازما')
        ) {
          setSelectedBloodType((prod.blood_type.replace(/[+-]/g, '') || 'A') as BloodTypeGroup);
          setSelectedCategory('plasma');
          setSelectedOptions(['Fresh Frozen Plasma']);
        } else if (
          prod.product_type_name?.toLowerCase().includes('platelet') ||
          prod.name?.toLowerCase().includes('platelet') ||
          prod.name?.includes('صفائح')
        ) {
          setSelectedBloodType((prod.blood_type.replace(/[+-]/g, '') || 'A') as BloodTypeGroup);
          setSelectedCategory('platelets');
          setSelectedOptions(['Apheresis Platelets']);
        } else if (
          prod.product_type_name?.toLowerCase().includes('phlebotom') ||
          prod.name?.toLowerCase().includes('phlebotom') ||
          prod.name?.includes('فصد')
        ) {
          setSelectedBloodType(prod.blood_type);
          setSelectedCategory('phlebotomy');
          setSelectedOptions(['Standard Phlebotomy']);
        } else if (
          prod.product_type_name?.toLowerCase().includes('filter') ||
          prod.product_type_name?.toLowerCase().includes('leuko') ||
          prod.product_type_name?.includes('مفلتر')
        ) {
          setSelectedBloodType(prod.blood_type);
          setSelectedCategory('blood-bag');
          setSelectedOptions(['Filtered Blood']);
        } else if (
          prod.product_type_name?.toLowerCase().includes('irradiat') ||
          prod.product_type_name?.toLowerCase().includes('radiant')
        ) {
          setSelectedBloodType(prod.blood_type);
          setSelectedCategory('blood-bag');
          setSelectedOptions(['Irradiated Blood']);
        } else {
          setSelectedBloodType(prod.blood_type);
          setSelectedCategory('blood-bag');
          setSelectedOptions(['Packed Red Blood']);
        }
      }
    }
  }, [initialProductId]);

  // Update matched product when blood type, category or options change
  useEffect(() => {
    const primaryOption = selectedOptions[0] || (currentOptions[0]?.id as BloodProductOption) || 'Packed Red Blood';
    const prod = db.getProductByChoice(selectedBloodType, primaryOption);
    setMatchedProduct(prod);
    setDraft((prev) => ({
      ...prev,
      productCategory: selectedCategory,
      bloodType: selectedBloodType,
      bloodProductOption: primaryOption,
      selectedOptions: selectedOptions,
      productId: prod.id,
      product: prod,
      productTypeId: prod.product_type_id,
      productTypeName: prod.product_type_name,
    }));
  }, [selectedBloodType, selectedOptions, selectedCategory, currentOptions]);

  // Pricing calculations: sum of unit prices of all selected options (all products 0)
  const unitPrice = useMemo(() => {
    if (selectedOptions.length === 0) return 0;
    return selectedOptions.reduce((acc, optId) => {
      const optMeta = currentOptions.find((o) => o.id === optId);
      const base = optMeta ? optMeta.basePrice : 0;
      return acc + base;
    }, 0);
  }, [selectedOptions, currentOptions]);

  const quantity = Math.max(1, draft.quantity || 1);
  const subtotal = unitPrice * quantity;
  const deliveryFee = draft.deliveryFee || 0;
  const total = subtotal + deliveryFee;

  // Dynamically compute the product display name for header h1
  // Directly and exclusively reflects the exact product name chosen (e.g. 'بلازما' for plasma, 'كيس دم' for blood bag)
  const productDisplayName = useMemo(() => {
    switch (selectedCategory) {
      case 'blood-bag':
        return language === 'ar' ? 'كيس دم' : 'Blood Bag';
      case 'plasma':
        return language === 'ar' ? 'بلازما مجمدة ' : 'Plasma';
      case 'platelets':
        return language === 'ar' ? 'صفائح دموية' : 'Blood Platelets';
      case 'phlebotomy':
        return language === 'ar' ? 'فصد علاجي' : 'Therapeutic Phlebotomy';
      case 'other-products':
        return language === 'ar' ? 'منتجات أخرى' : 'Other Products';
      default: {
        const catMeta = CATEGORY_METADATA[selectedCategory];
        if (catMeta) {
          return language === 'ar' ? catMeta.nameAr : catMeta.nameEn;
        }
        return language === 'ar' ? 'طلب دم' : 'Blood Requisition';
      }
    }
  }, [selectedCategory, language]);

  // Dynamically compute product clinical subtitle
  const productDisplaySubtitle = useMemo(() => {
    const catMeta = CATEGORY_METADATA[selectedCategory];
    if (catMeta) {
      return language === 'ar' ? catMeta.subtextAr : catMeta.subtextEn;
    }
    const primaryOptionMeta = currentOptions.find((o) => selectedOptions.includes(o.id));
    if (primaryOptionMeta) {
      return language === 'ar' ? primaryOptionMeta.descAr : primaryOptionMeta.descEn;
    }
    return t('orderFlowSubtitle');
  }, [selectedCategory, currentOptions, selectedOptions, language, t]);

  // Toggle or select all options helper
  const handleToggleOption = (optId: BloodProductOption) => {
    setSelectedOptions((prev) => {
      if (prev.includes(optId)) {
        if (prev.length === 1) {
          // Keep at least one selected
          return prev;
        }
        return prev.filter((id) => id !== optId);
      } else {
        return [...prev, optId];
      }
    });
  };

  const handleToggleSelectAll = () => {
    const allIds = currentOptions.map((o) => o.id);
    if (selectedOptions.length === allIds.length) {
      // If all currently selected, revert to the first option
      setSelectedOptions([allIds[0]]);
    } else {
      // Select all
      setSelectedOptions(allIds);
    }
  };

  // Navigation handlers
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  // Step 1 validation
  const handleProceedFromStep1 = () => {
    setValidationErrors([]);
    if (!selectedBloodType) {
      setValidationErrors([
        language === 'ar' ? 'يرجى اختيار فصيلة الدم أولاً' : 'Please select a blood type.',
      ]);
      return;
    }
    if (selectedOptions.length === 0) {
      setValidationErrors([
        language === 'ar' ? 'يرجى اختيار خيار واحد على الأقل من مواصفات المنتج' : 'Please select at least one product option.',
      ]);
      return;
    }
    if (quantity < 1) {
      setValidationErrors([
        language === 'ar' ? 'يرجى تحديد كيس دم واحد على الأقل' : 'Please specify at least 1 blood bag.',
      ]);
      return;
    }

    // Require registered account before proceeding to Step 2
    if (!currentUser) {
      if (onOpenAuth) {
        onOpenAuth(
          'register',
          language === 'ar'
            ? 'يجب إنشاء حساب جديد أو تسجيل الدخول للمتابعة وإدخال بيانات التوصيل وتأكيد الطلب.'
            : 'You must register an account or sign in first to continue to delivery details and place your order.'
        );
      }
      setValidationErrors([
        language === 'ar'
          ? 'يجب تسجيل حساب جديد أو تسجيل الدخول أولاً لتتمكن من متابعة الطلب.'
          : 'Please register an account or sign in first to proceed with your order.',
      ]);
      return;
    }

    setCurrentStep(2);
    try {
      window.history.pushState(
        { route: '/order', step: 2, category: selectedCategory },
        '',
        window.location.href
      );
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 2 submission: Only registered users can place an order
  const handleFinalOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError('');

    // Strict registration enforcement
    if (!currentUser) {
      if (onOpenAuth) {
        onOpenAuth(
          'register',
          language === 'ar'
            ? 'يجب إنشاء حساب أولاً بالبيانات المطلوبة (الاسم، البريد، كلمة المرور، الهاتف، العنوان) لإتمام الطلب.'
            : 'You must register an account first before you can place the order.'
        );
      }
      setSubmissionError(
        language === 'ar'
          ? 'يجب تسجيل حساب أولاً لإتمام طلب أكياس الدم وتأكيد التوصيل.'
          : 'User registration is required before placing an order.'
      );
      return;
    }

    const errors: string[] = [];

    const finalName = (draft.customerName || draft.patientName || currentUser.full_name || '').trim();
    if (!finalName) {
      errors.push(language === 'ar' ? 'يرجى كتابة الاسم' : 'Please enter your name.');
    }

    const finalPhone = (draft.phone || draft.customerPhone || currentUser.phone || '').trim();
    if (!finalPhone) {
      errors.push(language === 'ar' ? 'يرجى كتابة رقم الهاتف للتواصل' : 'Please enter your contact phone number.');
    }

    const finalAddress = (draft.address || draft.manualDeliveryAddress || currentUser.default_address || '').trim();
    if (!finalAddress) {
      errors.push(language === 'ar' ? 'يرجى كتابة عنوان التوصيل' : 'Please enter the delivery address.');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);
    setIsSubmitting(true);

    try {
      const createdOrder = await db.createOrderAsync({
        userId: currentUser.id,
        customerName: finalName,
        customerEmail: currentUser.email,
        customerPhone: finalPhone,
        patientName: finalName,
        patientAge: 30,
        bloodType: selectedBloodType,
        productTypeId: matchedProduct?.product_type_id || 'pt-packed-rbc',
        productTypeName: selectedOptions.join(', '),
        productId: matchedProduct?.id,
        productCategory: selectedCategory,
        selectedOptions: selectedOptions,
        productName: matchedProduct?.name || `${selectedOptions.join(' + ')} (${selectedBloodType})`,
        quantity,
        unitPrice: 0,
        subtotal: 0,
        deliveryFee: 0,
        total: 0,
        paymentMethod: 'Cash on Delivery',
        paymentStatus: 'Cash on Delivery',
        notes: `Registered User Order - Name: ${finalName}, Phone: ${finalPhone}, Account: ${currentUser.email}`,
        governorateName: currentUser.governorate_name || 'القاهرة / الجيزة',
        cityName: currentUser.city_name || 'خدمة التوصيل المعتمدة',
        areaName: currentUser.area_name || 'عنوان التسليم',
        deliveryAddress: finalAddress,
        manualDeliveryAddress: finalAddress,
        deliveryPhone: finalPhone,
        accuracyConfirmed: true,
        complianceAcknowledged: true,
      });

      onOrderCompleted(createdOrder);
    } catch (err: any) {
      setSubmissionError(err?.message || (language === 'ar' ? 'حدث خطأ أثناء إرسال الطلب' : 'An error occurred while placing order.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { number: 1, titleEn: 'Blood Selection', titleAr: 'اختيار الفصيلة والمعالجة' },
    { number: 2, titleEn: 'Delivery Details & Confirmation', titleAr: 'بيانات التوصيل وتأكيد الطلب' },
  ];

  if (selectedCategory === 'phlebotomy') {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 mx-auto flex items-center justify-center">
            <Phone className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
              {language === 'ar' ? 'حجز هاتفي وسريري فقط' : 'Phone Booking Only'}
            </span>
            <h1 className="text-2xl font-black text-slate-900">
              {language === 'ar' ? 'حجز الفصد العلاجي عبر الاتصال الهاتفي فقط' : 'Therapeutic Phlebotomy Phone Booking Only'}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              {language === 'ar'
                ? 'الفصد العلاجي إجراء طبي تداخلي يتم تحت إشراف طبي متخصص ولا يخضع لنظام التوصيل أو الطلب الإلكتروني الآلي. يرجى الاتصال بفريقنا الطبي المباشر لحجز الموعد وتنسيق البروتوكول.'
                : 'Therapeutic Phlebotomy is an in-person supervised clinical procedure and cannot be booked through automated cart checkout. Please call our clinical desk directly to coordinate protocol and scheduling.'}
            </p>
          </div>

          <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-3">
            <div className="text-xs font-bold text-red-400 uppercase tracking-wider">
              {language === 'ar' ? 'الخط الساخن للفصد العلاجي (24/7)' : 'Phlebotomy Desk 24/7 Hotline'}
            </div>
            <div className="text-2xl font-black" dir="ltr">+201015570651</div>
            <a
              id="phlebotomy-order-call-now-btn"
              href="tel:+201015570651"
              className="inline-flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition"
            >
              <Phone className="w-4 h-4" />
              <span>{language === 'ar' ? 'اتصل الآن لحجز موعد' : 'Call Now to Book Session'}</span>
            </a>
          </div>

          {onChangeCategory && (
            <button
              onClick={onChangeCategory}
              className="inline-flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-5 py-2.5 rounded-xl transition cursor-pointer"
            >
              <ArrowIcon className="w-4 h-4" />
              <span>{language === 'ar' ? 'الرجوع لاختيار منتجات أخرى' : 'Select Another Product'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Breadcrumb / Back button */}
        <div className="flex items-center justify-between">
          <button
            id="order-flow-back-btn"
            type="button"
            onClick={() => {
              if (currentStep > 1) {
                setCurrentStep((prev) => (prev - 1) as 1 | 2);
              } else if (onChangeCategory) {
                onChangeCategory();
              } else if (window.history.length > 1) {
                window.history.back();
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 px-3.5 py-2 rounded-xl transition shadow-2xs cursor-pointer"
          >
            <BackChevron className="w-4 h-4" />
            <span>
              {currentStep > 1
                ? language === 'ar'
                  ? 'العودة لاختيار الفصيلة'
                  : 'Back to Blood Selection'
                : language === 'ar'
                ? 'العودة لاختيار المنتجات'
                : 'Back to Select Product'}
            </span>
          </button>
        </div>

        {/* HEADER & CLINICAL BANNER */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200/60 mb-2">
                <HeartPulse className="w-3.5 h-3.5 animate-pulse" />
                <span>{language === 'ar' ? 'طلب فوري ومباشر لبنك الدم' : 'Accredited Blood Requisition'}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {productDisplayName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
                {productDisplaySubtitle}
              </p>
            </div>
          </div>

          {/* 2-STEP PROGRESS STEPPER */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-2 sm:gap-4 relative">
              {stepsList.map((st) => {
                const isCompleted = currentStep > st.number;
                const isActive = currentStep === st.number;
                return (
                  <button
                    key={st.number}
                    id={`step-indicator-${st.number}`}
                    type="button"
                    disabled={st.number > currentStep}
                    onClick={() => {
                      if (st.number < currentStep) setCurrentStep(st.number as 1 | 2);
                    }}
                    className={`text-left rtl:text-right p-2.5 sm:p-3.5 rounded-xl border transition flex items-center gap-2.5 sm:gap-3 ${
                      isActive
                        ? 'bg-red-50/90 border-red-500 shadow-xs ring-2 ring-red-500/20'
                        : isCompleted
                        ? 'bg-slate-50 border-emerald-300 hover:bg-slate-100 cursor-pointer'
                        : 'bg-slate-50/60 border-slate-200 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                        isActive
                          ? 'bg-red-600 text-white shadow-xs'
                          : isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : st.number}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        {language === 'ar' ? `المرحلة ${st.number}` : `Step ${st.number}`}
                      </span>
                      <span
                        className={`block text-xs sm:text-sm font-extrabold truncate ${
                          isActive ? 'text-red-900' : isCompleted ? 'text-slate-900' : 'text-slate-500'
                        }`}
                      >
                        {language === 'ar' ? st.titleAr : st.titleEn}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* VALIDATION ERRORS BANNER */}
        {validationErrors.length > 0 && (
          <div
            id="order-validation-errors-box"
            className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm space-y-1.5 animate-fadeIn"
          >
            <div className="flex items-center gap-2 font-bold text-red-900">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {language === 'ar'
                  ? 'يرجى استيفاء البيانات التالية للمتابعة:'
                  : 'Please resolve the following before continuing:'}
              </span>
            </div>
            <ul className="list-disc list-inside ps-2 space-y-1 text-xs">
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: BLOOD SELECTION (NO CARDS - CLEAN INTERACTIVE CHOICES) */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* Signed-in user banner informing about prefill */}
            {currentUser && (
              <div className="bg-red-50/70 border border-red-200/80 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-red-950">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-black shrink-0 text-xs shadow-2xs">
                    {currentUser.blood_type || <User className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block text-xs sm:text-sm">
                      {language === 'ar'
                        ? `مرحباً ${currentUser.full_name} • فصيلتك المسجلة: ${currentUser.blood_type || 'غير محددة'}`
                        : `Welcome ${currentUser.full_name} • Registered Blood: ${currentUser.blood_type || 'N/A'}`}
                    </span>
                    <span className="text-[11px] text-slate-600">
                      {language === 'ar'
                        ? 'تم تحديد فصيلة دمك وتجهيز معلوماتك وعنوانك للتطبيق التلقائي في حقول الطلب.'
                        : 'Your blood group has been selected and your profile details are ready for automatic pre-fill.'}
                    </span>
                  </div>
                </div>
                {currentUser.blood_type && (
                  <span className="shrink-0 px-2.5 py-1 rounded-md bg-white border border-red-200 text-red-700 font-bold text-[11px]">
                    {language === 'ar' ? 'فصيلة الحساب محددة' : 'Account Group Selected'}
                  </span>
                )}
              </div>
            )}

            {/* ACTIVE PRODUCT CATEGORY BADGE & CHANGE BUTTON */}
            {(() => {
              const catMeta = CATEGORY_METADATA[selectedCategory] || CATEGORY_METADATA['blood-bag'];
              const CategoryIcon =
                selectedCategory === 'plasma'
                  ? FlaskConical
                  : selectedCategory === 'platelets'
                  ? Layers
                  : selectedCategory === 'phlebotomy'
                  ? Activity
                  : selectedCategory === 'other-products'
                  ? Boxes
                  : Droplet;

              return (
                <div
                  id="active-product-category-banner"
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-red-50 text-red-700 flex items-center justify-center border border-red-100 shrink-0">
                      <CategoryIcon className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                          {language === 'ar' ? 'المنتج / الخدمة المطلوبة:' : 'Requisition Category:'}
                        </span>
                        <span className="text-xs font-black text-red-950 bg-red-100/70 border border-red-200/80 px-2.5 py-0.5 rounded-md">
                          {language === 'ar' ? catMeta.nameAr : catMeta.nameEn}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {language === 'ar' ? catMeta.subtextAr : catMeta.subtextEn}
                      </p>
                    </div>
                  </div>

                  {onChangeCategory && (
                    <button
                      id="change-product-category-btn"
                      type="button"
                      onClick={onChangeCategory}
                      className="inline-flex items-center justify-center gap-2 text-xs font-extrabold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100/80 border border-red-200 px-4 py-2.5 rounded-xl transition cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
                    >
                      <span>{language === 'ar' ? 'تغيير نوع المنتج' : 'Change Product Type'}</span>
                      <ArrowIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })()}

            {/* FIRST CHOICE: BLOOD TYPE */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
              <div className="flex items-start justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-black flex items-center justify-center">
                      1
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900">
                      {selectedCategory === 'phlebotomy'
                        ? language === 'ar' ? 'مرحلة الأول: فصيلة دم المريض بالملف الطبي' : 'Choice 1: Patient Blood Group for File'
                        : selectedCategory === 'plasma'
                        ? language === 'ar' ? 'مرحلة الأول: فصيلة دم المريض (مستقبل البلازما)' : 'Choice 1: Patient Blood Group (ABO)'
                        : selectedCategory === 'platelets'
                        ? language === 'ar' ? 'مرحلة الأول: فصيلة دم المريض (الصفائح الدموية)' : 'Choice 1: Patient Blood Group (ABO)'
                        : selectedCategory === 'other-products'
                        ? language === 'ar' ? 'المرحلة الأولى: فصيلة دم المريض بالملف الطبي' : 'Choice 1: Patient Blood Group for File'
                        : t('choice1BloodType')}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 ps-8">
                    {selectedCategory === 'plasma'
                      ? language === 'ar'
                        ? 'حدد فصيلة دم المريض بنظام  (+ أو -) حيث أن متبرع هو المتبرع العام للبلازما.'
                        : 'Select patient (+/-) factor (AB donor is universal plasma donor).'
                      : selectedCategory === 'platelets'
                      ? language === 'ar'
                        ? 'حدد فصيلة دم المريض .'
                        : 'Select patient ABO blood group.'
                      : selectedCategory === 'phlebotomy'
                      ? language === 'ar'
                        ? 'حدد فصيلة دم المريض المسجلة بالملف الطبي لتوثيق جلسة الفصد السريري بدقة'
                        : 'Select patient blood type recorded in clinical requisition file.'
                      : selectedCategory === 'other-products'
                      ? language === 'ar'
                        ? 'حدد فصيلة دم المريض المسجلة بالملف الطبي لتوثيق ومطابقة طلب المنتجات.'
                        : 'Select patient blood group recorded in clinical file.'
                      : t('choice1Desc')}
                  </p>
                </div>
                <span className="hidden sm:inline-flex text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {selectedCategory === 'plasma' || selectedCategory === 'platelets'
                    ? language === 'ar' ? ' فصائل الدم  (ABO)' : ' ABO Groups (No Rh +/-)'
                    : language === 'ar' ? '8 فصائل معتمدة' : '8 ABO/Rh Groups'}
                </span>
              </div>

              {(() => {
                const activeBloodGroups =
                  selectedCategory === 'plasma'
                    ? ABO_PLASMA_GROUPS
                    : selectedCategory === 'platelets'
                    ? ABO_PLATELETS_GROUPS
                    : BLOOD_GROUPS;

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    {activeBloodGroups.map((bg) => {
                      const isSelected = selectedBloodType === bg.type;
                      const isUserBloodType =
                        currentUser?.blood_type === bg.type ||
                        ((selectedCategory === 'plasma' || selectedCategory === 'platelets') &&
                          currentUser?.blood_type?.replace(/[+-]/g, '') === bg.type);
                      return (
                        <button
                          key={bg.type}
                          id={`choice-blood-type-${bg.type.toLowerCase().replace('+', 'pos').replace('-', 'neg')}`}
                          type="button"
                          onClick={() => setSelectedBloodType(bg.type)}
                          className={`relative p-4 rounded-xl text-left rtl:text-right border-2 transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'border-red-600 bg-red-50/80 shadow-sm ring-2 ring-red-500/20'
                              : 'border-slate-200 hover:border-red-300 bg-white hover:bg-slate-50/80'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-2xl font-black tracking-tight ${
                                isSelected ? 'text-red-700' : 'text-slate-900'
                              }`}
                            >
                              {bg.type}
                            </span>
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                isSelected ? 'bg-red-600 text-white' : 'border border-slate-300 bg-slate-100'
                              }`}
                            >
                              {isSelected ? (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              ) : (
                                <Droplet className="w-3 h-3 text-slate-400" />
                              )}
                            </div>
                          </div>
                          {isUserBloodType && (
                            <div className="flex items-center justify-end mt-2">
                              <span className="shrink-0 text-[10px] bg-red-100 text-red-800 font-extrabold px-1.5 py-0.5 rounded">
                                {language === 'ar' ? 'فصيلتك' : 'Yours'}
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* SECOND CHOICE: SPECIFICATION OPTION */}
            {(() => {
              const catMeta = CATEGORY_METADATA[selectedCategory] || CATEGORY_METADATA['blood-bag'];
              const allSelected = selectedOptions.length === currentOptions.length;
              return (
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-black flex items-center justify-center">
                          2
                        </span>
                        <h2 className="text-lg sm:text-xl font-black text-slate-900">
                          {language === 'ar' ? catMeta.choice2TitleAr : catMeta.choice2TitleEn}
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto ps-8 sm:ps-0">
                      <button
                        id="choice-select-all-btn"
                        type="button"
                        onClick={handleToggleSelectAll}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                          allSelected
                            ? 'bg-red-600 text-white border-red-600 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>
                          {allSelected
                            ? language === 'ar'
                              ? 'تم تحديد الكل'
                              : 'All Selected'
                            : language === 'ar'
                            ? 'تحديد كل الخيارات'
                            : 'Select All Options'}
                        </span>
                      </button>

                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
                        {selectedOptions.length} / {currentOptions.length}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    {currentOptions.map((opt) => {
                      const isSelected = selectedOptions.includes(opt.id);
                      const priceToDisplay = opt.basePrice;
                      return (
                        <button
                          key={opt.id}
                          id={
                            opt.id === 'Filtered Blood' || opt.id === 'Leukoreduced Blood'
                              ? 'choice-option-leukoreduced-blood'
                              : `choice-option-${opt.id.toLowerCase().replace(/\s+/g, '-')}`
                          }
                          type="button"
                          onClick={() => handleToggleOption(opt.id)}
                          className={`w-full text-left rtl:text-right p-5 rounded-xl border-2 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer ${
                            isSelected
                              ? 'border-red-600 bg-red-50/80 shadow-sm ring-2 ring-red-500/20'
                              : 'border-slate-200 hover:border-red-300 bg-white hover:bg-slate-50/80'
                          }`}
                        >
                          <div className="flex items-start gap-3.5 flex-1">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                                isSelected ? 'bg-red-600 text-white shadow-2xs' : 'border border-slate-300 bg-slate-100'
                              }`}
                            >
                              {isSelected ? (
                                <Check className="w-4 h-4 stroke-[3]" />
                              ) : (
                                <span className="w-2 h-2 rounded-xs bg-slate-300" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3
                                  className={`text-base font-extrabold ${
                                    isSelected ? 'text-red-950' : 'text-slate-900'
                                  }`}
                                >
                                  {language === 'ar' ? opt.nameAr : opt.nameEn}
                                </h3>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                    isSelected
                                      ? 'bg-red-200 text-red-900'
                                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}
                                >
                                  {language === 'ar' ? opt.badgeAr : opt.badgeEn}
                                </span>
                              </div>
                              {Boolean(language === 'ar' ? opt.specAr : opt.specEn) && (
                                <p className="text-[11px] font-medium text-slate-500">
                                  {language === 'ar' ? opt.specAr : opt.specEn}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 text-left sm:text-right rtl:sm:text-left self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto flex sm:flex-col justify-between sm:justify-center items-center sm:items-end">
                            <span className="text-[10px] uppercase font-bold text-slate-500">
                              {language === 'ar' ? 'السعر ' : 'Option Price'}
                            </span>
                            <div className="text-lg font-black text-red-700">
                              {priceToDisplay} {t('currency')}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* SELECTION SUMMARY & QUANTITY BAR */}
            <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-6 sm:p-7 shadow-xl ring-1 ring-slate-800/80 border border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 transition-all duration-300">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-red-400 uppercase tracking-widest bg-red-950/60 border border-red-800/50 px-2 py-0.5 rounded-md">
                    {t('selectedChoiceBadge')}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>{t('freeDeliveryBadge')}</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                  <span className="text-2xl font-black text-white px-3 py-1 rounded-xl bg-red-600 shadow-sm shadow-red-900/40 ring-1 ring-red-400/30">
                    {selectedBloodType}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedOptions.map((optId) => {
                      const itemMeta = currentOptions.find((o) => o.id === optId);
                      return (
                        <span
                          key={optId}
                          className="text-xs sm:text-sm font-bold bg-slate-800/90 text-slate-100 px-3 py-1 rounded-xl border border-slate-700 shadow-2xs"
                        >
                          {language === 'ar' ? itemMeta?.nameAr || optId : itemMeta?.nameEn || optId}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium pt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                  <span>
                    {language === 'ar'
                      ? 'طلب بحث وتوفير معتمد — سنتواصل معكم فور تجهيز الطلب'
                      : 'Active search requisition — we will contact you immediately once processed'}
                  </span>
                </div>
              </div>

              {/* Quantity selector & Proceed button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                <div className="flex items-center justify-between bg-slate-800/90 border border-slate-700/80 rounded-xl p-1 px-2.5 shadow-inner">
                  <span className="text-xs font-semibold text-slate-300 px-2">
                    {language === 'ar'
                      ? `${CATEGORY_METADATA[selectedCategory]?.unitLabelAr || 'الكمية'}:`
                      : `${CATEGORY_METADATA[selectedCategory]?.unitLabelEn || 'Units'}:`}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      id="quantity-decrease-btn"
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          quantity: Math.max(1, (prev.quantity || 1) - 1),
                        }))
                      }
                      className="w-8 h-8 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-white flex items-center justify-center transition disabled:opacity-30 disabled:hover:bg-slate-700/80"
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-mono font-black text-sm text-white">
                      {quantity}
                    </span>
                    <button
                      id="quantity-increase-btn"
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          quantity: (prev.quantity || 1) + 1,
                        }))
                      }
                      className="w-8 h-8 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-white flex items-center justify-center transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <button
                  id="proceed-to-details-btn"
                  type="button"
                  onClick={handleProceedFromStep1}
                  className="group relative overflow-hidden bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:via-rose-500 hover:to-red-500 text-white px-5 py-3 sm:px-6 sm:py-3.5 rounded-xl shadow-md shadow-slate-950/40 hover:shadow-lg hover:shadow-red-900/30 ring-1 ring-white/20 inset flex items-center justify-between sm:justify-center gap-3.5 transition-all duration-200 active:scale-[0.985] cursor-pointer"
                >
                  {/* Subtle specular sheen that glides across on hover */}
                  <span className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-out pointer-events-none" />

                  {/* Text & step micro-hierarchy */}
                  <div className="flex flex-col items-start text-left rtl:items-end rtl:text-right relative z-10">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-red-200/90 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span>{language === 'ar' ? 'الخطوة ٢: بيانات التوصيل والتأكيد' : 'Step 2: Delivery Details & Confirm'}</span>
                    </span>
                    <span className="text-xs sm:text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                      <span>{language === 'ar' ? 'المتابعة لإدخال بيانات التوصيل' : 'Continue to Delivery Details'}</span>
                      {!currentUser && (
                        <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded text-amber-200">
                          {language === 'ar' ? '(يتطلب تسجيل)' : '(Requires Registration)'}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Subtotal badge & Arrow pill */}
                  <div className="flex items-center gap-2 shrink-0 relative z-10">
                    <span className="bg-black/25 backdrop-blur-xs px-2.5 py-1 rounded-lg text-xs font-mono font-black text-white/95 border border-white/10">
                      {subtotal} {t('currency')}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white text-white group-hover:text-red-700 transition-all duration-200 shadow-xs">
                      <ArrowIcon className="w-4 h-4 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: SIMPLE DELIVERY & ORDER DETAILS (GUEST-ACCESSIBLE) */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <form onSubmit={handleFinalOrderSubmit} className="space-y-6">
            {/* SUBMISSION ERROR ALERT */}
            {submissionError && (
              <div className="p-4 rounded-xl bg-red-100 border border-red-300 text-red-900 text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
                <span>{submissionError}</span>
              </div>
            )}

            {/* Top Selection Pill */}
            <div className="bg-red-50/80 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-md bg-red-600 text-white font-black text-sm">
                  {selectedBloodType}
                </span>
                <div>
                  <strong className="text-slate-900 text-xs sm:text-sm font-bold block">
                    {productDisplayName}
                    {selectedOptions.length > 0 && (
                      <span className="text-slate-700 font-semibold text-xs ms-1.5">
                        (
                        {selectedOptions
                          .map((optId) => {
                            const opt = currentOptions.find((o) => o.id === optId);
                            return language === 'ar' ? opt?.nameAr || optId : opt?.nameEn || optId;
                          })
                          .join(' • ')}
                        )
                      </span>
                    )}
                  </strong>
                  <span className="text-[11px] text-slate-600">
                    {quantity}{' '}
                    {language === 'ar'
                      ? CATEGORY_METADATA[selectedCategory]?.unitLabelAr || 'أكياس'
                      : CATEGORY_METADATA[selectedCategory]?.unitLabelEn || 'Units'}{' '}
                    • 0 {t('currency')} • {language === 'ar' ? 'توصيل مبرد مجاني معتمد' : 'Free Certified Cold-Chain Delivery'}
                  </span>
                </div>
              </div>
              <button
                id="back-to-change-blood-choice-btn"
                type="button"
                onClick={() => {
                  if (window.history.state?.step === 2) {
                    window.history.back();
                  } else {
                    setCurrentStep(1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="text-xs font-bold text-red-700 hover:text-red-800 hover:underline px-3 py-1.5 rounded-lg border border-red-300 bg-white cursor-pointer shrink-0"
              >
                {language === 'ar' ? 'تعديل الاختيار' : 'Change Choice'}
              </button>
            </div>

            {/* SIMPLE REQUIRED DATA: Name, Phone, and Delivery Address */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                    <HeartPulse className="w-5 h-5 text-red-600" />
                    <span>{language === 'ar' ? 'بيانات التوصيل والتواصل' : 'Delivery & Contact Details'}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === 'ar'
                      ? 'البيانات المسجلة الخاصة بحسابك لإتمام الطلب والتوصيل فوراً.'
                      : 'Your registered account details to confirm and dispatch your requisition.'}
                  </p>
                </div>

                {currentUser ? (
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 self-start sm:self-center">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>{language === 'ar' ? `حساب مسجل: ${currentUser.full_name}` : `Registered: ${currentUser.full_name}`}</span>
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                    <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>{language === 'ar' ? 'يتطلب تسجيل حساب' : 'Registration Required'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenAuth?.(
                          'register',
                          language === 'ar'
                            ? 'يرجى إنشاء حساب جديد بالبيانات المطلوبة لإتمام طلب أكياس الدم.'
                            : 'Please register to complete and place your blood requisition.'
                        )
                      }
                      className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg transition shadow-xs cursor-pointer"
                    >
                      {language === 'ar' ? 'إنشاء حساب جديد' : 'Register Now'}
                    </button>
                  </div>
                )}
              </div>

              {/* Notice if user is not registered yet */}
              {!currentUser && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>
                      {language === 'ar'
                        ? 'يجب تسجيل حساب جديد (الاسم، البريد، كلمة المرور، الهاتف، العنوان) أو تسجيل الدخول أولاً لتتمكن من إرسال الطلب.'
                        : 'You must register an account (Name, Email, Password, Phone, Address) or sign in first to place this order.'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onOpenAuth?.(
                          'register',
                          language === 'ar'
                            ? 'يرجى إنشاء حساب جديد لإتمام الطلب.'
                            : 'Please register to place your order.'
                        )
                      }
                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      {language === 'ar' ? 'إنشاء حساب' : 'Register'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenAuth?.(
                          'login',
                          language === 'ar'
                            ? 'تسجيل الدخول للمتابعة.'
                            : 'Sign in to continue.'
                        )
                      }
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      {language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* 1. NAME */}
                <div>
                  <label htmlFor="order-customer-name-input" className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    {language === 'ar' ? 'الاسم' : 'Name'} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="order-customer-name-input"
                      type="text"
                      required
                      value={draft.customerName || draft.patientName || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraft((prev) => ({
                          ...prev,
                          customerName: val,
                          patientName: val,
                        }));
                      }}
                      placeholder={language === 'ar' ? 'اكتب الاسم بالكامل' : 'Enter full name'}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-red-500 focus:ring-3 focus:ring-red-500/15 text-xs sm:text-sm outline-hidden transition bg-white"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute end-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                {/* 2. PHONE */}
                <div>
                  <label htmlFor="order-customer-phone-input" className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    {language === 'ar' ? 'رقم الهاتف' : 'Phone'} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="order-customer-phone-input"
                      type="tel"
                      required
                      value={draft.phone || draft.customerPhone || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraft((prev) => ({
                          ...prev,
                          phone: val,
                          customerPhone: val,
                        }));
                      }}
                      placeholder={language === 'ar' ? '01xxxxxxxxx' : 'e.g. 01000000000'}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-red-500 focus:ring-3 focus:ring-red-500/15 text-xs sm:text-sm outline-hidden transition bg-white"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute end-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                {/* 3. DELIVERY ADDRESS */}
                <div>
                  <label htmlFor="order-delivery-address-input" className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    {language === 'ar' ? 'عنوان التوصيل' : 'Delivery Address'} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      id="order-delivery-address-input"
                      rows={3}
                      required
                      value={draft.address || draft.manualDeliveryAddress || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraft((prev) => ({
                          ...prev,
                          address: val,
                          manualDeliveryAddress: val,
                        }));
                      }}
                      placeholder={
                        language === 'ar'
                          ? 'اكتب عنوان التوصيل بالتفصيل (المحافظة، المنطقة، الشارع، المبنى أو المستشفى...)'
                          : 'Enter complete delivery address (governorate, area, street, building or hospital name...)'
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-red-500 focus:ring-3 focus:ring-red-500/15 text-xs sm:text-sm outline-hidden transition bg-white resize-none"
                    />
                    <MapPin className="w-4 h-4 text-slate-400 absolute end-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Free Delivery & Requisition Ledger */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between items-center text-slate-600">
                  <span>{language === 'ar' ? 'سعر المنتجات المطلوبة:' : 'Requisition Price:'}</span>
                  <span className="font-bold text-slate-900">0 {t('currency')}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    <span>{language === 'ar' ? 'رسوم التوصيل المبرد المعتمد:' : 'Certified Cold-Chain Dispatch:'}</span>
                  </span>
                  <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                    {language === 'ar' ? 'مجاني (0 ج.م)' : 'Free (0 EGP)'}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm sm:text-base font-black text-slate-900">
                  <span>{language === 'ar' ? 'المجموع الكلي المطلوب سداده:' : 'Total Payable:'}</span>
                  <span className="text-red-700 text-lg font-black">0 {t('currency')}</span>
                </div>
              </div>

              {/* Navigation & Submit Buttons */}
              <div className="flex items-center justify-between gap-4 pt-2">
                <button
                  id="back-to-step-1-btn"
                  type="button"
                  onClick={() => {
                    if (window.history.state?.step === 2) {
                      window.history.back();
                    } else {
                      setCurrentStep(1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className="px-5 py-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer"
                >
                  <BackIcon className="w-4 h-4" />
                  <span>{language === 'ar' ? 'الرجوع لاختيار الفصيلة' : 'Back to Selection'}</span>
                </button>

                <button
                  id="confirm-order-submit-btn"
                  type={currentUser ? 'submit' : 'button'}
                  onClick={
                    currentUser
                      ? undefined
                      : () =>
                          onOpenAuth?.(
                            'register',
                            language === 'ar'
                              ? 'يجب إنشاء حساب أولاً بالبيانات المطلوبة (الاسم، البريد، كلمة المرور، الهاتف، العنوان) لإتمام الطلب.'
                              : 'You must register an account first before you can place the order.'
                          )
                  }
                  disabled={isSubmitting}
                  className={`group relative overflow-hidden text-white font-extrabold px-7 sm:px-9 py-3.5 rounded-xl shadow-md transition-all duration-200 active:scale-[0.985] text-xs sm:text-sm cursor-pointer disabled:opacity-50 flex items-center gap-3 ${
                    currentUser
                      ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:via-rose-500 hover:to-red-500 shadow-slate-950/40 hover:shadow-lg hover:shadow-red-900/30 ring-1 ring-white/20 inset'
                      : 'bg-red-700 hover:bg-red-800 ring-2 ring-red-500/40 shadow-red-900/30'
                  }`}
                >
                  {currentUser ? (
                    <ShieldCheck className="w-5 h-5 text-white" />
                  ) : (
                    <Lock className="w-5 h-5 text-white" />
                  )}
                  <span>
                    {isSubmitting
                      ? language === 'ar'
                        ? 'جاري تأكيد الطلب...'
                        : 'Authorizing Order...'
                      : currentUser
                      ? language === 'ar'
                        ? 'تأكيد وإرسال الطلب (0 ج.م)'
                        : 'Confirm & Place Order (0 EGP)'
                      : language === 'ar'
                      ? 'إنشاء حساب أولاً لإتمام الطلب'
                      : 'Register First to Place Order'}
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
