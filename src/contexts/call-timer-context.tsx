"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

interface CallTimerState {
  isActive: boolean;
  callLogId: string | null;
  phoneNumber: string | null;
  contactName: string | null;
  startTime: number | null;
  elapsedSeconds: number;
  showPostCall: boolean;
}

interface StartCallParams {
  callLogId: string;
  phoneNumber: string;
  contactName?: string;
}

interface CallTimerContextValue {
  state: CallTimerState;
  startCall: (params: StartCallParams) => void;
  endCall: () => void;
  cancelCall: () => void;
  dismissPostCall: () => void;
}

const initialState: CallTimerState = {
  isActive: false,
  callLogId: null,
  phoneNumber: null,
  contactName: null,
  startTime: null,
  elapsedSeconds: 0,
  showPostCall: false,
};

const CallTimerContext = createContext<CallTimerContextValue | null>(null);

export function CallTimerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CallTimerState>(initialState);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer interval
  useEffect(() => {
    if (state.isActive && state.startTime) {
      timerRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          elapsedSeconds: Math.floor((Date.now() - (prev.startTime || Date.now())) / 1000),
        }));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.isActive, state.startTime]);

  const startCall = useCallback((params: StartCallParams) => {
    setState({
      isActive: true,
      callLogId: params.callLogId,
      phoneNumber: params.phoneNumber,
      contactName: params.contactName || null,
      startTime: Date.now(),
      elapsedSeconds: 0,
      showPostCall: false,
    });
  }, []);

  const endCall = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState((prev) => ({
      ...prev,
      isActive: false,
      showPostCall: true,
    }));
  }, []);

  const cancelCall = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState(initialState);
  }, []);

  const dismissPostCall = useCallback(() => {
    setState(initialState);
  }, []);

  return (
    <CallTimerContext.Provider value={{ state, startCall, endCall, cancelCall, dismissPostCall }}>
      {children}
    </CallTimerContext.Provider>
  );
}

export function useCallTimer() {
  const ctx = useContext(CallTimerContext);
  if (!ctx) throw new Error("useCallTimer must be used within CallTimerProvider");
  return ctx;
}
