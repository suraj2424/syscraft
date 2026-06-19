"use client";

import { useEffect, useRef, useCallback } from "react";

export function useKeyboardShortcuts(handlers: {
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSelectAll: () => void;
}) {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const handleKeyDown = useCallback((e: globalThis.KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const tag = target.tagName;
    const isEditable =
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      target.isContentEditable;

    if (isEditable) return;

    const mod = e.metaKey || e.ctrlKey;

    if (mod && e.key.toLowerCase() === "c") {
      e.preventDefault();
      handlersRef.current.onCopy();
    } else if (mod && e.key.toLowerCase() === "x") {
      e.preventDefault();
      handlersRef.current.onCut();
    } else if (mod && e.key.toLowerCase() === "v") {
      e.preventDefault();
      handlersRef.current.onPaste();
    } else if (mod && e.key.toLowerCase() === "a") {
      e.preventDefault();
      handlersRef.current.onSelectAll();
    } else if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
      e.preventDefault();
      handlersRef.current.onUndo();
    } else if (
      mod &&
      (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))
    ) {
      e.preventDefault();
      handlersRef.current.onRedo();
    } else if ((e.key === "Delete" || e.key === "Backspace") && !mod) {
      e.preventDefault();
      handlersRef.current.onDelete();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
