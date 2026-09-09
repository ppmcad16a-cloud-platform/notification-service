const http = require('http');
const Client = require('socket.io-client');

require('../tests/registerModels');
const dbHandler = require('../tests/dbHandler');
const { createUser, createToken, newId } = require('../tests/helpers');
const { ROLES } = require('../constants');
const socket = require('./index');
const support = require('./support');

let httpServer;
let port;

beforeAll(async () => {
  await dbHandler.connect();
  httpServer = http.createServer();
  socket(httpServer);
  await new Promise(resolve => httpServer.listen(0, resolve));
  port = httpServer.address().port;
});

afterEach(async () => {
  await dbHandler.clear();
  // In-memory socket state (socket/support.js) is module-level and outlives
  // any single test's connections, so it needs a manual reset here.
  support.users.length = 0;
  jest.restoreAllMocks();
});

afterAll(async () => {
  await dbHandler.disconnect();
  await new Promise(resolve => httpServer.close(resolve));
});

const connectClient = (token, connectOpts = {}) =>
  Client(`http://localhost:${port}`, {
    auth: token ? { token } : {},
    reconnection: false,
    forceNew: true,
    transports: ['websocket'],
    ...connectOpts
  });

const onceEvent = (emitter, event, timeout = 3000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for "${event}"`)),
      timeout
    );
    emitter.once(event, (...args) => {
      clearTimeout(timer);
      resolve(args[0]);
    });
  });

describe('authHandler (socket/index.js)', () => {
  it('rejects a connection with no token', async () => {
    const client = connectClient();
    const err = await onceEvent(client, 'connect_error');
    expect(err.message).toBe('no token');
    client.close();
  });

  it('rejects a connection with a malformed auth type', async () => {
    const client = connectClient('Basic sometoken');
    const err = await onceEvent(client, 'connect_error');
    expect(err.message).toBe('no token');
    client.close();
  });

  it('rejects a connection with "Bearer" but no token value', async () => {
    const client = connectClient('Bearer ');
    const err = await onceEvent(client, 'connect_error');
    expect(err.message).toBe('no token');
    client.close();
  });

  it('rejects a token whose user no longer exists', async () => {
    const token = createToken({ _id: newId() });
    const client = connectClient(token);
    const err = await onceEvent(client, 'connect_error');
    expect(err.message).toBe('no user found');
    client.close();
  });

  it('registers a new user on first connection', async () => {
    const user = await createUser({ role: ROLES.Member });
    const token = createToken(user);

    const client = connectClient(token);
    await onceEvent(client, 'connect');

    const registered = support.findUserById(user._id.toString());
    expect(registered).toBeDefined();
    expect(registered.socketId).toBe(client.id);
    expect(registered.isAdmin).toBe(false);

    client.close();
  });

  it('marks an Admin user as isAdmin on connection', async () => {
    const admin = await createUser({ role: ROLES.Admin });
    const token = createToken(admin);

    const client = connectClient(token);
    await onceEvent(client, 'connect');

    expect(support.findUserById(admin._id.toString()).isAdmin).toBe(true);

    client.close();
  });

  it("updates the existing entry's socketId on a second connection", async () => {
    const user = await createUser({ role: ROLES.Member });
    const token = createToken(user);

    const first = connectClient(token);
    await onceEvent(first, 'connect');
    const firstSocketId = support.findUserById(user._id.toString()).socketId;

    const second = connectClient(token);
    await onceEvent(second, 'connect');

    const entries = support.users.filter(u => u.id === user._id.toString());
    expect(entries).toHaveLength(1);
    expect(entries[0].socketId).not.toBe(firstSocketId);
    expect(entries[0].socketId).toBe(second.id);

    first.close();
    second.close();
  });
});

describe('supportHandler (socket/support.js)', () => {
  it('connectUser: notifies online admins when a member connects', async () => {
    const admin = await createUser({ role: ROLES.Admin });
    const adminClient = connectClient(createToken(admin));
    await onceEvent(adminClient, 'connect');
    adminClient.emit('connectUser');
    // Let the admin register as online before the member connects.
    await new Promise(resolve => setTimeout(resolve, 50));

    const member = await createUser({ role: ROLES.Member });
    const memberClient = connectClient(createToken(member));
    await onceEvent(memberClient, 'connect');

    const notifyPromise = onceEvent(adminClient, 'connectUser');
    memberClient.emit('connectUser');
    const notifiedUser = await notifyPromise;

    expect(notifiedUser.id).toBe(member._id.toString());

    adminClient.close();
    memberClient.close();
  });

  it('connectUser: broadcasts when an admin connects', async () => {
    const member = await createUser({ role: ROLES.Member });
    const memberClient = connectClient(createToken(member));
    await onceEvent(memberClient, 'connect');

    const admin = await createUser({ role: ROLES.Admin });
    const adminClient = connectClient(createToken(admin));
    await onceEvent(adminClient, 'connect');

    const broadcastPromise = onceEvent(memberClient, 'connectUser');
    adminClient.emit('connectUser');
    const notifiedUser = await broadcastPromise;

    expect(notifiedUser.id).toBe(admin._id.toString());

    adminClient.close();
    memberClient.close();
  });

  it('connectUser: no-ops when the emitting socket has no registered user', async () => {
    // Regression guard for the `if (user)` branch in supportHandler's
    // connectUser handler — a socket that never completed authHandler's
    // registration (impossible via a real client, since authHandler always
    // registers before `next()` is called) is simulated by emitting after
    // manually clearing the in-memory registry.
    const member = await createUser({ role: ROLES.Member });
    const memberClient = connectClient(createToken(member));
    await onceEvent(memberClient, 'connect');

    support.users.length = 0;
    memberClient.emit('connectUser');
    await new Promise(resolve => setTimeout(resolve, 50));

    memberClient.close();
  });

  it('getUsers: an admin sees everyone else; a member sees only admins', async () => {
    const admin = await createUser({ role: ROLES.Admin });
    const adminClient = connectClient(createToken(admin));
    await onceEvent(adminClient, 'connect');

    const member = await createUser({ role: ROLES.Member });
    const memberClient = connectClient(createToken(member));
    await onceEvent(memberClient, 'connect');

    const adminUsersPromise = onceEvent(adminClient, 'getUsers');
    adminClient.emit('getUsers');
    const adminUsers = await adminUsersPromise;
    expect(adminUsers.map(u => u.id)).toEqual([member._id.toString()]);

    const memberUsersPromise = onceEvent(memberClient, 'getUsers');
    memberClient.emit('getUsers');
    const memberUsers = await memberUsersPromise;
    expect(memberUsers.map(u => u.id)).toEqual([admin._id.toString()]);

    adminClient.close();
    memberClient.close();
  });

  it('message: delivers to both the sender and the recipient', async () => {
    const admin = await createUser({ role: ROLES.Admin });
    const adminClient = connectClient(createToken(admin));
    await onceEvent(adminClient, 'connect');

    const member = await createUser({ role: ROLES.Member });
    const memberClient = connectClient(createToken(member));
    await onceEvent(memberClient, 'connect');

    const adminReceivedPromise = onceEvent(adminClient, 'message');
    const memberReceivedPromise = onceEvent(memberClient, 'message');

    memberClient.emit('message', { text: 'Hello admin', to: admin._id.toString() });

    const [adminReceived, memberReceived] = await Promise.all([
      adminReceivedPromise,
      memberReceivedPromise
    ]);

    expect(adminReceived.value).toBe('Hello admin');
    expect(memberReceived.value).toBe('Hello admin');
    expect(adminReceived.from).toBe(member._id.toString());
    expect(adminReceived.to).toBe(admin._id.toString());

    adminClient.close();
    memberClient.close();
  });

  it('getMessages: returns only this user\'s sent/received messages', async () => {
    const admin = await createUser({ role: ROLES.Admin });
    const adminClient = connectClient(createToken(admin));
    await onceEvent(adminClient, 'connect');

    const member = await createUser({ role: ROLES.Member });
    const memberClient = connectClient(createToken(member));
    await onceEvent(memberClient, 'connect');

    const memberGotMessage = onceEvent(memberClient, 'message');
    adminClient.emit('message', { text: 'Hi member', to: member._id.toString() });
    await memberGotMessage;

    const historyPromise = onceEvent(memberClient, 'getMessages');
    memberClient.emit('getMessages');
    const history = await historyPromise;

    expect(history).toHaveLength(1);
    expect(history[0].value).toBe('Hi member');

    adminClient.close();
    memberClient.close();
  });

  it('getMessages: returns an empty history for a socket with no registered user', async () => {
    const member = await createUser({ role: ROLES.Member });
    const memberClient = connectClient(createToken(member));
    await onceEvent(memberClient, 'connect');

    support.users.length = 0;
    const historyPromise = onceEvent(memberClient, 'getMessages');
    memberClient.emit('getMessages');
    const history = await historyPromise;

    expect(history).toEqual([]);

    memberClient.close();
  });

  it('disconnect: flips online status and broadcasts to others', async () => {
    const member = await createUser({ role: ROLES.Member });
    const memberClient = connectClient(createToken(member));
    await onceEvent(memberClient, 'connect');

    const admin = await createUser({ role: ROLES.Admin });
    const adminClient = connectClient(createToken(admin));
    await onceEvent(adminClient, 'connect');
    adminClient.emit('connectUser');
    await new Promise(resolve => setTimeout(resolve, 50));

    const disconnectPromise = onceEvent(memberClient, 'disconnectUser');
    adminClient.close();
    const disconnectedUser = await disconnectPromise;

    expect(disconnectedUser.id).toBe(admin._id.toString());
    expect(support.findUserById(admin._id.toString()).online).toBe(false);

    memberClient.close();
  });

  it('disconnect: no-ops when the disconnecting socket has no registered user', async () => {
    const member = await createUser({ role: ROLES.Member });
    const memberClient = connectClient(createToken(member));
    await onceEvent(memberClient, 'connect');

    support.users.length = 0;
    memberClient.close();
    await new Promise(resolve => setTimeout(resolve, 50));
  });
});
