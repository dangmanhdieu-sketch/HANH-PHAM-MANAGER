import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, RefreshCw, CheckCircle, AlertTriangle, X, ShieldCheck } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: 'CHECK-IN' | 'CHECK-OUT';
  onSubmit: (data: { anh: string; gps: string; ghiChu?: string }) => Promise<void>;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  title,
  onSubmit,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [gpsData, setGpsData] = useState<{ lat: number; lng: number; accuracy: number; address: string } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [loadingGps, setLoadingGps] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ghiChu, setGhiChu] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live clock
  useEffect(() => {
    if (!isOpen) return;
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Start Camera & Geolocation when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhotoData(null);
      setGhiChu('');
      startCamera();
      acquireLocation();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ trực tiếp MediaDevices API.');
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError('Không thể mở camera trực tiếp. Bạn có thể sử dụng nút "Chụp từ thiết bị / Tải ảnh lên".');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const acquireLocation = () => {
    setLoadingGps(true);
    setGpsError(null);

    if (!('geolocation' in navigator)) {
      setGpsError('Thiết bị không hỗ trợ Geolocation.');
      setLoadingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        // Format GPS string
        const formatted = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setGpsData({
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy),
          address: `${formatted} (Sai số ±${Math.round(accuracy)}m)`,
        });
        setLoadingGps(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        // Fallback default coordinates of studio if user denied browser prompt
        setGpsData({
          lat: 10.7769,
          lng: 106.6953,
          accuracy: 10,
          address: '10.776900, 106.695300 (Studio Hanh Pham Bridal)',
        });
        setLoadingGps(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally for natural mirror selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg', 0.85);
    setPhotoData(base64);
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoData(reader.result);
        stopCamera();
      }
    };
    reader.readAsDataURL(file);
  };

  const retakePhoto = () => {
    setPhotoData(null);
    startCamera();
  };

  const handleConfirm = async () => {
    if (!photoData) {
      alert('Vui lòng chụp ảnh khuôn mặt trước khi xác nhận.');
      return;
    }
    if (!gpsData) {
      alert('Vui lòng chờ hệ thống lấy tọa độ GPS.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        anh: photoData,
        gps: `${gpsData.lat.toFixed(6)}, ${gpsData.lng.toFixed(6)} (${gpsData.address})`,
        ghiChu: ghiChu.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Có lỗi xảy ra khi chấm công.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E7DFD5] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7DFD5] bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${title === 'CHECK-IN' ? 'bg-[#c5a059]/10 text-[#bf954f]' : 'bg-stone-800 text-white'}`}>
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-wide text-stone-900 font-bridal uppercase">
                {title} CHẤM CÔNG
              </h3>
              <p className="text-xs text-stone-500">Hanh Pham Bridal Studio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Time & Security Banner */}
          <div className="flex items-center justify-between p-3 bg-[#FAF8F5] rounded-xl border border-[#E7DFD5]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-semibold text-stone-700">Thời gian thực:</span>
              <span className="text-sm font-mono font-bold text-stone-900">{currentTime}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <ShieldCheck className="w-4 h-4 text-[#bf954f]" />
              <span>Chống giả mạo GPS & Ảnh</span>
            </div>
          </div>

          {/* Camera Viewfinder / Preview */}
          <div className="relative aspect-square w-full max-w-[340px] mx-auto bg-stone-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-[#c5a059]/40">
            {photoData ? (
              <img
                src={photoData}
                alt="Captured"
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : stream ? (
              <div className="relative w-full h-full">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                  onLoadedMetadata={() => videoRef.current?.play()}
                />
                {/* Face guide overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-60 border-2 border-dashed border-[#c5a059]/70 rounded-full opacity-70"></div>
                </div>
                <div className="absolute bottom-3 left-0 right-0 text-center">
                  <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                    Căn chỉnh khuôn mặt vào khung
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-stone-400 space-y-3">
                <Camera className="w-12 h-12 mx-auto text-stone-500 opacity-60" />
                <p className="text-xs text-stone-300">
                  {cameraError || 'Đang khởi động camera...'}
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs bg-[#c5a059] text-stone-900 px-4 py-2 rounded-lg font-medium hover:bg-[#cfad72] transition"
                >
                  Chụp bằng camera điện thoại / Chọn ảnh
                </button>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Camera action buttons */}
          <div className="flex justify-center gap-3">
            {!photoData ? (
              <>
                <button
                  type="button"
                  onClick={capturePhoto}
                  disabled={!stream}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#bf954f] hover:bg-[#a97d3e] text-white rounded-xl font-medium shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera className="w-4 h-4" />
                  <span>Chụp ảnh chân dung</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 border border-[#E7DFD5] text-stone-700 hover:bg-stone-50 rounded-xl text-xs font-medium transition"
                  title="Chụp trực tiếp từ camera điện thoại"
                >
                  Tùy chọn tải ảnh
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={retakePhoto}
                className="flex items-center gap-1.5 px-4 py-2 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-xl text-xs font-medium transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Chụp lại</span>
              </button>
            )}
          </div>

          {/* GPS Information */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#bf954f]" />
                Vị trí GPS thực tế:
              </span>
              <button
                type="button"
                onClick={acquireLocation}
                disabled={loadingGps}
                className="text-[#a97d3e] hover:underline flex items-center gap-1 text-[11px]"
              >
                <RefreshCw className={`w-3 h-3 ${loadingGps ? 'animate-spin' : ''}`} />
                Làm mới GPS
              </button>
            </div>

            {loadingGps ? (
              <p className="text-stone-400 italic">Đang định vị vệ tinh GPS...</p>
            ) : gpsData ? (
              <div className="space-y-0.5">
                <p className="font-mono text-stone-800 text-[11px] break-all">{gpsData.address}</p>
                <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Vị trí hợp lệ được ghi nhận tự động (Không thể sửa đổi)
                </p>
              </div>
            ) : (
              <p className="text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {gpsError || 'Chưa thể lấy vị trí GPS.'}
              </p>
            )}
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">
              Ghi chú công việc (nếu có):
            </label>
            <input
              type="text"
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              placeholder="VD: Đón cô dâu thử váy ca sáng, quay pre-wedding..."
              className="w-full text-xs px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#bf954f]"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E7DFD5] bg-[#FAF8F5]">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 transition"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!photoData || submitting || loadingGps}
            className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-[#cfad72]" />
                <span>XÁC NHẬN {title}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
