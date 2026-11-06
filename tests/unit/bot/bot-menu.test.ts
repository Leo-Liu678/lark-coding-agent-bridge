import { describe, expect, it } from 'vitest';
import {
  applyMenuPrefix,
  MenuPrefixes,
  menuKeyToPrefix,
  parseBotMenuEvent,
} from '../../../src/bot/bot-menu';

describe('parseBotMenuEvent', () => {
  const body = {
    event_key: 'new-topic+statechart',
    timestamp: 1730000000,
    operator: { operator_name: 'Leo', operator_id: { open_id: 'ou_1', union_id: 'on_1' } },
  };

  it('reads the flattened body', () => {
    expect(parseBotMenuEvent(body)).toEqual({
      eventKey: 'new-topic+statechart',
      operatorOpenId: 'ou_1',
      operatorName: 'Leo',
    });
  });

  it('reads the nested envelope', () => {
    expect(parseBotMenuEvent({ header: {}, event: body })?.operatorOpenId).toBe('ou_1');
  });

  it('rejects events without key or operator', () => {
    expect(parseBotMenuEvent({ ...body, event_key: '' })).toBeUndefined();
    expect(parseBotMenuEvent({ event_key: 'x' })).toBeUndefined();
    expect(parseBotMenuEvent(null)).toBeUndefined();
  });
});

describe('menuKeyToPrefix', () => {
  it('turns + joined skill names into slash prefixes', () => {
    expect(menuKeyToPrefix('new-topic')).toBe('/new-topic');
    expect(menuKeyToPrefix('new-topic+statechart')).toBe('/new-topic /statechart');
    expect(menuKeyToPrefix(' /new-topic + eli5:eli5 ')).toBe('/new-topic /eli5:eli5');
  });

  it('rejects keys that are not command names', () => {
    expect(menuKeyToPrefix('')).toBeUndefined();
    expect(menuKeyToPrefix('+')).toBeUndefined();
    expect(menuKeyToPrefix('rm -rf')).toBeUndefined();
    expect(menuKeyToPrefix('1abc')).toBeUndefined();
  });
});

describe('applyMenuPrefix', () => {
  it('prepends the prefix', () => {
    expect(applyMenuPrefix('  hello ', '/new-topic')).toBe('/new-topic hello');
    expect(applyMenuPrefix('', '/new-topic')).toBe('/new-topic');
  });

  it('keeps a typed slash command', () => {
    expect(applyMenuPrefix('/reset', '/new-topic')).toBe('/reset');
  });
});

describe('MenuPrefixes', () => {
  it('is consumed once', () => {
    const p = new MenuPrefixes(1000);
    p.arm('ou_1', '/new-topic', 0);
    expect(p.peek('ou_1', 10)).toBe('/new-topic');
    expect(p.take('ou_1', 10)).toBe('/new-topic');
    expect(p.take('ou_1', 20)).toBeUndefined();
  });

  it('expires', () => {
    const p = new MenuPrefixes(1000);
    p.arm('ou_1', '/new-topic', 0);
    expect(p.peek('ou_1', 2000)).toBeUndefined();
    expect(p.take('ou_1', 2000)).toBeUndefined();
  });

  it('re-arming replaces and disarm clears', () => {
    const p = new MenuPrefixes(1000);
    p.arm('ou_1', '/a', 0);
    p.arm('ou_1', '/b', 1);
    expect(p.disarm('ou_1')).toBe(true);
    expect(p.disarm('ou_1')).toBe(false);
    expect(p.take('ou_1', 2)).toBeUndefined();
  });
});
