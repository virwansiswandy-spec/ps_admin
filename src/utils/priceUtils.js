/**
 * Calculates the effective unit price of an item considering price_tiers (Grosir), base_price, and cost_price.
 */
export const getItemEffectivePrice = (item, quantity = 1) => {
  return getItemPriceDetail(item, quantity).unitPrice;
};

/**
 * Returns detailed price info including priceType, activeTier, and child composition tiers.
 */
export const getItemPriceDetail = (item, quantity = 1) => {
  if (!item) return { unitPrice: 0, priceType: 'none', activeTier: null };

  const qty = parseFloat(quantity || 1);

  // 1. Manual override price if set
  if (item.manual_override_price && parseFloat(item.manual_override_price) > 0) {
    return {
      unitPrice: parseFloat(item.manual_override_price),
      priceType: 'manual_override',
      activeTier: null
    };
  }

  // 2. Parent Price Tiers (Grosir) lookup when quantity meets or exceeds tier minimum
  if (item.price_tiers && Array.isArray(item.price_tiers) && item.price_tiers.length > 0) {
    const sortedTiers = [...item.price_tiers].sort(
      (a, b) => parseFloat(b.min_quantity || 0) - parseFloat(a.min_quantity || 0)
    );
    const matchingTier = sortedTiers.find(t => qty >= parseFloat(t.min_quantity || 0));
    if (matchingTier && parseFloat(matchingTier.unit_price) > 0) {
      return {
        unitPrice: parseFloat(matchingTier.unit_price),
        priceType: 'price_tier',
        activeTier: matchingTier
      };
    }
  }

  // 3. Child Compositions Sum (if item is composite and has compositions)
  if ((item.is_composite || (item.compositions && item.compositions.length > 0)) && 
      item.compositions && Array.isArray(item.compositions) && item.compositions.length > 0) {
    
    let hasChildTier = false;
    const activeChildTiers = [];

    const compSum = item.compositions.reduce((acc, subComp) => {
      const childItem = subComp.child_item;
      if (!childItem) return acc;

      const perParentQty = parseFloat(subComp.quantity || 0);
      const totalChildQty = perParentQty * qty;
      
      // Calculate child item effective price based on total child quantity required across parent quantity
      const childPriceDetail = getItemPriceDetail(childItem, totalChildQty);
      if (childPriceDetail.priceType === 'price_tier') {
        hasChildTier = true;
        activeChildTiers.push({
          childName: childItem.name,
          minQty: childPriceDetail.activeTier?.min_quantity,
          unitPrice: childPriceDetail.unitPrice,
          totalQty: totalChildQty
        });
      }

      return acc + (childPriceDetail.unitPrice * perParentQty);
    }, 0);
    
    if (compSum > 0 && (!item.base_price || parseFloat(item.base_price) === 0 || item.is_composite)) {
      return {
        unitPrice: compSum,
        priceType: 'composite_sum',
        activeTier: null,
        hasChildTier,
        activeChildTiers
      };
    }
  }

  // 4. Base Selling Price (Standard price when quantity is below tier minimum)
  if (item.base_price && parseFloat(item.base_price) > 0) {
    return {
      unitPrice: parseFloat(item.base_price),
      priceType: 'base_price',
      activeTier: null
    };
  }

  // 5. Fallback to lowest tier ONLY if base_price is 0 or not set
  if (item.price_tiers && Array.isArray(item.price_tiers) && item.price_tiers.length > 0) {
    const sortedTiers = [...item.price_tiers].sort(
      (a, b) => parseFloat(a.min_quantity || 0) - parseFloat(b.min_quantity || 0)
    );
    const lowestTier = sortedTiers[0];
    if (lowestTier && parseFloat(lowestTier.unit_price) > 0) {
      return {
        unitPrice: parseFloat(lowestTier.unit_price),
        priceType: 'lowest_tier_fallback',
        activeTier: lowestTier
      };
    }
  }

  // 6. Cost Price Fallback
  if (item.cost_price && parseFloat(item.cost_price) > 0) {
    return {
      unitPrice: parseFloat(item.cost_price),
      priceType: 'cost_price',
      activeTier: null
    };
  }

  return { unitPrice: 0, priceType: 'none', activeTier: null };
};
