import React, { useState, useMemo, useEffect } from 'react';
import { User, Family } from '../types';
import { StorageService } from '../services/storageService';
import { Language } from '../utils/translations';
import { AppLogo } from './AppLogo';
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Building,
  Printer,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  HeartPulse,
  GraduationCap,
  Home,
  CreditCard,
  Users,
  Target,
  ArrowRight,
  FileSpreadsheet,
  Award,
  Layers
} from 'lucide-react';

interface AIStrategicReportViewProps {
  currentUser: User;
  currentLang: Language;
  onSelectFamily?: (family: Family) => void;
  onNavigate?: (tab: string) => void;
}

interface GeneratedAIReport {
  executiveSummary: string;
  highAttentionDivisions: {
    divisionName: string;
    urgencyLevel: string;
    keyIssues: string;
    immediateAction: string;
  }[];
  priorityActionAreas: {
    sectorTitle: string;
    whyCritical: string;
    recommendedProgram: string;
    targetGroupCount: string;
    timeline: string;
  }[];
  aswesumaGapAnalysis: string;
  nicAndDocumentationAction: string;
  secretariatActionPlan: string[];
}

export const AIStrategicReportView: React.FC<AIStrategicReportViewProps> = ({
  currentUser,
  currentLang,
  onSelectFamily,
  onNavigate,
}) => {
  const isTa = currentLang === 'ta';
  const [selectedFocus, setSelectedFocus] = useState<string>('ALL');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<GeneratedAIReport | null>(null);
  const [generatedTimestamp, setGeneratedTimestamp] = useState<string>('');

  const families = StorageService.getFilteredFamilies(currentUser);
  const members = StorageService.getFilteredMembers(currentUser);
  const assistance = StorageService.getFilteredAssistance(currentUser);
  const visits = StorageService.getFilteredVisits(currentUser);

  // Compute deep multi-dimensional analytics for all GS divisions and indicators
  const analytics = useMemo(() => {
    const assistedQrSet = new Set(assistance.map(a => a.QR_Number));

    // Aswesuma breakdown
    const aswesumaCounts = {
      'Severely Poor': 0,
      Poor: 0,
      Vulnerable: 0,
      'Not selected': 0,
      unassistedSeverelyPoorOrPoor: 0,
    };

    // Sector indicator counts
    const sectorCounts = {
      lowIncome: 0,
      noLandOrTempHouse: 0,
      disabilityOrIllness: 0,
      educationRisk: 0,
      femaleHeadedOrSingleParent: 0,
      substanceOrProtectionRisk: 0,
      tempNicHolders: 0,
      highDependency: 0,
    };

    const divisionMap: Record<
      string,
      {
        divisionName: string;
        totalFamilies: number;
        unassistedFamilies: number;
        severelyPoor: number;
        poor: number;
        vulnerable: number;
        notSelected: number;
        disabilityCount: number;
        educationRiskCount: number;
        housingNeedCount: number;
        femaleHeadedCount: number;
        tempNicCount: number;
        urgencyScore: number;
      }
    > = {};

    families.forEach(f => {
      const cat = f.Aswesuma_Category || 'Not selected';
      if (cat in aswesumaCounts) {
        aswesumaCounts[cat as keyof typeof aswesumaCounts]++;
      }
      const isAssisted = assistedQrSet.has(f.QR_Number);
      if (!isAssisted && (cat === 'Severely Poor' || cat === 'Poor')) {
        aswesumaCounts.unassistedSeverelyPoorOrPoor++;
      }

      const vp = f.Vulnerability_Profile;
      const isLowInc = f.Monthly_Income < 15000 || !!vp?.Econ_Low_Income_15k;
      const isHousingNeed =
        f.Housing_Status === 'Temporary' ||
        f.Housing_Status === 'Damaged' ||
        !!vp?.Settlement_No_Land ||
        !!vp?.Settlement_No_House;
      const isHealthRisk =
        (vp?.Health_Disability_Count || 0) > 0 ||
        (vp?.Health_Chronic_Illness_Count || 0) > 0 ||
        (vp?.Health_Thalassemia_Count || 0) > 0;
      const isEduRisk =
        (vp?.Edu_Dropout_Count || 0) > 0 ||
        (vp?.Edu_Non_School_Going_Count || 0) > 0 ||
        (vp?.Edu_Failed_OL_AL_Count || 0) > 0;
      const isSocialRisk = !!vp?.Social_Female_Headed || !!vp?.Social_Single_Parent;
      const isProtectionRisk =
        !!vp?.Psy_Substance_Abuse ||
        !!vp?.Prot_No_Child_Care ||
        !!vp?.Prot_unsafe_environment ||
        !!vp?.Psy_Domestic_Violence;
      const isTempNic = !!f.Is_Temp_NIC || (f.Head_NIC || '').startsWith('TMP-');
      const isHighDep = (vp?.Demo_Dependency_Ratio || 0) >= 0.64;

      if (isLowInc) sectorCounts.lowIncome++;
      if (isHousingNeed) sectorCounts.noLandOrTempHouse++;
      if (isHealthRisk) sectorCounts.disabilityOrIllness++;
      if (isEduRisk) sectorCounts.educationRisk++;
      if (isSocialRisk) sectorCounts.femaleHeadedOrSingleParent++;
      if (isProtectionRisk) sectorCounts.substanceOrProtectionRisk++;
      if (isTempNic) sectorCounts.tempNicHolders++;
      if (isHighDep) sectorCounts.highDependency++;

      const div = f.Division_Name || 'Unknown';
      if (!divisionMap[div]) {
        divisionMap[div] = {
          divisionName: div,
          totalFamilies: 0,
          unassistedFamilies: 0,
          severelyPoor: 0,
          poor: 0,
          vulnerable: 0,
          notSelected: 0,
          disabilityCount: 0,
          educationRiskCount: 0,
          housingNeedCount: 0,
          femaleHeadedCount: 0,
          tempNicCount: 0,
          urgencyScore: 0,
        };
      }

      const d = divisionMap[div];
      d.totalFamilies++;
      if (!isAssisted) d.unassistedFamilies++;
      if (cat === 'Severely Poor') d.severelyPoor++;
      else if (cat === 'Poor') d.poor++;
      else if (cat === 'Vulnerable') d.vulnerable++;
      else d.notSelected++;

      if (isHealthRisk) d.disabilityCount++;
      if (isEduRisk) d.educationRiskCount++;
      if (isHousingNeed) d.housingNeedCount++;
      if (isSocialRisk) d.femaleHeadedCount++;
      if (isTempNic) d.tempNicCount++;

      // Calculate composite urgency score for ranking GS Divisions
      d.urgencyScore +=
        (!isAssisted ? 4 : 1) +
        (cat === 'Severely Poor' ? 5 : cat === 'Poor' ? 3 : cat === 'Vulnerable' ? 2 : 0) +
        (isHealthRisk ? 3 : 0) +
        (isEduRisk ? 3 : 0) +
        (isHousingNeed ? 3 : 0) +
        (isSocialRisk ? 2 : 0) +
        (isProtectionRisk ? 4 : 0);
    });

    // Also count members with Temporary NICs
    members.forEach(m => {
      if (m.Is_Temp_NIC || (m.NIC_Elder_ID || '').startsWith('TMP-')) {
        sectorCounts.tempNicHolders++;
      }
    });

    const rankedDivisions = Object.values(divisionMap).sort((a, b) => b.urgencyScore - a.urgencyScore);

    return {
      totalFamilies: families.length,
      totalMembers: members.length,
      assistedFamilies: families.filter(f => assistedQrSet.has(f.QR_Number)).length,
      unassistedFamilies: families.filter(f => !assistedQrSet.has(f.QR_Number)).length,
      aswesumaCounts,
      sectorCounts,
      rankedDivisions,
      pendingVisits: visits.filter(v => v.Status === 'Waiting' || v.Status === 'In Discussion').length,
    };
  }, [families, members, assistance, visits]);

  // Build baseline structured report so the user immediately sees actionable insights and can refresh via Gemini AI
  const defaultStructuredReport: GeneratedAIReport = useMemo(() => {
    const topDivs = analytics.rankedDivisions.slice(0, 5).map(d => ({
      divisionName: d.divisionName,
      urgencyLevel:
        d.urgencyScore >= 25
          ? isTa
            ? 'அதி தீவிர கவனம் (Critical Priority)'
            : 'Critical Priority'
          : isTa
          ? 'உயர் கவனம் (High Priority)'
          : 'High Priority',
      keyIssues: isTa
        ? `மொத்த குடும்பங்கள்: ${d.totalFamilies} | உதவி பெறாதவை: ${d.unassistedFamilies} | அஸ்வெசும (Severely Poor/Poor): ${
            d.severelyPoor + d.poor
          } | வீடு/காணி தேவை: ${d.housingNeedCount} | மருத்துவ/மாற்றுத்திறன்: ${d.disabilityCount}`
        : `Total Families: ${d.totalFamilies} | Unassisted: ${d.unassistedFamilies} | Aswesuma Poor/Severely Poor: ${
            d.severelyPoor + d.poor
          } | Housing/Land Need: ${d.housingNeedCount} | Health/Disability: ${d.disabilityCount}`,
      immediateAction: isTa
        ? `${d.divisionName} பிரிவில் உதவி பெறாத ${d.unassistedFamilies} குடும்பங்களுக்கு சிறப்பு நடமாடும் வாழ்வாதார மற்றும் நலன்புரி முகாம் நடத்தப்பட வேண்டும்.`
        : `Conduct targeted livelihood and welfare outreach for ${d.unassistedFamilies} unassisted households in ${d.divisionName}.`,
    }));

    return {
      executiveSummary: isTa
        ? `கோறளைப்பற்று வடக்கு (வாகரை) பிரதேச செயலகப் பிரிவில் பதிவுசெய்யப்பட்ட ${analytics.totalFamilies} குடும்பங்களில் (${analytics.totalMembers} உறுப்பினர்கள்), ${analytics.unassistedFamilies} குடும்பங்கள் இதுவரை நேரடி அரச/நிறுவன உதவி பெறாத நிலையில் உள்ளன. அஸ்வெசும தரவுகளின்படி Severely Poor (${analytics.aswesumaCounts['Severely Poor']}) மற்றும் Poor (${analytics.aswesumaCounts.Poor}) பிரிவில் உள்ள குடும்பங்களுக்கும், தற்காலிக அடையாள அட்டை (TMP-NIC: ${analytics.sectorCounts.tempNicHolders}) கொண்ட நபர்களுக்கும் முன்னுரிமை அடிப்படையில் செயலகம் செயற்பட வேண்டும்.`
        : `Across ${analytics.totalFamilies} registered households (${analytics.totalMembers} citizens) in Divisional Secretariat Koralaipattu North (Vaharai), ${analytics.unassistedFamilies} households remain unassisted. Immediate Secretariat intervention is required for Severely Poor (${analytics.aswesumaCounts['Severely Poor']}) and Poor (${analytics.aswesumaCounts.Poor}) families, alongside civil documentation camps for ${analytics.sectorCounts.tempNicHolders} temporary NIC holders.`,
      highAttentionDivisions: topDivs,
      priorityActionAreas: [
        {
          sectorTitle: isTa
            ? '1. வாழ்வாதாரம் & அஸ்வெசும (Aswesuma) வறுமை ஒழிப்புப் பிரிவு'
            : '1. Livelihood & Aswesuma Poverty Alleviation Sector',
          whyCritical: isTa
            ? `${analytics.sectorCounts.lowIncome} குடும்பங்கள் ரூ. 15,000 இற்கும் குறைந்த வருமானம் கொண்டுள்ளன; ${analytics.aswesumaCounts['Not selected']} குடும்பங்கள் அஸ்வெசுமவில் உள்வாங்கப்படவில்லை.`
            : `${analytics.sectorCounts.lowIncome} families earn below LKR 15,000/month, and ${analytics.aswesumaCounts['Not selected']} vulnerable households are currently 'Not selected' in Aswesuma.`,
          recommendedProgram: isTa
            ? 'சுயதொழில் ஊக்குவிப்பு, மீன்பிடி/விவசாய உள்ளீட்டு மானியம் மற்றும் அஸ்வெசும மேன்முறையீட்டுச் சிறப்பு முகாம்.'
            : 'Self-employment micro-grants, fisheries/agriculture input subsidies, and Aswesuma appeal assistance desk.',
          targetGroupCount: `${analytics.sectorCounts.lowIncome} ${isTa ? 'குடும்பங்கள்' : 'Families'}`,
          timeline: isTa ? 'உடனடி (30 நாட்களுக்குள்)' : 'Immediate (Within 30 Days)',
        },
        {
          sectorTitle: isTa
            ? '2. காணி மற்றும் பாதுகாப்பான வீட்டுத்திட்டப் பிரிவு (Land & Housing)'
            : '2. Land Alienation & Safe Housing Sector',
          whyCritical: isTa
            ? `${analytics.sectorCounts.noLandOrTempHouse} குடும்பங்கள் சொந்தக் காணி இன்றியோ அல்லது தற்காலிக/சேதமடைந்த வீடுகளிலோ வசிக்கின்றன.`
            : `${analytics.sectorCounts.noLandOrTempHouse} households live in temporary/damaged shelters or lack legal land deeds.`,
          recommendedProgram: isTa
            ? 'அரச காணி அனுமதிப்பத்திரம் (Land Permit) வழங்கல் மற்றும் நிரந்தர வீட்டுத்திட்ட முன்னுரிமைப் பட்டியல் தயாரிப்பு.'
            : 'State Land Permit regularization camp and priority allocation for National/NGO Housing Schemes.',
          targetGroupCount: `${analytics.sectorCounts.noLandOrTempHouse} ${isTa ? 'குடும்பங்கள்' : 'Families'}`,
          timeline: isTa ? 'காலாண்டு இலக்கு (1 - 3 மாதங்கள்)' : 'Quarterly Target (1 - 3 Months)',
        },
        {
          sectorTitle: isTa
            ? '3. மருத்துவம், மாற்றுத்திறனாளிகள் & தலசீமியா பராமரிப்புப் பிரிவு'
            : '3. Health, Disability & Thalassemia Social Care Sector',
          whyCritical: isTa
            ? `${analytics.sectorCounts.disabilityOrIllness} குடும்பங்களில் மாற்றுத்திறனாளிகள், நீண்டகால நோயாளர்கள் அல்லது தலசீமியா நோயாளர்கள் உள்ளனர்.`
            : `${analytics.sectorCounts.disabilityOrIllness} households have members with disabilities, chronic illnesses, or Thalassemia.`,
          recommendedProgram: isTa
            ? 'சமூக சேவைகள் பிரிவின் ஊடாக மாதாந்த மருத்துவக் கொடுப்பனவு, சக்கர நாற்காலி/உபகரணங்கள் மற்றும் போக்குவரத்து உதவி.'
            : 'Monthly medical nutrition allowance, assistive devices distribution, and clinic transport stipends via Social Services.',
          targetGroupCount: `${analytics.sectorCounts.disabilityOrIllness} ${isTa ? 'குடும்பங்கள்' : 'Families'}`,
          timeline: isTa ? 'உடனடி (15 - 30 நாட்கள்)' : 'Immediate (15 - 30 Days)',
        },
        {
          sectorTitle: isTa
            ? '4. கல்வி இடைவிலகல் தடுப்பு & திறன் விருத்திப் பிரிவு'
            : '4. School Dropout Prevention & Youth Skill Development',
          whyCritical: isTa
            ? `${analytics.sectorCounts.educationRisk} குடும்பங்களில் பாடசாலை இடைவிலகல் அல்லது O/L, A/L தோல்வியடைந்த மாணவர்கள் உள்ளனர்.`
            : `${analytics.sectorCounts.educationRisk} families report school dropouts, non-school attendance, or O/L & A/L exam failures.`,
          recommendedProgram: isTa
            ? 'கற்றல் உபகரண உதவித்தொகை, மாலைநேர வழிகாட்டல் வகுப்புகள் மற்றும் தொழிற்பயிற்சி (NVQ) இணைப்பு.'
            : 'Educational stationery scholarships, remedial coaching classes, and Vocational Training (NVQ) enrollment.',
          targetGroupCount: `${analytics.sectorCounts.educationRisk} ${isTa ? 'குடும்பங்கள்' : 'Families'}`,
          timeline: isTa ? '1 - 2 மாதங்கள்' : '1 - 2 Months',
        },
        {
          sectorTitle: isTa
            ? '5. பெண்கள் தலைமைத்துவம், சிறுவர் பாதுகாப்பு & உளச்சமூகப் பிரிவு'
            : '5. Female-Headed Households, Child Protection & Psychosocial Unit',
          whyCritical: isTa
            ? `${analytics.sectorCounts.femaleHeadedOrSingleParent} பெண்கள் தலைமைத்துவ/ஒற்றைப் பெற்றோர் குடும்பங்கள் மற்றும் ${analytics.sectorCounts.substanceOrProtectionRisk} பாதுகாப்பு இடர்பாட்டுக் குடும்பங்கள் உள்ளன.`
            : `${analytics.sectorCounts.femaleHeadedOrSingleParent} female-headed/single-parent families and ${analytics.sectorCounts.substanceOrProtectionRisk} protection-risk households identified.`,
          recommendedProgram: isTa
            ? 'பெண்கள் சுயதொழில் சிறப்பு நிதி, சிறுவர் பராமரிப்புக் கண்காணிப்பு மற்றும் உளவளத்துணை ஆலோசனை சேவை.'
            : 'Women entrepreneurship grants, NCPA child protection monitoring, and family counseling interventions.',
          targetGroupCount: `${
            analytics.sectorCounts.femaleHeadedOrSingleParent + analytics.sectorCounts.substanceOrProtectionRisk
          } ${isTa ? 'குடும்பங்கள்' : 'Families'}`,
          timeline: isTa ? 'தொடர்ச்சியான கண்காணிப்பு' : 'Continuous Monthly Follow-up',
        },
      ],
      aswesumaGapAnalysis: isTa
        ? `அஸ்வெசும (Aswesuma) பகுப்பாய்வு: Severely Poor (${analytics.aswesumaCounts['Severely Poor']}), Poor (${analytics.aswesumaCounts.Poor}), Vulnerable (${analytics.aswesumaCounts.Vulnerable}), மற்றும் Not selected (${analytics.aswesumaCounts['Not selected']}). இதில் தீவிர வறுமையில் இருந்தும் இதுவரை எந்த உதவியும் பெறாத ${analytics.aswesumaCounts.unassistedSeverelyPoorOrPoor} குடும்பங்களுக்கு பிரதேச செயலகம் முதல் முன்னுரிமை அளிக்க வேண்டும்.`
        : `Aswesuma Breakdown: Severely Poor (${analytics.aswesumaCounts['Severely Poor']}), Poor (${analytics.aswesumaCounts.Poor}), Vulnerable (${analytics.aswesumaCounts.Vulnerable}), and Not selected (${analytics.aswesumaCounts['Not selected']}). The Secretariat must prioritize the ${analytics.aswesumaCounts.unassistedSeverelyPoorOrPoor} Severely Poor/Poor households that have received zero assistance to date.`,
      nicAndDocumentationAction: isTa
        ? `18 வயதுக்கு மேற்பட்ட தேசிய அடையாள அட்டை இல்லாத நபர்களுக்கு சிஸ்டத்தினால் வழங்கப்பட்ட தற்காலிக இலக்கம் (TMP-NIC) கொண்டவர்கள் எண்ணிக்கை: ${analytics.sectorCounts.tempNicHolders}. இவர்களுக்கு ஆட்பதிவுத் திணைக்களத்துடன் இணைந்து பிரதேச செயலகத்தில் நடமாடும் அடையாள அட்டை (Mobile NIC) முகாம் நடத்தி நிரந்தர NIC பெற்றுக்கொடுக்க வேண்டும்.`
        : `${analytics.sectorCounts.tempNicHolders} adult citizens (18+) are currently registered with System Temporary NICs (TMP-VHR-*). The Civil Registration branch should organize a Mobile NIC & Birth Certificate Camp to issue permanent National Identity Cards.`,
      secretariatActionPlan: isTa
        ? [
            '1. அதிக இடர்பாடு கொண்ட கிராம சேவகர் பிரிவுகளில் (Top Priority GS Divisions) உதவி பெறாத குடும்பங்களுக்கு மாதந்தோறும் நடமாடும் சேவை நடத்துதல்.',
            '2. Severely Poor மற்றும் Poor அஸ்வெசும பயனாளிகளில் உதவி பெறாத குடும்பங்களை வாழ்வாதாரத் திட்டங்களில் உடனடியாக இணைத்தல்.',
            '3. தற்காலிக அடையாள அட்டை (TMP-NIC) வழங்கப்பட்ட 18+ வயது நபர்களுக்கு நிரந்தர தேசிய அடையாள அட்டை பெற்றுக்கொடுக்க விசேட முகாம் நடத்துதல்.',
            '4. கல்வி இடைவிலகல் மற்றும் தலசீமியா/மாற்றுத்திறனாளிகள் உள்ள குடும்பங்களுக்கு சமூக சேவைகள் மற்றும் சிறுவர் பிரிவு உத்தியோகத்தர்களை நேரடி கள விஜயத்திற்கு அனுப்புதல்.',
            '5. பிரதேச செயலாளர் தலைமையிலான மாதாந்த மீளாய்வுக் கூட்டத்தில் இவ் ஏஐ (AI) அறிக்கையைக் கொண்டு பிரிவு ரீதியான முன்னேற்றத்தை மதிப்பீடு செய்தல்.',
          ]
        : [
            '1. Deploy monthly Mobile Secretariat Service Camps to the top high-attention GN Divisions with the highest unassisted household counts.',
            '2. Fast-track livelihood grants for Severely Poor and Poor Aswesuma households that have not received any aid.',
            '3. Convene a special Civil Registration & NIC Camp for all 18+ citizens currently holding system-generated Temporary NIC numbers.',
            '4. Assign Social Services and Child Protection officers for home visits to households flagged with school dropouts, disability, or Thalassemia.',
            '5. Review this AI Priority Matrix during the Divisional Secretary monthly progress review with all 16 Grama Niladhari officers.',
          ],
    };
  }, [analytics, isTa]);

  const activeReport = aiReport || defaultStructuredReport;

  const handleGenerateLiveAIReport = async () => {
    setIsGenerating(true);
    setAiError(null);
    try {
      const response = await fetch('/api/ai-strategic-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang: currentLang,
          focusFilter: selectedFocus,
          summaryData: {
            totalFamilies: analytics.totalFamilies,
            totalMembers: analytics.totalMembers,
            assistedFamilies: analytics.assistedFamilies,
            unassistedFamilies: analytics.unassistedFamilies,
            aswesumaCounts: analytics.aswesumaCounts,
            sectorCounts: analytics.sectorCounts,
            topDivisions: analytics.rankedDivisions.slice(0, 8),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'AI Report generation failed');
      }
      setAiReport(data.report);
      setGeneratedTimestamp(new Date().toLocaleString());
    } catch (err: any) {
      setAiError(
        isTa
          ? 'நேரலை ஜெமினி ஏஐ (Gemini AI) பகுப்பாய்வில் தற்காலிகத் தடை ஏற்பட்டது; செயலகத் தரவுகளின் நிகழ்நேர நுண்ணறிவு அறிக்கை கீழே காட்டப்படுகிறது.'
          : 'Live Gemini AI service encountered a temporary issue; displaying real-time algorithmic intelligence report below.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    setGeneratedTimestamp(new Date().toLocaleString());
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-emerald-950 rounded-2xl p-6 text-white shadow-md border border-indigo-800/40 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <AppLogo size="lg" className="shrink-0 ring-2 ring-emerald-400/50" />
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {isTa
                    ? 'பிரதேச செயலக மூலோபாய ஏஐ (AI) நுண்ணறிவு அறிக்கை'
                    : 'Divisional Secretariat AI Strategic Intelligence Report'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {isTa
                  ? 'எங்கு அதிக கவனம் செலுத்த வேண்டும் & எவ்விடயத்தில் செயலகம் செயற்பட வேண்டும்?'
                  : 'Where to Focus High Attention & Priority Secretariat Action Matrix'}
              </h2>
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                {isTa
                  ? '16 கிராம சேவகர் பிரிவுகளின் அனைத்து வினாக்கள், அஸ்வெசும (Aswesuma) வறுமை நிலை, 7 இடர்பாட்டுக் குறிகாட்டிகள் மற்றும் தற்காலிக அடையாள அட்டை தரவுகளைப் பகுப்பாய்வு செய்து பிரதேச செயலகம் முன்னுரிமை அளிக்க வேண்டிய விடயங்களை ஏஐ (AI) பரிந்துரைக்கிறது.'
                  : 'AI-driven analysis of all household questionnaire indicators, Aswesuma tiers, 7 vulnerability dimensions, and GS Division gaps to guide Divisional Secretariat interventions.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <select
              value={selectedFocus}
              onChange={e => setSelectedFocus(e.target.value)}
              className="px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="ALL">
                {isTa ? 'அனைத்துத் துறைகள் & 16 GS பிரிவுகள்' : 'All Sectors & 16 GS Divisions'}
              </option>
              <option value="ASWESUMA">
                {isTa ? 'அஸ்வெசும (Severely Poor / Poor) கவனம்' : 'Aswesuma Poverty Focus'}
              </option>
              <option value="LIVELIHOOD_HOUSING">
                {isTa ? 'வாழ்வாதாரம், காணி & வீட்டுத்திட்டம்' : 'Livelihood, Land & Housing'}
              </option>
              <option value="EDUCATION_HEALTH">
                {isTa ? 'கல்வி, மருத்துவம் & மாற்றுத்திறன்' : 'Education, Health & Disability'}
              </option>
              <option value="NIC_PROTECTION">
                {isTa ? 'தற்காலிக NIC & சிறுவர்/பெண்கள் பாதுகாப்பு' : 'Temp NIC & Social Protection'}
              </option>
            </select>

            <button
              onClick={handleGenerateLiveAIReport}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-black rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>
                {isGenerating
                  ? isTa
                    ? 'ஏஐ (AI) ஆராய்கிறது...'
                    : 'AI Analyzing...'
                  : isTa
                  ? 'புதிய AI அறிக்கை உருவாக்குக'
                  : 'Generate Live AI Report'}
              </span>
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isTa ? 'அறிக்கை அச்சிடுக (Print)' : 'Print Report'}</span>
            </button>
          </div>
        </div>
      </div>

      {aiError && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2.5 no-print">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{aiError}</span>
        </div>
      )}

      {/* Printable Official Report Header */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <div className="text-center space-y-1">
          <h1 className="text-lg font-black uppercase">
            {isTa
              ? 'பிரதேச செயலகம் - கோறளைப்பற்று வடக்கு (வாகரை) | ஏஐ மூலோபாய முன்னுரிமை அறிக்கை'
              : 'DIVISIONAL SECRETARIAT - KORALAIPATTU NORTH (VAHARAI) | AI STRATEGIC PRIORITY REPORT'}
          </h1>
          <p className="text-xs text-slate-600">
            {isTa
              ? `உருவாக்கப்பட்ட திகதி: ${generatedTimestamp} | தயாரித்தவர்: ${currentUser.Name}`
              : `Generated On: ${generatedTimestamp} | Prepared By: ${currentUser.Name}`}
          </p>
        </div>
      </div>

      {/* Top Key Highlight Strip: Aswesuma & Vulnerability Snapshot */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <div className="text-[11px] font-bold text-rose-800 uppercase">
            {isTa ? 'அஸ்வெசும: Severely Poor' : 'Aswesuma: Severely Poor'}
          </div>
          <div className="text-2xl font-black text-rose-700 font-mono mt-1">
            {analytics.aswesumaCounts['Severely Poor']}
          </div>
          <span className="text-[11px] text-rose-600 block mt-0.5">
            {isTa ? 'அதி தீவிர வறுமைக் குடும்பங்கள்' : 'Extreme poverty tier'}
          </span>
        </div>

        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <div className="text-[11px] font-bold text-orange-800 uppercase">
            {isTa ? 'அஸ்வெசும: Poor' : 'Aswesuma: Poor'}
          </div>
          <div className="text-2xl font-black text-orange-700 font-mono mt-1">
            {analytics.aswesumaCounts.Poor}
          </div>
          <span className="text-[11px] text-orange-600 block mt-0.5">
            {isTa ? 'வறுமைக் குடும்பங்கள்' : 'Primary poverty tier'}
          </span>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="text-[11px] font-bold text-amber-800 uppercase">
            {isTa ? 'அஸ்வெசும: Vulnerable' : 'Aswesuma: Vulnerable'}
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono mt-1">
            {analytics.aswesumaCounts.Vulnerable}
          </div>
          <span className="text-[11px] text-amber-600 block mt-0.5">
            {isTa ? 'இடர்பாட்டு நிலைக் குடும்பங்கள்' : 'Transitional vulnerable'}
          </span>
        </div>

        <div className="p-4 bg-slate-100 border border-slate-300 rounded-xl">
          <div className="text-[11px] font-bold text-slate-700 uppercase">
            {isTa ? 'அஸ்வெசும: Not selected' : 'Aswesuma: Not selected'}
          </div>
          <div className="text-2xl font-black text-slate-800 font-mono mt-1">
            {analytics.aswesumaCounts['Not selected']}
          </div>
          <span className="text-[11px] text-slate-600 block mt-0.5">
            {isTa ? 'தெரிவு செய்யப்படாதோர்' : 'Non-selected families'}
          </span>
        </div>

        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
          <div className="text-[11px] font-bold text-purple-800 uppercase">
            {isTa ? 'தற்காலிக அடையாள அட்டை (18+)' : 'Temp NIC Issued (18+)'}
          </div>
          <div className="text-2xl font-black text-purple-700 font-mono mt-1">
            {analytics.sectorCounts.tempNicHolders}
          </div>
          <span className="text-[11px] text-purple-600 block mt-0.5">
            {isTa ? 'நிரந்தர NIC முகாம் தேவை' : 'Needs Civil NIC Camp'}
          </span>
        </div>

        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="text-[11px] font-bold text-emerald-800 uppercase">
            {isTa ? 'உதவி பெறாத குடும்பங்கள்' : 'Unassisted Families'}
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
            {analytics.unassistedFamilies}
          </div>
          <span className="text-[11px] text-emerald-600 block mt-0.5">
            {isTa ? 'முன்னுரிமை இலக்கு' : 'Immediate Aid Target'}
          </span>
        </div>
      </div>

      {/* Executive Summary Box */}
      <div className="bg-white border-2 border-indigo-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {isTa
                  ? '1. செயலக நிறைவேற்றுச் சுருக்கம் (AI Executive Assessment)'
                  : '1. Divisional Secretariat Executive Assessment'}
              </h3>
              <p className="text-xs text-slate-500">
                {isTa
                  ? 'வாகரை பிரதேச செயலகத்தின் தற்போதைய சமூக-பொருளாதார மற்றும் நலன்புரி நிலைமை'
                  : 'Real-time socio-economic and welfare assessment across Koralaipattu North'}
              </p>
            </div>
          </div>
          {aiReport && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
              {isTa ? 'Gemini AI நேரலை அறிக்கை' : 'Gemini AI Live Verified'}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-800 leading-relaxed font-medium bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
          {activeReport.executiveSummary}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200">
            <div className="text-xs font-black text-rose-900 uppercase mb-1 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-rose-600" />
              <span>
                {isTa
                  ? 'அஸ்வெசும (Aswesuma) இடைவெளிப் பகுப்பாய்வு'
                  : 'Aswesuma Welfare Gap Analysis'}
              </span>
            </div>
            <p className="text-xs text-rose-900 leading-relaxed">{activeReport.aswesumaGapAnalysis}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200">
            <div className="text-xs font-black text-purple-900 uppercase mb-1 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-purple-600" />
              <span>
                {isTa
                  ? '18+ தற்காலிக அடையாள அட்டை (TMP-NIC) & ஆவண நடவடிக்கை'
                  : '18+ Temporary NIC & Civil Documentation Action'}
              </span>
            </div>
            <p className="text-xs text-purple-900 leading-relaxed">
              {activeReport.nicAndDocumentationAction}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION A: எங்கு அதிக கவனம் செலுத்த வேண்டும்? (High Attention GS Divisions) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {isTa
                  ? '2. எங்கு அதிக கவனம் செலுத்த வேண்டும்? (அதிக இடர்பாடு கொண்ட கிராம சேவகர் பிரிவுகள்)'
                  : '2. Where to Focus High Attention? (Priority GN Divisions Ranked by Urgency)'}
              </h3>
              <p className="text-xs text-slate-500">
                {isTa
                  ? 'வறுமை, உதவி பெறாத குடும்பங்கள் மற்றும் 7 இடர்பாட்டுக் குறிகாட்டிகளின் அடிப்படையில் அதிக கவனம் செலுத்த வேண்டிய பிரிவுகள்'
                  : 'GN Divisions requiring immediate attention based on unassisted families, Aswesuma poverty, and vulnerability indicators'}
              </p>
            </div>
          </div>
        </div>

        {/* AI Recommended High Attention Divisions Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeReport.highAttentionDivisions.map((divItem, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white transition-colors space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-black flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <h4 className="text-sm font-black text-slate-900">{divItem.divisionName}</h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  {divItem.urgencyLevel}
                </span>
              </div>
              <p className="text-xs text-slate-700 font-medium">{divItem.keyIssues}</p>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-semibold flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>{isTa ? 'பரிந்துரைக்கப்படும் நடவடிக்கை: ' : 'Immediate Action: '}</strong>
                  {divItem.immediateAction}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Complete 16 GS Division Matrix Table */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white uppercase text-[11px]">
                <th className="py-2.5 px-3 rounded-tl-lg">{isTa ? 'தரவரிசை' : 'Rank'}</th>
                <th className="py-2.5 px-3">{isTa ? 'கிராம சேவகர் பிரிவு' : 'GN Division'}</th>
                <th className="py-2.5 px-3 text-center">{isTa ? 'குடும்பங்கள்' : 'Families'}</th>
                <th className="py-2.5 px-3 text-center">{isTa ? 'உதவி பெறாதவை' : 'Unassisted'}</th>
                <th className="py-2.5 px-3 text-center">Severely Poor / Poor</th>
                <th className="py-2.5 px-3 text-center">{isTa ? 'வீடு/காணி தேவை' : 'Housing/Land'}</th>
                <th className="py-2.5 px-3 text-center">{isTa ? 'மருத்துவம்/மாற்றுத்திறன்' : 'Health/Disability'}</th>
                <th className="py-2.5 px-3 text-center">{isTa ? 'கல்வி இடர்பாடு' : 'Edu Risk'}</th>
                <th className="py-2.5 px-3 text-center rounded-tr-lg">{isTa ? 'கவனக்குறியீடு' : 'Urgency Score'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {analytics.rankedDivisions.map((d, index) => (
                <tr key={d.divisionName} className={index < 3 ? 'bg-rose-50/40 font-semibold' : 'hover:bg-slate-50'}>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-700">#{index + 1}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{d.divisionName}</td>
                  <td className="py-2.5 px-3 text-center font-mono">{d.totalFamilies}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-amber-700 font-bold">
                    {d.unassistedFamilies}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-rose-700 font-bold">
                    {d.severelyPoor + d.poor}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">{d.housingNeedCount}</td>
                  <td className="py-2.5 px-3 text-center font-mono">{d.disabilityCount}</td>
                  <td className="py-2.5 px-3 text-center font-mono">{d.educationRiskCount}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                        index < 3
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : index < 7
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {d.urgencyScore} pts
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION B: எவ்விடயத்தில் அதிகம் எமது செயலகம் செயற்பட வேண்டும்? (Sectoral Action Plan) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              {isTa
                ? '3. எவ்விடயத்தில் அதிகம் எமது செயலகம் செயற்பட வேண்டும்? (துறைசார் முன்னுரிமைத் திட்டங்கள்)'
                : '3. In Which Sectors Must Our Secretariat Act Most? (Departmental Intervention Matrix)'}
            </h3>
            <p className="text-xs text-slate-500">
              {isTa
                ? 'பிரதேச செயலகத்தின் திட்டமிடல், சமூக சேவைகள், காணி, வாழ்வாதாரம் மற்றும் ஆட்பதிவுப் பிரிவுகள் முன்னெடுக்க வேண்டிய செயற்பாடுகள்'
                : 'Targeted programs recommended for Planning, Social Services, Land, Livelihood, and Civil Registration branches'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5">
          {activeReport.priorityActionAreas.map((area, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black text-indigo-950">{area.sectorTitle}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
                    {area.targetGroupCount}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                    {area.timeline}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  <strong className="text-slate-800">{isTa ? 'ஏன் முக்கியம்: ' : 'Why Critical: '}</strong>
                  {area.whyCritical}
                </p>
                <p className="text-xs text-emerald-800 font-semibold">
                  <strong className="text-emerald-950">
                    {isTa ? 'செயலகம் முன்னெடுக்க வேண்டிய திட்டம்: ' : 'Recommended Secretariat Action: '}
                  </strong>
                  {area.recommendedProgram}
                </p>
              </div>

              {onNavigate && (
                <button
                  onClick={() => onNavigate('registry')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shrink-0 self-start lg:self-center cursor-pointer no-print"
                >
                  <span>{isTa ? 'பயனாளிகளை வடிகட்டுக' : 'Filter Beneficiaries'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SECTION C: 5-Point Action Plan for Divisional Secretary */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
          <Award className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-black">
            {isTa
              ? '4. பிரதேச செயலாளர் மற்றும் உத்தியோகத்தர்களுக்கான 5 முக்கிய செயற்பாட்டுப் பரிந்துரைகள்'
              : '4. 5-Point Strategic Action Plan for Divisional Secretariat Officers'}
          </h3>
        </div>
        <ul className="space-y-2.5">
          {activeReport.secretariatActionPlan.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-xs sm:text-sm text-slate-200 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
