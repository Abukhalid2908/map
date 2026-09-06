export function groupPoints(rows, project, radius = 42) {
  const groups = [];
  for (const row of rows) {
    const point = project(row);
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    const nearby = groups.find(
      (g) => Math.hypot(g.x - point.x, g.y - point.y) < radius,
    );
    if (nearby) {
      nearby.items.push(row);
    } else groups.push({ x: point.x, y: point.y, items: [row] });
  }
  return groups.map((g) => ({
    items: g.items,
    latitude: g.items.reduce((sum, f) => sum + f.latitude, 0) / g.items.length,
    longitude:
      g.items.reduce((sum, f) => sum + f.longitude, 0) / g.items.length,
  }));
}
