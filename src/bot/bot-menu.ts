/**
 * 机器人自定义菜单: a menu item set to "推送事件" pushes
 * `application.bot.menu_v6` with its `event_key`. Feishu can't prefill the
 * input box, so a click arms a slash prefix for the clicker instead: their
 * next p2p message runs as if it had been typed with that prefix in front —
 * on a phone, one tap plus the message replaces typing `/new-topic /statechart`.
 *
 * `event_key` names the skills, joined by `+`: `new-topic+statechart` arms
 * `/new-topic /statechart`. `cancel` disarms. A key naming an argument-less
 * bridge command (`reset`, `stop`…) runs it right away instead. The prefix is used once and
 * expires after {@link MENU_PREFIX_TTL_MS}.
 *
 * Only arrives once the app subscribes to "机器人自定义菜单事件" in the
 * developer console. The event carries no chat id — the menu lives in the
 * bot's p2p chat, so the clicker's open_id addresses it.
 */
export const BOT_MENU_EVENT = 'application.bot.menu_v6';

export const MENU_PREFIX_TTL_MS = 10 * 60_000;

export const MENU_CANCEL_KEY = 'cancel';

/**
 * Bridge commands that take no argument: a menu key naming one runs it at
 * once instead of arming it — `reset` arming `/reset` would swallow the next
 * message.
 */
export const MENU_IMMEDIATE_COMMANDS: readonly string[] = ['reset', 'new', 'stop', 'status', 'usage', 'ps', 'help'];

/** `reset` → `/reset` when the key names an immediate command. */
export function menuImmediateCommand(eventKey: string): string | undefined {
  const name = eventKey.trim().replace(/^\//, '').toLowerCase();
  return MENU_IMMEDIATE_COMMANDS.includes(name) ? `/${name}` : undefined;
}

export interface BotMenuEvent {
  eventKey: string;
  operatorOpenId: string;
  operatorName?: string;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v ? v : undefined;
}

/** Flattened (SDK raw handler) or nested `{ header, event }` envelope. */
export function parseBotMenuEvent(raw: unknown): BotMenuEvent | undefined {
  const d = asRecord(raw);
  const body = d.event_key === undefined && d.event ? asRecord(d.event) : d;
  const eventKey = str(body.event_key)?.trim();
  const operator = asRecord(body.operator);
  const operatorOpenId = str(asRecord(operator.operator_id).open_id);
  if (!eventKey || !operatorOpenId) return undefined;
  const operatorName = str(operator.operator_name);
  return { eventKey, operatorOpenId, ...(operatorName ? { operatorName } : {}) };
}

/**
 * `new-topic+statechart` → `/new-topic /statechart`. Each part must look like
 * a slash command name (a leading `/` is tolerated); anything else is not a
 * prefix key and yields undefined.
 */
export function menuKeyToPrefix(eventKey: string): string | undefined {
  const parts = eventKey
    .split('+')
    .map((p) => p.trim().replace(/^\//, ''))
    .filter(Boolean);
  if (!parts.length) return undefined;
  if (!parts.every((p) => /^[A-Za-z][\w:.-]*$/.test(p))) return undefined;
  return parts.map((p) => `/${p}`).join(' ');
}

/**
 * Prepend an armed prefix to the message text. A message that already opens
 * with a slash command keeps its own and the armed prefix is dropped — what
 * was typed wins.
 */
export function applyMenuPrefix(text: string, prefix: string): string {
  if (/^\s*\//.test(text)) return text;
  const body = text.trim();
  return body ? `${prefix} ${body}` : prefix;
}

/** Armed prefixes, keyed by the clicker's open_id. One use, then gone. */
export class MenuPrefixes {
  private readonly armed = new Map<string, { prefix: string; at: number }>();

  constructor(private readonly ttlMs: number = MENU_PREFIX_TTL_MS) {}

  arm(openId: string, prefix: string, now: number = Date.now()): void {
    this.armed.set(openId, { prefix, at: now });
  }

  disarm(openId: string): boolean {
    return this.armed.delete(openId);
  }

  /** The armed prefix, consumed. Undefined when none or expired. */
  take(openId: string, now: number = Date.now()): string | undefined {
    const hit = this.armed.get(openId);
    if (!hit) return undefined;
    this.armed.delete(openId);
    return now - hit.at <= this.ttlMs ? hit.prefix : undefined;
  }

  peek(openId: string, now: number = Date.now()): string | undefined {
    const hit = this.armed.get(openId);
    return hit && now - hit.at <= this.ttlMs ? hit.prefix : undefined;
  }
}

export function menuArmedText(prefix: string): string {
  const minutes = Math.round(MENU_PREFIX_TTL_MS / 60_000);
  return `已选「${prefix}」，直接发内容即可，下一条消息会按它处理（${minutes} 分钟内有效）。`;
}

export function menuCommandText(command: string): string {
  return `菜单：${command}`;
}

export const MENU_CANCELLED_TEXT = '已取消菜单选择。';
export const MENU_NOTHING_TO_CANCEL_TEXT = '当前没有待用的菜单选择。';

/**
 * Whether `text` is one of the notices above. They are bridge UI, not
 * conversation: read back as chat context, 「已选「/new-topic」…下一条消息会按它处理」
 * tells the agent to run that skill on the next message — which the bridge
 * already did — so a topic the menu opened went on to open a second one.
 */
export function isMenuNoticeText(text: string): boolean {
  const t = text.trim();
  return (
    /^已选「[^」]+」，直接发内容即可，下一条消息会按它处理/.test(t) ||
    /^菜单：\/\S+$/.test(t) ||
    t === MENU_CANCELLED_TEXT ||
    t === MENU_NOTHING_TO_CANCEL_TEXT
  );
}

export function menuUnknownKeyText(eventKey: string): string {
  return `菜单项「${eventKey}」没有对应的处理：event_key 应填技能名，多个用 + 连接，例如 new-topic+statechart。`;
}
