const RACE_ID = "833";
const START_LISTS_URL =
  "https://www.nazavody.cz/public-api/v1/race/" + RACE_ID + "/start-lists";

const SUBRACES = {
  endurance: { id: 1618, name: "ENDURANCE" },
  sprint: { id: 1619, name: "SPRINT" },
};

function getEnv(name) {
  if (typeof Netlify !== "undefined" && Netlify.env) {
    return Netlify.env.get(name);
  }

  return typeof process !== "undefined" ? process.env[name] : undefined;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getFormValue(form, matcher) {
  var item = form.find(function (formItem) {
    return matcher(formItem);
  });

  return item && item.value ? String(item.value).trim() : "";
}

function getLabelText(formItem) {
  return normalizeText([formItem.group, formItem.label, formItem.type].join(" "));
}

function getNameValues(form) {
  return form
    .filter(function (formItem) {
      var label = getLabelText(formItem);
      return (
        formItem.value &&
        (formItem.type === "name" ||
          /\bjmeno\b|\bname\b/.test(label)) &&
        formItem.type !== "teamname" &&
        label.indexOf("tym") === -1 &&
        label.indexOf("team") === -1
      );
    })
    .map(function (formItem) {
      return String(formItem.value).trim();
    })
    .filter(Boolean);
}

function getCaptainName(form, names) {
  return (
    getFormValue(form, function (formItem) {
      var label = getLabelText(formItem);
      return (
        formItem.value &&
        (formItem.type === "name" || /\bjmeno\b|\bname\b/.test(label)) &&
        (/kapitan|captain|zavodnik 1|clen 1|1\. zavodnik|1\. clen/.test(label) ||
          label.endsWith(" 1"))
      );
    }) ||
    names[0] ||
    ""
  );
}

function getMemberTwoName(form, names) {
  return (
    getFormValue(form, function (formItem) {
      var label = getLabelText(formItem);
      return (
        formItem.value &&
        (formItem.type === "name" || /\bjmeno\b|\bname\b/.test(label)) &&
        (/zavodnik 2|clen 2|2\. zavodnik|2\. clen|member 2/.test(label) ||
          label.endsWith(" 2"))
      );
    }) ||
    names[1] ||
    ""
  );
}

function getCaesMembership(form, matcher) {
  return getFormValue(form, function (formItem) {
    var label = getLabelText(formItem);
    return (
      formItem.value &&
      label.indexOf("caes") !== -1 &&
      matcher(label)
    );
  });
}

function getCaptainCaesMembership(form) {
  return getCaesMembership(form, function (label) {
    return /kapitan|captain|zavodnik 1|clen 1|1\. zavodnik|1\. clen|prvni zavodnik/.test(
      label
    );
  });
}

function getMemberTwoCaesMembership(form) {
  return getCaesMembership(form, function (label) {
    return /zavodnik 2|clen 2|2\. zavodnik|2\. clen|member 2|druhy zavodnik/.test(
      label
    );
  });
}

function normalizeCategory(value) {
  var category = normalizeText(value);

  if (/mix|smis|smisena/.test(category)) {
    return "mix";
  }

  if (/zen|women|female/.test(category)) {
    return "women";
  }

  if (/muz|men|male/.test(category)) {
    return "men";
  }

  return value || "";
}

function sanitizeItem(item) {
  var form = Array.isArray(item.form) ? item.form : [];
  var names = getNameValues(form);
  var teamName =
    getFormValue(form, function (formItem) {
      return formItem.type === "teamname";
    }) ||
    item.teamName ||
    item.name ||
    "";

  return {
    teamName: teamName,
    club: item.club || "",
    captainName: getCaptainName(form, names),
    captainCaesMembership: getCaptainCaesMembership(form),
    memberTwoName: getMemberTwoName(form, names),
    memberTwoCaesMembership: getMemberTwoCaesMembership(form),
    country: item.country || "",
    category: normalizeCategory(item.categoryName),
    paid: Boolean(item.paid),
  };
}

function getSubraceKey(subrace) {
  var id = Number(subrace.subraceId);
  var name = normalizeText(subrace.subraceName);

  if (id === SUBRACES.endurance.id || name.indexOf("endurance") !== -1) {
    return "endurance";
  }

  if (id === SUBRACES.sprint.id || name.indexOf("sprint") !== -1) {
    return "sprint";
  }

  return null;
}

function sanitizeStartLists(data) {
  var result = {
    generatedAt: new Date().toISOString(),
    raceId: Number(RACE_ID),
    subraces: {
      endurance: {
        subraceId: SUBRACES.endurance.id,
        subraceName: SUBRACES.endurance.name,
        teams: [],
      },
      sprint: {
        subraceId: SUBRACES.sprint.id,
        subraceName: SUBRACES.sprint.name,
        teams: [],
      },
    },
  };

  (Array.isArray(data) ? data : []).forEach(function (subrace) {
    var key = getSubraceKey(subrace);
    if (!key) {
      return;
    }

    result.subraces[key] = {
      subraceId: subrace.subraceId || SUBRACES[key].id,
      subraceName: SUBRACES[key].name,
      teams: (Array.isArray(subrace.startlist) ? subrace.startlist : []).map(
        sanitizeItem
      ),
    };
  });

  return result;
}

function jsonResponse(body, init) {
  return new Response(JSON.stringify(body), {
    status: (init && init.status) || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": (init && init.cacheControl) || "public, max-age=60",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export default async function startovka(req) {
  if (req.method !== "GET") {
    return jsonResponse(
      { error: "Method not allowed" },
      { status: 405, cacheControl: "no-store" }
    );
  }

  var apiKey = getEnv("NAZAVODY_API_KEY") || getEnv("API_KEY");
  if (!apiKey) {
    return jsonResponse(
      { error: "Missing NAZAVODY_API_KEY environment variable." },
      { status: 500, cacheControl: "no-store" }
    );
  }

  var response = await fetch(START_LISTS_URL, {
    headers: {
      Accept: "application/json",
      Authorization: "Bearer " + apiKey,
    },
  });

  if (!response.ok) {
    return jsonResponse(
      { error: "Start list source returned " + response.status + "." },
      { status: 502, cacheControl: "no-store" }
    );
  }

  return jsonResponse(sanitizeStartLists(await response.json()));
}

export const config = {
  path: "/api/startovka",
  method: ["GET"],
};
