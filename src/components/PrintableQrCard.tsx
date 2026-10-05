import React, { useEffect, useState } from 'react';
import { Family, FamilyMember } from '../types';
import { generateQrDataUrl } from '../utils/qrUtils';
import { Printer, X, ShieldCheck } from 'lucide-react';
import { AppLogo } from './AppLogo';

interface PrintableQrCardProps {
  family: Family;
  members: FamilyMember[];
  onClose: () => void;
}

export const PrintableQrCard: React.FC<PrintableQrCardProps> = ({ family, members, onClose }) => {
  const [qrImage, setQrImage] = useState<string>('');

  useEffect(() => {
    const payload = JSON.stringify({
      qr: family.QR_Number,
      id: family.Family_ID,
      div: family.Division_Name,
      head: family.Family_Name
    });
    generateQrDataUrl(payload).then(setQrImage);
  }, [family]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Modal Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 no-print">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900">Official Beneficiary ID Card</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Card</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Card Area */}
        <div className="p-6 bg-slate-50 flex justify-center">
          <div
            id="beneficiary-id-card"
            className="w-full max-w-md bg-white border-2 border-slate-800 rounded-lg p-5 shadow-xs relative print:shadow-none print:border-2 print:border-black"
          >
            {/* Card Header */}
            <div className="border-b-2 border-slate-800 pb-3 text-center flex flex-col items-center">
              <AppLogo size="sm" className="mb-1 ring-1 ring-slate-300" />
              <p className="text-[10px] font-bold tracking-widest text-slate-700 uppercase">
                Democratic Socialist Republic of Sri Lanka
              </p>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight mt-0.5">
                Divisional Secretariat – Vaharai
              </h2>
              <p className="text-[11px] font-semibold text-emerald-800">
                BENEFICIARY ASSISTANCE IDENTIFICATION CARD
              </p>
            </div>

            {/* Main Content: QR & Details */}
            <div className="grid grid-cols-12 gap-4 py-4 items-center">
              <div className="col-span-5 flex flex-col items-center justify-center text-center border-r border-slate-200 pr-2">
                {qrImage ? (
                  <img
                    src={qrImage}
                    alt={`QR for ${family.QR_Number}`}
                    className="w-28 h-28 object-contain rounded border border-slate-200 p-1 bg-white"
                  />
                ) : (
                  <div className="w-28 h-28 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                    Generating...
                  </div>
                )}
                <span className="font-mono font-bold text-xs text-slate-900 mt-1 tracking-wider">
                  {family.QR_Number}
                </span>
                <span className="text-[9px] text-slate-500 font-mono">
                  {family.Family_ID}
                </span>
              </div>

              <div className="col-span-7 space-y-1.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Head of Household</span>
                  <span className="font-semibold text-slate-900 leading-tight block">{family.Family_Name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">GN Division</span>
                  <span className="font-medium text-slate-800">{family.Division_Name} ({family.Division_ID})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Address</span>
                  <span className="text-slate-700 truncate block text-[11px]">{family.Address}</span>
                </div>
                <div className="flex gap-4 pt-0.5">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Size</span>
                    <span className="font-semibold text-slate-800 font-mono">{members.length || family.Family_Size}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Priority</span>
                    <span className={`font-semibold text-[11px] ${
                      family.Priority_Level === 'Critical' ? 'text-rose-700' :
                      family.Priority_Level === 'High' ? 'text-amber-700' : 'text-slate-800'
                    }`}>
                      {family.Priority_Level}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Issued</span>
                    <span className="text-slate-700 text-[10px] font-mono">
                      {family.Created_At ? family.Created_At.substring(0, 10) : '2026'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Registered Family Members Snippet */}
            {members.length > 0 && (
              <div className="border-t border-slate-200 pt-2 text-[10px] text-slate-600">
                <span className="font-semibold text-slate-700 block mb-1">Registered Members & NICs:</span>
                <div className="space-y-0.5 max-h-20 overflow-hidden">
                  {members.slice(0, 4).map(m => (
                    <div key={m.Member_ID} className="flex justify-between items-center text-[10px]">
                      <span className="truncate max-w-[170px] text-slate-800">{m.Name} ({m.Relationship})</span>
                      <span className="font-mono text-slate-600 shrink-0">{m.NIC_Elder_ID}</span>
                    </div>
                  ))}
                  {members.length > 4 && (
                    <span className="text-[9px] text-slate-400 italic">+ {members.length - 4} more member(s)</span>
                  )}
                </div>
              </div>
            )}

            {/* Card Footer */}
            <div className="border-t border-slate-300 mt-2.5 pt-2 flex items-center justify-between text-[9px] text-slate-500">
              <span>Authorized Official Document</span>
              <span>Divisional Secretariat Vaharai</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-200 text-xs text-slate-500 text-center no-print">
          Present this official QR Card at assistance distribution counters for automated verification.
        </div>
      </div>
    </div>
  );
};
