import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  CreditCard,
  Phone,
  MapPin,
  Building,
  HelpCircle,
  Check,
  SwitchCamera,
  Layers,
} from 'lucide-react';
import { GNDivision, PetitionDepartment, PetitionType } from '../types';
import { Language } from '../translations/i18n';

export interface ScannedPetitionData {
  citizenName: string;
  citizenNic: string;
  phone: string;
  address: string;
  divisionCode: string;
  targetDepartment: PetitionDepartment;
  requestType: PetitionType;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  subject: string;
  description: string;
  tokenNumber?: string;
  letterPhotoUrl: string;
  confidenceNotes?: string;
}

interface PetitionLetterScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyData: (data: ScannedPetitionData) => void;
  divisions: GNDivision[];
  lang: Language;
}

export const PetitionLetterScannerModal: React.FC<PetitionLetterScannerModalProps> = ({
  isOpen,
  onClose,
  onApplyData,
  divisions,
  lang,
}) => {
  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [extractedData, setExtractedData] = useState<ScannedPetitionData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [cameraError, setCameraError] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize camera when in camera mode and modal opens
  useEffect(() => {
    if (isOpen && mode === 'camera' && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, mode, facingMode, capturedImage]);

  const startCamera = async () => {
    setCameraError('');
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          lang === 'ta'
            ? 'உங்கள் சாதனத்தில் கேமரா வசதி நேரடியாக இயங்கவில்லை. தயவுசெய்து கோப்பிலிருந்து பதிவேற்றவும்.'
            : 'Camera access is not supported on this browser. Please use upload option.'
        );
        setMode('upload');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError(
        lang === 'ta'
          ? 'கேமரா அனுமதி மறுக்கப்பட்டது அல்லது கேமரா கிடைக்கவில்லை. கோப்பிலிருந்து பதிவேற்றவும்.'
          : 'Camera access was denied or unavailable. Please upload a photo.'
      );
      setMode('upload');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture frame from video feed
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
    triggerAiAnalysis(dataUrl);
  };

  // Handle uploaded image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(lang === 'ta' ? 'தயவுசெய்து ஒரு படக் கோப்பை தெரிவுசெய்யவும்.' : 'Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCapturedImage(dataUrl);
        triggerAiAnalysis(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Call Server AI OCR Endpoint
  const triggerAiAnalysis = async (imageDataUrl: string) => {
    setIsScanning(true);
    setErrorMessage('');
    setExtractedData(null);

    try {
      const res = await fetch('/api/ai/scan-petition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: imageDataUrl,
          mimeType: 'image/jpeg',
          lang,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const validDivisions = divisions.map((div) => div.code);
        const resolvedDivision = validDivisions.includes(d.divisionCode) ? d.divisionCode : '211';

        const result: ScannedPetitionData = {
          citizenName: d.citizenName || '',
          citizenNic: d.citizenNic || '',
          phone: d.phone || '',
          address: d.address || '',
          divisionCode: resolvedDivision,
          targetDepartment: d.targetDepartment || 'GENERAL_ADMIN',
          requestType: d.requestType === 'COMPLAINT' ? 'COMPLAINT' : 'REQUEST',
          priority: d.priority === 'URGENT' ? 'URGENT' : d.priority === 'HIGH' ? 'HIGH' : 'NORMAL',
          subject: d.subject || (lang === 'ta' ? 'பொதுமக்கள் மனு / கோரிக்கை' : 'Public Grievance Petition'),
          description: d.description || '',
          tokenNumber: d.tokenNumber || '',
          letterPhotoUrl: imageDataUrl,
          confidenceNotes: d.confidenceNotes || json.note || '',
        };

        setExtractedData(result);
      } else {
        throw new Error(json.error || 'Could not parse document data');
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      setErrorMessage(
        lang === 'ta'
          ? 'கடிதத்தை வாசிப்பதில் சிறு தடங்கல் ஏற்பட்டது. மீண்டும் ஒருமுறை தெளிவாக படம் பிடிக்கவும் அல்லது கைமுறையாக உள்ளிடவும்.'
          : 'Could not automatically read the letter. Please try capturing with better lighting.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setExtractedData(null);
    setErrorMessage('');
    if (mode === 'camera') {
      startCamera();
    }
  };

  const handleApply = () => {
    if (extractedData) {
      onApplyData(extractedData);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs p-3 sm:p-5 flex justify-center items-center">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-amber-950 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>
                  {lang === 'ta' ? 'பயனாளியின் கடிதத்தை ஸ்கான் செய்தல்' : 'AI Petition Letter Scanner'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>Gemini AI OCR</span>
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {lang === 'ta'
                  ? 'மனு/கோரிக்கை கடிதத்தை போட்டோ பிடித்தவுடன் பெயர், அடையாள அட்டை, தலைப்பு, விபரங்கள் தானாகவே பிரித்தெடுக்கப்படும்.'
                  : 'Capture or upload a citizen request letter to automatically extract petitioner details & grievance text.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Mode Switcher (Camera vs Upload) if no image captured yet */}
          {!capturedImage && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => {
                  setMode('camera');
                  setCapturedImage(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  mode === 'camera'
                    ? 'bg-emerald-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>{lang === 'ta' ? 'கேமரா (நேரடி புகைப்படம்)' : 'Live Camera'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('upload');
                  stopCamera();
                  fileInputRef.current?.click();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  mode === 'upload'
                    ? 'bg-emerald-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>{lang === 'ta' ? 'கோப்பு பதிவேற்றம் (Upload Photo)' : 'Upload File'}</span>
              </button>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* VIEW 1: LIVE CAMERA VIEWPORT */}
          {!capturedImage && mode === 'camera' && (
            <div className="relative rounded-2xl overflow-hidden bg-black flex flex-col items-center justify-center min-h-[360px] sm:min-h-[420px] border-2 border-slate-700 shadow-inner">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover max-h-[460px]"
              />

              {/* Viewfinder Target Overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-md h-64 border-2 border-dashed border-amber-400/80 rounded-2xl flex flex-col items-center justify-between p-4 bg-black/20 backdrop-blur-[1px]">
                  <div className="text-[11px] font-bold text-amber-300 bg-black/60 px-3 py-1 rounded-full border border-amber-400/40">
                    {lang === 'ta' ? '📄 கடிதத்தை இந்த பெட்டிக்குள் வைக்கவும்' : '📄 Align petition letter inside'}
                  </div>
                  <div className="text-[10px] text-slate-200 bg-black/60 px-3 py-1 rounded-full">
                    {lang === 'ta' ? 'வெளிச்சமான இடத்தில் வைத்து படம் பிடிக்கவும்' : 'Hold still under clear lighting'}
                  </div>
                </div>
              </div>

              {/* Camera Action Toolbar */}
              <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 px-4">
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full border border-slate-600 shadow-md backdrop-blur-xs cursor-pointer transition-all"
                  title={lang === 'ta' ? 'கேமராவை மாற்று' : 'Switch Camera'}
                >
                  <SwitchCamera className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-full shadow-lg flex items-center gap-2 transform active:scale-95 transition-all cursor-pointer border-2 border-amber-300"
                >
                  <Camera className="w-5 h-5" />
                  <span>{lang === 'ta' ? 'படம் பிடி & ஸ்கான் செய்' : 'Snap & Scan Letter'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full border border-slate-600 shadow-md backdrop-blur-xs cursor-pointer transition-all"
                  title={lang === 'ta' ? 'கோப்பிலிருந்து' : 'Upload from file'}
                >
                  <Upload className="w-5 h-5" />
                </button>
              </div>

              {cameraError && (
                <div className="absolute top-4 inset-x-4 bg-rose-900/90 text-rose-100 p-3 rounded-xl text-xs flex items-center gap-2 border border-rose-500">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-300" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: FILE UPLOAD ZONE (when in upload mode and no image captured) */}
          {!capturedImage && mode === 'upload' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-2xl p-8 sm:p-12 text-center bg-slate-50 hover:bg-emerald-50/40 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[320px]"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4 shadow-xs">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">
                {lang === 'ta' ? 'கடித புகைப்படத்தை தெரிவு செய்யவும் அல்லது இழுத்து விடவும்' : 'Click to Upload or Drag Petition Letter Photo'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mb-4">
                {lang === 'ta'
                  ? 'மொபைல் போன் கேமரா, ஸ்கேனர் அல்லது படக் கோப்புகளை (JPG, PNG) தெரிவு செய்யவும்.'
                  : 'Supports mobile snapshots, scanned letters, and photo files (JPG, PNG).'}
              </p>
              <button
                type="button"
                className="px-5 py-2.5 bg-emerald-900 text-white rounded-xl text-xs font-bold hover:bg-emerald-950 transition-colors shadow-xs"
              >
                {lang === 'ta' ? 'கோப்பைத் தேர்ந்தெடு' : 'Browse Photo'}
              </button>
            </div>
          )}

          {/* VIEW 3: IMAGE CAPTURED + AI SCANNING OR RESULTS */}
          {capturedImage && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Image Preview + Scanning Animation */}
              <div className="lg:col-span-5 flex flex-col space-y-3">
                <div className="relative rounded-2xl overflow-hidden border-2 border-slate-300 bg-slate-950 shadow-md">
                  <img
                    src={capturedImage}
                    alt="Captured Petition Letter"
                    className="w-full h-auto max-h-[460px] object-contain mx-auto"
                  />

                  {/* Pulsating Scanning Line Animation */}
                  {isScanning && (
                    <div className="absolute inset-0 bg-emerald-950/20 pointer-events-none overflow-hidden">
                      <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-bounce absolute top-1/2 -translate-y-1/2" />
                      <div className="absolute inset-x-0 bottom-4 flex justify-center">
                        <div className="bg-slate-900/90 text-emerald-300 border border-emerald-500/50 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg backdrop-blur-xs">
                          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                          <span>{lang === 'ta' ? 'AI கடிதத்தை வாசிக்கிறது...' : 'Gemini AI reading letter...'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Scanned Badge */}
                  {!isScanning && extractedData && (
                    <div className="absolute top-3 left-3 bg-emerald-900/90 text-emerald-200 border border-emerald-400/40 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 shadow-md backdrop-blur-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      <span>{lang === 'ta' ? 'வெற்றிகரமாக வாசிக்கப்பட்டது' : 'OCR Complete'}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleRetake}
                    disabled={isScanning}
                    className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{lang === 'ta' ? 'மீண்டும் படம் பிடி' : 'Retake / Change'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerAiAnalysis(capturedImage)}
                    disabled={isScanning}
                    className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    <span>{lang === 'ta' ? 'மீண்டும் பகுப்பாய்' : 'Re-Scan'}</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Extracted Structured Information */}
              <div className="lg:col-span-7 flex flex-col justify-between">
                {isScanning && (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                      <Sparkles className="w-8 h-8 animate-pulse text-amber-700" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                        {lang === 'ta' ? 'கையெழுத்து மற்றும் தமிழ் வாக்கியங்கள் பகுப்பாய்வு...' : 'Analyzing Tamil & English handwritten text...'}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm">
                        {lang === 'ta'
                          ? 'பிரஜையின் பெயர், அடையாள அட்டை எண், கிராமப் பிரிவு மற்றும் கோரிக்கையின் காரணங்கள் தானாக வரிசைப்படுத்தப்படுகின்றன.'
                          : 'Extracting petitioner name, NIC, address, Grama Niladhari division, and core grievance.'}
                      </p>
                    </div>
                    <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full animate-pulse w-3/4" />
                    </div>
                  </div>
                )}

                {errorMessage && !isScanning && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-2">
                    <div className="font-bold flex items-center gap-1.5 text-rose-900">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>{lang === 'ta' ? 'பகுப்பாய்வு பிழை' : 'Scan Warning'}</span>
                    </div>
                    <p>{errorMessage}</p>
                    <button
                      type="button"
                      onClick={() => triggerAiAnalysis(capturedImage)}
                      className="px-3 py-1.5 bg-rose-700 text-white rounded-lg font-bold hover:bg-rose-800 transition-colors"
                    >
                      {lang === 'ta' ? 'மீண்டும் முயற்சிக்க' : 'Retry'}
                    </button>
                  </div>
                )}

                {extractedData && !isScanning && (
                  <div className="space-y-3.5 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{lang === 'ta' ? 'கடிதத்திலிருந்து பெறப்பட்ட விபரங்கள்' : 'Extracted Letter Details'}</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                        {extractedData.requestType === 'COMPLAINT' ? '⚠️ முறைப்பாடு (Complaint)' : '📋 கோரிக்கை (Request)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                          {lang === 'ta' ? 'பிரஜையின் பெயர் (Petitioner)' : 'Petitioner Name'}
                        </span>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                          <span>{extractedData.citizenName || '—'}</span>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                          {lang === 'ta' ? 'தேசிய அடையாள அட்டை (NIC)' : 'National Identity Card (NIC)'}
                        </span>
                        <div className="font-mono font-bold text-emerald-950 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                          <span>{extractedData.citizenNic || '—'}</span>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                          {lang === 'ta' ? 'தொலைபேசி எண் (Phone)' : 'Phone Number'}
                        </span>
                        <div className="font-mono font-semibold text-slate-800 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{extractedData.phone || '—'}</span>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                          {lang === 'ta' ? 'கிராம அலுவலர் பிரிவு (GN Division)' : 'GN Division'}
                        </span>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>
                            {extractedData.divisionCode} -{' '}
                            {divisions.find((d) => d.code === extractedData.divisionCode)?.nameTa || extractedData.divisionCode}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                      <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                        {lang === 'ta' ? 'முகவரி (Address)' : 'Address'}
                      </span>
                      <div className="font-medium text-slate-800">{extractedData.address || '—'}</div>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                      <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                        {lang === 'ta' ? 'பரிந்துரைக்கப்பட்ட துறை (Target Department)' : 'Target Department'}
                      </span>
                      <div className="font-bold text-amber-900 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>{extractedData.targetDepartment}</span>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                      <span className="text-[10px] font-semibold text-slate-500 block">
                        {lang === 'ta' ? 'கடிதத்தின் தலைப்பு (Subject)' : 'Extracted Subject'}
                      </span>
                      <div className="font-bold text-slate-900">{extractedData.subject}</div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                      <span className="text-[10px] font-semibold text-slate-500 block">
                        {lang === 'ta' ? 'கோரிக்கையின் விபரம் (Petition Description)' : 'Extracted Description'}
                      </span>
                      <div className="text-slate-700 line-clamp-3 leading-relaxed">
                        {extractedData.description}
                      </div>
                    </div>

                    {extractedData.confidenceNotes && (
                      <div className="text-[11px] text-slate-500 italic bg-amber-50/70 p-2 rounded-lg border border-amber-200/60">
                        💡 {extractedData.confidenceNotes}
                      </div>
                    )}

                    {/* Apply Button */}
                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleApply}
                        className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-800 to-emerald-950 hover:from-emerald-900 hover:to-black text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>
                          {lang === 'ta'
                            ? '✅ இந்த விபரங்களை படிவத்தில் தானாக நிரப்புக (Apply to Form)'
                            : 'Apply Details to Petition Form'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              {lang === 'ta'
                ? 'வாகரை பிரதேச செயலக கையெழுத்து ஆவண OCR இயந்திரம் தயார்'
                : 'Vaharai DS Letter OCR Engine Active'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg font-semibold text-slate-800 cursor-pointer"
          >
            {lang === 'ta' ? 'மூடுக' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
