import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { app, db } from './firebase';

export async function registerDailyNotifications(uid: string): Promise<void> {
  if (!app || !db || !import.meta.env.VITE_FIREBASE_VAPID_KEY) throw new Error('Configure VITE_FIREBASE_VAPID_KEY para ativar notificações.');
  if (!('serviceWorker' in navigator) || !('Notification' in window) || !await isSupported()) throw new Error('Este navegador não oferece notificações push.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permissão de notificações não concedida.');
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const token = await getToken(getMessaging(app), { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) throw new Error('O Firebase não retornou um token de notificação.');
  let installationId = localStorage.getItem('descomplex-installation-id');
  if (!installationId) {
    installationId = crypto.randomUUID();
    localStorage.setItem('descomplex-installation-id', installationId);
  }
  await setDoc(doc(db, 'profiles', uid, 'tokens', installationId), { token, updatedAt: Date.now() });
}

export async function removeDeviceToken(uid: string): Promise<void> {
  const installationId = localStorage.getItem('descomplex-installation-id');
  if (db && installationId) await deleteDoc(doc(db, 'profiles', uid, 'tokens', installationId));
}
