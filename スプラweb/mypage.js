const API_URL = "YOUR_WEBAPP_URL"; // ← あなたのWeb AppのURLに置き換えてね
const currentUserId = localStorage.getItem("userId");

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
