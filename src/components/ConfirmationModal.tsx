import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  errorMessage?: string | null;
  fullScreen?: boolean;
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
  errorMessage = null,
  fullScreen = false,
}) => {
  useEffect(() => {
    if (!isOpen || !fullScreen || typeof document === 'undefined') return;

    // Freeze the page at its current scroll position while the approval
    // confirmation is open. This prevents iOS Safari from placing the dialog
    // at the document's previous scroll offset.
    const scrollY = window.scrollY;
    const body = document.body;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, fullScreen]);

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

  const modalContent = (
    <div
      className={fullScreen
        ? "fixed inset-0 z-[2147483647] flex w-screen items-stretch justify-center overflow-hidden bg-[#F8F5EF]"
        : "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"}
      style={fullScreen ? {
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        minHeight: 0,
        zIndex: 2147483647,
        transform: 'none',
        margin: 0,
      } : undefined}
    >
      <div className={fullScreen
        ? "flex h-full min-h-0 w-full max-w-none flex-col overflow-hidden bg-[#F8F5EF] px-5 pt-[max(24px,env(safe-area-inset-top))] pb-0"
        : "w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E7DFD5] overflow-hidden p-6 space-y-4"}>
        <div className={fullScreen
          ? "flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-1 py-8 text-center"
          : "flex items-start gap-4"}>
          <div className={fullScreen
            ? "flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-[#E7DFD5] bg-white shadow-sm"
            : "p-3 bg-[#FAF8F5] rounded-xl border border-[#E7DFD5]"}>
            {iconMap[type]}
          </div>
          <div className={fullScreen ? "w-full max-w-xl" : "flex-1"}>
            <h3 className={fullScreen
              ? "text-2xl font-bold text-stone-900 font-bridal"
              : "text-lg font-bold text-stone-900 font-bridal"}>
              {title}
            </h3>
            <p className={fullScreen
              ? "mt-5 text-lg leading-relaxed text-stone-700 whitespace-pre-line"
              : "mt-1 text-sm text-stone-600 leading-relaxed whitespace-pre-line"}>
              {message}
            </p>
          </div>
        </div>

        {errorMessage && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
            {errorMessage}
          </div>
        )}

        <div className={fullScreen
          ? "mt-auto flex w-full shrink-0 items-center justify-between gap-3 border-t border-[#E7DFD5] bg-[#F8F5EF] px-1 pt-5 pb-[calc(env(safe-area-inset-bottom)+24px)]"
          : "flex items-center justify-end gap-3 pt-4 border-t border-[#E7DFD5]"}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={fullScreen
              ? "min-h-14 flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-stone-600 hover:text-stone-900 transition uppercase tracking-wider"
              : "px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition uppercase tracking-wider"}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!loading) void onConfirm();
            }}
            disabled={loading}
            className={`min-h-14 flex-[2] justify-center rounded-xl px-5 py-3 text-sm font-bold uppercase tracking-wider shadow-md transition flex items-center gap-2 ${buttonColorMap[type]} disabled:opacity-50`}
          >
            {loading ? 'Đang xử lý...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return fullScreen ? createPortal(modalContent, document.body) : modalContent;
};
