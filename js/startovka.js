(function () {
  var apiUrl = "/api/startovka";
  var root = document.getElementById("startovka-live");

  function clear(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
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
    clear(root);
    appendText("p", className || "lead", message, root);
  }

  function getFlagEmoji(countryCode) {
    var code = String(countryCode || "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) {
      return "";
    }

    return code.replace(/./g, function (letter) {
      return String.fromCodePoint(127397 + letter.charCodeAt(0));
    });
  }

  function renderCountryCell(team, row) {
    var cell = document.createElement("td");
    var country = String(team.country || "")
      .trim()
      .toUpperCase();
    var flag = getFlagEmoji(country);

    if (!country) {
      cell.textContent = "-";
      row.appendChild(cell);
      return;
    }

    var countryElement = document.createElement("span");
    countryElement.className = "country-code";
    countryElement.textContent = flag ? flag + " " + country : country;
    countryElement.title = country;
    cell.appendChild(countryElement);
    row.appendChild(cell);
  }

  function getCaesStatus(value) {
    if (value === "Je členem ČAES") {
      return {
        className: "caes-member",
        title: "Je členem ČAES",
      };
    }

    if (value === "Není členem ČAES a chce se stát [ zdarma ]") {
      return {
        className: "caes-pending",
        title: "Stane se členem ČAES v den závodu",
      };
    }

    return null;
  }

  function createCaesIcon(caesMembership) {
    var status = getCaesStatus(caesMembership);
    if (!status) {
      return null;
    }

    var icon = document.createElement("img");
    icon.className = "caes-icon " + status.className;
    icon.src = "images/caes-small-logo.png";
    icon.alt = "ČAES";
    icon.title = status.title;
    return icon;
  }

  function renderRacerCell(name, row) {
    var cell = document.createElement("td");
    var racer = document.createElement("span");
    racer.className = "racer-name";
    racer.textContent = name || "-";
    cell.appendChild(racer);
    row.appendChild(cell);
  }

  function renderCaesCell(team, row) {
    var cell = document.createElement("td");
    cell.className = "caes-cell";

    var captainIcon = createCaesIcon(team.captainCaesMembership);
    var memberTwoIcon = createCaesIcon(team.memberTwoCaesMembership);

    if (captainIcon) {
      cell.appendChild(captainIcon);
    }

    if (memberTwoIcon) {
      cell.appendChild(memberTwoIcon);
    }

    if (!captainIcon && !memberTwoIcon) {
      cell.textContent = "-";
    }

    row.appendChild(cell);
  }

  function renderPaidCell(team, row) {
    var cell = document.createElement("td");
    var status = document.createElement("span");
    status.className = team.paid
      ? "payment-status paid"
      : "payment-status unpaid";
    status.textContent = team.paid ? "\u2713" : "-";
    status.title = team.paid ? "Zaplaceno" : "Nezaplaceno";
    status.setAttribute("aria-label", status.title);
    cell.appendChild(status);
    row.appendChild(cell);
  }

  function formatCategory(category) {
    var categories = {
      men: "muži",
      women: "ženy",
      mix: "mix",
    };

    return categories[category] || category || "-";
  }

  function renderTable(subrace) {
    var section = document.createElement("div");
    section.className = "startovka-race";

    appendText("h4", null, subrace.subraceName, section);

    if (!subrace.teams.length) {
      appendText("p", "lead", "Zatím nejsou přihlášené žádné týmy.", section);
      return section;
    }

    var tableWrap = document.createElement("div");
    tableWrap.className = "startovka-table-wrap";

    var table = document.createElement("table");
    table.className = "startovka-table";

    var thead = document.createElement("thead");
    var headerRow = document.createElement("tr");
    [
      "Tým",
      "Kategorie",
      "Kapitán",
      "Druhý závodník",
      "ČAES",
      "Klub",
      "Zaplaceno",
    ].forEach(function (label) {
      appendText("th", null, label, headerRow);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    subrace.teams.forEach(function (team) {
      var row = document.createElement("tr");
      appendText("td", null, team.teamName || "-", row);
      appendText("td", null, formatCategory(team.category), row);
      renderRacerCell(team.captainName, row);
      renderRacerCell(team.memberTwoName, row);
      renderCaesCell(team, row);
      // renderCountryCell(team, row); // todo: next year
      appendText("td", null, team.club || "-", row);
      renderPaidCell(team, row);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);

    tableWrap.appendChild(table);
    section.appendChild(tableWrap);
    return section;
  }

  function renderStartLists(data) {
    clear(root);
    root.appendChild(renderTable(data.subraces.endurance));
    root.appendChild(renderTable(data.subraces.sprint));
  }

  if (!root) {
    return;
  }

  renderStatus("Načítám startovní listinu...", "lead");

  fetch(apiUrl, { cache: "no-cache" })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Startovní listina se nepodařila načíst.");
      }
      return response.json();
    })
    .then(renderStartLists)
    .catch(function () {
      renderStatus(
        "Startovní listina se teď nepodařila načíst. Zkuste to prosím později.",
        "lead",
      );
    });
})();
