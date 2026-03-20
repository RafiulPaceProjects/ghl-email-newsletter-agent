import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = "https://services.leadconnectorhq.com";
const API_VERSION = "2021-07-28";

const currentDir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(currentDir, "../../authentication-ghl/.env");
const injectionOutputDir = resolve(currentDir, "../inject-content/injection-output");

const FALLBACK_FROM_NAME = "NYC Policy Scope";
const FALLBACK_SUBJECT_LINE = "Weekly Newsletter Update";
const FALLBACK_PREVIEW_TEXT = "Your latest updates are ready.";

function parseEnv(text) {
  const map = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    map[key] = value.replace(/^['"]|['"]$/g, "");
  }
  return map;
}

function formatStamp(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm} UTC`;
}

async function findLatestInjectedHtml() {
  const entries = await readdir(injectionOutputDir, { withFileTypes: true });
  const htmlFiles = entries
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".html")
    .map((entry) => entry.name);

  if (htmlFiles.length === 0) {
    throw new Error(`No injected HTML files found in ${injectionOutputDir}`);
  }

  const withTimes = await Promise.all(
    htmlFiles.map(async (name) => {
      const path = resolve(injectionOutputDir, name);
      const fileStat = await stat(path);
      return { name, path, mtimeMs: fileStat.mtimeMs };
    })
  );

  withTimes.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return withTimes[0];
}

async function callApi(url, token, method, body) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Version: API_VERSION,
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(12000)
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return { ok: response.ok, status: response.status, data };
}

async function cleanupTemplate({ token, locationId, templateId }) {
  if (!templateId) {
    return {
      attempted: false,
      ok: false,
      status: null,
      data: { message: "No templateId provided for cleanup." }
    };
  }

  const result = await callApi(
    `${BASE_URL}/emails/builder/${locationId}/${templateId}`,
    token,
    "DELETE"
  );

  return {
    attempted: true,
    ok: result.ok,
    status: result.status,
    data: result.data
  };
}

async function verifyTemplateName({ token, locationId, templateId }) {
  const fetchList = await callApi(
    `${BASE_URL}/emails/builder?locationId=${encodeURIComponent(locationId)}&limit=200`,
    token,
    "GET"
  );

  if (!fetchList.ok) {
    return {
      ok: false,
      status: fetchList.status,
      verifiedName: null,
      template: null,
      data: fetchList.data
    };
  }

  const builders = Array.isArray(fetchList.data?.builders)
    ? fetchList.data.builders
    : [];
  const hit = builders.find((builder) => builder?.id === templateId) || null;

  return {
    ok: true,
    status: fetchList.status,
    verifiedName: hit?.name ?? null,
    template: hit,
    data: fetchList.data
  };
}

function failResult({
  message,
  failureStage,
  locationId,
  templateId = null,
  requestedName = null,
  verifiedName = null,
  createStatus = null,
  updateStatus = null,
  patchStatus = null,
  verifyStatus = null,
  cleanup = null,
  details = null
}) {
  return {
    ok: false,
    message,
    failureStage,
    locationId,
    templateId,
    requestedName,
    verifiedName,
    createStatus,
    updateStatus,
    patchStatus,
    verifyStatus,
    cleanup,
    details
  };
}

async function main() {
  const envRaw = await readFile(envPath, "utf-8");
  const env = parseEnv(envRaw);
  const token = env.GHL_PRIVATE_INTEGRATION_TOKEN || process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  const locationId = env.GHL_LOCATION_ID || process.env.GHL_LOCATION_ID;

  if (!token || !locationId) {
    throw new Error("Missing GHL_PRIVATE_INTEGRATION_TOKEN or GHL_LOCATION_ID.");
  }

  const latestInjected = await findLatestInjectedHtml();
  const injectedHtml = await readFile(latestInjected.path, "utf-8");

  const requestedName = `Draft | NYCPolicyScopeBase | Injected | ${formatStamp()}`;

  let templateId = null;
  const create = await callApi(
    `${BASE_URL}/emails/builder`,
    token,
    "POST",
    {
      name: requestedName,
      locationId,
      type: "html"
    }
  );

  if (!create.ok) {
    process.stdout.write(
      `${JSON.stringify(
        failResult({
          message: `Create draft failed (${create.status}).`,
          failureStage: "create",
          locationId,
          requestedName,
          createStatus: create.status,
          details: create.data
        }),
        null,
        2
      )}\n`
    );
    process.exitCode = 1;
    return;
  }

  templateId = create.data?.id || create.data?.redirect;
  if (!templateId) {
    process.stdout.write(
      `${JSON.stringify(
        failResult({
          message: "Create draft response missing template id.",
          failureStage: "create",
          locationId,
          requestedName,
          createStatus: create.status,
          details: create.data
        }),
        null,
        2
      )}\n`
    );
    process.exitCode = 1;
    return;
  }

  const update = await callApi(
    `${BASE_URL}/emails/builder/data`,
    token,
    "POST",
    {
      locationId,
      templateId,
      html: injectedHtml,
      editorType: "html",
      updatedBy: "Codex Draft Publisher"
    }
  );

  if (!update.ok) {
    const cleanup = await cleanupTemplate({ token, locationId, templateId });
    process.stdout.write(
      `${JSON.stringify(
        failResult({
          message: `Update draft content failed (${update.status}).`,
          failureStage: "updateHtml",
          locationId,
          templateId,
          requestedName,
          createStatus: create.status,
          updateStatus: update.status,
          cleanup,
          details: update.data
        }),
        null,
        2
      )}\n`
    );
    process.exitCode = 1;
    return;
  }

  const patchRename = await callApi(
    `${BASE_URL}/emails/builder/${templateId}`,
    token,
    "PATCH",
    {
      locationId,
      name: requestedName,
      fromName: FALLBACK_FROM_NAME,
      subjectLine: FALLBACK_SUBJECT_LINE,
      previewText: FALLBACK_PREVIEW_TEXT
    }
  );

  if (!patchRename.ok) {
    const cleanup = await cleanupTemplate({ token, locationId, templateId });
    process.stdout.write(
      `${JSON.stringify(
        failResult({
          message: `Rename patch failed (${patchRename.status}).`,
          failureStage: "patchRename",
          locationId,
          templateId,
          requestedName,
          createStatus: create.status,
          updateStatus: update.status,
          patchStatus: patchRename.status,
          cleanup,
          details: patchRename.data
        }),
        null,
        2
      )}\n`
    );
    process.exitCode = 1;
    return;
  }

  const verify = await verifyTemplateName({ token, locationId, templateId });
  if (!verify.ok) {
    const cleanup = await cleanupTemplate({ token, locationId, templateId });
    process.stdout.write(
      `${JSON.stringify(
        failResult({
          message: `Name verification fetch failed (${verify.status}).`,
          failureStage: "verifyName",
          locationId,
          templateId,
          requestedName,
          createStatus: create.status,
          updateStatus: update.status,
          patchStatus: patchRename.status,
          verifyStatus: verify.status,
          cleanup,
          details: verify.data
        }),
        null,
        2
      )}\n`
    );
    process.exitCode = 1;
    return;
  }

  const verifiedName = verify.verifiedName;
  if (!verifiedName || verifiedName !== requestedName) {
    const cleanup = await cleanupTemplate({ token, locationId, templateId });
    process.stdout.write(
      `${JSON.stringify(
        failResult({
          message: "Template name was not persisted exactly in GHL UI.",
          failureStage: "verifyName",
          locationId,
          templateId,
          requestedName,
          verifiedName,
          createStatus: create.status,
          updateStatus: update.status,
          patchStatus: patchRename.status,
          verifyStatus: verify.status,
          cleanup,
          details: verify.template
        }),
        null,
        2
      )}\n`
    );
    process.exitCode = 1;
    return;
  }

  const result = {
    ok: true,
    locationId,
    templateId,
    requestedName,
    verifiedName,
    createStatus: create.status,
    updateStatus: update.status,
    patchStatus: patchRename.status,
    verifyStatus: verify.status,
    sourceInjectedHtml: latestInjected.path,
    failureStage: null,
    previewUrl: update.data?.previewUrl ?? null,
    templateDataDownloadUrl: update.data?.templateDataDownloadUrl ?? null
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unknown clone-content error"
      },
      null,
      2
    )}\n`
  );
  process.exitCode = 1;
});
