import { describe, expect, it, vi } from 'vitest';
import { matchTopicPrefix, openTopicUnder, topicOpenedText } from '../../../src/bot/topic-prefix.js';

const LABELS = ['medium', 'high', 'xhigh', 'fable'];

describe('matchTopicPrefix', () => {
  it('matches a rung prefix standing alone, case-insensitively', () => {
    expect(matchTopicPrefix('/xhigh 帮我看下', LABELS)).toEqual({ label: 'xhigh', rest: '帮我看下' });
    expect(matchTopicPrefix('  /Fable\n多行\n任务', LABELS)).toEqual({ label: 'fable', rest: '多行\n任务' });
  });

  it('ignores other commands, glued words and prefixes not at the start', () => {
    expect(matchTopicPrefix('/status 看下', LABELS)).toBeUndefined();
    expect(matchTopicPrefix('/highest 看下', LABELS)).toBeUndefined();
    expect(matchTopicPrefix('/high帮我', LABELS)).toBeUndefined();
    expect(matchTopicPrefix('帮我 /high', LABELS)).toBeUndefined();
    expect(matchTopicPrefix('/high 帮我', [])).toBeUndefined();
  });

  it('needs something to do after the prefix', () => {
    expect(matchTopicPrefix('/high', LABELS)).toBeUndefined();
    expect(matchTopicPrefix('/high   ', LABELS)).toBeUndefined();
    expect(matchTopicPrefix('/high', LABELS, { attachments: 1 })).toEqual({ label: 'high', rest: '' });
    expect(matchTopicPrefix('/high', LABELS, { quoted: true })).toEqual({ label: 'high', rest: '' });
  });

  it('names the rung in the opening line', () => {
    expect(topicOpenedText({ label: 'xhigh', rest: 'x' })).toContain('/xhigh');
  });
});

describe('openTopicUnder', () => {
  const msg = { chatId: 'oc_1', messageId: 'om_1' };

  it('replies in thread under the message and reads the topic back from it', async () => {
    const send = vi.fn(async () => ({ messageId: 'om_reply' }));
    const fetchRawMessage = vi.fn(async () => [{ message_id: 'om_1', thread_id: 'omt_1' }]);
    const channel = { send, fetchRawMessage } as never;
    await expect(openTopicUnder(channel, msg, '🧵', 0)).resolves.toBe('omt_1');
    expect(send).toHaveBeenCalledWith('oc_1', { text: '🧵' }, { replyTo: 'om_1', replyInThread: true });
  });

  it('asks once more when the topic is not there yet', async () => {
    const fetchRawMessage = vi
      .fn()
      .mockResolvedValueOnce([{ message_id: 'om_1' }])
      .mockResolvedValueOnce([{ message_id: 'om_1', thread_id: 'omt_late' }]);
    const channel = { send: vi.fn(async () => ({ messageId: 'om_reply' })), fetchRawMessage } as never;
    await expect(openTopicUnder(channel, msg, '🧵', 1)).resolves.toBe('omt_late');
    expect(fetchRawMessage).toHaveBeenCalledTimes(2);
  });

  it('gives up without a topic when the reply fails', async () => {
    const fetchRawMessage = vi.fn();
    const channel = { send: vi.fn(async () => Promise.reject(new Error('230002'))), fetchRawMessage } as never;
    await expect(openTopicUnder(channel, msg, '🧵', 0)).resolves.toBeUndefined();
    expect(fetchRawMessage).not.toHaveBeenCalled();
  });
});
