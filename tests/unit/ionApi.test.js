import { getMe, listAssets, getAsset, getAssetEndpoint } from "../../src/utils/ionApi.js";

var TEST_TOKEN = "test-ion-token-abc123";

function makeOkFetch(data) {
  return vi.fn(function() {
    return Promise.resolve({ ok: true, json: function() { return Promise.resolve(data); } });
  });
}

function makeErrorFetch(status) {
  return vi.fn(function() {
    return Promise.resolve({ ok: false, status: status });
  });
}

function makeNetworkErrorFetch() {
  return vi.fn(function() {
    return Promise.reject(new Error("Network failure"));
  });
}

describe("ionApi — auth", function() {
  it("rejects all functions when token is not set", async function() {
    vi.stubEnv("VITE_CESIUM_ION_TOKEN", "");
    var fn = makeOkFetch({});
    await expect(getMe(fn)).rejects.toThrow("VITE_CESIUM_ION_TOKEN is not set");
    await expect(listAssets({}, fn)).rejects.toThrow("VITE_CESIUM_ION_TOKEN is not set");
    await expect(getAsset(1, fn)).rejects.toThrow("VITE_CESIUM_ION_TOKEN is not set");
    await expect(getAssetEndpoint(1, fn)).rejects.toThrow("VITE_CESIUM_ION_TOKEN is not set");
    vi.unstubAllEnvs();
  });

  it("sends Authorization: Bearer header with the token", async function() {
    vi.stubEnv("VITE_CESIUM_ION_TOKEN", TEST_TOKEN);
    var fn = makeOkFetch({ username: "user" });
    await getMe(fn);
    expect(fn).toHaveBeenCalledWith(
      expect.stringContaining("/v1/me"),
      expect.objectContaining({ headers: expect.objectContaining({ "Authorization": "Bearer " + TEST_TOKEN }) })
    );
    vi.unstubAllEnvs();
  });
});

describe("getMe", function() {
  beforeEach(function() { vi.stubEnv("VITE_CESIUM_ION_TOKEN", TEST_TOKEN); });
  afterEach(function() { vi.unstubAllEnvs(); });

  it("calls GET /v1/me and returns parsed JSON", async function() {
    var data = { id: 42, username: "testuser", email: "test@example.com" };
    var fn = makeOkFetch(data);
    var result = await getMe(fn);
    expect(result).toEqual(data);
    expect(fn).toHaveBeenCalledWith("https://api.cesium.com/v1/me", expect.any(Object));
  });

  it("throws on non-ok response", async function() {
    await expect(getMe(makeErrorFetch(401))).rejects.toThrow("Ion API HTTP 401");
  });

  it("propagates network errors", async function() {
    await expect(getMe(makeNetworkErrorFetch())).rejects.toThrow("Network failure");
  });
});

describe("listAssets", function() {
  beforeEach(function() { vi.stubEnv("VITE_CESIUM_ION_TOKEN", TEST_TOKEN); });
  afterEach(function() { vi.unstubAllEnvs(); });

  it("calls GET /v1/assets with no query string when params is empty", async function() {
    var data = { items: [], nextPage: null };
    var fn = makeOkFetch(data);
    var result = await listAssets({}, fn);
    expect(result).toEqual(data);
    expect(fn).toHaveBeenCalledWith("https://api.cesium.com/v1/assets", expect.any(Object));
  });

  it("appends query string for provided params", async function() {
    var fn = makeOkFetch({ items: [] });
    await listAssets({ search: "terrain", type: "TERRAIN", limit: 10 }, fn);
    var calledUrl = fn.mock.calls[0][0];
    expect(calledUrl).toContain("search=terrain");
    expect(calledUrl).toContain("type=TERRAIN");
    expect(calledUrl).toContain("limit=10");
  });

  it("omits null/undefined params from query string", async function() {
    var fn = makeOkFetch({ items: [] });
    await listAssets({ search: "foo", page: null, limit: undefined }, fn);
    var calledUrl = fn.mock.calls[0][0];
    expect(calledUrl).toContain("search=foo");
    expect(calledUrl).not.toContain("page=");
    expect(calledUrl).not.toContain("limit=");
  });

  it("works with no params argument", async function() {
    var fn = makeOkFetch({ items: [] });
    await listAssets(undefined, fn);
    expect(fn).toHaveBeenCalledWith("https://api.cesium.com/v1/assets", expect.any(Object));
  });

  it("throws on non-ok response", async function() {
    await expect(listAssets({}, makeErrorFetch(403))).rejects.toThrow("Ion API HTTP 403");
  });
});

describe("getAsset", function() {
  beforeEach(function() { vi.stubEnv("VITE_CESIUM_ION_TOKEN", TEST_TOKEN); });
  afterEach(function() { vi.unstubAllEnvs(); });

  it("calls GET /v1/assets/{id} and returns parsed JSON", async function() {
    var data = { id: 1, name: "Cesium World Terrain", type: "TERRAIN" };
    var fn = makeOkFetch(data);
    var result = await getAsset(1, fn);
    expect(result).toEqual(data);
    expect(fn).toHaveBeenCalledWith("https://api.cesium.com/v1/assets/1", expect.any(Object));
  });

  it("rejects when id is null", async function() {
    var fn = makeOkFetch({});
    await expect(getAsset(null, fn)).rejects.toThrow("getAsset requires an asset id");
  });

  it("rejects when id is undefined", async function() {
    var fn = makeOkFetch({});
    await expect(getAsset(undefined, fn)).rejects.toThrow("getAsset requires an asset id");
  });

  it("throws on non-ok response", async function() {
    await expect(getAsset(999, makeErrorFetch(404))).rejects.toThrow("Ion API HTTP 404");
  });

  it("propagates network errors", async function() {
    await expect(getAsset(1, makeNetworkErrorFetch())).rejects.toThrow("Network failure");
  });
});

describe("getAssetEndpoint", function() {
  beforeEach(function() { vi.stubEnv("VITE_CESIUM_ION_TOKEN", TEST_TOKEN); });
  afterEach(function() { vi.unstubAllEnvs(); });

  it("calls GET /v1/assets/{id}/endpoint and returns parsed JSON", async function() {
    var data = { url: "https://assets.cesium.com/1/", accessToken: "ephemeral-token" };
    var fn = makeOkFetch(data);
    var result = await getAssetEndpoint(1, fn);
    expect(result).toEqual(data);
    expect(fn).toHaveBeenCalledWith("https://api.cesium.com/v1/assets/1/endpoint", expect.any(Object));
  });

  it("rejects when id is null", async function() {
    await expect(getAssetEndpoint(null, makeOkFetch({}))).rejects.toThrow("getAssetEndpoint requires an asset id");
  });

  it("rejects when id is undefined", async function() {
    await expect(getAssetEndpoint(undefined, makeOkFetch({}))).rejects.toThrow("getAssetEndpoint requires an asset id");
  });

  it("throws on non-ok response", async function() {
    await expect(getAssetEndpoint(1, makeErrorFetch(500))).rejects.toThrow("Ion API HTTP 500");
  });

  it("propagates network errors", async function() {
    await expect(getAssetEndpoint(1, makeNetworkErrorFetch())).rejects.toThrow("Network failure");
  });
});
