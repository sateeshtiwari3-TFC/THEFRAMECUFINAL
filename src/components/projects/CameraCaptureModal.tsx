import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  CameraOff, 
  X, 
  RotateCcw, 
  Check, 
  Trash2, 
  FlipHorizontal, 
  Upload, 
  AlertCircle,
  Sparkles,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CapturedPhotoItem {
  id: string;
  dataUrl: string;
  blob: Blob;
  capturedAt: string;
  name: string;
}

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName?: string;
  onConfirmPhotos: (photos: { dataUrl: string; blob: Blob; name: string }[]) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  projectName = 'Project',
  onConfirmPhotos,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhotoItem[]>([]);
  const [flashEffect, setFlashEffect] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Play subtle shutter sound using Web Audio API
  const playShutterSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Audio not permitted or not supported
    }
  }, []);

  // Stop camera stream safely
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // Start camera stream
  const startCameraStream = useCallback(async () => {
    stopCameraStream();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported on this browser or platform.');
      return;
    }

    try {
      // Check available video devices
      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setHasMultipleCameras(videoDevices.length > 1);

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((err) => {
            console.warn('Video play error:', err);
          });
          setIsStreaming(true);
        };
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      let message = 'Unable to access camera. Please check your browser permissions.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera permission denied. Please allow camera access in your browser settings to take reference photos.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No camera device found. You can upload photos using the file selector below.';
      } else if (err.name === 'NotReadableError') {
        message = 'Camera is already in use by another application.';
      }
      setCameraError(message);
      setIsStreaming(false);
    }
  }, [facingMode, stopCameraStream]);

  // Handle modal lifecycle
  useEffect(() => {
    if (isOpen) {
      startCameraStream();
    } else {
      stopCameraStream();
      setCapturedPhotos([]);
      setCameraError(null);
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, startCameraStream, stopCameraStream]);

  // Toggle between front and rear cameras
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture current frame from video to canvas
  const handleSnapPhoto = () => {
    if (!videoRef.current || !isStreaming) return;

    playShutterSound();
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 150);

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvasRef.current = canvas;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If using user/front camera, mirror horizontally for natural feel
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const newPhoto: CapturedPhotoItem = {
          id: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          dataUrl,
          blob,
          capturedAt: new Date().toISOString(),
          name: `camera-ref-${capturedPhotos.length + 1}-${Date.now()}.jpg`,
        };

        setCapturedPhotos((prev) => [...prev, newPhoto]);
      },
      'image/jpeg',
      0.92
    );
  };

  // Remove photo from staging queue
  const handleRemovePhoto = (id: string) => {
    setCapturedPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // Handle fallback file upload from file picker inside the camera modal
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    (Array.from(files) as File[]).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setCapturedPhotos((prev) => [
          ...prev,
          {
            id: `file-${Date.now()}-${index}`,
            dataUrl,
            blob: file,
            capturedAt: new Date().toISOString(),
            name: file.name,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  // Confirm and return all captured photos
  const handleConfirmAndUpload = () => {
    if (capturedPhotos.length === 0) return;
    onConfirmPhotos(
      capturedPhotos.map((p) => ({
        dataUrl: p.dataUrl,
        blob: p.blob,
        name: p.name,
      }))
    );
    stopCameraStream();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl bg-charcoal-950 border border-gold-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-charcoal-900/60">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                  <span>Camera Reference Capture</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-gold-500/20 text-gold-300 border border-gold-500/30">
                    Live Viewfinder
                  </span>
                </h3>
                <p className="text-xs text-gray-400 font-sans">
                  Snap reference photos, lighting angles, & shoot moodboards for <strong className="text-gold-400">{projectName}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                stopCameraStream();
                onClose();
              }}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Viewfinder Stage */}
          <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
            {/* Shutter flash animation */}
            <div
              className={`absolute inset-0 bg-white z-30 pointer-events-none transition-opacity duration-150 ${
                flashEffect ? 'opacity-90' : 'opacity-0'
              }`}
            />

            {/* Video element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${
                facingMode === 'user' ? 'scale-x-[-1]' : ''
              } ${isStreaming ? 'block' : 'hidden'}`}
            />

            {/* Hidden canvas for snapshot rendering */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Framing Guides / Crosshairs */}
            {isStreaming && (
              <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6">
                {/* Rule of thirds grid */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20 border border-white/20 pointer-events-none">
                  <div className="border-r border-b border-white/30" />
                  <div className="border-r border-b border-white/30" />
                  <div className="border-b border-white/30" />
                  <div className="border-r border-b border-white/30" />
                  <div className="border-r border-b border-white/30" />
                  <div className="border-b border-white/30" />
                  <div className="border-r border-white/30" />
                  <div className="border-r border-white/30" />
                  <div />
                </div>

                {/* Corner reticles */}
                <div className="flex justify-between w-full">
                  <div className="w-6 h-6 border-t-2 border-l-2 border-gold-400" />
                  <div className="w-6 h-6 border-t-2 border-r-2 border-gold-400" />
                </div>
                <div className="flex justify-between w-full">
                  <div className="w-6 h-6 border-b-2 border-l-2 border-gold-400" />
                  <div className="w-6 h-6 border-b-2 border-r-2 border-gold-400" />
                </div>

                {/* Camera info chip */}
                <div className="absolute top-4 left-4 z-20">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-black/60 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>REC LIVE</span>
                  </span>
                </div>
              </div>
            )}

            {/* Camera Error or Inactive State */}
            {cameraError && (
              <div className="p-6 text-center max-w-md z-20 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center">
                  <CameraOff className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">Camera Unavailable</h4>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">{cameraError}</p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                  <button
                    onClick={startCameraStream}
                    className="px-4 py-2 rounded-xl bg-gold-500 text-charcoal-950 font-mono font-bold text-xs flex items-center gap-1.5 hover:bg-gold-400 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry Camera</span>
                  </button>

                  <label className="px-4 py-2 rounded-xl bg-charcoal-900 border border-white/10 hover:border-gold-500/40 text-gray-200 font-mono font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-gold-400" />
                    <span>Select From Device</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      capture="environment"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Viewfinder Controls (Floating over camera) */}
            {isStreaming && (
              <div className="absolute bottom-4 left-0 right-0 z-20 flex items-center justify-center gap-6 px-4">
                {/* Switch Camera Button */}
                {hasMultipleCameras && (
                  <button
                    onClick={toggleFacingMode}
                    className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/80 hover:border-gold-500/50 transition-all cursor-pointer"
                    title="Switch Camera (Front / Rear)"
                  >
                    <FlipHorizontal className="w-5 h-5 text-gold-400" />
                  </button>
                )}

                {/* Shutter Snap Button */}
                <button
                  onClick={handleSnapPhoto}
                  className="w-18 h-18 rounded-full border-4 border-white bg-gold-500 hover:bg-gold-400 active:scale-95 transition-all flex items-center justify-center shadow-2xl cursor-pointer group"
                  title="Take Photo Snapshot"
                >
                  <div className="w-13 h-13 rounded-full border-2 border-charcoal-950/40 bg-gold-400 group-hover:bg-gold-300 transition-all flex items-center justify-center">
                    <Camera className="w-6 h-6 text-charcoal-950 stroke-[2.5]" />
                  </div>
                </button>

                {/* Direct Upload fallback button */}
                <label
                  className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/80 hover:border-gold-500/50 transition-all cursor-pointer"
                  title="Upload from Device Gallery"
                >
                  <Upload className="w-5 h-5 text-gold-400" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Staging Tray / Filmstrip */}
          <div className="p-4 bg-charcoal-900/90 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-gray-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-gold-400" />
                <span>Captured Staging Queue ({capturedPhotos.length})</span>
              </span>

              {capturedPhotos.length > 0 && (
                <button
                  onClick={() => setCapturedPhotos([])}
                  className="text-[11px] font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {capturedPhotos.length === 0 ? (
              <div className="py-4 text-center border border-dashed border-white/10 rounded-2xl bg-charcoal-950/40">
                <p className="text-xs text-gray-500 font-sans">
                  No photos snapped yet. Click the gold shutter button to capture reference stills.
                </p>
              </div>
            ) : (
              <div className="flex gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
                {capturedPhotos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    className="relative w-20 h-20 rounded-xl overflow-hidden border border-gold-500/30 shrink-0 group bg-black"
                  >
                    <img
                      src={photo.dataUrl}
                      alt={`Snap ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => handleRemovePhoto(photo.id)}
                        className="p-1 rounded-lg bg-rose-500/80 hover:bg-rose-600 text-white cursor-pointer transition-all"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="absolute bottom-1 right-1 px-1 rounded bg-black/70 text-[9px] font-mono text-gold-300">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-charcoal-950 border border-white/10 hover:bg-white/5 text-gray-300 text-xs font-mono font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAndUpload}
                disabled={capturedPhotos.length === 0}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-400 hover:from-gold-400 hover:to-amber-300 text-charcoal-950 font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-gold-500/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Confirm & Upload {capturedPhotos.length} Photo{capturedPhotos.length === 1 ? '' : 's'} to Supabase</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CameraCaptureModal;
