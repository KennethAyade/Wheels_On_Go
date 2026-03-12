import { ChatController } from '../src/chat/chat.controller';
import { ChatService } from '../src/chat/chat.service';

describe('ChatController', () => {
  let controller: ChatController;
  let chatService: ChatService;

  beforeEach(() => {
    chatService = {
      getHistory: jest.fn().mockResolvedValue([{ id: 'msg-1' }]),
    } as unknown as ChatService;
    controller = new ChatController(chatService);
  });

  it('getMessages delegates to chatService.getHistory with rideId', async () => {
    const user = { sub: 'user-1' } as any;
    await controller.getMessages(user, 'ride-1');
    expect(chatService.getHistory).toHaveBeenCalledWith('ride-1');
  });

  it('returns history result from service', async () => {
    const user = { sub: 'user-1' } as any;
    const result = await controller.getMessages(user, 'ride-1');
    expect(result).toEqual([{ id: 'msg-1' }]);
  });
});
