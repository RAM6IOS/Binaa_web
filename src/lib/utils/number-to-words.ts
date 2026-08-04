// ═══════════════════════════════════════════════════════════════════
// تحويل الأرقام إلى حروف بالعربية والفرنسية (للمبلغ بالحروف في الوضعية الرسمية)
// ═══════════════════════════════════════════════════════════════════

export function numberToWords(amount: number, lang: 'ar' | 'fr' = 'fr'): string {
  if (isNaN(amount) || amount === 0) {
    return lang === 'ar' ? 'صفر دينار جزائري' : 'Zero dinars algériens';
  }

  const integerPart = Math.floor(amount);
  const centimes = Math.round((amount - integerPart) * 100);

  if (lang === 'fr') {
    const frText = convertIntegerToFrench(integerPart);
    let result = `${frText} dinars algériens`;
    if (centimes > 0) {
      result += ` et ${centimes} centimes`;
    }
    return capitalizeFirst(result);
  } else {
    const arText = convertIntegerToArabic(integerPart);
    let result = `${arText} دينار جزائري`;
    if (centimes > 0) {
      result += ` و ${centimes} سنتيم`;
    }
    return result;
  }
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Simple French number converter for financial documents
function convertIntegerToFrench(n: number): string {
  if (n === 0) return 'zéro';
  if (n < 0) return 'moins ' + convertIntegerToFrench(-n);

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingts', 'quatre-vingt-dix'];

  if (n < 20) return units[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (t === 7 || t === 9) {
      return tens[t - 1] + (u === 1 && t === 7 ? ' et ' : '-') + units[10 + u];
    }
    if (u === 0) {
      return t === 8 ? 'quatre-vingts' : tens[t];
    }
    return tens[t] + (u === 1 && t !== 8 ? ' et ' : '-') + units[u];
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    const hStr = h === 1 ? 'cent' : units[h] + ' cents';
    if (r === 0) return hStr;
    return hStr + ' ' + convertIntegerToFrench(r);
  }
  if (n < 1000000) {
    const th = Math.floor(n / 1000);
    const r = n % 1000;
    const thStr = th === 1 ? 'mille' : convertIntegerToFrench(th) + ' mille';
    if (r === 0) return thStr;
    return thStr + ' ' + convertIntegerToFrench(r);
  }
  if (n < 1000000000) {
    const m = Math.floor(n / 1000000);
    const r = n % 1000000;
    const mStr = m === 1 ? 'un million' : convertIntegerToFrench(m) + ' millions';
    if (r === 0) return mStr;
    return mStr + ' ' + convertIntegerToFrench(r);
  }
  const b = Math.floor(n / 1000000000);
  const r = n % 1000000000;
  const bStr = b === 1 ? 'un milliard' : convertIntegerToFrench(b) + ' milliards';
  if (r === 0) return bStr;
  return bStr + ' ' + convertIntegerToFrench(r);
}

// Simple Arabic number converter for financial documents
function convertIntegerToArabic(n: number): string {
  if (n === 0) return 'صفر';
  if (n < 0) return 'ناقص ' + convertIntegerToArabic(-n);

  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tensArr = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];

  if (n < 20) return ones[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (u === 0) return tensArr[t];
    return ones[u] + ' و' + tensArr[t];
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    let hStr = '';
    if (h === 1) hStr = 'مائة';
    else if (h === 2) hStr = 'مائتان';
    else hStr = ones[h] + ' مائة';
    if (r === 0) return hStr;
    return hStr + ' و' + convertIntegerToArabic(r);
  }
  if (n < 1000000) {
    const th = Math.floor(n / 1000);
    const r = n % 1000;
    let thStr = '';
    if (th === 1) thStr = 'ألف';
    else if (th === 2) thStr = 'ألفان';
    else if (th >= 3 && th <= 10) thStr = ones[th] + ' آلاف';
    else thStr = convertIntegerToArabic(th) + ' ألفاً';
    if (r === 0) return thStr;
    return thStr + ' و' + convertIntegerToArabic(r);
  }
  if (n < 1000000000) {
    const m = Math.floor(n / 1000000);
    const r = n % 1000000;
    let mStr = '';
    if (m === 1) mStr = 'مليون';
    else if (m === 2) mStr = 'مليونان';
    else if (m >= 3 && m <= 10) mStr = ones[m] + ' ملايين';
    else mStr = convertIntegerToArabic(m) + ' مليوناً';
    if (r === 0) return mStr;
    return mStr + ' و' + convertIntegerToArabic(r);
  }
  const b = Math.floor(n / 1000000000);
  const r = n % 1000000000;
  let bStr = '';
  if (b === 1) bStr = 'مليار';
  else if (b === 2) bStr = 'ملياران';
  else bStr = convertIntegerToArabic(b) + ' ملياراً';
  if (r === 0) return bStr;
  return bStr + ' و' + convertIntegerToArabic(r);
}
