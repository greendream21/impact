import { useSyncExternalStore } from "react";
import { createObserveDebugEntry, createSetterDebugEntry } from "./debugger";

// @ts-ignore
Symbol.dispose ??= Symbol("Symbol.dispose");

export class ObserverContext {
  static stack: ObserverContext[] = [];
  static get current() {
    return ObserverContext.stack[ObserverContext.stack.length - 1];
  }
  private _signals = new Set<SignalTracker>();
  private _onUpdate?: () => void;
  private _snapshot: { signals: unknown[] } = {
    signals: [],
  };
  get snapshot() {
    return this._snapshot;
  }
  constructor() {
    ObserverContext.stack.push(this);
  }
  registerSignal(signal: SignalTracker) {
    this._signals.add(signal);

    this._snapshot.signals.push(signal.getValue());
  }
  /**
   * There is only a single subscriber to any ObserverContext
   */
  subscribe(onUpdate: () => void) {
    this._onUpdate = onUpdate;
    this._signals.forEach((signal) => {
      signal.addContext(this);
    });

    return () => {
      this._signals.forEach((signal) => {
        signal.removeContext(this);
      });
    };
  }
  notify() {
    this._snapshot = {
      ...this._snapshot,
    };
    this._onUpdate?.();
  }
  [Symbol.dispose]() {
    ObserverContext.stack.pop();
  }
}

export class SignalTracker {
  private contexts = new Set<ObserverContext>();
  constructor(public getValue: () => unknown) {}
  addContext(context: ObserverContext) {
    this.contexts.add(context);
  }
  removeContext(context: ObserverContext) {
    this.contexts.delete(context);
  }
  notify() {
    this.contexts.forEach((context) => context.notify());
  }
}

export type Signal<T> = {
  get value(): T;
  set value(value: T);
  onChange(listener: (newValue: T, prevValue: T) => void): () => void;
  toJSON(): T;
};

export function signal<T>(value: T) {
  const signal = new SignalTracker(() => value);
  let listeners: Set<(newValue: T, prevValue: T) => void> | undefined;

  return {
    onChange(listener: (newValue: T, prevValue: T) => void) {
      listeners = listeners || new Set();

      listeners.add(listener);

      return () => {
        listeners?.delete(listener);
      };
    },
    get value() {
      if (ObserverContext.current) {
        ObserverContext.current.registerSignal(signal);
        if (process.env.NODE_ENV === "development") {
          createObserveDebugEntry(signal);
        }
      }

      return value;
    },
    set value(newValue) {
      const prevValue = value;
      value = newValue;

      if (process.env.NODE_ENV === "development") {
        createSetterDebugEntry(signal, value);
      }

      signal.notify();

      listeners?.forEach((listener) => listener(value, prevValue));
    },
  } as Signal<T>;
}

export function compute<T>(cb: () => T) {
  let value: T;
  let disposer: () => void;
  let isDirty = true;
  const signal = new SignalTracker(() => value);
  let listeners: Set<(newValue: T, prevValue: T) => void> | undefined;

  return {
    onChange: (listener: (newValue: T, prevValue: T) => void) => {
      listeners = listeners || new Set();

      listeners.add(listener);

      return () => {
        listeners?.delete(listener);
      };
    },
    get() {
      if (ObserverContext.current) {
        ObserverContext.current.registerSignal(signal);
        if (process.env.NODE_ENV === "development") {
          createObserveDebugEntry(signal);
        }
      }

      if (isDirty) {
        disposer?.();

        const context = new ObserverContext();

        value = cb();

        // @ts-ignore
        context[Symbol.dispose]();

        disposer = context.subscribe(() => {
          isDirty = true;

          const prevValue = value;

          if (listeners?.size) {
            isDirty = false;
            value = cb();
          }

          signal.notify();

          listeners?.forEach((listener) => listener(value, prevValue));
        });

        isDirty = false;

        if (process.env.NODE_ENV === "development") {
          createSetterDebugEntry(signal, value, true);
        }
      }

      return value;
    },
  };
}

export function observe() {
  const context = new ObserverContext();

  useSyncExternalStore(
    (update) => context.subscribe(update),
    () => context.snapshot
  );

  return context;
}
