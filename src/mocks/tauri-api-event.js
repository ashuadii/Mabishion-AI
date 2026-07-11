const listeners = new Map();

export async function emit(event, payload) {
  console.debug('[e2e-mock] emit:', event);
  const fns = listeners.get(event) || [];
  fns.forEach(fn => fn({ event, payload }));
}

export async function listen(event, handler) {
  if (!listeners.has(event)) listeners.set(event, []);
  listeners.get(event).push(handler);
  return () => {
    const fns = listeners.get(event) || [];
    listeners.set(event, fns.filter(f => f !== handler));
  };
}

export async function once(event, handler) {
  const unlisten = await listen(event, (e) => {
    handler(e);
    unlisten();
  });
  return unlisten;
}
