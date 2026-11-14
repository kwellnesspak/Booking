/* Pakistan Clinic Korea by HS — booking core v1.0
   One file, used in two places: core.js on the website and Core.gs in Google Apps Script.
   Keep both copies identical. All booking rules live here. */
var PCK = (function () {
"use strict";
const VERSION = "1.1";
const WA = "821095226111";
const WA_SHOW = "+82 10-9522-6111";

/* ---------- rules ---------- */
const CFG = {
  block: 120,              // minutes HS keeps for one patient
  step: 30,                // minutes between selectable times
  off: [0, 3],             // closed weekdays: 0 = Sunday, 3 = Wednesday
  wd: { start: 570, last: 1050 },   // Mon Tue Thu Fri: 09:30, last booking 17:30
  sat: { start: 570, last: 870 },   // Saturday: 09:30, last booking 14:30
  minNoticeDays: 2,
  maxMonths: 2,
  maxActivePerPhone: 3,
  maxWebPerDay: 40
};
const HOLIDAYS = [
  ["2026-12-25", "Christmas Day"], ["2027-01-01", "New Year's Day"],
  ["2027-02-06", "Seollal"], ["2027-02-07", "Seollal"], ["2027-02-08", "Seollal"], ["2027-02-09", "Seollal (substitute)"],
  ["2027-03-01", "Independence Movement Day"], ["2027-05-01", "Labour Day"], ["2027-05-03", "Labour Day (substitute)"],
  ["2027-05-05", "Children's Day"], ["2027-05-13", "Buddha's Birthday"], ["2027-06-06", "Memorial Day"],
  ["2027-07-17", "Constitution Day"], ["2027-07-19", "Constitution Day (substitute)"],
  ["2027-08-15", "Liberation Day"], ["2027-08-16", "Liberation Day (substitute)"],
  ["2027-09-14", "Chuseok"], ["2027-09-15", "Chuseok"], ["2027-09-16", "Chuseok"],
  ["2027-10-03", "National Foundation Day"], ["2027-10-04", "National Foundation Day (substitute)"],
  ["2027-10-09", "Hangeul Day"], ["2027-10-11", "Hangeul Day (substitute)"],
  ["2027-12-25", "Christmas Day"], ["2027-12-27", "Christmas Day (substitute)"]
];

/* ---------- places and treatments ---------- */
const STN = {
  gangnam: { en: "Gangnam Station", ur: "گنگنم اسٹیشن", ko: "강남역" },
  apgujeong: { en: "Apgujeong Station", ur: "اپگوجونگ اسٹیشن", ko: "압구정역" },
  sinnonhyeon: { en: "Sinnonhyeon Station", ur: "شن نون ہیون اسٹیشن", ko: "신논현역" },
  eonju: { en: "Eonju Station", ur: "اونجو اسٹیشن", ko: "언주역" },
  samseong: { en: "Samseong Station", ur: "سام سونگ اسٹیشن", ko: "삼성역" },
  gyodae: { en: "Gyodae Station", ur: "گیودے اسٹیشن", ko: "교대역", sign: "Seoul Nat'l Univ. of Education" }
};
const CLINICS = {
  eye: { en: "Gangnam Grand Eye Clinic", ko: "강남그랜드안과", st: [["gangnam", 5]] },
  uro: { en: "Yonsei Uno Urology", ko: "연세우노비뇨기과", st: [["gangnam", 1]], satLast: 750 },
  monara: { en: "Monara Clinic", ko: "모나라피부과", st: [["apgujeong", 4]] },
  daum: { en: "Gangnam Daum Clinic", ko: "강남다움의원", st: [["gangnam", 10]] },
  barog: { en: "Barog Clinic", ko: "바로그의원", st: [["gangnam", 11]] },
  make: { en: "Make Dental Clinic", ko: "메이크치과", st: [["sinnonhyeon", 3], ["eonju", 1]] },
  oakwood: { en: "Oakwood Bom Clinic", ko: "오크우드봄의원", st: [["samseong", 5]] },
  choisang: { en: "Choisang Women's Clinic", ko: "최상산부인과", st: [["gyodae", 4]] },
  vibe: { en: "Vibe Plastic Surgery", ko: "", st: [["sinnonhyeon", 3]] }
};
const N = (en, ur, ko) => ({ en: en, ur: ur, ko: ko });
const CATS = [
  { id: "eye", clinics: ["eye"], name: N("Eyes", "آنکھیں", "안과"), hint: N("LASIK, SMILE, cataract", "لیزک، سمائل، موتیا", "라식·스마일·백내장"),
    needs: [N("Eye check-up", "آنکھوں کا معائنہ", "안과 검진"), N("LASIK", "لیزک", "라식"), N("LASEK", "لیسک", "라섹"), N("SMILE", "سمائل", "스마일"), N("Lens implant (ICL)", "لینز امپلانٹ (ICL)", "렌즈삽입술 (ICL)"), N("Cataract", "موتیا", "백내장")] },
  { id: "skin", clinics: ["daum"], name: N("Skin", "جلد (سکن)", "피부과"), hint: N("Skin booster, lifting, filler", "سکن بوسٹر، لفٹنگ، فلر", "스킨부스터·리프팅·필러"),
    needs: [N("Skin consultation", "سکن کا مشورہ", "피부 상담"), N("Skin booster (Rejuran)", "سکن بوسٹر (ریجوران)", "스킨부스터 (리쥬란)"), N("Thread lifting", "تھریڈ لفٹنگ", "실리프팅"), N("Filler", "فلر", "필러"), N("Skin Botox", "سکن بوٹوکس", "스킨보톡스")] },
  { id: "laser", clinics: ["barog"], name: N("Laser, Botox & filler", "لیزر، بوٹوکس اور فلر", "레이저·보톡스·필러"), hint: N("Hair removal, skin laser", "بال ہٹانا، سکن لیزر", "제모·피부 레이저"),
    needs: [N("Laser hair removal", "لیزر سے بال ہٹانا", "레이저 제모"), N("Botox", "بوٹوکس", "보톡스"), N("Filler", "فلر", "필러"), N("Skin laser (spots, redness, pores)", "سکن لیزر (داغ، سرخی، مسام)", "피부 레이저 (색소·홍조·모공)"), N("Body lifting", "باڈی لفٹنگ", "바디 리프팅")] },
  { id: "hair", clinics: ["monara"], name: N("Hair transplant", "ہیئر ٹرانسپلانٹ", "모발이식"), hint: N("Hair, eyebrows, beard", "بال، بھنویں، داڑھی", "모발·눈썹·수염"),
    needs: [N("Hair transplant", "بالوں کا ٹرانسپلانٹ", "모발이식"), N("Eyebrow transplant", "بھنوؤں کا ٹرانسپلانٹ", "눈썹이식"), N("Beard transplant", "داڑھی کا ٹرانسپلانٹ", "수염이식"), N("Scalp care", "سر کی جلد کی کیئر", "두피 케어")] },
  { id: "uro", clinics: ["uro"], name: N("Urology", "یورولوجی", "비뇨의학과"), hint: N("Men's health, prostate", "مردانہ صحت، پروسٹیٹ", "남성 건강·전립선"),
    needs: [N("Consultation", "مشورہ", "상담"), N("Circumcision", "ختنہ", "포경수술"), N("Vasectomy", "نس بندی", "정관수술"), N("Prostate", "پروسٹیٹ", "전립선"), N("Other, I will tell HS privately", "دیگر، HS کو الگ سے بتاؤں گا", "기타 (개별 문의)")] },
  { id: "nose", clinics: ["vibe"], name: N("Nose", "ناک", "코 (비염·코 수술)"), hint: N("Rhinitis surgery, nose surgery", "بند ناک کی سرجری، ناک کی سرجری", "비염수술·코 수술"),
    needs: [N("Rhinitis surgery (비염수술)", "بند ناک یا الرجی کی سرجری (비염수술)", "비염수술"), N("Nose surgery", "ناک کی سرجری", "코 수술"), N("Consultation first", "پہلے مشورہ", "상담 먼저")] },
  { id: "dental", clinics: ["make"], name: N("Dental", "دانت", "치과"), hint: N("Implant, whitening, braces", "امپلانٹ، وائٹننگ، بریسز", "임플란트·미백·교정"),
    needs: [N("Check-up", "معائنہ", "검진"), N("Whitening", "وائٹننگ", "미백"), N("Implant", "امپلانٹ", "임플란트"), N("Braces or aligners", "بریسز", "교정"), N("Veneers (laminate)", "وینیئرز (لیمینیٹ)", "라미네이트"), N("Filling or crown", "فلنگ یا کراؤن", "충치·크라운")] },
  { id: "women", clinics: ["oakwood", "choisang"], name: N("Women's health", "خواتین کی صحت", "산부인과"), hint: N("Check-up, ultrasound, vaccine", "چیک اپ، الٹراساؤنڈ، ویکسین", "검진·초음파·백신"),
    needs: [N("Check-up or ultrasound", "چیک اپ یا الٹراساؤنڈ", "검진·초음파"), N("Pregnancy check", "حمل کا چیک اپ", "임신 검사"), N("HPV vaccine", "HPV ویکسین", "자궁경부암 백신"), N("Pre-wedding check-up", "شادی سے پہلے چیک اپ", "웨딩검진"), N("Contraception", "مانع حمل", "피임")] },
  { id: "checkup", clinics: ["oakwood"], name: N("Health check‑up", "ہیلتھ چیک اپ", "건강검진"), hint: N("Full-body screening", "مکمل جسمانی معائنہ", "종합검진"),
    needs: [N("Basic check-up", "بنیادی چیک اپ", "기본 검진"), N("Full check-up with endoscopy", "اینڈوسکوپی کے ساتھ مکمل چیک اپ", "내시경 포함 종합검진"), N("Not sure yet", "ابھی طے نہیں", "미정")] }
];
const NAT = [["PK", N("Pakistan", "پاکستان", "파키스탄")], ["IN", N("India", "بھارت", "인도")], ["BD", N("Bangladesh", "بنگلہ دیش", "방글라데시")], ["NP", N("Nepal", "نیپال", "네팔")], ["LK", N("Sri Lanka", "سری لنکا", "스리랑카")], ["AF", N("Afghanistan", "افغانستان", "아프가니스탄")], ["KH", N("Cambodia", "کمبوڈیا", "캄보디아")], ["UZ", N("Uzbekistan", "ازبکستان", "우즈베키스탄")], ["other", N("Other", "دیگر", "기타")]];
const SRC = ["tiktok", "facebook", "instagram", "friend", "other"];
const MON = { en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  ur: ["جنوری", "فروری", "مارچ", "اپریل", "مئی", "جون", "جولائی", "اگست", "ستمبر", "اکتوبر", "نومبر", "دسمبر"] };
const DOW = { en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], ur: ["اتوار", "پیر", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ"], ko: ["일", "월", "화", "수", "목", "금", "토"] };

/* ---------- dates and times ---------- */
function toDate(s) { const a = String(s).split("-").map(Number); return new Date(Date.UTC(a[0], a[1] - 1, a[2])); }
function iso(d) { return d.toISOString().slice(0, 10); }
function isDate(s) { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return false; const d = toDate(s); return !isNaN(d.getTime()) && iso(d) === s; }
function addDays(s, n) { const d = toDate(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); }
function addMonths(s, n) { const a = s.split("-").map(Number); const t = new Date(Date.UTC(a[0], a[1] - 1 + n, 1)); const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate(); t.setUTCDate(Math.min(a[2], last)); return iso(t); }
function dow(s) { return toDate(s).getUTCDay(); }
function hm(min) { return String(Math.floor(min / 60)).padStart(2, "0") + ":" + String(min % 60).padStart(2, "0"); }
function parseHm(s) { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s == null ? "" : s).trim()); return m ? (+m[1]) * 60 + (+m[2]) : NaN; }
function seoulParts(now) { const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now || new Date()); const g = k => p.find(x => x.type === k).value; return { date: g("year") + "-" + g("month") + "-" + g("day"), time: (g("hour") === "24" ? "00" : g("hour")) + ":" + g("minute") }; }
function seoulToday(now) { return seoulParts(now).date; }
function ageOn(dob, today) { if (!isDate(dob) || !isDate(today)) return ""; let a = Number(today.slice(0, 4)) - Number(dob.slice(0, 4)); if (today.slice(5) < dob.slice(5)) a--; return a >= 0 ? a : ""; }

function hoursFor(ds, clinic) { if (dow(ds) === 6) return { start: CFG.sat.start, last: (clinic && clinic.satLast) || CFG.sat.last }; return CFG.wd; }
/* busy = [{d:"YYYY-MM-DD", s:startMinute, m:minutes}] */
function clash(busy, ds, t, dur) { for (let i = 0; i < busy.length; i++) { const b = busy[i]; if (b.d === ds && t < b.s + b.m && t + dur > b.s) return true; } return false; }
function slotsFor(ds, clinic, busy) { const h = hoursFor(ds, clinic), out = []; for (let t = h.start; t <= h.last; t += CFG.step) out.push({ t: t, free: !clash(busy, ds, t, CFG.block) }); return out; }
/* c = {today, minDate, maxDate, closed:[dates]} */
function dayBase(ds, c) { if (ds < c.today || ds < c.minDate) return "soon"; if (ds > c.maxDate) return "far"; if (CFG.off.indexOf(dow(ds)) >= 0) return "off"; if (c.closed.indexOf(ds) >= 0) return "holiday"; return "ok"; }
function dayState(ds, clinic, busy, c) { const b = dayBase(ds, c); if (b !== "ok") return b; return slotsFor(ds, clinic, busy).some(s => s.free) ? "open" : "full"; }

/* ---------- words ---------- */
function fmtTime(m, lang) { const h = Math.floor(m / 60), mm = String(m % 60).padStart(2, "0"), h12 = ((h + 11) % 12) + 1; if (lang === "ko") return (h < 12 ? "오전 " : "오후 ") + h12 + ":" + mm; return h12 + ":" + mm + (h < 12 ? " AM" : " PM"); }
function fmtDate(ds, lang) { if (!isDate(ds)) return String(ds || ""); const d = toDate(ds), w = d.getUTCDay(), day = d.getUTCDate(), mo = d.getUTCMonth(), y = d.getUTCFullYear();
  if (lang === "ko") return y + "년 " + (mo + 1) + "월 " + day + "일 (" + DOW.ko[w] + ")";
  if (lang === "ur") return DOW.ur[w] + "، " + day + " " + MON.ur[mo] + " " + y;
  return DOW.en[w] + ", " + day + " " + MON.en[mo].slice(0, 3) + " " + y; }
function monthTitle(ym, lang) { const a = ym.split("-").map(Number); if (lang === "ko") return a[0] + "년 " + a[1] + "월"; return (lang === "ur" ? MON.ur : MON.en)[a[1] - 1] + " " + a[0]; }
function L(o, lang) { return (o && (o[lang] || o.en)) || ""; }
function catById(id) { for (let i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i]; return null; }
function clinicName(c, lang) { if (!c) return ""; if (lang === "ko") return c.ko || c.en; return c.ko ? c.en + " (" + c.ko + ")" : c.en; }
function stText(st, lang) { const s = STN[st[0]], ex = st[1]; if (lang === "ko") return s.ko + " " + ex + "번 출구"; if (lang === "ur") return s.ur + " · ایگزٹ " + ex; return s.en + " · Exit " + ex; }
function stSub(st, lang) { const s = STN[st[0]], ex = st[1]; let t; if (lang === "ko") t = s.en + " · Exit " + ex; else if (lang === "ur") t = s.en + " · Exit " + ex + " · " + s.ko; else t = s.ko + " " + ex + "번 출구"; return s.sign ? t + " · " + s.sign : t; }
function meetText(c, lang) { if (!c) return ""; const or = lang === "ko" ? " 또는 " : lang === "ur" ? " یا " : " or "; return c.st.map(s => stText(s, lang)).join(or); }
function natName(a, b, c) { let nat, other, lang; if (a && typeof a === "object") { nat = a.nat; other = a.natOther; lang = b; } else { nat = a; other = b; lang = c; } if (nat === "other") return other || ""; for (let i = 0; i < NAT.length; i++) if (NAT[i][0] === nat) return L(NAT[i][1], lang); return ""; }
function needsIdx(b) { const cat = catById(b.cat); if (!cat) return []; const raw = Array.isArray(b.needs) ? b.needs : String(b.needs == null ? "" : b.needs).split(","); const out = []; raw.forEach(v => { if (v === "" || v === null) return; const n = Number(v); if (Number.isInteger(n) && n >= 0 && n < cat.needs.length && out.indexOf(n) < 0) out.push(n); }); return out; }
function needsText(a, b, c) { let o, lang; if (a && typeof a === "object") { o = a; lang = b; } else { o = { cat: a, needs: b }; lang = c; } const cat = catById(o.cat); if (!cat) return ""; return needsIdx(o).map(i => L(cat.needs[i], lang)).join(", "); }
function catName(b, lang) { const c = catById(b.cat); return c ? L(c.name, lang).replace(/‑/g, "-") : String(b.cat || ""); }
function normPhone(p) { let d = String(p == null ? "" : p).replace(/\D/g, ""); if (d.indexOf("00") === 0) d = d.slice(2); else if (d.indexOf("01") === 0 && d.length >= 10 && d.length <= 11) d = "82" + d.slice(1); else if (d.indexOf("03") === 0 && d.length === 11) d = "92" + d.slice(1); return d; }
function fill(s, o) { return String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] !== undefined ? o[k] : m)); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function waLink(num, text) { return "https://wa.me/" + String(num || "").replace(/\D/g, "") + (text ? "?text=" + encodeURIComponent(text) : ""); }
function clinicFor(catId, loc) { const c = catById(catId); if (!c) return null; return CLINICS[c.clinics.length > 1 ? loc : c.clinics[0]] || null; }
const STATUSES = ["pending", "proposed", "confirmed", "done", "noshow", "cancelled"];
const HOLD = { pending: 1, proposed: 1, confirmed: 1, done: 1, noshow: 1 };   // these keep their time reserved
/* Every detail of a booking as [label, value] rows, in English (for HS). */
function detailLines(b, today) {
  const cl = clinicFor(b.cat, b.loc), needs = needsText(b, "en"), age = ageOn(b.dob, today), t = parseHm(b.start), out = [];
  const add = (k, v) => { if (v !== "" && v != null) out.push([k, String(v)]); };
  add("Reference", b.ref); add("Treatment", catName(b, "en") + (needs ? " (" + needs + ")" : "")); add("Date", fmtDate(b.date, "en")); add("Time", isNaN(t) ? b.start : fmtTime(t, "en"));
  add("Meeting point", meetText(cl, "en")); add("Clinic", clinicName(cl, "en")); add("Name", b.name); add("Birth date", b.dob ? b.dob + (age !== "" ? " (age " + age + ")" : "") : "");
  add("Gender", { male: "Male", female: "Female" }[b.gender] || ""); add("Nationality", natName(b, "en")); add("Health insurance", { yes: "Yes", no: "No", unsure: "Not sure" }[b.ins] || "");
  add("Phone", b.phone); add("Confirmation by", b.contact === "email" ? "Email" + (b.email ? " (" + b.email + ")" : "") : b.contact === "whatsapp" ? "WhatsApp" : "");
  add("Found us on", { tiktok: "TikTok", facebook: "Facebook", instagram: "Instagram", friend: "Friend or family", other: "Other" }[b.src] || ""); add("People", b.people === "3" ? "3 or more" : b.people); add("Customer note", b.note);
  return out;
}

/* ---------- messages to the customer (WhatsApp and email) ---------- */
const SIGN = "\n\nHS, Pakistan Clinic Korea\nWhatsApp " + WA_SHOW;
const MSG = {
  en: {
    received: ["We received your booking request · {ref}", "Hello {name},\n\nHS received your booking request.\n\nTreatment: {cat}\nDate: {date}\nTime: {time}\nReference: {ref}\n\nThis is not confirmed yet. HS is checking with the clinic and will message you again within 1 to 2 days."],
    confirmed: ["Your visit is confirmed · {ref}", "Hello {name},\n\nYour visit is confirmed.\n\nTreatment: {cat}\nDate: {date}\nTime: {time}\nMeeting point: {meet}\nClinic: {clinic}\nReference: {ref}\n\nPlease bring your passport or ARC. If you cannot come, please cancel on the booking page or tell HS as early as possible."],
    reminder: ["Reminder: your visit tomorrow · {ref}", "Hello {name},\n\nThis is a reminder of your visit tomorrow.\n\nTreatment: {cat}\nDate: {date}\nTime: {time}\nMeeting point: {meet}\nClinic: {clinic}\nReference: {ref}\n\nPlease come to the meeting point on time and bring your passport or ARC. If you cannot come, please cancel on the booking page or tell HS on WhatsApp."],
    proposed: ["New time for your visit · {ref}", "Hello {name},\n\nThe time you chose is not available at the clinic. HS can offer this time instead:\n\nTreatment: {cat}\nDate: {date}\nTime: {time}\nMeeting point: {meet}\nReference: {ref}\n\nPlease reply to confirm this time, or tell HS which day suits you."],
    cancelled: ["Your booking request was cancelled · {ref}", "Hello {name},\n\nYour booking request {ref} ({cat}, {date}, {time}) has been cancelled.{reason}\n\nYou can choose another day on the booking page or message HS on WhatsApp."],
    reason: "\nReason: ", link: "Check or cancel your booking: "
  },
  ur: {
    received: ["آپ کی بکنگ کی درخواست مل گئی · {ref}", "السلام علیکم {name}،\n\nHS کو آپ کی بکنگ کی درخواست مل گئی ہے۔\n\nعلاج: {cat}\nتاریخ: {date}\nوقت: {time}\nریفرنس: {ref}\n\nیہ ابھی کنفرم نہیں ہے۔ HS کلینک سے چیک کر رہا ہے اور 1 سے 2 دن میں دوبارہ میسج کرے گا۔"],
    confirmed: ["آپ کی بکنگ کنفرم ہو گئی · {ref}", "السلام علیکم {name}،\n\nآپ کی بکنگ کنفرم ہو گئی ہے۔\n\nعلاج: {cat}\nتاریخ: {date}\nوقت: {time}\nملنے کی جگہ: {meet}\nکلینک: {clinic}\nریفرنس: {ref}\n\nاپنا پاسپورٹ یا ARC ساتھ لائیں۔ اگر آپ نہ آ سکیں تو بکنگ پیج پر کینسل کر دیں یا جتنا جلدی ہو سکے HS کو بتا دیں۔"],
    reminder: ["یاد دہانی: کل آپ کی وزٹ ہے · {ref}", "السلام علیکم {name}،\n\nیاد دہانی: کل آپ کی وزٹ ہے۔\n\nعلاج: {cat}\nتاریخ: {date}\nوقت: {time}\nملنے کی جگہ: {meet}\nکلینک: {clinic}\nریفرنس: {ref}\n\nوقت پر ملنے کی جگہ پہنچیں اور اپنا پاسپورٹ یا ARC ساتھ لائیں۔ اگر آپ نہ آ سکیں تو بکنگ پیج پر کینسل کر دیں یا HS کو WhatsApp پر بتا دیں۔"],
    proposed: ["آپ کی بکنگ کے لیے نیا وقت · {ref}", "السلام علیکم {name}،\n\nآپ کا چُنا ہوا وقت کلینک میں دستیاب نہیں ہے۔ HS اس کی جگہ یہ وقت دے سکتا ہے:\n\nعلاج: {cat}\nتاریخ: {date}\nوقت: {time}\nملنے کی جگہ: {meet}\nریفرنس: {ref}\n\nیہ وقت ٹھیک ہے تو جواب میں کنفرم کر دیں، یا بتائیں کہ کون سا دن آپ کے لیے بہتر ہے۔"],
    cancelled: ["آپ کی بکنگ کی درخواست منسوخ ہو گئی · {ref}", "السلام علیکم {name}،\n\nآپ کی بکنگ کی درخواست {ref} ({cat}، {date}، {time}) منسوخ کر دی گئی ہے۔{reason}\n\nآپ بکنگ پیج پر کوئی اور دن چُن سکتے ہیں یا HS کو WhatsApp کر سکتے ہیں۔"],
    reason: "\nوجہ: ", link: "اپنی بکنگ چیک یا کینسل کریں: "
  },
  ko: {
    received: ["예약 요청이 접수되었습니다 · {ref}", "{name}님, 안녕하세요.\n\n예약 요청이 접수되었습니다.\n\n진료: {cat}\n날짜: {date}\n시간: {time}\n접수 번호: {ref}\n\n아직 확정된 예약이 아닙니다. HS가 병원에 확인한 뒤 1~2일 안에 다시 안내해 드립니다."],
    confirmed: ["예약이 확정되었습니다 · {ref}", "{name}님, 안녕하세요.\n\n예약이 확정되었습니다.\n\n진료: {cat}\n날짜: {date}\n시간: {time}\n만나는 곳: {meet}\n병원: {clinic}\n접수 번호: {ref}\n\n여권 또는 외국인등록증을 지참해 주세요. 방문이 어려우시면 예약 페이지에서 취소하시거나 가능한 한 빨리 HS에게 알려 주세요."],
    reminder: ["내일 방문 안내 · {ref}", "{name}님, 안녕하세요.\n\n내일 방문 일정을 안내드립니다.\n\n진료: {cat}\n날짜: {date}\n시간: {time}\n만나는 곳: {meet}\n병원: {clinic}\n접수 번호: {ref}\n\n시간에 맞춰 만나는 곳으로 와 주시고, 여권 또는 외국인등록증을 지참해 주세요. 방문이 어려우시면 예약 페이지에서 취소하시거나 WhatsApp으로 HS에게 알려 주세요."],
    proposed: ["예약 시간 변경 제안 · {ref}", "{name}님, 안녕하세요.\n\n선택하신 시간에는 병원 예약이 어렵습니다. 대신 아래 시간을 제안드립니다.\n\n진료: {cat}\n날짜: {date}\n시간: {time}\n만나는 곳: {meet}\n접수 번호: {ref}\n\n이 시간이 괜찮으시면 답장으로 확정해 주시고, 어려우시면 가능한 날짜를 알려 주세요."],
    cancelled: ["예약 요청이 취소되었습니다 · {ref}", "{name}님, 안녕하세요.\n\n예약 요청 {ref} ({cat}, {date}, {time})이 취소되었습니다.{reason}\n\n예약 페이지에서 다른 날짜를 선택하시거나 WhatsApp으로 HS에게 연락해 주세요."],
    reason: "\n사유: ", link: "예약 확인·취소: "
  }
};
function customerMessage(kind, b, lang, extra) {
  lang = MSG[lang] ? lang : "en"; const m = MSG[lang][kind] || MSG[lang].confirmed, c = CLINICS[b.loc];
  const lr = lang === "ur" ? (x => (x ? "\u2066" + x + "\u2069" : x)) : (x => x);   // keeps "10:00 AM" in order inside Urdu text
  const o = { name: b.name || "", ref: lr(b.ref || ""), cat: catName(b, lang), date: fmtDate(b.date, lang), time: lr(fmtTime(parseHm(b.start), lang)), meet: meetText(c, lang), clinic: lr(clinicName(c, lang)),
    reason: extra && extra.reason ? MSG[lang].reason + extra.reason : "" };
  const link = extra && extra.link && kind !== "cancelled" ? "\n\n" + MSG[lang].link + extra.link : "";
  return { subject: fill(m[0], o), text: fill(m[1], o) + link + SIGN, lang: lang };
}
function clinicSummaryKo(b, today) {
  const c = CLINICS[b.loc], age = ageOn(b.dob, today), needs = needsText(b, "ko");
  const ins = { yes: "있음", no: "없음", unsure: "확인 필요" }[b.ins] || "-";
  const lines = ["[예약 요청] Pakistan Clinic Korea (HS)", "병원: " + (c ? c.ko || c.en : ""), "진료: " + catName(b, "ko") + (needs ? " · " + needs : ""),
    "희망 일시: " + fmtDate(b.date, "ko") + " " + fmtTime(parseHm(b.start), "ko"), "환자명: " + (b.name || ""),
    "생년월일: " + (b.dob || "-") + (age !== "" ? " (만 " + age + "세)" : ""), "성별: " + ({ male: "남성", female: "여성" }[b.gender] || "-"),
    "국적: " + (natName(b, "ko") || "-"), "건강보험: " + ins, "인원: " + (b.people === "3" ? "3명 이상" : (b.people || "1") + "명")];
  if (b.note) lines.push("메모: " + b.note);
  return lines.join("\n");
}
function ownerMessage(b, st, today, warn) {
  const c = CLINICS[b.loc], needs = needsText(b, "en"), age = ageOn(b.dob, today), np = normPhone(b.phone);
  const lines = (warn ? ["WARNING: " + warn, ""] : []).concat(["New booking request", "", "Reference: " + b.ref, "Treatment: " + catName(b, "en") + (needs ? " (" + needs + ")" : ""),
    "Day and time: " + fmtDate(b.date, "en") + ", " + fmtTime(parseHm(b.start), "en"), "Meeting point: " + meetText(c, "en"), "Clinic: " + clinicName(c, "en"), "",
    "Name: " + b.name, "Birth date: " + b.dob + (age !== "" ? " (age " + age + ")" : ""), "Gender: " + b.gender, "Nationality: " + natName(b, "en"), "Health insurance: " + b.ins,
    "Phone: " + b.phone + (np ? "  ·  https://wa.me/" + np : ""), "Confirmation by: " + b.contact + (b.email ? " (" + b.email + ")" : ""), "Found us on: " + b.src, "People: " + (b.people === "3" ? "3 or more" : b.people),
    "Language: " + b.lang]);
  if (b.note) lines.push("Note: " + b.note);
  lines.push("", "This request is waiting for you. The customer has not been told anything yet.");
  if (st.adminUrl) lines.push("Open the admin panel: " + st.adminUrl);
  return { subject: "New booking request " + b.ref + " · " + catName(b, "en") + " · " + fmtDate(b.date, "en") + " " + fmtTime(parseHm(b.start), "en") + (warn ? " · missed before" : ""), text: lines.join("\n") };
}
/* How many earlier visits this phone number missed. */
function noShowCount(list, phone, exceptRef) { const p = normPhone(phone); if (p.length < 8) return 0; let n = 0; (list || []).forEach(b => { if (b.status === "noshow" && b.ref !== exceptRef && normPhone(b.phone) === p) n++; }); return n; }
function missedText(n) { return n ? "This phone number missed " + n + " earlier visit" + (n > 1 ? "s" : "") + "." : ""; }
/* "YYYY-MM-DD HH:mm" to minutes, for comparing times. */
function stampMin(s) { const m = /^(\d{4}-\d{2}-\d{2}) (\d{1,2}:\d{2})$/.exec(String(s || "")); if (!m || !isDate(m[1])) return NaN; return toDate(m[1]).getTime() / 60000 + parseHm(m[2]); }
/* The evening email to HS: tomorrow's visits with one-tap WhatsApp reminders. */
function digestMessage(list, all, tomorrow, toClose, st, today) {
  const ok = list.filter(b => b.status === "confirmed"), open = list.filter(b => b.status !== "confirmed"), H = [], T = [];
  const e = x => String(x == null ? "" : x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const link = st.bookingUrl ? st.bookingUrl.replace(/#.*$/, "") + "#status" : "";
  T.push("Tomorrow's visits · " + fmtDate(tomorrow, "en"), "");
  H.push('<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#17382B"><h2 style="font-size:18px;margin:0 0 12px">Tomorrow\'s visits · ' + e(fmtDate(tomorrow, "en")) + "</h2>");
  if (!ok.length) { T.push("No confirmed visits tomorrow."); H.push("<p>No confirmed visits tomorrow.</p>"); }
  ok.forEach((b, i) => {
    const c = CLINICS[b.loc], miss = noShowCount(all, b.phone, b.ref), np = normPhone(b.phone);
    let rem, remH;
    if (b.contact === "email" && EMAIL.test(b.email || "")) { rem = b.remindedAt ? "Reminder email sent to " + b.email : "Reminder email could not be sent to " + b.email + ". Send it on WhatsApp."; remH = e(rem); }
    else if (np.length >= 8) { const u = waLink(np, customerMessage("reminder", b, b.lang, { link: link }).text); rem = "Send the WhatsApp reminder: " + u; remH = '<a href="' + e(u) + '" style="display:inline-block;background:#14503A;color:#FFFCF3;padding:8px 14px;border-radius:8px;text-decoration:none;font-weight:bold">Send WhatsApp reminder</a>'; }
    else { rem = "No phone number or email. Remind this customer yourself."; remH = e(rem); }
    const head = fmtTime(parseHm(b.start), "en") + " · " + b.name + " · " + catName(b, "en");
    T.push((i + 1) + ") " + head, "   " + meetText(c, "en") + " · " + clinicName(c, "en"), "   Phone: " + (b.phone || "-") + " · Ref: " + b.ref + " · Language: " + b.lang);
    if (miss) T.push("   WARNING: " + missedText(miss));
    T.push("   " + rem, "");
    H.push('<div style="border:1px solid #DCD2B6;border-radius:10px;padding:10px 12px;margin:0 0 10px"><b>' + e(head) + "</b><br>" + e(meetText(c, "en") + " · " + clinicName(c, "en")) + "<br>" + e("Phone: " + (b.phone || "-") + " · Ref: " + b.ref) + (miss ? '<br><b style="color:#B03030">' + e(missedText(miss)) + "</b>" : "") + '<div style="margin-top:8px">' + remH + "</div></div>");
  });
  if (open.length) {
    T.push("Still not confirmed for tomorrow (confirm or cancel today):");
    H.push('<h3 style="font-size:16px;margin:16px 0 6px;color:#B03030">Still not confirmed for tomorrow</h3><p style="margin:0 0 6px">Confirm or cancel these today.</p>');
    open.forEach(b => { const line = fmtTime(parseHm(b.start), "en") + " · " + b.name + " · " + catName(b, "en") + " · " + (b.status === "proposed" ? "waiting for the customer to accept the new time" : "new request") + " · " + b.ref; T.push(" - " + line); H.push("<div>" + e(line) + "</div>"); });
    T.push("");
  }
  if (toClose) { const l = toClose + " past visit" + (toClose > 1 ? "s are" : " is") + " still open. Mark done, no-show or cancelled in the admin panel."; T.push(l); H.push("<p>" + e(l) + "</p>"); }
  if (st.adminUrl) { T.push("", "Admin panel: " + st.adminUrl); H.push('<p><a href="' + e(st.adminUrl) + '">Open the admin panel</a></p>'); }
  H.push("</div>");
  return { subject: "Tomorrow: " + ok.length + " visit" + (ok.length === 1 ? "" : "s") + (open.length ? " + " + open.length + " not confirmed" : "") + " · " + fmtDate(tomorrow, "en"), text: T.join("\n"), html: H.join("") };
}
function textToHtml(t, rtl) { const e = String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/https?:\/\/[^\s<]+/g, u => '<a href="' + u + '">' + u + "</a>").replace(/\n/g, "<br>"); return '<div dir="' + (rtl ? "rtl" : "ltr") + '" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#17382B">' + e + "</div>"; }

/* ---------- input cleaning ---------- */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function str(v, max) { return String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max); }
function clampInt(v, lo, hi, dflt) { const n = parseInt(v, 10); return isNaN(n) ? dflt : Math.min(hi, Math.max(lo, n)); }
function cleanVisit(inp) {
  const cat = catById(str(inp.cat, 20)); if (!cat) return { error: "cat" };
  let loc = str(inp.loc, 20); if (cat.clinics.length === 1) loc = cat.clinics[0]; else if (cat.clinics.indexOf(loc) < 0) return { error: "loc" };
  return { cat: cat, loc: loc, needs: needsIdx({ cat: cat.id, needs: inp.needs }) };
}
function cleanPerson(inp, strict, today) {
  const o = {};
  o.name = str(inp.name, 80); if (o.name.length < 2) return { error: "name" };
  o.dob = str(inp.dob, 10); if (strict || o.dob) { if (!isDate(o.dob) || o.dob < "1900-01-01" || (today && o.dob > today)) return { error: "dob" }; }
  o.gender = str(inp.gender, 10); if (strict || o.gender) { if (o.gender !== "male" && o.gender !== "female") return { error: "gender" }; }
  o.nat = str(inp.nat, 10); o.natOther = str(inp.natOther, 40);
  if (strict || o.nat) { if (!NAT.some(n => n[0] === o.nat)) return { error: "nat" }; if (o.nat === "other" && !o.natOther) return { error: "nat" }; }
  if (o.nat !== "other") o.natOther = "";
  o.ins = str(inp.ins, 10); if (strict || o.ins) { if (["yes", "no", "unsure"].indexOf(o.ins) < 0) return { error: "ins" }; }
  o.phone = str(inp.phone, 30); const digits = o.phone.replace(/\D/g, ""); if (strict || o.phone) { if (digits.length < 8 || digits.length > 15) return { error: "phone" }; }
  o.contact = inp.contact === "email" ? "email" : "whatsapp";
  o.email = str(inp.email, 120); if (o.contact === "email" || o.email) { if (!EMAIL.test(o.email)) return { error: "email" }; }
  o.src = str(inp.src, 12); if (strict || o.src) { if (SRC.indexOf(o.src) < 0) return { error: "src" }; }
  o.people = ["1", "2", "3"].indexOf(String(inp.people)) >= 0 ? String(inp.people) : "1";
  o.note = str(inp.note, 600);
  o.lang = ["en", "ur", "ko"].indexOf(inp.lang) >= 0 ? inp.lang : "en";
  return { o: o };
}

/* One check for a whole booking. c = {today, minDate, maxDate, closed}. admin = true relaxes the customer rules. */
function cleanBooking(inp, c, admin) {
  inp = inp || {};
  const v = cleanVisit(inp); if (v.error) return { error: v.error };
  const p = cleanPerson(inp, !admin, c.today); if (p.error) return { error: p.error };
  const date = str(inp.date, 10), t = (inp.time !== undefined && inp.time !== null && inp.time !== "") ? Number(inp.time) : parseHm(inp.start);
  if (!isDate(date) || isNaN(t)) return { error: "time" };
  if (admin) { if (t < 0 || t >= 1440) return { error: "time" }; }
  else { if (dayBase(date, c) !== "ok") return { error: "time" }; const h = hoursFor(date, CLINICS[v.loc]); if (!Number.isInteger(t) || t < h.start || t > h.last || (t - h.start) % CFG.step !== 0) return { error: "time" }; }
  return { visit: v, person: p.o, date: date, t: t };
}

/* ---------- the engine: every action of the system ----------
   env = { store, today(), stamp(), now(), uuid(), sha256(s), hmac(s,key), mail({to,subject,text,html,replyTo}), lock(fn) } */
function createEngine(env) {
  const S = env.store;
  const fail = e => ({ ok: false, error: e });
  function settings() { const s = S.getSettings() || {}; return { minNoticeDays: clampInt(s.minNoticeDays, 0, 14, CFG.minNoticeDays), maxMonths: clampInt(s.maxMonths, 1, 6, CFG.maxMonths), notifyEmail: str(s.notifyEmail, 120), adminUrl: str(s.adminUrl, 300), bookingUrl: str(s.bookingUrl, 300) }; }
  function context() { const st = settings(), today = env.today(), closed = []; S.getHolidays().forEach(h => { if (!h.open && isDate(h.date)) closed.push(h.date); }); return { today: today, st: st, minDate: addDays(today, st.minNoticeDays), maxDate: addMonths(today, st.maxMonths), closed: closed }; }
  function busyList(fromDate, exceptRef) {
    const out = [];
    S.getBookings().forEach(b => { if (!HOLD[b.status] || b.ref === exceptRef || !isDate(b.date) || b.date < fromDate) return; const s = parseHm(b.start); if (isNaN(s)) return; out.push({ d: b.date, s: s, m: clampInt(b.dur, 30, 1440, CFG.block) }); });
    S.getBlocks().forEach(k => { if (!isDate(k.date) || k.date < fromDate) return; const s = parseHm(k.start), e = parseHm(k.end); if (isNaN(s) || isNaN(e) || e <= s) return; out.push({ d: k.date, s: s, m: e - s }); });
    return out;
  }
  function availability() { const c = context(); return { ok: true, today: c.today, minNoticeDays: c.st.minNoticeDays, maxMonths: c.st.maxMonths, busy: busyList(c.today), closed: c.closed }; }
  function newRef(date, all) { const A = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; for (let n = 0; n < 50; n++) { let s = ""; for (let i = 0; i < 3; i++) s += A[Math.floor(Math.random() * A.length)]; const ref = "PCK-" + date.slice(5, 7) + date.slice(8, 10) + "-" + s; if (!all.some(b => b.ref === ref)) return ref; } return "PCK-" + date.slice(5, 7) + date.slice(8, 10) + "-" + String(env.now()).slice(-5); }
  function sendMail(m, ref) { try { env.mail(m); return true; } catch (e) { try { S.log("mail-error", ref || "", String(e)); } catch (x) {} return false; } }
  function statusLink(st) { return st.bookingUrl ? st.bookingUrl.replace(/#.*$/, "") + "#status" : ""; }
  function mailCustomer(kind, b, extra) { if (b.contact !== "email" || !EMAIL.test(b.email || "")) return false; const st = settings(), m = customerMessage(kind, b, b.lang, Object.assign({ link: statusLink(st) }, extra || {})); return sendMail({ to: b.email, subject: m.subject, text: m.text, html: textToHtml(m.text, m.lang === "ur"), replyTo: st.notifyEmail || undefined }, b.ref); }

  function book(inp) {
    inp = inp || {};
    if (inp.website) return { ok: true, ref: "PCK-0000-000" };          // hidden field: only bots fill it
    if (inp.consent !== true) return fail("consent");
    const c = context(), k = cleanBooking(inp, c, false); if (k.error) return fail(k.error);
    const v = k.visit, p = { o: k.person }, date = k.date, t = k.t;
    const all = S.getBookings(), clientId = str(inp.clientId, 64);
    if (clientId) { const dup = all.filter(b => b.clientId === clientId)[0]; if (dup) return { ok: true, ref: dup.ref, dup: true }; }
    if (clash(busyList(c.today), date, t, CFG.block)) return { ok: false, error: "taken", avail: availability() };
    const np = normPhone(p.o.phone);
    if (all.filter(b => (b.status === "pending" || b.status === "proposed" || b.status === "confirmed") && b.date >= c.today && normPhone(b.phone) === np).length >= CFG.maxActivePerPhone) return fail("limit");
    if (all.filter(b => b.origin === "web" && String(b.createdAt).slice(0, 10) === c.today).length >= CFG.maxWebPerDay) return fail("busy");
    const stamp = env.stamp();
    const b = Object.assign({ ref: newRef(date, all), createdAt: stamp, status: "pending", date: date, start: hm(t), dur: String(CFG.block), cat: v.cat.id, loc: v.loc, needs: v.needs.join(","), adminNote: "", updatedAt: stamp, origin: "web", clientId: clientId }, p.o);
    S.addBooking(b); S.log("book", b.ref, b.date + " " + b.start + " " + b.cat);
    const miss = noShowCount(all, b.phone, b.ref);
    if (c.st.notifyEmail) { const m = ownerMessage(b, c.st, c.today, missedText(miss)); sendMail({ to: c.st.notifyEmail, subject: m.subject, text: m.text, html: textToHtml(m.text, false) }, b.ref); }
    return { ok: true, ref: b.ref };
  }
  /* A customer proves it is their booking with the reference number and the last 4 digits of their phone. */
  function lookup(r) {
    const ref = str(r.ref, 20).toUpperCase().replace(/\s+/g, ""), digits = String(r.phone == null ? "" : r.phone).replace(/\D/g, "");
    if (!ref || digits.length < 4) return null;
    const b = S.getBookings().filter(x => String(x.ref).toUpperCase() === ref)[0]; if (!b) return null;
    const own = String(b.phone).replace(/\D/g, ""); if (own.length < 4 || own.slice(-4) !== digits.slice(-4)) return null;
    return b;
  }
  const LIVE = { pending: 1, proposed: 1, confirmed: 1 };
  function canCancel(b) { return !!LIVE[b.status] && (b.date + " " + b.start) > env.stamp(); }
  function publicView(b) { return { ok: true, ref: b.ref, status: b.status, date: b.date, start: b.start, cat: b.cat, loc: b.loc, canCancel: canCancel(b) }; }
  function status(r) { const b = lookup(r); return b ? publicView(b) : fail("notfound"); }
  function customerCancel(r) {
    const b = lookup(r); if (!b) return fail("notfound");
    if (b.status === "cancelled" && b.cancelledBy === "customer") return Object.assign(publicView(b), { already: true });   // repeated tap or retry
    if (!LIVE[b.status]) return fail("closed");
    const now = env.stamp(), visit = b.date + " " + b.start;
    if (visit <= now) return fail("toolate");
    const left = stampMin(visit) - stampMin(now), late = !(left >= 24 * 60);
    const nb = Object.assign({}, b, { status: "cancelled", cancelledAt: now, cancelledBy: "customer", updatedAt: now });
    S.updateBooking(b.ref, nb); S.log("customer-cancel", b.ref, (late ? "late, " : "") + b.date + " " + b.start);
    const st = settings();
    if (st.notifyEmail) {
      const c = CLINICS[b.loc], lines = [(late ? "Late cancel: less than 24 hours before the visit." : "A customer cancelled online."), "", "Reference: " + b.ref, "Treatment: " + catName(b, "en"),
        "Day and time: " + fmtDate(b.date, "en") + ", " + fmtTime(parseHm(b.start), "en"), "Meeting point: " + meetText(c, "en"), "Clinic: " + clinicName(c, "en"), "Name: " + b.name, "Phone: " + b.phone,
        "Status before: " + b.status, "", "The time is free again on the booking page." + (b.status === "confirmed" ? " If you already told the clinic, let them know." : "")];
      if (st.adminUrl) lines.push("Admin panel: " + st.adminUrl);
      sendMail({ to: st.notifyEmail, subject: (late ? "Late cancel " : "Cancelled by customer ") + b.ref + " · " + catName(b, "en") + " · " + fmtDate(b.date, "en") + " " + fmtTime(parseHm(b.start), "en"), text: lines.join("\n"), html: textToHtml(lines.join("\n"), false) }, b.ref);
    }
    return Object.assign(publicView(nb), { late: late });
  }
  /* Runs every evening: reminder emails for tomorrow, and the summary email to HS. */
  function daily() {
    const c = context(), tomorrow = addDays(c.today, 1), all = S.getBookings(), stamp = env.stamp();
    const list = all.filter(b => b.date === tomorrow && LIVE[b.status]).sort((x, y) => (x.start < y.start ? -1 : x.start > y.start ? 1 : 0));
    let emailed = 0;
    list.forEach(b => {
      if (b.status !== "confirmed" || b.remindedAt || b.contact !== "email" || !EMAIL.test(b.email || "")) return;
      if (mailCustomer("reminder", b)) { b.remindedAt = stamp; S.updateBooking(b.ref, Object.assign({}, b)); S.log("reminder", b.ref, "email"); emailed++; }
    });
    const toClose = all.filter(b => b.date < c.today && LIVE[b.status]).length;
    let digest = false;
    if ((list.length || toClose) && c.st.notifyEmail) { const m = digestMessage(list, all, tomorrow, toClose, c.st, c.today); digest = sendMail({ to: c.st.notifyEmail, subject: m.subject, text: m.text, html: m.html }, ""); }
    S.log("daily", "", tomorrow + ": " + list.length + " visits, " + emailed + " reminder emails, digest " + (digest ? "sent" : "not sent"));
    return { ok: true, date: tomorrow, visits: list.length, emailed: emailed, digest: digest, toClose: toClose };
  }

  /* --- admin --- */
  function pwHash(pw, salt) { let h = env.sha256(salt + ":" + pw); for (let i = 0; i < 300; i++) h = env.sha256(h + salt); return h; }
  function newToken() { const exp = env.now() + 12 * 3600 * 1000; return exp + "." + env.hmac(String(exp), S.getProp("TOKEN_SECRET")); }
  function authed(tok) { const m = /^(\d+)\.([0-9a-f]+)$/.exec(String(tok || "")); if (!m || Number(m[1]) < env.now()) return false; const sec = S.getProp("TOKEN_SECRET"); return !!sec && env.hmac(m[1], sec) === m[2]; }
  function adminSetPassword(r) {
    const code = S.getProp("SETUP_CODE"); if (!code || str(r.code, 20) !== code) return fail("badcode");
    const pw = String(r.password == null ? "" : r.password); if (pw.length < 8) return fail("weak");
    const salt = env.uuid(); S.setProp("ADMIN_SALT", salt); S.setProp("ADMIN_HASH", pwHash(pw, salt)); S.setProp("TOKEN_SECRET", env.uuid() + env.uuid()); S.setProp("SETUP_CODE", ""); S.setProp("FAILS", "0"); S.setProp("LOCK_UNTIL", "0");
    S.log("admin", "", "password set"); return { ok: true, token: newToken() };
  }
  function adminLogin(r) {
    const now = env.now(); if (Number(S.getProp("LOCK_UNTIL") || 0) > now) return fail("locked");
    const hash = S.getProp("ADMIN_HASH"); if (!hash) return fail("nopass");
    if (pwHash(String(r.password == null ? "" : r.password), S.getProp("ADMIN_SALT")) !== hash) { const n = Number(S.getProp("FAILS") || 0) + 1; if (n >= 5) { S.setProp("LOCK_UNTIL", String(now + 15 * 60000)); S.setProp("FAILS", "0"); S.log("admin", "", "locked after 5 wrong passwords"); } else S.setProp("FAILS", String(n)); return fail("badpass"); }
    S.setProp("FAILS", "0"); return { ok: true, token: newToken() };
  }
  function adminData() { const c = context(), d = { today: c.today, settings: c.st, bookings: S.getBookings(), blocks: S.getBlocks(), holidays: S.getHolidays() }; if (env.mailLeft) { try { d.mailLeft = env.mailLeft(); } catch (e) {} } return d; }
  function adminAct(r) {
    const b = S.getBookings().filter(x => x.ref === r.ref)[0]; if (!b) return fail("notfound");
    const act = String(r.act || ""), nb = Object.assign({}, b, { updatedAt: env.stamp() }); let emailed = false;
    if (act === "delete") { S.deleteBooking(b.ref); S.log("delete", b.ref, b.name); return { ok: true, deleted: true, data: adminData() }; }
    if (act === "note") nb.adminNote = str(r.note, 1000);
    else if (act === "confirm" || act === "reopen") { if (b.status === "cancelled" && !r.force && clash(busyList("0000-00-00", b.ref), b.date, parseHm(b.start), clampInt(b.dur, 30, 1440, CFG.block))) return fail("conflict"); nb.status = act === "confirm" ? "confirmed" : "pending"; if (b.status === "cancelled") { nb.cancelledAt = ""; nb.cancelledBy = ""; } }
    else if (act === "propose" || act === "reschedule") { const date = str(r.date, 10), t = parseHm(r.start), dur = clampInt(r.dur, 30, 1440, clampInt(b.dur, 30, 1440, CFG.block)); if (!isDate(date) || isNaN(t) || t < 0 || t >= 1440) return fail("time"); if (!r.force && clash(busyList("0000-00-00", b.ref), date, t, dur)) return fail("conflict"); if (date !== b.date || hm(t) !== b.start) nb.remindedAt = ""; nb.date = date; nb.start = hm(t); nb.dur = String(dur); nb.status = act === "propose" ? "proposed" : "confirmed"; }
    else if (act === "cancel") { nb.status = "cancelled"; nb.cancelledAt = nb.updatedAt; nb.cancelledBy = "hs"; }
    else if (act === "done" || act === "noshow") nb.status = act;
    else return fail("invalid");
    S.updateBooking(b.ref, nb); S.log(act, b.ref, nb.date + " " + nb.start + " " + nb.status);
    if (r.notify && (act === "confirm" || act === "reschedule" || act === "propose" || act === "cancel")) emailed = mailCustomer(act === "propose" ? "proposed" : act === "cancel" ? "cancelled" : "confirmed", nb, { reason: str(r.reason, 300) });
    return { ok: true, emailed: emailed, data: adminData() };
  }
  function adminAdd(r) {
    const inp = r.booking || {}, c = context();
    const v = cleanVisit(inp); if (v.error) return fail(v.error);
    const p = cleanPerson(inp, false, c.today); if (p.error) return fail(p.error);
    const date = str(inp.date, 10), t = parseHm(inp.start), dur = clampInt(inp.dur, 30, 1440, CFG.block);
    if (!isDate(date) || isNaN(t) || t < 0 || t >= 1440) return fail("time");
    if (!r.force && clash(busyList("0000-00-00"), date, t, dur)) return fail("conflict");
    const stamp = env.stamp(), all = S.getBookings();
    const b = Object.assign({ ref: newRef(date, all), createdAt: stamp, status: inp.status === "pending" ? "pending" : "confirmed", date: date, start: hm(t), dur: String(dur), cat: v.cat.id, loc: v.loc, needs: v.needs.join(","), adminNote: str(inp.adminNote, 1000), updatedAt: stamp, origin: "manual", clientId: "" }, p.o);
    S.addBooking(b); S.log("add", b.ref, b.date + " " + b.start); return { ok: true, ref: b.ref, data: adminData() };
  }
  function adminBlock(r) { const date = str(r.date, 10), s = r.allDay ? 0 : parseHm(r.start), e = r.allDay ? 1440 : parseHm(r.end); if (!isDate(date) || isNaN(s) || isNaN(e) || e <= s || e > 1440) return fail("time"); const k = { id: "B" + String(env.uuid()).replace(/-/g, "").slice(0, 10), date: date, start: hm(s), end: hm(e), note: str(r.note, 200), createdAt: env.stamp() }; S.addBlock(k); S.log("block", k.id, date + " " + k.start + "-" + k.end); return { ok: true, data: adminData() }; }
  function adminUnblock(r) { S.deleteBlock(str(r.id, 40)); S.log("unblock", str(r.id, 40), ""); return { ok: true, data: adminData() }; }
  function adminHoliday(r) { const date = str(r.date, 10); if (!isDate(date)) return fail("time"); S.setHoliday(date, !!r.open, str(r.name, 60) || "Holiday"); S.log("holiday", date, r.open ? "open" : "closed"); return { ok: true, data: adminData() }; }
  function adminSettings(r) {
    if (r.minNoticeDays !== undefined) S.setSetting("minNoticeDays", String(clampInt(r.minNoticeDays, 0, 14, CFG.minNoticeDays)));
    if (r.maxMonths !== undefined) S.setSetting("maxMonths", String(clampInt(r.maxMonths, 1, 6, CFG.maxMonths)));
    if (r.notifyEmail !== undefined) { const e = str(r.notifyEmail, 120); if (e && !EMAIL.test(e)) return fail("email"); S.setSetting("notifyEmail", e); }
    if (r.adminUrl !== undefined) S.setSetting("adminUrl", str(r.adminUrl, 300));
    if (r.bookingUrl !== undefined) S.setSetting("bookingUrl", str(r.bookingUrl, 300));
    S.log("settings", "", "changed"); return { ok: true, data: adminData() };
  }

  function handle(req) {
    req = req || {}; const a = String(req.action || "");
    try {
      if (a === "availability") return availability();
      if (a === "book") return env.lock(() => book(req.booking));
      if (a === "status") return status(req);
      if (a === "cancel") return env.lock(() => customerCancel(req));
      if (a === "admin.state") return { ok: true, hasPassword: !!S.getProp("ADMIN_HASH") };
      if (a === "admin.setPassword") return env.lock(() => adminSetPassword(req));
      if (a === "admin.login") return env.lock(() => adminLogin(req));
      if (a.indexOf("admin.") === 0) {
        if (!authed(req.token)) return fail("auth");
        if (a === "admin.data") return { ok: true, data: adminData() };
        if (a === "admin.act") return env.lock(() => adminAct(req));
        if (a === "admin.add") return env.lock(() => adminAdd(req));
        if (a === "admin.block") return env.lock(() => adminBlock(req));
        if (a === "admin.unblock") return env.lock(() => adminUnblock(req));
        if (a === "admin.holiday") return env.lock(() => adminHoliday(req));
        if (a === "admin.settings") return env.lock(() => adminSettings(req));
      }
      return fail("invalid");
    } catch (e) { try { S.log("error", a, String((e && e.stack) || e)); } catch (x) {} return fail("server"); }
  }
  return { handle: handle, daily: () => env.lock(daily) };
}

/* ---------- in-memory store: used by the preview (demo mode) and by the tests ---------- */
function memoryStore(init) {
  const d = Object.assign({ bookings: [], blocks: [], holidays: HOLIDAYS.map(h => ({ date: h[0], name: h[1], open: false })), settings: {}, props: {}, logs: [] }, init || {});
  return {
    getBookings: () => d.bookings.map(b => Object.assign({}, b)),
    addBooking: b => { d.bookings.push(Object.assign({}, b)); },
    updateBooking: (ref, b) => { const i = d.bookings.findIndex(x => x.ref === ref); if (i >= 0) d.bookings[i] = Object.assign({}, b); },
    deleteBooking: ref => { d.bookings = d.bookings.filter(x => x.ref !== ref); },
    getBlocks: () => d.blocks.map(k => Object.assign({}, k)),
    addBlock: k => { d.blocks.push(Object.assign({}, k)); },
    deleteBlock: id => { d.blocks = d.blocks.filter(x => x.id !== id); },
    getHolidays: () => d.holidays.map(h => Object.assign({}, h)),
    setHoliday: (date, open, name) => { const h = d.holidays.filter(x => x.date === date)[0]; if (h) h.open = !!open; else d.holidays.push({ date: date, name: name || "Holiday", open: !!open }); },
    getSettings: () => Object.assign({}, d.settings),
    setSetting: (k, v) => { d.settings[k] = v; },
    getProp: k => d.props[k] || "",
    setProp: (k, v) => { d.props[k] = v; },
    log: (a, r, t) => { d.logs.push([a, r, t]); },
    _data: d
  };
}
function demoEnv() {
  const weak = s => { let a = 2166136261, b = 5381; for (let i = 0; i < s.length; i++) { a = Math.imul(a ^ s.charCodeAt(i), 16777619) >>> 0; b = (Math.imul(b, 33) + s.charCodeAt(i)) >>> 0; } return ("0000000" + a.toString(16)).slice(-8) + ("0000000" + b.toString(16)).slice(-8); };
  const st = memoryStore(), today = seoulToday(), outbox = [];
  const env = { store: st, outbox: outbox, today: () => seoulToday(), stamp: () => { const p = seoulParts(); return p.date + " " + p.time; }, now: () => Date.now(), uuid: () => "d" + Math.random().toString(36).slice(2) + Date.now().toString(36), sha256: weak, hmac: (s, k) => weak(k + "|" + s), mail: m => { outbox.push(m); }, lock: fn => fn() };
  /* sample data so the preview has something to show */
  const open = []; let d = addDays(today, CFG.minNoticeDays);
  while (open.length < 4) { if (CFG.off.indexOf(dow(d)) < 0 && !HOLIDAYS.some(h => h[0] === d)) open.push(d); d = addDays(d, 1); }
  const mk = (ref, status, date, start, cat, loc, name, o) => Object.assign({ ref: ref, createdAt: today + " 09:00", status: status, date: date, start: start, dur: "120", cat: cat, loc: loc, needs: "", name: name, dob: "1994-03-05", gender: "male", nat: "PK", natOther: "", ins: "unsure", phone: "010-2000-" + (1000 + Number(ref.slice(-2).replace(/\D/g, "") || 0)), contact: "whatsapp", email: "", src: "tiktok", people: "1", note: "", lang: "ur", adminNote: "", updatedAt: today + " 09:00", origin: "web", clientId: "" }, o || {});
  const sat = ds => dow(ds) === 6;
  st.addBooking(mk("PCK-DEMO-A01", "pending", open[0], "10:00", "eye", "eye", "Sample Patient One", { needs: "1", ins: "yes", note: "Sample note: wants to ask about LASIK price." }));
  st.addBooking(mk("PCK-DEMO-B02", "confirmed", open[1], "11:30", "dental", "make", "Sample Patient Two", { gender: "female", lang: "en", contact: "email", email: "sample@example.com", src: "facebook", needs: "1,2" }));
  if (!sat(open[1])) st.addBooking(mk("PCK-DEMO-C03", "pending", open[1], "15:00", "hair", "monara", "Sample Patient Three", { src: "instagram", people: "2" }));
  ["09:30", "11:30", "13:30", "15:30", "17:30"].forEach((t, i) => { if (sat(open[2]) && parseHm(t) > CFG.sat.last) return; st.addBooking(mk("PCK-DEMO-D0" + (i + 4), "confirmed", open[2], t, ["skin", "uro", "nose", "laser", "checkup"][i], ["daum", "uro", "vibe", "barog", "oakwood"][i], "Sample Patient " + ["Four", "Five", "Six", "Seven", "Eight"][i], { lang: i % 2 ? "en" : "ur" })); });
  st.addBooking(mk("PCK-DEMO-E09", "proposed", open[3], "14:00", "women", "choisang", "Sample Patient Nine", { gender: "female", lang: "en" }));
  st.addBooking(mk("PCK-DEMO-F10", "done", addDays(today, -3), "10:00", "eye", "eye", "Sample Patient Ten"));
  st.addBooking(mk("PCK-DEMO-G11", "cancelled", addDays(today, -1), "13:00", "dental", "make", "Sample Patient Eleven", { cancelledBy: "customer", cancelledAt: addDays(today, -2) + " 20:10" }));
  st.addBooking(mk("PCK-DEMO-H12", "confirmed", addDays(today, 1), "11:00", "eye", "eye", "Sample Patient Twelve", { lang: "ur" }));
  st.addBooking(mk("PCK-DEMO-J13", "confirmed", addDays(today, 1), "14:00", "dental", "make", "Sample Patient Thirteen", { lang: "en", contact: "email", email: "sample13@example.com" }));
  st.addBooking(mk("PCK-DEMO-K14", "noshow", addDays(today, -6), "14:00", "eye", "eye", "Sample Patient One", { phone: "010-2000-1001" }));
  st.setSetting("notifyEmail", "owner@example.com");
  const salt = "demo"; st.setProp("ADMIN_SALT", salt); st.setProp("TOKEN_SECRET", "demo-secret");
  let h = weak(salt + ":demo"); for (let i = 0; i < 300; i++) h = weak(h + salt); st.setProp("ADMIN_HASH", h);
  return env;
}

return { VERSION: VERSION, WA: WA, WA_SHOW: WA_SHOW, CFG: CFG, HOLIDAYS: HOLIDAYS, STN: STN, CLINICS: CLINICS, CATS: CATS, NAT: NAT, SRC: SRC, MON: MON, DOW: DOW,
  toDate: toDate, iso: iso, isDate: isDate, addDays: addDays, addMonths: addMonths, dow: dow, hm: hm, parseHm: parseHm, seoulToday: seoulToday, seoulParts: seoulParts, ageOn: ageOn,
  hoursFor: hoursFor, clash: clash, slotsFor: slotsFor, dayBase: dayBase, dayState: dayState,
  fmtTime: fmtTime, fmtDate: fmtDate, monthTitle: monthTitle, L: L, catById: catById, clinicName: clinicName, stText: stText, stSub: stSub, meetText: meetText, natName: natName, needsIdx: needsIdx, needsText: needsText, catName: catName, normPhone: normPhone, fill: fill, esc: esc, noShowCount: noShowCount, stampMin: stampMin, digestMessage: digestMessage, waLink: waLink, cat: catById, clinicFor: clinicFor, STATUSES: STATUSES, HOLD: HOLD, detailLines: detailLines, cleanBooking: cleanBooking,
  customerMessage: customerMessage, clinicSummaryKo: clinicSummaryKo, ownerMessage: ownerMessage, textToHtml: textToHtml, cleanVisit: cleanVisit, cleanPerson: cleanPerson,
  createEngine: createEngine, memoryStore: memoryStore, demoEnv: demoEnv };
})();
if (typeof module !== "undefined" && module.exports) module.exports = PCK;
