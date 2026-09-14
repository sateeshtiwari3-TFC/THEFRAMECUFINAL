import { supabase, SUPABASE_STORAGE_BUCKET } from '../lib/supabaseClient';
import { ProjectReferencePhoto } from '../types';

/**
 * Client service for image/media uploads and database synchronization
 */

export interface UploadResult {
  success: boolean;
  url: string;
  media?: any;
  error?: string;
}

/**
 * Helper to convert Base64 string to a binary Blob with appropriate MIME type
 */
export function base64ToBlob(base64String: string, defaultMime = 'image/jpeg'): Blob {
  let mimeType = defaultMime;
  let cleanBase64 = base64String;

  if (base64String.includes(';base64,')) {
    const parts = base64String.split(';base64,');
    mimeType = parts[0].replace('data:', '');
    cleanBase64 = parts[1];
  }

  const byteCharacters = atob(cleanBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Upload a Base64-encoded image string directly to the Supabase 'theframecut-media' storage bucket.
 * Converts the base64 to a binary Blob, uploads via the Supabase client, and returns the public CDN URL.
 */
export async function uploadImageToSupabase(
  base64String: string,
  fileName?: string,
  bucketName: string = SUPABASE_STORAGE_BUCKET
): Promise<UploadResult> {
  try {
    if (!base64String) {
      throw new Error('Base64 string is required for upload');
    }

    // Convert base64 data to binary Blob
    const blob = base64ToBlob(base64String);
    const mimeType = blob.type || 'image/jpeg';
    const extension = mimeType.split('/')[1] || 'jpg';
    
    // Generate unique storage path
    const safeName = (fileName || `image-${Date.now()}.${extension}`).replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `uploads/${Date.now()}_${safeName}`;

    // Upload using Supabase Storage Client
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, blob, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.warn('Direct Supabase client upload failed, attempting fallback:', uploadError);
      // If direct client policy fails or credentials differ, fallback to backend proxy
      const fallbackResponse = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: safeName,
          fileType: mimeType,
          base64Data: base64String,
          associatedType: 'project_cover'
        })
      });
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        return {
          success: true,
          url: fallbackData.url || base64String,
          media: fallbackData.media
        };
      }
      throw uploadError;
    }

    // Retrieve public URL from the bucket
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData?.publicUrl || '';

    return {
      success: true,
      url: publicUrl,
    };
  } catch (err: any) {
    console.error('Error in uploadImageToSupabase:', err);
    return {
      success: false,
      url: '',
      error: err.message || 'Failed to upload image to Supabase',
    };
  }
}

/**
 * Upload a reference photo (camera snapshot, mobile photo, or reference asset) directly to Supabase storage.
 * Stores in the bucket under `projects/{projectId}/references/{timestamp}_{filename}`.
 */
export async function uploadProjectReferencePhoto(
  projectId: string,
  source: File | Blob | string,
  fileName?: string,
  caption?: string,
  bucketName: string = SUPABASE_STORAGE_BUCKET
): Promise<{ success: boolean; photo?: ProjectReferencePhoto; error?: string }> {
  try {
    let blob: Blob;
    let mimeType = 'image/jpeg';
    let originalName = fileName || `reference-${Date.now()}.jpg`;
    let sizeBytes = 0;

    if (typeof source === 'string') {
      blob = base64ToBlob(source);
      mimeType = blob.type || 'image/jpeg';
      sizeBytes = blob.size;
    } else if (source instanceof File) {
      blob = source;
      mimeType = source.type || 'image/jpeg';
      originalName = fileName || source.name;
      sizeBytes = source.size;
    } else {
      blob = source;
      mimeType = source.type || 'image/jpeg';
      sizeBytes = source.size;
    }

    const extension = mimeType.split('/')[1] || 'jpg';
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `projects/${projectId}/references/${Date.now()}_${safeName}`;

    // Upload using Supabase Storage Client
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, blob, {
        contentType: mimeType,
        upsert: true,
      });

    let publicUrl = '';
    let storageProvider: 'supabase' | 'local' | 'data' = 'supabase';

    if (uploadError) {
      console.warn('Direct Supabase client upload failed, attempting backend fallback:', uploadError);
      let base64Data = '';
      if (typeof source === 'string') {
        base64Data = source;
      } else {
        base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      const fallbackResponse = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: safeName,
          fileType: mimeType,
          base64Data,
          associatedType: 'project_reference',
          associatedId: projectId,
        }),
      });

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        publicUrl = fallbackData.url || base64Data;
      } else {
        console.warn('Server proxy failed, falling back to data URI');
        publicUrl = base64Data;
        storageProvider = 'data';
      }
    } else {
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(storagePath);
      publicUrl = publicUrlData?.publicUrl || '';
    }

    const photo: ProjectReferencePhoto = {
      id: `ref-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      url: publicUrl,
      name: originalName,
      caption: caption || '',
      uploadedAt: new Date().toISOString(),
      storagePath: storageProvider === 'supabase' ? storagePath : undefined,
      storageProvider,
      sizeBytes,
    };

    return {
      success: true,
      photo,
    };
  } catch (err: any) {
    console.error('Error in uploadProjectReferencePhoto:', err);
    return {
      success: false,
      error: err.message || 'Failed to upload reference photo',
    };
  }
}

/**
 * Extract storage relative file path from a Supabase public URL or generic file path.
 * Examples:
 *  - "https://xyz.supabase.co/storage/v1/object/public/theframecut-media/uploads/12345_sample.jpg" -> "uploads/12345_sample.jpg"
 *  - "uploads/12345_sample.jpg" -> "uploads/12345_sample.jpg"
 */
export function extractSupabaseStoragePath(fileUrlOrPath: string, bucketName: string = SUPABASE_STORAGE_BUCKET): string | null {
  if (!fileUrlOrPath) return null;
  
  // If it's a data URI (base64 fallback), there is no cloud bucket file to delete
  if (fileUrlOrPath.startsWith('data:')) return null;

  try {
    // Match URL containing the bucket name
    const regex = new RegExp(`/storage/v1/object/public/${bucketName}/(.+)`, 'i');
    const match = fileUrlOrPath.match(regex);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }

    // Match generic object storage pattern
    const generalMatch = fileUrlOrPath.match(/\/storage\/v1\/object\/(?:public|authenticated)\/[^/]+\/(.+)/i);
    if (generalMatch && generalMatch[1]) {
      return decodeURIComponent(generalMatch[1]);
    }

    // If it's already a relative path inside uploads/
    if (fileUrlOrPath.startsWith('uploads/')) {
      return fileUrlOrPath;
    }
  } catch (e) {
    console.warn('Could not parse storage path from URL:', fileUrlOrPath, e);
  }

  return null;
}

/**
 * Remove an image file from the Supabase storage bucket when a project or media entity
 * is permanently deleted, preventing orphaned files and storage bloat.
 * 
 * @param imageUrlOrPath The public URL or storage path of the image to delete
 * @param bucketName The storage bucket (defaults to 'theframecut-media')
 */
export async function deleteImageFromSupabase(
  imageUrlOrPath: string | undefined | null,
  bucketName: string = SUPABASE_STORAGE_BUCKET
): Promise<{ success: boolean; error?: string }> {
  if (!imageUrlOrPath) {
    return { success: true };
  }

  const storagePath = extractSupabaseStoragePath(imageUrlOrPath, bucketName);
  if (!storagePath) {
    // Not a cloud-stored Supabase URL (e.g. data URI or external avatar), no storage bloat to clean
    return { success: true };
  }

  try {
    // Call Supabase client removal
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([storagePath]);

    if (error) {
      console.warn(`Supabase client delete failed for "${storagePath}", trying server proxy:`, error);
      // Fallback: request backend to remove file
      const res = await fetch('/api/media/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: storagePath, bucketName })
      });
      if (res.ok) {
        return { success: true };
      }
      throw error;
    }

    return { success: true };
  } catch (err: any) {
    console.error(`Failed to delete image from Supabase bucket (${storagePath}):`, err);
    return {
      success: false,
      error: err.message || 'Failed to remove image from Supabase'
    };
  }
}

/**
 * Upload an image file or camera capture to the backend media storage
 * (Automatically routes to Supabase bucket if configured, or stores in relational media records)
 */
export async function uploadPhotoFile(
  file: File,
  associatedType: 'project_cover' | 'avatar' | 'studio_logo' | 'expense_receipt' = 'project_cover',
  associatedId?: string,
  uploadedBy?: string
): Promise<UploadResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const response = await fetch('/api/media/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            base64Data,
            associatedType,
            associatedId,
            uploadedBy,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to upload photo');
        }

        const data = await response.json();
        resolve({
          success: true,
          url: data.url,
          media: data.media,
        });
      } catch (err: any) {
        console.error('Upload photo error:', err);
        resolve({
          success: false,
          url: '',
          error: err.message || 'Photo upload failed',
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        url: '',
        error: 'Failed to read file from disk',
      });
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Sync authenticated user details to the relational database
 */
export async function syncUserToDatabase(user: {
  uid: string;
  email: string;
  name?: string;
  role?: string;
  photoUrl?: string;
}) {
  try {
    const res = await fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (!res.ok) {
      console.warn('Sync user failed with HTTP status:', res.status);
    }
    return await res.json();
  } catch (e) {
    console.error('syncUserToDatabase error:', e);
    return null;
  }
}

/**
 * Check backend database connectivity status
 */
export async function checkDatabaseHealth() {
  try {
    const res = await fetch('/api/db/status');
    return await res.json();
  } catch (e) {
    return { status: 'offline', error: String(e) };
  }
}
