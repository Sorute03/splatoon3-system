let rankingData = null;
let sortState = {
  player: { key: "winRate", asc: false },
  weapon: { key: "winRate", asc: false },
  playerWeapon: { key: "winRate", asc: false }
};

async function loadRanking() {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getRanking" }),
      headers: { "Content-Type": "application/json" }
    });
    rankingData = await res.json();
    renderRankingTables();
    showRanking("player");
  } catch (e) {
    alert("ランキングの読み込みに失敗しました：" + e.message);
  }
}

function renderRankingTables() {
  if (!rankingData) return;

  const playerMin = parseInt(document.getElementById("playerMinGames").value) || 0;
  const weaponMin = parseInt(document.getElementById("weaponMinGames").value) || 0;
  const pwMin = parseInt(document.getElementById("playerWeaponMinGames").value) || 0;

  const playerBody = document.querySelector("#playerRankingTable tbody");
  const weaponBody = document.querySelector("#weaponRankingTable tbody");
  const pwBody = document.querySelector("#playerWeaponRankingTable tbody");
  playerBody.innerHTML = "";
  weaponBody.innerHTML = "";
  pwBody.innerHTML = "";

  const playerSorted = [...rankingData.playerRanking]
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

  const weaponSorted = [...rankingData.weaponRanking]
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

  const pwSorted = [...rankingData.playerWeaponRanking]
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
  document.getElementById(`${type}Ranking`).style.display = "block";
}

// 🔽 ヘッダークリックでソート切り替え
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

window.addEventListener("DOMContentLoaded", setupSortableHeaders);
