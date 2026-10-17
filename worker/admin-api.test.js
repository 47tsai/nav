import test from "node:test";
import assert from "node:assert/strict";
import worker from "./admin-api.js";

const origin = "https://nav.chi.qzz.io";
const clientId = "test-client";
const validData = [{ taxonomy: "工具", links: [{ title: "Example", url: "https://example.com", description: "測試" }] }];
const encodedData = btoa(unescape(encodeURIComponent(JSON.stringify(validData))));
const env = { NAV_GITHUB_TOKEN: "test-token", CHI_AUTH_CLIENT_ID: clientId, GITHUB_REPOSITORY: "tsai97216/nav", GITHUB_BRANCH: "main" };

async function withFetch(mock, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = mock;
  try { await fn(); } finally { globalThis.fetch = original; }
}

test("health returns 503 when required configuration is missing", async () => {
  const response = await worker.fetch(new Request("https://api.test/health"), {});
  assert.equal(response.status, 503);
  assert.equal((await response.json()).ok, false);
});

test("health verifies the GitHub data source", async () => {
  await withFetch(async () => new Response(JSON.stringify({
    type: "file", sha: "abc123", content: encodedData
  }), { status: 200 }), async () => {
    const response = await worker.fetch(new Request("https://api.test/health"), env);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.github.ok, true);
    assert.equal(body.github.sites, 1);
  });
});

test("health reports GitHub failures as 503", async () => {
  await withFetch(async () => new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 }), async () => {
    const response = await worker.fetch(new Request("https://api.test/health"), env);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).github.ok, false);
  });
});

test("admin API rejects requests without a bearer token", async () => {
  const response = await worker.fetch(new Request("https://api.test/api/admin/sites", {
    headers: { Origin: origin }
  }), env);
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
});

test("admin API rejects unapproved browser origins", async () => {
  const response = await worker.fetch(new Request("https://api.test/api/admin/sites", {
    headers: { Origin: "https://attacker.example" }
  }), env);
  assert.equal(response.status, 403);
});
