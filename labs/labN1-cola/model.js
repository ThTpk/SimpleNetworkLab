// ---------------------------------------------------------------------------
// Lab N1 · คิวในเราเตอร์ (bufferbloat). อินพุตเดียวคืออัตราดาวน์โหลดของเครื่องอื่น (Mbps)
// มันตัดสินว่าคิวหน้าลิงก์ 10 Mbps ยาวแค่ไหน -> RTT กี่ ms -> วิดีโอยังเล่นต่อได้ไหม
// ข้อมูลและสมมติฐานทั้งหมดอยู่ใน note ของ demo.json
// ---------------------------------------------------------------------------
const NET = {
  C: 10,          // Mbps  ลิงก์เข้าบ้าน = คอขวด (สมมติฐาน: แพ็กเกจ 10 Mbps)
  vid: 5,         // Mbps  วิดีโอ 1080p (Netflix: 1080p "5 Mbps or higher")
  refill: 2,      // ×     ตัวเล่นดึงได้เร็วสุด 2 เท่าของบิตเรตเพื่อเติมบัฟเฟอร์ (สมมติฐาน)
  mtu: 1500,      // ไบต์  IP datagram ใหญ่สุดบน Ethernet (RFC 894)
  qmax: 1000,     // แพ็กเก็ต  txqueuelen ปริยายของ Linux (สมมติฐาน)
  rtt0: 20,       // ms    RTT ตอนคิวว่าง (สมมติฐาน)
  target: 5,      // ms    CoDel TARGET (RFC 8289 §4.3)
  interval: 100,  // ms    CoDel INTERVAL (RFC 8289 §4.2)
  play: 6,        // s     วิดีโอที่ตัวเล่นกันไว้ตอนปกติ (สมมติฐาน)
  resume: 1.0,    // s     ต้องมีเท่านี้ก่อนจะเล่นต่อหลังสะดุด (สมมติฐาน)
  pkBox: 250,     // แพ็กเก็ต/กล่องที่วาด (มาตราส่วนของภาพ ไม่ใช่ค่าของเครือข่าย)
};
// คิวเต็ม = 1000 × 1500 × 8 = 12 Mb ; 12 Mb ÷ 10 Mbps = 1.2 s  <- ตรงกับ 1.2 s ที่ Gettys วัดได้
const NET_QBITS = NET.qmax * NET.mtu * 8;
const NET_QMS = (NET_QBITS / (NET.C * 1e6)) * 1000;
const netMs = (q) => (q / (NET.C * 1e6)) * 1000;      // บิตในคิว -> ms ของการหน่วง
const netPk = (q) => q / (NET.mtu * 8);               // บิตในคิว -> จำนวนแพ็กเก็ต
const netQt = () => NET.C * 1e6 * (NET.target / 1000); // คิวเป้าหมายของ CoDel = 50 kb ≈ 4.2 แพ็กเก็ต

// แบ่งแบนด์วิดท์แบบ max-min fair (คือสิ่งที่ fair queueing ทำ)
function netFair(dem, C) {
  const res = dem.map(() => 0); let act = dem.map((_, i) => i), left = C;
  while (act.length) {
    const sh = left / act.length, small = act.filter(i => dem[i] <= sh);
    if (!small.length) { for (const i of act) res[i] = sh; break; }
    for (const i of small) { res[i] = dem[i]; left -= dem[i]; }
    act = act.filter(i => !small.includes(i));
  }
  return res;
}
// ตัวเล่นวิดีโอ: บัฟเฟอร์เต็มก็ขอเท่าบิตเรต ถ้าขาดก็ขอเร็วขึ้นเพื่อเติมกลับ
const netVidDem = (buf) => (buf >= NET.play - 0.05 ? NET.vid : NET.vid * NET.refill);

// หนึ่งก้าวเวลา dt วินาที ด้วยอัตราดาวน์โหลด dl (Mbps) และ AQM เปิด/ปิด
function netStep(S, dl, aqm, dt) {
  const vd = netVidDem(S.buf), lam = vd + dl;
  // ใครได้แบนด์วิดท์เท่าไร: FIFO + tail drop แบ่งตามสัดส่วนที่ส่งเข้ามา, fq_codel แบ่งเท่า ๆ กัน
  const got = lam <= NET.C ? [vd, dl] : aqm ? netFair([vd, dl], NET.C) : [NET.C * vd / lam, NET.C * dl / lam];
  // คิว: ส่วนเกินกองขึ้น; AQM ดึงคิวเข้าหา TARGET ด้วยค่าคงที่เวลา = INTERVAL
  // ระบายเร็วกว่าอัตราที่ลิงก์ส่งออกไม่ได้ -> คิวเต็มใช้เวลา 1.2 s จึงจะว่าง
  let dq = (lam - NET.C) * 1e6;
  if (aqm && lam > NET.C) dq = Math.max((netQt() - S.q) / (NET.interval / 1000), -NET.C * 1e6);
  S.q = clamp(S.q + dq * dt, 0, NET_QBITS);
  // แพ็กเก็ตที่ถูกทิ้ง: FIFO ทิ้งเมื่อคิวเต็ม (tail drop), AQM ทิ้งก่อนเพื่อกดคิวให้สั้น
  const over = Math.max(0, lam - NET.C) * 1e6;
  const dropping = over > 0 && (aqm || S.q >= NET_QBITS - 1);
  S.dropRate = dropping ? over / (NET.mtu * 8) : 0;
  S.drop += S.dropRate * dt;
  // บัฟเฟอร์ของตัวเล่น (วินาทีของวิดีโอ): สะดุดเมื่อหมด, เล่นต่อเมื่อเติมได้ถึง resume
  if (S.stall) { S.buf += (got[0] / NET.vid) * dt; S.stallT += dt; if (S.buf >= NET.resume) S.stall = false; }
  else { S.buf += (got[0] / NET.vid - 1) * dt; S.played += dt; if (S.buf <= 0) { S.buf = 0; S.stall = true; S.stalls++; } }
  S.buf = clamp(S.buf, 0, NET.play);
  S.mb += (got[1] / 8) * dt;
  S.vidGot = got[0]; S.dlGot = got[1]; S.lam = lam; S.dl = dl; S.aqm = aqm;
  return S;
}
// segs = [[t0, dl, aqm], ...] เรียงตามเวลา; ค่าที่ใช้ตอน t คือ seg ล่าสุดที่ t0 <= t
const netSeg = (segs, t) => { let r = segs[0]; for (const s of segs) if (s[0] <= t) r = s; return r; };
const NET_DT = 0.02;
// เดินแบบจำลองจาก 0 ถึง t แล้วคืนสภาพตอนนั้น (init = สภาพเริ่มต้น เช่น คิวเต็มมาก่อน)
function netRun(segs, t, init) {
  const S = Object.assign({ q: 0, buf: NET.play, stall: false, stalls: 0, stallT: 0, drop: 0, dropRate: 0, played: 0, mb: 0, vidGot: NET.vid, dlGot: 0, lam: NET.vid, dl: 0, aqm: 0 }, init || {});
  const n = Math.min(Math.ceil(Math.max(0, t) / NET_DT), 12000);
  for (let k = 0; k < n; k++) { const s = netSeg(segs, k * NET_DT); netStep(S, s[1], s[2], NET_DT); }
  const now = netSeg(segs, Math.max(0, t)); S.dl = now[1]; S.aqm = now[2];
  S.ms = netMs(S.q); S.rtt = NET.rtt0 + S.ms; S.pk = netPk(S.q); S.fill = S.q / NET_QBITS;
  S.res = netVerdict(S);
  return S;
}
// คำตัดสิน: วิดีโอสะดุดสำคัญที่สุด รองลงมาคือ RTT
// สะดุดไปแล้วแม้ครั้งเดียวก็นับว่ากระตุก (บัฟเฟอร์จะเด้งขึ้นลงรอบ 0 ไปเรื่อย ๆ)
function netVerdict(S) {
  if (S.stall || S.stalls > 0) return ['กระตุก', 'บัฟเฟอร์หมด · วิดีโอหยุด', 'coral'];
  if (S.rtt >= 150) return ['หน่วงหนัก', 'คิวยาว · กดอะไรก็ช้า', 'coral'];
  if (S.rtt >= 50) return ['เริ่มหน่วง', 'คิวเริ่มกอง', 'amber'];
  return ['ลื่น', 'คิวสั้น · RTT ต่ำ', 'lime'];
}
