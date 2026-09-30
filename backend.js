/* ------------------------------------------------------------
   通信まわりを1か所にまとめたファイル。
   ・本番: Firebase Realtime Database
   ・firebase-config.js が YOUR_ のまま: デモ（同じブラウザ内のタブ同士だけで同期）
   画面側はどちらの場合も同じ Backend.xxx() を呼ぶだけです。
------------------------------------------------------------ */
(function(){
'use strict';
var C = window.APP_CONFIG || {};
var FB = C.firebase || {};
var demo = !FB.apiKey || String(FB.apiKey).indexOf('YOUR_') === 0;

var LIM = { maxName: 14, maxGoalName: 8, maxPts: 999, maxGoals: 10, maxCount: 999 };
var DEFAULT_GOALS = [
  { id: 'g1', name: 'ゴール A', pts: 10 },
  { id: 'g2', name: 'ゴール B', pts: 20 },
  { id: 'g3', name: 'ゴール C', pts: 30 },
  { id: 'g4', name: 'ゴール D', pts: 50 },
  { id: 'g5', name: 'BONUS',    pts: 100 }
];
function defaultGoals(){ return DEFAULT_GOALS.map(function(g){ return { id: g.id, name: g.name, pts: g.pts }; }); }
function rid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function toRecords(o){
  var out = [];
  if (!o || typeof o !== 'object') return out;
  Object.keys(o).forEach(function(id){
    var v = o[id];
    if (!v || typeof v !== 'object') return;
    var score = Number(v.score);
    if (!isFinite(score)) return;
    out.push({ id: id, name: String(v.name == null ? '' : v.name).slice(0, LIM.maxName), score: Math.floor(score), at: Number(v.at) || 0 });
  });
  return out;
}
function toGoals(o){
  if (!o || typeof o !== 'object') return null;
  var out = [];
  Object.keys(o).forEach(function(id){
    var v = o[id];
    if (!v || typeof v !== 'object') return;
    var p = Number(v.pts);
    if (!isFinite(p) || p < 0) return;
    out.push({ id: id, name: String(v.name == null ? '' : v.name).slice(0, LIM.maxGoalName), pts: Math.floor(p), order: Number(v.order) || 0 });
  });
  out.sort(function(a, b){ return a.order - b.order; });
  return out.length ? out.slice(0, LIM.maxGoals).map(function(g){ return { id: g.id, name: g.name, pts: g.pts }; }) : null;
}
function goalsToObj(list){
  var o = {};
  list.forEach(function(g, i){ o[g.id] = { name: g.name, pts: g.pts, order: i }; });
  return o;
}
function isPermission(e){ return /permission/i.test(String((e && e.code) || '') + ' ' + String((e && e.message) || '')); }

/* ================= デモ実装 ================= */
function makeDemo(){
  var K = 'bs_demo_db_v1', KS = 'bs_demo_staff_v1';
  var L = { rec: [], goals: [], staff: [] };
  function load(){ try { return JSON.parse(localStorage.getItem(K)) || { records: {}, goals: null }; } catch (e) { return { records: {}, goals: null }; } }
  function save(d){ try { localStorage.setItem(K, JSON.stringify(d)); } catch (e) {} }
  function isStaff(){ try { return localStorage.getItem(KS) === '1'; } catch (e) { return false; } }
  function emit(){
    var d = load();
    L.rec.forEach(function(f){ f(toRecords(d.records)); });
    L.goals.forEach(function(f){ f(toGoals(d.goals)); });
    var s = isStaff();
    L.staff.forEach(function(f){ f(s); });
  }
  window.addEventListener('storage', function(e){ if (e.key === K || e.key === KS) emit(); });
  function later(fn){ return new Promise(function(res){ setTimeout(function(){ res(fn()); }, 120); }); }
  return {
    mode: 'demo',
    init: function(){ return Promise.resolve(); },
    onError: function(){},
    onConnection: function(cb){ setTimeout(function(){ cb(true); }, 0); },
    serverNow: function(){ return Date.now(); },
    onRecords: function(cb){ L.rec.push(cb); setTimeout(function(){ cb(toRecords(load().records)); }, 0); },
    onGoals: function(cb){ L.goals.push(cb); setTimeout(function(){ cb(toGoals(load().goals)); }, 0); },
    onStaff: function(cb){ L.staff.push(cb); setTimeout(function(){ cb(isStaff()); }, 0); },
    unlock: function(pin){ return later(function(){ if (pin === 'demo') { try { localStorage.setItem(KS, '1'); } catch (e) {} emit(); return true; } return false; }); },
    newKey: rid,
    addRecord: function(key, r){ return later(function(){ var d = load(); d.records[key] = { name: r.name, score: r.score, at: Date.now() }; save(d); emit(); }); },
    removeRecords: function(ids){ return later(function(){ var d = load(); ids.forEach(function(id){ delete d.records[id]; }); save(d); emit(); }); },
    saveGoals: function(list){ return later(function(){ var d = load(); d.goals = goalsToObj(list); save(d); emit(); }); }
  };
}

/* ================= Firebase 実装 ================= */
function makeFirebase(){
  var M = {}, uid = null, offset = 0, errCb = function(){};
  /* init() が終わるまで、各 onXxx() の登録は待たされる（呼ぶ順番に依存しないため） */
  var settle = {};
  var ready = new Promise(function(res, rej){ settle.res = res; settle.rej = rej; });
  ready.catch(function(){});
  function need(){ return ready; }
  function fail(e){ try { errCb(e); } catch (x) {} }
  return {
    mode: 'firebase',
    init: function(opt){
      var wantAuth = !opt || opt.auth !== false;
      var base = 'https://www.gstatic.com/firebasejs/' + (C.sdkVersion || '10.8.0') + '/';
      var started = Promise.all([
        import(base + 'firebase-app.js'),
        import(base + 'firebase-database.js'),
        wantAuth ? import(base + 'firebase-auth.js') : Promise.resolve(null)
      ]).then(function(r){
        M.app = r[0]; M.db = r[1]; M.auth = r[2];
        M.a = M.app.initializeApp(FB);
        M.d = M.db.getDatabase(M.a);
        M.db.onValue(M.db.ref(M.d, '.info/serverTimeOffset'), function(s){ offset = Number(s.val()) || 0; });
        if (!wantAuth) return;
        M.au = M.auth.getAuth(M.a);
        return new Promise(function(res, rej){
          var off = M.auth.onAuthStateChanged(M.au, function(u){ if (u) { uid = u.uid; off(); res(); } });
          M.auth.signInAnonymously(M.au).catch(rej);
        });
      });
      started.then(settle.res, settle.rej);
      return started;
    },
    onError: function(cb){ errCb = cb; },
    onConnection: function(cb){
      need().then(function(){ M.db.onValue(M.db.ref(M.d, '.info/connected'), function(s){ cb(s.val() === true); }); }).catch(function(){});
    },
    serverNow: function(){ return Date.now() + offset; },
    onRecords: function(cb){
      need().then(function(){ M.db.onValue(M.db.ref(M.d, 'records'), function(s){ cb(toRecords(s.val())); }, fail); }).catch(function(){});
    },
    onGoals: function(cb){
      need().then(function(){ M.db.onValue(M.db.ref(M.d, 'goals'), function(s){ cb(toGoals(s.val())); }, fail); }).catch(function(){});
    },
    onStaff: function(cb){
      need().then(function(){ M.db.onValue(M.db.ref(M.d, 'staff/' + uid), function(s){ cb(s.exists()); }, function(){ cb(false); }); }).catch(function(){});
    },
    unlock: function(pin){
      return need().then(function(){ return M.db.set(M.db.ref(M.d, 'staff/' + uid), pin); })
        .then(function(){ return true; })
        .catch(function(e){ if (isPermission(e)) return false; throw e; });
    },
    newKey: rid,
    addRecord: function(key, r){
      return need().then(function(){
        return M.db.set(M.db.ref(M.d, 'records/' + key), { name: r.name, score: r.score, at: M.db.serverTimestamp() });
      });
    },
    removeRecords: function(ids){
      return need().then(function(){
        return Promise.all(ids.map(function(id){ return M.db.remove(M.db.ref(M.d, 'records/' + id)); }));
      });
    },
    saveGoals: function(list){
      return need().then(function(){ return M.db.set(M.db.ref(M.d, 'goals'), goalsToObj(list)); });
    }
  };
}

var impl = demo ? makeDemo() : makeFirebase();
impl.LIM = LIM;
impl.defaultGoals = defaultGoals;
impl.isPermission = isPermission;
window.Backend = impl;
})();
