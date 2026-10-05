import React, { useState, useMemo } from 'react';
import { User, VisitorRecord, VisitStatus, Family, FamilyMember, CitizenFeedback, SatisfactionRating } from '../types';
import { StorageService } from '../services/storageService';
import { Language } from '../utils/translations';
import { AppLogo } from './AppLogo';
import {
  UserCheck,
  Plus,
  Search,
  Filter,
  Printer,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  ArrowRight,
  Send,
  MessageSquare,
  QrCode,
  Calendar,
  Users,
  Eye,
  FileText,
  User as UserIcon,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Phone,
  MapPin,
  Share2,
  X,
  Sparkles,
  HelpCircle,
  Star,
  Folder,
  FolderOpen,
  FolderClock,
  Check,
  CreditCard,
  CheckCircle,
  Camera,
  Gift
} from 'lucide-react';
import { QrScannerModal } from './QrScannerModal';

interface ReceptionViewProps {
  currentUser: User;
  currentLang: Language;
  onSelectFamily?: (family: Family) => void;
  onOpenScanner?: () => void;
}

export const ReceptionView: React.FC<ReceptionViewProps> = ({
  currentUser,
  currentLang,
  onSelectFamily,
  onOpenScanner
}) => {
  const isTa = currentLang === 'ta';
  const isGnOfficer = currentUser.Role === 'GN Officer' || currentUser.Role === 'GN_Officer';
  const isReceptionist = currentUser.Role === 'Receptionist';
  const isSuperAdmin = currentUser.Role === 'Super Admin' || currentUser.Role === 'Super_Admin';

  // Data sources
  const [visits, setVisits] = useState<VisitorRecord[]>(() => StorageService.getFilteredVisits(currentUser));
  const allFamilies = StorageService.getFamilies();
  const allMembers = StorageService.getMembers();
  const allOfficers = StorageService.getUsersRaw();
  const divisions = StorageService.getDivisions();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Requirement #3: Officer search filter alongside dropdown
  const [officerSearchQuery, setOfficerSearchQuery] = useState('');
  const [referOfficerSearchQuery, setReferOfficerSearchQuery] = useState('');
  const [qrScannedBanner, setQrScannedBanner] = useState<string | null>(null);
  const [savedSuccessBanner, setSavedSuccessBanner] = useState<string | null>(null);

  // Requirement #5: Date-based folder grouping & 5-day pagination ("முன்" / "பின்")
  const [datePageIndex, setDatePageIndex] = useState<number>(0);
  const DATES_PER_PAGE = 5;
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedVisitForDetail, setSelectedVisitForDetail] = useState<VisitorRecord | null>(null);
  const [selectedVisitForPrint, setSelectedVisitForPrint] = useState<VisitorRecord | null>(null);
  const [selectedVisitForFeedback, setSelectedVisitForFeedback] = useState<VisitorRecord | null>(null);

  // Feedback State
  const [feedbackRating, setFeedbackRating] = useState<SatisfactionRating>(5);
  const [feedbackSpeed, setFeedbackSpeed] = useState<'Fast' | 'Average' | 'Delayed'>('Fast');
  const [feedbackCourtesy, setFeedbackCourtesy] = useState<'Polite' | 'Normal' | 'Rude'>('Polite');
  const [feedbackResolved, setFeedbackResolved] = useState<'Fully' | 'Partially' | 'Pending' | 'Not Resolved'>('Fully');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackChannel, setFeedbackChannel] = useState<'Reception_Desk' | 'Officer_Direct' | 'Citizen_QR_Mobile'>('Reception_Desk');

  // Camera Scanner modal state (Requirement #2)
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // Audio beep feedback for camera scan
  const playScanChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio context might be restricted
    }
  };

  const handleCameraScannedResult = (scannedCode: string, returnedFamily?: Family) => {
    playScanChime();
    const raw = (scannedCode || '').trim();
    let clean = raw.toUpperCase();

    // Parse JSON payload if QR code came from PrintableQrCard: {"qr":"VHR-...", "div":..., "head":...}
    let embeddedHead = '';
    let embeddedDiv = '';
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.qr || parsed.QR || parsed.QR_Number) {
          clean = String(parsed.qr || parsed.QR || parsed.QR_Number).trim().toUpperCase();
        }
        if (parsed.head) embeddedHead = String(parsed.head).trim();
        if (parsed.div) embeddedDiv = String(parsed.div).trim();
      } catch {
        const match = raw.match(/"qr"\s*:\s*"([^"]+)"/i);
        if (match && match[1]) clean = match[1].trim().toUpperCase();
      }
    }

    setLinkedQR(clean);
    setFormSearchQR(clean);
    setRegistrationMode('nic_primary');

    const latestFamilies = StorageService.getFamilies();
    const latestMembers = StorageService.getMembers();
    const fam = returnedFamily || latestFamilies.find(f => f.QR_Number.toUpperCase() === clean);

    if (fam) {
      setMatchedFamily(fam);
      setVillage(fam.Division_Name);
      setAddress(fam.Address);
      setPhone(fam.Telephone || '');

      const famMembers = latestMembers.filter(m => m.QR_Number.toUpperCase() === clean);
      if (famMembers.length > 0) {
        const first = famMembers[0];
        setMatchedMember(first);
        setVisitorName(first.Name);
        setNic(first.NIC_Elder_ID);
        setSearchNIC(first.NIC_Elder_ID);
      } else {
        setVisitorName(fam.Family_Name);
      }
      setQrScannedBanner(
        isTa
          ? `QR (${clean}) வெற்றிகரமாக ஸ்கேன் செய்யப்பட்டு ${fam.Family_Name} குடும்பத் தகவல்கள் தானாக நிரப்பப்பட்டுள்ளன!`
          : `QR (${clean}) scanned! Auto-filled details for ${fam.Family_Name}.`
      );
    } else if (embeddedHead || embeddedDiv) {
      if (embeddedHead) setVisitorName(embeddedHead);
      if (embeddedDiv) setVillage(embeddedDiv);
      setQrScannedBanner(
        isTa
          ? `QR (${clean}) ஸ்கேன் செய்யப்பட்டு தகவல்கள் தானாக நிரப்பப்பட்டுள்ளன!`
          : `QR (${clean}) scanned and auto-filled!`
      );
    }
    setIsCameraModalOpen(false);
    setIsRegisterOpen(true);
  };

  // Requirement #1: NIC as PRIMARY Search & Registration Key
  const [registrationMode, setRegistrationMode] = useState<'nic_primary' | 'qr_fallback'>('nic_primary');
  const [searchNIC, setSearchNIC] = useState('');
  const [formSearchQR, setFormSearchQR] = useState('');
  const [matchedMember, setMatchedMember] = useState<FamilyMember | null>(null);
  const [matchedFamily, setMatchedFamily] = useState<Family | null>(null);

  // Form Fields
  const [visitorName, setVisitorName] = useState('');
  const [nic, setNic] = useState('');
  const [linkedQR, setLinkedQR] = useState('');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState(isGnOfficer ? currentUser.Division : 'Panichchankerni');
  const [address, setAddress] = useState('');
  const [targetOfficerId, setTargetOfficerId] = useState(isReceptionist ? 'officer01' : currentUser.User_ID);
  const [targetSection, setTargetSection] = useState('Social Services / Welfare');
  const [purpose, setPurpose] = useState('');
  const [priority, setPriority] = useState<VisitorRecord['Priority']>('Normal');
  const [autoPrintOnSave, setAutoPrintOnSave] = useState(true);

  // Note & Referral state
  const [noteContent, setNoteContent] = useState('');
  const [referToOfficerId, setReferToOfficerId] = useState('');
  const [referToSection, setReferToSection] = useState('');
  const [completionRemarks, setCompletionRemarks] = useState('');

  const refreshVisits = () => {
    setVisits(StorageService.getFilteredVisits(currentUser));
  };

  const todayStr = new Date().toISOString().substring(0, 10);

  // 8 Official Public Services & Assistance Schemes of Divisional Secretariat Vaharai
  const publicServicesCatalog = [
    {
      id: 'srv_certificates_nic',
      name: isTa
        ? '1. பிறப்பு, இறப்பு, திருமணச் சான்றிதழ் & NIC விண்ணப்பங்கள்'
        : '1. Birth, Death, Marriage Certificates & NIC Applications',
      section: 'Civil Registration & NIC Branch',
      sectionName: isTa ? 'பிறப்பு, இறப்பு, திருமணப் பதிவு & NIC பிரிவு' : 'Civil Registration & NIC Branch',
      defaultPurpose: isTa
        ? 'பிறப்பு, இறப்பு, திருமணச் சான்றிதழ் பிரதிகள் மற்றும் தேசிய அடையாள அட்டை (NIC) விண்ணப்பங்களை வழங்குதல்.'
        : 'Issuing Birth, Death, Marriage certificate copies and National Identity Card (NIC) applications.'
    },
    {
      id: 'srv_gn_certificates',
      name: isTa
        ? '2. வதிவிடச் சான்றிதழ் & வருமானச் சான்றிதழ் (கிராம அலுவலர்)'
        : '2. Residence & Income Certificates (Grama Niladhari)',
      section: 'Grama Niladhari Administration',
      sectionName: isTa ? 'கிராம அலுவலர் நிர்வாகப் பிரிவு' : 'Grama Niladhari Administration',
      defaultPurpose: isTa
        ? 'கிராம அலுவலர் மூலமான வதிவிடச் சான்றிதழ் மற்றும் வருமானச் சான்றிதழ்களை வழங்குதல்.'
        : 'Issuing Residence & Income certificates via Grama Niladhari.'
    },
    {
      id: 'srv_land_permits',
      name: isTa
        ? '3. அரச காணிப் பகிர்வு, காணி அனுமதிப்பத்திரம் & உரிமங்கள் (Deeds)'
        : '3. State Land Alienation, Land Permits & Deeds',
      section: 'Land Branch & Permits',
      sectionName: isTa ? 'காணிப் பிரிவு & அனுமதிப்பத்திரங்கள்' : 'Land Branch & Permits',
      defaultPurpose: isTa
        ? 'அரச காணிகளைப் பகிர்ந்தளித்தல், காணி அனுமதிப்பத்திரங்கள் மற்றும் காணி உரிமங்களை (Land Deeds) வழங்குதல்.'
        : 'State land alienation, land permits and land deeds issuance.'
    },
    {
      id: 'srv_aswesuma_welfare',
      name: isTa
        ? '4. அஸ்வெசும, முதியோர்/மாற்றுத்திறனாளி கொடுப்பனவு & நிவாரணம்'
        : '4. Aswesuma, Elderly, Disability Allowances & Relief',
      section: 'Social Services & Welfare',
      sectionName: isTa ? 'சமூக சேவைகள் & நலன்புரிப் பிரிவு' : 'Social Services & Welfare Branch',
      defaultPurpose: isTa
        ? 'அஸ்வெசும, முதியோர் கொடுப்பனவு, மாற்றுத்திறனாளிக் கொடுப்பனவு மற்றும் அவசரகால நிவாரணங்களை வழங்குதல்.'
        : 'Aswesuma welfare, elderly allowance, disability allowance and emergency relief.'
    },
    {
      id: 'srv_business_trade',
      name: isTa
        ? '5. வணிகப் பெயர் பதிவு & வர்த்தக உரிமங்கள் (Trade Licenses)'
        : '5. Business Name Registration & Trade Licenses',
      section: 'Planning & Trade Branch',
      sectionName: isTa ? 'திட்டமிடல் & வர்த்தகப் பிரிவு' : 'Planning & Trade Branch',
      defaultPurpose: isTa
        ? 'வணிகப் பெயர்களைப் பதிவு செய்தல் மற்றும் வர்த்தக உரிமங்களை வழங்குதல்.'
        : 'Business names registration and trade licenses issuance.'
    },
    {
      id: 'srv_vehicle_revenue',
      name: isTa
        ? '6. மோட்டார் வாகன வருமான வரி அனுமதிப்பத்திரம் (Revenue License)'
        : '6. Motor Vehicle Revenue License',
      section: 'Accounts & Revenue Branch',
      sectionName: isTa ? 'கணக்கு & வருமான வரிப் பிரிவு' : 'Accounts & Revenue Branch',
      defaultPurpose: isTa
        ? 'மோட்டார் வாகனங்களுக்கான வருமான வரி அனுமதிப்பத்திரம் (Vehicle Revenue License) வழங்குதல்.'
        : 'Vehicle Revenue License issuance.'
    },
    {
      id: 'srv_pension_services',
      name: isTa
        ? '7. ஓய்வுபெற்ற அரச ஊழியர் ஓய்வூதியக் கொடுப்பனவு ஆவணங்கள்'
        : '7. Pensions Administration for Retired Civil Servants',
      section: 'Pensions Administration Branch',
      sectionName: isTa ? 'ஓய்வூதியக் கொடுப்பனவுப் பிரிவு' : 'Pensions Administration Branch',
      defaultPurpose: isTa
        ? 'ஓய்வுபெற்ற அரச ஊழியர்களுக்கான ஓய்வூதியக் கொடுப்பனவு ஆவணங்களை நிர்வகித்தல்.'
        : 'Pensions payment documentation for retired public servants.'
    },
    {
      id: 'srv_building_permits',
      name: isTa
        ? '8. கட்டட திட்ட அனுமதி & ஒப்புதல் (குடியிருப்பு/வணிகம்)'
        : '8. Building Planning Permits & Approvals (Residential/Commercial)',
      section: 'Building & Planning Approvals',
      sectionName: isTa ? 'கட்டட திட்டமிடல் & பொறியியல் பிரிவு' : 'Building & Planning Approvals Branch',
      defaultPurpose: isTa
        ? 'குடியிருப்பு மற்றும் வணிகக் கட்டடங்களுக்கான திட்ட அனுமதி மற்றும் ஒப்புதல் வழங்குதல்.'
        : 'Building planning permits and approvals for residential and commercial buildings.'
    }
  ];

  // Department Sections
  const departmentSections = [
    { id: 'Civil Registration & NIC Branch', name: isTa ? 'பிறப்பு, இறப்பு, திருமணப் பதிவு & NIC பிரிவு' : 'Civil Registration & NIC Branch' },
    { id: 'Grama Niladhari Administration', name: isTa ? 'கிராம அலுவலர் நிர்வாகப் பிரிவு (வதிவிடம் & வருமானம்)' : 'Grama Niladhari Administration (Residence & Income)' },
    { id: 'Land Branch & Permits', name: isTa ? 'காணிப் பிரிவு & அனுமதிப்பத்திரங்கள் (அரச காணி & உரிமங்கள்)' : 'Land Branch & Permits (State Land & Deeds)' },
    { id: 'Social Services & Welfare', name: isTa ? 'சமூக சேவைகள் & நலன்புரிப் பிரிவு (அஸ்வெசும, முதியோர் & நிவாரணம்)' : 'Social Services & Welfare (Aswesuma, Allowances & Relief)' },
    { id: 'Planning & Trade Branch', name: isTa ? 'திட்டமிடல் & வர்த்தகப் பிரிவு (வணிகப் பதிவு & வர்த்தக உரிமம்)' : 'Planning & Trade Branch (Business Registration & Licenses)' },
    { id: 'Accounts & Revenue Branch', name: isTa ? 'கணக்கு & வருமான வரிப் பிரிவு (மோட்டார் வாகன அனுமதிப்பத்திரம்)' : 'Accounts & Revenue Branch (Vehicle Revenue License)' },
    { id: 'Pensions Administration Branch', name: isTa ? 'ஓய்வூதியக் கொடுப்பனவுப் பிரிவு (அரச ஊழியர் ஓய்வூதியம்)' : 'Pensions Administration Branch (Civil Servants)' },
    { id: 'Building & Planning Approvals', name: isTa ? 'கட்டட திட்டமிடல் & பொறியியல் பிரிவு (திட்ட அனுமதி & ஒப்புதல்)' : 'Building & Planning Approvals (Permits & Approvals)' },
    { id: 'Divisional Secretariat / Executive', name: isTa ? 'பிரதேச செயலாளர் / முதன்மை நிறைவேற்றுப் பிரிவு' : 'Divisional Secretary / Executive Branch' }
  ];

  const purposePresets = [
    isTa ? 'பிறப்பு, இறப்பு, திருமணச் சான்றிதழ் பிரதிகள் மற்றும் NIC விண்ணப்பம்' : 'Birth, death, marriage certificate copies & NIC applications',
    isTa ? 'கிராம அலுவலர் மூலமான வதிவிடச் சான்றிதழ் மற்றும் வருமானச் சான்றிதழ்' : 'Residence and income certificates via Grama Niladhari',
    isTa ? 'அரச காணிப் பகிர்வு, காணி அனுமதிப்பத்திரம் மற்றும் காணி உரிமம் (Land Deeds)' : 'State land alienation, land permits and deeds',
    isTa ? 'அஸ்வெசும, முதியோர்/மாற்றுத்திறனாளிக் கொடுப்பனவு மற்றும் அவசரகால நிவாரணம்' : 'Aswesuma, elderly/disability allowances and emergency relief',
    isTa ? 'வணிகப் பெயர் பதிவு மற்றும் வர்த்தக உரிமங்கள் (Trade Licenses)' : 'Business names registration and trade licenses',
    isTa ? 'மோட்டார் வாகனங்களுக்கான வருமான வரி அனுமதிப்பத்திரம் (Revenue License)' : 'Vehicle Revenue License issuance',
    isTa ? 'ஓய்வுபெற்ற அரச ஊழியர்களுக்கான ஓய்வூதியக் கொடுப்பனவு ஆவணங்கள்' : 'Pension payment documentation for retired civil servants',
    isTa ? 'குடியிருப்பு மற்றும் வணிகக் கட்டடங்களுக்கான திட்ட அனுமதி மற்றும் ஒப்புதல்' : 'Planning permits and approvals for residential & commercial buildings'
  ];

  // REQUIREMENT #1: Primary NIC Lookup & Auto-fill Logic
  // A family QR code may have 5 members, so NIC uniquely identifies the individual!
  const handleLookupByNIC = (inputVal: string) => {
    const cleanNIC = inputVal.trim();
    setSearchNIC(cleanNIC);
    setNic(cleanNIC);

    if (cleanNIC.length >= 5) {
      const foundMember = allMembers.find(
        m => m.NIC_Elder_ID.trim().toLowerCase() === cleanNIC.toLowerCase()
      );

      if (foundMember) {
        setMatchedMember(foundMember);
        setVisitorName(foundMember.Name);

        // Find linked family
        const foundFamily = allFamilies.find(
          f => f.QR_Number.toUpperCase() === foundMember.QR_Number.toUpperCase()
        );

        if (foundFamily) {
          setMatchedFamily(foundFamily);
          setLinkedQR(foundFamily.QR_Number);
          setVillage(foundFamily.Division_Name);
          setAddress(foundFamily.Address);
          setPhone(foundFamily.Telephone || '');
        } else {
          setLinkedQR(foundMember.QR_Number);
        }
      } else {
        setMatchedMember(null);
        setMatchedFamily(null);
      }
    } else {
      setMatchedMember(null);
      setMatchedFamily(null);
    }
  };

  // Secondary Fallback: Lookup by Family QR code and pick from the 5 members
  const handleLookupByQR = (inputVal: string) => {
    const raw = (inputVal || '').trim();
    let cleanQR = raw.toUpperCase();
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.qr || parsed.QR || parsed.QR_Number) {
          cleanQR = String(parsed.qr || parsed.QR || parsed.QR_Number).trim().toUpperCase();
        }
      } catch {
        const match = raw.match(/"qr"\s*:\s*"([^"]+)"/i);
        if (match && match[1]) cleanQR = match[1].trim().toUpperCase();
      }
    }

    setFormSearchQR(cleanQR);
    setLinkedQR(cleanQR);

    if (cleanQR.length >= 4) {
      const latestFamilies = StorageService.getFamilies();
      const latestMembers = StorageService.getMembers();
      const fam = latestFamilies.find(f => f.QR_Number.toUpperCase() === cleanQR);
      if (fam) {
        setMatchedFamily(fam);
        setVillage(fam.Division_Name);
        setAddress(fam.Address);
        setPhone(fam.Telephone || '');

        const famMembers = latestMembers.filter(m => m.QR_Number.toUpperCase() === cleanQR);
        if (famMembers.length > 0) {
          const first = famMembers[0];
          setMatchedMember(first);
          setVisitorName(first.Name);
          setNic(first.NIC_Elder_ID);
          setSearchNIC(first.NIC_Elder_ID);
        } else {
          setVisitorName(fam.Family_Name);
        }
      } else {
        setMatchedFamily(null);
        setMatchedMember(null);
      }
    }
  };

  // Filtering visits (Requirement 02: Except Receptionist and Admin, only show visits assigned to this officer)
  const processedVisits = useMemo(() => {
    let list = [...visits];
    if (!isReceptionist && !isSuperAdmin) {
      list = list.filter(
        v =>
          v.Target_Officer_ID === currentUser.User_ID ||
          (v.Officer_Notes && v.Officer_Notes.some(n => n.Referred_To_Officer_ID === currentUser.User_ID))
      );
    }
    if (selectedSectionFilter !== 'ALL') {
      list = list.filter(v => v.Target_Section === selectedSectionFilter);
    }
    if (selectedStatusFilter !== 'ALL') {
      list = list.filter(v => v.Status === selectedStatusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(v =>
        v.Token_Number.toLowerCase().includes(q) ||
        v.Visitor_Name.toLowerCase().includes(q) ||
        v.NIC.toLowerCase().includes(q) ||
        (v.QR_Number && v.QR_Number.toLowerCase().includes(q)) ||
        v.Target_Officer_Name.toLowerCase().includes(q) ||
        v.Target_Section.toLowerCase().includes(q) ||
        v.Village_Division.toLowerCase().includes(q) ||
        v.Purpose.toLowerCase().includes(q) ||
        v.Date.includes(q)
      );
    }
    return list;
  }, [visits, selectedSectionFilter, selectedStatusFilter, searchQuery, isReceptionist, isSuperAdmin, currentUser.User_ID]);

  // Requirement #5: Extract all distinct dates, sorted descending
  const distinctDates = useMemo(() => {
    const datesSet = new Set<string>();
    datesSet.add(todayStr);
    visits.forEach(v => {
      if (v.Date) datesSet.add(v.Date);
    });
    return Array.from(datesSet).sort((a, b) => b.localeCompare(a));
  }, [visits, todayStr]);

  const totalDatePages = Math.ceil(distinctDates.length / DATES_PER_PAGE) || 1;
  const current5Dates = useMemo(() => {
    const start = datePageIndex * DATES_PER_PAGE;
    return distinctDates.slice(start, start + DATES_PER_PAGE);
  }, [distinctDates, datePageIndex]);

  const isFolderExpanded = (date: string) => {
    if (expandedFolders[date] !== undefined) {
      return expandedFolders[date];
    }
    return date === todayStr;
  };

  const toggleFolder = (date: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [date]: !isFolderExpanded(date)
    }));
  };

  // Submit new visit (Supports both "Save Only" and "Save & Print")
  const processVisitRegistration = (shouldPrint: boolean) => {
    if (!visitorName.trim()) {
      alert(isTa ? 'பயனாளி பெயரை உள்ளிடவும்.' : 'Please enter visitor name.');
      return;
    }
    if (!purpose.trim()) {
      alert(isTa ? 'வருகையின் நோக்கத்தை உள்ளிடவும்.' : 'Please enter purpose of visit.');
      return;
    }

    const targetOfficer = allOfficers.find(u => u.User_ID === targetOfficerId);
    const newVisit = StorageService.addVisit(currentUser, {
      QR_Number: linkedQR.trim() ? linkedQR.trim().toUpperCase() : undefined,
      Visitor_Name: visitorName.trim(),
      NIC: nic.trim(),
      Telephone: phone.trim(),
      Village_Division: village,
      Address: address.trim(),
      Target_Officer_ID: targetOfficerId,
      Target_Officer_Name: targetOfficer ? targetOfficer.Name : targetOfficerId,
      Target_Section: targetSection,
      Purpose: purpose.trim(),
      Priority: priority
    });

    refreshVisits();
    setIsRegisterOpen(false);

    // Reset Form
    setSearchNIC('');
    setFormSearchQR('');
    setMatchedMember(null);
    setMatchedFamily(null);
    setVisitorName('');
    setNic('');
    setLinkedQR('');
    setPhone('');
    setAddress('');
    setPurpose('');
    setPriority('Normal');

    if (shouldPrint) {
      setSelectedVisitForPrint(newVisit);
    } else {
      setSavedSuccessBanner(
        isTa
          ? `டோக்கன் ${newVisit.Token_Number} (${newVisit.Visitor_Name}) வெற்றிகரமாகச் சேமிக்கப்பட்டது!`
          : `Token ${newVisit.Token_Number} (${newVisit.Visitor_Name}) saved successfully!`
      );
      setTimeout(() => setSavedSuccessBanner(null), 5000);
    }
  };

  const handleSaveVisit = (e: React.FormEvent) => {
    e.preventDefault();
    processVisitRegistration(autoPrintOnSave);
  };

  const handleUpdateStatus = (visitId: string, status: VisitStatus, remarks?: string) => {
    StorageService.updateVisitStatus(currentUser, visitId, status, remarks);
    refreshVisits();
    if (selectedVisitForDetail && selectedVisitForDetail.Visit_ID === visitId) {
      setSelectedVisitForDetail(prev => prev ? { ...prev, Status: status, Resolution_Remarks: remarks || prev.Resolution_Remarks } : null);
    }
  };

  const handleAddNoteAndRefer = () => {
    if (!selectedVisitForDetail || !noteContent.trim()) {
      alert(isTa ? 'குறிப்புரையை உள்ளிடவும்.' : 'Please enter note content.');
      return;
    }
    const refOfficer = allOfficers.find(u => u.User_ID === referToOfficerId);
    const updated = StorageService.addVisitOfficerNote(currentUser, selectedVisitForDetail.Visit_ID, {
      content: noteContent.trim(),
      actionRecommended: completionRemarks.trim() || undefined,
      referredOfficerId: referToOfficerId || undefined,
      referredOfficerName: refOfficer ? refOfficer.Name : undefined,
      referredSection: referToSection || undefined
    });
    refreshVisits();
    setSelectedVisitForDetail(updated);
    setNoteContent('');
    setReferToOfficerId('');
    setReferToSection('');
    setCompletionRemarks('');
  };

  const handleSaveCitizenFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisitForFeedback) return;
    const ratingLabels: Record<number, string> = {
      5: isTa ? 'மிகவும் திருப்தி' : 'Very Satisfied',
      4: isTa ? 'திருப்தி' : 'Satisfied',
      3: isTa ? 'நடுத்தரம்' : 'Neutral',
      2: isTa ? 'திருப்தியற்றது' : 'Unsatisfied',
      1: isTa ? 'மிகவும் மோசம்' : 'Very Poor'
    };
    StorageService.recordCitizenFeedback(currentUser, selectedVisitForFeedback.Visit_ID, {
      Rating: feedbackRating,
      Rating_Label: ratingLabels[feedbackRating],
      Service_Speed: feedbackSpeed,
      Staff_Courtesy: feedbackCourtesy,
      Issue_Resolved: feedbackResolved,
      Feedback_Comment: feedbackComment.trim() || undefined,
      Submitted_At: new Date().toISOString(),
      Submitted_Via: feedbackChannel
    });
    refreshVisits();
    setSelectedVisitForFeedback(null);
    setFeedbackComment('');
  };

  const getStatusBadge = (status: VisitStatus) => {
    switch (status) {
      case 'Waiting':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
            <span>{isTa ? 'காத்திருக்கிறார்' : 'Waiting'}</span>
          </span>
        );
      case 'In Discussion':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-900 border border-sky-300">
            <MessageSquare className="w-3 h-3 text-sky-600" />
            <span>{isTa ? 'கலந்துரையாடலில்' : 'In Discussion'}</span>
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>{isTa ? 'நிறைவுற்றது' : 'Completed'}</span>
          </span>
        );
      case 'Referred':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
            <Share2 className="w-3 h-3 text-purple-600" />
            <span>{isTa ? 'மாற்றப்பட்டது' : 'Referred'}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Official Logo */}
      {savedSuccessBanner && (
        <div className="p-3.5 bg-emerald-50 border-2 border-emerald-500 text-emerald-950 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-between shadow-xs no-print">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{savedSuccessBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSavedSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-4 sm:p-6 text-white shadow-xs no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <AppLogo size="lg" className="shrink-0 ring-2 ring-emerald-500/50" />
            <div className="space-y-0.5 min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                {isTa
                  ? 'பிரதேச செயலகம் கோறளைப்பற்று வடக்கு வாகரை • வரவேற்புப் பிரிவு'
                  : 'Divisional Secretariat Koralaipattu North Vaharai • Front Desk Reception'}
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white truncate">
                {isTa ? 'பயனாளிகள் வரவேற்பு & டோக்கன் சேவை' : 'Citizen Reception & Token Queue'}
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                {isTa
                  ? 'தேசிய அடையாள அட்டை (NIC) மற்றும் கெமரா QR ஸ்கேன் அடிப்படையிலான தானியங்கித் தகவல்கள் நிரப்புதல் மற்றும் வருகைப் பதிவு.'
                  : 'NIC-primary & Camera QR scan citizen check-in with automated data auto-fill and linked Family QR registration.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-auto">
            {/* Live Camera QR Scanner option (Requirement #5) */}
            <button
              onClick={() => setIsCameraModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-lg shadow-sm border border-slate-700 transition-all cursor-pointer"
              title={isTa ? 'கெமரா QR ஸ்கேனர் மூலம் ஸ்கேன் செய்க' : 'Scan Beneficiary QR using Live Camera'}
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>{isTa ? 'கெமரா QR ஸ்கேனர்' : 'Camera QR Scanner'}</span>
            </button>

            <button
              onClick={() => {
                setRegistrationMode('nic_primary');
                setQrScannedBanner(null);
                setIsRegisterOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isTa ? '+ புதிய பயனாளி வருகை (NIC / QR)' : '+ Register Visitor (NIC / QR)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Role Scoping Notice (Requirement #1 & #2) */}
      {isReceptionist && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-700 shrink-0" />
            <span>
              <strong>{isTa ? 'வரவேற்பு உத்தியோகத்தர் பயன்முறை: ' : 'Receptionist Access: '}</strong>
              {isTa ? 'வரவேற்புத் தகவல் மற்றும் பயனாளி வருகைப் பதிவுகள் மட்டுமே உங்களுக்கு காண்பிக்கப்படும்.' : 'Access is restricted strictly to Reception & Visitor Token information.'}
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-blue-200 text-blue-900 px-2 py-0.5 rounded">
            {currentUser.Name}
          </span>
        </div>
      )}

      {/* Requirement #2: Except Receptionist and Admin, other officers ONLY see visitors assigned to meet them */}
      {!isReceptionist && !isSuperAdmin && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              <strong>{isTa ? 'உத்தியோகத்தர் வரவேற்புப் பார்வை: ' : 'Officer Reception Queue: '}</strong>
              {isTa
                ? `உங்களை (${currentUser.Name}) சந்திக்க வந்துள்ள பயனாளிகளின் வருகைப் பதிவுகள் மட்டுமே இங்கு காண்பிக்கப்படுகின்றன.`
                : `Showing strictly visitors assigned or referred to meet you (${currentUser.Name}).`}
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
            {processedVisits.length} {isTa ? 'வருகைகள்' : 'visits'}
          </span>
        </div>
      )}

      {/* Date-Wise Folder Navigation Bar with 5-Day Window ("முன்" / "பின்") */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
              <FolderClock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>{isTa ? 'திகதியடிப்படையில் கோப்புகள் (Date Folders)' : 'Date-Wise Visitor Folders'}</span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {isTa ? 'முன்பார்வை 05 நாள் தகவல்' : '5-Day Window'}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                {isTa
                  ? `மொத்தம் ${distinctDates.length} நாட்கள் பதிவுகள். "முன் / பின்" மூலம் மற்ற நாட்களைப் பார்வையிடலாம்.`
                  : `Total ${distinctDates.length} recorded dates. Navigate older/newer dates via Previous / Next.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
              {isTa ? 'பக்கம் ' : 'Window '}
              <span className="text-slate-900 font-bold">{datePageIndex + 1}</span> / {totalDatePages}
            </div>

            <button
              onClick={() => setDatePageIndex(prev => Math.min(prev + 1, totalDatePages - 1))}
              disabled={datePageIndex >= totalDatePages - 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors cursor-pointer"
              title={isTa ? 'முந்தைய 05 நாட்கள் (முன்)' : 'Older 5 Days (Previous)'}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{isTa ? 'முன்' : 'Previous'}</span>
            </button>

            <button
              onClick={() => setDatePageIndex(prev => Math.max(prev - 1, 0))}
              disabled={datePageIndex === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors cursor-pointer"
              title={isTa ? 'அடுத்த 05 நாட்கள் (பின்)' : 'Newer 5 Days (Next)'}
            >
              <span>{isTa ? 'பின்' : 'Next'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs pt-1">
          <div className="sm:col-span-6 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isTa ? 'தேசிய அடையாள அட்டை, பெயர், டோக்கன், QR மூலம் தேடுக...' : 'Search NIC, name, token, QR code, or purpose...'}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedSectionFilter}
              onChange={e => setSelectedSectionFilter(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">{isTa ? 'அனைத்துப் பிரிவுகளும்' : 'All Department Sections'}</option>
              {departmentSections.map(sec => (
                <option key={sec.id} value={sec.id}>{sec.name}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">{isTa ? 'அனைத்து நிலைகளும்' : 'All Statuses'}</option>
              <option value="Waiting">{isTa ? 'காத்திருப்போர்' : 'Waiting'}</option>
              <option value="In Discussion">{isTa ? 'கலந்துரையாடல்' : 'In Discussion'}</option>
              <option value="Completed">{isTa ? 'நிறைவுற்றவை' : 'Completed'}</option>
              <option value="Referred">{isTa ? 'மாற்றப்பட்டவை' : 'Referred'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* DATE FOLDERS LIST: Exactly 5 Dates Previewed */}
      <div className="space-y-4">
        {current5Dates.map(date => {
          const dateVisits = processedVisits.filter(v => v.Date === date);
          const isToday = date === todayStr;
          const expanded = isFolderExpanded(date);
          const waitingCount = dateVisits.filter(v => v.Status === 'Waiting').length;
          const completedCount = dateVisits.filter(v => v.Status === 'Completed').length;
          const inDiscussionCount = dateVisits.filter(v => v.Status === 'In Discussion').length;

          const dateObj = new Date(date);
          const formattedDateText = isNaN(dateObj.getTime())
            ? date
            : dateObj.toLocaleDateString(isTa ? 'ta-LK' : 'en-GB', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });

          return (
            <div
              key={date}
              className={`bg-white rounded-xl border transition-all overflow-hidden ${
                isToday
                  ? 'border-emerald-300 shadow-sm ring-1 ring-emerald-200'
                  : 'border-slate-200 shadow-2xs hover:border-slate-300'
              }`}
            >
              <div
                onClick={() => toggleFolder(date)}
                className={`p-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                  isToday ? 'bg-emerald-50/60 hover:bg-emerald-50' : 'bg-slate-50/70 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-2xs shrink-0 ${
                      isToday ? 'bg-emerald-600' : 'bg-slate-700'
                    }`}
                  >
                    {expanded ? <FolderOpen className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 font-mono">
                        {date}
                      </span>
                      {isToday && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white font-mono uppercase tracking-wide">
                          {isTa ? 'இன்றைய திகதி' : 'Today'}
                        </span>
                      )}
                      <span className="text-xs text-slate-500 font-medium truncate">
                        ({formattedDateText})
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-1 font-mono">
                      <span>{isTa ? 'மொத்த வருகை: ' : 'Total: '}<strong>{dateVisits.length}</strong></span>
                      {waitingCount > 0 && (
                        <span className="text-amber-700 font-bold">
                          • {waitingCount} {isTa ? 'காத்திருப்பு' : 'Waiting'}
                        </span>
                      )}
                      {inDiscussionCount > 0 && (
                        <span className="text-sky-700 font-semibold">
                          • {inDiscussionCount} {isTa ? 'கலந்துரையாடல்' : 'In Discussion'}
                        </span>
                      )}
                      {completedCount > 0 && (
                        <span className="text-emerald-700 font-semibold">
                          • {completedCount} {isTa ? 'நிறைவு' : 'Completed'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                    {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {expanded && (
                <div className="border-t border-slate-200 p-4 space-y-3 bg-white animate-in slide-in-from-top-1 duration-150">
                  {dateVisits.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      <Folder className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                      <p>{isTa ? 'இந்த திகதியில் வருகைப் பதிவுகள் எதுவும் இல்லை.' : 'No visitor records found for this date.'}</p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2.5 font-mono">{isTa ? 'டோக்கன்' : 'Token'}</th>
                            <th className="px-3 py-2.5">{isTa ? 'நேரம்' : 'Time'}</th>
                            <th className="px-3 py-2.5">{isTa ? 'பயனாளி & அடையாள அட்டை (NIC)' : 'Visitor & NIC'}</th>
                            <th className="px-3 py-2.5">{isTa ? 'குடும்ப QR & பிரிவு' : 'Family QR & Village'}</th>
                            <th className="px-3 py-2.5">{isTa ? 'உத்தியோகத்தர் & பிரிவு' : 'Officer & Section'}</th>
                            <th className="px-3 py-2.5">{isTa ? 'நோக்கம்' : 'Purpose'}</th>
                            <th className="px-3 py-2.5 text-center">{isTa ? 'நிலை' : 'Status'}</th>
                            <th className="px-3 py-2.5 text-right">{isTa ? 'செயற்பாடுகள்' : 'Actions'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dateVisits.map(visit => {
                            const isWaiting = visit.Status === 'Waiting';
                            const isInDiscussion = visit.Status === 'In Discussion';
                            const isCompleted = visit.Status === 'Completed';

                            return (
                              <tr key={visit.Visit_ID} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-3 py-2.5 font-mono whitespace-nowrap">
                                  <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded bg-slate-900 text-white font-mono shadow-2xs">
                                    {visit.Token_Number}
                                  </span>
                                </td>

                                <td className="px-3 py-2.5 font-mono text-slate-600 whitespace-nowrap">
                                  {visit.Time}
                                </td>

                                {/* Visitor Name & NIC */}
                                <td className="px-3 py-2.5">
                                  <div className="font-bold text-slate-900">{visit.Visitor_Name}</div>
                                  <div className="text-[11px] text-emerald-800 font-mono font-semibold flex items-center gap-1.5 mt-0.5">
                                    <span>NIC: {visit.NIC || '-'}</span>
                                    {visit.Telephone && <span>• 📞 {visit.Telephone}</span>}
                                  </div>
                                </td>

                                {/* Family QR Number & Village */}
                                <td className="px-3 py-2.5">
                                  {visit.QR_Number ? (
                                    <button
                                      onClick={() => {
                                        const fam = allFamilies.find(f => f.QR_Number.toUpperCase() === visit.QR_Number?.toUpperCase());
                                        if (fam && onSelectFamily) onSelectFamily(fam);
                                      }}
                                      className="font-mono text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded text-[11px] font-bold border border-emerald-200 inline-flex items-center gap-1 cursor-pointer"
                                      title={isTa ? 'குடும்ப விபரங்களைப் பார்க்க' : 'View Family Dossier'}
                                    >
                                      <QrCode className="w-3 h-3 text-emerald-600" />
                                      <span>{visit.QR_Number}</span>
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">No Family QR</span>
                                  )}
                                  <div className="text-[11px] text-slate-600 mt-0.5 font-medium">{visit.Village_Division}</div>
                                </td>

                                <td className="px-3 py-2.5">
                                  <div className="font-semibold text-slate-900">{visit.Target_Officer_Name}</div>
                                  <div className="text-[10px] text-slate-500">{visit.Target_Section}</div>
                                </td>

                                <td className="px-3 py-2.5 max-w-xs">
                                  <p className="line-clamp-2 text-slate-700 leading-snug">{visit.Purpose}</p>
                                </td>

                                <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                  {getStatusBadge(visit.Status)}
                                </td>

                                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => setSelectedVisitForPrint(visit)}
                                      title={isTa ? 'டோக்கன் அச்சிடுக' : 'Print Slip'}
                                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                    </button>

                                    {isWaiting && (
                                      <button
                                        onClick={() => handleUpdateStatus(visit.Visit_ID, 'In Discussion')}
                                        className="px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                      >
                                        {isTa ? 'அழைக்க' : 'Attend'}
                                      </button>
                                    )}

                                    {isInDiscussion && (
                                      <button
                                        onClick={() => handleUpdateStatus(visit.Visit_ID, 'Completed', 'Consultation finished')}
                                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                      >
                                        {isTa ? 'நிறைவு' : 'Done'}
                                      </button>
                                    )}

                                    <button
                                      onClick={() => setSelectedVisitForDetail(visit)}
                                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>{isTa ? 'விபரம்' : 'Details'}</span>
                                    </button>

                                    {visit.Feedback ? (
                                      <span className="px-1.5 py-0.5 bg-amber-50 border border-amber-200 rounded text-[10px] font-bold text-amber-900 inline-flex items-center gap-0.5">
                                        <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                                        <span>{visit.Feedback.Rating}★</span>
                                      </span>
                                    ) : (isCompleted || isInDiscussion) ? (
                                      <button
                                        onClick={() => {
                                          setSelectedVisitForFeedback(visit);
                                          setFeedbackRating(5);
                                          setFeedbackComment('');
                                        }}
                                        className="px-1.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded text-[10px] font-bold cursor-pointer"
                                        title={isTa ? 'சேவை மதிப்பீடு' : 'Rate'}
                                      >
                                        ★
                                      </button>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs no-print">
        <div className="text-slate-600 font-mono">
          {isTa
            ? `முன்பார்வை 05 நாட்கள் விபரம்: பக்கம் ${datePageIndex + 1} / ${totalDatePages} (மொத்தம் ${distinctDates.length} நாட்கள்)`
            : `Showing 5-day window: Page ${datePageIndex + 1} of ${totalDatePages} (${distinctDates.length} recorded dates total)`}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDatePageIndex(prev => Math.min(prev + 1, totalDatePages - 1))}
            disabled={datePageIndex >= totalDatePages - 1}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{isTa ? 'முன் (Older Dates)' : 'Previous 5 Days'}</span>
          </button>
          <button
            onClick={() => setDatePageIndex(prev => Math.max(prev - 1, 0))}
            disabled={datePageIndex === 0}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1"
          >
            <span>{isTa ? 'பின் (Newer Dates)' : 'Next 5 Days'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* MODAL 1: Register New Visitor Modal - NIC PRIMARY (Requirement #1) */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AppLogo size="sm" className="ring-1 ring-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white">
                    {isTa ? 'பயனாளி வருகைப்பதிவு & டோக்கன் வழங்கல்' : 'Register Citizen Arrival & Issue Token'}
                  </h3>
                  <p className="text-[11px] text-emerald-400 font-medium">
                    {isTa ? 'தேசிய அடையாள அட்டை (NIC) பிரதான தேடல் விசை' : 'Primary Lookup: National Identity Card (NIC)'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsRegisterOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVisit} className="p-5 overflow-y-auto space-y-4 text-xs">
              {qrScannedBanner && (
                <div className="p-3 bg-emerald-100 border-2 border-emerald-500 text-emerald-950 rounded-xl font-bold flex items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                    <span>{qrScannedBanner}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQrScannedBanner(null)}
                    className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* REQUIREMENT #1: PRIMARY SEARCH BOX - NATIONAL IDENTITY CARD (NIC) */}
              <div className="p-4 bg-emerald-50/80 border-2 border-emerald-400 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                    <CreditCard className="w-4 h-4 text-emerald-700" />
                    <span>{isTa ? '1. தேசிய அடையாள அட்டை (NIC) இலக்கத்தை உள்ளிடுக (பிரதானம்):' : '1. Enter National Identity Card (NIC) Number (Primary):'}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {/* Live Camera Scanner button right inside registration modal (Requirement #2) */}
                    <button
                      type="button"
                      onClick={() => setIsCameraModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer shadow-2xs"
                      title={isTa ? 'கெமரா மூலம் குடும்ப QR ஐ ஸ்கேன் செய்க' : 'Open live camera to scan Family QR'}
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isTa ? 'கெமரா QR ஸ்கேன்' : 'Camera QR Scan'}</span>
                    </button>
                    <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                      {isTa ? 'தானியங்கி நிரப்புதல்' : 'Auto-Fill'}
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    autoFocus
                    value={searchNIC}
                    onChange={e => handleLookupByNIC(e.target.value)}
                    placeholder={isTa ? 'உதா: 198061204590 அல்லது 746123456V' : 'e.g. 198061204590 or 746123456V'}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-emerald-300 rounded-lg font-mono text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                  {searchNIC && (
                    <button
                      type="button"
                      onClick={() => handleLookupByNIC('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Auto-fill feedback banner */}
                {matchedMember ? (
                  <div className="p-3 bg-white rounded-lg border border-emerald-300 text-slate-800 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{isTa ? 'தேசிய அடையாள அட்டை கண்டுபிடிக்கப்பட்டது! (விபரங்கள் தானாக நிரப்பப்பட்டன)' : 'NIC Found! Auto-filled profile'}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                        {matchedMember.Relationship}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">{isTa ? 'பயனாளி பெயர்' : 'Visitor Name'}</span>
                        <strong className="text-slate-900">{matchedMember.Name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">{isTa ? 'குடும்ப QR எண்' : 'Family QR'}</span>
                        <strong className="text-emerald-700 font-mono">{matchedMember.QR_Number}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">{isTa ? 'கிராமப் பிரிவு' : 'GN Division'}</span>
                        <strong className="text-slate-800">{matchedFamily?.Division_Name || village}</strong>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[10px]">{isTa ? 'முகவரி' : 'Address'}</span>
                        <span className="text-slate-700">{matchedFamily?.Address || address}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">{isTa ? 'தொலைபேசி' : 'Phone'}</span>
                        <span className="text-slate-800 font-mono">{matchedFamily?.Telephone || phone || '-'}</span>
                      </div>
                    </div>
                  </div>
                ) : searchNIC.length >= 5 ? (
                  <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px] flex items-center justify-between">
                    <span>
                      {isTa
                        ? 'புதிய பயனாளி (பதிவேட்டில் இல்லை). கீழே உள்ள படிவத்தில் விபரங்களை நேரடியாக உள்ளிடவும்.'
                        : 'New visitor (not registered in database). Fill in details manually below.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRegistrationMode('qr_fallback')}
                      className="font-bold underline text-amber-800 shrink-0 ml-2 cursor-pointer"
                    >
                      {isTa ? 'குடும்ப QR மூலம் தேட' : 'Lookup QR instead'}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-1">
                    <span>
                      {isTa
                        ? 'குறிப்பு: ஒரு குடும்ப QR இலக்கத்தில் 05 உறுப்பினர்கள் வரை இருக்கலாம். எனவே தேசிய அடையாள அட்டை (NIC) தனிநபரைத் துல்லியமாக அடையாளம் காணும்.'
                        : 'A family QR covers up to 5 members. National Identity Card (NIC) directly identifies the visiting citizen.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRegistrationMode(registrationMode === 'qr_fallback' ? 'nic_primary' : 'qr_fallback')}
                      className="text-emerald-700 font-semibold underline shrink-0 cursor-pointer self-start sm:self-auto"
                    >
                      {registrationMode === 'qr_fallback'
                        ? (isTa ? 'NIC முறைக்கு மாறுக' : 'Switch to NIC')
                        : (isTa ? 'அல்லது குடும்ப QR மூலம் தேடுக' : 'Or search by Family QR')}
                    </button>
                  </div>
                )}

                {/* Interactive Member Chooser: Up to 5 members in a single family QR */}
                {matchedFamily && (
                  <div className="p-3 bg-white rounded-lg border border-emerald-300 space-y-2 mt-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isTa ? 'இக்குடும்ப QR இலக்கத்தில் உள்ள உறுப்பினர்கள் (5 பேர் வரை) - வந்தவரைத் தெரிவுசெய்க:' : 'Family Members under this QR (Up to 5) - Select Visitor:'}</span>
                      </span>
                      <span className="font-mono text-emerald-800 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {matchedFamily.QR_Number}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      {allMembers
                        .filter(m => m.QR_Number.toUpperCase() === matchedFamily.QR_Number.toUpperCase())
                        .map(m => {
                          const isSelected = matchedMember?.NIC_Elder_ID === m.NIC_Elder_ID;
                          return (
                            <button
                              type="button"
                              key={m.NIC_Elder_ID}
                              onClick={() => {
                                setMatchedMember(m);
                                setVisitorName(m.Name);
                                setNic(m.NIC_Elder_ID);
                                setSearchNIC(m.NIC_Elder_ID);
                              }}
                              className={`p-2 rounded-lg text-left border transition-all cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                  : 'bg-slate-50 hover:bg-emerald-50 border-slate-200 text-slate-800'
                              }`}
                            >
                              <div className="min-w-0 pr-1">
                                <div className="font-bold text-xs truncate">{m.Name}</div>
                                <div className={`text-[10px] font-mono ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                                  NIC: {m.NIC_Elder_ID} • {m.Relationship}
                                </div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 shrink-0 text-white" />}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Secondary QR Lookup Accordion if needed */}
              {registrationMode === 'qr_fallback' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                      <QrCode className="w-3.5 h-3.5 text-slate-600" />
                      <span>{isTa ? 'குடும்ப QR எண் மூலம் உறுப்பினரைத் தெரிவுசெய்க:' : 'Select Member via Family QR Code:'}</span>
                    </span>
                  </div>
                  <input
                    type="text"
                    value={formSearchQR}
                    onChange={e => handleLookupByQR(e.target.value)}
                    placeholder="e.g. VHR-PCK-001"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs uppercase"
                  />
                  {matchedFamily && (
                    <div className="p-2 bg-white rounded border border-slate-200 space-y-1">
                      <div className="text-[11px] font-semibold text-slate-700">{isTa ? 'குடும்பத்தில் வந்தவர் யார்?:' : 'Select visiting member:'}</div>
                      <select
                        value={matchedMember?.NIC_Elder_ID || ''}
                        onChange={e => {
                          const m = allMembers.find(mem => mem.NIC_Elder_ID === e.target.value);
                          if (m) {
                            setMatchedMember(m);
                            setVisitorName(m.Name);
                            setNic(m.NIC_Elder_ID);
                            setSearchNIC(m.NIC_Elder_ID);
                          }
                        }}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs"
                      >
                        {allMembers
                          .filter(m => m.QR_Number.toUpperCase() === matchedFamily.QR_Number.toUpperCase())
                          .map(m => (
                            <option key={m.NIC_Elder_ID} value={m.NIC_Elder_ID}>
                              {m.Name} ({m.Relationship} - {m.NIC_Elder_ID})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Citizen Personal Info Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isTa ? 'பயனாளி பெயர் *' : 'Visitor Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={visitorName}
                    onChange={e => setVisitorName(e.target.value)}
                    placeholder={isTa ? 'முழுப் பெயர்' : 'Full Name'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isTa ? 'தேசிய அடையாள அட்டை (NIC) *' : 'National Identity Card (NIC) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={nic}
                    onChange={e => {
                      setNic(e.target.value);
                      setSearchNIC(e.target.value);
                    }}
                    placeholder="e.g. 198061204590 or 751420198V"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isTa ? 'இணைக்கப்பட்ட குடும்ப QR எண் (உள்வாங்கப்படும்)' : 'Linked Family QR Code (Captured)'}
                  </label>
                  <input
                    type="text"
                    value={linkedQR}
                    onChange={e => setLinkedQR(e.target.value.toUpperCase())}
                    placeholder="e.g. VHR-PCK-001"
                    className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-300 text-emerald-900 rounded-md font-mono font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isTa ? 'தொலைபேசி எண்' : 'Telephone / Mobile'}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+94 77 123 4567"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isTa ? 'கிராம அலுவலர் பிரிவு *' : 'GN Village Division *'}
                  </label>
                  <select
                    value={village}
                    onChange={e => setVillage(e.target.value)}
                    disabled={isGnOfficer}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100"
                  >
                    {divisions.map(d => (
                      <option key={d.Division_ID} value={d.Division_Name}>{d.Division_Name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isTa ? 'வதிவிட முகவரி' : 'Address / Residence'}
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder={isTa ? 'முகவரி' : 'Residential address'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Target Officer & Department Branch (Requirement #3: Searchable Officer Dropdown) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isTa ? 'சந்திக்க வேண்டிய பிரிவு *' : 'Department Section / Branch *'}
                  </label>
                  <select
                    value={targetSection}
                    onChange={e => setTargetSection(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    {departmentSections.map(sec => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-700">
                    {isTa ? 'சந்திக்க வேண்டிய உத்தியோகத்தர் (தேடல் & ரொப்டவுன்) *' : 'Designated Officer (Search & Dropdown) *'}
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={officerSearchQuery}
                      onChange={e => {
                        const q = e.target.value;
                        setOfficerSearchQuery(q);
                        if (q.trim()) {
                          const match = allOfficers.find(
                            u =>
                              u.Name.toLowerCase().includes(q.toLowerCase()) ||
                              u.Role.toLowerCase().includes(q.toLowerCase()) ||
                              u.Division.toLowerCase().includes(q.toLowerCase()) ||
                              u.User_ID.toLowerCase().includes(q.toLowerCase())
                          );
                          if (match) setTargetOfficerId(match.User_ID);
                        }
                      }}
                      placeholder={isTa ? 'உத்தியோகத்தர் பெயர் / பதவி / பிரிவு கொண்டு தேடுக...' : 'Search officer by name, role, or division...'}
                      className="w-full pl-8 pr-7 py-1.5 bg-white border border-emerald-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    {officerSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setOfficerSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <select
                    value={targetOfficerId}
                    onChange={e => setTargetOfficerId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    {allOfficers
                      .filter(u => {
                        if (!officerSearchQuery.trim()) return true;
                        const q = officerSearchQuery.toLowerCase().trim();
                        return (
                          u.Name.toLowerCase().includes(q) ||
                          u.Role.toLowerCase().includes(q) ||
                          u.Division.toLowerCase().includes(q) ||
                          u.User_ID.toLowerCase().includes(q)
                        );
                      })
                      .map(u => (
                        <option key={u.User_ID} value={u.User_ID}>
                          {u.Name} ({u.Role} - {u.Division})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Public Aid / Service Dropdown (Requirement: மக்களுக்கான உதவி ரொப்டவுனில் சுருக்கமாக சேர்) */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-300 rounded-xl space-y-1.5">
                <label className="block font-bold text-emerald-950 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-emerald-700" />
                    <span>{isTa ? 'மக்களுக்கான உதவி / பொதுச் சேவைத் தெரிவு (ரொப்டவுன்):' : 'Public Assistance & Service Request (Dropdown):'}</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                    {isTa ? 'தானாகப் பிரிவு & நோக்கம் நிரப்பப்படும்' : 'Auto-sets branch & purpose'}
                  </span>
                </label>
                <select
                  onChange={e => {
                    const found = publicServicesCatalog.find(s => s.id === e.target.value);
                    if (found) {
                      setPurpose(found.defaultPurpose);
                      setTargetSection(found.section);
                    }
                  }}
                  defaultValue=""
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                >
                  <option value="" disabled>
                    {isTa ? '-- மக்களுக்கான 08 பொதுச் சேவைகளில் ஒன்றைத் தெரிவுசெய்க --' : '-- Select from 8 Official Public Assistance Schemes --'}
                  </option>
                  {publicServicesCatalog.map(srv => (
                    <option key={srv.id} value={srv.id}>
                      {srv.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Purpose & Need Details */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isTa ? 'வருகையின் நோக்கம் / தேவை விபரம் *' : 'Purpose of Consultation / Requirement *'}
                </label>
                <textarea
                  required
                  rows={2}
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  placeholder={isTa ? 'வருகையின் நோக்கத்தை உள்ளிடவும் அல்லது மேலே உள்ள ரொப்டவுனில் தெரிவுசெய்யவும்...' : 'State the purpose of meeting, requested aid or inquiry...'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {purposePresets.map((pre, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPurpose(pre);
                        const matchedCat = publicServicesCatalog[idx];
                        if (matchedCat) setTargetSection(matchedCat.section);
                      }}
                      className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 rounded transition-colors cursor-pointer border border-slate-200"
                    >
                      + {pre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority & Auto Print Checkbox */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200">
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-slate-700">{isTa ? 'முன்னுரிமை:' : 'Priority:'}</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      checked={priority === 'Normal'}
                      onChange={() => setPriority('Normal')}
                    />
                    <span>{isTa ? 'சாதாரண' : 'Normal'}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      checked={priority === 'High'}
                      onChange={() => setPriority('High')}
                    />
                    <span className="text-amber-700 font-semibold">{isTa ? 'அதி முன்னுரிமை' : 'High'}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      checked={priority === 'Urgent'}
                      onChange={() => setPriority('Urgent')}
                    />
                    <span className="text-rose-700 font-bold">{isTa ? 'அவசரம்' : 'Urgent'}</span>
                  </label>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-semibold">
                  <input
                    type="checkbox"
                    checked={autoPrintOnSave}
                    onChange={e => setAutoPrintOnSave(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>{isTa ? 'தானியங்கி டோக்கன் அச்சிடு' : 'Auto-Print Token Slip'}</span>
                </label>
              </div>

              {/* Form Buttons: Cancel + Save Only + Save & Print */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md cursor-pointer"
                >
                  {isTa ? 'ரத்து செய்' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => processVisitRegistration(false)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isTa ? 'சேமி மட்டும் (Save Only)' : 'Save Only'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => processVisitRegistration(true)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isTa ? 'டோக்கன் பதிவுசெய்து அச்சிடுக' : 'Save & Print Slip'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Printable Token Slip with Official Logo (Requirement #4) */}
      {selectedVisitForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-sm flex flex-col overflow-hidden">
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between no-print">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>{isTa ? 'பயனாளி டோக்கன் சீட்டு' : 'Visitor Queue Slip'}</span>
              </span>
              <button
                onClick={() => setSelectedVisitForPrint(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div id="printable-token-slip" className="p-5 text-slate-900 bg-white space-y-3.5 text-center">
              {/* Header with official logo */}
              <div className="border-b-2 border-slate-900 pb-3 flex flex-col items-center space-y-1">
                <AppLogo size="md" className="ring-1 ring-slate-300 mb-0.5" />
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  Democratic Socialist Republic of Sri Lanka
                </div>
                <div className="text-xs font-black uppercase tracking-tight text-slate-900">
                  {isTa ? 'பிரதேச செயலகம் கோறளைப்பற்று வடக்கு வாகரை' : 'Divisional Secretariat Koralaipattu North Vaharai'}
                </div>
                <div className="text-[10px] text-slate-500">
                  {isTa ? 'பயனாளிகள் வரவேற்பு & பொதுச் சேவைப் பிரிவு' : 'Citizen Reception Desk'}
                </div>
              </div>

              {/* Big Bold Token Box */}
              <div className="py-2.5 bg-slate-100 rounded-xl border-2 border-slate-900 space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  {isTa ? 'வரிசை டோக்கன் எண்' : 'Queue Token Number'}
                </span>
                <span className="text-4xl font-black font-mono tracking-tight text-slate-900 block">
                  {selectedVisitForPrint.Token_Number}
                </span>
                <span className="text-[10px] font-mono text-slate-600">
                  {selectedVisitForPrint.Date} • {selectedVisitForPrint.Time}
                </span>
              </div>

              {/* Details table */}
              <div className="text-left text-xs space-y-1.5 border-b border-dashed border-slate-300 pb-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">{isTa ? 'பயனாளி பெயர்:' : 'Citizen Name:'}</span>
                  <span className="font-bold text-slate-900 text-right">{selectedVisitForPrint.Visitor_Name}</span>
                </div>
                {selectedVisitForPrint.NIC && (
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-500">{isTa ? 'தேசிய அடையாள அட்டை:' : 'NIC:'}</span>
                    <span className="font-bold text-slate-900">{selectedVisitForPrint.NIC}</span>
                  </div>
                )}
                {selectedVisitForPrint.QR_Number && (
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-500">{isTa ? 'குடும்ப QR எண்:' : 'Family QR:'}</span>
                    <span className="font-bold text-emerald-800">{selectedVisitForPrint.QR_Number}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">{isTa ? 'கிராமப் பிரிவு:' : 'Village:'}</span>
                  <span className="font-medium text-slate-800">{selectedVisitForPrint.Village_Division}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1">
                  <span className="text-slate-500">{isTa ? 'பிரிவு:' : 'Section:'}</span>
                  <span className="font-bold text-slate-900 text-right">{selectedVisitForPrint.Target_Section}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isTa ? 'உத்தியோகத்தர்:' : 'Officer:'}</span>
                  <span className="font-bold text-slate-900 text-right">{selectedVisitForPrint.Target_Officer_Name}</span>
                </div>
                <div className="text-[11px] pt-1 text-slate-600 italic">
                  <strong>{isTa ? 'நோக்கம்:' : 'Purpose:'}</strong> {selectedVisitForPrint.Purpose}
                </div>
              </div>

              <div className="text-[10px] text-slate-600 leading-tight space-y-1">
                <p className="font-medium">
                  {isTa
                    ? 'உங்கள் டோக்கன் எண் அறிவிக்கப்படும் வரை காத்திருப்பு அறையில் அமர்ந்திருக்கவும்.'
                    : 'Please wait at the reception lounge until your token number is called.'}
                </p>
                <div className="font-mono text-[9px] text-slate-400">
                  ID: {selectedVisitForPrint.Visit_ID} • DS Vaharai
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between no-print">
              <button
                type="button"
                onClick={() => setSelectedVisitForPrint(null)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded cursor-pointer"
              >
                {isTa ? 'மூடுக' : 'Close'}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded inline-flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isTa ? 'அச்சிடுக' : 'Print Slip'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Visitor Details, Family Background & Officer Notes */}
      {selectedVisitForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-slate-800 text-emerald-400 font-mono font-bold rounded text-xs">
                  {selectedVisitForDetail.Token_Number}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{selectedVisitForDetail.Visitor_Name}</span>
                    <span className="text-[11px] font-normal text-slate-300">({selectedVisitForDetail.Village_Division})</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    NIC: {selectedVisitForDetail.NIC} • QR: {selectedVisitForDetail.QR_Number || '-'}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedVisitForDetail(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                  <span>{isTa ? 'இன்றைய வருகை விபரம்' : "Today's Consultation Details"}</span>
                  {getStatusBadge(selectedVisitForDetail.Status)}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><strong className="text-slate-500">{isTa ? 'உத்தியோகத்தர்:' : 'Target Officer:'}</strong> {selectedVisitForDetail.Target_Officer_Name}</div>
                  <div><strong className="text-slate-500">{isTa ? 'பிரிவு:' : 'Section:'}</strong> {selectedVisitForDetail.Target_Section}</div>
                  <div><strong className="text-slate-500">NIC:</strong> {selectedVisitForDetail.NIC || '-'}</div>
                  <div><strong className="text-slate-500">{isTa ? 'தொலைபேசி:' : 'Phone:'}</strong> {selectedVisitForDetail.Telephone || '-'}</div>
                </div>
                <div className="pt-1.5 border-t border-slate-200">
                  <strong className="text-slate-700 block mb-0.5">{isTa ? 'நோக்கம் / தேவை:' : 'Requirement / Purpose:'}</strong>
                  <p className="text-slate-800 bg-white p-2 rounded border border-slate-200 leading-relaxed">
                    {selectedVisitForDetail.Purpose}
                  </p>
                </div>
              </div>

              {/* Linked Family Background Dossier */}
              {selectedVisitForDetail.QR_Number && (() => {
                const fam = allFamilies.find(f => f.QR_Number.toUpperCase() === selectedVisitForDetail.QR_Number?.toUpperCase());
                const famMembers = fam ? allMembers.filter(m => m.QR_Number.toUpperCase() === fam.QR_Number.toUpperCase()) : [];
                return fam ? (
                  <div className="border border-slate-200 rounded-lg p-3.5 space-y-2 bg-emerald-50/30">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-700" />
                        <span>{isTa ? 'இணைக்கப்பட்ட குடும்பப் பதிவேட்டுத் தகவல்:' : 'Linked Family Registry Record:'}</span>
                      </span>
                      <button
                        onClick={() => {
                          setSelectedVisitForDetail(null);
                          if (onSelectFamily) onSelectFamily(fam);
                        }}
                        className="text-emerald-700 font-bold underline font-mono text-[11px]"
                      >
                        {fam.QR_Number} • {fam.Family_Name}
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <span>{fam.Division_Name} • {fam.Address} • {famMembers.length} {isTa ? 'உறுப்பினர்கள்' : 'members'}</span>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Officer Notes Trail */}
              <div className="border border-slate-200 rounded-lg p-3.5 space-y-3">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <span>{isTa ? 'உத்தியோகத்தர் குறிப்புகள் & பரிசீலனை' : 'Officer Notes & Case Disposition'}</span>
                </h4>

                {selectedVisitForDetail.Officer_Notes && selectedVisitForDetail.Officer_Notes.length > 0 ? (
                  <div className="space-y-2">
                    {selectedVisitForDetail.Officer_Notes.map((n, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                        <div className="flex items-center justify-between font-bold text-slate-900 text-[11px]">
                          <span>{n.Officer_Name}</span>
                          <span className="text-[10px] font-mono text-slate-400">{n.Timestamp.slice(0, 16).replace('T', ' ')}</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">{n.Content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-1">
                    {isTa ? 'குறிப்புகள் எதுவும் இதுவரை பதிவு செய்யப்படவில்லை.' : 'No notes logged yet for this visit.'}
                  </p>
                )}

                {/* Add New Note */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5 pt-2">
                  <strong className="block text-slate-800 text-[11px]">
                    {isTa ? '+ புதிய குறிப்புரை சேர்க்க / வேறு உத்தியோகத்தருக்கு மாற்றுக:' : '+ Log New Officer Note / Forward to Officer:'}
                  </strong>
                  <textarea
                    rows={2}
                    value={noteContent}
                    onChange={e => setNoteContent(e.target.value)}
                    placeholder={isTa ? 'நடவடிக்கை, பரிந்துரைகள், கவனிப்பு...' : 'Write action taken, observation, recommendation...'}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="space-y-1">
                      <label className="block text-slate-600 mb-0.5 font-medium">
                        {isTa ? 'வேறு உத்தியோகத்தருக்கு மாற்ற (தேடல் & ரொப்டவுன்):' : 'Forward to another Officer (Search & Dropdown):'}
                      </label>
                      <input
                        type="text"
                        value={referOfficerSearchQuery}
                        onChange={e => setReferOfficerSearchQuery(e.target.value)}
                        placeholder={isTa ? 'உத்தியோகத்தர் பெயர் கொண்டு தேடுக...' : 'Search officer name...'}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                      />
                      <select
                        value={referToOfficerId}
                        onChange={e => setReferToOfficerId(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                      >
                        <option value="">{isTa ? '-- மாற்றம் தேவையில்லை --' : '-- No Referral --'}</option>
                        {allOfficers
                          .filter(u => u.User_ID !== currentUser.User_ID)
                          .filter(u => {
                            if (!referOfficerSearchQuery.trim()) return true;
                            const q = referOfficerSearchQuery.toLowerCase().trim();
                            return (
                              u.Name.toLowerCase().includes(q) ||
                              u.Role.toLowerCase().includes(q) ||
                              u.Division.toLowerCase().includes(q)
                            );
                          })
                          .map(u => (
                            <option key={u.User_ID} value={u.User_ID}>
                              {u.Name} ({u.Role} - {u.Division})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5 font-medium">
                        {isTa ? 'இலக்கு பிரிவு:' : 'Target Section:'}
                      </label>
                      <select
                        value={referToSection}
                        onChange={e => setReferToSection(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                      >
                        <option value="">{isTa ? '-- அதே பிரிவு --' : '-- Same Section --'}</option>
                        {departmentSections.map(sec => (
                          <option key={sec.id} value={sec.id}>{sec.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleAddNoteAndRefer}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isTa ? 'சேமிக்க & பகிர்க' : 'Save Note & Forward'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setSelectedVisitForPrint(selectedVisitForDetail)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded inline-flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isTa ? 'சீட்டு அச்சிடுக' : 'Print Slip'}</span>
              </button>
              <button
                onClick={() => setSelectedVisitForDetail(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded cursor-pointer"
              >
                {isTa ? 'மூடுக' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Citizen Feedback */}
      {selectedVisitForFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col overflow-hidden">
            <div className="p-4 bg-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-white" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isTa ? 'பயனாளி சேவைத் திருப்தி மதிப்பீடு (CSAT)' : 'Citizen Service Satisfaction Feedback'}
                  </h3>
                  <p className="text-[10px] text-amber-100 font-mono">
                    Token: {selectedVisitForFeedback.Token_Number} • {selectedVisitForFeedback.Visitor_Name}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedVisitForFeedback(null)} className="text-amber-200 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCitizenFeedback} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="space-y-2 text-center">
                <label className="block font-bold text-slate-900 text-xs">
                  {isTa ? 'சேவைத் திருப்தி மதிப்பீடு: *' : 'Overall Service Satisfaction Rating: *'}
                </label>
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[
                    { val: 5, emoji: '😊', ta: 'மிகவும் திருப்தி', en: 'Very Satisfied' },
                    { val: 4, emoji: '🙂', ta: 'திருப்தி', en: 'Satisfied' },
                    { val: 3, emoji: '😐', ta: 'நடுத்தரம்', en: 'Neutral' },
                    { val: 2, emoji: '🙁', ta: 'திருப்தியற்றது', en: 'Unsatisfied' },
                    { val: 1, emoji: '😡', ta: 'மிகவும் மோசம்', en: 'Very Poor' }
                  ].map(r => (
                    <button
                      key={r.val}
                      type="button"
                      onClick={() => setFeedbackRating(r.val as SatisfactionRating)}
                      className={`p-2 rounded-lg border-2 text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        feedbackRating === r.val
                          ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold scale-105'
                          : 'border-slate-200 hover:border-slate-300 opacity-60'
                      }`}
                    >
                      <span className="text-2xl">{r.emoji}</span>
                      <span className="text-[10px] font-bold leading-tight">{isTa ? r.ta : r.en}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isTa ? 'கருத்துரை / ஆலோசனைகள்:' : 'Comments / Suggestions:'}
                </label>
                <textarea
                  rows={2}
                  value={feedbackComment}
                  onChange={e => setFeedbackComment(e.target.value)}
                  placeholder={isTa ? 'கருத்துரை...' : 'Feedback comment...'}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedVisitForFeedback(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded cursor-pointer"
                >
                  {isTa ? 'ரத்து செய்' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isTa ? 'மதிப்பீட்டைச் சமர்ப்பிக்க' : 'Submit Feedback'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Camera Scanner Modal (Requirement #2) */}
      {isCameraModalOpen && (
        <QrScannerModal
          currentUser={currentUser}
          currentLang={currentLang}
          onClose={() => setIsCameraModalOpen(false)}
          onSelectFamily={(fam) => handleCameraScannedResult(fam.QR_Number, fam)}
          onRecordAssistance={() => {}}
          onScanResult={(code, fam) => handleCameraScannedResult(code, fam)}
        />
      )}
    </div>
  );
};

export default ReceptionView;
