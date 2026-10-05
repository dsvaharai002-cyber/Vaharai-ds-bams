import React, { useState } from 'react';
import { QRChangeRequest, User } from '../types';
import { StorageService } from '../services/storageService';
import { TRANSLATIONS, Language } from '../utils/translations';
import {
  FileCheck2,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Check,
  X
} from 'lucide-react';

interface QrRequestsViewProps {
  currentUser: User;
  currentLang?: Language;
  initialQR?: string;
  initialOldNIC?: string;
}

export const QrRequestsView: React.FC<QrRequestsViewProps> = ({
  currentUser,
  currentLang = 'en',
  initialQR = '',
  initialOldNIC = ''
}) => {
  const t = TRANSLATIONS[currentLang];
  const isTa = currentLang === 'ta';
  const [requests, setRequests] = useState<QRChangeRequest[]>(() => StorageService.getFilteredQRRequests(currentUser));
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [activeActionModal, setActiveActionModal] = useState<{
    request: QRChangeRequest;
    approve: boolean;
  } | null>(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState({
    QR_Number: initialQR,
    Old_NIC_Elder_ID: initialOldNIC,
    New_NIC_Elder_ID: '',
    Reason: ''
  });

  const refreshList = () => {
    setRequests(StorageService.getFilteredQRRequests(currentUser));
  };

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      StorageService.requestQRChange(currentUser, {
        QR_Number: formData.QR_Number,
        Old_NIC_Elder_ID: formData.Old_NIC_Elder_ID,
        New_NIC_Elder_ID: formData.New_NIC_Elder_ID,
        Reason: formData.Reason
      });
      refreshList();
      setShowSubmitModal(false);
      setFormData({
        QR_Number: '',
        Old_NIC_Elder_ID: '',
        New_NIC_Elder_ID: '',
        Reason: ''
      });
      setFeedback({
        type: 'success',
        message: isTa
          ? 'QR/NIC மாற்றுக் கோரிக்கை முதன்மை நிர்வாகியின் வரிசையில் சமர்ப்பிக்கப்பட்டது.'
          : 'QR/NIC change request submitted successfully to Super Admin queue.'
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
      } else {
        setFeedback({
          type: 'error',
          message: isTa ? 'கோரிக்கையை சமர்ப்பிக்க முடியவில்லை.' : 'Failed to submit request.'
        });
      }
    }
  };

  const handleProcessAction = () => {
    if (!activeActionModal) return;
    try {
      const res = StorageService.approveQRChange(
        currentUser,
        activeActionModal.request.Request_ID,
        activeActionModal.approve,
        actionRemarks
      );
      refreshList();
      setActiveActionModal(null);
      setActionRemarks('');
      setFeedback({ type: 'success', message: res.message });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
      } else {
        setFeedback({
          type: 'error',
          message: isTa ? 'நடவடிக்கை தோல்வியுற்றது.' : 'Action failed.'
        });
      }
    }
  };

  const isSuperAdmin = currentUser.Role === 'Super_Admin' || currentUser.Role === 'Super Admin';

  const getStatusBadge = (status: QRChangeRequest['Status']) => {
    if (status === 'Approved') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
          <CheckCircle2 className="w-3 h-3" />
          {isTa ? 'அங்கீகரிக்கப்பட்டது' : 'Approved'}
        </span>
      );
    }
    if (status === 'Rejected') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
          <XCircle className="w-3 h-3" />
          {isTa ? 'நிராகரிக்கப்பட்டது' : 'Rejected'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
        <Clock className="w-3 h-3" />
        {isTa ? 'நிலுவையில்' : 'Pending'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-emerald-600" />
            {t.qrRequestsTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {currentUser.Role === 'GN_Officer' || currentUser.Role === 'GN Officer'
              ? `${t.showingDivisions}: ${currentUser.Division} (${requests.length} ${isTa ? 'கோரிக்கைகள்' : 'requests'})`
              : `${t.allDivisionsScope} (${requests.length} ${isTa ? 'கோரிக்கைகள்' : 'requests'})`}
          </p>
        </div>
        <button
          onClick={() => setShowSubmitModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isTa ? 'புதிய மாற்றுக் கோரிக்கை' : 'New Change Request'}</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs flex gap-2 items-center ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-3 font-mono">{isTa ? 'கோரிக்கை எண்' : 'Request ID'}</th>
                <th className="px-3.5 py-3 font-mono">{t.qrNumber}</th>
                <th className="px-3.5 py-3 font-mono">{isTa ? 'பழைய NIC / அடையாள அட்டை' : 'Old NIC / Elder ID'}</th>
                <th className="px-3.5 py-3 font-mono">{isTa ? 'புதிய NIC / அடையாள அட்டை' : 'New NIC / Elder ID'}</th>
                <th className="px-3.5 py-3">{isTa ? 'காரணம்' : 'Justification Reason'}</th>
                <th className="px-3.5 py-3 font-mono">{isTa ? 'கோரியவர்' : 'Requested By'}</th>
                <th className="px-3.5 py-3">{isTa ? 'நிலை' : 'Status'}</th>
                <th className="px-3.5 py-3 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <FileCheck2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-600">
                      {isTa ? 'கோரிக்கைகள் எதுவும் நிலுவையில் இல்லை.' : 'No change requests in record.'}
                    </p>
                  </td>
                </tr>
              ) : (
                requests.map(req => (
                  <tr key={req.Request_ID} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3.5 py-3 font-mono text-slate-600 font-medium">{req.Request_ID}</td>
                    <td className="px-3.5 py-3 font-mono font-bold text-emerald-700">{req.QR_Number}</td>
                    <td className="px-3.5 py-3 font-mono text-slate-700">{req.Old_NIC_Elder_ID}</td>
                    <td className="px-3.5 py-3 font-mono font-semibold text-slate-900">{req.New_NIC_Elder_ID}</td>
                    <td className="px-3.5 py-3 text-slate-700 max-w-xs truncate">{req.Reason}</td>
                    <td className="px-3.5 py-3 font-mono text-slate-600">{req.Requested_By}</td>
                    <td className="px-3.5 py-3">{getStatusBadge(req.Status)}</td>
                    <td className="px-3.5 py-3 text-right">
                      {req.Status === 'Pending' && isSuperAdmin ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setActiveActionModal({ request: req, approve: true })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>{isTa ? 'அங்கீகரி' : 'Approve'}</span>
                          </button>
                          <button
                            onClick={() => setActiveActionModal({ request: req, approve: false })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                            <span>{isTa ? 'நிராகரி' : 'Reject'}</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">
                          {req.Approved_By ? `${isTa ? 'அங்கீகரித்தவர்:' : 'By'} ${req.Approved_By}` : '-'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Request Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                {isTa ? 'புதிய QR / NIC மாற்றுக் கோரிக்கை' : 'New QR / NIC Change Request'}
              </h3>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.qrNumber} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VHR-PCK-001"
                  value={formData.QR_Number}
                  onChange={e => setFormData({ ...formData, QR_Number: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isTa ? 'தற்போதைய NIC / அடையாள அட்டை' : 'Current / Conflicting Old NIC'} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 198512345678"
                  value={formData.Old_NIC_Elder_ID}
                  onChange={e => setFormData({ ...formData, Old_NIC_Elder_ID: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isTa ? 'புதிய சரியான NIC / அடையாள அட்டை' : 'New Correct NIC or Elder ID'} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 198598765432"
                  value={formData.New_NIC_Elder_ID}
                  onChange={e => setFormData({ ...formData, New_NIC_Elder_ID: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isTa ? 'காரணம்' : 'Reason / Justification'} <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder={isTa ? 'காரணத்தை உள்ளிடவும்...' : 'e.g. Typographical error during initial registration or household separation.'}
                  value={formData.Reason}
                  onChange={e => setFormData({ ...formData, Reason: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                >
                  {isTa ? 'சமர்ப்பிக்க' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
