/**
 * Test the RECURRING reminder logic
 *
 * Usage:
 *   npx tsx scripts/test-recurring-logic.ts
 */

function getIntervalMs(interval: number, unit: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;

  switch (unit) {
    case 'DAYS':
      return interval * msPerDay;
    case 'WEEKS':
      return interval * 7 * msPerDay;
    case 'MONTHS':
      return interval * 30 * msPerDay;
    case 'YEARS':
      return interval * 365 * msPerDay;
    default:
      return 365 * msPerDay;
  }
}

function shouldSendRecurringReminder(
  eventDate: Date,
  today: Date,
  interval: number,
  intervalUnit: string,
  lastReminderSent: Date | null
): boolean {
  // Normalize the event date
  const eventDateNormalized = new Date(eventDate);
  eventDateNormalized.setHours(0, 0, 0, 0);

  const todayNormalized = new Date(today);
  todayNormalized.setHours(0, 0, 0, 0);

  // Don't send reminders before the event date
  if (todayNormalized.getTime() < eventDateNormalized.getTime()) {
    return false;
  }

  // Special handling for YEARS to avoid leap year drift
  if (intervalUnit === 'YEARS') {
    const eventDay = eventDateNormalized.getDate();
    const eventMonth = eventDateNormalized.getMonth();
    const todayDay = todayNormalized.getDate();
    const todayMonth = todayNormalized.getMonth();

    // Check if today is the anniversary (same month and day)
    if (todayDay !== eventDay || todayMonth !== eventMonth) {
      return false;
    }

    // If we've sent before, check if enough years have passed
    if (lastReminderSent) {
      const lastSent = new Date(lastReminderSent);
      const lastSentYear = lastSent.getFullYear();
      const todayYear = todayNormalized.getFullYear();
      const yearsSinceLastSent = todayYear - lastSentYear;

      return yearsSinceLastSent >= interval;
    }

    // Never sent before - it's the anniversary, so send
    return true;
  }

  // For other intervals (DAYS, WEEKS, MONTHS), use millisecond calculations
  const intervalMs = getIntervalMs(interval, intervalUnit);

  // If we've sent before, check if enough time has passed
  if (lastReminderSent) {
    const lastSent = new Date(lastReminderSent);
    lastSent.setHours(0, 0, 0, 0);

    const timeSinceLastSent = todayNormalized.getTime() - lastSent.getTime();

    // Not enough time has passed since last reminder
    if (timeSinceLastSent < intervalMs) {
      return false;
    }

    // Calculate the next scheduled reminder date from last sent
    const intervalsPassed = Math.floor(timeSinceLastSent / intervalMs);
    const nextReminderDate = new Date(lastSent.getTime() + (intervalsPassed * intervalMs));
    nextReminderDate.setHours(0, 0, 0, 0);

    return nextReminderDate.getTime() === todayNormalized.getTime();
  }

  // Never sent before - check if we should send based on event date
  const timeSinceEvent = todayNormalized.getTime() - eventDateNormalized.getTime();

  // Calculate which occurrence this is
  const intervalsPassed = Math.floor(timeSinceEvent / intervalMs);
  const nextReminderDate = new Date(eventDateNormalized.getTime() + (intervalsPassed * intervalMs));
  nextReminderDate.setHours(0, 0, 0, 0);

  return nextReminderDate.getTime() === todayNormalized.getTime();
}

// Test cases
console.log('🧪 Testing RECURRING reminder logic\n');

// Test 1: Every 1 day, event was 2 days ago, never sent
const test1EventDate = new Date('2026-01-10');
const test1Today = new Date('2026-01-12');
const test1Result = shouldSendRecurringReminder(test1EventDate, test1Today, 1, 'DAYS', null);
console.log('Test 1: Every 1 day, event 2 days ago, never sent');
console.log(`  Event: ${test1EventDate.toDateString()}`);
console.log(`  Today: ${test1Today.toDateString()}`);
console.log(`  Result: ${test1Result ? '✅ SEND' : '❌ DON\'T SEND'}`);
console.log(`  Expected: ✅ SEND (today is Jan 10 + 2 days)\n`);

// Test 2: Every 1 day, sent yesterday
const test2EventDate = new Date('2026-01-10');
const test2Today = new Date('2026-01-12');
const test2LastSent = new Date('2026-01-11');
const test2Result = shouldSendRecurringReminder(test2EventDate, test2Today, 1, 'DAYS', test2LastSent);
console.log('Test 2: Every 1 day, sent yesterday');
console.log(`  Event: ${test2EventDate.toDateString()}`);
console.log(`  Today: ${test2Today.toDateString()}`);
console.log(`  Last Sent: ${test2LastSent.toDateString()}`);
console.log(`  Result: ${test2Result ? '✅ SEND' : '❌ DON\'T SEND'}`);
console.log(`  Expected: ✅ SEND (1 day has passed since last sent)\n`);

// Test 3: Every 1 day, already sent today
const test3EventDate = new Date('2026-01-10');
const test3Today = new Date('2026-01-12');
const test3LastSent = new Date('2026-01-12');
const test3Result = shouldSendRecurringReminder(test3EventDate, test3Today, 1, 'DAYS', test3LastSent);
console.log('Test 3: Every 1 day, already sent today');
console.log(`  Event: ${test3EventDate.toDateString()}`);
console.log(`  Today: ${test3Today.toDateString()}`);
console.log(`  Last Sent: ${test3LastSent.toDateString()}`);
console.log(`  Result: ${test3Result ? '✅ SEND' : '❌ DON\'T SEND'}`);
console.log(`  Expected: ❌ DON'T SEND (not enough time has passed)\n`);

// Test 4: Every 7 days, event was 14 days ago, never sent
const test4EventDate = new Date('2026-01-01');
const test4Today = new Date('2026-01-15');
const test4Result = shouldSendRecurringReminder(test4EventDate, test4Today, 7, 'DAYS', null);
console.log('Test 4: Every 7 days, event 14 days ago, never sent');
console.log(`  Event: ${test4EventDate.toDateString()}`);
console.log(`  Today: ${test4Today.toDateString()}`);
console.log(`  Result: ${test4Result ? '✅ SEND' : '❌ DON\'T SEND'}`);
console.log(`  Expected: ✅ SEND (today is Jan 1 + 14 days = 2 weeks)\n`);

// Test 5: Every 1 year (birthday), event was last year, never sent, today is anniversary
const test5EventDate = new Date('1990-01-15');
const test5Today = new Date('2026-01-15');
const test5Result = shouldSendRecurringReminder(test5EventDate, test5Today, 1, 'YEARS', null);
console.log('Test 5: Every 1 year (birthday), today is anniversary');
console.log(`  Event: ${test5EventDate.toDateString()}`);
console.log(`  Today: ${test5Today.toDateString()}`);
console.log(`  Result: ${test5Result ? '✅ SEND' : '❌ DON\'T SEND'}`);
console.log(`  Expected: ✅ SEND (today matches anniversary)\n`);

console.log('✨ Testing complete!');
