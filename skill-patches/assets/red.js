// ---------------------------------------------------------------------------
// Red / Network: the router's queue drawn as a straight glass channel (a queue is a line),
// a two-lane feed conveyor, the router it drains into, the drop bin, a TV and a laptop.
// (Lab N1 · คิวในเราเตอร์). World cm, flow runs along +x toward the viewer's right, z up.
// The glass channel is a cutaway of the buffer inside the router, not a separate machine.
// Generic home gear of our own design (no real brand).
// ---------------------------------------------------------------------------
const RC = {
  glass: { light: '#eaf6fa', mid: '#cbe4eb', dark: '#9cbfca' },
  body: { light: '#4a5160', mid: '#333a46', dark: '#22262f' },
  deck: { light: '#5d6373', mid: '#424857', dark: '#2c313c' },
  vid: { light: '#e4fb9a', mid: '#c8f04a', dark: '#8fb424' },     // แพ็กเก็ตวิดีโอ
  dl: { light: '#ffe6ad', mid: '#ffcf6b', dark: '#c99c33' },      // แพ็กเก็ตดาวน์โหลด
  bin: { light: '#ff9e93', mid: '#ef6a5c', dark: '#b84436' },
  tv: { light: '#3a3f4b', mid: '#282c35', dark: '#1a1d24' },
  lap: { light: '#f6f7f9', mid: '#d7dbe1', dark: '#a7aebb' },
  post: { light: '#ffd79a', mid: '#f0a93f', dark: '#b87a1d' },
};
// geometry shared by the assets and by the demo that draws the moving packets
const RG = {
  belt: { x0: -28.5, x1: -20.8, z: 10.4, lane: [-1.7, 1.7], half: 1.45 },
  ch: { x0: -18, x1: 2, y0: -3.6, y1: 3.6, z0: 5.6, z1: 10.4, in: 0.45 },  // คิว = ช่องแก้วยาว 20 ซม.
  rtr: { x0: 3, x1: 12, y0: -6, y1: 6, z1: 4.8 },
  bin: { x0: -21.6, x1: -16.2, y0: 9, y1: 14.4, z1: 4.2 },
  tail: [-17.6, 3.2, 10.2],    // ท้ายคิว: ที่แพ็กเก็ตล้นแล้วถูกทิ้ง
  gate: [12, 0, 2.5],          // พอร์ตขาออกของเราเตอร์ = ลิงก์ 10 Mbps
  tv: [17, -9, 0], lap: [26, 11, 0], wan: [-31.5, 0, 0],
};
// ตำแหน่ง x ของท้ายแถว เมื่อคิวเต็ม f (0..1); หัวแถวอยู่ติดประตูที่ x1 - in เสมอ
const RG_CX1 = RG.ch.x1 - RG.ch.in, RG_CLEN = RG_CX1 - (RG.ch.x0 + RG.ch.in);
const colaX = (f) => RG_CX1 - RG_CLEN * clamp(f);

// ---- WAN signpost: where the traffic comes from ------------------------------------
defineAsset('posteWan', {
  name: 'ป้ายอินเทอร์เน็ต', label: 'อินเทอร์เน็ต', group: 'floor', layer: 0, O: [0, 0, 0],
  anchor: [0, 0, 6.6], ring: [2, 2, 0.02], lab: [0, 3.5, 2.4], dropH: 6,
  floorShadow: (xf) => [cylCorners(xf, [0, 0, 1.4], 'z', 0.65, 2.8), boxCorners(xf, [-0.35, -4.4, 2.8], [0.35, 4.4, 6.6])],
  draw(G, xf, st) {
    drawCyl(G, xf, [0, 0, 1.4], 'z', 0.65, 2.8, M.steel, { seg: 16, lw: 1.5 });
    drawBox(G, xf, [-0.35, -4.4, 2.8], [0.35, 4.4, 6.6], RC.post, {
      lw: 2,
      px: (c) => {
        ptxt(c, 'อินเทอร์เน็ต', 0.6, 1.3, 1.3, INK, 700, 'left');
        ptxt(c, `ลิงก์เข้าบ้าน ${NET.C} Mbps`, 0.6, 3.0, 0.88, 'rgba(29,32,51,0.72)', 700, 'left');
        ptxt(c, 'WAN', 0.6, 4.2, 0.68, 'rgba(29,32,51,0.5)', 700, 'left');
      },
    });
  },
});

// ---- two-lane feed conveyor --------------------------------------------------------
defineAsset('cintaRed', {
  name: 'สายพานขาเข้า', label: 'จากอินเทอร์เน็ต · ลิงก์ 10 Mbps', group: 'floor', layer: 1, O: [0, 0, 0],
  anchor: [-24.6, 0, 10.4], ring: [5.4, 4, 0.02], lab: [-2, -4.2, 3.0], dropH: 6,
  floorShadow: (xf) => [boxCorners(xf, [RG.belt.x0, -3.4, 9], [RG.belt.x1, 3.4, RG.belt.z]),
    ...[[-27.4, -2.4], [-27.4, 2.4], [-22.3, -2.4], [-22.3, 2.4]].map(([x, y]) => cylCorners(xf, [x, y, 4.5], 'z', 0.42, 9))],
  draw(G, xf, st) {
    const B = RG.belt;
    for (const [x, y] of [[-27.4, -2.4], [-27.4, 2.4], [-22.3, -2.4], [-22.3, 2.4]]) drawCyl(G, xf, [x, y, 4.5], 'z', 0.42, 9, M.steel, { seg: 14, lw: 1.3 });
    drawBox(G, xf, [B.x0, -3.4, 9], [B.x1, 3.4, B.z], RC.deck, {
      lw: 2,
      top: (c) => {
        const L = B.x1 - B.x0;
        for (const [i, name, col] of [[0, 'วิดีโอ', '#c8f04a'], [1, 'ดาวน์โหลด', '#ffcf6b']]) {
          const v0 = B.lane[i] + 3.4 - B.half, h = B.half * 2;
          c.fillStyle = 'rgba(16,18,24,0.5)'; prect(c, 0.4, v0, L - 0.8, h, 0.35); c.fill();
          c.strokeStyle = col; c.lineWidth = 0.1; prect(c, 0.4, v0, L - 0.8, h, 0.35); c.stroke();
          ptxt(c, name, 1.0, v0 + h / 2, 0.82, col, 700, 'left');
        }
        c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 0.07;
        for (let x = 1.2; x < L; x += 0.95) { c.beginPath(); c.moveTo(x, 0.45); c.lineTo(x, 6.35); c.stroke(); }
      },
    });
    for (const x of [B.x0 + 0.25, B.x1 - 0.25]) drawCyl(G, xf, [x, 0, B.z - 0.5], 'y', 0.62, 6.6, M.steel, { seg: 16, lw: 1.4 });
  },
});

// ---- the queue itself: a glass channel with a ms scale along its length -------------
// st.qf = คิวเต็มแค่ไหน 0..1 ; st.qMix = สัดส่วนวิดีโอในคิว ; st.qms, st.qpk = ตัวเลขบนผนัง
defineAsset('canalCola', {
  name: 'คิวในเราเตอร์', label: 'คิว · 1000 แพ็กเก็ต', group: 'floor', layer: 3, O: [0, 0, 0],
  anchor: [-8, 0, 10.4], ring: [10.4, 3.2, 2.22], lab: [0, 4.6, 3.0], dropH: 9,
  floorShadow: (xf) => [boxCorners(xf, [RG.ch.x0 - 0.5, RG.ch.y0 - 0.5, 2.2], [RG.ch.x1 + 0.5, RG.ch.y1 + 0.5, RG.ch.z1])],
  draw(G, xf, st) {
    const C = RG.ch, f = clamp(st.qf || 0), mix = clamp(st.qMix ?? 0.5);
    const iy0 = C.y0 + C.in, iy1 = C.y1 - C.in, iz0 = C.z0 + 0.3, iz1 = C.z1 - 0.45;
    // ฐานรอง + ไม้บรรทัดวัดความยาวของแถว: ms กับจำนวนแพ็กเก็ต อ่านง่ายเพราะอยู่บนพื้นทึบ
    drawBox(G, xf, [C.x0 - 0.5, C.y0 - 0.5, 2.2], [C.x1 + 0.5, C.y1 + 0.5, C.z0], RC.body, {
      lw: 2, topM: M.steel,
      top: (c) => { c.strokeStyle = 'rgba(29,32,51,0.18)'; c.lineWidth = 0.06; for (let u = 1; u < 21; u += 1) { c.beginPath(); c.moveTo(u, 0.4); c.lineTo(u, 8.2); c.stroke(); } },
      py: (c) => {
        const U = (ms) => colaX(ms / NET_QMS) - (C.x0 - 0.5);
        ptxt(c, 'ความยาวของแถว', U(1200) - 0.75, 1.0, 0.62, 'rgba(223,227,234,0.55)', 700, 'right');
        for (const ms of [0, 300, 600, 900, 1200]) {
          const u = U(ms), hot = ms >= 900;
          c.strokeStyle = hot ? 'rgba(255,124,108,0.85)' : 'rgba(255,255,255,0.38)'; c.lineWidth = 0.09;
          c.beginPath(); c.moveTo(u, 0.2); c.lineTo(u, 0.95); c.stroke();
          ptxt(c, `${ms}`, u, 1.6, 0.95, hot ? '#ff9e93' : '#dfe3ea', 700, 'center');
          ptxt(c, `${Math.round((ms / NET_QMS) * NET.qmax)} pk`, u, 2.75, 0.62, 'rgba(223,227,234,0.45)', 700, 'center');
        }
        ptxt(c, 'ms', U(0) + 0.8, 1.6, 0.7, 'rgba(223,227,234,0.6)', 700, 'left');
        // ลูกศรชี้ท้ายแถวตอนนี้
        if (f > 0.004) {
          const u = U(st.qms ?? 0);
          c.fillStyle = f > 0.985 ? '#ff5c4c' : '#c8f04a';
          c.beginPath(); c.moveTo(u, 0.1); c.lineTo(u - 0.42, -0.72); c.lineTo(u + 0.42, -0.72); c.closePath(); c.fill();
          c.strokeStyle = INK; c.lineWidth = 0.08; c.stroke();
        }
      },
    });
    // แถวที่รออยู่: หัวแถวติดประตูเสมอ ท้ายแถวยืดถอยหลังตามคิวที่กอง
    if (f > 0.004) {
      const x0 = colaX(f), zc = iz0 + (iz1 - iz0) * mix;
      if (zc > iz0 + 0.02) drawBox(G, xf, [x0, iy0, iz0], [RG_CX1, iy1, zc], RC.vid, { lw: 0, noTop: true });
      drawBox(G, xf, [x0, iy0, Math.min(zc, iz1 - 0.02)], [RG_CX1, iy1, iz1], iz1 - zc > 0.05 ? RC.dl : RC.vid, {
        lw: 1.1,
        top: (c) => {                                   // ขีดแบ่งให้เห็นว่าเป็นแพ็กเก็ตที่ต่อแถวกัน
          c.strokeStyle = 'rgba(29,32,51,0.3)'; c.lineWidth = 0.07;
          for (let u = 0.9; u < RG_CX1 - x0; u += 0.9) { c.beginPath(); c.moveTo(u, 0.1); c.lineTo(u, iy1 - iy0 - 0.1); c.stroke(); }
        },
      });
      drawBox(G, xf, [x0 - 0.2, iy0, iz0], [x0, iy1, iz1], f > 0.985 ? RC.bin : M.steel, { lw: 1.3 });
    }
    // ผนังแก้ว: ใสพอให้เห็นแถวข้างใน มีแค่ชื่อกำกับ
    drawBox(G, xf, [C.x0, C.y0, C.z0], [C.x1, C.y1, C.z1], RC.glass, {
      lw: 2.2, alpha: 0.12,
      py: (c) => ptxt(c, 'คิว (QUEUE) · ยิ่งยาว ยิ่งหน่วง', C.x1 - 0.4 - C.x0, 0.8, 0.85, INK, 700, 'right'),
    });
    // ประตูปล่อยออกที่หัวแถว + รางลงเราเตอร์
    drawBox(G, xf, [C.x1 - 0.3, C.y0 - 0.55, C.z0 - 0.2], [C.x1 + 0.3, C.y1 + 0.55, C.z1 + 0.5], M.steel, { lw: 1.7 });
    drawBox(G, xf, [C.x1 - 0.6, -2.2, RG.rtr.z1 - 1.1], [RG.rtr.x0 + 1.0, 2.2, C.z0 + 0.3], RC.body, { lw: 1.7 });
  },
});

// ---- the router the queue drains into ----------------------------------------------
// st.rtt = ms บนจอ ; st.link = ลิงก์กำลังส่ง ; st.lossOn, st.aqmOn = ไฟสถานะ
defineAsset('routerCola', {
  name: 'เราเตอร์', label: `เราเตอร์ · ${10} Mbps`, group: 'floor', layer: 2, O: [0, 0, 0],
  anchor: [12, -3, 4], ring: [6, 7.4, 0.02], lab: [2.6, -3.6, 2.4],
  floorShadow: (xf) => [boxCorners(xf, [RG.rtr.x0, RG.rtr.y0, 0], [RG.rtr.x1, RG.rtr.y1, RG.rtr.z1])],
  draw(G, xf, st) {
    const R = RG.rtr, rtt = st.rtt || 0, link = st.link || 0;
    drawBox(G, xf, [R.x0, R.y0, 0], [R.x1, R.y1, R.z1], RC.body, {
      lw: 2.2,
      px: (c) => {
        const W = R.y1 - R.y0, H = R.z1;
        ptxt(c, 'ROUTER RT-10', 0.7, 0.85, 0.78, '#dfe3ea', 700, 'left');
        ptxt(c, 'แบบของเราเอง ไม่ใช่ยี่ห้อจริง', 0.7, 1.75, 0.42, 'rgba(223,227,234,0.5)', 700, 'left');
        c.fillStyle = '#0d1a14'; prect(c, 0.7, 2.25, 4.3, 1.7, 0.25); c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 0.06; c.stroke();
        const col = rtt >= 150 ? '#ff7a6b' : rtt >= 50 ? '#ffcf6b' : '#9be15d';
        ptxt(c, `${Math.round(rtt)}`, 1.0, 3.1, 1.0, col, 700, 'left');
        ptxt(c, 'ms RTT', 4.75, 3.3, 0.46, 'rgba(255,255,255,0.45)', 700, 'right');
        const gu = R.y1 - RG.gate[1], gv = R.z1 - RG.gate[2];
        c.fillStyle = '#11141a'; prect(c, gu - 1.1, gv - 0.8, 2.2, 1.6, 0.25); c.fill();
        c.strokeStyle = link > 0.05 ? '#c8f04a' : 'rgba(255,255,255,0.22)'; c.lineWidth = link > 0.05 ? 0.14 : 0.07; c.stroke();
        ptxt(c, `WAN ${NET.C}`, gu, gv + 1.35, 0.42, 'rgba(255,255,255,0.5)', 700, 'center');
        [['LINK', link > 0.05 ? '#9be15d' : '#39404c'], ['DROP', st.lossOn ? '#ff5c4c' : '#39404c'], ['AQM', st.aqmOn ? '#4fd8ea' : '#39404c']].forEach(([n, cc], i) => {
          const x = W - 1.9, y = 0.85 + i * 1.15;
          c.fillStyle = cc; pcirc(c, x, y, 0.27); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 0.06; c.stroke();
          ptxt(c, n, x - 0.52, y, 0.46, 'rgba(223,227,234,0.72)', 700, 'right');
        });
      },
      top: (c) => {
        const W = R.x1 - R.x0, D = R.y1 - R.y0;
        c.fillStyle = 'rgba(255,255,255,0.05)'; prect(c, 0.8, 0.8, W - 1.6, D - 1.6, 0.5); c.fill();
        c.fillStyle = 'rgba(0,0,0,0.3)'; prect(c, 0.9, D / 2 - 1.7, 1.6, 3.4, 0.3); c.fill();   // ช่องรับจากคิว
      },
    });
    for (const x of [R.x0 + 1, R.x1 - 1]) for (const y of [R.y0 + 1, R.y1 - 1]) drawCyl(G, xf, [x, y, 0.18], 'z', 0.4, 0.36, M.blk, { seg: 12, lw: 1 });
  },
});

// ---- drop bin: the packets the queue had no room for -------------------------------
defineAsset('cestoDescarte', {
  name: 'ถังแพ็กเก็ตที่ถูกทิ้ง', label: 'ทิ้ง (DROP)', group: 'floor', layer: 4, O: [0, 0, 0],
  anchor: [-18.9, 11.7, 4.2], ring: [3.3, 3.3, 0.02], lab: [-0.5, 3.6, 2.2], dropH: 6,
  floorShadow: (xf) => [boxCorners(xf, [RG.bin.x0, RG.bin.y0, 0], [RG.bin.x1, RG.bin.y1, RG.bin.z1])],
  draw(G, xf, st) {
    const B = RG.bin, n = st.dropN || 0;
    drawBox(G, xf, [B.x0, B.y0, 0], [B.x1, B.y1, B.z1], RC.bin, {
      lw: 2.1,
      top: (c) => {
        const W = B.x1 - B.x0, D = B.y1 - B.y0;
        c.fillStyle = '#20242c'; prect(c, 0.5, 0.5, W - 1, D - 1, 0.3); c.fill();
        c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 0.09; c.stroke();
      },
    });
    const h = n > 0 ? clamp(Math.log10(1 + n) / 5) * 2.4 : 0;
    if (h > 0.05) drawBox(G, xf, [B.x0 + 0.7, B.y0 + 0.7, B.z1 - 2.5], [B.x1 - 0.7, B.y1 - 0.7, B.z1 - 2.5 + h], RC.dl, { lw: 1.2 });
    onPlane(G, xf.p([B.x1, B.y1, B.z1 + 0.02]), xf.n([-1, 0, 0]), xf.n([0, -1, 0]), (c) => {
      c.fillStyle = st.dropHot ? '#ffd7d2' : '#fffdf8'; prect(c, 0.4, 0.35, 4.6, 1.85, 0.3); c.fill();
      c.strokeStyle = INK; c.lineWidth = 0.1; c.stroke();
      ptxt(c, n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`, 0.75, 0.95, 0.95, n > 0 ? '#c0392b' : INK, 700, 'left');
      ptxt(c, 'แพ็กเก็ตที่ทิ้ง', 0.75, 1.85, 0.48, 'rgba(29,32,51,0.6)', 700, 'left');
    });
  },
});

// ---- the TV: the symptom the viewer actually feels ---------------------------------
defineAsset('tvRed', {
  name: 'ทีวี', label: `วิดีโอ 1080p · ${5} Mbps`, group: 'floor', layer: 5, O: [0, 0, 0],
  anchor: [0, 0, 14.4], ring: [2.4, 5.6, 0.02], lab: [1.4, -3.6, 2.6], dropH: 8,
  floorShadow: (xf) => [boxCorners(xf, [-2.2, -3.6, 0], [1.1, 3.6, 0.6]), boxCorners(xf, [-0.65, -6.4, 4.6], [0.65, 6.4, 14.3])],
  draw(G, xf, st) {
    drawBox(G, xf, [-2.2, -3.6, 0], [1.1, 3.6, 0.6], RC.tv, { lw: 1.6 });
    drawBox(G, xf, [-0.45, -1.2, 0.6], [0.45, 1.2, 4.6], RC.tv, { lw: 1.5 });
    drawBox(G, xf, [-0.65, -6.4, 4.6], [0.65, 6.4, 14.3], RC.tv, {
      lw: 2.2,
      px: (c) => {
        const W = 12.8, H = 9.7, m = 0.62, sw = W - 2 * m, sh = H - 2 * m - 2.4;
        const buf = st.buf ?? NET.play, stall = !!st.stall, t = st.t || 0;
        c.fillStyle = stall ? '#15171c' : '#1b2433'; prect(c, m, m, sw, sh, 0.28); c.fill();
        if (!stall) {
          c.save(); prect(c, m, m, sw, sh, 0.28); c.clip();
          c.fillStyle = '#2b5f7a'; c.fillRect(m, m + sh * 0.54, sw, sh * 0.46);
          c.fillStyle = '#ffcf6b'; pcirc(c, m + sw * (0.3 + 0.05 * Math.sin(t * 0.5)), m + sh * 0.36, sh * 0.15); c.fill();
          c.fillStyle = 'rgba(255,255,255,0.2)';
          for (let i = 0; i < 3; i++) { const x = m + ((t * 0.45 + i * 0.37) % 1) * sw; prect(c, x, m + sh * (0.14 + i * 0.07), sw * 0.15, sh * 0.04, 0.12); c.fill(); }
          c.restore();
        } else {
          const cx = m + sw / 2, cy = m + sh / 2, a0 = t * 4.5;
          c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 0.26;
          c.beginPath(); c.arc(cx, cy, 1.3, 0, Math.PI * 2); c.stroke();
          c.strokeStyle = '#ffcf6b'; c.beginPath(); c.arc(cx, cy, 1.3, a0, a0 + 1.9); c.stroke();
          ptxt(c, 'กำลังโหลด…', cx, cy + 2.5, 0.8, '#ffcf6b', 700, 'center');
        }
        c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 0.07; prect(c, m, m, sw, sh, 0.28); c.stroke();
        const by = m + sh + 0.45, bh = 0.68;
        c.fillStyle = '#2a2e36'; prect(c, m, by, sw, bh, bh / 2); c.fill();
        const pf = clamp((st.played || 0) / 60) * 0.45;
        c.fillStyle = '#dfe3ea'; prect(c, m, by, Math.max(0.35, sw * pf), bh, bh / 2); c.fill();
        c.fillStyle = stall ? '#ff5c4c' : buf / NET.play < 0.3 ? '#ffcf6b' : '#c8f04a';
        prect(c, m + sw * pf, by, Math.max(0.1, sw * 0.5 * clamp(buf / NET.play)), bh, bh / 2); c.fill();
        ptxt(c, `บัฟเฟอร์ ${buf.toFixed(1)} s`, m, by + 1.55, 0.66, stall ? '#ff5c4c' : 'rgba(255,255,255,0.72)', 700, 'left');
        ptxt(c, stall ? 'หยุด' : 'เล่น ▶', m + sw, by + 1.55, 0.66, stall ? '#ff5c4c' : '#c8f04a', 700, 'right');
      },
    });
  },
});

// ---- the laptop doing the download ------------------------------------------------
defineAsset('laptopRed', {
  name: 'โน้ตบุ๊ก', label: 'ดาวน์โหลดไฟล์ใหญ่', group: 'floor', layer: 5, O: [0, 0, 0],
  anchor: [-2.45, 0, 6.3], ring: [3.6, 4.6, 0.02], lab: [1.4, 3.6, 2.2], dropH: 6,
  floorShadow: (xf) => [boxCorners(xf, [-3, -4.2, 0], [3, 4.2, 0.8]), boxCorners(xf, [-3, -4.1, 0.8], [-1.9, 4.1, 6.3])],
  draw(G, xf, st) {
    drawBox(G, xf, [-3, -4.2, 0], [3, 4.2, 0.8], RC.lap, {
      lw: 1.8,
      top: (c) => {
        c.fillStyle = 'rgba(29,32,51,0.1)'; prect(c, 1.5, 0.95, 4.2, 5.0, 0.25); c.fill();
        c.fillStyle = 'rgba(29,32,51,0.18)';
        for (let r = 0; r < 4; r++) for (let k = 0; k < 8; k++) { prect(c, 1.75 + k * 0.49, 1.2 + r * 0.5, 0.38, 0.36, 0.09); c.fill(); }
        c.fillStyle = 'rgba(29,32,51,0.12)'; prect(c, 2.9, 6.25, 1.9, 1.2, 0.18); c.fill();
      },
    });
    drawBox(G, xf, [-3, -4.1, 0.8], [-1.9, 4.1, 6.3], RC.lap, {
      lw: 1.9,
      px: (c) => {
        const W = 8.2, H = 5.5, m = 0.45, sw = W - 2 * m, sh = H - 2 * m;
        c.fillStyle = '#161a21'; prect(c, m, m, sw, sh, 0.2); c.fill();
        ptxt(c, 'กำลังดาวน์โหลด', m + 0.4, m + 0.78, 0.62, '#dfe3ea', 700, 'left');
        const f = clamp((st.mb || 0) / 400), by = m + 1.45;
        c.fillStyle = '#272c35'; prect(c, m + 0.4, by, sw - 0.8, 0.7, 0.33); c.fill();
        c.fillStyle = '#ffcf6b'; prect(c, m + 0.4, by, Math.max(0.15, (sw - 0.8) * f), 0.7, 0.33); c.fill();
        ptxt(c, `${(st.mb || 0).toFixed(0)}/400 MB`, m + 0.4, by + 1.4, 0.56, 'rgba(255,255,255,0.72)', 700, 'left');
        ptxt(c, `${(st.dlNow || 0).toFixed(1)} Mbps`, m + sw - 0.4, by + 1.4, 0.64, '#ffcf6b', 700, 'right');
        ptxt(c, 'ขอเท่าไรก็ได้ ไม่สนใคร', m + 0.4, m + sh - 0.45, 0.5, 'rgba(255,255,255,0.4)', 700, 'left');
      },
    });
  },
});

// ---- moving packets (drawn by the demo, like the espresso streams) -----------------
// กล่อง 1 ใบ = NET.pkBox แพ็กเก็ต. สายพานเดินด้วยความเร็วคงที่ RP_V ซม./วินาที
// ระยะห่างระหว่างกล่องจึงเป็นตัวบอกอัตราข้อมูล: ยิ่งเร็ว กล่องยิ่งถี่
const RP_V = 9, RP_S = 1.25;
const rpPer = (mbps) => (NET.pkBox * NET.mtu * 8) / (mbps * 1e6);   // วินาทีต่อกล่อง
function rpCube(G, base, p, m, s = RP_S) {
  drawBox(G, base, [p[0] - s / 2, p[1] - s / 2, p[2]], [p[0] + s / 2, p[1] + s / 2, p[2] + s], m, { lw: 1.3 });
}
// สายพานสองช่อง + ช่วงที่ไหลต่อเข้าไปจนถึงท้ายแถวในช่องแก้ว
function drawCintaPaquetes(G, base, st) {
  const B = RG.belt, C = RG.ch, t = st.mt || 0, f = clamp(st.qf || 0), tailX = colaX(f);
  const full = f > 0.985;
  const topZ = f > 0.004 ? C.z1 - 0.45 : C.z0 + 0.3;     // ผิวบนของแถว = ที่กล่องตกลงไปกอง
  const stop = full ? C.x0 + 0.6 : tailX;                // คิวเต็มแล้วเข้าไม่ได้: ค้างอยู่ปากทาง
  for (const [i, mb, m] of [[0, st.rateVid ?? 0, RC.vid], [1, st.rateDl ?? 0, RC.dl]]) {
    if (!(mb > 0.01)) continue;
    const per = rpPer(mb), tt = t + i * 0.41, last = Math.floor(tt / per);
    for (let k = 0; k < 30; k++) {
      const age = tt - (last - k) * per, x = B.x0 + 0.7 + RP_V * age;
      if (x < B.x0) break;
      if (x > stop) continue;
      // บนสายพานและบนหลังคาแก้ว = ยังเดินไปต่อท้ายแถว; 1.8 ซม. สุดท้ายคือช่วงหล่นลงกอง
      const g = clamp((x - B.x1) / (C.x0 - B.x1)), d = smooth(clamp((x - (stop - 1.8)) / 1.8));
      rpCube(G, base, [x, lerp(B.lane[i], B.lane[i] * 0.45, g), lerp(B.z, topZ, d)], m, RP_S * (1 - 0.15 * d));
    }
  }
}
// กล่องที่ล้นท้ายแถวแล้วตกลงถัง (tail drop)
function drawDescartePaquetes(G, base, st) {
  const t = st.mt || 0, rate = (st.dropRate || 0) / NET.pkBox;
  if (!(rate > 0.01)) return;
  const per = 1 / rate, last = Math.floor(t / per);
  const A = RG.tail, Bp = [(RG.bin.x0 + RG.bin.x1) / 2, (RG.bin.y0 + RG.bin.y1) / 2, 2.0];
  for (let k = 0; k < 7; k++) {
    const f = (t - (last - k) * per) / 0.8;
    if (f < 0 || f > 1) continue;
    rpCube(G, base, [lerp(A[0], Bp[0], f), lerp(A[1], Bp[1], f), lerp(A[2], Bp[2], f) + 2.6 * Math.sin(Math.PI * f)], RC.bin, RP_S * 0.9);
  }
}
// กล่องที่ลิงก์ส่งออกจริง ๆ ไปถึงทีวีกับโน้ตบุ๊ก
function drawSalidaPaquetes(G, base, st) {
  const t = st.mt || 0;
  for (const [mb, m, dest] of [[st.vidGot ?? 0, RC.vid, RG.tv], [st.dlGot ?? 0, RC.dl, RG.lap]]) {
    if (!(mb > 0.01)) continue;
    const per = rpPer(mb), last = Math.floor(t / per);
    const A = RG.gate, Bp = [dest[0] - 2.4, dest[1] + (dest[1] < 0 ? 2.6 : -2.6), 2.2];
    for (let k = 0; k < 9; k++) {
      const f = (t - (last - k) * per) / 0.95;
      if (f < 0 || f > 1) continue;
      rpCube(G, base, [lerp(A[0], Bp[0], f), lerp(A[1], Bp[1], f), lerp(A[2], Bp[2], f)], m, RP_S * 0.85);
    }
  }
}
