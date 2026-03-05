const API_URL = "https://sorute-api.haruto-mori0602.workers.dev/";

function requireLogin() {
  const userId = localStorage.getItem("userId");
  const secretId = localStorage.getItem("secretId");
  if (!userId || !secretId) {
    alert("ログインしてください");
    window.location.href = "index.html";
  }
}

function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

function showUserInfo() {
  const name = localStorage.getItem("userId");
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const nameSpan = document.getElementById("mypageName");
  if (nameSpan) nameSpan.textContent = name;
  if (isAdmin && document.getElementById("adminLink")) {
    document.getElementById("adminLink").style.display = "block";
  }
}

async function login() {
  const userId = document.getElementById("loginUserId").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  const msg = document.getElementById("loginMessage");

  const form = new FormData();
  form.append("data", JSON.stringify({
    action: "login",
    userId,
    password
  }));

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: form // ← headersは書かない！
    });
    const result = await res.json();

    if (result.success) {
      localStorage.setItem("userId", userId);
      localStorage.setItem("secretId", result.secretId);
      localStorage.setItem("isAdmin", result.isAdmin);
      window.location.href = "mypage.html";
    } else {
      msg.textContent = "ログイン失敗：" + (result.error || "不明なエラー");
    }
  } catch (e) {
    msg.textContent = "通信エラー：" + e.message;
  }
}


async function register() {
  const playerName = document.getElementById("regPlayerName").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  const secretId = document.getElementById("regSecretId").value.trim();
  const msg = document.getElementById("registerMessage");

  if (!playerName || password.length < 6 || !/^[0-9]{4}$/.test(secretId)) {
    msg.style.color = "red";
    msg.textContent = "入力内容を確認してください。";
    return;
  }

  const form = new FormData();
  form.append("data", JSON.stringify({
    action: "register",
    password,
    playerName,
    secretId
  }));

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: form
    });
    const result = await res.json();

    if (result.userId) {
      msg.style.color = "green";
      msg.textContent = `登録完了！あなたのユーザーIDは ${result.userId} です`;
      localStorage.setItem("userId", result.userId);
      localStorage.setItem("secretId", result.secretId);
      localStorage.setItem("isAdmin", "false");
      window.location.href = "mypage.html";
    } else {
      msg.style.color = "red";
      msg.textContent = "登録失敗：" + (result.error || "不明なエラー");
    }
  } catch (e) {
    msg.style.color = "red";
    msg.textContent = "通信エラー：" + e.message;
  }
}








