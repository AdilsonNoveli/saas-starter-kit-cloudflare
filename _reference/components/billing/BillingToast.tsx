'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function BillingToast() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      toast.success('Your subscription has been activated!');
      // Clean up URL params
      router.replace('/settings/billing', { scroll: false });
    } else if (canceled === 'true') {
      toast.info('Checkout was cancelled');
      router.replace('/settings/billing', { scroll: false });
    }
  }, [searchParams, router]);

  return null;
}
