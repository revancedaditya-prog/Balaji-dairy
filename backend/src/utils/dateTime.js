const getISTDateTime = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    dateStr: `${values.year}-${values.month}-${values.day}`,
    timeStr: `${values.hour}:${values.minute}:${values.second}`,
  };
};

const getISTDate = (date = new Date()) => getISTDateTime(date).dateStr;

module.exports = { getISTDate, getISTDateTime };
