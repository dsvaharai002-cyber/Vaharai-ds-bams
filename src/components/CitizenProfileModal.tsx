import React, { useEffect, useRef, useState } from 'react';
import { Beneficiary, GNDivision, QueueToken } from '../types';
import { Language, translations } from '../translations/i18n';
import { VaharaiLogo } from './VaharaiLogo';
import { renderBarcodeSvg, generateQrDataUrl } from '../utils/barcode';
import { calculateAge } from '../services/storage';

interface CitizenProfileModalProps {
  beneficiary?: Beneficiary | null;
  token?: QueueToken | null;
  division?: GNDivision;
  lang: Language;
  onClose: () => void;
  onPrintCard?: () => void;
  onPrintThermal?: () => void;
}

export const CitizenProfileModal: React.FC<CitizenProfileModalProps> = ({
  beneficiary,
  token,
  division,
  lang,
  onClose,
  onPrintCard,
  onPrintThermal,
}) => {
  const t = translations[lang];
  const barcodeRef = useRef<SVGSVGElement | null>(null);
  const [qrSrc, setQrSrc] = useState<string>('');

  const barcodeVal = beneficiary?.barcode || beneficiary?.nic || token?.citizenNic || token?.tokenNumber || '';
  const age = beneficiary ? calculateAge(beneficiary.dob) : null;

  useEffect(() => {
    if (barcodeRef.current && barcodeVal) {
      renderBarcodeSvg(barcodeRef.current, barcodeVal, {
        height: 38,
        displayValue: true,
        fontSize: 10,
      });
    }

    const payload = beneficiary
      ? `VHR-DS|ID:${beneficiary.id}|NIC:${beneficiary.nic}|DIV:${beneficiary.divisionCode}|MED:${beneficiary.chronicIllness}|SCHEME:${beneficiary.welfareScheme}`
      : `TOKEN:${token?.tokenNumber}|NIC:${token?.citizenNic}|NAME:${token?.citizenName}`;

    generateQrDataUrl(payload).then((url) => setQrSrc(url));
  }, [barcodeVal, beneficiary, token]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-4 sm:p-6 border border-slate-200 my-4 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <VaharaiLogo size={36} className="w-9 h-9" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                {t.citizenProfileModalTitle}
              </h3>
              <p className="text-[11px] text-slate-500">
                {token ? `டோக்கன்: ${token.tokenNumber} · கவுண்டர்: ${token.counterNo}` : 'பிரஜை உத்தியோகபூர்வ விபரம்'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Citizen Card Dossier */}
        <div className="my-4 space-y-4">
          {/* Identity Header Strip */}
          <div className="p-4 bg-gradient-to-r from-emerald-50 via-slate-50 to-amber-50/40 border border-emerald-200 rounded-xl flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center text-2xl shadow-inner shrink-0">
                {beneficiary?.gender === 'FEMALE' ? '👩' : '👨'}
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 leading-tight">
                  {beneficiary?.nameTa || token?.citizenName || 'பிரஜை'}
                </h4>
                <div className="text-xs text-slate-600 font-medium">
                  {beneficiary?.nameEn || token?.citizenName}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="font-mono text-xs font-bold text-emerald-950 bg-white px-2 py-0.5 rounded border border-emerald-200">
                    {beneficiary?.nic || token?.citizenNic || 'No NIC'}
                  </span>
                  {beneficiary?.isProvisionalNic && (
                    <span className="text-[9px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded">
                      {t.provisionalNicBadge}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-mono">System ID:</div>
              <div className="text-xs font-mono font-bold text-slate-800">
                {beneficiary?.id || 'UNREGISTERED'}
              </div>
              {age !== null && (
                <div className="mt-1">
                  <span className={`inline-block font-mono font-bold text-xs px-2 py-0.5 rounded ${age === 16 ? 'bg-amber-300 text-slate-950' : 'bg-slate-100 text-slate-700'}`}>
                    {age} {t.yearsOld} {age === 16 ? '(NIC தேவை)' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Token Visit Info (யாரை பார்க்க வேண்டும்) */}
          {token && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 flex items-center gap-1">
                  <span>📌</span>
                  <span>{t.officerToMeet}:</span>
                </span>
                <span className="font-bold font-mono text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-200">
                  {token.officerToMeet || 'அட்மின் 1 (Admin 1)'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600">
                <div>
                  <span>வரிசை எண்:</span> <strong className="font-mono text-slate-900">{token.tokenNumber}</strong>
                </div>
                <div>
                  <span>கவுண்டர்:</span> <strong className="font-mono text-slate-900">Counter {token.counterNo}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Citizen Details Grid */}
          {beneficiary ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  இருப்பிட & பிரிவு விபரங்கள் / Residential
                </div>
                <div>
                  <span className="text-slate-500">பிரிவு:</span>{' '}
                  <strong className="text-slate-900 font-mono">{beneficiary.divisionCode}</strong> - {division?.nameTa || beneficiary.divisionCode}
                </div>
                <div>
                  <span className="text-slate-500">குடும்ப எண்:</span>{' '}
                  <strong className="text-slate-900 font-mono">{beneficiary.householdNo}</strong>{' '}
                  {beneficiary.familyHead && <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded">(தலைவர்)</span>}
                </div>
                <div>
                  <span className="text-slate-500">முகவரி:</span>{' '}
                  <span className="text-slate-800">{beneficiary.address || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500">தொலைபேசி:</span>{' '}
                  <span className="text-slate-800 font-mono">{beneficiary.phone || '-'}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  நலன்புரி & சுகாதார விபரங்கள் / Welfare & Health
                </div>
                <div>
                  <span className="text-slate-500">நலத்திட்டம்:</span>{' '}
                  <strong className="text-emerald-900 block mt-0.5">{beneficiary.welfareScheme}</strong>
                </div>
                <div>
                  <span className="text-slate-500">உதவி நிலை:</span>{' '}
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded font-mono">
                    {beneficiary.welfareStatus}
                  </span>
                </div>
                <div className="pt-1 border-t border-slate-200">
                  <span className="text-slate-500">நாள்பட்ட நோய்:</span>{' '}
                  {beneficiary.chronicIllness && beneficiary.chronicIllness !== 'NONE' ? (
                    <span className="font-bold text-red-700 block mt-0.5">
                      🏥 {beneficiary.chronicIllness.replace('_', ' ')}
                    </span>
                  ) : (
                    <span className="text-slate-500">நோய்கள் இல்லை (Healthy)</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-lg text-xs text-slate-500 text-center">
              இந்த டோக்கன் பிரஜை இன்னும் தரவுத்தளத்தில் முழுமையாக பதிவு செய்யப்படவில்லை.
            </div>
          )}

          {/* Barcode and QR display */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-4">
            <div className="flex flex-col items-center flex-1">
              <svg ref={barcodeRef} className="max-w-[220px] h-[40px]"></svg>
            </div>
            {qrSrc && (
              <img
                src={qrSrc}
                alt="Citizen QR"
                className="w-14 h-14 border border-slate-200 p-0.5 rounded bg-white shrink-0"
              />
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 flex-wrap">
          {onPrintCard && beneficiary && (
            <button
              onClick={onPrintCard}
              className="py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              🪪 {t.printIdCard}
            </button>
          )}
          {onPrintThermal && token && (
            <button
              onClick={onPrintThermal}
              className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              🖨️ {t.printThermalReceipt}
            </button>
          )}
          <button
            onClick={onClose}
            className="py-1.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
