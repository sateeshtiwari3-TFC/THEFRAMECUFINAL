import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Trash2, 
  Maximize2, 
  ExternalLink, 
  Copy, 
  Check, 
  Image as ImageIcon, 
  Star, 
  Sparkles, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Loader2,
  HardDrive,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, ProjectReferencePhoto } from '../../types';
import { uploadProjectReferencePhoto, deleteImageFromSupabase } from '../../services/storageService';
import CameraCaptureModal from './CameraCaptureModal';
import NewBadge from '../common/NewBadge';

interface ProjectReferencePhotosGalleryProps {
  project: Project;
  onUpdateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  compact?: boolean;
}

export const ProjectReferencePhotosGallery: React.FC<ProjectReferencePhotosGalleryProps> = ({
  project,
  onUpdateProject,
  compact = false,
}) => {
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Normalize photos to ProjectReferencePhoto[]
  const referencePhotos: ProjectReferencePhoto[] = (project.referencePhotos || []).map((item: any, idx: number) => {
    if (typeof item === 'string') {
      return {
        id: `legacy-${idx}`,
        url: item,
        uploadedAt: project.createdAt || new Date().toISOString(),
        name: `Reference #${idx + 1}`,
      };
    }
    return item;
  });

  // Handle uploading multiple files / blobs
  const handleUploadFiles = async (
    items: { source: File | Blob | string; name?: string; caption?: string }[]
  ) => {
    if (!items.length) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: items.length });

    const newUploadedPhotos: ProjectReferencePhoto[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setUploadProgress({ current: i + 1, total: items.length });

      try {
        const result = await uploadProjectReferencePhoto(
          project.id,
          item.source,
          item.name,
          item.caption
        );

        if (result.success && result.photo) {
          newUploadedPhotos.push(result.photo);
        } else {
          console.warn(`Failed to upload item ${i + 1}:`, result.error);
        }
      } catch (err) {
        console.error(`Error uploading item ${i + 1}:`, err);
      }
    }

    if (newUploadedPhotos.length > 0) {
      const updatedList = [...referencePhotos, ...newUploadedPhotos];
      await onUpdateProject(project.id, {
        referencePhotos: updatedList,
      });
    }

    setIsUploading(false);
    setUploadProgress(null);
  };

  // Handle photos confirmed from CameraCaptureModal
  const handleCameraPhotosConfirmed = (
    photos: { dataUrl: string; blob: Blob; name: string }[]
  ) => {
    const items = photos.map((p, idx) => ({
      source: p.blob || p.dataUrl,
      name: p.name || `camera-ref-${idx + 1}.jpg`,
      caption: `Captured via Camera`,
    }));
    handleUploadFiles(items);
  };

  // Handle manual file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const items = (Array.from(files) as File[]).map((file) => ({
      source: file,
      name: file.name,
      caption: file.name.replace(/\.[^/.]+$/, ''),
    }));

    handleUploadFiles(items);
    e.target.value = '';
  };

  // Handle Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const items = (Array.from(files) as File[])
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        source: file,
        name: file.name,
        caption: file.name.replace(/\.[^/.]+$/, ''),
      }));

    if (items.length > 0) {
      handleUploadFiles(items);
    }
  };

  // Handle delete reference photo
  const handleDeletePhoto = async (photoId: string, photoUrl: string, storagePath?: string) => {
    const confirmDelete = window.confirm('Delete this reference photo permanently from Supabase storage?');
    if (!confirmDelete) return;

    setDeletingPhotoId(photoId);
    try {
      // Remove from Supabase Storage
      await deleteImageFromSupabase(storagePath || photoUrl);

      // Remove from Project referencePhotos
      const updatedPhotos = referencePhotos.filter((p) => p.id !== photoId);
      await onUpdateProject(project.id, {
        referencePhotos: updatedPhotos,
      });

      if (activeLightboxIndex !== null) {
        setActiveLightboxIndex(null);
      }
    } catch (err) {
      console.error('Failed to delete photo:', err);
    } finally {
      setDeletingPhotoId(null);
    }
  };

  // Set reference photo as the main project cover photo
  const handleSetAsCoverPhoto = async (photoUrl: string) => {
    try {
      await onUpdateProject(project.id, {
        couplePhoto: photoUrl,
      });
      alert('Cover photo updated successfully!');
    } catch (err) {
      console.error('Failed to update cover photo:', err);
    }
  };

  // Copy photo link
  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  // Lightbox navigation
  const handlePrevPhoto = () => {
    if (activeLightboxIndex === null) return;
    setActiveLightboxIndex((prev) => (prev! > 0 ? prev! - 1 : referencePhotos.length - 1));
  };

  const handleNextPhoto = () => {
    if (activeLightboxIndex === null) return;
    setActiveLightboxIndex((prev) => (prev! < referencePhotos.length - 1 ? prev! + 1 : 0));
  };

  const activePhoto = activeLightboxIndex !== null ? referencePhotos[activeLightboxIndex] : null;

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-charcoal-950 border border-gold-500/20 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold font-display text-white flex items-center gap-2">
                <span>Production Reference Photos</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-gold-500/20 text-gold-300 border border-gold-500/30">
                  {referencePhotos.length} {referencePhotos.length === 1 ? 'Photo' : 'Photos'}
                </span>
              </h4>
              <p className="text-[11px] text-gray-400 font-sans">
                Camera moodboards, lighting setups, & couple styling stored in <span className="text-gold-400 font-medium">Supabase Cloud</span>
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsCameraModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-400 hover:from-gold-400 hover:to-amber-300 text-charcoal-950 font-mono font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer group"
            title="Open Live Camera Viewfinder to snap reference photos"
          >
            <Camera className="w-3.5 h-3.5 group-hover:scale-110 transition-transform stroke-[2.5]" />
            <span>Take Photo</span>
            <NewBadge releaseDate="2026-09-12" daysThreshold={10} size="xs" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 border border-gold-500/30 text-gold-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Upload multiple photos from device"
          >
            <Upload className="w-3.5 h-3.5 text-gold-400" />
            <span>Upload Multi</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Uploading Progress Overlay */}
      {isUploading && uploadProgress && (
        <div className="p-4 rounded-2xl bg-charcoal-950 border border-gold-500/40 shadow-xl space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-gold-300 font-bold flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-gold-400" />
              <span>Uploading to Supabase Storage Bucket...</span>
            </span>
            <span className="text-gray-400">
              {uploadProgress.current} / {uploadProgress.total} Files
            </span>
          </div>

          <div className="w-full bg-charcoal-900 h-2 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-gold-500 to-amber-400 transition-all duration-300"
              style={{
                width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Thumbnail Grid & Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative transition-all rounded-3xl p-4 border ${
          isDragging
            ? 'border-gold-500 bg-gold-500/10 scale-[0.99]'
            : 'border-white/5 bg-charcoal-950/60'
        }`}
      >
        {referencePhotos.length === 0 ? (
          /* Empty State */
          <div className="py-12 px-4 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-charcoal-900 border border-dashed border-gold-500/30 text-gold-400 mx-auto flex items-center justify-center">
              <ImageIcon className="w-8 h-8 opacity-70" />
            </div>

            <div className="space-y-1">
              <h5 className="text-sm font-bold text-white font-display">No Reference Photos Yet</h5>
              <p className="text-xs text-gray-400 max-w-sm mx-auto font-sans leading-relaxed">
                Snap photos using your camera or drag & drop bridal entry references, lighting layouts, and drone angles for this project.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-charcoal-950 font-mono font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Camera className="w-4 h-4 stroke-[2.5]" />
                <span>Open Camera Capture</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-charcoal-900 border border-white/10 hover:border-gold-500/40 text-gray-300 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4 text-gold-400" />
                <span>Browse Files</span>
              </button>
            </div>
          </div>
        ) : (
          /* Thumbnail Grid */
          <div className={`grid gap-3.5 ${compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'}`}>
            {referencePhotos.map((photo, index) => {
              const isCover = project.couplePhoto === photo.url;
              const isDeleting = deletingPhotoId === photo.id;

              return (
                <div
                  key={photo.id || index}
                  className="group relative rounded-2xl overflow-hidden bg-charcoal-900 border border-white/10 hover:border-gold-500/50 transition-all duration-200 shadow-md flex flex-col"
                >
                  {/* Thumbnail Image Container */}
                  <div className="relative aspect-square overflow-hidden bg-black/40">
                    <img
                      src={photo.url}
                      alt={photo.caption || photo.name || `Reference ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />

                    {/* Gradient Overlay on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2.5">
                      {/* Top Action Row */}
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-black/70 text-gold-300 border border-gold-500/30 backdrop-blur-sm">
                          Supabase
                        </span>

                        <div className="flex items-center gap-1">
                          {/* Copy Link Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyLink(photo.url);
                            }}
                            className="p-1.5 rounded-lg bg-black/70 hover:bg-black text-gray-300 hover:text-white transition-all cursor-pointer"
                            title="Copy image URL"
                          >
                            {copiedUrl === photo.url ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Delete Photo Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePhoto(photo.id, photo.url, photo.storagePath);
                            }}
                            disabled={isDeleting}
                            className="p-1.5 rounded-lg bg-rose-500/80 hover:bg-rose-600 text-white transition-all cursor-pointer disabled:opacity-50"
                            title="Delete permanently"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Bottom Action Row */}
                      <div className="flex items-center justify-between gap-1 pt-2">
                        {/* Set as Cover Photo Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetAsCoverPhoto(photo.url);
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            isCover
                              ? 'bg-gold-500 text-charcoal-950'
                              : 'bg-black/70 text-gold-300 hover:bg-gold-500/20 hover:text-white border border-gold-500/30'
                          }`}
                          title={isCover ? 'Current Project Cover' : 'Set as Project Cover'}
                        >
                          <Star className={`w-3 h-3 ${isCover ? 'fill-charcoal-950' : ''}`} />
                          <span>{isCover ? 'Cover' : 'Set Cover'}</span>
                        </button>

                        {/* Fullscreen Preview Lightbox */}
                        <button
                          type="button"
                          onClick={() => setActiveLightboxIndex(index)}
                          className="p-1.5 rounded-lg bg-black/70 hover:bg-black text-gray-200 hover:text-white transition-all cursor-pointer"
                          title="View Fullscreen"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Active Cover Star Indicator */}
                    {isCover && (
                      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-gold-500 text-charcoal-950 text-[9px] font-mono font-bold flex items-center gap-1 shadow-md">
                        <Star className="w-2.5 h-2.5 fill-charcoal-950" />
                        <span>Cover</span>
                      </div>
                    )}
                  </div>

                  {/* Caption & Metadata Footer */}
                  <div className="p-2.5 bg-charcoal-950/80 border-t border-white/5 flex flex-col justify-between flex-1">
                    <p className="text-xs font-semibold text-gray-200 truncate" title={photo.caption || photo.name || `Photo #${index + 1}`}>
                      {photo.caption || photo.name || `Photo #${index + 1}`}
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 mt-1">
                      <span>#{index + 1}</span>
                      <span>
                        {photo.uploadedAt
                          ? new Date(photo.uploadedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })
                          : 'Recent'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Quick Add Card */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl border-2 border-dashed border-white/10 hover:border-gold-500/40 bg-charcoal-950/40 hover:bg-gold-500/5 transition-all p-4 flex flex-col items-center justify-center text-center cursor-pointer min-h-[140px] group"
            >
              <div className="w-10 h-10 rounded-xl bg-charcoal-900 group-hover:bg-gold-500/10 border border-white/10 group-hover:border-gold-500/30 flex items-center justify-center text-gray-400 group-hover:text-gold-400 transition-all mb-2">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-gray-300 group-hover:text-white font-display">
                + Add More
              </span>
              <span className="text-[10px] text-gray-500 font-mono mt-0.5">
                Drop files or click
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        projectName={project.coupleName}
        onConfirmPhotos={handleCameraPhotosConfirmed}
      />

      {/* Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {activePhoto && activeLightboxIndex !== null && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-lg p-4">
            {/* Backdrop click to close */}
            <div
              className="absolute inset-0"
              onClick={() => setActiveLightboxIndex(null)}
            />

            {/* Header controls */}
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-3">
                <span className="px-3 py-1 rounded-xl bg-charcoal-900/80 border border-white/10 text-xs font-mono text-gray-300">
                  {activeLightboxIndex + 1} / {referencePhotos.length}
                </span>
                <span className="text-sm font-bold text-white font-display truncate max-w-xs sm:max-w-md">
                  {activePhoto.caption || activePhoto.name || 'Reference Photo'}
                </span>
              </div>

              <div className="pointer-events-auto flex items-center gap-2">
                <button
                  onClick={() => handleSetAsCoverPhoto(activePhoto.url)}
                  className="px-3 py-1.5 rounded-xl bg-gold-500/20 hover:bg-gold-500/30 text-gold-300 border border-gold-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 text-gold-400" />
                  <span>Set Cover</span>
                </button>

                <a
                  href={activePhoto.url}
                  download={activePhoto.name || 'reference-photo.jpg'}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-charcoal-900/80 hover:bg-charcoal-800 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
                  title="Download / Open Fullscreen"
                >
                  <Download className="w-4 h-4" />
                </a>

                <button
                  onClick={() => setActiveLightboxIndex(null)}
                  className="p-2 rounded-xl bg-charcoal-900/80 hover:bg-charcoal-800 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
                  title="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Previous Photo Button */}
            {referencePhotos.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevPhoto();
                }}
                className="absolute left-4 z-20 w-12 h-12 rounded-full bg-charcoal-900/80 hover:bg-charcoal-800 border border-white/10 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Previous Photo"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Next Photo Button */}
            {referencePhotos.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextPhoto();
                }}
                className="absolute right-4 z-20 w-12 h-12 rounded-full bg-charcoal-900/80 hover:bg-charcoal-800 border border-white/10 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Next Photo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Image Preview Container */}
            <motion.div
              key={activePhoto.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 max-w-4xl max-h-[80vh] flex items-center justify-center"
            >
              <img
                src={activePhoto.url}
                alt={activePhoto.caption || 'Reference photo'}
                className="max-w-full max-h-[78vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              />
            </motion.div>

            {/* Footer details */}
            <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-center pointer-events-none">
              <div className="pointer-events-auto px-4 py-2 rounded-2xl bg-charcoal-900/90 border border-white/10 backdrop-blur-md flex items-center gap-4 text-xs font-mono text-gray-400">
                <span className="flex items-center gap-1.5 text-gold-400">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Supabase Storage</span>
                </span>
                <span>•</span>
                <span>
                  Uploaded:{' '}
                  {activePhoto.uploadedAt
                    ? new Date(activePhoto.uploadedAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Recent'}
                </span>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectReferencePhotosGallery;
