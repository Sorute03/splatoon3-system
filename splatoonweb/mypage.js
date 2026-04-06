const currentUserId = localStorage.getItem("userId");
const token = localStorage.getItem("token");
let allMatches = [];
let winChart = null;
let kdChart = null;
let currentChart = "winRate";

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const viewedUserId = urlParams.get("user") || currentUserId;
  const isOwnPage = viewedUserId === currentUserId;

  // 通報UI
  if (!isOwnPage) {
    const reportArea = document.getElementById("reportArea");
    if (reportArea) {
      reportArea.innerHTML = `
        <button onclick="openReport('${viewedUserId}', 'このプレイヤー')">🚨 通報</button>
      `;
    }
    const pwSection = document.getElementById("passwordSection");
    if (pwSection) pwSection.style.display = "none";
  }

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
            targetId: viewedUserId,
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

  showUserInfo();

  // 公開設定の取得
  const settings = await fetchUserSettings(viewedUserId);
  const isPublic = settings.isPublic === true;

  // 自分のページなら公開設定UIを表示
  if (isOwnPage) {
    const section = document.getElementById("publicSettingSection");
    const toggle = document.getElementById("publicToggle");
    const status = document.getElementById("publicStatus");

    if (section && toggle) {
      section.style.display = "block";
      toggle.checked = isPublic;

      toggle.addEventListener("change", async () => {
        const newValue = toggle.checked;
        const res = await saveUserSettings(currentUserId, { isPublic: newValue });
        if (res.status === "ok") {
          status.style.color = "green";
          status.textContent = "公開設定を更新しました";
        } else {
          status.style.color = "red";
          status.textContent = res.error || "更新に失敗しました";
        }
      });
    }
  }

  // 他人のページで非公開なら戦績を隠す
  if (!isOwnPage && !isPublic) {
    document.getElementById("privateNotice").style.display = "block";
    document.getElementById("chartContainer").style.display = "none";
    document.getElementById("averageStats").style.display = "none";
    document.getElementById("battleTable").style.display = "none";
    document.getElementById("toggleChartBtn").style.display = "none";
    document.getElementById("ruleFilter").disabled = true;
    document.getElementById("weaponFilter").disabled = true;
    document.getElementById("applyFilters").disabled = true;
    return;
  }

  // 戦績取得＆表示
  allMatches = await fetchBattleHistory(viewedUserId);
  populateFilters(allMatches);
  updateCharts(allMatches);

  document.getElementById("applyFilters").addEventListener("click", () => {
    const filtered = applyFilters(allMatches);
    updateCharts(filtered);
  });

  const toggleBtn = document.getElementById("toggleChartBtn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      currentChart = currentChart === "winRate" ? "kd" : "winRate";
      document.getElementById("winRateChart").style.display = currentChart === "winRate" ? "block" : "none";
      document.getElementById("kdChart").style.display = currentChart === "kd" ? "block" : "none";
    });
  }
});

function showUserInfo() {
  const userId = localStorage.getItem("userId");
  const secretId = localStorage.getItem("secretId");
  const name = localStorage.getItem("userName");
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  const urlParams = new URLSearchParams(window.location.search);
  const viewedUserId = urlParams.get("user") || userId;

  document.getElementById("userIdDisplay").textContent = viewedUserId;
  document.getElementById("secretIdDisplay").textContent =
    viewedUserId === userId ? (secretId || "(未登録)") : "非公開";

  document.getElementById("mypageName").textContent = viewedUserId === userId ? (name || "プレイヤー") : viewedUserId;
  document.getElementById("welcomeMessage").textContent =
    viewedUserId === userId ? `ようこそ、${name || "プレイヤー"} さん！` : `${viewedUserId} さんのページ`;

  if (isAdmin) {
    document.getElementById("adminLink").style.display = "block";
  }
}

function openReport(userId, name) {
  document.getElementById("reportTarget").textContent = `通報対象: ${name} (${userId})`;
  document.getElementById("reportReason").value = "";
  document.getElementById("reportEvidence").value = "";
  document.getElementById("reportStatus").textContent = "";
  document.getElementById("reportModal").style.display = "flex";
}

async function fetchBattleHistory(userId) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "getUserBattleHistory", // ← ここを action → mode に変更！
        token,
        userId
      })
    });

    const result = await res.json();

    if (Array.isArray(result)) {
      result.forEach(m => {
        const raw = m.Timestamp || m.timestamp || m.date;
        if (raw) {
          const d = new Date(raw);
          if (!isNaN(d)) {
            m.date = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
          } else {
            m.date = "不明";
          }
        } else {
          m.date = "不明";
        }
      });
      return result;
    } else {
      console.warn("⚠️ 戦績データが配列ではありません:", result);
      return [];
    }
  } catch (e) {
    console.error("❌ fetchBattleHistory エラー:", e);
    return [];
  }
}





async function fetchUserSettings(userId) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "getUserSettings",
      token,
      userId
    })
  });
  return await res.json();
}

async function saveUserSettings(userId, updates) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "setUserSettings",
      token,
      userId,
      requesterId: currentUserId,
      updates
    })
  });
  return await res.json();
}

function populateFilters(data) {
  if (!Array.isArray(data)) return;

  const ruleSet = new Set();
  const weaponSet = new Set();

  data.forEach(m => {
    if (m.rule) ruleSet.add(m.rule);
    if (m.weapon) weaponSet.add(m.weapon);
  });

  const ruleFilter = document.getElementById("ruleFilter");
  const weaponFilter = document.getElementById("weaponFilter");

  ruleFilter.innerHTML = '<option value="ALL">すべて</option>';
  weaponFilter.innerHTML = '<option value="ALL">すべて</option>';

  ruleSet.forEach(rule => {
    const opt = document.createElement("option");
    opt.value = rule;
    opt.textContent = rule;
    ruleFilter.appendChild(opt);
  });

  weaponSet.forEach(weapon => {
    const opt = document.createElement("option");
    opt.value = weapon;
    opt.textContent = weapon;
    weaponFilter.appendChild(opt);
  });
}


function applyFilters(data) {
  const rule = document.getElementById("ruleFilter").value;
  const weapon = document.getElementById("weaponFilter").value;

  return data.filter(m => {
    const ruleMatch = rule === "ALL" || m.rule === rule;
    const weaponMatch = weapon === "ALL" || m.weapon === weapon;
    return ruleMatch&& weaponMatch;
  });
}

function updateCharts(data) {
  updateAverageStats(data);
  renderBattleTable(data);
  renderWinRateChart(data);
  renderKDChart(data);
}

function renderWinRateChart(data) {
  console.log("📅 ラベル一覧:", data.map(m => m.date));
  const ctx = document.getElementById("winRateChart").getContext("2d");
  if (winChart) winChart.destroy();

  const labels = data.map(m => m.date);
  const results = data.map(m => m.result === "win" ? 1 : 0);

  winChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "勝敗（1=勝ち, 0=負け）",
        data: results,
        borderColor: "#1e90ff",
        fill: false
      }]
    },
    options: {
      scales: {
        y: { min: 0, max: 1 }
      }
    }
  });
}

function renderKDChart(data) {
  const ctx = document.getElementById("kdChart").getContext("2d");
  if (kdChart) kdChart.destroy();

  const labels = data.map(m => m.date);
  const kd = data.map(m => {
    const k = Number(m.kills || 0);
    const d = Number(m.deaths || 0);
    return d === 0 ? k : (k / d).toFixed(2);
  });

  kdChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "K/D比",
        data: kd,
        backgroundColor: "#ffa500"
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function updateAverageStats(data) {
  const total = data.length;
  const wins = data.filter(m => m.result === "win").length;
  const kills = data.reduce((sum, m) => sum + Number(m.kills || 0), 0);
  const deaths = data.reduce((sum, m) => sum + Number(m.deaths || 0), 0);
  const avgKills = total ? (kills / total).toFixed(2) : "0.00";
  const avgDeaths = total ? (deaths / total).toFixed(2) : "0.00";
  const kd = avgDeaths === "0.00" ? (avgKills > 0 ? "∞" : "0") : (avgKills / avgDeaths).toFixed(2);
  const winRate = total ? ((wins / total) * 100).toFixed(1) : "0.0";

  document.getElementById("averageStats").textContent =
    `試合数: ${total}｜勝率: ${winRate}%｜平均K: ${avgKills}｜平均D: ${avgDeaths}｜K/D: ${kd}`;
}

function renderBattleTable(data) {
  const tbody = document.querySelector("#battleTable tbody");
  tbody.innerHTML = "";

  data.forEach(m => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.date || ""}</td>
      <td>${m.rule || ""}</td>
      <td>${m.weapon || ""}</td>
      <td>${m.kills ?? "-"}</td>
      <td>${m.deaths ?? "-"}</td>
      <td>${m.result === "win" ? "勝ち" : "負け"}</td>
    `;
    tbody.appendChild(tr);
  });
}
