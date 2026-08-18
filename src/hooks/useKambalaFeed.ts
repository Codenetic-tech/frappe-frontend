import { useEffect, useId, useMemo } from 'react';
import { useKambalaFeedContext, TickData } from '../contexts/KambalaFeedContext';

export type { TickData };

export function useKambalaFeed(tokens: string[] = []) {
  const { ticks, isConnected, registerTokens, unregisterTokens } = useKambalaFeedContext();
  const clientId = useId();

  const safeTokens = useMemo(() => {
    if (!Array.isArray(tokens)) return [];
    return tokens.filter(t => typeof t === 'string' && t.trim().length > 0);
  }, [tokens]);

  const serialized = useMemo(() => JSON.stringify(safeTokens), [safeTokens]);

  useEffect(() => {
    registerTokens(clientId, safeTokens);
    return () => {
      unregisterTokens(clientId);
    };
  }, [serialized, clientId]);

  return { ticks, isConnected };
}
