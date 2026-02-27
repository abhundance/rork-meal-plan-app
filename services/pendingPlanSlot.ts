type PendingPlanSlot = {
  slotId: string;
  date: string;
  slotName: string;
  defaultServing: number;
} | null;

let pendingPlanSlot: PendingPlanSlot = null;

export function setPendingPlanSlot(slot: PendingPlanSlot): void {
  pendingPlanSlot = slot;
  console.log('[PendingPlanSlot] Set:', slot);
}

export function consumePendingPlanSlot(): PendingPlanSlot {
  const slot = pendingPlanSlot;
  pendingPlanSlot = null;
  console.log('[PendingPlanSlot] Consumed:', slot);
  return slot;
}
