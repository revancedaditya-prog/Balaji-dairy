const getISTParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
};

export const getISTDateTime = (date = new Date()) => {
  const values = getISTParts(date);
  return {
    dateStr: `${values.year}-${values.month}-${values.day}`,
    timeStr: `${values.hour}:${values.minute}`,
  };
};

export const getISTDate = (date = new Date()) => getISTDateTime(date).dateStr;

export const detectMilkShift = (timeString) => {
  const hour = Number.parseInt(String(timeString).split(':')[0], 10);
  return hour >= 4 && hour < 14 ? 'Morning' : 'Evening';
};
