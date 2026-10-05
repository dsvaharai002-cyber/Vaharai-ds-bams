import React, { useState, useEffect, useRef } from 'react';
import { Family, User } from '../types';
import { StorageService } from '../services/storageService';
import { Language } from '../utils/translations';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  QrCode,
  X,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  Camera,
  Keyboard,
  RefreshCw,
  Flashlight,
  SwitchCamera,
  CheckCircle2,
  Gift
} from 'lucide-react';

interface QrScannerModalProps {
  currentUser: User;
  currentLang?: Language;
  onClose: () => void;
  onSelectFamily: (family: Family) => void;
  onRecordAssistance: (family: Family) => void;
  onScanResult?: (qrCode: string, family?: Family) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  currentUser,
  currentLang = 'ta',
  onClose,
  onSelectFamily,
  onRecordAssistance,
  onScanResult
}) => {
  const isTa = currentLang === 'ta';
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [inputQR, setInputQR] = useState('');
  const [scannedFamily, setScannedFamily] = useState<Family | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assistanceCount, setAssistanceCount] = useState<number>(0);

  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'interactive-camera-qr-reader';

  const families = StorageService.getFilteredFamilies(currentUser);

  const handleLookup = (code: string) => {
    const raw = (code || '').trim();
    if (!raw) return;
    let clean = raw.toUpperCase();

    // In case the QR code contains JSON payload: e.g. {"qr":"VHR-PCK-001","id":"...","div":"...","head":"..."}
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.qr || parsed.QR || parsed.QR_Number) {
          clean = String(parsed.qr || parsed.QR || parsed.QR_Number).trim().toUpperCase();
        }
      } catch {
        const match = raw.match(/"qr"\s*:\s*"([^"]+)"/i);
        if (match && match[1]) {
          clean = match[1].trim().toUpperCase();
        }
      }
    }

    setError(null);
    try {
      const allFams = StorageService.getFamilies();
      const foundFam = allFams.find(f => f.QR_Number.toUpperCase() === clean) || null;
      const allAst = StorageService.getAssistance().filter(a => a.QR_Number.toUpperCase() === clean);

      if (!foundFam) {
        setError(
          isTa
            ? `"${clean}" என்ற QR குறியீட்டைக் கொண்ட குடும்பம் எதுவும் பதிவேட்டில் காணப்படவில்லை.`
            : `No beneficiary family found with QR code "${clean}".`
        );
        return;
      }
      setScannedFamily(foundFam);
      setAssistanceCount(allAst.length);

      // Stop camera once verified successfully to save battery/CPU
      stopCamera();

      if (onScanResult) {
        onScanResult(clean, foundFam);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(isTa ? 'சரிபார்த்தலில் பிழை ஏற்பட்டது.' : 'Verification lookup failed.');
      }
    }
  };

  // Start HTML5 Camera QR Scanning
  const startCamera = async (deviceId?: string) => {
    setCameraLoading(true);
    setCameraError(null);
    setError(null);

    try {
      // Clean up previous instance if running
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          await html5QrCodeRef.current.clear();
        } catch {
          // ignore cleanup errors
        }
      }

      // Check available cameras
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        throw new Error(
          isTa
            ? 'உங்கள் சாதனத்தில் கெமரா கண்டுபிடிக்கப்படவில்லை.'
            : 'No cameras detected on this device.'
        );
      }

      setCameras(devices);
      const targetId = deviceId || selectedCameraId || devices[devices.length - 1].id;
      setSelectedCameraId(targetId);

      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      });
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        targetId,
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          handleLookup(decodedText);
        },
        () => {
          // ignore scan frame errors
        }
      );

      setIsCameraActive(true);
      setCameraLoading(false);
    } catch (err: any) {
      console.error('Camera startup error:', err);
      setCameraLoading(false);
      setIsCameraActive(false);
      const msg = err?.message || err?.toString() || '';
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setCameraError(
          isTa
            ? 'கெமரா அனுமதி மறுக்கப்பட்டது. பிரவுசரின் அமைப்புகளில் கெமராவை இயக்கவும்.'
            : 'Camera permission denied. Please allow camera access in your browser settings.'
        );
      } else {
        setCameraError(
          isTa
            ? 'கெமராவை ஆரம்பிக்க முடியவில்லை. மேனுவல் உள்ளீட்டைப் பயன்படுத்தவும்.'
            : `Could not start camera: ${msg || 'Camera error'}`
        );
      }
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Camera stop error:', e);
      }
    }
    setIsCameraActive(false);
  };

  // Switch between front/back camera
  const handleSwitchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    setSelectedCameraId(nextCamera.id);
    startCamera(nextCamera.id);
  };

  // Launch camera when modal opens or when tab changes to camera
  useEffect(() => {
    if (activeTab === 'camera') {
      // Small timeout to allow DOM container element to mount
      const timer = setTimeout(() => {
        startCamera();
      }, 150);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }
  }, [activeTab]);

  // Clean up camera on component unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {isTa ? 'பயனாளி QR சரிபார்ப்பு & ஸ்கேனர்' : 'QR Verification & Scanner'}
              </h3>
              <p className="text-[11px] text-slate-300">
                {isTa ? 'கெமரா அல்லது பார்கோட் துப்பாக்கி மூலம் ஸ்கேன்' : 'Live Camera Scanner & Barcode Gun'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-md cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle: Live Camera vs Manual / Barcode Input */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 p-2 gap-2 shrink-0">
          <button
            onClick={() => {
              setActiveTab('camera');
              setError(null);
            }}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>{isTa ? 'கெமரா ஸ்கேனர் (Live Camera)' : 'Live Camera'}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('manual');
              stopCamera();
              setError(null);
            }}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>{isTa ? 'பார்கோட் / மேனுவல் (Manual / Gun)' : 'Manual / Gun'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: Live Camera Scanner */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
              <div className="relative bg-slate-950 rounded-xl overflow-hidden min-h-[280px] flex items-center justify-center border border-slate-800">
                {/* Scanner container for html5-qrcode */}
                <div
                  id={scannerContainerId}
                  className="w-full h-full max-h-[320px] overflow-hidden"
                />

                {/* Animated scanner overlay laser line when camera active */}
                {isCameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-56 h-56 border-2 border-emerald-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                      {/* Corner marks */}
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                      {/* Moving laser beam */}
                      <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#10b981] animate-bounce top-1/2" />
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {cameraLoading && (
                  <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-white space-y-2">
                    <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin" />
                    <span className="text-xs font-semibold">
                      {isTa ? 'கெமரா ஆரம்பிக்கப்படுகிறது...' : 'Initializing Camera Feed...'}
                    </span>
                  </div>
                )}

                {/* Camera Error */}
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/95 p-5 flex flex-col items-center justify-center text-center text-white space-y-3">
                    <AlertTriangle className="w-8 h-8 text-amber-400" />
                    <p className="text-xs text-slate-200 max-w-xs">{cameraError}</p>
                    <button
                      onClick={() => startCamera()}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{isTa ? 'மீண்டும் முயற்சிக்க' : 'Retry Camera'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Camera Controls Bar */}
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-slate-500 font-medium text-[11px] flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span>
                    {isCameraActive
                      ? (isTa ? 'கெமரா இயங்குகிறது - QR ஐ காட்டவும்' : 'Camera active - Align QR inside frame')
                      : (isTa ? 'கெமரா காத்திருக்கிறது' : 'Camera standby')}
                  </span>
                </span>

                {cameras.length > 1 && (
                  <button
                    onClick={handleSwitchCamera}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md font-semibold text-[11px] cursor-pointer"
                  >
                    <SwitchCamera className="w-3.5 h-3.5" />
                    <span>{isTa ? 'கெமராவை மாற்றுக' : 'Switch Camera'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Manual Input or Barcode Gun */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isTa ? 'பார்கோட் துப்பாக்கி மூலம் ஸ்கேன் செய்க அல்லது QR எண்ணை உள்ளிடுக:' : 'Scan with Barcode Gun or Enter QR Code:'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g. VHR-PCK-001"
                    value={inputQR}
                    onChange={e => setInputQR(e.target.value.toUpperCase())}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleLookup(inputQR);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => handleLookup(inputQR)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shrink-0 cursor-pointer"
                  >
                    {isTa ? 'சரிபார்' : 'Verify'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex gap-2 items-center">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Verification Result Card */}
          {scannedFamily && (
            <div className="p-4 bg-emerald-50/70 border-2 border-emerald-500 rounded-xl space-y-3 animate-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="font-mono font-bold text-xs text-emerald-800 block">
                      {isTa ? 'உறுதிப்படுத்தப்பட்ட பயனாளி: ' : 'VERIFIED BENEFICIARY: '}
                      {scannedFamily.QR_Number}
                    </span>
                    <h4 className="text-base font-bold text-slate-900">{scannedFamily.Family_Name}</h4>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                  scannedFamily.Priority_Level === 'Critical' ? 'bg-rose-100 text-rose-800' :
                  scannedFamily.Priority_Level === 'High' ? 'bg-amber-100 text-amber-800' :
                  'bg-slate-200 text-slate-800'
                }`}>
                  {scannedFamily.Priority_Level}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-y border-emerald-200 py-2.5">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">
                    {isTa ? 'கிராம அலுவலர் பிரிவு' : 'GN Division'}
                  </span>
                  <span className="font-semibold text-slate-800">{scannedFamily.Division_Name} ({scannedFamily.Division_ID})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">
                    {isTa ? 'முகவரி' : 'Address'}
                  </span>
                  <span className="font-medium text-slate-800 truncate block">{scannedFamily.Address}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">
                    {isTa ? 'குடும்ப அளவு' : 'Family Size'}
                  </span>
                  <span className="font-mono font-semibold text-slate-800">{scannedFamily.Family_Size} Members</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">
                    {isTa ? 'பெற்ற உதவிகள்' : 'Assistance Count'}
                  </span>
                  <span className={`font-mono font-bold ${
                    assistanceCount >= 3 ? 'text-amber-700' : 'text-slate-800'
                  }`}>
                    {assistanceCount} {isTa ? 'முறை உதவி' : 'disbursement(s)'}
                  </span>
                </div>
              </div>

              {assistanceCount >= 3 && (
                <div className="p-2 bg-amber-100 text-amber-900 rounded text-xs flex gap-1.5 items-center font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>{isTa ? 'மீள் உதவி எச்சரிக்கை (3 அல்லது அதற்கு மேற்பட்ட முறை உதவி பெற்றுள்ளது).' : 'Flagged as Repeated Assistance Recipient (≥ 3 times).'}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {onScanResult && (
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      onClose();
                      onScanResult(scannedFamily.QR_Number, scannedFamily);
                    }}
                    className="w-full py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                  >
                    <span>{isTa ? 'வரவேற்பில் பயனாளி வருகைப் பதிவை ஆரம்பி (Use for Reception)' : 'Use for Reception Check-in'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    onClose();
                    onSelectFamily(scannedFamily);
                  }}
                  className="flex-1 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  {isTa ? 'முழு விபரம் பார்க்க' : 'View Full Dossier'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    onClose();
                    onRecordAssistance(scannedFamily);
                  }}
                  className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>{isTa ? 'உதவி வழங்குக' : 'Deliver Aid'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QrScannerModal;
