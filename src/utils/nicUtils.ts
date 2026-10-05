/**
 * Sri Lankan National Identity Card (NIC) & Age Calculator Utility
 * Supports both:
 * 1. Old format: 9 digits followed by 'V' or 'X' (e.g. 521451234V)
 * 2. New format: 12 digits (e.g. 195214501234 or 197514201980)
 * 3. Fallback to DOB string (YYYY-MM-DD) for tokens/custom IDs
 */

export interface ParsedNICResult {
  isValid: boolean;
  nic: string;
  format: '9-digit' | '12-digit' | 'custom-or-token';
  birthYear?: number;
  birthDate?: string; // YYYY-MM-DD
  dayOfYear?: number;
  gender?: 'Male' | 'Female';
  age?: number;
  isElderly?: boolean; // Age >= 60
  isElderlyAllowanceEligible?: boolean; // Age >= 70 (Sri Lanka Senior Citizen Welfare threshold)
  elderlyTier?: '70+ Eligible' | '60-69 Senior' | 'Under 60';
  rawError?: string;
}

export function parseSriLankanNIC(nicInput: string, fallbackDOB?: string): ParsedNICResult {
  const currentYear = 2026; // Current operating year
  const clean = (nicInput || '').trim().toUpperCase();

  if (!clean && fallbackDOB) {
    return parseFromDOB(fallbackDOB, clean);
  }

  // Check 9-digit old format: e.g. 521451234V
  const oldRegex = /^([0-9]{2})([0-9]{3})([0-9]{4})([VX])$/;
  const oldMatch = clean.match(oldRegex);

  if (oldMatch) {
    const rawYear = parseInt(oldMatch[1], 10);
    let dayOfYear = parseInt(oldMatch[2], 10);
    // For 9-digit NICs, birth year is 1900 + YY
    const birthYear = 1900 + rawYear;
    let gender: 'Male' | 'Female' = 'Male';
    if (dayOfYear > 500) {
      gender = 'Female';
      dayOfYear -= 500;
    }
    const birthDate = getDateFromDayOfYear(birthYear, dayOfYear);
    const age = currentYear - birthYear;
    const isElderly = age >= 60;
    const isElderlyAllowanceEligible = age >= 70;

    return {
      isValid: true,
      nic: clean,
      format: '9-digit',
      birthYear,
      birthDate,
      dayOfYear,
      gender,
      age,
      isElderly,
      isElderlyAllowanceEligible,
      elderlyTier: isElderlyAllowanceEligible ? '70+ Eligible' : isElderly ? '60-69 Senior' : 'Under 60'
    };
  }

  // Check 12-digit new format: e.g. 195221008819
  const newRegex = /^([0-9]{4})([0-9]{3})([0-9]{5})$/;
  const newMatch = clean.match(newRegex);

  if (newMatch) {
    const birthYear = parseInt(newMatch[1], 10);
    let dayOfYear = parseInt(newMatch[2], 10);
    let gender: 'Male' | 'Female' = 'Male';
    if (dayOfYear > 500) {
      gender = 'Female';
      dayOfYear -= 500;
    }
    const birthDate = getDateFromDayOfYear(birthYear, dayOfYear);
    const age = currentYear - birthYear;
    const isElderly = age >= 60;
    const isElderlyAllowanceEligible = age >= 70;

    return {
      isValid: true,
      nic: clean,
      format: '12-digit',
      birthYear,
      birthDate,
      dayOfYear,
      gender,
      age,
      isElderly,
      isElderlyAllowanceEligible,
      elderlyTier: isElderlyAllowanceEligible ? '70+ Eligible' : isElderly ? '60-69 Senior' : 'Under 60'
    };
  }

  // If not standard NIC, use fallback DOB if available
  if (fallbackDOB) {
    return parseFromDOB(fallbackDOB, clean);
  }

  return {
    isValid: false,
    nic: clean,
    format: 'custom-or-token',
    rawError: 'Standard Sri Lankan NIC format not detected (expected 9 digits + V/X or 12 digits).'
  };
}

function parseFromDOB(dobStr: string, originalNic: string): ParsedNICResult {
  const currentYear = 2026;
  try {
    const parts = dobStr.split('-');
    if (parts.length >= 1) {
      const birthYear = parseInt(parts[0], 10);
      if (birthYear > 1900 && birthYear <= currentYear) {
        const age = currentYear - birthYear;
        const isElderly = age >= 60;
        const isElderlyAllowanceEligible = age >= 70;
        return {
          isValid: true,
          nic: originalNic || 'N/A',
          format: 'custom-or-token',
          birthYear,
          birthDate: dobStr,
          age,
          isElderly,
          isElderlyAllowanceEligible,
          elderlyTier: isElderlyAllowanceEligible ? '70+ Eligible' : isElderly ? '60-69 Senior' : 'Under 60'
        };
      }
    }
  } catch {
    // ignore
  }
  return {
    isValid: false,
    nic: originalNic || 'N/A',
    format: 'custom-or-token'
  };
}

function getDateFromDayOfYear(year: number, dayOfYear: number): string {
  try {
    const daysInMonths = [
      31,
      isLeapYear(year) ? 29 : 28,
      31,
      30,
      31,
      30,
      31,
      31,
      30,
      31,
      30,
      31
    ];
    let day = Math.max(1, dayOfYear);
    let month = 0;
    for (let i = 0; i < daysInMonths.length; i++) {
      if (day <= daysInMonths[i]) {
        month = i + 1;
        break;
      }
      day -= daysInMonths[i];
    }
    if (month === 0) {
      month = 12;
      day = 31;
    }
    const mm = month.toString().padStart(2, '0');
    const dd = day.toString().padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  } catch {
    return `${year}-01-01`;
  }
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
