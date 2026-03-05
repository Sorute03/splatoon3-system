let rankingData = null;

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

  rankingData.playerRanking
    .filter(p => p.total >= playerMin)
    .sort((a, b) => b.winRate - a.winRate)
    .forEach((p, i) => {
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

  rankingData.weaponRanking
    .filter(w => w.total >= weaponMin)
    .sort((a, b) => b.winRate - a.winRate)
    .forEach((w, i) => {
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

  rankingData.playerWeaponRanking
    .filter(pw => pw.total >= pwMin)
    .sort((a, b) => b.winRate - a.winRate)
    .forEach((pw, i) => {
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

function showRanking(type) {
  document.querySelectorAll(".ranking-section").forEach(sec => sec.style.display = "none");
  if (type === "player") document.getElementById("playerRanking").style.display = "block";
  if (type === "weapon") document.getElementById("weaponRanking").style.display = "block";
  if (type === "playerWeapon") document.getElementById("playerWeaponRanking").style.display = "block";
}
