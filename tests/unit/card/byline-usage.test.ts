import { describe, expect, it } from 'vitest';
import { renderCard } from '../../../src/card/run-renderer';
import { initialState, reduce } from '../../../src/card/run-state';

describe('run card byline usage', () => {
  const finished = reduce(reduce(initialState, { type: 'text', delta: 'answer' }), {
    type: 'done',
    terminationReason: 'normal',
  });

  it('shows the turn usage after the other byline parts once the run is over', () => {
    const card = JSON.stringify(
      renderCard(finished, { meta: { title: 'CC', agent: 'claude', usage: '25k in / 51 out · ≈$0.03' } }),
    );
    expect(card).toContain('Agent: claude | Usage: 25k in / 51 out · ≈$0.03');
  });

  it('leaves the byline unchanged when no usage was reported', () => {
    const card = JSON.stringify(renderCard(finished, { meta: { title: 'CC', agent: 'claude' } }));
    expect(card).not.toContain('Usage:');
  });

  it('puts a conversation notice at the top, above the answer — it happened before the run', () => {
    const card = JSON.stringify(
      renderCard(finished, { meta: { title: 'CC', agent: 'claude', notice: '本轮从新会话开始' } }),
    );
    expect(card).toContain('🔄 本轮从新会话开始');
    expect(card.indexOf('本轮从新会话开始')).toBeLessThan(card.indexOf('answer'));
  });

  it('shows the notice while the run is still going', () => {
    const running = reduce(initialState, { type: 'text', delta: 'working' });
    const card = JSON.stringify(renderCard(running, { meta: { title: 'CC', notice: '本轮从新会话开始' } }));
    expect(card).toContain('🔄 本轮从新会话开始');
  });
});
