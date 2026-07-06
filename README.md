# ゆいなの大冒険 ～月のしずく～

ゆいなと旅の仲間だいちが冒険する、オリジナルの王道ブラウザRPGです。

## VS Codeで起動する

1. `yuina-rpg.code-workspace` をVS Codeで開きます。
2. `F5`キーを押します。
3. 「ゆいなRPGを起動」が選ばれていることを確認します。
4. 開発サーバーとブラウザが自動で起動します。

`Ctrl + Shift + B`でサーバーだけを起動することもできます。

### ターミナルから起動する場合

```powershell
npm start
```

ブラウザで <http://127.0.0.1:5500> を開いてください。

外部パッケージは使用していないため、`npm install`は不要です。Node.js 18以上が必要です。

## ファイル構成

```text
yuina-rpg/
├─ .vscode/               VS Codeの実行設定
├─ index.html             ゲーム画面
├─ style.css              デザイン・アニメーション
├─ game.js                マップ・戦闘・物語・BGM
├─ server.js              開発用ローカルサーバー
├─ package.json           npmコマンド
└─ yuina-rpg.code-workspace
```

## 主な編集場所

- ストーリーや敵の数値：`game.js`
- 画面レイアウト：`index.html`
- 色や演出：`style.css`

## 操作方法

- 矢印キー / WASD：移動・選択
- Enter / Space：決定・会話・調べる
- M / Esc：メニュー
- 戦闘中の数字キー1～5：コマンドを直接選択

セーブデータはブラウザの`localStorage`へ自動保存されます。
