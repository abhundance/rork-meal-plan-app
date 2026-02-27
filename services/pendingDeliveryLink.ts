type PendingDeliveryLink = {
  url: string;
  platform: string | null;
} | null;

let pendingDeliveryLink: PendingDeliveryLink = null;

export function setPendingDeliveryLink(url: string, platform: string | null): void {
  pendingDeliveryLink = { url, platform };
  console.log('[PendingDeliveryLink] Set:', pendingDeliveryLink);
}

export function consumePendingDeliveryLink(): { url: string; platform: string | null } | null {
  const link = pendingDeliveryLink;
  pendingDeliveryLink = null;
  console.log('[PendingDeliveryLink] Consumed:', link);
  return link;
}

export function hasPendingDeliveryLink(): boolean {
  return pendingDeliveryLink !== null;
}
