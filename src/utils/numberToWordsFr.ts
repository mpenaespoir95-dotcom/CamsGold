/**
 * Conversion d'un montant numérique en toutes lettres en français
 * Adapté pour les bordereaux bancaires et documents financiers officiels
 */
export function numberToWordsFr(amount: number): string {
  const n = Math.floor(Math.abs(amount));
  if (n === 0) return 'Zéro';

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

  function convertBelow100(val: number): string {
    if (val < 10) return units[val];
    if (val >= 10 && val < 20) return teens[val - 10];
    
    const ten = Math.floor(val / 10);
    const unit = val % 10;

    if (ten === 7) {
      if (unit === 1) return 'soixante-et-onze';
      return `soixante-${teens[unit]}`;
    }
    if (ten === 9) {
      return `quatre-vingt-${teens[unit]}`;
    }
    if (ten === 8 && unit === 0) {
      return 'quatre-vingts';
    }

    if (unit === 0) return tens[ten];
    if (unit === 1 && ten !== 8) return `${tens[ten]}-et-un`;
    return `${tens[ten]}-${units[unit]}`;
  }

  function convertBelow1000(val: number): string {
    if (val === 0) return '';
    const hundred = Math.floor(val / 100);
    const rest = val % 100;

    let res = '';
    if (hundred === 1) {
      res = 'cent';
    } else if (hundred > 1) {
      res = `${units[hundred]} cent${rest === 0 ? 's' : ''}`;
    }

    if (rest > 0) {
      res = res ? `${res} ${convertBelow100(rest)}` : convertBelow100(rest);
    }
    return res;
  }

  if (n < 1000) {
    const s = convertBelow1000(n);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  const billions = Math.floor(n / 1000000000);
  const millions = Math.floor((n % 1000000000) / 1000000);
  const thousands = Math.floor((n % 1000000) / 1000);
  const remainder = n % 1000;

  const parts: string[] = [];

  if (billions > 0) {
    if (billions === 1) {
      parts.push('un milliard');
    } else {
      parts.push(`${convertBelow1000(billions)} milliards`);
    }
  }

  if (millions > 0) {
    if (millions === 1) {
      parts.push('un million');
    } else {
      parts.push(`${convertBelow1000(millions)} millions`);
    }
  }

  if (thousands > 0) {
    if (thousands === 1) {
      parts.push('mille');
    } else {
      parts.push(`${convertBelow1000(thousands)} mille`);
    }
  }

  if (remainder > 0) {
    parts.push(convertBelow1000(remainder));
  }

  const full = parts.join(' ').trim();
  return full.charAt(0).toUpperCase() + full.slice(1);
}
