# Dependencies

Classify each dependency a module relies on. The category decides how the module is tested across its interface, and whether the design needs a port.

## Categories

1. **In-process.** Pure computation, in-memory state, no I/O. Test through the interface directly. No port, no adapter.
2. **Local stand-in.** The dependency has a local substitute that runs in the test suite, such as PGLite for Postgres or an in-memory filesystem. Test with the stand-in. The seam stays inside the module, with no port on its interface.
3. **Remote but owned.** Your own service across a network: a microservice, an internal API, a queue. Define a port at the seam. The module owns the logic and takes the transport as an adapter: HTTP, gRPC, or queue in production, in-memory in tests.
4. **True external.** A third-party service you don't control, such as Stripe or Twilio. The module takes it as an injected port, and tests pass a mock adapter. See the **tdd** skill's [`references/mocking.md`](../../tdd/references/mocking.md).

## Seam discipline

- A port needs at least two adapters, usually production and test. A port with one adapter is indirection, per the **minimize-reader-load** principle skill.
- A module can have internal seams that only its own tests use. Keep them off the interface.
