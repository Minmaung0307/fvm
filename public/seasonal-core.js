function nthWeekday(year, month, weekday, nth) {
  const first = new Date(year, month - 1, 1);
  return 1 + ((7 + weekday - first.getDay()) % 7) + (nth - 1) * 7;
}

function lastWeekday(year, month, weekday) {
  const last = new Date(year, month, 0);
  return last.getDate() - ((7 + last.getDay() - weekday) % 7);
}

export function seasonalEvent(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const fixed = {
    "1-1": ["New Year’s Day", "🎆", "A fresh year, a fresh start for your family."],
    "2-14": ["Valentine’s Day", "💝", "A little reminder to celebrate the people you love."],
    "3-8": ["International Women’s Day", "🌷", "Celebrating the women who shape our families and world."],
    "4-22": ["Earth Day", "🌎", "Small thoughtful choices can make a lasting difference."],
    "6-19": ["Juneteenth", "✨", "Celebrating freedom, resilience, and progress."],
    "7-4": ["Independence Day", "🎇", "Wishing you a safe and joyful Fourth of July."],
    "8-19": ["World Humanitarian Day", "🤝", "Celebrating kindness and people who help others."],
    "10-31": ["Halloween", "🎃", "Have a fun, safe, and delightfully spooky day."],
    "12-25": ["Christmas Day", "🎄", "Warm wishes for a peaceful and joyful Christmas."],
    "12-31": ["New Year’s Eve", "🥳", "Here’s to the memories made and the year ahead."],
  };
  const dynamic = new Map([
    [`1-${nthWeekday(year, 1, 1, 3)}`, ["Martin Luther King Jr. Day", "🕊️", "A day to reflect on service, equality, and hope."]],
    [`5-${lastWeekday(year, 5, 1)}`, ["Memorial Day", "🇺🇸", "Remembering those who gave their lives in service."]],
    [`9-${nthWeekday(year, 9, 1, 1)}`, ["Labor Day", "🛠️", "Celebrating the work and contributions of people everywhere."]],
    [`11-${nthWeekday(year, 11, 4, 4)}`, ["Thanksgiving Day", "🍂", "Wishing you a day filled with gratitude and togetherness."]],
  ]);
  const details = fixed[`${month}-${day}`] || dynamic.get(`${month}-${day}`);
  if (!details) return null;
  return { id: `${year}-${month}-${day}`, name: details[0], icon: details[1], message: details[2] };
}
