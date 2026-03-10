const API_URL = "https://sorute-api.haruto-mori0602.workers.dev/"; // ← あなたのWeb AppのURLに置き換えてね
const currentUserId = getCurrentUserId(); // ログイン中のユーザーIDを取得する関数（別途実装）

let rankingData = null;
let reportTargetId = "";
let reportTargetName = "";

let sortState = {
  player: { key: "winRate", asc: false },
  weapon: { key: "winRate", asc: false },
  playerWeapon: { key: "winRate", asc: false },
  xp: { key: "xp", asc: false }
};

async function initRankingPage() {
  await initSeasonDropdown();
  setupSortableHeaders();
}

// シーズン一覧を取得してドロップダウンに反映
async function initSeasonDropdown() {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "getRankingIndex" })
    });

    const result = await res.json();
    const index = Array.isArray(result) ? result : result.index || [];

    const select = document.getElementById("seasonSelect");
    if (!select) {
      console.warn("seasonSelect 要素が見つかりません");
      return;
    }

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

  } catch (e) {
    console.error("initSeasonDropdown error:", e);
    alert("ランキングの読み込みに失敗しました：" + e.message);
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
  const val = parseInt(document.getElementById(id)?.value);
  return isNaN(val) ? fallback : val;
}

function renderRankingTables() {
  if (!rankingData) return;

  const globalXpMin = getMinValue("globalXpMinFilter", 0);
  const matchTypeFilter = document.getElementById("matchTypeFilter").value;
  const ruleFilter = document.getElementById("ruleFilter").value;
  const key = `${ruleFilter || "ALL"}|${matchTypeFilter || "ALL"}`;

  // プレイヤー勝率
  const playerMin = getMinValue("playerMinGames", 5);
  const playerNameFilter = document.getElementById("playerNameFilter").value.toLowerCase();
  const playerLimit = getMinValue("playerLimitFilter", Infinity);
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
    const isSelf = p.userId === currentUserId; // userIdがある場合
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${p.playerName}</td>
      <td>${(p.winRate * 100).toFixed(1)}%</td>
      <td>${p.wins}</td>
      <td>${p.total}</td>
      <td>
        ${!isSelf ? `<button onclick="openReport('${p.userId || p.playerName}', '${p.playerName}')">🚨 通報</button>` : ""}
      </td>
    `;
    playerBody.appendChild(tr);
  });

  // 武器別勝率
  const weaponMin = getMinValue("weaponMinGames", 5);
  const weaponNameFilter = document.getElementById("weaponNameFilter").value.toLowerCase();
  const weaponLimit = getMinValue("weaponLimitFilter", Infinity);
  const weaponBody = document.querySelector("#weaponRankingTable tbody");
  weaponBody.innerHTML = "";

  const weaponSource = (rankingData.weaponRankingByRuleAndType || {})[key] || [];

  const weaponSorted = [...weaponSource]
    .filter(w => w.total >= weaponMin)
    .filter(w => w.weapon.toLowerCase().includes(weaponNameFilter))
    .sort(sortBy(sortState.weapon.key, sortState.weapon.asc))
    .slice(0, weaponLimit);

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

  // プレイヤー×武器別勝率
  const pwMin = getMinValue("playerWeaponMinGames", 5);
  const pwNameFilter = document.getElementById("playerWeaponNameFilter").value.toLowerCase();
  const pwWeaponFilter = document.getElementById("playerWeaponWeaponFilter").value.toLowerCase();
  const pwLimit = getMinValue("playerWeaponLimitFilter", Infinity);
  const pwBody = document.querySelector("#playerWeaponRankingTable tbody");
  pwBody.innerHTML = "";

  const pwSource = (rankingData.playerWeaponRankingByRuleAndType || {})[key] || [];

  const pwSorted = [...pwSource]
    .filter(pw => pw.total >= pwMin)
    .filter(pw => pw.playerName.toLowerCase().includes(pwNameFilter))
    .filter(pw => pw.weapon.toLowerCase().includes(pwWeaponFilter))
    .filter(pw => {
      const xpEntry = (rankingData.xpRanking || []).find(x => x.playerName === pw.playerName);
      return !xpEntry || xpEntry.xp >= globalXpMin;
    })
    .sort(sortBy(sortState.playerWeapon.key, sortState.playerWeapon.asc))
    .slice(0, pwLimit);

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

  // XPランキング
  const xpMin = getMinValue("xpMinFilter", globalXpMin);
  const xpNameFilter = document.getElementById("xpNameFilter").value.toLowerCase();
  const xpLimit = getMinValue("xpLimitFilter", Infinity);
  const xpBody = document.querySelector("#xpRankingTable tbody");
  xpBody.innerHTML = "";

  const xpSorted = [...(rankingData.xpRanking || [])]
    .filter(entry => entry.xp >= xpMin)
    .filter(entry => entry.playerName.toLowerCase().includes(xpNameFilter))
    .sort(sortBy(sortState.xp.key, sortState.xp.asc))
    .slice(0, xpLimit);

  xpSorted.forEach((entry, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${entry.playerName}</td>
            <td>${entry.xp}</td>
    `;
    xpBody.appendChild(tr);
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
  const target = document.getElementById(`${type}Ranking`);
  if (target) target.style.display = "block";
}

// ヘッダークリックでソート切り替え
function setupSortableHeaders() {
  const headers = [
    { table: "playerRankingTable", type: "player", keys: ["playerName", "winRate", "wins", "total"] },
    { table: "weaponRankingTable", type: "weapon", keys: ["weapon", "winRate", "wins", "total"] },
    { table: "playerWeaponRankingTable", type: "playerWeapon", keys: ["playerName", "weapon", "winRate", "wins", "total"] },
    { table: "xpRankingTable", type: "xp", keys: ["playerName", "xp"] }
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

// 通報モーダルを開く
function openReport(userId, name) {
  reportTargetId = userId;
  reportTargetName = name;
  document.getElementById("reportTarget").textContent = `通報対象: ${name} (${userId})`;
  document.getElementById("reportReason").value = "";
  document.getElementById("reportEvidence").value = "";
  document.getElementById("reportStatus").textContent = "";
  document.getElementById("reportModal").style.display = "flex";
}

// 初期化トリガー
window.addEventListener("DOMContentLoaded", () => {
  requireLogin();
  initRankingPage();
  showUserInfo();

  // 通報モーダルのイベント設定
  document.getElementById("closeReportModal").onclick = () => {
    document.getElementById("reportModal").style.display = "none";
  };

  document.getElementById("submitReportBtn").onclick = async () => {
    const reason = document.getElementById("reportReason").value.trim();
    const evidence = document.getElementById("reportEvidence").value.trim();
    const status = document.getElementById("reportStatus");

    if (!reason) {
      status.textContent = "通報理由を入力してください";
      return;
    }

    const timestamp = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submitReport",
          report: {
            reporterId: currentUserId,
            targetId: reportTargetId,
            reason,
            evidence,
            timestamp
          }
        })
      });

      const result = await res.json();
      if (result.status === "ok") {
        status.textContent = "通報を送信しました。対応をお待ちください。";
        setTimeout(() => {
          document.getElementById("reportModal").style.display = "none";
        }, 1500);
      } else {
        status.textContent = "送信に失敗しました：" + result.error;
      }
    } catch (e) {
      status.textContent = "通信エラー：" + e.message;
    }
  };
});

