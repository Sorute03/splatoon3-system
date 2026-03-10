const API_URL = "https://sorute-api.haruto-mori0602.workers.dev/"; // ← あなたのWeb AppのURLに置き換えてね
const currentUserId = localStorage.getItem("userId");

function showUserInfo() {
  const userId = localStorage.getItem("userId");
  const secretId = localStorage.getItem("secretId");
  const name = localStorage.getItem("userName");
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  const urlParams = new URLSearchParams(window.location.search);
  const viewedUserId = urlParams.get("user") || userId;

  document.getElementById("userIdDisplay").textContent = viewedUserId;
  document.getElementById("secretIdDisplay").textContent = viewedUserId === userId ? (secretId || "(未登録)") : "非公開";

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


document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const viewedUserId = urlParams.get("user") || currentUserId;

  // 他人のページなら通報ボタンを表示
  if (viewedUserId !== currentUserId) {
    const reportArea = document.getElementById("reportArea");
    reportArea.innerHTML = `
      <button onclick="openReport('${viewedUserId}', 'このプレイヤー')">🚨 通報</button>
    `;
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
});

// 通報モーダルを開く関数
function openReport(userId, name) {
  document.getElementById("reportTarget").textContent = `通報対象: ${name} (${userId})`;
  document.getElementById("reportReason").value = "";
  document.getElementById("reportEvidence").value = "";
  document.getElementById("reportStatus").textContent = "";
  document.getElementById("reportModal").style.display = "flex";
}
