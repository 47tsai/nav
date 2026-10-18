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

test("admin API reports Chi Auth network failures as temporary errors", async () => {
  await withFetch(async () => { throw new TypeError("network unavailable"); }, async () => {
    const response = await worker.fetch(new Request("https://api.test/api/admin/sites", {
      headers: { Origin: origin, Authorization: "Bearer " + "a".repeat(48) }
    }), env);
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /Chi Auth/);
  });
});

test("admin API rejects a valid token belonging to a different account", async () => {
  await withFetch(async () => new Response(JSON.stringify({
    sub: "another-user", aud: clientId
  }), { status: 200, headers: { "Content-Type": "application/json" } }), async () => {
    const response = await worker.fetch(new Request("https://api.test/api/admin/sites", {
      headers: { Origin: origin, Authorization: "Bearer " + "a".repeat(48) }
    }), env);
    assert.equal(response.status, 403);
    assert.match((await response.json()).error, /沒有 NAV 管理權限/);
  });
});

test("admin API rejects a token for a different OAuth client", async () => {
  await withFetch(async () => new Response(JSON.stringify({
    sub: "chi-owner", aud: "different-client"
  }), { status: 200, headers: { "Content-Type": "application/json" } }), async () => {
    const response = await worker.fetch(new Request("https://api.test/api/admin/sites", {
      headers: { Origin: origin, Authorization: "Bearer " + "a".repeat(48) }
    }), env);
    assert.equal(response.status, 403);
  });
});

test("site updates report GitHub read failures as upstream errors", async () => {
  let githubReads = 0;
  const dataWithId = [{ taxonomy: "工具", links: [{
    id: "nav_example", title: "Example", url: "https://example.com", description: "測試"
  }] }];
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(dataWithId))));
  await withFetch(async (input) => {
    const url = String(input);
    if (url.startsWith("https://auth.chi.qzz.io/")) {
      return new Response(JSON.stringify({ sub: "chi-owner", aud: clientId }), {
        status: 200, headers: { "Content-Type": "application/json" }
      });
    }
    githubReads++;
    if (githubReads === 1) {
      return new Response(JSON.stringify({ type: "file", sha: "abc123", content: encoded }), {
        status: 200, headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ message: "Service Unavailable" }), { status: 503 });
  }, async () => {
    const response = await worker.fetch(new Request("https://api.test/api/admin/sites/nav_example", {
      method: "PUT",
      headers: {
        Origin: origin,
        Authorization: "Bearer " + "a".repeat(48),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: "Example Updated", url: "https://example.com", description: "測試",
        taxonomy: "工具", subcategory: ""
      })
    }), env);
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /GitHub 讀取失敗/);
  });
});

test("site creation refuses to overwrite data changed after the initial read", async () => {
  let githubReads = 0, githubWrites = 0;
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(validData))));
  await withFetch(async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith("https://auth.chi.qzz.io/")) {
      return new Response(JSON.stringify({ sub: "chi-owner", aud: clientId }), {
        status: 200, headers: { "Content-Type": "application/json" }
      });
    }
    if (init.method === "PUT") {
      githubWrites++;
      return new Response(JSON.stringify({ message: "unexpected write" }), { status: 500 });
    }
    githubReads++;
    return new Response(JSON.stringify({
      type: "file",
      sha: githubReads === 1 ? "initial-sha" : "changed-sha",
      content: encoded
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }, async () => {
    const response = await worker.fetch(new Request("https://api.test/api/admin/sites", {
      method: "POST",
      headers: {
        Origin: origin,
        Authorization: "Bearer " + "a".repeat(48),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: "New Example", url: "https://new-example.com", description: "測試",
        taxonomy: "工具", subcategory: ""
      })
    }), env);
    const body = await response.json();
    assert.equal(response.status, 409);
    assert.equal(body.code, "DATA_CONFLICT");
    assert.equal(githubReads, 2);
    assert.equal(githubWrites, 0);
  });
});

test("site creation maps GitHub content-write conflicts to DATA_CONFLICT", async () => {
  for (const status of [409, 422]) {
    let githubReads = 0;
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(validData))));
    await withFetch(async (input, init = {}) => {
      const url = String(input);
      if (url.startsWith("https://auth.chi.qzz.io/")) {
        return new Response(JSON.stringify({ sub: "chi-owner", aud: clientId }), {
          status: 200, headers: { "Content-Type": "application/json" }
        });
      }
      if (init.method === "PUT") {
        return new Response(JSON.stringify({ message: "sha conflict" }), { status });
      }
      githubReads++;
      return new Response(JSON.stringify({
        type: "file", sha: "stable-sha", content: encoded
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }, async () => {
      const response = await worker.fetch(new Request("https://api.test/api/admin/sites", {
        method: "POST",
        headers: {
          Origin: origin,
          Authorization: "Bearer " + "a".repeat(48),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: "New Example", url: "https://new-example.com", description: "測試",
          taxonomy: "工具", subcategory: ""
        })
      }), env);
      const body = await response.json();
      assert.equal(response.status, 409, "GitHub HTTP " + status);
      assert.equal(body.code, "DATA_CONFLICT", "GitHub HTTP " + status);
      assert.equal(githubReads, 2);
    });
  }
});

test("site updates and deletes reject a stale client data revision before writing", async () => {
  const dataWithId = [{
    taxonomy: "工具",
    links: [{ id: "nav_example", title: "Example", url: "https://example.com", description: "測試" }]
  }];
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(dataWithId))));
  for (const method of ["PUT", "DELETE"]) {
    let githubWrites = 0;
    await withFetch(async (input, init = {}) => {
      const url = String(input);
      if (url.startsWith("https://auth.chi.qzz.io/")) {
        return new Response(JSON.stringify({ sub: "chi-owner", aud: clientId }), {
          status: 200, headers: { "Content-Type": "application/json" }
        });
      }
      if (init.method === "PUT") {
        githubWrites++;
        return new Response(JSON.stringify({ message: "unexpected write" }), { status: 500 });
      }
      return new Response(JSON.stringify({
        type: "file", sha: "current-sha", content: encoded
      }), { status: 200 });
    }, async () => {
      const headers = {
        Origin: origin,
        Authorization: "Bearer " + "a".repeat(48),
        "If-Match": "stale-sha"
      };
      if (method === "PUT") headers["Content-Type"] = "application/json";
      const response = await worker.fetch(new Request("https://api.test/api/admin/sites/nav_example", {
        method, headers,
        ...(method === "PUT" ? { body: JSON.stringify({
          title: "Example Updated", url: "https://example.com", description: "測試",
          taxonomy: "工具", subcategory: ""
        }) } : {})
      }), env);
      const body = await response.json();
      assert.equal(response.status, 409, method + " must reject stale data");
      assert.equal(body.code, "DATA_CONFLICT", method);
      assert.equal(githubWrites, 0, method + " must not write");
    });
  }
});

test("health rejects a dataset containing duplicate site IDs", async () => {
  const duplicateData = [{
    taxonomy: "工具",
    links: [
      { id: "nav_duplicate", title: "First", url: "https://first.example", description: "" },
      { id: "nav_duplicate", title: "Second", url: "https://second.example", description: "" }
    ]
  }];
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(duplicateData))));
  await withFetch(async () => new Response(JSON.stringify({
    type: "file", sha: "duplicate-sha", content: encoded
  }), { status: 200 }), async () => {
    const response = await worker.fetch(new Request("https://api.test/health"), env);
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(body.ok, false);
    assert.equal(body.github.ok, false);
  });
});

test("site creation rejects a stale client data revision before writing", async () => {
  let githubWrites = 0;
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(validData))));
  await withFetch(async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith("https://auth.chi.qzz.io/")) {
      return new Response(JSON.stringify({ sub: "chi-owner", aud: clientId }), {
        status: 200, headers: { "Content-Type": "application/json" }
      });
    }
    if (init.method === "PUT") {
      githubWrites++;
      return new Response(JSON.stringify({ message: "unexpected write" }), { status: 500 });
    }
    return new Response(JSON.stringify({
      type: "file", sha: "current-sha", content: encoded
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }, async () => {
    const response = await worker.fetch(new Request("https://api.test/api/admin/sites", {
      method: "POST",
      headers: {
        Origin: origin,
        Authorization: "Bearer " + "a".repeat(48),
        "Content-Type": "application/json",
        "If-Match": "stale-sha"
      },
      body: JSON.stringify({
        title: "New Example", url: "https://new-example.com", description: "測試",
        taxonomy: "工具", subcategory: ""
      })
    }), env);
    const body = await response.json();
    assert.equal(response.status, 409);
    assert.equal(body.code, "DATA_CONFLICT");
    assert.equal(githubWrites, 0);
  });
});



test("site creation reports GitHub network outages as upstream errors", async () => {
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(validData))));
  let githubReads = 0;
  await withFetch(async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith("https://auth.chi.qzz.io/")) {
      return new Response(JSON.stringify({ sub: "chi-owner", aud: clientId }), {
        status: 200, headers: { "Content-Type": "application/json" }
      });
    }
    if (init.method === "PUT") throw new TypeError("connect ECONNRESET");
    githubReads++;
    return new Response(JSON.stringify({
      type: "file", sha: "stable-sha", content: encoded
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }, async () => {
    const response = await worker.fetch(new Request("https://api.test/api/admin/sites", {
      method: "POST",
      headers: {
        Origin: origin,
        Authorization: "Bearer " + "a".repeat(48),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: "New Example", url: "https://new-example.com", description: "測試",
        taxonomy: "工具", subcategory: ""
      })
    }), env);
    const body = await response.json();
    assert.equal(response.status, 502);
    assert.match(body.error, /GitHub 連線失敗/);
    assert.equal(githubReads, 2);
  });
});
