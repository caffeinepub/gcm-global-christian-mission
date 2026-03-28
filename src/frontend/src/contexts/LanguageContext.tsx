import { type ReactNode, createContext, useContext, useState } from "react";

export type Lang = "en" | "ar";

interface LanguageContextType {
  lang: Lang;
  isRTL: boolean;
  toggleLang: () => void;
  t: (key: string) => string;
}

const translations: Record<Lang, Record<string, string>> = {
  en: {
    appName: "GCM",
    appFull: "Global Christian Mission",
    churches: "Churches",
    education: "Education",
    events: "Events",
    vision: "Vision",
    teams: "Teams",
    adminLogin: "Admin Login",
    logout: "Logout",
    managementMode: "Management Mode",
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    name: "Name",
    description: "Description",
    address: "Address",
    phone: "Phone",
    latitude: "Latitude",
    longitude: "Longitude",
    imageUrl: "Image URL",
    loading: "Loading...",
    noData: "No content available",
    distance: "km away",
    findNearest: "Find Nearest Church",
    locating: "Locating...",
    addToCalendar: "Add to Calendar",
    published: "Published",
    draft: "Draft",
    author: "Author",
    type: "Type",
    video: "Video",
    photo: "Photo",
    text: "Text",
    mediaUrls: "Media URLs",
    content: "Content",
    title: "Title",
    location: "Location",
    date: "Date & Time",
    category: "Category",
    order: "Order",
    sectionKey: "Section Key",
    body: "Body",
    mission: "Mission",
    vision2: "Vision",
    goals: "Goals",
    strategy: "Strategy",
    choir: "Choir",
    youth: "Youth",
    kids: "Kids",
    ministry: "Ministry",
    volunteers: "Volunteers",
    all: "All",
    upcomingEvents: "Upcoming Events",
    pastEvents: "Past Events",
    ourTeams: "Our Teams",
    educationHub: "Education Hub",
    churchLocator: "Church Locator",
    visionPlan: "Vision & Plan",
    loginWithII: "Login with Internet Identity",
    confirmDelete: "Are you sure you want to delete this?",
    yes: "Yes, Delete",
    no: "No, Cancel",
    nearbyChurches: "Nearby Churches",
    getDirections: "Get Directions",
    selectLocation: "Click map or allow location access",
  },
  ar: {
    appName: "GCM",
    appFull: "GCM",
    churches: "الكنائس",
    education: "التعليم",
    events: "الفعاليات",
    vision: "الرؤية",
    teams: "الفرق",
    adminLogin: "دخول المشرف",
    logout: "تسجيل الخروج",
    managementMode: "وضع الإدارة",
    add: "إضافة",
    edit: "تعديل",
    delete: "حذف",
    save: "حفظ",
    cancel: "إلغاء",
    name: "الاسم",
    description: "الوصف",
    address: "العنوان",
    phone: "الهاتف",
    latitude: "خط العرض",
    longitude: "خط الطول",
    imageUrl: "رابط الصورة",
    loading: "جاري التحميل...",
    noData: "لا يوجد محتوى",
    distance: "كم",
    findNearest: "البحث عن أقرب كنيسة",
    locating: "جاري التحديد...",
    addToCalendar: "أضف للتقويم",
    published: "منشور",
    draft: "مسودة",
    author: "المؤلف",
    type: "النوع",
    video: "فيديو",
    photo: "صورة",
    text: "نص",
    mediaUrls: "روابط الوسائط",
    content: "المحتوى",
    title: "العنوان",
    location: "الموقع",
    date: "التاريخ والوقت",
    category: "الفئة",
    order: "الترتيب",
    sectionKey: "مفتاح القسم",
    body: "النص",
    mission: "الرسالة",
    vision2: "الرؤية",
    goals: "الأهداف",
    strategy: "الاستراتيجية",
    choir: "الكورال",
    youth: "الشباب",
    kids: "الأطفال",
    ministry: "الخدمة",
    volunteers: "المتطوعون",
    all: "الكل",
    upcomingEvents: "الفعاليات القادمة",
    pastEvents: "الفعاليات السابقة",
    ourTeams: "فرقنا",
    educationHub: "مركز التعليم",
    churchLocator: "دليل الكنائس",
    visionPlan: "الرؤية والخطة",
    loginWithII: "تسجيل الدخول",
    confirmDelete: "هل أنت متأكد من الحذف؟",
    yes: "نعم، احذف",
    no: "لا، إلغاء",
    nearbyChurches: "الكنائس القريبة",
    getDirections: "احصل على الاتجاهات",
    selectLocation: "انقر على الخريطة أو اسمح بالوصول للموقع",
  },
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  isRTL: false,
  toggleLang: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const isRTL = lang === "ar";

  const toggleLang = () => setLang((l) => (l === "en" ? "ar" : "en"));
  const t = (key: string) => translations[lang][key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, isRTL, toggleLang, t }}>
      <div dir={isRTL ? "rtl" : "ltr"} className={isRTL ? "font-arabic" : ""}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
