import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

export interface TickData {
  token: string;
  lp: string; // Last price
  pc: string; // Price change
  c?: string;  // Close
  h?: string;  // High
  l?: string;  // Low
  o?: string;  // Open
  v?: string;  // Volume
  ts?: string; // Timestamp
}

interface KambalaFeedContextType {
  ticks: Record<string, TickData>;
  isConnected: boolean;
  registerTokens: (clientId: string, tokens: string[]) => void;
  unregisterTokens: (clientId: string) => void;
}

const KambalaFeedContext = createContext<KambalaFeedContextType | undefined>(undefined);

export const KambalaFeedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const prevUserRef = useRef(user);

  const [ticks, setTicks] = useState<Record<string, TickData>>({});
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Track subscriptions by component/hook ID
  const subscriptionsRef = useRef<Record<string, string[]>>({});
  // Track currently active unique tokens subscribed at the WebSocket level
  const activeSubscribedTokensRef = useRef<string[]>([]);
  // Track watchdog timestamp
  const lastTickTimeRef = useRef<number>(Date.now());
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttemptRef = useRef<number>(0);

  const isValidToken = (t: string): boolean => {
    if (!t || typeof t !== 'string') return false;
    const parts = t.split('|');
    return parts.length === 2 && parts[0].trim() !== '' && parts[1].trim() !== '';
  };

  // Helper to re-evaluate and sync subscriptions with the socket server
  const performSyncSubscriptions = () => {
    const socket = socketRef.current;
    if (!socket) return;

    // Union of all requested tokens across all registrants
    const allTokens = Array.from(
      new Set(
        Object.values(subscriptionsRef.current)
          .flat()
          .filter(isValidToken)
      )
    );

    const prevTokens = activeSubscribedTokensRef.current;
    const addedTokens = allTokens.filter((t) => !prevTokens.includes(t));
    const removedTokens = prevTokens.filter((t) => !allTokens.includes(t));

    const isSocketConnected = socket.connected;
    if (isSocketConnected) {
      if (addedTokens.length > 0) {
        console.log('KambalaFeedProvider: Subscribing to new tokens:', addedTokens);
        socket.emit('price_subscribe', addedTokens);
      }
      if (removedTokens.length > 0) {
        console.log('KambalaFeedProvider: Unsubscribing from tokens:', removedTokens);
        socket.emit('price_unsubscribe', removedTokens);
      }
    }

    activeSubscribedTokensRef.current = allTokens;
  };

  const scheduleSyncSubscriptions = (immediate = false) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    if (immediate) {
      performSyncSubscriptions();
    } else {
      syncTimeoutRef.current = setTimeout(() => {
        performSyncSubscriptions();
      }, 300);
    }
  };

  const registerTokens = (clientId: string, tokens: string[]) => {
    const valid = tokens.filter(isValidToken);
    subscriptionsRef.current[clientId] = valid;
    lastTickTimeRef.current = Date.now();
    scheduleSyncSubscriptions(true);
  };

  const unregisterTokens = (clientId: string) => {
    delete subscriptionsRef.current[clientId];
    scheduleSyncSubscriptions(false);
  };

  // 1. Establish and manage the single WebSocket connection
  useEffect(() => {
    console.log('KambalaFeedProvider: Initializing single Socket.io connection');
    const socket = io('/pulse.gopocket.in', {
      path: '/socket.io',
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('KambalaFeedProvider: Connected to Kambala feed namespace');
      lastTickTimeRef.current = Date.now();
      retryAttemptRef.current = 0;

      // Resubscribe to all active tokens on reconnect
      const currentTokens = activeSubscribedTokensRef.current;
      if (currentTokens.length > 0) {
        console.log('KambalaFeedProvider: Resubscribing on reconnect:', currentTokens);
        socket.emit('price_subscribe', currentTokens);
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('KambalaFeedProvider: Disconnected from Kambala feed');
    });

    socket.on('price_update', (tick: TickData) => {
      if (!tick) return;
      const rawToken = tick.token || (tick as any).tokenKey || (tick as any).t;
      if (!rawToken) return;

      lastTickTimeRef.current = Date.now();
      retryAttemptRef.current = 0;

      setTicks((prevTicks) => {
        const isValid = (val: any) => {
          if (val === null || val === undefined || val === "") return false;
          const str = String(val).trim().toLowerCase();
          return str !== "null" && str !== "nan" && str !== "undefined";
        };

        const existing = prevTicks[rawToken] || {};
        const merged = { ...existing };
        (Object.keys(tick) as Array<keyof TickData>).forEach((key) => {
          const val = tick[key];
          if (isValid(val)) {
            merged[key] = val as any;
          }
        });

        const nextTicks = {
          ...prevTicks,
          [rawToken]: merged,
        };

        if (rawToken.includes('|')) {
          const parts = rawToken.split('|');
          const plainToken = parts[1];
          if (plainToken) nextTicks[plainToken] = merged;
        } else {
          nextTicks[`NSE|${rawToken}`] = merged;
          nextTicks[`BSE|${rawToken}`] = merged;
          nextTicks[`NFO|${rawToken}`] = merged;
          nextTicks[`BFO|${rawToken}`] = merged;
        }

        return nextTicks;
      });
    });

    socket.on('subscribed', (msg) => {
      console.log('KambalaFeedProvider: Server subscription success:', msg?.subscribed || msg);
    });

    socket.on('subscription_error', (err) => {
      console.error('KambalaFeedProvider: Subscription error:', err?.error || err);
    });

    return () => {
      console.log('KambalaFeedProvider: Cleaning up single Socket.io connection');
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      socket.disconnect();
    };
  }, []);

  // 2. Reconnect Socket on User Auth Transition (e.g. First time after Login)
  useEffect(() => {
    if (user && !prevUserRef.current) {
      console.log('KambalaFeedProvider: User session established. Reconnecting feed socket with session cookies...');
      const socket = socketRef.current;
      if (socket) {
        lastTickTimeRef.current = Date.now();
        retryAttemptRef.current = 0;
        socket.disconnect();
        socket.connect();
      }
    }
    prevUserRef.current = user;
  }, [user]);

  // 3. Watchdog timer to monitor feed stagnation gracefully
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const socket = socketRef.current;
      if (socket && socket.connected && activeSubscribedTokensRef.current.length > 0) {
        const timeSinceLastTick = Date.now() - lastTickTimeRef.current;
        const STAGNANT_THRESHOLD_MS = 15000;

        if (timeSinceLastTick > STAGNANT_THRESHOLD_MS) {
          if (retryAttemptRef.current === 0) {
            console.warn(`KambalaFeedProvider: Feed idle for ${Math.round(timeSinceLastTick / 1000)}s. Re-emitting active price subscriptions...`);
            lastTickTimeRef.current = Date.now();
            socket.emit('price_subscribe', activeSubscribedTokensRef.current);
            retryAttemptRef.current = 1;
          } else {
            console.warn(`KambalaFeedProvider: Feed stagnant after retry. Reconnecting Socket.io connection.`);
            lastTickTimeRef.current = Date.now();
            retryAttemptRef.current = 0;
            socket.disconnect();
            socket.connect();
          }
        } else {
          retryAttemptRef.current = 0;
        }
      }
    }, 3000);

    return () => clearInterval(checkInterval);
  }, []);

  // Re-sync subscriptions if socket connects or reconnects
  useEffect(() => {
    if (isConnected) {
      const socket = socketRef.current;
      if (socket && activeSubscribedTokensRef.current.length > 0) {
        console.log('KambalaFeedProvider: Syncing active subscriptions upon connection/reconnection');
        socket.emit('price_subscribe', activeSubscribedTokensRef.current);
      }
    }
  }, [isConnected]);

  return (
    <KambalaFeedContext.Provider value={{ ticks, isConnected, registerTokens, unregisterTokens }}>
      {children}
    </KambalaFeedContext.Provider>
  );
};

export const useKambalaFeedContext = () => {
  const context = useContext(KambalaFeedContext);
  if (context === undefined) {
    throw new Error('useKambalaFeedContext must be used within a KambalaFeedProvider');
  }
  return context;
};
