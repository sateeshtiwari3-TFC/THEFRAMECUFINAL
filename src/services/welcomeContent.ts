import { GettingStartedLink, PlatformDocSection, SetupTipItem } from '../types';

export function getGettingStartedLinks(role: 'editor' | 'studio'): GettingStartedLink[] {
  if (role === 'editor') {
    return [
      {
        label: 'Assigned Wedding Projects',
        actionTab: 'projects',
        description: 'Access your assigned video cuts, download raw footage, and review delivery milestones.',
        icon: 'Video'
      },
      {
        label: 'Creative AI Suite',
        actionTab: 'gemini',
        description: 'Craft viral wedding reels captions, soundtrack suggestions, and hashtags via Gemini AI.',
        icon: 'Sparkles'
      },
      {
        label: 'Hard Disk & Storage Hub',
        actionTab: 'datamanager',
        description: 'Verify raw footage sizes, hard drive catalog codes, and cloud backup directories.',
        icon: 'HardDrive'
      },
      {
        label: 'Payment Ledger & Invoices',
        actionTab: 'invoices',
        description: 'Track completed wedding cuts, payout history, and balance clearance records.',
        icon: 'Receipt'
      },
      {
        label: 'Production Calendar',
        actionTab: 'calendar',
        description: 'Monitor delivery deadlines, upcoming revisions, and review milestones.',
        icon: 'Calendar'
      }
    ];
  } else {
    return [
      {
        label: 'Projects Catalog',
        actionTab: 'projects',
        description: 'Track ongoing wedding edits, review edit stages, and preview completed films.',
        icon: 'Film'
      },
      {
        label: 'Production Calendar',
        actionTab: 'calendar',
        description: 'Monitor upcoming wedding shoot dates, delivery deadlines, and key milestones.',
        icon: 'Calendar'
      },
      {
        label: 'GST Billing & Invoices',
        actionTab: 'invoices',
        description: 'Download luxury GST-compliant tax invoices and track studio ledger clearance.',
        icon: 'FileText'
      },
      {
        label: 'WhatsApp Status Sharing',
        actionTab: 'projects',
        description: 'Share instant couple progress alerts and preview links directly over WhatsApp.',
        icon: 'Share2'
      },
      {
        label: 'Creative AI Studio',
        actionTab: 'gemini',
        description: 'Generate cinematic social teasers, client briefs, and storytelling concepts.',
        icon: 'Sparkles'
      }
    ];
  }
}

export function getPlatformDocumentation(role: 'editor' | 'studio'): PlatformDocSection[] {
  if (role === 'editor') {
    return [
      {
        id: 'editor-lifecycle',
        title: 'Wedding Cinema Post-Production Lifecycle',
        category: 'workflow',
        badge: 'Workflow Standard',
        summary: 'Step-by-step editing phase transitions from raw ingestion to final high-bitrate master delivery.',
        details: [
          'Stage 1 - Raw Ingestion: Check assigned Drive or physical HDD code. Verify audio stems (lapel, ambient, scratch track).',
          'Stage 2 - Story & Rough Cut: Sync multi-cam timelines at 24fps. Assemble speeches, vows, and ritual chronology.',
          'Stage 3 - Color Grading: Conform in DaVinci Resolve or Premiere. Apply color management (ACEScct or Rec.709-A).',
          'Stage 4 - Audio Mastering: Target -14 LUFS integrated loudness with dialogue normalized between -18 to -14 LKFS.',
          'Stage 5 - Master Export & Delivery: Deliver ProRes 422 HQ / H.265 10-bit master and 1080p web-ready preview copy.'
        ]
      },
      {
        id: 'editor-specs',
        title: 'Export Resolutions & Codec Specifications',
        category: 'specifications',
        badge: 'Quality Standard',
        summary: 'Standard export containers and parameters required for all Frame Cut Studio deliverables.',
        details: [
          'Wedding Teaser (60s): 1080x1920 (9:16 Vertical), H.264/H.265, 25 Mbps, AAC 320kbps 48kHz.',
          'Cinematic Highlight (3-7 min): 3840x2160 (16:9 UHD) or 2.39:1 CinemaScope, Rec.709, ProRes 422 or MP4 (45 Mbps).',
          'Full Wedding Documentary (30-60 min): 1080p 24fps, H.264 20 Mbps, Two-channel stereo mastered audio.',
          'Color Space: Rec.709 Gamma 2.4. Avoid crushed shadow clipping below 5% and keep highlights below 98% IRE.'
        ]
      },
      {
        id: 'editor-slas',
        title: 'Turnaround SLAs & Revision Guidelines',
        category: 'guidelines',
        badge: 'Turnaround SLA',
        summary: 'Timeline benchmarks to guarantee studio client satisfaction and bonus eligibility.',
        details: [
          'Teaser Turnaround: Within 72 hours of receiving raw footage ingestion confirmation.',
          'Highlight Film: Within 14 calendar days of project assignment.',
          'Revision Protocol: First studio review changes must be completed within 48 hours of ticket creation.',
          'Status Tracking: Keep project status updated in the portal (Editing -> Color Grading -> Client Review).'
        ]
      }
    ];
  } else {
    return [
      {
        id: 'studio-workflow',
        title: 'Studio Partner Onboarding & Project Submission',
        category: 'workflow',
        badge: 'Partner Protocol',
        summary: 'How to register new wedding projects, upload footage, and direct post-production requirements.',
        details: [
          '1. Project Creation: Click "New Project" in the Projects Catalog. Enter Bride & Groom names, event dates, and song preferences.',
          '2. Footage Transmission: Paste Google Drive / Dropbox link or specify Hard Disk serial tag for offline courier pickup.',
          '3. Creative Brief: Add song references, priority family members, and specific film style preferences (Moody, Romantic, Vibrant).',
          '4. Assign or Request: The system assigns senior vetted editors based on your preferred turnaround window.'
        ]
      },
      {
        id: 'studio-billing',
        title: 'GST Tax Invoicing & Ledger Clearance',
        category: 'specifications',
        badge: 'Finance & GST',
        summary: 'Transparent billing and instant automated tax invoice generation.',
        details: [
          'Compliant GST Invoices: Instant downloadable luxury PDFs with your studio name, GSTIN, and line-item breakdown.',
          'Advance & Milestone Clearance: 30% advance on project assignment, 40% on rough cut delivery, 30% on master approval.',
          'Online Ledger: Track all completed wedding cuts, pending balances, and receipt payment proofs directly in the Invoices tab.'
        ]
      },
      {
        id: 'studio-revisions',
        title: 'Client Review & WhatsApp Sharing',
        category: 'guidelines',
        badge: 'Client Experience',
        summary: 'Deliver unforgettable preview experiences to wedding couples effortlessly.',
        details: [
          'WhatsApp Instant Status: Use the WhatsApp action button on any project card to send formatted status updates to couples.',
          'Watermarked Screeners: Stream uncompressed review copies directly inside the app before releasing final masters.',
          'Direct Revision Notes: Add timecoded notes (e.g. "02:14 - Swap reception dance shot with drone aerial") for fast turnaround.'
        ]
      }
    ];
  }
}

export function getSetupTips(role: 'editor' | 'studio'): SetupTipItem[] {
  if (role === 'editor') {
    return [
      {
        step: 1,
        title: 'Complete Profile & Contact Channels',
        description: 'Verify your phone number and email to receive real-time WhatsApp assignment alerts when studios book new edits.',
        highlight: 'WhatsApp & SMS notifications ensure you never miss urgent delivery projects.'
      },
      {
        step: 2,
        title: 'Link Cloud Storage & Drive Access',
        description: 'Ensure your Google Drive or high-speed storage is authenticated to download multi-camera footage bundles.',
        highlight: 'Verify download speeds of at least 50 Mbps for smooth 4K footage retrieval.'
      },
      {
        step: 3,
        title: 'Explore the Gemini Creative AI Suite',
        description: 'Try the AI Reel Caption & Soundtrack Generator to curate the perfect cinematic music for emotional wedding cuts.',
        highlight: 'Generates timecode-matched music suggestions and viral hashtags.'
      },
      {
        step: 4,
        title: 'Setup Bank & UPI Payout Details',
        description: 'Check the Invoices tab to configure your payment beneficiary details for timely milestone disbursements upon project sign-off.',
        highlight: 'Payouts are cleared within 24-48 hours of client final sign-off.'
      }
    ];
  } else {
    return [
      {
        step: 1,
        title: 'Configure Studio Brand & GST Credentials',
        description: 'Ensure your brand name, address, and GSTIN are up to date so all project delivery slips and invoices are 100% compliant.',
        highlight: 'Brand credentials appear on luxury invoice PDFs and couple reports.'
      },
      {
        step: 2,
        title: 'Establish Standard Footage Ingestion Protocol',
        description: 'Organize raw footage folders using the recommended format: [StudioName]_[CoupleName]_[EventDate] (e.g., KK_RahulPriya_2026).',
        highlight: 'Saves 30% turnaround time during ingestion and multi-cam sync.'
      },
      {
        step: 3,
        title: 'Integrate the Production Calendar',
        description: 'Sync upcoming wedding dates and delivery deadlines to visualize your editing queue across peak wedding seasons.',
        highlight: 'Avoids delivery bottlenecks during winter and auspicious wedding dates.'
      },
      {
        step: 4,
        title: 'Test Instant WhatsApp Progress Sharing',
        description: 'Try sending a test progress update on any project to see how seamless communication becomes with your brides and grooms.',
        highlight: 'Reduces repetitive client status calls by over 80%.'
      }
    ];
  }
}

export interface GenerateWelcomeEmailParams {
  role: 'editor' | 'studio';
  name: string;
  email: string;
  phone?: string;
  city?: string;
  specialty?: string;
  appUrl?: string;
}

/**
 * Generates an executive, responsive HTML welcome email formatted with
 * luxury wedding cinema aesthetics, essential links, platform documentation, and setup tips.
 */
export function generateWelcomeEmailHtml({
  role,
  name,
  email,
  phone,
  city,
  specialty,
  appUrl = 'https://theframecutstudio.com'
}: GenerateWelcomeEmailParams): { subject: string; html: string; text: string } {
  const isEditor = role === 'editor';
  const roleTitle = isEditor ? 'Lead Video Editor' : 'Partner Wedding Studio';
  const subject = isEditor
    ? `🎬 Welcome to The Frame Cut Studio — Video Editor Workspace Activation`
    : `✨ Welcome to The Frame Cut Studio Network — Studio Partner Portal`;

  const links = getGettingStartedLinks(role);
  const docs = getPlatformDocumentation(role);
  const tips = getSetupTips(role);

  const linksHtml = links
    .map(
      (l) => `
    <tr>
      <td style="padding: 12px 16px; background-color: #121417; border: 1px solid rgba(212,175,55,0.15); border-radius: 12px; margin-bottom: 8px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align: top;">
              <strong style="color: #d4af37; font-size: 14px; font-family: 'Helvetica Neue', Arial, sans-serif;">${l.label}</strong>
              <div style="color: #a0aec0; font-size: 12px; line-height: 1.4; margin-top: 4px;">${l.description}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr><td height="8"></td></tr>
  `
    )
    .join('');

  const docsHtml = docs
    .map(
      (d) => `
    <div style="background-color: #121417; border-left: 3px solid #d4af37; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px;">
      <div style="display: inline-block; background-color: rgba(212,175,55,0.15); color: #ecc94b; font-size: 10px; font-weight: bold; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; margin-bottom: 6px;">
        ${d.badge || 'Platform Guideline'}
      </div>
      <h4 style="color: #ffffff; margin: 4px 0 8px 0; font-size: 14px;">${d.title}</h4>
      <p style="color: #a0aec0; font-size: 12px; margin: 0 0 8px 0; line-height: 1.4;">${d.summary}</p>
      <ul style="margin: 0; padding-left: 18px; color: #cbd5e0; font-size: 12px; line-height: 1.5;">
        ${d.details.map((item) => `<li style="margin-bottom: 4px;">${item}</li>`).join('')}
      </ul>
    </div>
  `
    )
    .join('');

  const tipsHtml = tips
    .map(
      (t) => `
    <tr>
      <td style="padding: 10px 14px; background-color: #0c120f; border: 1px solid rgba(16,185,129,0.2); border-radius: 8px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="28" style="vertical-align: top; color: #10b981; font-weight: bold; font-size: 14px;">0${t.step}</td>
            <td style="vertical-align: top;">
              <strong style="color: #ffffff; font-size: 13px;">${t.title}</strong>
              <div style="color: #9ca3af; font-size: 12px; margin-top: 3px; line-height: 1.4;">${t.description}</div>
              <div style="color: #34d399; font-size: 11px; margin-top: 4px; font-weight: 500;">💡 Tip: ${t.highlight}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr><td height="6"></td></tr>
  `
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #050507; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body style="background-color: #050507; margin: 0; padding: 24px 12px; color: #e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; margin: 0 auto; background-color: #0b0d10; border: 1px solid rgba(212,175,55,0.25); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
    
    <!-- HEADER BRANDING -->
    <tr>
      <td style="background: linear-gradient(135deg, #111a14 0%, #080a0c 100%); padding: 32px 28px; border-bottom: 1px solid rgba(212,175,55,0.2); text-align: center;">
        <div style="display: inline-block; padding: 6px 14px; background-color: rgba(212,175,55,0.12); border: 1px solid rgba(212,175,55,0.3); border-radius: 20px; color: #d4af37; font-size: 11px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">
          ✦ Wedding Cinema ERP & Post-Production OS ✦
        </div>
        <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">THE FRAME CUT STUDIO</h1>
        <p style="color: #a0aec0; font-size: 13px; margin: 6px 0 0 0;">Welcome to your luxury creative post-production workspace</p>
      </td>
    </tr>

    <!-- WELCOME GREETING -->
    <tr>
      <td style="padding: 28px 28px 20px 28px;">
        <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 10px 0;">Hello ${name},</h2>
        <p style="color: #cbd5e0; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
          Welcome to <strong>The Frame Cut Studio</strong> platform! Your <strong>${roleTitle}</strong> account has been successfully registered and activated. You now have full access to our centralized project pipelines, automated delivery queues, and post-production management tools.
        </p>
        <div style="background-color: #12161c; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #e2e8f0; margin-bottom: 20px;">
          <strong>Account Email:</strong> ${email} <br/>
          <strong>Assigned Role:</strong> ${roleTitle} ${specialty ? `(${specialty})` : ''} ${city ? `• Location: ${city}` : ''}
        </div>
      </td>
    </tr>

    <!-- ESSENTIAL GETTING STARTED LINKS -->
    <tr>
      <td style="padding: 0 28px 20px 28px;">
        <h3 style="color: #d4af37; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px;">
          🚀 Essential Getting-Started Links
        </h3>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${linksHtml}
        </table>
      </td>
    </tr>

    <!-- PLATFORM DOCUMENTATION & SOPS -->
    <tr>
      <td style="padding: 0 28px 20px 28px;">
        <h3 style="color: #d4af37; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px;">
          📚 Platform Documentation & Standards
        </h3>
        ${docsHtml}
      </td>
    </tr>

    <!-- STEP-BY-STEP SETUP TIPS -->
    <tr>
      <td style="padding: 0 28px 24px 28px;">
        <h3 style="color: #10b981; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px;">
          ⚡ Essential Setup Tips
        </h3>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${tipsHtml}
        </table>
      </td>
    </tr>

    <!-- PRIMARY ACTION BUTTON -->
    <tr>
      <td style="padding: 10px 28px 32px 28px; text-align: center;">
        <a href="${appUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #aa8c2c 100%); color: #000000; font-weight: 800; font-size: 14px; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 15px rgba(212,175,55,0.35); letter-spacing: 0.3px;">
          Open Your Dashboard & Workspace →
        </a>
      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td style="background-color: #07080a; padding: 20px 28px; border-top: 1px solid rgba(255,255,255,0.08); text-align: center;">
        <p style="color: #718096; font-size: 11px; margin: 0 0 6px 0;">
          The Frame Cut Studio — Luxury Wedding Post-Production & Video Editing OS.
        </p>
        <p style="color: #4a5568; font-size: 10px; margin: 0;">
          Need assistance or urgent editing support? Contact Satish Tiwari via the portal or WhatsApp helpline.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Welcome to The Frame Cut Studio!
Hello ${name},

Your ${roleTitle} account has been registered.
Email: ${email}
Role: ${roleTitle}

ESSENTIAL GETTING-STARTED LINKS:
${links.map((l) => `- ${l.label}: ${l.description}`).join('\n')}

PLATFORM DOCUMENTATION & STANDARDS:
${docs.map((d) => `[${d.title}]\n${d.details.join('\n')}`).join('\n\n')}

ESSENTIAL SETUP TIPS:
${tips.map((t) => `Step ${t.step}: ${t.title} - ${t.description} (Tip: ${t.highlight})`).join('\n')}

Access your workspace: ${appUrl}
  `.trim();

  return { subject, html, text };
}
