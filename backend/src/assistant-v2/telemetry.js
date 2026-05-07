const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'assistant-v2-events.ndjson');

function sanitizeText(value, maxLength = 200) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function ensureTelemetryStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(EVENTS_FILE)) {
    fs.writeFileSync(EVENTS_FILE, '', 'utf8');
  }
}

function readTelemetryEvents() {
  ensureTelemetryStore();
  const raw = fs.readFileSync(EVENTS_FILE, 'utf8');

  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function countBy(records, key) {
  return records.reduce((accumulator, record) => {
    const value = sanitizeText(record?.[key], 80) || 'unknown';
    accumulator[value] = (accumulator[value] || 0) + 1;
    return accumulator;
  }, {});
}

async function recordAssistantV2Event(record) {
  ensureTelemetryStore();

  const safeRecord = {
    eventName: sanitizeText(record?.eventName, 80),
    provider: sanitizeText(record?.provider, 80),
    model: sanitizeText(record?.model, 120),
    route: sanitizeText(record?.route, 80),
    intent: sanitizeText(record?.intent, 80),
    source: sanitizeText(record?.source, 80),
    label: sanitizeText(record?.label, 120),
    message: sanitizeText(record?.message, 160),
    collectionSlug: sanitizeText(record?.collectionSlug, 80),
    productReference: sanitizeText(record?.productReference, 80),
    currentPath: sanitizeText(record?.currentPath, 160),
    actorType: sanitizeText(record?.actorType, 40),
    sessionType: sanitizeText(record?.sessionType, 40),
    latencyMs: Number.isFinite(Number(record?.latencyMs)) ? Number(record.latencyMs) : 0,
    isPersonalized: Boolean(record?.isPersonalized),
    occurredAt: sanitizeText(record?.occurredAt, 80) || new Date().toISOString(),
  };

  if (!safeRecord.eventName) {
    return;
  }

  await fs.promises.appendFile(EVENTS_FILE, `${JSON.stringify(safeRecord)}\n`, 'utf8');
}

function getAssistantV2TelemetrySummary() {
  const events = readTelemetryEvents();
  const chatEvents = events.filter((event) => event.eventName === 'chat_response');
  const conversionEvents = events.filter((event) => event.eventName === 'action_opened');
  const quickReplyEvents = events.filter((event) => event.eventName === 'quick_reply_click');
  const appointmentEvents = events.filter((event) => event.eventName === 'appointment_submitted');
  const openEvents = events.filter((event) => event.eventName === 'launcher_opened');
  const resetEvents = events.filter((event) => event.eventName === 'brief_reset');
  const totalLatency = chatEvents.reduce((sum, event) => sum + (Number(event.latencyMs) || 0), 0);

  return {
    file: EVENTS_FILE,
    totalEvents: events.length,
    lastEventAt: events.length ? events[events.length - 1].occurredAt : '',
    chat: {
      totalResponses: chatEvents.length,
      providerCounts: countBy(chatEvents, 'provider'),
      aiResponses: chatEvents.filter((event) => event.provider === 'vertex-ai').length,
      fallbackResponses: chatEvents.filter((event) => event.provider === 'assistant-v2-rules-fallback').length,
      rulesOnlyResponses: chatEvents.filter((event) => event.provider === 'assistant-v2-rules').length,
      routeCounts: countBy(chatEvents, 'route'),
      intentCounts: countBy(chatEvents, 'intent'),
      averageLatencyMs: chatEvents.length ? Math.round(totalLatency / chatEvents.length) : 0,
    },
    conversions: {
      actionOpens: conversionEvents.length,
      routeCounts: countBy(conversionEvents, 'route'),
      sourceCounts: countBy(conversionEvents, 'source'),
      appointmentSubmissions: appointmentEvents.length,
    },
    engagement: {
      launcherOpens: openEvents.length,
      quickReplyClicks: quickReplyEvents.length,
      quickReplyLabels: countBy(quickReplyEvents, 'label'),
      briefResets: resetEvents.length,
    },
  };
}

module.exports = {
  EVENTS_FILE,
  ensureTelemetryStore,
  recordAssistantV2Event,
  getAssistantV2TelemetrySummary,
};
