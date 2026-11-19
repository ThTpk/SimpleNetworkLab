# skill-patches

สิ่งที่ต้องเพิ่มเข้า [SIMULAB](https://github.com/0xKapri) ที่ `~/.claude/skills/simulab`
ก่อนจะ build แล็บในรีโปนี้ใหม่ได้ มีสองเรื่อง: **ชุด asset เครือข่าย** กับ **ฟอนต์ไทย**

What this lab needs added to a stock SIMULAB install: a network asset family and a bundled Thai font.

---

## 1 · ชุด asset เครือข่าย

```bash
cp assets/red.js ~/.claude/skills/simulab/assets/red.js
```

`build.mjs` จะหยิบไฟล์ใน `assets/` ทุกไฟล์เข้า bundle เองอยู่แล้ว ไม่ต้องแก้อะไรเพิ่ม

ข้างในมี: `canalCola` (คิวเป็นช่องแก้วยาว พร้อมไม้บรรทัด ms/แพ็กเก็ต), `routerCola`,
`cintaRed` (สายพานป้อนสองช่อง), `cestoDescarte` (ถังแพ็กเก็ตที่ถูกทิ้ง), `tvRed`,
`laptopRed`, `posteWan` และฟังก์ชันวาดแพ็กเก็ตที่เคลื่อนที่

ถ้าอยากให้โผล่ใน `CATALOGO.md` ด้วย ให้เพิ่ม `'red'` ลงใน `FILES` ของ `tools/catalog.mjs`
แล้วรัน `node tools/catalog.mjs`

---

## 2 · ฟอนต์ไทย

kit เดิมฝังมาแต่ฟอนต์ละติน (JetBrains Mono, Silkscreen, Caveat) ข้อความไทยจึงตกไปใช้
ฟอนต์ของระบบ ซึ่งทำให้คำว่า "ไฟล์เดียว เปิดออฟไลน์ได้" ไม่จริงอีกต่อไป
แก้ด้วยการฝัง **Noto Sans Thai** (SIL OFL, variable weight, เฉพาะ subset ไทย ~27 KB)

```bash
cp fonts/noto-sans-thai-thai-400-700-var.woff2 ~/.claude/skills/simulab/kit/fonts/
cp fonts/LICENSE-noto-sans-thai.txt            ~/.claude/skills/simulab/kit/fonts/
```

แล้วแก้สามจุด — **ต้องครบทั้งสาม** ไม่งั้นเฟรมแรก ๆ ข้อความไทยจะหายหรือหน้าเว็บ
จะยังต้องพึ่งฟอนต์ของเครื่องผู้ชม

### `tools/build.mjs` — ฝัง `@font-face` เข้าไฟล์ HTML

เติมท้าย array `fonts`:

```js
['Caveat', 700, 'caveat-latin-700-normal.woff2'],
['Noto Sans Thai', '100 900', 'noto-sans-thai-thai-400-700-var.woff2']
```

> น้ำหนักเป็นสตริง `'100 900'` เพราะเป็น variable font ไฟล์เดียวครอบทั้ง 400 และ 700

### `assets/materiales.js` — ต่อท้าย font stack

```js
const FONT_MONO = 'JetBrains Mono, "Noto Sans Thai", monospace';
```

ตัวอักษรละตินยังมาจาก JetBrains Mono เหมือนเดิม Chrome จะ fallback เป็นราย glyph
ให้เฉพาะตัวไทยเท่านั้น

### `kit/main.js` — preload ใน `boot()`

```js
await Promise.all([..., '400 20px "Noto Sans Thai"', '700 20px "Noto Sans Thai"'].map(f => document.fonts.load(f)));
```

`font-display: block` + ยังไม่ได้ preload = เฟรมแรก ๆ ข้อความไทยจะว่าง

### ข้อควรรู้

`DEMO.title` วาดด้วย **Silkscreen** ซึ่งไม่มี glyph ไทย — ให้ใช้คำละตินเสมอ
(แล็บนี้ใช้ `'NETWORK'`) ส่วน `tagline`, `plate`, `chips`, `caption` ใช้ `FONT_MONO` จึงเป็นไทยได้

---

## 3 · ทำให้ tool รับ lab นอกโฟลเดอร์ skill ได้ (ไม่บังคับ)

SIMULAB บอกให้เก็บ lab ไว้ในโปรเจกต์ของเราเอง ไม่ใช่ใน `SKILL_DIR`
แต่ `tools/cover.mjs` เดิม resolve path เป็น `demos/<ชื่อ>` เสมอ จึงใช้กับ lab นอก skill ไม่ได้
แก้ให้รับ path ไหนก็ได้:

```js
const demos = args.length
  ? args.map(a => resolve(a))
  : readdirSync(join(root, 'demos')).filter(...).map(d => join(root, 'demos', d));
```

แล้วใน loop เปลี่ยน `join(root, 'demos', d, ...)` ทุกจุดเป็น `join(dir, ...)`

---

## ลิขสิทธิ์

`assets/red.js` เขียนขึ้นสำหรับแล็บนี้ ใช้ระบบ asset ของ KAPRI LAB (MIT)
`fonts/noto-sans-thai-thai-400-700-var.woff2` คือ Noto Sans Thai ภายใต้
SIL Open Font License 1.1 — ตัวสัญญาอนุญาตอยู่ใน `fonts/LICENSE-noto-sans-thai.txt`
