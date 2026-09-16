const { PNG } = require("../node_modules/.pnpm/pngjs@3.4.0/node_modules/pngjs");
const fs = require("fs");
const path = require("path");

const size = 81;
const output = path.resolve(__dirname, "../miniprogram/assets/icons");

function canvas() { return new PNG({ width: size, height: size, colorType: 6 }); }
function pixel(png, x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (Math.floor(y) * size + Math.floor(x)) * 4;
  png.data[i] = color[0]; png.data[i + 1] = color[1]; png.data[i + 2] = color[2]; png.data[i + 3] = 255;
}
function dot(png, x, y, radius, color) {
  for (let py = y - radius; py <= y + radius; py++) for (let px = x - radius; px <= x + radius; px++) if ((px - x) ** 2 + (py - y) ** 2 <= radius ** 2) pixel(png, px, py, color);
}
function line(png, x1, y1, x2, y2, width, color) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let i = 0; i <= steps; i++) dot(png, x1 + (x2 - x1) * i / steps, y1 + (y2 - y1) * i / steps, width / 2, color);
}
function circle(png, cx, cy, radius, width, color) {
  for (let a = 0; a < Math.PI * 2; a += .01) dot(png, cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, width / 2, color);
}
function save(name, active, draw) {
  const png = canvas();
  draw(png, active ? [9, 103, 232] : [138, 147, 162]);
  fs.writeFileSync(path.join(output, `${name}${active ? "-active" : ""}.png`), PNG.sync.write(png));
}
for (const active of [false, true]) {
  save("tab-home", active, (p, c) => { line(p, 17, 37, 40, 17, 5, c); line(p, 40, 17, 64, 37, 5, c); line(p, 21, 34, 21, 64, 5, c); line(p, 60, 34, 60, 64, 5, c); line(p, 21, 64, 60, 64, 5, c); line(p, 34, 64, 34, 48, 5, c); line(p, 47, 48, 47, 64, 5, c); line(p, 34, 48, 47, 48, 5, c); });
  save("tab-books", active, (p, c) => { line(p, 18, 18, 18, 63, 5, c); line(p, 18, 18, 58, 18, 5, c); line(p, 18, 63, 58, 63, 5, c); line(p, 58, 18, 58, 63, 5, c); line(p, 29, 14, 29, 27, 5, c); line(p, 47, 14, 47, 27, 5, c); });
  save("tab-translate", active, (p, c) => { line(p, 16, 24, 58, 24, 5, c); line(p, 48, 15, 58, 24, 5, c); line(p, 48, 33, 58, 24, 5, c); line(p, 64, 57, 22, 57, 5, c); line(p, 32, 48, 22, 57, 5, c); line(p, 32, 66, 22, 57, 5, c); });
  save("tab-account", active, (p, c) => { circle(p, 40, 28, 12, 5, c); for (let a = Math.PI * 1.1; a < Math.PI * 1.9; a += .01) dot(p, 40 + Math.cos(a) * 25, 69 + Math.sin(a) * 25, 3, c); });
}
