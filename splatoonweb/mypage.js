const currentUserId = localStorage.getItem("userId");
const token = localStorage.getItem("token");
let allMatches = [];

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const viewedUserId = urlParams.get("user") || currentUserId;

  // 他人のページなら通報ボタンを表示
  if (viewedUserId !== currentUserId) {
    const reportArea = document.getElementById("reportArea");
    if (reportArea) {
      reportArea.innerHTML = `
        <button onclick="openReport('${viewedUserId}', 'このプレイヤー')">🚨 通報</button>
      `;
    }
    const pwSection = document.getElementById("passwordSection");
    if (pwSection) pwSection.style.display = "none";
  }

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

  // 戦績取得＆グラフ描画
  allMatches = await fetchBattleHistory(viewedUserId);
  populateFilters(allMatches);
  renderWinRateChart(allMatches);
  renderKDChart(allMatches);

  document.getElementById("applyFilters").addEventListener("click", () => {
    const filtered = applyFilters(allMatches);
    renderWinRateChart(filtered);
    renderKDChart(filtered);
  });
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

  if (viewedUserId === userId) {
    document.getElementById("mypageName").textContent = name || "プレイヤー";
    document.getElementById("welcomeMessage").textContent = `ようこそ、${name || "プレイヤー"} さん！`;
  } else {
    document.getElementById("mypageName").textContent = viewedUserId;
    document.getElementById("welcomeMessage").textContent = `${viewedUserId} さんのページ`;
  }

  if (isAdmin) {
    document.getElementById("adminLink").style.display = "block";
  }
}

// 通報モーダルを開く関数
function openReport(userId, name) {
  document.getElementById("reportTarget").textContent = `通報対象: ${name} (${userId})`;
  document.getElementById("reportReason").value = "";
  document.getElementById("reportEvidence").value = "";
  document.getElementById("reportStatus").textContent = "";
  document.getElementById("reportModal").style.display = "flex";
}

// 戦績取得
async function fetchBattleHistory(userId) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "getUserBattleHistory",
      token,
      userId
    })
  });
  return await res.json();
}

// フィルターUIを構築
function populateFilters(data) {
  const ruleSet = new Set();
  const weaponSet = new Set();

  data.forEach(m => {
    if (m.rule) ruleSet.add(m.rule);
    if (m.weapon) weaponSet.add(m.weapon);
  });

  const ruleFilter = document.getElementById("ruleFilter");
  ruleSet.forEach(rule => {
    const opt = document.createElement("option");
    opt.value = rule;
    opt.textContent = rule;
    ruleFilter.appendChild(opt);
  });

  const weaponFilter = document.getElementById("weaponFilter");
  weaponSet.forEach(weapon => {
    const opt = document.createElement("option");
    opt.value = weapon;
    opt.textContent = weapon;
    weaponFilter.appendChild(opt);
  });
}

// フィルター適用
function applyFilters(data) {
  const rule = document.getElementById("ruleFilter").value;
  const weapon = document.getElementById("weaponFilter").value;

  return data.filter(m => {
    const ruleMatch = rule === "ALL" || m.rule === rule;
    const weaponMatch = weapon === "ALL" || m.weapon === weapon;
    return ruleMatch && weaponMatch;
  });
}

// 勝率グラフ描画
function renderWinRateChart(data) {
  const ctx = document.getElementById("winRateChart").getContext("2d");
  const labels = data.map(m => m.date);
  const results = data.map(m => m.result === "win" ? 1 : 0);

  new Chart(ctx, {
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

// K/D比グラフ描画
function renderKDChart(data) {
  const ctx = document.getElementById("kdChart").getContext("2d");
  const labels = data.map(m => m.date);
  const kd = data.map(m => {
    const k = Number(m.kills || 0);
    const d = Number(m.deaths || 0);
    return d === 0 ? k : (k / d).toFixed(2);
  });

  new Chart(ctx, {
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
