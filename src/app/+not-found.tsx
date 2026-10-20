/**
 * src/app/+not-found.tsx
 * Hien khi mo 1 duong dan khong ton tai.
 */
import { useRouter } from 'expo-router';

import { EmptyView } from '@/components/common/StateViews';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <EmptyView
      iconName="help-circle-outline"
      title="Không tìm thấy trang này"
      actionLabel="Về trang chủ"
      onAction={(): void => router.replace('/')}
    />
  );
}
