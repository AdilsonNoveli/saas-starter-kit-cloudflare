/**
 * Reset reminder tracking fields to allow re-sending reminders
 *
 * Usage:
 *   npx tsx scripts/reset-reminders.ts
 */

import { prisma } from '../lib/prisma';

async function resetReminders() {
  try {
    console.log('🔄 Resetting reminder tracking fields...\n');

    // Reset important date reminders
    const importantDatesResult = await prisma.importantDate.updateMany({
      where: {
        lastReminderSent: {
          not: null,
        },
      },
      data: {
        lastReminderSent: null,
      },
    });

    console.log(`✅ Reset ${importantDatesResult.count} important date reminder(s)`);

    // Reset contact reminders
    const peopleResult = await prisma.person.updateMany({
      where: {
        lastContactReminderSent: {
          not: null,
        },
      },
      data: {
        lastContactReminderSent: null,
      },
    });

    console.log(`✅ Reset ${peopleResult.count} contact reminder(s)`);
    console.log('\n🎉 All reminder tracking fields have been reset!');
    console.log('You can now manually trigger the cron job to send reminders again.\n');
  } catch (error) {
    console.error('❌ Error resetting reminders:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetReminders().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
