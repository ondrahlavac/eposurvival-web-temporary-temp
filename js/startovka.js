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

  function renderRacerCell(name, caesMembership, row) {
    var cell = document.createElement("td");
    var racer = document.createElement("span");
    racer.className = "racer-name";
    racer.textContent = name || "-";
    cell.appendChild(racer);

    var status = getCaesStatus(caesMembership);
    if (status) {
      var icon = document.createElement("img");
      icon.className = "caes-icon " + status.className;
      icon.src = "images/partneri/logo-caes-bez_odkazu.svg";
      icon.alt = "ČAES";
      icon.title = status.title;
      cell.appendChild(icon);
    }

    row.appendChild(cell);
  }

  function appendCaesIndicator(label, membership, parent) {
    var status = getCaesStatus(membership);
    if (!status) {
      return false;
    }

    var item = document.createElement("span");
    item.className = "caes-indicator";
    item.title = label + ": " + status.title;

    var text = document.createElement("span");
    text.className = "caes-indicator-label";
    text.textContent = label;
    item.appendChild(text);

    var icon = document.createElement("img");
    icon.className = "caes-icon " + status.className;
    icon.src = "images/partneri/logo-caes-bez_odkazu.svg";
    icon.alt = "ČAES";
    item.appendChild(icon);

    parent.appendChild(item);
    return true;
  }

  function renderCaesCell(team, row) {
    var cell = document.createElement("td");
    var hasCaptain = appendCaesIndicator("K", team.captainCaesMembership, cell);
    var hasMemberTwo = appendCaesIndicator(
      "2",
      team.memberTwoCaesMembership,
      cell,
    );

    if (!hasCaptain && !hasMemberTwo) {
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
      "Klub",
      "Kapitán",
      "Druhý člen",
      "ČAES",
      "Země",
      "Kategorie",
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
      appendText("td", null, team.club || "-", row);
      renderRacerCell(team.captainName, team.captainCaesMembership, row);
      renderRacerCell(team.memberTwoName, team.memberTwoCaesMembership, row);
      renderCaesCell(team, row);
      renderCountryCell(team, row);
      appendText("td", null, team.category || "-", row);
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
