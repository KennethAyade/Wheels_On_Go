import { ChatGateway } from '../src/chat/chat.gateway';
import { ChatService } from '../src/chat/chat.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

const createMockSocket = (overrides: any = {}) => ({
  id: 'socket-1',
  data: {} as any,
  handshake: {
    auth: {},
    headers: {},
    ...overrides.handshake,
  },
  emit: jest.fn(),
  join: jest.fn(),
  disconnect: jest.fn(),
  ...overrides,
});

const createMockServer = () => {
  const emitFn = jest.fn();
  return {
    to: jest.fn().mockReturnValue({ emit: emitFn }),
    emit: emitFn,
    _emitFn: emitFn,
  };
};

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let chatService: ChatService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    chatService = {
      isParticipant: jest.fn(),
      getHistory: jest.fn(),
      markAsRead: jest.fn(),
      getOtherParticipant: jest.fn(),
      saveMessage: jest.fn(),
    } as unknown as ChatService;

    jwtService = {
      verify: jest.fn().mockReturnValue({ sub: 'user-1' }),
    } as unknown as JwtService;

    configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService;

    gateway = new ChatGateway(chatService, jwtService, configService);
    mockServer = createMockServer();
    (gateway as any).server = mockServer;
  });

  describe('handleConnection()', () => {
    it('authenticates with Bearer token from headers', async () => {
      const client = createMockSocket({
        handshake: { auth: {}, headers: { authorization: 'Bearer valid-token' } },
      });
      await gateway.handleConnection(client as any);
      expect(jwtService.verify).toHaveBeenCalledWith('valid-token', { secret: 'test-secret' });
      expect(client.data.userId).toBe('user-1');
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('authenticates with token from handshake auth', async () => {
      const client = createMockSocket({
        handshake: { auth: { token: 'raw-token' }, headers: {} },
      });
      await gateway.handleConnection(client as any);
      expect(jwtService.verify).toHaveBeenCalledWith('raw-token', { secret: 'test-secret' });
      expect(client.data.userId).toBe('user-1');
    });

    it('disconnects client when no token provided', async () => {
      const client = createMockSocket();
      await gateway.handleConnection(client as any);
      expect(client.emit).toHaveBeenCalledWith('error', expect.objectContaining({ message: expect.any(String) }));
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('disconnects client when JWT verification fails', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      const client = createMockSocket({
        handshake: { auth: { token: 'bad-token' }, headers: {} },
      });
      await gateway.handleConnection(client as any);
      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect()', () => {
    it('removes user from maps on disconnect', async () => {
      // First connect to populate maps
      const client = createMockSocket({
        handshake: { auth: { token: 'token' }, headers: {} },
      });
      await gateway.handleConnection(client as any);

      // Then disconnect
      gateway.handleDisconnect(client as any);

      // Verify maps are cleared by connecting again and checking no duplicate issues
      const maps = (gateway as any);
      expect(maps.userSocketMap.has('user-1')).toBe(false);
      expect(maps.socketUserMap.has('socket-1')).toBe(false);
    });
  });

  describe('handleJoin()', () => {
    it('does nothing when userId is null', async () => {
      const client = createMockSocket();
      client.data.userId = undefined;
      await gateway.handleJoin(client as any, { rideId: 'ride-1' });
      expect(chatService.isParticipant).not.toHaveBeenCalled();
    });

    it('emits error when user is not a ride participant', async () => {
      const client = createMockSocket();
      client.data.userId = 'user-1';
      (chatService.isParticipant as jest.Mock).mockResolvedValue(false);
      await gateway.handleJoin(client as any, { rideId: 'ride-1' });
      expect(client.emit).toHaveBeenCalledWith('error', expect.objectContaining({ message: expect.any(String) }));
      expect(client.join).not.toHaveBeenCalled();
    });

    it('joins room, sends history, and marks read on success', async () => {
      const client = createMockSocket();
      client.data.userId = 'user-1';
      (chatService.isParticipant as jest.Mock).mockResolvedValue(true);
      (chatService.getHistory as jest.Mock).mockResolvedValue([{ id: 'msg-1' }]);
      (chatService.markAsRead as jest.Mock).mockResolvedValue(undefined);

      await gateway.handleJoin(client as any, { rideId: 'ride-1' });
      expect(client.join).toHaveBeenCalledWith('ride-chat:ride-1');
      expect(client.emit).toHaveBeenCalledWith('chat:history', {
        rideId: 'ride-1',
        messages: [{ id: 'msg-1' }],
      });
      expect(chatService.markAsRead).toHaveBeenCalledWith('ride-1', 'user-1');
    });
  });

  describe('handleSend()', () => {
    it('does nothing when userId is null', async () => {
      const client = createMockSocket();
      client.data.userId = undefined;
      await gateway.handleSend(client as any, { rideId: 'ride-1', content: 'Hello' });
      expect(chatService.getOtherParticipant).not.toHaveBeenCalled();
    });

    it('does nothing when content is empty/whitespace', async () => {
      const client = createMockSocket();
      client.data.userId = 'user-1';
      await gateway.handleSend(client as any, { rideId: 'ride-1', content: '   ' });
      expect(chatService.getOtherParticipant).not.toHaveBeenCalled();
    });

    it('emits error when other participant not found', async () => {
      const client = createMockSocket();
      client.data.userId = 'user-1';
      (chatService.getOtherParticipant as jest.Mock).mockResolvedValue(null);
      await gateway.handleSend(client as any, { rideId: 'ride-1', content: 'Hello' });
      expect(client.emit).toHaveBeenCalledWith('error', expect.objectContaining({ message: expect.any(String) }));
    });

    it('saves message, trims content, and broadcasts to room', async () => {
      const client = createMockSocket();
      client.data.userId = 'user-1';
      const savedMsg = { id: 'msg-1', content: 'Hello' };
      (chatService.getOtherParticipant as jest.Mock).mockResolvedValue('user-2');
      (chatService.saveMessage as jest.Mock).mockResolvedValue(savedMsg);

      await gateway.handleSend(client as any, { rideId: 'ride-1', content: '  Hello  ' });

      expect(chatService.saveMessage).toHaveBeenCalledWith({
        rideId: 'ride-1',
        senderId: 'user-1',
        receiverId: 'user-2',
        content: 'Hello',
      });
      expect(mockServer.to).toHaveBeenCalledWith('ride-chat:ride-1');
      expect(mockServer._emitFn).toHaveBeenCalledWith('chat:message', savedMsg);
    });
  });

  describe('handleRead()', () => {
    it('does nothing when userId is null', async () => {
      const client = createMockSocket();
      client.data.userId = undefined;
      await gateway.handleRead(client as any, { rideId: 'ride-1' });
      expect(chatService.markAsRead).not.toHaveBeenCalled();
    });

    it('calls chatService.markAsRead', async () => {
      const client = createMockSocket();
      client.data.userId = 'user-1';
      await gateway.handleRead(client as any, { rideId: 'ride-1' });
      expect(chatService.markAsRead).toHaveBeenCalledWith('ride-1', 'user-1');
    });
  });
});
