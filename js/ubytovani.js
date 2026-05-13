(function () {
  var dataUrl = "files/2026-ubytovane-tymy.json";
  var form = document.getElementById("ubytovani-search-form");
  var input = document.getElementById("ubytovani-search");
  var results = document.getElementById("ubytovani-results");
  var teams = null;

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function formatDate(value) {
    var parts = String(value || "").match(
      /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/
    );

    if (!parts) {
      return value;
    }

    return parts[3] + ". " + parts[2] + ". " + parts[1] + " " + parts[4] + ":" + parts[5];
  }

  function clearResults() {
    while (results.firstChild) {
      results.removeChild(results.firstChild);
    }
  }

  function appendText(tagName, className, text, parent) {
    var element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    element.textContent = text;
    parent.appendChild(element);
    return element;
  }

  function renderStatus(message, className) {
    clearResults();
    appendText("p", className || "lead", message, results);
  }

  function renderMatches(matches) {
    clearResults();
    appendText(
      "p",
      "lead ubytovani-success",
      "Ubytování pro vás máme zajištěné.",
      results
    );

    matches.forEach(function (team) {
      var card = document.createElement("div");
      card.className = "ubytovani-result";

      appendText("h5", null, team.teamName, card);
      appendText("p", null, "Kategorie: " + team.category, card);
      appendText("p", null, "Datum registrace: " + formatDate(team.registrationDate), card);
      appendText("p", null, "Závodníci: " + team.racers.join(", "), card);

      results.appendChild(card);
    });
  }

  function getSearchText(team) {
    return normalize([team.teamName].concat(team.racers).join(" "));
  }

  function findTeams(query) {
    var normalizedQuery = normalize(query);
    return teams.filter(function (team) {
      return getSearchText(team).indexOf(normalizedQuery) !== -1;
    });
  }

  function loadTeams() {
    if (teams) {
      return Promise.resolve(teams);
    }

    return fetch(dataUrl, { cache: "no-cache" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Data se nepodařilo načíst.");
        }
        return response.json();
      })
      .then(function (data) {
        teams = data;
        return teams;
      });
  }

  if (!form || !input || !results) {
    return;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var query = input.value.trim();
    if (query.length < 2) {
      renderStatus("Zadejte alespoň dvě písmena ze jména nebo názvu týmu.", "lead");
      return;
    }

    renderStatus("Hledám...", "lead");

    loadTeams()
      .then(function () {
        var matches = findTeams(query);
        if (matches.length) {
          renderMatches(matches);
          return;
        }
        renderStatus(
          "Tým jsme v seznamu ubytovaných nenašli. Zkuste prosím celé jméno nebo název týmu.",
          "lead"
        );
      })
      .catch(function () {
        renderStatus(
          "Seznam ubytovaných týmů se nepodařilo načíst. Zkuste to prosím později.",
          "lead"
        );
      });
  });
})();
