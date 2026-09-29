/**
 * Send a test reminder email to a specific email address
 *
 * Usage:
 *   npx tsx scripts/send-test-reminder.ts your-email@example.com
 */

import { prisma } from '../lib/prisma';
import { sendEmail, emailTemplates } from '../lib/email';
import { createUnsubscribeToken } from '../lib/unsubscribe-tokens';

const testEmail = process.argv[2];

if (!testEmail) {
  console.error('❌ Please provide an email address');
  console.log('\nUsage:');
  console.log('  npx tsx scripts/send-test-reminder.ts your-email@example.com\n');
  process.exit(1);
}

async function sendTestReminder() {
  try {
    console.log(`📧 Sending test reminder to: ${testEmail}\n`);

    // Create or find a test user
    let user = await prisma.user.findUnique({
      where: { email: testEmail },
    });

    if (!user) {
      console.log('👤 Creating test user...');
      user = await prisma.user.create({
        data: {
          email: testEmail,
          name: 'Test',
          surname: 'User',
          password: 'not-used-for-test',
        },
      });
    }

    // Create a test person with important date
    console.log('📅 Creating test person and important date...');
    const person = await prisma.person.create({
      data: {
        userId: user.id,
        name: 'John',
        surname: 'Doe',
        importantDates: {
          create: {
            title: 'Birthday',
            date: new Date('1990-05-15'),
            reminderEnabled: true,
            reminderType: 'RECURRING',
          },
        },
      },
      include: {
        importantDates: true,
      },
    });

    const importantDate = person.importantDates[0];

    // Generate unsubscribe token
    console.log('🔐 Generating unsubscribe token...');
    const unsubscribeToken = await createUnsubscribeToken({
      userId: user.id,
      reminderType: 'IMPORTANT_DATE',
      entityId: importantDate.id,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${unsubscribeToken}`;

    console.log(`🔗 Unsubscribe URL: ${unsubscribeUrl}\n`);

    // Generate email template
    const template = await emailTemplates.importantDateReminder(
      'John Doe',
      'Birthday',
      'May 15, 2024',
      unsubscribeUrl,
      'en'
    );

    console.log('📬 Sending email...');
    const result = await sendEmail({
      to: testEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      from: 'reminders',
    });

    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log(`   Email ID: ${result.id}`);
      console.log(`\n📬 Check your inbox at: ${testEmail}`);
      console.log(`🔗 Click this to test unsubscribe: ${unsubscribeUrl}`);
      console.log('\n💡 The unsubscribe link should also be at the bottom of the email.');
    } else {
      console.error('❌ Failed to send email:', result.error);
    }

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await prisma.person.delete({ where: { id: person.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log('✅ Cleanup complete\n');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

sendTestReminder().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
