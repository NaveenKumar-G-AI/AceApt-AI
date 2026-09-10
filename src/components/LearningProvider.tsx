"use client";
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { EMPTY, parseState, type LearningState } from "@/lib/learning";
const KEY = "aceapt.learning.v1";
const Context = createContext<{
  state: LearningState;
  update: (fn: (s: LearningState) => LearningState) => void;
  ready: boolean;
  notice: string;
}>({ state: EMPTY, update: () => {}, ready: false, notice: "" });
export function LearningProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LearningState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const current = useRef<LearningState>(EMPTY);
  useEffect(() => {
    const load = () => {
      try {
        current.current = parseState(localStorage.getItem(KEY));
        setState(current.current);
      } catch {
        setNotice(
          "Saved progress could not be read. This session can still be used; export any progress you want to keep.",
        );
      }
      setReady(true);
    };
    load();
    const sync = (e: StorageEvent) => {
      if (e.key === KEY) load();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const update = useCallback((fn: (s: LearningState) => LearningState) => {
    const next = fn(current.current);
    if (next === current.current) return;
    current.current = next;
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      setNotice(
        "Progress is available for this session, but this browser could not save it. Export it before closing.",
      );
    }
    setState(next);
  }, []);
  return (
    <Context.Provider value={{ state, update, ready, notice }}>
      {children}
    </Context.Provider>
  );
}
export const useLearning = () => useContext(Context);
