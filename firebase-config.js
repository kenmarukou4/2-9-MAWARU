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
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    databaseURL: 'https://YOUR_DATABASE_NAME.asia-southeast1.firebasedatabase.app',
    projectId: 'YOUR_PROJECT_ID',
    appId: 'YOUR_APP_ID'
  }
};
