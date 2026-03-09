
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
      <td>${w.weapon
