// Posts the next unposted item in posts.json to Threads, then marks it posted.
// Requires env vars: THREADS_ACCESS_TOKEN, THREADS_USER_ID
// Node 20+ (has native fetch) — GitHub Actions ubuntu-latest ships Node 20.

const fs = require("fs");
const path = require("path");

const POSTS_PATH = path.join(__dirname, "..", "posts.json");
const API_BASE = "https://graph.threads.net/v1.0";

const ACCESS_TOKEN = process.env.THREADS_ACCESS_TOKEN;
const USER_ID = process.env.THREADS_USER_ID;

function loadPosts() {
  const raw = fs.readFileSync(POSTS_PATH, "utf8");
  return JSON.parse(raw);
}

function savePosts(posts) {
  fs.writeFileSync(POSTS_PATH, JSON.stringify(posts, null, 2) + "\n");
}

async function createContainer(text) {
  const url = `${API_BASE}/${USER_ID}/threads?media_type=TEXT&text=${encodeURIComponent(
    text
  )}&access_token=${ACCESS_TOKEN}`;
  const res = await fetch(url, { method: "POST" });
  const data = await res.json();
  if (!res.ok || !data.id) {
    throw new Error(`Container creation failed: ${JSON.stringify(data)}`);
  }
  return data.id;
}

async function publishContainer(creationId) {
  const url = `${API_BASE}/${USER_ID}/threads_publish?creation_id=${creationId}&access_token=${ACCESS_TOKEN}`;
  const res = await fetch(url, { method: "POST" });
  const data = await res.json();
  if (!res.ok || !data.id) {
    throw new Error(`Publish failed: ${JSON.stringify(data)}`);
  }
  return data.id;
}

async function main() {
  if (!ACCESS_TOKEN || !USER_ID) {
    console.error(
      "Missing THREADS_ACCESS_TOKEN or THREADS_USER_ID environment variables."
    );
    process.exit(1);
  }

  const posts = loadPosts();
  const next = posts.find((p) => !p.posted);

  if (!next) {
    console.log("Queue is empty — nothing to post. Add more items to posts.json.");
    return;
  }

  console.log(`Posting item ${next.id}: "${next.text.slice(0, 60)}..."`);

  const creationId = await createContainer(next.text);
  // Brief pause recommended between container creation and publish
  await new Promise((r) => setTimeout(r, 10000));
  const threadId = await publishContainer(creationId);

  next.posted = true;
  next.postedAt = new Date().toISOString();
  next.threadId = threadId;

  savePosts(posts);
  console.log(`Posted successfully. Thread ID: ${threadId}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
