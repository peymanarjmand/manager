export interface ServiceField {
  key: string;
  label: string;
  secret?: boolean;
  multiline?: boolean;
  number?: boolean;
  login?: boolean;
}
export interface ServiceTemplate {
  title: string;
  fields: ServiceField[];
  loginMethods?: boolean;
}
const f = (
  key: string,
  label: string,
  secret = false,
  multiline = false,
  number = false,
): ServiceField => ({ key, label, secret, multiline, number });
const login = [
  f("username", "نام کاربری / موبایل ورود"),
  f("email", "ایمیل"),
  f("password", "رمز عبور", true),
];
const twoFA = [
  f("twoFactorMethod", "روش دومرحله‌ای"),
  f("twoFactorSecret", "کلید دومرحله‌ای / اطلاعات QR", true, true),
];
const oauth = [
  { ...f("linkedAccount", "حساب مرتبط گوگل / گیتهاب"), login: true },
  { ...f("email", "ایمیل ورود"), login: true },
  { ...f("password", "رمز ورود", true), login: true },
];
export const SERVICE_TEMPLATES: Record<string, ServiceTemplate> = {
  github: {
    title: "GitHub",
    fields: [
      ...login,
      f("accountUrl", "لینک حساب"),
      f("repositories", "مخزن‌ها", false, true),
      f("token", "توکن دسترسی", true),
      f("ssh", "اطلاعات SSH", true, true),
      ...twoFA,
    ],
  },
  email: {
    title: "ایمیل",
    fields: [
      f("email", "آدرس ایمیل"),
      f("password", "رمز عبور", true),
      f("appPassword", "رمز برنامه", true),
      f("recoveryEmail", "ایمیل بازیابی"),
      f("recoveryMobile", "موبایل بازیابی", false, false, true),
      f("provider", "سرویس‌دهنده"),
      f("imap", "تنظیمات IMAP", false, true),
      f("smtp", "تنظیمات SMTP", false, true),
      ...twoFA,
    ],
  },
  server: {
    title: "سرور، هاست و SSH",
    fields: [
      f("provider", "شرکت ارائه‌دهنده"),
      f("serviceName", "عنوان سرویس"),
      f("host", "IP یا میزبان"),
      f("domain", "دامنه"),
      f("panelUrl", "نشانی پنل"),
      ...login,
      f("port", "پورت", false, false, true),
      f("os", "سیستم‌عامل"),
      f("sshKey", "کلید SSH", true, true),
      f("sshPassphrase", "عبارت محافظ کلید", true),
    ],
  },
  digipay: {
    title: "دیجی‌پی",
    fields: [
      f("panelUser", "موبایل / نام کاربری پنل"),
      f("panelPassword", "رمز پنل", true),
      f("apiUser", "نام کاربری وب‌سرویس"),
      f("apiPassword", "رمز وب‌سرویس", true),
      f("merchantId", "شناسهٔ پذیرنده"),
      f("domain", "دامنه"),
      f("callback", "Callback URL"),
      f("client_id", "شناسه محرمانه client_id", true),
      f("client_secret", "رمز عبور محرمانه client_secret", true),
      f("authorization", "Authorization Header", true),
      f("accessToken", "توکن دسترسی", true),
    ],
  },
  aqaye: {
    title: "آقای پرداخت",
    fields: [
      ...login,
      f("pin", "کد درگاه PIN", true),
      f("gatewayName", "نام درگاه"),
      f("gatewayUrl", "نشانی درگاه"),
      f("callback", "Callback URL"),
      f("bankAccount", "شناسه / عنوان حساب تسویهٔ مرتبط"),
    ],
  },
  kavenegar: {
    title: "کاوه‌نگار",
    fields: [
      f("mobile", "موبایل", false, false, true),
      f("email", "ایمیل"),
      f("password", "رمز عبور", true),
      f("apiKey", "API Key", true),
      f("senders", "شماره‌های فرستنده", false, true),
      f("templates", "نام الگوها", false, true),
    ],
  },
  supabase: {
    title: "Supabase",
    loginMethods: true,
    fields: [
      ...oauth,
      f("organization", "سازمان"),
      f("projects", "پروژه‌ها", false, true),
      f("projectRef", "Project Ref"),
      f("projectUrl", "Project URL"),
      f("apiKeys", "کلیدهای API", true, true),
      f("database", "اطلاعات اتصال دیتابیس", true, true),
      ...twoFA,
    ],
  },
  netlify: {
    title: "Netlify",
    loginMethods: true,
    fields: [
      ...oauth,
      f("team", "تیم"),
      f("projects", "پروژه‌ها", false, true),
      f("siteUrl", "نشانی سایت"),
      f("panelUrl", "نشانی مدیریت"),
      f("repository", "مخزن"),
      f("token", "توکن دسترسی", true),
      ...twoFA,
    ],
  },
  instagram: {
    title: "اینستاگرام",
    fields: [...login, f("mobile", "موبایل", false, false, true), ...twoFA],
  },
  bank: {
    title: "حساب بانکی",
    fields: [
      f("bank", "نام بانک"),
      f("owner", "نام صاحب حساب"),
      f("account", "شماره حساب", false, false, true),
      f("card", "شماره کارت", false, false, true),
      f("iban", "شبا", false, false, true),
    ],
  },
  tax: {
    title: "مالیات",
    fields: [
      f("trackingCode", "کد پیگیری / پرونده", false, false, true),
      f("economicCode", "کد اقتصادی", false, false, true),
      ...login,
      f("mobile", "موبایل مرتبط", false, false, true),
      f("panelUrl", "نشانی پنل"),
    ],
  },
  domain: {
    title: "دامنه و DNS",
    fields: [
      f("domain", "دامنه"),
      f("provider", "ثبت‌کننده / DNS"),
      f("panelUrl", "نشانی مدیریت"),
      ...login,
      f("nameservers", "Name Serverها", false, true),
      f("authCode", "کد انتقال دامنه", true),
      f("apiKey", "کلید API", true),
    ],
  },
  cloudflare: {
    title: "Cloudflare",
    fields: [
      ...login,
      f("accountId", "Account ID"),
      f("zoneId", "Zone ID"),
      f("domain", "دامنه"),
      f("token", "API Token", true),
      f("globalKey", "Global API Key", true),
      ...twoFA,
    ],
  },
  wordpress: {
    title: "وردپرس",
    fields: [
      f("siteUrl", "نشانی سایت"),
      f("panelUrl", "نشانی مدیریت"),
      ...login,
      f("appPassword", "رمز برنامه", true),
      f("database", "اطلاعات دیتابیس", true, true),
      ...twoFA,
    ],
  },
  custom: {
    title: "سایر موارد",
    fields: [
      f("provider", "نام سرویس"),
      f("panelUrl", "نشانی مدیریت"),
      ...login,
      f("apiKey", "کلید API", true),
      ...twoFA,
    ],
  },
};
export const LEDGER_OPTIONS = [
  { value: "expense", label: "هزینهٔ پرداخت‌شده برای مشتری (+ طلب)" },
  { value: "charge", label: "حق‌الزحمه / طلب از مشتری (+)" },
  { value: "owe", label: "بدهی من به مشتری (−)" },
  { value: "receipt", label: "دریافت از مشتری / پیش‌پرداخت (−)" },
  { value: "payment", label: "پرداخت / بازپرداخت به مشتری (+)" },
  { value: "opening", label: "ماندهٔ اول دوره" },
];
