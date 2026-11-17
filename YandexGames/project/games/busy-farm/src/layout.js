// Раскладка фермы: поле, места под мастерские, колодец, склад, машина. Две версии: для широкого и для узкого экрана.
// Ось x вправо, z «вниз по экрану» (к зрителю).

export function makeLayout(portrait) {
  if (!portrait) {
    const field = { x0: -5, x1: 5, z0: -3, z1: 3.2 };
    const slots = [
      { x: -5.4, z: -5.3, face: 0 },
      { x: -1.8, z: -5.3, face: 0 },
      { x: 1.8, z: -5.3, face: 0 },
      { x: 5.4, z: -5.3, face: 0 },
      { x: 8.2, z: -1.6, face: -Math.PI / 2 },
      { x: 8.2, z: 1.9, face: -Math.PI / 2 },
    ];
    return finish({
      portrait: false,
      field,
      slots,
      well: { x: -7.6, z: -1.2 },
      store: { x: -7.6, z: 2.6, face: Math.PI / 2 },
      truck: { x: -3.2, z: 5.6 },
      road: { z: 5.6, exitX: 16 },
      view: { x0: -9.6, x1: 10, z0: -7, z1: 6.6 },
    });
  }
  const field = { x0: -3.7, x1: 3.7, z0: -3.6, z1: 4.2 };
  const slots = [
    { x: -2.7, z: -5.7, face: 0 },
    { x: 0.9, z: -5.7, face: 0 },
    { x: 4.4, z: -5.7, face: 0 },
    { x: -2.7, z: -9.1, face: 0 },
    { x: 0.9, z: -9.1, face: 0 },
    { x: 4.4, z: -9.1, face: 0 },
  ];
  return finish({
    portrait: true,
    field,
    slots,
    well: { x: -5.4, z: -0.4 },
    store: { x: -3.2, z: 6.6, face: 0 },
    truck: { x: 1.6, z: 6.9 },
    road: { z: 6.9, exitX: 12 },
    view: { x0: -6.4, x1: 6, z0: -10.8, z1: 8 },
  });
}

function finish(L) {
  // точка, куда мастерская выкладывает готовый товар: перед зданием, в сторону поля
  for (const s of L.slots) {
    const dx = -Math.sin(s.face),
      dz = Math.cos(s.face);
    s.out = { x: s.x + dx * 1.55, z: s.z + dz * 1.55 };
    // в сторону поля, если мастерская сбоку
    if (Math.abs(s.face) > 0.1) s.out = { x: s.x - 1.55, z: s.z };
  }
  const st = L.store;
  st.door = L.portrait ? { x: st.x + 0.2, z: st.z - 1.4 } : { x: st.x + 1.4, z: st.z };
  return L;
}
