/**
 * Cesium Ion REST API client.
 * Base URL: https://api.cesium.com
 * Auth: Bearer token from VITE_CESIUM_ION_TOKEN env var.
 *
 * All functions accept an optional `fetchFn` for test injection.
 */

var ION_API_BASE = "https://api.cesium.com";

function getToken() {
  return (typeof import.meta !== "undefined" && import.meta.env)
    ? import.meta.env.VITE_CESIUM_ION_TOKEN || ""
    : "";
}

function ionFetch(path, options, fetchFn) {
  var token = getToken();
  if (!token) return Promise.reject(new Error("VITE_CESIUM_ION_TOKEN is not set"));
  var fn = fetchFn || fetch;
  var url = ION_API_BASE + path;
  var opts = Object.assign({}, options, {
    headers: Object.assign({ "Authorization": "Bearer " + token }, (options && options.headers) || {}),
  });
  return fn(url, opts).then(function(r) {
    if (!r.ok) throw new Error("Ion API HTTP " + r.status + " for " + url);
    return r.json();
  });
}

/**
 * GET /v1/me — Returns the current user/account info.
 */
function getMe(fetchFn) {
  return ionFetch("/v1/me", {}, fetchFn);
}

/**
 * GET /v1/assets — Lists assets in the Ion account.
 * @param {object} [params] - Optional query params: search, type, page, limit
 */
function listAssets(params, fetchFn) {
  var query = "";
  if (params && typeof params === "object") {
    var parts = Object.keys(params)
      .filter(function(k) { return params[k] != null; })
      .map(function(k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); });
    if (parts.length) query = "?" + parts.join("&");
  }
  return ionFetch("/v1/assets" + query, {}, fetchFn);
}

/**
 * GET /v1/assets/{id} — Returns metadata for a single asset.
 * @param {number|string} id - Ion asset ID
 */
function getAsset(id, fetchFn) {
  if (id == null) return Promise.reject(new Error("getAsset requires an asset id"));
  return ionFetch("/v1/assets/" + id, {}, fetchFn);
}

/**
 * GET /v1/assets/{id}/endpoint — Returns the tile endpoint and ephemeral
 * access token needed to load the asset directly in a Cesium viewer.
 * @param {number|string} id - Ion asset ID
 */
function getAssetEndpoint(id, fetchFn) {
  if (id == null) return Promise.reject(new Error("getAssetEndpoint requires an asset id"));
  return ionFetch("/v1/assets/" + id + "/endpoint", {}, fetchFn);
}

export { getMe, listAssets, getAsset, getAssetEndpoint };
