// グローバルAPIエンドポイント
window.API_URL = "https://sorute-api.haruto-mori0602.workers.dev/";

// ログインしていなければ index.html にリダイレクト
function requireLogin() {
  const userId = localStorage.getItem("userId");
  const secretId = localStorage.getItem("secretId");
  if (!userId || !secretId) {
    alert("ログインしてください");
    window.location.href = "index.html";
  }
}

// ログアウト処理
function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

// ユーザー情報の表示と管理者リンクの表示制御
function showUserInfo() {
  const name = localStorage.getItem("userId");
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const nameSpan = document.getElementById("mypageName");
  if (nameSpan) nameSpan.textContent = name;
  const adminLink = document.getElementById("adminLink");
  if (isAdmin && adminLink) {
    adminLink.style.display = "block";
  }
}

// ログイン処理
async function login() {
  const userId = document.getElementById("loginUserId").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  const msg = document.getElementById("loginMessage");

  try {
    const res = await fetch(window.API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode: "login",
        userId,
        password
      })
    });

    const text = await res.text();
    console.log("レスポンス文字列（login）:", text);

    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      msg.textContent = "レスポンスがJSONではありません：" + text;
      return;
    }

    if (result.success) {
      localStorage.setItem("userId", userId);
      localStorage.setItem("secretId", result.secretId);
      localStorage.setItem("isAdmin", result.isAdmin);
      localStorage.setItem("isModerator", result.isModerator); // ← モデレーター情報も保存
      window.location.href = "mypage.html";
    } else {
      msg.textContent = "ログイン失敗：" + (result.error || "不明なエラー");
    }
  } catch (e) {
    msg.textContent = "通信エラー：" + e.message;
  }
}

// 新規登録処理
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

  try {
    const res = await fetch(window.API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode: "register",
        password,
        playerName,
        secretId
      })
    });

    const text = await res.text();
    console.log("レスポンス文字列（register）:", text);

    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      msg.style.color = "red";
      msg.textContent = "レスポンスがJSONではありません：" + text;
      return;
    }

    if (result.userId) {
      msg.style.color = "green";
      msg.textContent = `登録完了！あなたのユーザーIDは ${result.userId} です`;
      localStorage.setItem("userId", result.userId);
      localStorage.setItem("secretId", result.secretId);
      localStorage.setItem("isAdmin", "false");
      localStorage.setItem("isModerator", "false");
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

// グローバル公開
window.requireLogin = requireLogin;
window.logout = logout;
window.showUserInfo = showUserInfo;
window.login = login;
window.register = register;
