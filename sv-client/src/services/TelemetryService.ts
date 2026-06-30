import { txApi } from '../config/api';
import { Endpoints } from '../config/network';

/**
 * Silent background telemetry — fires and forgets.
 * These calls are never awaited in the UI and should not block user flows.
 */
const TelemetryService = {
  logAbandonedCart: (data: {
    storeId: string;
    cashierId?: string;
    itemCount: number;
    cartValue: number;
    abandonedAt?: string;
  }) => {
    txApi.post(Endpoints.TELEMETRY_ABANDONED, {
      ...data,
      abandonedAt: data.abandonedAt ?? new Date().toISOString(),
    }).catch(() => {}); // swallow — telemetry must never crash the app
  },

  logSearchFailure: (data: {
    storeId: string;
    query: string;
    searchType: 'TEXT' | 'BARCODE' | 'IMAGE';
  }) => {
    txApi.post(Endpoints.TELEMETRY_SEARCH_FAIL, data).catch(() => {});
  },
};

export default TelemetryService;
