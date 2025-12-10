export type RangeKey = 'today' | '7d' | '30d' | 'custom';

export function computeRange(rangeKey: RangeKey, customStart?: string, customEnd?: string) {
  const now = new Date();
  const end = endOfDay(now);
  let start = startOfDay(now);

  if (rangeKey === 'today') {
    // keep start/end as today
  } else if (rangeKey === '7d') {
    start.setDate(start.getDate() - 6);
  } else if (rangeKey === '30d') {
    start.setDate(start.getDate() - 29);
  } else {
    const parsedStart = customStart ? new Date(customStart) : null;
    const parsedEnd = customEnd ? new Date(customEnd) : null;
    if (parsedStart && !isNaN(parsedStart.getTime())) {
      start = startOfDay(parsedStart);
    }
    if (parsedEnd && !isNaN(parsedEnd.getTime())) {
      end.setTime(endOfDay(parsedEnd).getTime());
    }
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
