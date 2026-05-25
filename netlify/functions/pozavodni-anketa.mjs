import { createSign } from "node:crypto";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const DEFAULT_SERVICE_ACCOUNT_EMAIL =
  "eposurvival-website@oht-personal.iam.gserviceaccount.com";

const RATING_FIELDS = [
  "info_pred",
  "registracni_system",
  "kancelar",
  "info_misto",
  "ubytovani",
  "doprovodne_sluzby",
  "zavod_celkove",
  "discipliny",
  "mapy_trat",
  "bezpecnost",
  "vysledky",
  "program",
  "vyhlaseni",
  "dojem",
  "znovu",
  "doporuceni",
];

const TEXT_FIELDS = [
  "info_pred_poznamka",
  "registracni_system_poznamka",
  "kancelar_poznamka",
  "info_misto_poznamka",
  "ubytovani_poznamka",
  "doprovodne_sluzby_poznamka",
  "zavod_celkove_poznamka",
  "discipliny_poznamka",
  "mapy_trat_poznamka",
  "bezpecnost_poznamka",
  "vysledky_poznamka",
  "program_poznamka",
  "vyhlaseni_poznamka",
  "nejlepsi_disciplina",
  "zmeny_discipliny",
  "napady",
  "vzkaz",
];

function getEnv(name) {
  if (typeof Netlify !== "undefined" && Netlify.env) {
    return Netlify.env.get(name);
  }

  return typeof process !== "undefined" ? process.env[name] : undefined;
}

function jsonResponse(body, init) {
  return new Response(JSON.stringify(body), {
    status: (init && init.status) || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function base64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function normalizePrivateKey(value) {
  return String(value || "").replace(/\\n/g, "\n");
}

function createJwt(clientEmail, privateKey) {
  var now = Math.floor(Date.now() / 1000);
  var header = {
    alg: "RS256",
    typ: "JWT",
  };
  var claimSet = {
    iss: clientEmail,
    scope: GOOGLE_SHEETS_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };
  var unsignedToken =
    base64Url(JSON.stringify(header)) + "." + base64Url(JSON.stringify(claimSet));
  var signature = createSign("RSA-SHA256")
    .update(unsignedToken)
    .sign(privateKey, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return unsignedToken + "." + signature;
}

async function getGoogleAccessToken(clientEmail, privateKey) {
  var assertion = createJwt(clientEmail, privateKey);
  var params = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: assertion,
  });
  var response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error("Google token request failed with status " + response.status);
  }

  var data = await response.json();
  if (!data.access_token) {
    throw new Error("Google token response did not contain access_token.");
  }

  return data.access_token;
}

function getClientIp(req, context) {
  return (
    (context && context.ip) ||
    req.headers.get("x-nf-client-connection-ip") ||
    req.headers.get("x-forwarded-for") ||
    ""
  );
}

function sanitizeText(value, maxLength) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .slice(0, maxLength);
}

function sanitizeBrowserId(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 80);
}

function sanitizePayload(payload) {
  var cleaned = {};
  var errors = [];

  RATING_FIELDS.forEach(function (field) {
    var value = Number(payload[field]);
    if (!Number.isInteger(value) || value < 1 || value > 10) {
      errors.push(field);
      return;
    }

    cleaned[field] = value;
  });

  TEXT_FIELDS.forEach(function (field) {
    cleaned[field] = sanitizeText(payload[field], 4000);
  });

  cleaned.browser_id = sanitizeBrowserId(payload.browser_id);
  cleaned.honeypot = sanitizeText(payload.website, 200);

  return { cleaned: cleaned, errors: errors };
}

function buildRow(cleaned, metadata) {
  return [
    metadata.submittedAt,
    metadata.ip,
    metadata.userAgent,
    metadata.browserId,
    metadata.language,
  ]
    .concat(
      RATING_FIELDS.map(function (field) {
        return cleaned[field];
      })
    )
    .concat(
      TEXT_FIELDS.map(function (field) {
        return cleaned[field];
      })
    );
}

async function appendSurveyRow(row) {
  var spreadsheetId = getEnv("SURVEY_SPREADSHEET_ID");
  var sheetName = getEnv("SURVEY_SHEET_NAME") || "Anketa";
  var clientEmail =
    getEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL") || DEFAULT_SERVICE_ACCOUNT_EMAIL;
  var privateKey = normalizePrivateKey(getEnv("GOOGLE_PRIVATE_KEY"));

  if (!spreadsheetId || !privateKey) {
    throw new Error(
      "Missing SURVEY_SPREADSHEET_ID or GOOGLE_PRIVATE_KEY environment variable."
    );
  }

  var accessToken = await getGoogleAccessToken(clientEmail, privateKey);
  var range = encodeURIComponent(sheetName + "!A:Z");
  var url =
    "https://sheets.googleapis.com/v4/spreadsheets/" +
    encodeURIComponent(spreadsheetId) +
    "/values/" +
    range +
    ":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS";

  var response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [row],
    }),
  });

  if (!response.ok) {
    throw new Error("Google Sheets append failed with status " + response.status);
  }
}

export default async function pozavodniAnketa(req, context) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  var payload;
  try {
    payload = await req.json();
  } catch (error) {
    return jsonResponse({ error: "Invalid JSON payload." }, { status: 400 });
  }

  var result = sanitizePayload(payload || {});
  if (result.cleaned.honeypot) {
    return jsonResponse({ ok: true });
  }

  if (result.errors.length) {
    return jsonResponse(
      { error: "Invalid rating values.", fields: result.errors },
      { status: 400 }
    );
  }

  var metadata = {
    submittedAt: new Date().toISOString(),
    ip: getClientIp(req, context),
    userAgent: sanitizeText(req.headers.get("user-agent"), 1000),
    browserId: result.cleaned.browser_id,
    language: sanitizeText(req.headers.get("accept-language"), 300),
  };

  try {
    await appendSurveyRow(buildRow(result.cleaned, metadata));
  } catch (error) {
    console.error(error);
    return jsonResponse(
      { error: "Survey response could not be saved." },
      { status: 502 }
    );
  }

  return jsonResponse({ ok: true });
}

export const config = {
  path: "/api/pozavodni-anketa",
  method: ["POST", "OPTIONS"],
};
