export function buildInternalBarcode(item) {
  const stableSuffix = String(item.item_id).split('-')[0].toUpperCase();
  return `IMS-${item.internal_sku}-${stableSuffix}`;
}
