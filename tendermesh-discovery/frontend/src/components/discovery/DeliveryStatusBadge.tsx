// ─── DeliveryStatusBadge: Visual indicator for tender delivery status ───

import React from 'react';
import type { DeliveryRecord } from '../../types/delivery';
import { Badge } from '../ui';

interface DeliveryStatusBadgeProps {
  deliveries: DeliveryRecord[];
  size?: 'sm' | 'md';
}

export const DeliveryStatusBadge: React.FC<DeliveryStatusBadgeProps> = ({
  deliveries,
  size = 'sm',
}) => {
  if (!deliveries || deliveries.length === 0) {
    return (
      <Badge
        variant="neutral"
        size={size}
        title="Not yet dispatched"
      >
        Not Sent
      </Badge>
    );
  }

  const deliveredCount = deliveries.filter((d) => d.delivered).length;
  const totalCount = deliveries.length;
  const allDelivered = deliveredCount === totalCount;
  const noneDelivered = deliveredCount === 0;

  let badgeVariant: 'success' | 'warning' | 'danger' = 'warning';
  let label = `${deliveredCount}/${totalCount} Sent`;

  if (allDelivered) {
    badgeVariant = 'success';
    label = 'Delivered';
  } else if (noneDelivered) {
    badgeVariant = 'danger';
    label = 'Failed';
  }

  const tooltipText = deliveries
    .map((d) => `${d.supplier_name}: ${d.delivered ? 'OK' : d.error_message || 'Failed'}`)
    .join('; ');

  return (
    <Badge
      variant={badgeVariant}
      size={size}
      dot
      pulse={!allDelivered && !noneDelivered}
      title={tooltipText}
    >
      {label}
    </Badge>
  );
};

export default DeliveryStatusBadge;