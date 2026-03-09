
let rankingData = null;
let sortState = {
  player: { key: "winRate", asc: false },
  weapon: { key: "winRate", asc: false },
  playerWeapon: { key: "winRate", asc: false }
};

async function initRankingPage() {
  await initSeasonDropdown();
  setupSortableHeaders();
}

// シーズン一覧を取得してドロップダウンに反映
async function initSeasonDropdown() {
  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ action: "getRankingIndex" }),
    headers: { "Content-Type": "application/json" }
  });
  const index = await res.json();
  const select = document.getElementById("seasonSelect");
  select.innerHTML = "";

  index.forEach(season => {
    const option = document.createElement("option");
    option.value = season.seasonId;
    option.textContent = season.name;
    select.appendChild(option);
  });

  if (index.length > 0) {
    select.value = "ALL";
    await loadRankingForSeason("ALL");
  }
}

// 指定シーズンのランキングを取得
async function loadRankingForSeason(seasonId) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "getCachedRanking",
        seasonId: seasonId
      }),
      headers: { "Content-Type": "application/json" }
    });
    rankingData = await res.json();
    renderRankingTables();
    showRanking("player");

    if (rankingData.updatedAt) {
      document.getElementById("lastUpdated").textContent =
        `最終更新: ${new Date(rankingData.updatedAt).toLocaleString()}`;
    } else {
      document.getElementById("lastUpdated").textContent = "";
    }
  } catch (e) {
    alert("ランキングの読み込みに失敗しました：" + e.message);
  }
}

function getMinValue(id, fallback) {
  const val = parseInt(document.getElementById(id).value);
  return isNaN(val) ? fallback : val;
}

function renderRankingTables() {
  if (!rankingData) return;

  const playerMin = getMinValue("playerMinGames", 5);
  const weaponMin = getMinValue("weaponMinGames", 5);
  const pwMin = getMinValue("playerWeaponMinGames", 5);

  const playerBody = document.querySelector("#playerRankingTable tbody");
  const weaponBody = document.querySelector("#weaponRankingTable tbody");
  const pwBody = document.querySelector("#playerWeaponRankingTable tbody");
  playerBody.innerHTML = "";
  weaponBody.innerHTML = "";
  pwBody.innerHTML = "";

  const playerSorted = [...(rankingData.playerRanking || [])]
    .filter(p => p.total >= playerMin)
    .sort(sortBy(sortState.player.key, sortState.player.asc));
  playerSorted.forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${p.playerName}</td>
      <td>${(p.winRate * 100).toFixed(1)}%</td>
      <td>${p.wins}</td>
      <td>${p.total}</td>
    `;
    playerBody.appendChild(tr);
  });

  const weaponSorted = [...(rankingData.weaponRanking || [])]
    .filter(w => w.total >= weaponMin)
    .sort(sortBy(sortState.weapon.key, sortState.weapon.asc));
  weaponSorted.forEach((w, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
            <td>${w.weapon}</td>
      <td>${(w.winRate * 100).toFixed(1)}%</td>
      <td>${w.wins}</td>
      <td>${w.total}</td>
    `;
    weaponBody.appendChild(tr);
  });

  const pwSorted = [...(rankingData.playerWeaponRanking || [])]
    .filter(pw => pw.total >= pwMin)
    .sort(sortBy(sortState.playerWeapon.key, sortState.playerWeapon.asc));
  pwSorted.forEach((pw, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${pw.playerName}</td>
      <td>${pw.weapon}</td>
      <td>${(pw.winRate * 100).toFixed(1)}%</td>
      <td>${pw.wins}</td>
      <td>${pw.total}</td>
    `;
    pwBody.appendChild(tr);
  });
}

// ソート関数生成
function sortBy(key, asc) {
  return (a, b) => {
    const valA = typeof a[key] === "string" ? a[key].toLowerCase() : a[key];
    const valB = typeof b[key] === "string" ? b[key].toLowerCase() : b[key];
    if (valA < valB) return asc ? -1 : 1;
    if (valA > valB) return asc ? 1 : -1;
    return 0;
  };
}

// 表示切り替え
function showRanking(type) {
  document.querySelectorAll(".ranking-section").forEach(sec => sec.style.display = "none");
  document.getElementById(`${type}Ranking`).style.display = "block";
}

// ヘッダークリックでソート切り替え
function setupSortableHeaders() {
  const headers = [
    { table: "playerRankingTable", type: "player", keys: ["playerName", "winRate", "wins", "total"] },
    { table: "weaponRankingTable", type: "weapon", keys: ["weapon", "winRate", "wins", "total"] },
    { table: "playerWeaponRankingTable", type: "playerWeapon", keys: ["playerName", "weapon", "winRate", "wins", "total"] }
  ];

  headers.forEach(({ table, type, keys }) => {
    const ths = document.querySelectorAll(`#${table} thead th`);
    ths.forEach((th, index) => {
      if (index === 0) return; // 順位列は除外
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

// 初期化トリガー
window.addEventListener("DOMContentLoaded", () => {
  requireLogin();
  initRankingPage();
  showUserInfo();
});


