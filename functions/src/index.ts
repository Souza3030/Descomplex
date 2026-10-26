import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';

initializeApp();

function localNow(timezone: string, now: Date): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)?.value || '';
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    minutes: Number(part('hour')) * 60 + Number(part('minute')),
  };
}

export const sendDailyReminders = onSchedule({ schedule: 'every 15 minutes', timeZone: 'UTC', region: 'us-central1' }, async () => {
  const firestore = getFirestore();
  const profiles = await firestore.collection('profiles').where('notifyEnabled', '==', true).get();
  const now = new Date();
  for (const profile of profiles.docs) {
    try {
      const data = profile.data();
      const timezone = typeof data.timezone === 'string' ? data.timezone : 'UTC';
      const time = typeof data.notifyTime === 'string' ? data.notifyTime : '09:00';
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) continue;
      const local = localNow(timezone, now);
      const [hour, minute] = time.split(':').map(Number);
      if (local.minutes < hour * 60 + minute || data.lastNotifiedDate === local.date) continue;
      const tokens = await profile.ref.collection('tokens').limit(500).get();
      if (tokens.empty) continue;
      const reserved = await firestore.runTransaction(async transaction => {
        const fresh = await transaction.get(profile.ref);
        if (!fresh.exists || !fresh.data()?.notifyEnabled || fresh.data()?.lastNotifiedDate === local.date) return false;
        transaction.update(profile.ref, { lastNotifiedDate: local.date });
        return true;
      });
      if (!reserved) continue;
      const tokenValues = tokens.docs.map(item => item.get('token')).filter((value): value is string => typeof value === 'string' && value.length > 0);
      if (!tokenValues.length) continue;
      const response = await getMessaging().sendEachForMulticast({
        tokens: tokenValues,
        data: { title: 'Seu próximo passo começa agora', body: 'Abra o Descomplex e avance em uma tarefa importante.' },
      });
      logger.info('Daily reminder processed', { uid: profile.id, successCount: response.successCount, failureCount: response.failureCount });
    } catch (error) {
      logger.error('Daily reminder failed', { uid: profile.id, error });
    }
  }
});
