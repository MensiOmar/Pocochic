const store = new Map<string, string>();
const memory: Storage = {
  get length() { return store.size; },
  clear: () => store.clear(),
  getItem: (key) => store.get(key) ?? null,
  key: (index) => [...store.keys()][index] ?? null,
  removeItem: (key) => { store.delete(key); },
  setItem: (key, value) => { store.set(key, String(value)); },
};
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: memory });
