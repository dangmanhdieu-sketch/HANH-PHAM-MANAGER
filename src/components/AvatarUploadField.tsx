import React, { useRef, useState } from 'react';
import { Camera, Upload, X, User, Check } from 'lucide-react';

interface AvatarUploadFieldProps {
  value: string;
  onChange: (base64: string) => void;
  label?: string;
  className?: string;
}

export const AvatarUploadField: React.FC<AvatarUploadFieldProps> = ({
  value,
  onChange,
  label = 'Ảnh chân dung nhân viên',
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  // Process file upload and compress directly via canvas
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate that it's an image
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WebP).');
      return;
    }

    setProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress image to max 600x600 for optimal storage & speed
        const MAX_DIM = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          onChange(compressedDataUrl);
        }
        setProcessing(false);
      };
      img.onerror = () => {
        setProcessing(false);
        alert('Không thể đọc tệp hình ảnh.');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be re-selected if needed
    e.target.value = '';
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block font-semibold text-stone-700 text-xs">
          {label}
        </label>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex items-center gap-3.5 p-3 rounded-xl border border-stone-200 bg-[#FAF8F5] hover:border-stone-300 transition">
        {/* Avatar Preview Box */}
        <div className="relative w-16 h-16 rounded-xl bg-stone-200 border-2 border-stone-300 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner">
          {value ? (
            <img
              src={value}
              alt="Avatar preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-8 h-8 text-stone-400" />
          )}

          {processing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[10px] font-bold">
              ...
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={processing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-black text-[#f3dfa2] text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <Camera className="w-3.5 h-3.5 text-[#c5a059]" />
              <span>{value ? 'Đổi ảnh từ điện thoại' : 'Tải ảnh từ điện thoại'}</span>
            </button>

            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-300 text-stone-600 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 text-xs transition"
                title="Xóa ảnh chân dung"
              >
                <X className="w-3.5 h-3.5" />
                <span>Xóa</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-stone-400 leading-tight">
            Chụp trực tiếp bằng camera hoặc chọn ảnh từ thư viện điện thoại.
          </p>
        </div>
      </div>
    </div>
  );
};
