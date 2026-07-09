/**
 * Splices ad-slot markers into a list of items every `every` items, stopping
 * after `max` ad slots (long unbounded lists don't get unlimited native ad
 * objects on the Flutter side — see AdPlaceholder.jsx's slotId model).
 *
 * Returns a mixed array of { type: 'item', data } and { type: 'ad', slotId }
 * entries — render each with a switch on `type`, using `slotId` as the React
 * key and as the AdPlaceholder's slotId prop.
 */
export const withAdSlots = (items, { keyPrefix, every = 6, max = 8 } = {}) => {
  if (!Array.isArray(items) || items.length === 0) return [];

  const result = [];
  let adCount = 0;

  items.forEach((item, index) => {
    result.push({ type: 'item', data: item });

    const isInterval = (index + 1) % every === 0;
    const isLast = index === items.length - 1;
    if (isInterval && !isLast && adCount < max) {
      adCount += 1;
      result.push({ type: 'ad', slotId: `${keyPrefix}-ad-${adCount}` });
    }
  });

  return result;
};
