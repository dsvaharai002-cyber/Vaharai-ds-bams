import React, { useState, useEffect, useRef } from 'react';
import { Beneficiary } from '../types';
import { Language, translations } from '../translations/i18n';

interface BarcodeScannerModalProps {
  beneficiaries: Beneficiary[];
  lang: Language;
  onSelectBeneficiary: (beneficiary: Beneficiary) => void;
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  beneficiaries,
  lang,
  onSelectBeneficiary,
  onClose,
}) => {
  const t = translations[lang];
  const [inputVal, setInputVal] = useState('');
  const [matched, setMatched] = useState<Beneficiary | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScanSearch = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setMatched(null);
      setErrorMsg('');
      return;
    }

    const found = beneficiaries.find(
      (b) =>
        b.barcode.toLowerCase() === q ||
        b.nic.toLowerCase() === q ||
        b.id.toLowerCase() === q ||
        b.nameEn.toLowerCase().includes(q) ||
        b.nameTa.toLowerCase().includes(q)
    );

    if (found) {
      setMatched(found);
      setErrorMsg('');
    } else {
      setMatched(null);
      setErrorMsg(lang === 'ta' ? 'பயனாளி கண்டுபிடிக்கப்படவில்லை!' : 'No citizen found matching this barcode or NIC.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScanSearch(inputVal);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xl">📷</span>
            <h3 className="text-base font-semibold text-slate-900">
              {t.scanBarcode} / NIC Scanner
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg">
            ✕
          </button>
        </div>

        <div className="my-4">
          <p className="text-xs text-slate-600 mb-2">
            {lang === 'ta'
              ? 'பார்கோட் ரீடர் மூலம் ஸ்கேன் செய்யவும் அல்லது தேசிய அடையாள அட்டை (NIC) இலக்கத்தை தட்டச்சு செய்யவும்:'
              : 'Scan with a barcode reader or type the citizen NIC / Barcode number:'}
          </p>

          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                handleScanSearch(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. 198421500321 or BEN-211-001"
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
            />
            <button
              onClick={() => handleScanSearch(inputVal)}
              className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-medium hover:bg-emerald-800 transition-colors"
            >
              {lang === 'ta' ? 'தேடுக' : 'Search'}
            </button>
          </div>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400">Quick test:</span>
            {beneficiaries.slice(0, 3).map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setInputVal(b.barcode);
                  handleScanSearch(b.barcode);
                }}
                className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-mono"
              >
                {b.nic}
              </button>
            ))}
          </div>

          {errorMsg && (
            <div className="mt-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {errorMsg}
            </div>
          )}

          {/* Matched Citizen Result */}
          {matched && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-300 rounded-xl">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wide">
                    {lang === 'ta' ? 'உறுதிப்படுத்தப்பட்ட பிரஜை' : 'Verified Citizen'}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-0.5">{matched.nameTa}</h4>
                  <div className="text-xs text-slate-600">{matched.nameEn}</div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-white rounded border border-emerald-200 text-emerald-900">
                  {matched.nic}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-emerald-200/60 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">பிரிவு / Division:</span>
                  <span className="font-medium text-slate-800">{matched.divisionCode}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">நலன்புரி / Welfare:</span>
                  <span className="font-semibold text-emerald-800">{matched.welfareScheme}</span>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    onSelectBeneficiary(matched);
                    onClose();
                  }}
                  className="flex-1 py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  {lang === 'ta' ? 'விபரங்களை திறக்கவும்' : 'Open Details'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="py-1.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
