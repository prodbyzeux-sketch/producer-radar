import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

/**
 * Auto-advances producer statuses based on time:
 * - contactado → follow up 1 (after 24h = next_follow_up <= today)
 * - follow up 1 → follow up 2 (after 3 days = next_follow_up <= today)
 */
export function useAutoAdvanceStatus(ytProducers = [], plProducers = [], onAdvanced) {
  useEffect(() => {
    if (!ytProducers.length && !plProducers.length) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const shouldAdvance = (p) => {
      if (p.status !== 'contactado' && p.status !== 'follow up 1') return false;
      if (!p.next_follow_up) return false;
      const d = new Date(p.next_follow_up);
      d.setHours(0, 0, 0, 0);
      return d <= today;
    };

    const getNext = (status) => status === 'contactado' ? 'follow up 1' : 'follow up 2';
    const getDaysForNext = (nextStatus) => nextStatus === 'follow up 1' ? 3 : 7;

    const ytToAdvance = ytProducers.filter(shouldAdvance);
    const plToAdvance = plProducers.filter(shouldAdvance);

    if (!ytToAdvance.length && !plToAdvance.length) return;

    const today_str = new Date().toISOString().split('T')[0];

    Promise.all([
      ...ytToAdvance.map(p => {
        const nextStatus = getNext(p.status);
        return base44.entities.YouTubeProducer.update(p.id, {
          status: nextStatus,
          last_action: today_str,
          next_follow_up: addDays(getDaysForNext(nextStatus)),
        });
      }),
      ...plToAdvance.map(p => {
        const nextStatus = getNext(p.status);
        return base44.entities.PlacementProducer.update(p.id, {
          status: nextStatus,
          last_action: today_str,
          next_follow_up: addDays(getDaysForNext(nextStatus)),
        });
      }),
    ]).then(() => {
      onAdvanced?.();
    });
  }, [ytProducers.length, plProducers.length]);
}