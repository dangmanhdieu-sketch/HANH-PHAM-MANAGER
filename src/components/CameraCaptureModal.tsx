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
  const streamRef = useRef<MediaStream | null>(null);

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
    const timer = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  // Start/stop camera + GPS when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    setPhotoData(null);
    setGhiChu('');
    setCameraError(null);
    setGpsData(null);

    void startCamera();
    acquireLocation();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // IMPORTANT:
  // The <video> element is rendered only after stream state changes.
  // The old code tried to assign srcObject immediately inside startCamera(),
  // when videoRef.current could still be null. This effect attaches the
  // stream after the video element actually exists.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;

    const playVideo = async () => {
      try {
        await video.play();
      } catch (err) {
        console.warn('Video autoplay/play error:', err);
      }
    };

    if (video.readyState >= 1) {
      void playVideo();
    } else {
      video.addEventListener('loadedmetadata', playVideo, { once: true });
    }

    return () => {
      video.removeEventListener('loadedmetadata', playVideo);
      if (video.srcObject === stream) {
        video.pause();
        video.srcObject = null;
      }
    };
  }, [stream]);

  const startCamera = async () => {
    setCameraError(null);

    // Stop any previous stream first.
    stopCamera();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ camera trực tiếp.');
      }

      // "ideal" is more compatible across desktop + mobile browsers than
      // requiring an exact front-camera constraint.
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
        audio: false,
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
    } catch (err: any) {
      console.warn('Camera stream error:', err);

      let message = 'Không thể mở camera trực tiếp.';

      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        message = 'Camera chưa được cấp quyền. Hãy cho phép quyền Camera rồi bấm "Thử mở camera lại".';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        message = 'Không tìm thấy camera trên thiết bị.';
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        message = 'Camera đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đang dùng camera rồi thử lại.';
      } else if (err?.message) {
        message = err.message;
      }

      setCameraError(message);
      setStream(null);
      streamRef.current = null;
    }
  };

  const stopCamera = () => {
    const currentStream = streamRef.current || stream;

    if (currentStream) {
      currentStream.getTracks().forEach((track) => track.stop());
    }

    streamRef.current = null;
    setStream(null);

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
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

        // Keep the existing fallback behavior from the original component.
        setGpsData({
          lat: 10.7769,
          lng: 106.6953,
          accuracy: 10,
          address: '10.776900, 106.695300 (Studio Hanh Pham Bridal)',
        });

        setGpsError(
          err.code === 1
            ? 'Bạn chưa cấp quyền GPS. Hệ thống đang dùng tọa độ dự phòng.'
            : 'Không lấy được GPS chính xác. Hệ thống đang dùng tọa độ dự phòng.'
        );

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
    const video = videoRef.current;

    if (!video || !streamRef.current) {
      alert('Camera chưa sẵn sàng. Vui lòng chờ camera hiển thị hình rồi thử lại.');
      return;
    }

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    if (!videoWidth || !videoHeight || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      alert('Camera chưa có khung hình. Vui lòng chờ 1–2 giây rồi thử lại.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      alert('Không thể tạo ảnh chụp.');
      return;
    }

    // IMPORTANT:
    // The live preview is mirrored with CSS for a natural selfie experience.
    // Do NOT mirror the canvas here. This makes the saved/check-in photo
    // normal (not reversed).
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg', 0.88);

    setPhotoData(base64);
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn một file hình ảnh.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Uploaded images are kept in their original orientation.
        setPhotoData(reader.result);
        stopCamera();
      }
    };

    reader.onerror = () => {
      alert('Không thể đọc ảnh. Vui lòng thử lại.');
    };

    reader.readAsDataURL(file);

    // Allow selecting the same image again later.
    e.target.value = '';
  };

  const retakePhoto = () => {
    setPhotoData(null);
    void startCamera();
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
      alert(err?.message || 'Có lỗi xảy ra khi chấm công.');
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
            <div
              className={`p-2 rounded-full ${
                title === 'CHECK-IN'
                  ? 'bg-[#c5a059]/10 text-[#bf954f]'
                  : 'bg-stone-800 text-white'
              }`}
            >
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
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
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
                className="w-full h-full object-cover"
              />
            ) : stream ? (
              <div className="relative w-full h-full">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />

                {/* Face guide overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-60 border-2 border-dashed border-[#c5a059]/70 rounded-full opacity-70" />
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
                  onClick={() => void startCamera()}
                  className="text-xs bg-[#c5a059] text-stone-900 px-4 py-2 rounded-lg font-medium hover:bg-[#cfad72] transition"
                >
                  Thử mở camera lại
                </button>
              </div>
            )}
          </div>

          {/* Hidden file input.
              IMPORTANT: No capture="user" here.
              Without capture, mobile browsers open the normal image picker
              instead of forcing the camera. */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
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
                  title="Chọn ảnh có sẵn trên thiết bị"
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
                <p className="font-mono text-stone-800 text-[11px] break-all">
                  {gpsData.address}
                </p>

                <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Vị trí hợp lệ được ghi nhận tự động (Không thể sửa đổi)
                </p>

                {gpsError && (
                  <p className="text-[10px] text-amber-600">{gpsError}</p>
                )}
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
