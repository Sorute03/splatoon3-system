const currentUserId = getCurrentUserId();
let rankingData = null;
let weaponDetails = [];
let weaponNames = [];
let sortState = {
  player: { key: "winRate", asc: false },
  weapon: { key: "winRate", asc: false },
  playerWeapon: { key: "winRate", asc: false },
  xp: { key: "xp", asc: false }
};

function getCurrentUserId() {
  return localStorage.getItem("userId") || "";
}

function getMinValue(id, defaultValue = 0) {
  const el = document.getElementById(id);
  const val = parseInt(el?.value);
  return isNaN(val) ? defaultValue : val;
}

function getTextValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.toLowerCase() : "";
}

function getSelectValue(id, defaultValue = "") {
  const el = document.getElementById(id);
  return el ? el.value : defaultValue;
}

function getMultiSelectValues(id) {
  const select = document.getElementById(id);
  return Array.from(select.selectedOptions).map(opt => opt.value);
}

function isAllSelected(values) {
  return values.length === 0 || values.includes("ALL");
}

async function fetchList(action) {
  const res = await fetch(window.API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: action })
  });
  return await res.json();
}

async function initRankingPage() {
  await initSeasonDropdown();
  setupSortableHeaders();

  const [detailsRaw, namesRaw] = await Promise.all([
    fetchList("getWeaponDetails"),
    fetchList("getWeaponList")
  ]);

  weaponDetails = Array.isArray(detailsRaw) ? detailsRaw : detailsRaw.data || [];
  weaponNames = Array.isArray(namesRaw) ? namesRaw : namesRaw.data || [];

  populateWeaponFilters(weaponDetails, weaponNames);
}

function populateWeaponFilters(details, names) {
  const categories = [...new Set(details.map(w => w.category))].sort();
  const subGenres = [...new Set(details.map(w => w.subgenre))].sort();
  const types = [...new Set(details.map(w => w.type))].sort();

  const fillSelect = (id, values) => {
    const select = document.getElementById(id);
    select.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "ALL";
    select.appendChild(allOption);
    values.forEach(v => {
      const option = document.createElement("option");
      option.value = v;
      option.textContent = v;
      select.appendChild(option);
    });
  };

  const fillMultiSelect = (id, values) => {
    const select = document.getElementById(id);
    select.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "ALL";
    allOption.textContent = "ALL";
    select.appendChild(allOption);
    values.forEach(v => {
      const option = document.createElement("option");
      option.value = v;
      option.textContent = v;
      select.appendChild(option);
    });
  };

  fillSelect("filterCategory", categories);
  fillSelect("filterSubGenre", subGenres);
  fillMultiSelect("filterTypes", types);
  fillMultiSelect("filterWeaponNames", names.sort());

  fillSelect("pwFilterCategory", categories);
  fillSelect("pwFilterSubGenre", subGenres);
  fillMultiSelect("pwFilterTypes", types);
  fillMultiSelect("pwFilterWeaponNames", names.sort());
}

async function initSeasonDropdown() {
  const res = await fetch(window.API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "getRankingIndex" })
  });

  const result = await res.json();
  const index = Array.isArray(result) ? result : result.index || [];

  const select = document.getElementById("seasonSelect");
  index.forEach(season => {
    const option = document.createElement("option");
    option.value = season.seasonId;
    option.textContent = season.name || season.seasonId;
    select.appendChild(option);
  });

  if (index.length > 0) {
    select.value = index[0].seasonId;
    await loadRankingForSeason(index[0].seasonId);
  }

  select.addEventListener("change", async () => {
    await loadRankingForSeason(select.value);
  });
}

async function loadRankingForSeason(seasonId) {
  const res = await fetch(window.API_URL, {
    method: "POST",
    body: JSON.stringify({
      mode: "getRankingData",
      seasonId: seasonId
    }),
    headers: { "Content-Type": "application/json" }
  });
  rankingData = await res.json();
  renderRankingTables();
  showRanking("player");

  document.getElementById("lastUpdated").textContent =
    rankingData.updatedAt ? `最終更新: ${new Date(rankingData.updatedAt).toLocaleString()}` : "";
}

function renderRankingTables() {
  if (!rankingData) return;

  const ruleFilter = getSelectValue("ruleFilter", "ALL");
  const matchTypeFilter = getSelectValue("matchTypeFilter", "ALL");
  const key = `${ruleFilter}|${matchTypeFilter}`;
  const globalXpMin = getMinValue("globalXpMinFilter", 0);

  // プレイヤーランキング
  if (document.getElementById("playerRanking").style.display !== "none") {
    const playerMin = getMinValue("playerMinGames", 5);
    const playerLimit = getMinValue("playerLimitFilter", Infinity);
    const playerNameFilter = getTextValue("playerNameFilter");

    const playerBody = document.querySelector("#playerRankingTable tbody");
    playerBody.innerHTML = "";

    const playerSource = (rankingData.playerRankingByRuleAndType || {})[key] || [];

    const playerSorted = [...playerSource]
      .filter(p => p.total >= playerMin)
      .filter(p => p.playerName.toLowerCase().includes(playerNameFilter))
      .filter(p => {
        const xpEntry = (rankingData.xpRanking || []).find(x => x.playerName === p.playerName);
        return !xpEntry || xpEntry.xp >= globalXpMin;
      })
      .sort(sortBy(sortState.player.key, sortState.player.asc))
      .slice(0, playerLimit);

    playerSorted.forEach((p, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="順位">${i + 1}</td>
        <td data-label="プレイヤー名">${p.playerName}</td>
        <td data-label="勝率">${(p.winRate * 100).toFixed(1)}%</td>
        <td data-label="勝利数">${p.wins}</td>
        <td data-label="試合数">${p.total}</td>
      `;
      playerBody.appendChild(tr);
    });
  }

  // 武器ランキング
  if (document.getElementById("weaponRanking").style.display !== "none") {
    const weaponMin = getMinValue("weaponMinGames", 5);
    const weaponLimit = getMinValue("weaponLimitFilter", Infinity);
    const selectedCategory = getSelectValue("filterCategory");
    const selectedSubGenre = getSelectValue("filterSubGenre");
    const selectedTypes = getMultiSelectValues("filterTypes");
    const selectedNames = getMultiSelectValues("filterWeaponNames").map(n => n.toLowerCase());

    const weaponBody = document.querySelector("#weaponRankingTable tbody");
    weaponBody.innerHTML = "";

    const weaponSource = (rankingData.weaponRankingByRuleAndType || {})[key] || [];

    const weaponSorted = [...weaponSource]
      .filter(w => w.total >= weaponMin)
      .filter(w => {
        const info = weaponDetails.find(d => d.weaponName === w.weapon);
        if (!info) return false;
        const nameMatch = isAllSelected(selectedNames) || selectedNames.includes(w.weapon.toLowerCase());
        const typeMatch = isAllSelected(selectedTypes) || selectedTypes.includes(info.type);
        const categoryMatch = !selectedCategory || info.category === selectedCategory;
        const subGenreMatch = !selectedSubGenre || info.subgenre === selectedSubGenre;
        return nameMatch && typeMatch && categoryMatch && subGenreMatch;
      })
      .sort(sortBy(sortState.weapon.key, sortState.weapon.asc))
      .slice(0, weaponLimit);

    weaponSorted.forEach((w, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="順位">${i + 1}</td>
        <td data-label="武器">${w.weapon}</td>
        <td data-label="勝率">${(w.winRate * 100).toFixed(1)}%</td>
        <td data-label="勝利数">${w.wins}</td>
        <td data-label="試合数">${w.total}</td>
      `;
      weaponBody.appendChild(tr);
    });
  }

  // プレイヤー×武器ランキング
  if (document.getElementById("playerWeaponRanking").style.display !== "none") {
    const pwMin = getMinValue("playerWeaponMinGames", 5);
    const pwLimit = getMinValue("playerWeaponLimitFilter", Infinity);
    const pwNameFilter = getTextValue("playerWeaponNameFilter");
    const pwWeaponText = getTextValue("playerWeaponWeaponFilter");
    const pwSelectedCategory = getSelectValue("pwFilterCategory");
    const pwSelectedSubGenre = getSelectValue("pwFilterSubGenre");
    const pwSelectedTypes = getMultiSelectValues("pwFilterTypes");
    const pwSelectedNames = getMultiSelectValues("pwFilterWeaponNames").map(n => n.toLowerCase());

    const pwBody = document.querySelector("#playerWeaponRankingTable tbody");
    pwBody.innerHTML = "";

    const pwSource = (rankingData.playerWeaponRankingByGroup || {})["ALL|ALL|ALL|ALL|ALL"] || [];

    const pwSorted = [...pwSource]
      .filter(pw => pw.total >= pwMin)
      .filter(pw => pw.playerName.toLowerCase().includes(pwNameFilter))
      .filter(pw => pw.weapon.toLowerCase().includes(pwWeaponText))
      .filter(pw => {
        const info = weaponDetails.find(d => d.weaponName === pw.weapon);
        if (!info) return false;
        const nameMatch = isAllSelected(pwSelectedNames) || pwSelectedNames.includes(pw.weapon.toLowerCase());
        const typeMatch = isAllSelected(pwSelectedTypes) || pwSelectedTypes.includes(info.type);
        const categoryMatch = !pwSelectedCategory || info.category === pwSelectedCategory;
        const subGenreMatch = !pwSelectedSubGenre || info.subgenre === pwSelectedSubGenre;
        return nameMatch && typeMatch && categoryMatch && subGenreMatch;
      })
      .filter(pw => {
        const xpEntry = (rankingData.xpRanking || []).find(x => x.playerName === pw.playerName);
        return !xpEntry || xpEntry.xp >= globalXpMin;
      })
      .sort(sortBy(sortState.playerWeapon.key, sortState.playerWeapon.asc))
      .slice(0, pwLimit);

    pwSorted.forEach((pw, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="順位">${i + 1}</td>
        <td data-label="プレイヤー名">${pw.playerName}</td>
        <td data-label="武器">${pw.weapon}</td>
        <td data-label="勝率">${(pw.winRate * 100).toFixed(1)}%</td>
        <td data-label="勝利数">${pw.wins}</td>
        <td data-label="試合数">${pw.total}</td>
        <td data-label="平均キル">${pw.avgKills?.toFixed(2) ?? "-"}</td>
        <td data-label="平均デス">${pw.avgDeaths?.toFixed(2) ?? "-"}</td>
        <td data-label="K/D比">${pw.kdRatio === Infinity ? "∞" : pw.kdRatio?.toFixed(2) ?? "-"}</td>
        <td data-label="最高キル">${pw.maxKills ?? "-"}</td>
      `;
      pwBody.appendChild(tr);
    });
  }

  // XPランキング
  if (document.getElementById("xpRanking").style.display !== "none") {
    const xpLimit = getMinValue("xpLimitFilter", Infinity);
    const xpNameFilter = getTextValue("xpNameFilter");

    const xpBody = document.querySelector("#xpRankingTable tbody");
    xpBody.innerHTML = "";

    const xpSorted = [...(rankingData.xpRanking || [])]
      .filter(x => x.playerName.toLowerCase().includes(xpNameFilter))
      .sort(sortBy(sortState.xp.key, sortState.xp.asc))
      .slice(0, xpLimit);

    xpSorted.forEach((x, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="順位">${i + 1}</td>
        <td data-label="プレイヤー名">${x.playerName}</td>
        <td data-label="XP">${x.xp}</td>
      `;
      xpBody.appendChild(tr);
    });
  }
}


function sortBy(key, asc) {
  return (a, b) => {
    const valA = typeof a[key] === "string" ? a[key].toLowerCase() : a[key];
    const valB = typeof b[key] === "string" ? b[key].toLowerCase() : b[key];
    if (valA < valB) return asc ? -1 : 1;
    if (valA > valB) return asc ? 1 : -1;
    return 0;
  };
}

function showRanking(type) {
  document.querySelectorAll(".ranking-section").forEach(sec => sec.style.display = "none");
  const target = document.getElementById(`${type}Ranking`);
  if (target) target.style.display = "block";
}

function setupSortableHeaders() {
  const headers = [
    {
      table: "playerWeaponRankingTable",
      type: "playerWeapon",
      keys: [
        "playerName", "weapon", "winRate", "wins", "total",
        "avgKills", "avgDeaths", "kdRatio", "maxKills"
      ]
    },
    { table: "playerRankingTable", type: "player", keys: ["playerName", "winRate", "wins", "total"] },
    { table: "weaponRankingTable", type: "weapon", keys: ["weapon", "winRate", "wins", "total"] },
    { table: "xpRankingTable", type: "xp", keys: ["playerName", "xp"] }
  ];

  headers.forEach(({ table, type, keys }) => {
    const ths = document.querySelectorAll(`#${table} thead th`);
    ths.forEach((th, index) => {
      if (index === 0) return;
      th.style.cursor = "pointer";
      th.addEventListener("click", () => {
        const key = keys[index - 1];
        if (sortState[type].key === key) {
          sortState[type].asc = !sortState[type].asc;
        } else {
          sortState[type].key = key;
          sortState[type].asc = false;
        }
        renderRankingTables();
      });
    });
  });
}

function enrichWeaponRankingWithDetails(rankingList, weaponDetails) {
  const detailMap = {};
  weaponDetails.forEach(detail => {
    detailMap[detail.weaponName] = detail;
  });

  rankingList.forEach(entry => {
    const detail = detailMap[entry.weapon];
    if (detail) {
      entry.category = detail.category || "";
      entry.subgenre = detail.subgenre || "";
      entry.type = detail.type || "";
    } else {
      entry.category = "";
      entry.subgenre = "";
      entry.type = "";
    }
  });
}

function getWeaponNamesByPattern(weaponDetails, filters) {
  return weaponDetails
    .filter(w => {
      return (
        (!filters.type || w.type === filters.type) &&
        (!filters.category || w.category === filters.category) &&
        (!filters.subgenre || w.subgenre === filters.subgenre)
      );
    })
    .map(w => w.weaponName);
}

function filterMatches(matches, weaponDetails, filters) {
  const weaponMap = {};
  weaponDetails.forEach(w => {
    weaponMap[w.weaponName] = w;
  });

  let weaponNameSet = null;

  if (filters.weapon) {
    weaponNameSet = new Set([filters.weapon]);
  } else if (filters.type || filters.category || filters.subgenre) {
    const matchedNames = getWeaponNamesByPattern(weaponDetails, filters);
    weaponNameSet = new Set(matchedNames);
  }

  return matches.filter(m => {
    const detail = weaponMap[m.weapon];
    if (!detail) return false;

    const xp = m.xp || 0;

    return (
      (!weaponNameSet || weaponNameSet.has(m.weapon)) &&
      (!filters.seasonId || filters.seasonId === "ALL" || m.seasonId === filters.seasonId) &&
      (!filters.matchType || filters.matchType === "ALL" || m.matchType === filters.matchType) &&
      (!filters.rule || filters.rule === "ALL" || m.rule === filters.rule) &&
      (!filters.minXp || xp >= filters.minXp)
    );
  });
}


