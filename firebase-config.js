/* ------------------------------------------------------------
   Firebase の接続設定
   Firebase コンソール → プロジェクトの設定 → マイアプリ(ウェブ) の
   firebaseConfig の値を、下の YOUR_... と置き換えてください。
   （このファイルの中身は公開されても問題ありません。
     守っているのは database.rules.json のルールです）
   YOUR_ のまま使うと、Firebase に接続せず「デモ動作」になります。
------------------------------------------------------------ */
window.APP_CONFIG = {
  appName: '2-9 MAWARU',
  sdkVersion: '10.8.0',
  firebase: {
    apiKey: "AIzaSyAVlkQol4fFNfmiA8UfNVxpmV5vxVrW40A",
    authDomain: "mawaru-2-9.firebaseapp.com",
    databaseURL: "https://mawaru-2-9-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "mawaru-2-9",
    storageBucket: "mawaru-2-9.firebasestorage.app",
    messagingSenderId: "660682298831",
    appId: "1:660682298831:web:28b19ab4161923d8d0eeba",
    measurementId: "G-S2QWKYFM7M"
  }
};
