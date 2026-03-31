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


const sortOptionsByType = {
  player: [
    { value: "winRate", label: "勝率" },
    { value: "wins", label: "勝利数" },
    { value: "total", label: "試合数" }
  ],
  weapon: [
    { value: "winRate", label: "勝率" },
    { value: "wins", label: "勝利数" },
    { value: "total", label: "試合数" }
  ],
  playerWeapon: [
    { value: "winRate", label: "勝率" },
    { value: "avgKills", label: "平均キル" },
    { value: "avgDeaths", label: "平均デス" },
    { value: "kdRatio", label: "K/D比" },
    { value: "maxKills", label: "最高キル" },
    { value: "maxDeaths", label: "最高デス" },
    { value: "wins", label: "勝利数" },
    { value: "total", label: "試合数" }
  ],
  xp: [
    { value: "xp", label: "XP" }
  ]
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

async function initSeasonDropdown() {
  const res = await fetch(window.API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "getRankingIndex" })
  });

  const result = await res.json();
  const index = Array.isArray(result) ? result : result.index || [];

  const select = document.getElementById("seasonSelect");
  select.innerHTML = "";

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
  const filters = {
    rankingType: "player",
    rule: "ALL",
    matchType: "ALL",
    minGamesPlayer: 1,
    sortKey: "winRate",
    sortAsc: false,
    seasonId: seasonId
  };

  const res = await fetch(window.API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "getFilteredRanking",
      action: "getFilteredRanking",
      filters,
      token: "super-secret-token-123"
    })
  });

  rankingData = await res.json();
  renderRankingTables();
  showRanking("player");

  document.getElementById("lastUpdated").textContent =
    rankingData.updatedAt ? `最終更新: ${new Date(rankingData.updatedAt).toLocaleString()}` : "";
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
    {
      table: "playerRankingTable",
      type: "player",
      keys: ["playerName", "winRate", "wins", "total"]
    },
    {
      table: "weaponRankingTable",
      type: "weapon",
      keys: ["weapon", "winRate", "wins", "total"]
    },
    {
      table: "xpRankingTable",
      type: "xp",
      keys: ["playerName", "xp"]
    }
  ];

  headers.forEach(({ table, type, keys }) => {
    const ths = document.querySelectorAll(`#${table} thead th`);
    ths.forEach((th, index) => {
      if (index === 0) return; // 順位列はスキップ
      th.style.cursor = "pointer";
      th.addEventListener("click", () => {
        const key = keys[index - 1];
        if (sortState[type].key === key) {
          sortState[type].asc = !sortState[type].asc;
        } else {
          sortState[type].key = key;
          sortState[type].asc = false;
        }
        document.getElementById("sortKeySelect").value = key;
        document.getElementById("sortOrderSelect").value = sortState[type].asc ? "asc" : "desc";
        renderRankingTables();
      });
    });
  });
}



async function initRankingPage() {
  await initSeasonDropdown();
  setupSortableHeaders();

  const [detailsRaw, namesRaw] = await Promise.all([
    fetchList("getWeaponDetails"),
    fetchList("getWeaponList")
  ]);

  weaponDetails = Array.isArray(detailsRaw) ? detailsRaw : [];
  weaponNames = Array.isArray(namesRaw) ? namesRaw : [];

  populateWeaponFilters(weaponDetails, weaponNames); // ← ここでセレクターに反映！

  document.getElementById("sortKeySelect").addEventListener("change", () => {
    renderRankingTables();
  });

  document.getElementById("sortOrderSelect").addEventListener("change", () => {
    renderRankingTables();
  });
}

function updateSortKeySelector(type) {
  const select = document.getElementById("sortKeySelect");
  const orderSelect = document.getElementById("sortOrderSelect");
  select.innerHTML = "";

  const options = sortOptionsByType[type] || [];
  options.forEach(opt => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  });

  const currentKey = sortState[type].key || options[0]?.value || "";
  const currentAsc = sortState[type].asc;

  select.value = currentKey;
  orderSelect.value = currentAsc ? "asc" : "desc";
}

function showRanking(type) {
  document.querySelectorAll(".ranking-section").forEach(sec => sec.style.display = "none");
  const target = document.getElementById(`${type}Ranking`);
  if (target) target.style.display = "block";

  updateSortKeySelector(type);
  renderRankingTables();
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

function populateWeaponFilters(details, names) {
  // 武器名セレクター
  const weaponSelects = [
    "weaponFilterWeaponNames",
    "pwFilterWeaponNames"
  ];

  weaponSelects.forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = "";
    names.forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });
  });

  // カテゴリ・サブジャンル・タイプのユニーク値を抽出
  console.log("weaponDetails:", weaponDetails);

  const categories = [...new Set(weaponDetails.map(w => w.category).filter(Boolean))];
  const subgenres = [...new Set(weaponDetails.map(w => w.subgenre).filter(Boolean))];
  const types = [...new Set(weaponDetails.map(w => w.type).filter(Boolean))];
  
  console.log("categories:", categories);
  console.log("subgenres:", subgenres);
  console.log("types:", types);


  // セレクターに反映するヘルパー
  function populateSelect(id, values, allowAll = true) {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = "";
    if (allowAll) {
      const opt = document.createElement("option");
      opt.value = "ALL";
      opt.textContent = "すべて";
      select.appendChild(opt);
    }
    values.forEach(v => {
      const option = document.createElement("option");
      option.value = v;
      option.textContent = v;
      select.appendChild(option);
    });
  }

  // 各セレクターに反映
  populateSelect("weaponFilterCategory", categories);
  populateSelect("weaponFilterSubGenre", subgenres);
  populateSelect("weaponFilterTypes", types, false);

  populateSelect("pwFilterCategory", categories);
  populateSelect("pwFilterSubGenre", subgenres);
  populateSelect("pwFilterTypes", types, false);
}



async function fetchFilteredRanking(filters) {
  const payload = {
    mode: "getFilteredRanking",
    action: "getFilteredRanking",
    filters,
    token: "super-secret-token-123"
  };

  try {
    const response = await fetch("https://sorute-api.haruto-mori0602.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    // 🔍 デバッグ情報をログ出力
    console.log("🐛 フルレスポンス:", data);
    console.log("🐛 デバッグ情報:", data.debug);

    if (data.debug) {
      console.log("🔑 playerKey:", data.debug.playerKey);
      console.log("🗝️  playerRanking keys:", data.debug.playerRankingKeys);
      console.log("📊 rawPlayerList.length:", data.debug.rawPlayerListLength);
    }

    return {
      ranking: data.ranking || [],
      updatedAt: data.updatedAt || "",
      type: filters.rankingType // ここでランキング種別を保持！
    };
  } catch (error) {
    console.error("❌ fetchFilteredRanking エラー:", error);
    return { error: "データの取得に失敗しました" };
  }
}



const ruleMap = {
  "ナワバリ": "ナワバリ",
  "ガチエリア": "ガチエリア",
  "ガチホコ": "ガチホコ",
  "ガチヤグラ": "ガチヤグラ",
  "ガチアサリ": "ガチアサリ",
  "ALL": "ALL",
  "すべて": "ALL"
};

const matchTypeMap = {
  "ナワバリ": "regular",
  "オープン": "open",
  "チャレンジ": "challenge",
  "Xマッチ": "xmatch",
  "イベントマッチ": "event",
  "ALL": "ALL",
  "すべて": "ALL"
};


function renderRankingTables() {
  if (!rankingData) {
    console.warn("⚠️ rankingData が未定義！");
    return;
  }

  const sortKey = getSelectValue("sortKeySelect", "winRate");
  const sortAsc = getSelectValue("sortOrderSelect", "desc") === "asc";
  const data = rankingData.ranking || [];

  // プレイヤーランキング
  if (rankingData.type === "player") {
    sortState.player.key = sortKey;
    sortState.player.asc = sortAsc;

    const tbody = document.querySelector("#playerRankingTable tbody");
    tbody.innerHTML = "";

    const sorted = [...data].sort(sortBy(sortKey, sortAsc));
    sorted.forEach((p, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="順位">${i + 1}</td>
        <td data-label="プレイヤー名">${p.playerName}</td>
        <td data-label="勝率">${(p.winRate * 100).toFixed(1)}%</td>
        <td data-label="勝利数">${p.wins}</td>
        <td data-label="試合数">${p.total}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // 武器ランキング
  else if (rankingData.type === "weapon") {
    sortState.weapon.key = sortKey;
    sortState.weapon.asc = sortAsc;

    const tbody = document.querySelector("#weaponRankingTable tbody");
    tbody.innerHTML = "";

    const sorted = [...data].sort(sortBy(sortKey, sortAsc));
    sorted.forEach((w, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="順位">${i + 1}</td>
        <td data-label="武器">${w.weapon}</td>
        <td data-label="勝率">${(w.winRate * 100).toFixed(1)}%</td>
        <td data-label="勝利数">${w.wins}</td>
        <td data-label="試合数">${w.total}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // プレイヤー×武器ランキング
  else if (rankingData.type === "playerWeapon") {
    sortState.playerWeapon.key = sortKey;
    sortState.playerWeapon.asc = sortAsc;

    const tbody = document.querySelector("#playerWeaponRankingTable tbody");
    tbody.innerHTML = "";

    const sorted = [...data].sort(sortBy(sortKey, sortAsc));
    sorted.forEach((pw, i) => {
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
      tbody.appendChild(tr);
    });
  }

  // XPランキング
  else if (rankingData.type === "xp") {
    const xpValueType = getSelectValue("xpValueTypeSelect", "xp");
    sortState.xp.key = xpValueType;
    sortState.xp.asc = sortAsc;

    const tbody = document.querySelector("#xpRankingTable tbody");
    tbody.innerHTML = "";

    const sorted = [...data].sort(sortBy(xpValueType, sortAsc));
    sorted.forEach((x, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="順位">${i + 1}</td>
        <td data-label="プレイヤー名">${x.playerName}</td>
        <td data-label="XP">${x[xpValueType]}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // 更新日時表示
  document.getElementById("lastUpdated").textContent =
    rankingData.updatedAt ? `最終更新: ${new Date(rankingData.updatedAt).toLocaleString()}` : "";
}


document.addEventListener("DOMContentLoaded", () => {
  const playerBtn = document.getElementById("playerFilterButton");
  if (playerBtn) {
    playerBtn.addEventListener("click", async () => {
      const filters = {
        rankingType: "player",
        rule: getSelectValue("ruleFilter", "ALL"),
        matchType: getSelectValue("matchTypeFilter", "ALL"),
        minGamesPlayer: getMinValue("playerMinGames", 5),
        sortKey: getSelectValue("sortKeySelect", "winRate"),
        sortAsc: getSelectValue("sortOrderSelect", "desc") === "asc",
        playerNameFilter: getTextValue("playerNameFilter"),
        minXp: getMinValue("playerXpMinFilter", 0),
        seasonId: getSelectValue("seasonSelect", "ALL")
      };

      const result = await fetchFilteredRanking(filters);
      rankingData = result;
      renderRankingTables();
      console.log("🎯 プレイヤーランキング結果:", result);
    });
  }

  const weaponBtn = document.getElementById("weaponFilterButton");
  if (weaponBtn) {
    weaponBtn.addEventListener("click", async () => {
      const filters = {
        rankingType: "weapon",
        rule: getSelectValue("ruleFilter", "ALL"),
        matchType: getSelectValue("matchTypeFilter", "ALL"),
        minGamesWeapon: getMinValue("weaponMinGames", 5),
        sortKey: getSelectValue("sortKeySelect", "winRate"),
        sortAsc: getSelectValue("sortOrderSelect", "desc") === "asc",
        weaponNames: getMultiSelectValues("weaponFilterWeaponNames"),
        type: getMultiSelectValues("weaponFilterTypes"),
        category: getMultiSelectValues("weaponFilterCategory"),
        subgenre: getMultiSelectValues("weaponFilterSubGenre"),
        seasonId: getSelectValue("seasonSelect", "ALL")
      };

      const result = await fetchFilteredRanking(filters);
      rankingData = result;
      renderRankingTables();
      console.log("🎯 武器ランキング結果:", result);
    });
  }
});
