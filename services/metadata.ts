
import { ProductDefinition } from '../types.js';
import { AVAILABLE_PRODUCTS, UTD_VARIANTS, LXD_VARIANTS, WHT_FACTOR, EXCHANGE_RATE_SAR } from '../constants.js';

export interface PublicMetadata {
  availableProducts: ProductDefinition[];
  utdVariants: Record<string, number>;
  lxdVariants: Record<string, number>;
  exchangeRateSAR: number;
  whtFactor: number;
}

export const getPublicMetadata = (): PublicMetadata => {
  return {
    availableProducts: AVAILABLE_PRODUCTS,
    utdVariants: UTD_VARIANTS,
    lxdVariants: LXD_VARIANTS,
    exchangeRateSAR: EXCHANGE_RATE_SAR,
    whtFactor: WHT_FACTOR
  };
};
