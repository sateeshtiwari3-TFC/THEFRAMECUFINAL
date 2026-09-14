export const compressImage = (
  input: string | File | Blob | any,
  maxWidth = 400,
  maxHeight = 400,
  quality = 0.7
): Promise<string> => {
  return new Promise((resolve) => {
    if (!input) {
      resolve('');
      return;
    }

    const processDataUrl = (dataUrl: string) => {
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        resolve(typeof dataUrl === 'string' ? dataUrl : '');
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Produce JPEG compressed string
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = () => {
        resolve(dataUrl);
      };
      img.src = dataUrl;
    };

    // If input is File or Blob
    if (typeof input !== 'string' && (input instanceof Blob || (input && typeof input === 'object' && 'slice' in input))) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const res = e.target?.result;
        if (typeof res === 'string') {
          processDataUrl(res);
        } else {
          resolve('');
        }
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(input);
      return;
    }

    // If input is already string
    if (typeof input === 'string') {
      processDataUrl(input);
      return;
    }

    resolve(String(input || ''));
  });
};

export const generateUniqueProjectId = (existingProjects: { id: string }[]): string => {
  let maxNum = 0;
  if (Array.isArray(existingProjects)) {
    existingProjects.forEach(p => {
      if (p && p.id) {
        const match = p.id.match(/PRJ-2026-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    });
  }
  let nextNum = maxNum + 1;
  let candidateId = `PRJ-2026-${String(nextNum).padStart(3, '0')}`;

  while (existingProjects && existingProjects.some(p => p && p.id === candidateId)) {
    nextNum += 1;
    candidateId = `PRJ-2026-${String(nextNum).padStart(3, '0')}`;
  }

  return candidateId;
};

/**
 * Formats a monetary amount into standard Indian Rupee notation (e.g. ₹1,50,000)
 */
export const formatINR = (amount: number | string | undefined | null): string => {
  if (amount === undefined || amount === null || amount === '') return '₹0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0';
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
};

/**
 * Formats a monetary amount without the Rupee symbol (e.g. 1,50,000)
 */
export const formatCurrencyNumber = (amount: number | string | undefined | null): string => {
  if (amount === undefined || amount === null || amount === '') return '0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  return Math.round(num).toLocaleString('en-IN');
};

/**
 * Standard priority rank for sorting algorithms (0 = urgent/critical, 3 = low)
 */
export const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  critical: 0,
  high: 1,
  medium: 2,
  normal: 2,
  low: 3,
};

export interface PriorityBadgeConfig {
  label: string;
  badge: string;
  bg: string;
  border: string;
  glow: string;
  bar: string;
}

/**
 * Returns consistent badge and border styling for project priorities across views
 */
export const getPriorityConfig = (priority?: string): PriorityBadgeConfig => {
  switch (priority?.toLowerCase()) {
    case 'urgent':
    case 'critical':
      return {
        label: 'Urgent',
        badge: 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse',
        bg: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
        border: 'border-rose-500/40 hover:border-rose-400',
        glow: 'from-rose-950/40 via-charcoal-900 to-charcoal-950',
        bar: 'from-red-500 to-rose-600',
      };
    case 'high':
      return {
        label: 'High',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
        border: 'border-amber-500/30 hover:border-amber-400',
        glow: 'from-amber-950/30 via-charcoal-900 to-charcoal-950',
        bar: 'from-amber-500 to-yellow-600',
      };
    case 'low':
      return {
        label: 'Low',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
        border: 'border-emerald-500/30 hover:border-emerald-400',
        glow: 'from-emerald-950/20 via-charcoal-900 to-charcoal-950',
        bar: 'from-emerald-500 to-teal-600',
      };
    case 'medium':
    case 'normal':
    default:
      return {
        label: 'Normal',
        badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        bg: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
        border: 'border-blue-500/20 hover:border-blue-400/50',
        glow: 'from-charcoal-900 via-charcoal-900 to-charcoal-950',
        bar: 'from-blue-500 to-indigo-600',
      };
  }
};

/**
 * Standard milliseconds in one day (24 * 60 * 60 * 1000)
 */
export const MS_PER_DAY = 86_400_000;

/**
 * Calculates days remaining from today to a delivery deadline date
 * Negative = overdue, 0 = due today, positive = days left
 */
export const getDaysRemaining = (deliveryDate?: string | null): number | null => {
  if (!deliveryDate || deliveryDate.trim() === '') return null;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  let targetTime: number;
  const parts = deliveryDate.split(/[-T :]/);
  if (parts.length >= 3 && parts[0].length === 4) {
    targetTime = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
  } else {
    const parsed = new Date(deliveryDate);
    targetTime = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  }

  if (isNaN(targetTime)) return null;
  const diffMs = targetTime - todayStart;
  return Math.round(diffMs / MS_PER_DAY);
};

/**
 * Returns difference in whole days between two dates or timestamps (d2 - d1)
 */
export const getDaysBetween = (
  d1: Date | string | number,
  d2: Date | string | number = new Date()
): number => {
  const t1 = typeof d1 === 'number' ? d1 : new Date(d1).getTime();
  const t2 = typeof d2 === 'number' ? d2 : new Date(d2).getTime();
  if (isNaN(t1) || isNaN(t2)) return 0;
  return Math.round((t2 - t1) / MS_PER_DAY);
};

/**
 * Clean date display formatter with standard Indian / British date presentation
 */
export const formatDateDisplay = (
  dateStr?: string | Date | null,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
): string => {
  if (!dateStr) return 'N/A';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-IN', options);
};

