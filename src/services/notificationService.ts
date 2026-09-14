import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  getGettingStartedLinks, 
  getPlatformDocumentation, 
  getSetupTips 
} from './welcomeContent';

export interface TriggerWelcomeNotificationParams {
  role: 'editor' | 'studio';
  name: string;
  entityId: string;
  email: string;
  phone?: string;
  specialty?: string;
  city?: string;
}

export interface WelcomeTriggerResult {
  notificationId: string;
}

/**
 * Triggers a 'Welcome' notification in the database,
 * providing the newly registered user with essential getting-started links,
 * platform documentation, and setup tips.
 */
export async function triggerWelcomeNotification(
  params: TriggerWelcomeNotificationParams
): Promise<string> {
  const { role, name, entityId } = params;
  const notifsCol = collection(db, 'notifications');

  const links = getGettingStartedLinks(role);
  const docs = getPlatformDocumentation(role);
  const setupTips = getSetupTips(role);
  const flatTips = setupTips.map(t => `${t.title}: ${t.description}`);

  const isEditor = role === 'editor';
  const notifDoc = await addDoc(notifsCol, {
    title: isEditor 
      ? `✨ Welcome to The Frame Cut Studio OS, ${name}!` 
      : `🎉 Welcome to The Frame Cut Studio Partner Network, ${name}!`,
    message: isEditor
      ? `Welcome aboard! Your video editor workspace is configured and ready. Access your assigned projects, codec specifications, DaVinci/Premiere guidelines, and setup tips.`
      : `Welcome to your dedicated Studio OS portal. Easily track your wedding edits, monitor real-time editing status, review platform documentation, and configure instant WhatsApp couple updates.`,
    type: 'welcome',
    [isEditor ? 'editorId' : 'studioId']: entityId,
    recipientId: entityId,
    recipientRole: role,
    gettingStartedLinks: links,
    documentationSections: docs,
    setupTips: setupTips,
    tips: flatTips,
    isAutomated: true,
    read: false,
    createdAt: serverTimestamp()
  });

  return notifDoc.id;
}

/**
 * Backward compatibility alias
 */
export async function triggerWelcomeNotificationAndEmail(
  params: TriggerWelcomeNotificationParams
): Promise<WelcomeTriggerResult> {
  const notificationId = await triggerWelcomeNotification(params);
  return { notificationId };
}
