import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const WebSocketContext = createContext(null);
const RECONNECT_DELAY_MS = 1500;

const normalizeWsUrl = (raw) => {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (value.startsWith('ws://') || value.startsWith('wss://')) return value;
  if (value.startsWith('http://')) return `ws://${value.slice('http://'.length)}`;
  if (value.startsWith('https://')) return `wss://${value.slice('https://'.length)}`;
  return value;
};

const getWsCandidates = () => {
  const explicit = normalizeWsUrl(import.meta.env.VITE_WS_URL);
  if (explicit) return [explicit];
  if (typeof window === 'undefined') return ['ws://localhost:8080'];
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const hosts = [window.location.hostname || 'localhost', '127.0.0.1', 'localhost'];
  const seen = new Set();
  const candidates = [];
  hosts.forEach((host) => {
    const key = `${protocol}://${host}:8080`;
    if (!seen.has(key)) {
      seen.add(key);
      candidates.push(key);
    }
  });
  return candidates;
};

export const WebSocketProvider = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const shouldReconnect = useRef(true);
  const listeners = useRef(new Set());
  const endpointIndex = useRef(0);

  useEffect(() => {
    const endpoints = getWsCandidates();
    const clearReconnectTimer = () => {
      if (!reconnectTimer.current) return;
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    };

    const connect = () => {
      clearReconnectTimer();
      const nextUrl = endpoints[endpointIndex.current % endpoints.length];
      const socket = new WebSocket(nextUrl);
      ws.current = socket;

      socket.onopen = () => {
        console.log('Connected to WS');
        endpointIndex.current = 0;
        setIsReady(true);
      };

      socket.onclose = () => {
        setIsReady(false);
        if (!shouldReconnect.current) return;
        endpointIndex.current = (endpointIndex.current + 1) % endpoints.length;
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
      };

      socket.onerror = () => {
        setIsReady(false);
        try {
          socket.close();
        } catch {}
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          listeners.current.forEach((handler) => {
            try {
              handler(data);
            } catch (error) {
              console.error('WS subscriber error', error);
            }
          });
          setLastMessage(data);
        } catch (error) {
          console.error('Invalid WS payload', error);
        }
      };
    };

    connect();

    return () => {
      shouldReconnect.current = false;
      clearReconnectTimer();
      if (ws.current) ws.current.close();
    };
  }, []);

  const sendMessage = useCallback((type, payload) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN && isReady) {
      ws.current.send(JSON.stringify({ type, payload }));
      return true;
    }
    return false;
  }, [isReady]);

  const subscribe = useCallback((handler) => {
    listeners.current.add(handler);
    return () => {
      listeners.current.delete(handler);
    };
  }, []);

  const value = useMemo(
    () => ({ sendMessage, lastMessage, isReady, subscribe }),
    [sendMessage, lastMessage, isReady, subscribe]
  );

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
