// ---------------------------------------------------------------------------
// Lab N1 · คิวในเราเตอร์. ลิงก์เดิม 10 Mbps วิดีโอเดิม 5 Mbps สามสถานการณ์:
// ไม่มีใครโหลด (ลื่น) · มีคนโหลด 20 Mbps (คิวเต็ม 1.2 s วิดีโอกระตุก) · เปิด AQM (คิวสั้น 5 ms วิดีโอกลับมา)
// แล้วปล่อยให้คนดูลองเอง: หมุนปุ่มตั้งอัตราโหลด กด D เพื่อโหลด กด A เพื่อเปิด AQM
// ---------------------------------------------------------------------------
const NC_CH = [
  {
    id: 'idle', btn: '1 · ไม่มีใครโหลด', dl: 0, aqm: 0, rate: 1, mdur: 6, init: null, pre: [0, 0],
    tip: ['ลิงก์ 10 Mbps วิดีโอขอแค่ 5 Mbps', 'เหลือที่ว่าง คิวจึงไม่กอง'],
  },
  {
    id: 'load', btn: '2 · โหลดหนัก', dl: 20, aqm: 0, rate: 4, mdur: 22, init: null, pre: [0, 0],
    tip: ['อีกเครื่องขอ 20 Mbps ในลิงก์เดิม', 'คิวเต็ม 1000 แพ็กเก็ต = หน่วง 1.2 วินาที'],
  },
  {
    id: 'aqm', btn: '3 · เปิด AQM', dl: 20, aqm: 1, rate: 1.5, mdur: 10, pre: [20, 0],
    init: { q: NET_QBITS, buf: 0, stall: true, stalls: 0 },
    tip: ['โหลดเท่าเดิม แต่คิวถูกกดเหลือ 5 ms', 'แบนด์วิดท์ไม่เพิ่ม วิดีโอก็กลับมาเล่นได้'],
  },
];
const NC_LEAD = 1.1, NC_HOLD = 2.7, NC_LIVE_RATE = 2;
const NC_BG = { coral: BAY_BG.coral, amber: BAY_BG.amber, lime: BAY_BG.lime };
const ncCol = (k) => (k === 'lime' ? '#c8f04a' : k === 'amber' ? '#ffcf6b' : '#ff9e93');

function ncInsts() {
  return [
    place('cintaRed', 'cinta', { code: `cinta(["วิดีโอ", "ดาวน์โหลด"], ${NET.C} /* Mbps */);` }),
    place('routerCola', 'rtr', { code: `router('RT-10', ${NET.qmax} /* แพ็กเก็ต */);` }),
    place('canalCola', 'canal', { code: `cola(${NET.qmax} * ${NET.mtu} * 8 /* bit */);` }),
    place('cestoDescarte', 'bin', { code: 'descarte("tail drop");' }),
    place('tvRed', 'tv', { at: RG.tv, code: `tv(1080, ${NET.vid} /* Mbps */);` }),
    place('laptopRed', 'lap', { at: RG.lap, code: 'laptop("ไฟล์ 400 MB");' }),
  ];
}
function ncTimeline(params) {
  const insts = ncInsts(), byId = Object.fromEntries(insts.map(i => [i.id, i]));
  const pts = [[-28.5, -3.4, 10.4], [-28.5, 3.4, 9], [-21.6, 14.4, 0], [-18, -3.6, 10.4], [12, -6, 0], [17.65, -15.4, 14.3], [29, 15.2, 0]];
  // ป้ายบทอยู่มุมล่างซ้ายของเสื่อ กล้องจึงไม่ต้องหลบ
  // เลื่อนลงเล็กน้อย ไม่ให้สายพานไปชนป้ายหัวเรื่องด้านบน
  const wide = camShift(fitCam(pts, 1.08), 0, 38);
  const mid = camShift(fitCam(pts.slice(2), 1.12), 0, 30);
  const base = { insts, byId, wide, mid, dl: params.rate ?? 20 };
  if (params.live) return Object.assign(base, { T: { end: 1800, caption: null, labelsOut: 0 }, sched: {}, total: insts.length, CH: [], live: true, tabs: [], tabAt: () => 0 });
  const { sched, end, total } = scheduleBuild(insts, 0.35);
  let t = end + 0.5;
  const CH = NC_CH.map(c => {
    const vid = c.mdur / c.rate, o = Object.assign({}, c, { t0: t, vid });
    t += NC_LEAD + vid + NC_HOLD; o.t1 = t; return o;
  });
  const T = { buildEnd: end, caption: t + 0.2 }; T.end = T.caption + 4.8; T.labelsOut = CH[0].t0 + 0.5;
  return Object.assign(base, { T, sched, total, CH, live: false, tabs: [], tabAt: () => 0 });
}
const NC_REF = [];
// ผลสุดท้ายของแต่ละบท (คงที่) ใช้ทั้งในป้ายสรุปและเป็นค่าอ้างอิงตอนผู้ชมลองเอง
const ncChRes = (i) => NC_REF[i] || (NC_REF[i] = netRun([[0, NC_CH[i].dl, NC_CH[i].aqm]], NC_CH[i].mdur, NC_CH[i].init ? Object.assign({}, NC_CH[i].init) : null));
const ncChapter = (TL, t) => { for (let k = TL.CH.length - 1; k >= 0; k--) if (t >= TL.CH[k].t0) return k; return -1; };
// live: ปุ่ม D = โหลด/ไม่โหลด, ปุ่ม A = AQM, ลูกบิด rate = อัตราโหลดที่ขอ
function ncLiveSegs(TL) {
  const segs = [[0, 0, 0]];
  let on = 0, aqm = 0, rate = TL.dl;
  for (const [te, k, v] of LIVE.ev) {
    if (k === 'dl') on = v; else if (k === 'aqm') aqm = v; else if (k === 'rate') rate = v; else continue;
    segs.push([te * NC_LIVE_RATE, on ? rate : 0, aqm]);
  }
  return segs;
}

function ncState(TL, t) {
  const st = { t };
  partsAt(TL, t, st);
  let S, k = -1, ch = null, u = 0, mt = 0, tally = [];
  if (TL.live) {
    mt = t * NC_LIVE_RATE;
    S = netRun(ncLiveSegs(TL), mt, null);
    st.rateSet = liveVal(LIVE.ev, 'rate', t, TL.dl);
    st.dlHeld = liveVal(LIVE.ev, 'dl', t, 0);
    st.cam = TL.mid;
  } else {
    k = ncChapter(TL, t); ch = TL.CH[k]; u = ch ? t - ch.t0 : 0;
    mt = ch ? Math.max(0, (u - NC_LEAD) * ch.rate) : 0;
    // ช่วงนำก่อนเริ่มเดินแบบจำลอง: แสดงสถานการณ์ที่ค้างอยู่ก่อนหน้า (บท 3 คือโหลดอยู่แล้วแต่ยังไม่เปิด AQM)
    const segs = ch ? (mt > 0 ? [[0, ch.dl, ch.aqm]] : [[0, ch.pre[0], ch.pre[1]]]) : [[0, 0, 0]];
    S = netRun(segs, mt > 0 ? mt : 0.03, ch && ch.init ? Object.assign({}, ch.init) : null);
    tally = TL.CH.slice(0, Math.max(0, k + 1)).map((c, i) => {
      const F = i < k ? netRun([[0, c.dl, c.aqm]], c.mdur, c.init ? Object.assign({}, c.init) : null) : S;
      return { ch: c, S: F, done: i < k || u >= NC_LEAD + ch.vid };
    });
    const f0 = ch ? easeInOut(seg(t, TL.CH[0].t0, TL.CH[0].t0 + 1.4)) : 0;
    st.cam = mixCam(TL.wide, TL.mid, f0);
    if (t >= TL.T.caption - 0.5) st.cam = mixCam(TL.mid, TL.wide, easeInOut(seg(t, TL.T.caption - 0.5, TL.T.caption + 1.1)));
  }
  st.k = k; st.ch = ch; st.u = u; st.mt = mt; st.S = S; st.tally = tally;
  // ค่าที่ชิ้นงานอ่าน
  st.qf = S.fill; st.qms = S.ms; st.qpk = S.pk;
  st.rateVid = netVidDem(S.buf); st.rateDl = S.dl;
  st.qMix = clamp(st.rateVid / Math.max(0.01, st.rateVid + st.rateDl));
  st.vidGot = S.vidGot; st.dlGot = S.dlGot; st.dropRate = S.dropRate;
  st.rtt = S.rtt; st.link = S.lam > 0.01 ? 1 : 0; st.lossOn = S.dropRate > 1; st.aqmOn = !!S.aqm;
  st.dropN = S.drop; st.dropHot = S.dropRate > 1;
  st.buf = S.buf; st.stall = S.stall; st.played = S.played; st.mb = S.mb; st.dlNow = S.dlGot;
  return st;
}

const DEMO = {
  id: 'NETWORK', num: 'N1', title: 'NETWORK', tagline: 'คิว · หน่วง · กระตุก', category: 'เครือข่าย', brand: 'SIMULAB',
  plate: ['SIMULAB · NETWORK · LAB N1', 'Lab N1 · ทำไมวิดีโอกระตุกตอนมีคนโหลดไฟล์'],
  chips: [`ลิงก์ ${NET.C} Mbps · วิดีโอ ${NET.vid} Mbps · คิว ${NET.qmax} แพ็กเก็ต`, 'LAB N1 · NETWORK'],
  caption: 'ไม่ใช่เน็ตช้า — คิวในเราเตอร์ยาวเกินไป',
  intro: { seconds: 5, lines: ['ทำไมวิดีโอกระตุก', 'ตอนมีคนโหลดไฟล์?'], pill: 'LAB N1 · NETWORK', src: (TL) => TL.T.caption, rate: 0.8 },
  major: ['canal', 'rtr', 'tv'],
  params: { rate: 20 },
  knob: { key: 'rate', label: 'ดาวน์โหลด', min: 0, max: 30, step: 1, live: true, fmt: (v) => `${v} Mbps` },
  live: {
    label: '▶ ลองเอง', controls: [
      { key: 'dl', label: 'โหลดไฟล์', keys: ['KeyD'], kbd: 'D' },
      { key: 'aqm', label: 'เปิด AQM', keys: ['KeyA'], kbd: 'A' },
    ],
  },
  timeline: (p) => ncTimeline(p || {}),
  steps: (TL) => [['0 · ประกอบ', 0], ...TL.CH.map((c, i) => [c.btn, c.t0 - 0.05])],
  state: (TL, t) => ncState(TL, t),
  drawScene(G, st, TL) {
    drawTapete(G, st, { x0: -33, x1: 30.5, y0: -16.5, y1: 16, plate: 'โต๊ะ · LAB N1' });
    const base = new Xf();
    drawAssembly(G, st, TL.insts, base);
    return base;
  },
  drawFx(G, st, TL, base) {
    if (st.parts.cinta >= 1 && st.parts.canal >= 1) drawCintaPaquetes(G, base, st);
    if (st.parts.canal >= 1 && st.parts.bin >= 1) drawDescartePaquetes(G, base, st);
    if (st.parts.rtr >= 1) drawSalidaPaquetes(G, base, st);
  },
  labelAlpha(TL, inst, t) { return TL.live ? 0 : labelAlphaDefault(TL, inst, t); },
  drawNotes(G, st, TL) {
    const c = G.ctx, P = (p) => G.cam.p(p), ch = st.ch, u = st.u, S = st.S;
    const fade = (a, b) => seg(u, a, a + 0.25) * (1 - seg(u, b - 0.25, b));
    const cap = !TL.live && st.t >= TL.T.caption - 0.3;
    const qEnd = [colaX(st.qf), RG.ch.y1, RG.ch.z1 + 0.4], tvP = [RG.tv[0] - 0.7, RG.tv[1] + 6.6, 13.4];
    if (ch && !cap) {
      const endV = NC_LEAD + ch.vid, dur = ch.t1 - ch.t0;
      if (ch.id === 'idle') {
        callout(c, P(qEnd), 150, -78, 'คิวว่าง · 0 แพ็กเก็ต', fade(NC_LEAD + 0.5, endV), '#c8f04a');
        callout(c, P(tvP), -250, -40, `ได้ ${NET.vid} Mbps · ลื่น`, fade(NC_LEAD + 2.0, endV), '#c8f04a');
      }
      if (ch.id === 'load') {
        callout(c, P(qEnd), 150, -78, st.qf > 0.98 ? `คิวเต็ม · หน่วง ${NET_QMS / 1000} วินาที` : `คิวกำลังยาวขึ้น · ${Math.round(st.qms)} ms`, fade(NC_LEAD + 0.3, endV), st.qf > 0.98 ? '#ff9e93' : '#ffcf6b');
        callout(c, P([RG.bin.x1, RG.bin.y0, RG.bin.z1]), -150, 86, 'ล้นแล้วทิ้ง (tail drop)', fade(NC_LEAD + 1.4, endV), '#ff9e93');
        if (S.stalls > 0) callout(c, P(tvP), -250, -40, 'บัฟเฟอร์หมด · วิดีโอหยุด', fade(NC_LEAD + (18 / ch.rate), dur), '#ff9e93');
      }
      if (ch.id === 'aqm') {
        callout(c, P(qEnd), 150, -78, `AQM กดคิวเหลือ ${NET.target} ms`, fade(NC_LEAD + 1.6, endV), '#7fe6f2');
        callout(c, P(tvP), -250, -40, 'เล่นต่อได้ · ลื่น', fade(NC_LEAD + 3.0, endV), '#c8f04a');
      }
      tipCard(c, CARD.x + 30, 700, ch.tip, fade(NC_LEAD + 0.5, dur - 0.05), `${ch.dl === 0 ? 'ไม่มีการโหลด' : `โหลด ${ch.dl} Mbps`} · AQM ${ch.aqm ? 'เปิด' : 'ปิด'}`);
    }
    if (cap) {
      const a = seg(st.t, TL.T.caption + 0.5, TL.T.caption + 0.9);
      TL.CH.forEach((cc, i) => {
        const F = ncChRes(i);
        pill(c, CARD.x + 30, 672 + i * 46, `${i + 1} · ${cc.dl} Mbps · AQM ${cc.aqm ? 'เปิด' : 'ปิด'} · ${Math.round(F.rtt)} ms · ${F.res[0]}`,
          { bg: ncCol(F.res[2]), size: 14, padY: 9, alpha: a * seg(st.t, TL.T.caption + 0.5 + i * 0.15, TL.T.caption + 0.8 + i * 0.15) });
      });
    }
    if (TL.live) {
      const on = st.dlHeld > 0;
      tipCard(c, CARD.x + 30, 700, on
        ? [`กำลังโหลด ${st.rateSet} Mbps${st.aqmOn ? ' · AQM เปิด' : ''}`, st.stall ? 'วิดีโอค้างแล้ว ลองกด A' : `คิว ${Math.round(st.qms)} ms · บัฟ ${st.buf.toFixed(1)} s`]
        : ['หมุนลูกบิดตั้งอัตราโหลด แล้วกด D ค้าง', 'กด A ค้างเพื่อเปิด AQM'], 1, 'ตาคุณแล้ว');
      callout(c, P(qEnd), 150, -78, `คิว ${Math.round(st.qms)} ms · ${Math.round(st.qpk)} pk`, 1, st.qms > 150 ? '#ff9e93' : st.qms > 50 ? '#ffcf6b' : '#c8f04a');
      callout(c, P(tvP), -250, -40, st.stall ? 'วิดีโอหยุด' : `บัฟ ${st.buf.toFixed(1)} s · เล่น`, 1, st.stall ? '#ff9e93' : '#c8f04a');
    }
  },
  drawBays(c, TL, st) {
    const S = st.S;
    // BAY 01 · คิว: ms คือตัวเลขหลักของแล็บนี้
    const zc = st.qms >= 150 ? ['คิวยาว', BAY_BG.coral] : st.qms >= 50 ? ['เริ่มกอง', BAY_BG.amber] : ['คิวสั้น', BAY_BG.lime];
    let b = bayFrame(c, 0, 'BAY 01 · คิวในเราเตอร์', zc[0], zc[1]);
    bigValue(c, b, Math.round(st.qms).toString(), 'ms', `${Math.round(st.qpk)} / ${NET.qmax} แพ็กเก็ต · เต็ม = ${NET_QMS} ms`);
    const bx = b.x + 14, bw = b.w - 28, by = b.y + 128, MX = 1300, XS = (v) => bx + (clamp(v, 0, MX) / MX) * bw;
    c.save();
    for (const [a0, a1, col] of [[0, 50, '#c8f04a'], [50, 150, '#ffcf6b'], [150, MX, '#ff9e93']]) { c.fillStyle = col; c.fillRect(XS(a0), by, XS(a1) - XS(a0), 18); }
    c.lineWidth = 1.5; c.strokeStyle = INK; c.strokeRect(bx, by, bw, 18);
    c.font = `700 9.5px ${FONT_MONO}`; c.fillStyle = '#545867'; c.textAlign = 'center';
    for (const v of [0, 300, 600, 900, 1200]) c.fillText(String(v), XS(v), by + 32);
    c.fillText('ลื่น', XS(25), by + 46); c.fillText('หน่วงจนรู้สึก', XS(700), by + 46);
    const mx = XS(st.qms); c.fillStyle = INK; c.beginPath(); c.moveTo(mx, by - 2); c.lineTo(mx - 7, by - 12); c.lineTo(mx + 7, by - 12); c.closePath(); c.fill(); c.fillRect(mx - 1.5, by - 2, 3, 22);
    c.textAlign = 'left'; c.restore();
    // BAY 02 · วิดีโอ: บัฟเฟอร์เหลือกี่วินาที
    b = bayFrame(c, 1, 'BAY 02 · บัฟเฟอร์วิดีโอ', st.stall ? 'หยุด' : S.stalls > 0 ? 'กระตุก' : st.buf >= NET.play - 0.1 ? 'เต็ม' : 'กำลังลด',
      st.stall ? BAY_BG.coral : S.stalls > 0 ? BAY_BG.amber : st.buf >= NET.play - 0.1 ? BAY_BG.lime : BAY_BG.amber);
    bigValue(c, b, st.buf.toFixed(1), `/ ${NET.play} s`, `ได้ ${st.vidGot.toFixed(2)} Mbps · ต้องการ ${NET.vid}`);
    c.save();
    const gx = b.x + 14, gw = b.w - 28, gy = b.y + 132;
    c.fillStyle = '#f4f1ea'; rr(c, gx, gy, gw, 20, 10); c.fill(); c.lineWidth = 1.4; c.strokeStyle = INK; c.stroke();
    c.fillStyle = st.stall ? '#ff5c4c' : st.buf / NET.play < 0.3 ? '#ffcf6b' : '#c8f04a';
    rr(c, gx + 3, gy + 3, Math.max(0, (gw - 6) * clamp(st.buf / NET.play)), 14, 7); c.fill();
    c.font = `400 11px ${FONT_MONO}`; c.fillStyle = '#6b6f7a';
    c.fillText(st.stall ? 'หยุดเพื่อโหลด · เล่นต่อเมื่อถึง 1.0 s' : `สะดุดไปแล้ว ${S.stalls} ครั้ง · รวม ${S.stallT.toFixed(1)} s`, gx, gy + 44);
    c.restore();
    // BAY 03 · ลิงก์ 10 Mbps แบ่งกันอย่างไร
    b = bayFrame(c, 2, `BAY 03 · แบ่งลิงก์ ${NET.C} Mbps`, st.aqmOn ? 'fq_codel' : 'FIFO', st.aqmOn ? BAY_BG.cyan : BAY_BG.grey);
    bigValue(c, b, (st.rateVid + st.rateDl).toFixed(0), 'Mbps', `ขอเข้ามา · ส่งออกได้แค่ ${NET.C} · ทิ้ง ${Math.round(st.dropRate)} pk/s`);
    chartBox(c, b);
    c.save();
    const cw = b.cw - 16, cx0 = b.cx + 8;
    [['วิดีโอ', st.rateVid, st.vidGot, '#c8f04a'], ['โหลด', st.rateDl, st.dlGot, '#ffcf6b']].forEach(([n, ask, got, col], i) => {
      const yy = b.cy + 14 + i * 30;
      c.font = `700 9.5px ${FONT_MONO}`; c.fillStyle = '#6b6f7a'; c.fillText(n, cx0, yy + 8);
      const px0 = cx0 + 42, pw = cw - 42, SX = (v) => (clamp(v / 30) * pw);
      c.fillStyle = '#e6e2d8'; rr(c, px0, yy, Math.max(1, SX(ask)), 13, 3); c.fill();      // ขอ
      c.fillStyle = col; rr(c, px0, yy + 2.5, Math.max(1, SX(got)), 8, 3); c.fill();        // ได้
      c.lineWidth = 1.1; c.strokeStyle = 'rgba(29,32,51,0.45)'; rr(c, px0, yy, Math.max(1, SX(ask)), 13, 3); c.stroke();
      c.font = `700 9px ${FONT_MONO}`; c.fillStyle = INK; c.fillText(`${got.toFixed(1)}`, px0 + SX(ask) + 5, yy + 8);
    });
    c.font = `400 9px ${FONT_MONO}`; c.fillStyle = '#8a8e99'; c.fillText('แถบเทา = ที่ขอ · แถบสี = ที่ได้', cx0, b.cy + b.ch - 5);
    c.restore();
    // BAY 04 · ผลลัพธ์ของแต่ละบท
    const R = S.res;
    b = bayFrame(c, 3, TL.live ? 'BAY 04 · ผลลัพธ์ · เทียบ 3 บท' : 'BAY 04 · ผลลัพธ์', R[0], NC_BG[R[2]]);
    c.save(); c.textBaseline = 'middle'; c.fillStyle = INK; c.font = `700 17px ${FONT_MONO}`;
    c.fillText(R[0], b.x + 14, b.y + 60);
    c.font = `400 11.5px ${FONT_MONO}`; c.fillStyle = '#6b6f7a'; c.fillText(R[1], b.x + 14, b.y + 84);
    for (let i = 0; i < 3; i++) {
      const row = st.tally[i], cc = NC_CH[i], x = b.x + 14 + i * 112, y = b.y + 120;
      // ตอนลองเอง ให้ทั้งสามช่องเป็นค่าอ้างอิงจาก 3 บท ไว้เทียบกับที่ผู้ชมทำได้
      const F = TL.live ? ncChRes(i) : row && row.done ? row.S : null;
      c.fillStyle = F ? ncCol(F.res[2]) : '#fffdf8'; rr(c, x, y, 104, 62, 9); c.fill(); c.lineWidth = 1.4; c.strokeStyle = INK; c.stroke();
      c.fillStyle = INK; c.textAlign = 'center'; c.font = `700 10px ${FONT_MONO}`;
      c.fillText(`${cc.dl} Mbps${cc.aqm ? ' +AQM' : ''}`, x + 52, y + 17);
      c.font = `700 15px ${FONT_MONO}`; c.fillText(F ? `${Math.round(F.rtt)} ms` : row ? '…' : '·', x + 52, y + 40);
      c.textAlign = 'left';
    }
    c.restore();
  },
  speedBadge(TL, st) {
    if (TL.live) return { txt: `ตาคุณแล้ว · ×${NC_LIVE_RATE}`, bg: BAY_BG.lime };
    const ch = st.ch;
    if (!ch) return st.placedCount < TL.total ? { txt: 'กำลังประกอบ', bg: BAY_BG.amber } : { txt: 'พร้อม', bg: BAY_BG.lime };
    if (st.t >= TL.T.caption) return { txt: 'คิวสั้น = วิดีโอลื่น', bg: BAY_BG.lime };
    if (st.mt > 0) return { txt: ch.rate > 1 ? `×${ch.rate} · เร่งเวลา` : 'เวลาจริง ×1', bg: ch.rate > 1 ? BAY_BG.coral : BAY_BG.lime };
    return { txt: 'ตั้งต้น', bg: BAY_BG.amber };
  },
  audioCues(TL) {
    if (TL.live) return [];
    const cu = [];
    for (const ch of TL.CH) {
      const a = ch.t0 + NC_LEAD, b = a + ch.vid;
      cu.push({ type: 'whoosh', t: ch.t0, t1: ch.t0 + 0.9 }, { type: 'whir', t: a, t1: b, f: 74, gain: 0.045 });
      if (ch.id === 'idle') cu.push({ type: 'blip', t: a + 0.3, f: 880 }, { type: 'ding', t: b + 0.1 });
      if (ch.id === 'load') {
        cu.push({ type: 'power', t: a });
        for (let k = 0; k < 5; k++) cu.push({ type: 'blip', t: a + 0.5 + k * 0.4, f: 520 - k * 70 });
        cu.push({ type: 'error', t: a + 18 / ch.rate }, { type: 'thud', t: b + 0.1 });
      }
      if (ch.id === 'aqm') cu.push({ type: 'detent', t: a + 0.1 }, { type: 'whoosh', t: a + 0.2, t1: a + 1.3 }, { type: 'ding', t: a + 1.8 });
    }
    cu.push({ type: 'whoosh', t: TL.T.caption - 0.3, t1: TL.T.caption + 0.9 }, { type: 'caption', t: TL.T.caption });
    return cu;
  },
};
