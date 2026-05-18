// Minimal jsdom environment setup for React component tests.
// jsdom does not include EventSource; stub it so AgentActivityProvider
// mounts without errors (the SSE effect guards on NODE_ENV=production
// in real use, but in test we just want a no-op stub).
if (typeof EventSource === "undefined") {
  class EventSourceStub {
    static readonly CONNECTING = 0
    static readonly OPEN = 1
    static readonly CLOSED = 2
    readonly CONNECTING = 0
    readonly OPEN = 1
    readonly CLOSED = 2
    readyState = 0
    addEventListener() {}
    removeEventListener() {}
    close() {}
    dispatchEvent() { return true }
  }
  // @ts-expect-error — polyfill for jsdom
  global.EventSource = EventSourceStub
}
