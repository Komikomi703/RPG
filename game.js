(() => {
  "use strict";

  const SAVE_KEY = "yuina-classic-rpg-v2";
  const TILE = 32;
  const MAP_W = 34;
  const MAP_H = 24;
  const VIEW_W = 800;
  const VIEW_H = 480;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const canvas = $("#worldCanvas");
  const ctx = canvas.getContext("2d");
  const enemyCanvas = $("#enemyCanvas");
  const ectx = enemyCanvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ectx.imageSmoothingEnabled = false;

  const terrain = [];
  const blocked = new Set();
  const houseTiles = [];
  const keys = new Set();

  const npcList = [
    { id: "elder", name: "村長", x: 6, y: 15, color: "#d4c7a2", hair: "#d9dde8", dir: "down" },
    { id: "inn", name: "宿屋のミナ", x: 4, y: 18, color: "#f0b481", hair: "#742d55", dir: "right" },
    { id: "girl", name: "村の子ども", x: 9, y: 18, color: "#8ec8ef", hair: "#493452", dir: "left" },
    { id: "guard", name: "見張り番", x: 11, y: 14, color: "#a9b9d9", hair: "#5f4c3b", dir: "left" },
    { id: "daichi", name: "だいち", x: 18, y: 12, color: "#70a679", hair: "#3a2925", dir: "left" }
  ];

  const objects = [
    { id: "chest", x: 24, y: 16, solid: true },
    { id: "forestBoss", x: 27, y: 14, solid: true },
    { id: "tower", x: 29, y: 5, solid: true },
    { id: "shrine", x: 15, y: 8, solid: true },
    { id: "sign", x: 12, y: 15, solid: true }
  ];

  const enemies = {
    bird: { name: "ハネピヨ", hp: 23, attack: 8, defense: 2, exp: 9, gold: 5, type: "bird", color: "#f0cc61" },
    horn: { name: "ツノップ", hp: 31, attack: 10, defense: 3, exp: 13, gold: 8, type: "horn", color: "#b3d47a" },
    puff: { name: "ヨルモコ", hp: 41, attack: 12, defense: 4, exp: 17, gold: 11, type: "puff", color: "#8069b6" },
    mage: { name: "キノコまどう", hp: 36, attack: 11, defense: 3, exp: 16, gold: 12, type: "mage", color: "#db6a73" },
    warden: { name: "森のヌシ", hp: 78, attack: 15, defense: 5, exp: 38, gold: 28, type: "warden", color: "#4d9c67", boss: true },
    eclipse: { name: "月喰いのカゲ", hp: 145, attack: 20, defense: 6, exp: 90, gold: 100, type: "eclipse", color: "#563c83", boss: true }
  };

  const bgmTracks = {
    title: {
      bpm: 82, wave: "triangle", cutoff: 2200,
      melody: [659,0,784,0,880,784,659,0,587,0,659,0,523,0,587,0,659,0,784,0,988,880,784,0,659,587,523,0,587,0,659,0],
      bass: [131,0,0,0,196,0,0,0,174,0,0,0,196,0,0,0,131,0,0,0,220,0,0,0,196,0,174,0,131,0,0,0],
      arp: [262,330,392,330,262,330,392,330,349,440,523,440,392,494,587,494]
    },
    field: {
      bpm: 104, wave: "square", cutoff: 1500,
      melody: [523,0,659,0,784,0,659,0,587,0,659,0,523,0,440,0,494,0,587,0,698,659,587,0,523,0,494,0,440,0,494,0],
      bass: [131,0,196,0,174,0,196,0,147,0,220,0,196,0,165,0,131,0,196,0,220,0,196,0,174,0,147,0,196,0,131,0],
      arp: [262,330,392,523,294,349,440,587,330,392,494,659,294,370,440,587]
    },
    battle: {
      bpm: 150, wave: "square", cutoff: 1900, percussion: true,
      melody: [392,392,0,466,523,0,466,392,349,349,0,392,466,523,587,0],
      bass: [98,0,98,0,117,0,131,0,87,0,87,0,98,0,117,0],
      arp: [196,233,294,233,196,247,311,247]
    },
    boss: {
      bpm: 132, wave: "sawtooth", cutoff: 1250, percussion: true,
      melody: [220,0,277,262,220,0,208,196,220,0,330,311,277,262,247,0],
      bass: [55,0,55,0,69,0,65,0,55,0,82,0,69,0,62,0],
      arp: [110,131,165,196,110,139,165,208]
    },
    ending: {
      bpm: 74, wave: "triangle", cutoff: 2400,
      melody: [523,0,659,0,784,0,1047,0,988,0,880,0,784,0,659,0,587,0,659,0,784,880,784,0,659,0,587,0,523,0,0,0],
      bass: [131,0,0,0,165,0,0,0,196,0,0,0,174,0,0,0,147,0,0,0,196,0,0,0,165,0,147,0,131,0,0,0],
      arp: [262,330,392,523,330,392,494,659,349,440,523,698,392,494,587,784]
    }
  };

  const makeState = () => ({
    started: false,
    x: 7,
    y: 16,
    dir: "up",
    level: 1,
    hp: 46,
    maxHp: 46,
    mp: 18,
    maxMp: 18,
    attack: 11,
    defense: 4,
    exp: 0,
    nextExp: 24,
    gold: 12,
    herbs: 2,
    quest: 0,
    chestOpened: false,
    forestBossDefeated: false,
    bossDefeated: false,
    girlGift: false,
    daichiJoined: false,
    daichiHp: 42,
    daichiMaxHp: 42,
    daichiAttack: 10,
    daichiDefense: 4,
    stepsToBattle: 12
  });

  let state = makeState();
  let mode = "title";
  let battle = null;
  let battleCursor = 0;
  let busy = false;
  let dialogQueue = [];
  let dialogCallback = null;
  let lastMove = 0;
  let soundOn = false;
  let audio = null;
  let sfxBus = null;
  let musicBus = null;
  let bgmTimer = null;
  let bgmName = "title";
  let bgmStep = 0;
  let toastTimer = null;
  let frame = 0;
  let visualX = state.x;
  let visualY = state.y;
  let heroMoving = false;
  let companionX = 18;
  let companionY = 12;
  let companionTargetX = 18;
  let companionTargetY = 12;
  let companionDir = "left";
  let companionMoving = false;

  function buildWorld() {
    for (let y = 0; y < MAP_H; y += 1) {
      terrain[y] = [];
      for (let x = 0; x < MAP_W; x += 1) {
        let tile = "grass";
        if (x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1) tile = "water";
        terrain[y][x] = tile;
      }
    }

    for (let y = 1; y < MAP_H - 1; y += 1) {
      if (y !== 12) terrain[y][18] = "water";
    }
    for (let y = 13; y <= 20; y += 1) {
      for (let x = 2; x <= 12; x += 1) terrain[y][x] = "village";
    }
    for (let x = 3; x <= 29; x += 1) terrain[12][x] = "path";
    terrain[12][18] = "bridge";
    terrain[11][18] = "water";
    terrain[13][18] = "water";
    for (let y = 5; y <= 16; y += 1) terrain[y][29] = "path";
    for (let y = 12; y <= 18; y += 1) terrain[y][10] = "path";
    for (let x = 10; x <= 16; x += 1) terrain[8][x] = "path";
    for (let y = 8; y <= 12; y += 1) terrain[y][15] = "path";

    for (let y = 9; y <= 19; y += 1) {
      for (let x = 20; x <= 28; x += 1) {
        if ((x + y) % 4 !== 0 && terrain[y][x] === "grass") terrain[y][x] = "forest";
      }
    }

    const mountains = [
      [2,3],[3,3],[4,3],[3,4],[4,4],[5,4],[6,4],[4,5],[5,5],
      [9,2],[10,2],[11,2],[12,2],[10,3],[11,3],[12,3],[13,3],
      [21,3],[22,3],[23,3],[24,3],[22,4],[23,4],[24,4],[25,4],
      [4,9],[5,9],[5,10],[6,10],[6,11],[31,16],[31,17],[30,18],[31,18]
    ];
    mountains.forEach(([x, y]) => { terrain[y][x] = "mountain"; });

    addHouse(3, 13, "#8f4c46");
    addHouse(7, 13, "#536a9d");
    addHouse(3, 19, "#a8673e");
    addHouse(8, 19, "#6c506f");
    markBlocked();
  }

  function addHouse(x, y, color) {
    houseTiles.push({ x, y, color });
    for (let yy = y; yy < y + 2; yy += 1) {
      for (let xx = x; xx < x + 3; xx += 1) blocked.add(`${xx},${yy}`);
    }
    blocked.delete(`${x + 1},${y + 1}`);
  }

  function markBlocked() {
    for (let y = 0; y < MAP_H; y += 1) {
      for (let x = 0; x < MAP_W; x += 1) {
        if (["water", "mountain"].includes(terrain[y][x])) blocked.add(`${x},${y}`);
      }
    }
    npcList.forEach((npc) => blocked.add(`${npc.x},${npc.y}`));
    objects.filter((o) => o.solid).forEach((o) => blocked.add(`${o.x},${o.y}`));
  }

  function startGame(fresh) {
    if (fresh) {
      localStorage.removeItem(SAVE_KEY);
      state = makeState();
      state.started = true;
    } else if (!loadGame()) {
      startGame(true);
      return;
    }
    visualX = state.x;
    visualY = state.y;
    if (state.daichiJoined) blocked.delete("18,12");
    if (!state.daichiJoined && state.quest > 0 && state.quest < 4 && state.x > 18) {
      state.x = 17;
      state.y = 12;
      state.dir = "right";
      visualX = state.x;
      visualY = state.y;
    }
    syncCompanionPosition();
    mode = "field";
    $("#titleScreen").classList.add("hidden");
    $("#fieldUI").classList.remove("hidden");
    closeAllWindows();
    updateUI();
    saveGame();
    startBgm("field");
    if (fresh) {
      fadeTransition(() => {
        showDialog("ゆいな", [
          "ここは 月の光に守られた ルナリア村。",
          "だけど今夜は 月が なんだか元気ないみたい……。",
          "まずは 村長さんに 話をきいてみよう！"
        ]);
      });
    } else {
      toast("冒険の書を よみこみました");
    }
  }

  function saveGame(show = false) {
    if (!state.started) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    $("#continueButton").classList.remove("hidden");
    if (show) toast("冒険の書に きろくしました");
  }

  function loadGame() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!saved?.started) return false;
      state = { ...makeState(), ...saved };
      return true;
    } catch {
      return false;
    }
  }

  function updateUI() {
    $("#levelText").textContent = state.level;
    $("#hpText").textContent = state.hp;
    $("#maxHpText").textContent = state.maxHp;
    $("#mpText").textContent = state.mp;
    $("#maxMpText").textContent = state.maxMp;
    $("#goldText").textContent = state.gold;
    $("#battleLevel").textContent = state.level;
    $("#battleHp").textContent = state.hp;
    $("#battleMp").textContent = state.mp;
    $("#daichiHpText").textContent = state.daichiHp;
    $("#daichiMaxHpText").textContent = state.daichiMaxHp;
    $("#daichiBattleHp").textContent = state.daichiHp;
    $("#companionWindow").classList.toggle("hidden", !state.daichiJoined);
    $("#daichiBattleRow").classList.toggle("hidden", !state.daichiJoined);
    const quests = [
      "村長に 話をきこう",
      "東の森で 月のしずくを探す",
      "森のヌシを しずめよう",
      "北東の 月影の塔へ",
      "ルナリアに 平和がもどった！"
    ];
    $("#questText").textContent = state.quest === 1 && state.daichiJoined ? "だいちと 東の森へ向かう" : quests[state.quest];
    $("#placeName").textContent = getPlaceName();
  }

  function getPlaceName() {
    if (state.x <= 12 && state.y >= 13) return "ルナリア村";
    if (state.x >= 20 && state.y >= 9) return "まよいの森";
    if (state.x >= 26 && state.y <= 8) return "月影の塔";
    if (state.x >= 14 && state.x <= 16 && state.y <= 10) return "月守のほこら";
    return "ルナリア平原";
  }

  function closeAllWindows() {
    $("#fieldMenu").classList.add("hidden");
    $("#dialogWindow").classList.add("hidden");
    $("#choiceWindow").classList.add("hidden");
    $("#infoScreen").classList.add("hidden");
  }

  function move(dx, dy, dir) {
    if (mode !== "field" || busy || !$("#dialogWindow").classList.contains("hidden") || !$("#fieldMenu").classList.contains("hidden")) return;
    state.dir = dir;
    const nx = state.x + dx;
    const ny = state.y + dy;
    if (isBlocked(nx, ny)) {
      bumpObject(nx, ny);
      tone(130, .035, "square");
      return;
    }
    const previousX = state.x;
    const previousY = state.y;
    const previousDir = state.dir;
    state.x = nx;
    state.y = ny;
    if (state.daichiJoined) {
      companionTargetX = previousX;
      companionTargetY = previousY;
      companionDir = previousDir;
    }
    state.stepsToBattle -= 1;
    tone(90 + (state.x + state.y) % 2 * 15, .018, "square", .015);
    updateUI();
    if (state.quest > 0 && state.quest < 4 && state.stepsToBattle <= 0 && ["grass", "forest"].includes(terrain[ny][nx])) {
      state.stepsToBattle = rand(9, 15);
      if (Math.random() < .72) {
        const pool = terrain[ny][nx] === "forest" ? ["puff", "mage", "horn"] : ["bird", "horn"];
        startBattle(pool[rand(0, pool.length - 1)]);
      }
    }
    if ((state.x + state.y) % 5 === 0) saveGame();
  }

  function isBlocked(x, y) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return true;
    if (state.forestBossDefeated && x === 27 && y === 14) return false;
    if (state.daichiJoined && x === 18 && y === 12) return false;
    return blocked.has(`${x},${y}`);
  }

  function bumpObject(x, y) {
    const object = objects.find((o) => o.x === x && o.y === y);
    if (object?.id === "forestBoss" && !state.forestBossDefeated && state.quest >= 2) {
      interact();
    }
  }

  function interact() {
    if (mode === "dialog") {
      advanceDialog();
      return;
    }
    if (mode !== "field" || busy) return;
    if (!$("#fieldMenu").classList.contains("hidden")) {
      $("#fieldMenu").classList.add("hidden");
      return;
    }
    const vector = { up: [0,-1], down: [0,1], left: [-1,0], right: [1,0] }[state.dir];
    const tx = state.x + vector[0];
    const ty = state.y + vector[1];
    const npc = npcList.find((n) => n.x === tx && n.y === ty && !(n.id === "daichi" && state.daichiJoined));
    const object = objects.find((o) => o.x === tx && o.y === ty);

    if (npc) {
      talkToNpc(npc);
      return;
    }
    if (object) {
      inspectObject(object);
      return;
    }
    const house = houseTiles.find((h) => tx >= h.x && tx < h.x + 3 && ty >= h.y && ty < h.y + 2);
    if (house) {
      showDialog("ゆいな", ["ドアには『ただいま るすです』と 書いてある。"]);
      return;
    }
    showDialog("ゆいな", [terrain[ty]?.[tx] === "water" ? "水面に 月が きらきら映ってる。" : "あたりを 調べたけれど なにも見つからなかった。"]);
  }

  function talkToNpc(npc) {
    if (npc.id === "daichi") {
      if (state.quest === 0) {
        showDialog("だいち", [
          "この先は まものの気配が濃い。",
          "まずは村長さんの話を 聞いたほうがよさそうだ。俺はここで待ってるよ。"
        ]);
      } else {
        showDialog("だいち", [
          "君が 月守のゆいなだね。俺は 旅の剣士だいち。",
          "川向こうに落ちた光を追って ここまで来たんだ。",
          "ひとりより ふたりのほうが遠くまで行ける。",
          "俺も一緒に戦わせてくれ！"
        ], joinDaichi);
      }
    } else if (npc.id === "elder") {
      if (state.quest === 0) {
        showDialog("村長", [
          "おお ゆいな。よく来てくれた。",
          "月の光をうばう影が 東の森に現れたのじゃ。",
          "森に落ちた『月のしずく』を 見つけておくれ。"
        ], () => {
          state.quest = 1;
          state.gold += 10;
          updateUI();
          saveGame();
          toast("10ゴールドを もらった！");
          fanfare();
        });
      } else if (state.quest < 4) {
        showDialog("村長", [state.quest === 1 ? "東の森は 川をこえた先じゃ。宝箱を探すのじゃぞ。" : state.quest === 2 ? "森の奥から おそろしい気配がする。気をつけるのじゃ。" : "月のしずくを持って 北東の塔へ！ 月を救っておくれ。"]);
      } else {
        showDialog("村長", ["ゆいなこそ ルナリアの新しい月守じゃ！", "おぬしの名は いつまでも語り継がれるじゃろう。"]);
      }
    } else if (npc.id === "inn") {
      showDialog("宿屋のミナ", ["ひと晩 8ゴールドです。休んでいきますか？"], () => {
        showChoices([
          { label: "はい", action: restAtInn },
          { label: "いいえ", action: () => showDialog("宿屋のミナ", ["また いつでもどうぞ！"]) }
        ]);
      });
    } else if (npc.id === "girl") {
      if (!state.girlGift) {
        showDialog("村の子ども", ["ゆいなちゃん ぼうけんに行くの？", "これ あげる！ お母さんには ないしょだよ。"], () => {
          state.herbs += 1;
          state.girlGift = true;
          saveGame();
          toast("月の葉を 1こ もらった！");
          fanfare();
        });
      } else {
        showDialog("村の子ども", ["まものを たおして レベルが上がると もっと強くなるんだって！"]);
      }
    } else {
      showDialog("見張り番", [state.quest === 0 ? "村長が ゆいなを探していたぞ。" : "東の森では 草原より強いまものが出る。宿屋で休んでから行くといい。"]);
    }
  }

  function inspectObject(object) {
    if (object.id === "chest") {
      if (state.chestOpened) {
        showDialog("ゆいな", ["宝箱は からっぽだ。"]);
      } else if (state.quest === 0) {
        showDialog("ゆいな", ["ふしぎな力で フタが開かない。まずは村長に話を聞こう。"]);
      } else {
        showDialog("ゆいな", ["宝箱を 開けた！", "中には『月のしずく』と『星くずの剣』が入っていた！"], () => {
          state.chestOpened = true;
          state.attack += 5;
          state.quest = Math.max(state.quest, 2);
          updateUI();
          saveGame();
          toast("こうげき力が 5 上がった！");
          fanfare();
        });
      }
    } else if (object.id === "forestBoss") {
      if (state.forestBossDefeated) return;
      if (state.quest < 2) {
        showDialog("森の声", ["グルルル……。まだ お前の来る場所ではない……。"]);
      } else {
        showDialog("森のヌシ", ["月のしずくは わたさぬ……！", "森の闇に のまれるがいい！"], () => startBattle("warden"));
      }
    } else if (object.id === "tower") {
      if (state.quest < 3) {
        showDialog("ゆいな", ["塔の扉は 闇の力で閉ざされている。", "月のしずくだけでは 力が足りないみたい……。"]);
      } else if (!state.bossDefeated) {
        showDialog("？？？", ["月守の娘よ……その光を よこせ……。", "永遠の夜を 受け入れるのだ……！"], () => startBattle("eclipse"));
      } else {
        showDialog("ゆいな", ["塔には やさしい月明かりが満ちている。"]);
      }
    } else if (object.id === "shrine") {
      state.mp = state.maxMp;
      updateUI();
      saveGame();
      showDialog("月守のほこら", ["静かな光が ゆいなを包んだ。", "MPが ぜんぶ回復した！"]);
      chime();
    } else if (object.id === "sign") {
      showDialog("立て札", ["← ルナリア村　　東の森 →", "北東：月影の塔"]);
    }
  }

  function restAtInn() {
    if (state.gold < 8) {
      showDialog("宿屋のミナ", ["お金が 足りないみたい。また今度ね。"]);
      return;
    }
    state.gold -= 8;
    state.hp = state.maxHp;
    state.mp = state.maxMp;
    if (state.daichiJoined) state.daichiHp = state.daichiMaxHp;
    updateUI();
    saveGame();
    fadeTransition(() => {
      showDialog("宿屋のミナ", ["おはようございます！ ゆっくり休めましたか？", "HPとMPが ぜんぶ回復した！"]);
      chime();
    });
  }

  function syncCompanionPosition() {
    const opposite = {
      up: [0, 1],
      down: [0, -1],
      left: [1, 0],
      right: [-1, 0]
    }[state.dir] || [0, 1];
    companionX = state.daichiJoined ? state.x + opposite[0] : 18;
    companionY = state.daichiJoined ? state.y + opposite[1] : 12;
    companionTargetX = companionX;
    companionTargetY = companionY;
    companionDir = state.dir;
  }

  function joinDaichi() {
    state.daichiJoined = true;
    state.daichiHp = state.daichiMaxHp;
    blocked.delete("18,12");
    companionX = 18;
    companionY = 12;
    companionTargetX = state.x;
    companionTargetY = state.y;
    companionDir = state.dir;
    updateUI();
    saveGame();
    busy = true;
    const banner = $("#joinBanner");
    banner.classList.remove("hidden");
    fanfare();
    setTimeout(() => {
      banner.classList.add("hidden");
      busy = false;
      toast("だいちが パーティに加わった！");
    }, 2300);
  }

  function showDialog(speaker, lines, callback = null) {
    mode = "dialog";
    dialogQueue = [...lines];
    dialogCallback = callback;
    $("#speakerText").textContent = speaker;
    $("#dialogWindow").classList.remove("hidden");
    $("#fieldMenu").classList.add("hidden");
    advanceDialog(true);
    tone(520, .03, "square");
  }

  function advanceDialog(initial = false) {
    if (!initial) tone(420, .025, "square");
    if (dialogQueue.length) {
      $("#dialogText").textContent = dialogQueue.shift();
      return;
    }
    $("#dialogWindow").classList.add("hidden");
    mode = "field";
    const callback = dialogCallback;
    dialogCallback = null;
    callback?.();
  }

  function showChoices(choices) {
    mode = "choice";
    const host = $("#choiceWindow");
    host.innerHTML = "";
    choices.forEach((choice) => {
      const button = document.createElement("button");
      button.textContent = choice.label;
      button.addEventListener("click", () => {
        host.classList.add("hidden");
        mode = "field";
        choice.action();
      });
      host.appendChild(button);
    });
    host.classList.remove("hidden");
  }

  function toggleMenu() {
    if (mode !== "field" || !$("#dialogWindow").classList.contains("hidden")) return;
    $("#fieldMenu").classList.toggle("hidden");
    tone(440, .04, "square");
  }

  function fieldCommand(command) {
    if (command === "close") {
      $("#fieldMenu").classList.add("hidden");
    } else if (command === "save") {
      saveGame(true);
      $("#fieldMenu").classList.add("hidden");
    } else if (command === "status") {
      showInfo("つよさ", state.daichiJoined ? "ゆいな と だいち" : "ゆいな", `
        <table>
          <tr><td colspan="2" style="color:#efc764">ゆいな</td></tr>
          <tr><td>レベル</td><td>${state.level}</td></tr>
          <tr><td>HP</td><td>${state.hp} / ${state.maxHp}</td></tr>
          <tr><td>MP</td><td>${state.mp} / ${state.maxMp}</td></tr>
          <tr><td>こうげき力</td><td>${state.attack}</td></tr>
          <tr><td>しゅび力</td><td>${state.defense}</td></tr>
          ${state.daichiJoined ? `
          <tr><td colspan="2" style="color:#8ed0a5;padding-top:14px">だいち</td></tr>
          <tr><td>HP</td><td>${state.daichiHp} / ${state.daichiMaxHp}</td></tr>
          <tr><td>こうげき力</td><td>${state.daichiAttack}</td></tr>
          <tr><td>しゅび力</td><td>${state.daichiDefense}</td></tr>` : ""}
          <tr><td>つぎのレベルまで</td><td>${Math.max(0, state.nextExp - state.exp)} EXP</td></tr>
        </table>`);
    } else if (command === "items") {
      showInfo("どうぐ", "もちもの", `
        <div class="item-row"><span>月の葉</span><b>${state.herbs}こ</b></div>
        <div class="item-row"><span>星くずの剣</span><b>${state.chestOpened ? "そうび中" : "―"}</b></div>
        <div class="item-row"><span>月のしずく</span><b>${state.chestOpened ? "たいせつなもの" : "―"}</b></div>`);
    }
  }

  function showInfo(kicker, title, html) {
    mode = "info";
    $("#fieldMenu").classList.add("hidden");
    $("#infoKicker").textContent = kicker;
    $("#infoTitle").textContent = title;
    $("#infoBody").innerHTML = html;
    $("#infoScreen").classList.remove("hidden");
  }

  async function startBattle(enemyKey) {
    if (busy) return;
    busy = true;
    mode = "battle";
    const base = enemies[enemyKey];
    battle = { ...base, key: enemyKey, maxHp: base.hp, guarding: false };
    $("#fadeLayer").classList.add("active");
    await sleep(320);
    $("#fieldUI").classList.add("hidden");
    $("#battleScreen").classList.remove("hidden");
    $("#fadeLayer").classList.remove("active");
    $("#enemyName").textContent = battle.name;
    $("#enemyCount").textContent = battle.boss ? "つよい気配" : "1たい";
    $("#enemyHpFill").style.width = "100%";
    setBattleMessage(`${battle.name}が あらわれた！`);
    updateUI();
    battleCursor = 0;
    updateBattleCursor(false);
    setBattleButtons(false);
    drawEnemy();
    startBgm(battle.boss ? "boss" : "battle");
    battleTheme();
    busy = false;
  }

  async function battleCommand(command) {
    if (mode !== "battle" || busy || !battle) return;
    busy = true;
    setBattleButtons(true);

    if (command === "attack") {
      const damage = Math.max(1, rand(state.attack - 3, state.attack + 4) - battle.defense);
      setBattleMessage(`ゆいなの こうげき！\n${battle.name}に ${damage}のダメージ！`);
      slashSound();
      await enemyHit(damage);
    } else if (command === "spell") {
      if (state.mp < 5) {
        setBattleMessage("MPが たりない！");
        tone(120, .13, "square");
        busy = false;
        setBattleButtons(false);
        return;
      }
      state.mp -= 5;
      updateUI();
      const damage = rand(18, 25) + state.level * 3;
      setBattleMessage(`ゆいなは 月光斬りを はなった！\n${battle.name}に ${damage}のダメージ！`);
      const battleScreen = $("#battleScreen");
      battleScreen.classList.remove("spell-cast");
      void battleScreen.offsetWidth;
      battleScreen.classList.add("spell-cast");
      setTimeout(() => battleScreen.classList.remove("spell-cast"), 600);
      spellSound();
      await enemyHit(damage);
    } else if (command === "guard") {
      battle.guarding = true;
      setBattleMessage("ゆいなは 身をかためている。");
      tone(380, .12, "sine");
      await sleep(600);
    } else if (command === "item") {
      if (state.herbs <= 0) {
        setBattleMessage("月の葉を もっていない！");
        busy = false;
        setBattleButtons(false);
        return;
      }
      const daichiNeedsHelp = state.daichiJoined && state.daichiHp < state.daichiMaxHp;
      if (state.hp === state.maxHp && !daichiNeedsHelp) {
        setBattleMessage("みんなのHPは まんたんだ！");
        busy = false;
        setBattleButtons(false);
        return;
      }
      state.herbs -= 1;
      const healDaichi = daichiNeedsHelp && (state.hp === state.maxHp || state.daichiHp / state.daichiMaxHp < state.hp / state.maxHp);
      const heal = healDaichi ? Math.min(30, state.daichiMaxHp - state.daichiHp) : Math.min(30, state.maxHp - state.hp);
      if (healDaichi) state.daichiHp += heal;
      else state.hp += heal;
      setBattleMessage(`月の葉を つかった！\n${healDaichi ? "だいち" : "ゆいな"}のHPが ${heal}かいふくした！`);
      showBattleNumber(heal, true);
      chime();
      updateUI();
      await sleep(650);
    } else if (command === "flee") {
      if (battle.boss) {
        setBattleMessage("しかし まわりこまれてしまった！");
        await sleep(650);
      } else if (Math.random() < .66) {
        setBattleMessage("ゆいなは うまく にげきれた！");
        tone(520, .1, "square");
        await sleep(650);
        endBattle(false);
        return;
      } else {
        setBattleMessage("しかし うまく にげられなかった！");
        await sleep(650);
      }
    }

    if (!battle || battle.hp <= 0) {
      await winBattle();
      return;
    }
    await daichiTurn();
    if (!battle || battle.hp <= 0) {
      await winBattle();
      return;
    }
    await enemyTurn();
  }

  async function enemyHit(damage) {
    battle.hp = Math.max(0, battle.hp - damage);
    $("#enemyHpFill").style.width = `${Math.max(0, battle.hp / battle.maxHp * 100)}%`;
    showBattleNumber(damage, false);
    enemyCanvas.classList.remove("hit");
    void enemyCanvas.offsetWidth;
    enemyCanvas.classList.add("hit");
    await sleep(600);
  }

  async function daichiTurn() {
    if (!state.daichiJoined || state.daichiHp <= 0 || !battle) return;
    if (state.hp <= state.maxHp * .38 && Math.random() < .42) {
      const heal = Math.min(12 + state.level * 3, state.maxHp - state.hp);
      state.hp += heal;
      setBattleMessage(`だいちは 月風の薬をつかった！\nゆいなのHPが ${heal}かいふくした！`);
      showBattleNumber(heal, true);
      updateUI();
      chime();
      await sleep(750);
      return;
    }
    const damage = Math.max(1, rand(state.daichiAttack - 2, state.daichiAttack + 5) - battle.defense);
    setBattleMessage(`だいちの 追撃！\n${battle.name}に ${damage}のダメージ！`);
    slashSound();
    await enemyHit(damage);
  }

  async function enemyTurn() {
    const targetDaichi = state.daichiJoined && state.daichiHp > 0 && Math.random() < .32;
    const targetDefense = targetDaichi ? state.daichiDefense : state.defense;
    let damage = Math.max(1, rand(battle.attack - 3, battle.attack + 3) - targetDefense);
    if (battle.guarding && !targetDaichi) {
      damage = Math.max(1, Math.floor(damage / 2));
    }
    battle.guarding = false;
    $("#battleCommands").classList.remove("shake");
    void $("#battleCommands").offsetWidth;
    $("#battleCommands").classList.add("shake");
    if (targetDaichi) {
      state.daichiHp = Math.max(0, state.daichiHp - damage);
      setBattleMessage(`${battle.name}の こうげき！\nだいちは ${damage}のダメージを うけた！`);
      const row = $("#daichiBattleRow");
      row.classList.remove("hit");
      void row.offsetWidth;
      row.classList.add("hit");
    } else {
      state.hp = Math.max(0, state.hp - damage);
      setBattleMessage(`${battle.name}の こうげき！\nゆいなは ${damage}のダメージを うけた！`);
      const battleScreen = $("#battleScreen");
      battleScreen.classList.remove("player-hit");
      void battleScreen.offsetWidth;
      battleScreen.classList.add("player-hit");
      setTimeout(() => battleScreen.classList.remove("player-hit"), 360);
    }
    tone(110, .15, "sawtooth");
    updateUI();
    await sleep(850);
    if (state.hp <= 0) {
      await loseBattle();
      return;
    }
    state.mp = Math.min(state.maxMp, state.mp + 1);
    updateUI();
    setBattleMessage("どうする？");
    busy = false;
    setBattleButtons(false);
    saveGame();
  }

  async function winBattle() {
    const won = { ...battle };
    setBattleMessage(`${won.name}を たおした！\n${won.exp}の経験値と ${won.gold}ゴールドを かくとく！`);
    victorySound();
    state.exp += won.exp;
    state.gold += won.gold;
    await sleep(1200);
    let leveled = false;
    while (state.exp >= state.nextExp) {
      state.exp -= state.nextExp;
      state.level += 1;
      state.nextExp = Math.round(state.nextExp * 1.55);
      state.maxHp += 12;
      state.maxMp += 5;
      state.attack += 3;
      state.defense += 2;
      state.hp = state.maxHp;
      state.mp = state.maxMp;
      if (state.daichiJoined) {
        state.daichiMaxHp += 9;
        state.daichiAttack += 3;
        state.daichiDefense += 1;
        state.daichiHp = state.daichiMaxHp;
      }
      leveled = true;
    }
    if (leveled) {
      setBattleMessage(`${state.daichiJoined ? "ゆいなと だいちは" : "ゆいなは"} レベル${state.level}に なった！\nみんなのHP・MPが ぜんぶ回復した！`);
      fanfare();
      await sleep(1200);
    }
    if (won.key === "warden") {
      state.forestBossDefeated = true;
      state.quest = 3;
      blocked.delete("27,14");
      setBattleMessage("森のヌシの闇が はれた！\n月のしずくが まばゆく輝いている。");
      chime();
      await sleep(1200);
    }
    if (won.key === "eclipse") {
      state.bossDefeated = true;
      state.quest = 4;
      updateUI();
      saveGame();
      await endBattle(false);
      $("#endingScreen").classList.remove("hidden");
      mode = "ending";
      startBgm("ending");
      victorySound();
      return;
    }
    updateUI();
    saveGame();
    await endBattle(false);
  }

  async function loseBattle() {
    setBattleMessage("ゆいなは ちからつきた……。\nしかし 月の光が ゆいなを包みこんだ。");
    tone(180, .5, "sine");
    await sleep(1400);
    state.x = 7;
    state.y = 16;
    visualX = state.x;
    visualY = state.y;
    state.hp = Math.ceil(state.maxHp / 2);
    state.mp = Math.ceil(state.maxMp / 2);
    if (state.daichiJoined) state.daichiHp = Math.ceil(state.daichiMaxHp / 2);
    state.gold = Math.floor(state.gold / 2);
    updateUI();
    saveGame();
    await endBattle(false);
    showDialog("村長", ["おお ゆいな！ よくぞ戻った。", "あきらめなければ 道はかならず開けるぞ。"]);
  }

  async function endBattle() {
    busy = true;
    const finalBattle = battle?.key === "eclipse";
    $("#fadeLayer").classList.add("active");
    await sleep(320);
    $("#battleScreen").classList.add("hidden");
    $("#fieldUI").classList.remove("hidden");
    $("#fadeLayer").classList.remove("active");
    battle = null;
    mode = "field";
    if (!finalBattle) startBgm("field");
    busy = false;
  }

  function setBattleMessage(text) {
    $("#battleMessage").textContent = text;
  }

  function setBattleButtons(disabled) {
    $$("#battleCommands button").forEach((b) => { b.disabled = disabled; });
    if (!disabled) updateBattleCursor(false);
  }

  function updateBattleCursor(playSound = true) {
    const buttons = $$("#battleCommands button");
    battleCursor = (battleCursor + buttons.length) % buttons.length;
    buttons.forEach((button, index) => {
      const selected = index === battleCursor;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-selected", String(selected));
    });
    if (playSound) tone(460, .035, "square");
  }

  function moveBattleCursor(delta) {
    battleCursor += delta;
    updateBattleCursor(true);
  }

  function confirmBattleCursor() {
    const button = $$("#battleCommands button")[battleCursor];
    if (button && !button.disabled) battleCommand(button.dataset.command);
  }

  function showBattleNumber(value, heal) {
    const number = $("#damageNumber");
    number.textContent = heal ? `+${value}` : value;
    number.classList.remove("show", "heal");
    void number.offsetWidth;
    if (heal) number.classList.add("heal");
    number.classList.add("show");
  }

  function fadeTransition(callback) {
    $("#fadeLayer").classList.add("active");
    setTimeout(() => {
      callback?.();
      $("#fadeLayer").classList.remove("active");
    }, 360);
  }

  function drawWorld() {
    frame += 1;
    visualX += (state.x - visualX) * .28;
    visualY += (state.y - visualY) * .28;
    if (Math.abs(state.x - visualX) < .008) visualX = state.x;
    if (Math.abs(state.y - visualY) < .008) visualY = state.y;
    heroMoving = visualX !== state.x || visualY !== state.y;
    if (state.daichiJoined) {
      companionX += (companionTargetX - companionX) * .24;
      companionY += (companionTargetY - companionY) * .24;
      if (Math.abs(companionTargetX - companionX) < .008) companionX = companionTargetX;
      if (Math.abs(companionTargetY - companionY) < .008) companionY = companionTargetY;
      companionMoving = companionX !== companionTargetX || companionY !== companionTargetY;
    }
    const maxCamX = MAP_W * TILE - VIEW_W;
    const maxCamY = MAP_H * TILE - VIEW_H;
    const camX = clamp(visualX * TILE + TILE / 2 - VIEW_W / 2, 0, maxCamX);
    const camY = clamp(visualY * TILE + TILE / 2 - VIEW_H / 2, 0, maxCamY);
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    const startX = Math.floor(camX / TILE);
    const startY = Math.floor(camY / TILE);
    const endX = Math.min(MAP_W, startX + Math.ceil(VIEW_W / TILE) + 1);
    const endY = Math.min(MAP_H, startY + Math.ceil(VIEW_H / TILE) + 1);
    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) drawTile(terrain[y][x], x * TILE - camX, y * TILE - camY, x, y);
    }

    houseTiles.forEach((house) => drawHouse(house, camX, camY));
    objects.forEach((object) => {
      if (object.id === "forestBoss" && state.forestBossDefeated) return;
      drawObject(object, object.x * TILE - camX, object.y * TILE - camY);
    });
    npcList.forEach((npc) => {
      if (npc.id === "daichi" && state.daichiJoined) return;
      drawPerson(npc.x * TILE - camX, npc.y * TILE - camY, npc.color, npc.hair, npc.dir, false);
    });
    if (state.daichiJoined) {
      drawPerson(companionX * TILE - camX, companionY * TILE - camY, "#70a679", "#3a2925", companionDir, false, true);
    }
    drawPerson(visualX * TILE - camX, visualY * TILE - camY, "#f4eee0", "#192342", state.dir, true);
    drawMoonMotes();
    requestAnimationFrame(drawWorld);
  }

  function drawMoonMotes() {
    if (mode === "title" || mode === "battle" || mode === "ending") return;
    ctx.save();
    for (let i = 0; i < 15; i += 1) {
      const speed = .08 + (i % 4) * .025;
      const x = (i * 137 + frame * speed) % (VIEW_W + 40) - 20;
      const y = (i * 83 + Math.sin((frame + i * 19) / 35) * 16) % VIEW_H;
      const pulse = .25 + Math.abs(Math.sin((frame + i * 13) / 24)) * .55;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = i % 3 ? "#d9f8ff" : "#ffe59b";
      ctx.fillRect(Math.round(x), Math.round(y), i % 4 === 0 ? 3 : 2, i % 4 === 0 ? 3 : 2);
    }
    ctx.restore();
  }

  function drawTile(tile, sx, sy, x, y) {
    if (tile === "grass") {
      ctx.fillStyle = (x + y) % 2 ? "#4e9a4f" : "#489247";
      ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = "#347e3f";
      const seed = (x * 17 + y * 31) % 22;
      ctx.fillRect(sx + 4 + seed, sy + 7, 2, 5);
      ctx.fillRect(sx + 7 + seed, sy + 9, 2, 3);
    } else if (tile === "forest") {
      ctx.fillStyle = "#397d42";
      ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = "#174d32";
      ctx.fillRect(sx + 4, sy + 7, 24, 20);
      ctx.fillStyle = "#28683a";
      ctx.fillRect(sx + 1, sy + 11, 30, 10);
      ctx.fillStyle = "#64a94e";
      ctx.fillRect(sx + 7, sy + 5, 9, 5);
      ctx.fillStyle = "#563f2c";
      ctx.fillRect(sx + 14, sy + 23, 4, 9);
    } else if (tile === "water") {
      ctx.fillStyle = "#287ab5";
      ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = "#55a9d3";
      const shift = Math.floor(frame / 18 + x * 3 + y) % 16;
      ctx.fillRect(sx + shift, sy + 8, 12, 2);
      ctx.fillRect(sx + ((shift + 11) % 20), sy + 22, 10, 2);
    } else if (tile === "mountain") {
      ctx.fillStyle = "#5a784e";
      ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = "#5b6171";
      ctx.beginPath();
      ctx.moveTo(sx + 2, sy + 30);
      ctx.lineTo(sx + 16, sy + 3);
      ctx.lineTo(sx + 31, sy + 30);
      ctx.fill();
      ctx.fillStyle = "#c9d1d5";
      ctx.beginPath();
      ctx.moveTo(sx + 10, sy + 14);
      ctx.lineTo(sx + 16, sy + 3);
      ctx.lineTo(sx + 22, sy + 14);
      ctx.lineTo(sx + 17, sy + 11);
      ctx.lineTo(sx + 14, sy + 15);
      ctx.fill();
    } else if (tile === "path") {
      ctx.fillStyle = "#b8a66c";
      ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = "#9d8c5c";
      ctx.fillRect(sx + ((x * 7 + y * 3) % 22), sy + 8, 4, 3);
      ctx.fillRect(sx + ((x * 11 + y) % 24), sy + 23, 5, 2);
    } else if (tile === "bridge") {
      ctx.fillStyle = "#236fa9";
      ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = "#a56b3f";
      ctx.fillRect(sx, sy + 3, TILE, 26);
      ctx.fillStyle = "#633c2c";
      for (let i = 2; i < TILE; i += 7) ctx.fillRect(sx + i, sy + 4, 2, 24);
    } else {
      ctx.fillStyle = (x + y) % 2 ? "#cfb87c" : "#c6ad73";
      ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = "rgba(103,82,53,.2)";
      ctx.fillRect(sx + 3, sy + 6, 4, 3);
    }
  }

  function drawHouse(house, camX, camY) {
    const x = house.x * TILE - camX;
    const y = house.y * TILE - camY;
    ctx.fillStyle = "#493528";
    ctx.fillRect(x + 5, y + 24, 86, 38);
    ctx.fillStyle = house.color;
    ctx.beginPath();
    ctx.moveTo(x, y + 27);
    ctx.lineTo(x + 47, y + 2);
    ctx.lineTo(x + 96, y + 27);
    ctx.fill();
    ctx.fillStyle = "#f1d188";
    ctx.fillRect(x + 13, y + 36, 16, 15);
    ctx.fillStyle = "#70503c";
    ctx.fillRect(x + 41, y + 38, 14, 24);
    ctx.fillStyle = "#211913";
    ctx.fillRect(x + 44, y + 42, 3, 3);
    ctx.fillStyle = "#d8a961";
    ctx.fillRect(x + 66, y + 36, 16, 15);
  }

  function drawObject(object, x, y) {
    if (object.id === "chest") {
      ctx.fillStyle = state.chestOpened ? "#5c4937" : "#7e3e28";
      ctx.fillRect(x + 5, y + 12, 23, 16);
      ctx.fillStyle = "#d8a64d";
      ctx.fillRect(x + 5, y + 17, 23, 3);
      ctx.fillRect(x + 15, y + 17, 4, 8);
      if (state.chestOpened) ctx.fillRect(x + 5, y + 7, 23, 5);
    } else if (object.id === "forestBoss") {
      ctx.fillStyle = "#193d2a";
      ctx.fillRect(x + 5, y + 8, 22, 20);
      ctx.fillStyle = "#75b55c";
      ctx.fillRect(x + 1, y + 5, 9, 12);
      ctx.fillRect(x + 22, y + 5, 9, 12);
      ctx.fillStyle = "#f1b457";
      ctx.fillRect(x + 9, y + 13, 4, 3);
      ctx.fillRect(x + 20, y + 13, 4, 3);
    } else if (object.id === "tower") {
      ctx.fillStyle = "#424967";
      ctx.fillRect(x + 3, y + 3, 26, 29);
      ctx.fillStyle = "#8d91a8";
      ctx.fillRect(x, y, 8, 9);
      ctx.fillRect(x + 12, y, 8, 9);
      ctx.fillRect(x + 24, y, 8, 9);
      ctx.fillStyle = "#1b1831";
      ctx.fillRect(x + 11, y + 20, 10, 12);
      ctx.fillStyle = "#d9b85e";
      ctx.fillRect(x + 14, y + 7, 4, 4);
    } else if (object.id === "shrine") {
      ctx.fillStyle = "#874f4e";
      ctx.fillRect(x + 3, y + 4, 26, 5);
      ctx.fillRect(x + 7, y + 9, 4, 23);
      ctx.fillRect(x + 22, y + 9, 4, 23);
      ctx.fillStyle = "#d9a45e";
      ctx.fillRect(x, y + 1, 32, 3);
    } else {
      ctx.fillStyle = "#6b4b2d";
      ctx.fillRect(x + 14, y + 9, 5, 23);
      ctx.fillStyle = "#c7aa6c";
      ctx.fillRect(x + 4, y + 4, 25, 14);
      ctx.fillStyle = "#775832";
      ctx.fillRect(x + 8, y + 8, 17, 2);
    }
  }

  function drawPerson(x, y, body, hair, dir, hero, companion = false) {
    const bob = (hero && heroMoving) || (companion && companionMoving) ? Math.floor(frame / 4) % 2 : 0;
    ctx.fillStyle = "rgba(0,0,0,.24)";
    ctx.fillRect(x + 7, y + 27, 18, 4);
    ctx.fillStyle = hair;
    ctx.fillRect(x + 9, y + 3 + bob, 14, 10);
    ctx.fillStyle = hero ? "#e8c19a" : "#d9aa88";
    ctx.fillRect(x + 11, y + 9 + bob, 10, 8);
    ctx.fillStyle = body;
    ctx.fillRect(x + 7, y + 16 + bob, 18, 11);
    if (hero) {
      ctx.fillStyle = "#243767";
      ctx.fillRect(x + 7, y + 16 + bob, 6, 11);
      ctx.fillStyle = "#e9c967";
      ctx.fillRect(x + 15, y + 16 + bob, 3, 11);
    } else if (companion) {
      ctx.fillStyle = "#284c3b";
      ctx.fillRect(x + 7, y + 16 + bob, 6, 11);
      ctx.fillStyle = "#e3a657";
      ctx.fillRect(x + 13, y + 16 + bob, 4, 7);
      ctx.fillStyle = "#c8d8cf";
      ctx.fillRect(x + 24, y + 16 + bob, 2, 13);
    }
    ctx.fillStyle = "#342b30";
    ctx.fillRect(x + 8, y + 27, 6, 4);
    ctx.fillRect(x + 19, y + 27, 6, 4);
    if (dir !== "up") {
      ctx.fillStyle = "#202031";
      const eyeY = y + 11 + bob;
      if (dir === "left") ctx.fillRect(x + 11, eyeY, 2, 2);
      else if (dir === "right") ctx.fillRect(x + 19, eyeY, 2, 2);
      else {
        ctx.fillRect(x + 13, eyeY, 2, 2);
        ctx.fillRect(x + 19, eyeY, 2, 2);
      }
    }
  }

  function drawEnemy() {
    if (!battle) return;
    ectx.clearRect(0, 0, 420, 240);
    const t = battle.type;
    const c = battle.color;
    ectx.save();
    ectx.translate(210, 122);
    ectx.shadowColor = "rgba(0,0,0,.45)";
    ectx.shadowBlur = 10;
    ectx.shadowOffsetY = 12;
    if (t === "bird") {
      pixelEllipse(0, 10, 58, 46, c);
      pixelEllipse(-45, 0, 38, 20, "#e7b84c");
      pixelEllipse(45, 0, 38, 20, "#e7b84c");
      triangle(-9, -27, 0, -50, 10, -26, "#dc7256");
      eyes(-16, 2, 32, "#252137");
      triangle(0, 11, 15, 17, 0, 23, "#d5733f");
      legs();
    } else if (t === "horn") {
      pixelEllipse(0, 10, 62, 52, c);
      triangle(-25,-28,-8,-67,1,-27,"#eee0b5");
      triangle(25,-28,8,-67,-1,-27,"#eee0b5");
      pixelEllipse(-42, 12, 26, 16, c);
      pixelEllipse(42, 12, 26, 16, c);
      eyes(-17, 0, 34, "#2b2633");
      ectx.fillStyle = "#e98f8f";
      ectx.fillRect(-5, 15, 10, 6);
      legs();
    } else if (t === "puff") {
      for (let a = 0; a < 8; a += 1) {
        const angle = a * Math.PI / 4;
        pixelEllipse(Math.cos(angle) * 43, Math.sin(angle) * 32, 34, 31, a % 2 ? c : "#6c589e");
      }
      pixelEllipse(0, 5, 65, 55, c);
      eyes(-18, -2, 36, "#ffd26a");
      ectx.fillStyle = "#2c203d";
      ectx.fillRect(-14, 20, 28, 7);
    } else if (t === "mage") {
      pixelEllipse(0, 22, 58, 45, "#e2d4ac");
      ectx.fillStyle = c;
      ectx.fillRect(-45, -15, 90, 20);
      triangle(-44,-14,0,-70,45,-14,c);
      ectx.fillStyle = "#f4e7bc";
      ectx.fillRect(-24, 3, 48, 38);
      eyes(-14, 12, 28, "#2b2134");
      ectx.fillStyle = "#714259";
      ectx.fillRect(-8, 29, 16, 5);
    } else if (t === "warden") {
      pixelEllipse(0, 12, 78, 64, c);
      for (let i = -1; i <= 1; i += 2) {
        ectx.fillStyle = "#275c39";
        ectx.fillRect(i * 40 - (i < 0 ? 18 : 0), -42, 18, 58);
        ectx.fillStyle = "#69b66e";
        ectx.fillRect(i * 55 - 12, -36, 25, 16);
      }
      triangle(-20,-34,-5,-73,7,-35,"#d9c48d");
      triangle(20,-34,5,-73,-7,-35,"#d9c48d");
      eyes(-22, 0, 44, "#ffbd58");
      ectx.fillStyle = "#193522";
      ectx.fillRect(-22, 23, 44, 9);
    } else {
      for (let a = 0; a < 10; a += 1) {
        const angle = a * Math.PI / 5;
        triangle(Math.cos(angle)*52, Math.sin(angle)*42, Math.cos(angle)*88, Math.sin(angle)*72, Math.cos(angle+.18)*48, Math.sin(angle+.18)*39, "#392657");
      }
      pixelEllipse(0, 0, 82, 74, c);
      ectx.fillStyle = "#1b132b";
      ectx.fillRect(-52, -13, 104, 30);
      ectx.fillStyle = "#ff5f76";
      ectx.fillRect(-30, -5, 18, 8);
      ectx.fillRect(12, -5, 18, 8);
      ectx.fillStyle = "#bf9bdb";
      ectx.fillRect(-18, 26, 36, 6);
    }
    ectx.restore();
  }

  function pixelEllipse(x, y, w, h, color) {
    ectx.fillStyle = color;
    ectx.beginPath();
    ectx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    ectx.fill();
  }
  function triangle(x1,y1,x2,y2,x3,y3,color) {
    ectx.fillStyle = color;
    ectx.beginPath();
    ectx.moveTo(x1,y1); ectx.lineTo(x2,y2); ectx.lineTo(x3,y3); ectx.fill();
  }
  function eyes(x, y, gap, color) {
    ectx.fillStyle = color;
    ectx.fillRect(x - 5, y - 4, 11, 9);
    ectx.fillRect(x + gap - 5, y - 4, 11, 9);
    ectx.fillStyle = "#fff4c7";
    ectx.fillRect(x - 2, y - 2, 3, 3);
    ectx.fillRect(x + gap - 2, y - 2, 3, 3);
  }
  function legs() {
    ectx.fillStyle = "#6d4931";
    ectx.fillRect(-28, 35, 8, 23);
    ectx.fillRect(20, 35, 8, 23);
    ectx.fillRect(-35, 54, 16, 5);
    ectx.fillRect(20, 54, 16, 5);
  }

  function toast(text) {
    const host = $("#toast");
    host.textContent = text;
    host.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => host.classList.remove("show"), 2200);
  }

  function initAudio() {
    if (!audio) {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      sfxBus = audio.createGain();
      musicBus = audio.createGain();
      sfxBus.gain.value = .78;
      musicBus.gain.value = .62;
      sfxBus.connect(audio.destination);
      musicBus.connect(audio.destination);
    }
    if (audio.state === "suspended") audio.resume();
  }
  function tone(freq, duration = .08, type = "square", volume = .035, delay = 0) {
    if (!soundOn) return;
    initAudio();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(.0001, audio.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(volume, audio.currentTime + delay + .005);
    gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + delay + duration);
    osc.connect(gain).connect(sfxBus);
    osc.start(audio.currentTime + delay);
    osc.stop(audio.currentTime + delay + duration + .02);
  }

  function musicNote(freq, duration, type, volume, when, cutoff) {
    if (!soundOn || !audio || !freq) return;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const filter = audio.createBiquadFilter();
    osc.type = type;
    osc.frequency.value = freq;
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    filter.Q.value = .45;
    gain.gain.setValueAtTime(.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + .012);
    gain.gain.setValueAtTime(volume * .7, when + Math.max(.02, duration * .56));
    gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
    osc.connect(filter).connect(gain).connect(musicBus);
    osc.start(when);
    osc.stop(when + duration + .03);
  }

  function musicKick(when) {
    if (!soundOn || !audio) return;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, when);
    osc.frequency.exponentialRampToValueAtTime(48, when + .11);
    gain.gain.setValueAtTime(.05, when);
    gain.gain.exponentialRampToValueAtTime(.0001, when + .13);
    osc.connect(gain).connect(musicBus);
    osc.start(when);
    osc.stop(when + .14);
  }

  function playBgmStep() {
    if (!soundOn || !audio) return;
    const track = bgmTracks[bgmName];
    if (!track) return;
    const stepSeconds = 60 / track.bpm / 2;
    const when = audio.currentTime + .018;
    const melody = track.melody[bgmStep % track.melody.length];
    const bass = track.bass[bgmStep % track.bass.length];
    const arp = track.arp[bgmStep % track.arp.length];
    musicNote(melody, stepSeconds * .88, track.wave, bgmName === "boss" ? .026 : .022, when, track.cutoff);
    musicNote(bass, stepSeconds * 1.75, "triangle", .025, when, 720);
    musicNote(arp, stepSeconds * .72, "triangle", bgmName === "battle" || bgmName === "boss" ? .009 : .012, when, 1800);
    if (track.percussion && bgmStep % 4 === 0) musicKick(when);
    bgmStep += 1;
  }

  function startBgm(name) {
    if (bgmTimer) clearInterval(bgmTimer);
    bgmTimer = null;
    bgmName = name;
    bgmStep = 0;
    if (!soundOn) return;
    initAudio();
    const stepMs = 60000 / bgmTracks[name].bpm / 2;
    playBgmStep();
    bgmTimer = setInterval(playBgmStep, stepMs);
  }

  function stopBgm() {
    if (bgmTimer) clearInterval(bgmTimer);
    bgmTimer = null;
  }

  function bgmForCurrentMode() {
    if (mode === "battle") return battle?.boss ? "boss" : "battle";
    if (mode === "ending") return "ending";
    if (mode === "title") return "title";
    return "field";
  }

  function notes(list, duration = .1, type = "square") { list.forEach((n, i) => tone(n, duration, type, .035, i * .06)); }
  function fanfare() { notes([523,659,784,1047], .16); }
  function chime() { notes([440,554,659], .18, "sine"); }
  function slashSound() { notes([280,190], .08, "sawtooth"); }
  function spellSound() { notes([392,523,659,880], .11, "square"); }
  function victorySound() { notes([523,659,784,659,784,1047], .15); }
  function battleTheme() { notes([196,196,233,262], .12, "sawtooth"); }

  function toggleSound() {
    soundOn = !soundOn;
    $("#soundButton").classList.toggle("on", soundOn);
    $("#soundButton b").textContent = soundOn ? "ON" : "OFF";
    if (soundOn) {
      initAudio();
      startBgm(bgmForCurrentMode());
      chime();
      toast("オリジナルBGM ON");
    } else {
      stopBgm();
      toast("BGM・効果音 OFF");
    }
  }

  function bindEvents() {
    $("#newGameButton").addEventListener("click", () => startGame(true));
    $("#continueButton").addEventListener("click", () => startGame(false));
    $("#menuButton").addEventListener("click", toggleMenu);
    $("#actionButton").addEventListener("click", interact);
    $("#soundButton").addEventListener("click", toggleSound);
    $("#fullscreenButton").addEventListener("click", () => {
      if (!document.fullscreenElement) $("#gameShell").requestFullscreen?.();
      else document.exitFullscreen?.();
    });
    $("#infoCloseButton").addEventListener("click", () => {
      $("#infoScreen").classList.add("hidden");
      mode = "field";
    });
    $("#endingCloseButton").addEventListener("click", () => {
      $("#endingScreen").classList.add("hidden");
      mode = "field";
      startBgm("field");
      showDialog("ゆいな", ["月は もう大丈夫。", "でも 私の冒険は まだまだ続くよ！"]);
    });
    $$("#fieldMenu button").forEach((button) => button.addEventListener("click", () => fieldCommand(button.dataset.fieldCommand)));
    $$("#battleCommands button").forEach((button, index) => {
      button.addEventListener("pointerenter", () => {
        if (mode !== "battle" || busy) return;
        battleCursor = index;
        updateBattleCursor(false);
      });
      button.addEventListener("focus", () => {
        battleCursor = index;
        updateBattleCursor(false);
      });
      button.addEventListener("click", () => {
        battleCursor = index;
        updateBattleCursor(false);
        battleCommand(button.dataset.command);
      });
    });
    $$(".dpad button").forEach((button) => {
      const dirs = { up:[0,-1,"up"], down:[0,1,"down"], left:[-1,0,"left"], right:[1,0,"right"] };
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        const d = dirs[button.dataset.dir];
        move(...d);
      });
    });

    document.addEventListener("keydown", (event) => {
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","Enter"].includes(event.key)) event.preventDefault();
      if (event.repeat) return;
      const key = event.key.toLowerCase();
      if (mode === "field") {
        if (key === "arrowup" || key === "w") move(0,-1,"up");
        else if (key === "arrowdown" || key === "s") move(0,1,"down");
        else if (key === "arrowleft" || key === "a") move(-1,0,"left");
        else if (key === "arrowright" || key === "d") move(1,0,"right");
        else if (key === "enter" || key === " ") interact();
        else if (key === "m" || key === "escape") toggleMenu();
      } else if (mode === "dialog" && (key === "enter" || key === " ")) {
        interact();
      } else if (mode === "battle" && !busy) {
        if (["1","2","3","4","5"].includes(key)) {
          battleCursor = Number(key) - 1;
          updateBattleCursor(false);
          confirmBattleCursor();
        } else if (key === "arrowup" || key === "arrowleft" || key === "w" || key === "a") {
          moveBattleCursor(-1);
        } else if (key === "arrowdown" || key === "arrowright" || key === "s" || key === "d") {
          moveBattleCursor(1);
        } else if (key === "enter" || key === " ") {
          confirmBattleCursor();
        }
      }
    });
  }

  buildWorld();
  if (localStorage.getItem(SAVE_KEY)) $("#continueButton").classList.remove("hidden");
  bindEvents();
  drawWorld();
})();
