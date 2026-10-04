import React from 'react';
import { AlertCircle, HelpCircle, CheckCircle, ShieldAlert } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info' | 'success';
  loading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'XÁC NHẬN',
  cancelText = 'HỦY',
  type = 'info',
  loading = false,
}) => {
  if (!isOpen) return null;

  const iconMap = {
    warning: <AlertCircle className="w-8 h-8 text-amber-500" />,
    danger: <ShieldAlert className="w-8 h-8 text-rose-500" />,
    info: <HelpCircle className="w-8 h-8 text-[#bf954f]" />,
    success: <CheckCircle className="w-8 h-8 text-emerald-500" />,
  };

  const buttonColorMap = {
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white',
    info: 'bg-stone-900 hover:bg-stone-800 text-white border border-[#bf954f]',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E7DFD5] overflow-hidden p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E7DFD5]">
            {iconMap[type]}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-stone-900 font-bridal">
              {title}
            </h3>
            <p className="mt-1 text-sm text-stone-600 leading-relaxed whitespace-pre-line">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E7DFD5]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition uppercase tracking-wider"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition flex items-center gap-2 ${buttonColorMap[type]} disabled:opacity-50`}
          >
            {loading ? 'Đang xử lý...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
