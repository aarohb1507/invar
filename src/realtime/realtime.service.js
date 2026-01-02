import { redis } from "../redis/redis.client.js";

const CHANNEL = "invar:live";
const clients = new Map();
let nextId = 1;
let subscriber;

export function addClient(res) {
  const id = nextId++;

  // SSE headers
  res.writeHead(200, {
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
  });

  // Send a comment to establish the stream
  res.write(`: connected\n\n`);

  clients.set(id, res);

  // Remove client on close
  reqCloseHandler(res, id);

  return id;
}

function reqCloseHandler(res, id) {
  const onClose = () => {
    clients.delete(id);
    res.end();
  };
  res.on("close", onClose);
  res.on("finish", onClose);
}

export function sendEvent(payload) {
  const data = typeof payload === "string" ? payload : JSON.stringify(payload);
  for (const [, res] of clients) {
    try {
      res.write(`data: ${data}\n\n`);
    } catch (err) {
      // ignore write errors per-client
    }
  }
}

export async function startRealtime() {
  try {
    subscriber = redis.duplicate();
    await subscriber.connect();

    await subscriber.subscribe(CHANNEL, (message, channel) => {
      try {
        const parsed = JSON.parse(message);
        sendEvent(parsed);
      } catch (err) {
        sendEvent(message);
      }
    });

    console.log(`[realtime] subscribed to ${CHANNEL}`);
  } catch (err) {
    console.error("[realtime] failed to start subscriber:", err.message);
  }
}

export function stopRealtime() {
  if (subscriber) subscriber.quit().catch(() => {});
  for (const [, res] of clients) {
    try { res.end(); } catch {};
  }
  clients.clear();
}
