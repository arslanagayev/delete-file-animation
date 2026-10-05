import { mountReel, sleep } from './reel/reel.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const panel = document.querySelector('.files');
const rows = [...panel.querySelectorAll('.file')];
const count = panel.querySelector('.files-count');
const toast = panel.querySelector('.toast');
const toastText = toast.querySelector('.toast-text');
const undoButton = toast.querySelector('.toast-undo');

// Every row gets the same animated button markup as the first one.
const template = rows[0].querySelector('.del');
rows.slice(1).forEach((row) => {
  const button = row.querySelector('.del');
  button.innerHTML = template.innerHTML;
});

const flyLayer = document.createElement('div');
flyLayer.className = 'fly-layer';
panel.append(flyLayer);

let lastDeleted = null;
let toastTimer;

function updateCount() {
  const visible = rows.filter((row) => !row.hidden).length;
  count.textContent = `${visible} file${visible === 1 ? '' : 's'}`;
}

/** Position of an element's centre inside the panel, independent of any CSS scale on the page. */
function centreIn(el) {
  const p = panel.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const scale = p.width / panel.offsetWidth;
  return { x: (r.left + r.width / 2 - p.left) / scale, y: (r.top + r.height / 2 - p.top) / scale };
}

/** The file badge leaves its row and arcs into the bin. */
async function flyIntoBin(row, can) {
  const badge = row.querySelector('.file-icon');
  const from = centreIn(badge);
  const to = centreIn(can);
  const ghost = badge.cloneNode(true);
  flyLayer.append(ghost);
  badge.style.visibility = 'hidden';

  const w = badge.offsetWidth / 2;
  const h = badge.offsetHeight / 2;
  const peak = Math.min(from.y, to.y) - 70; // top of the arc
  await ghost.animate([
    { transform: `translate(${from.x - w}px, ${from.y - h}px) rotate(0) scale(1)` },
    { transform: `translate(${(from.x + to.x) / 2 - w}px, ${peak - h}px) rotate(160deg) scale(0.8)`, offset: 0.55 },
    { transform: `translate(${to.x - w}px, ${to.y - h - 14}px) rotate(300deg) scale(0.25)`, opacity: 1, offset: 0.9 },
    { transform: `translate(${to.x - w}px, ${to.y - h}px) rotate(320deg) scale(0.1)`, opacity: 0 },
  ], { duration: 720, easing: 'cubic-bezier(.45,.05,.55,.95)' }).finished;
  ghost.remove();
}

async function deleteRow(row) {
  const button = row.querySelector('.del');
  const label = button.querySelector('.del-label');
  const can = button.querySelector('.can');
  const lid = can.querySelector('.lid');
  const paper = can.querySelector('.paper');
  button.disabled = true;
  label.textContent = 'Deleting';

  if (!reducedMotion) {
    // 1. Lid swings open on its hinge.
    lid.animate([{ transform: 'none' }, { transform: 'translate(1px, -3px) rotate(-40deg)' }],
      { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
    // 2. The file arcs into the bin, then a sheet drops past the rim.
    await flyIntoBin(row, can);
    await paper.animate([
      { transform: 'translateY(-4px) scale(0.9)', opacity: 1 },
      { transform: 'translateY(9px) scale(0.75)', opacity: 1, offset: 0.8 },
      { transform: 'translateY(11px) scale(0.6)', opacity: 0 },
    ], { duration: 280, easing: 'ease-in' }).finished;
    // 3. Lid slams shut with a bounce and the bin wobbles.
    lid.animate([{ transform: 'translate(1px, -3px) rotate(-40deg)' }, { transform: 'none' }],
      { duration: 380, easing: 'cubic-bezier(.34,1.8,.64,1)', fill: 'forwards' });
    await can.animate([
      { transform: 'rotate(0)' }, { transform: 'rotate(-10deg)' }, { transform: 'rotate(7deg)' },
      { transform: 'rotate(-3deg)' }, { transform: 'rotate(0)' },
    ], { duration: 420, delay: 120 }).finished;
  }

  button.classList.add('done');
  label.textContent = 'Deleted';
  await sleep(450);

  // 4. The row slides away and the list closes the gap.
  if (!reducedMotion) {
    await row.animate([
      { opacity: 1, transform: 'translateX(0)', height: `${row.offsetHeight}px` },
      { opacity: 0, transform: 'translateX(-40px)', height: `${row.offsetHeight}px`, offset: 0.5 },
      { opacity: 0, transform: 'translateX(-40px)', height: '0px', paddingBlock: '0px', marginBottom: '-10px' },
    ], { duration: 520, easing: 'cubic-bezier(.65,0,.35,1)' }).finished;
  }
  row.hidden = true;
  lastDeleted = row;
  updateCount();
  showToast(`${row.dataset.name} deleted`);
}

function restoreRow(row) {
  const button = row.querySelector('.del');
  button.disabled = false;
  button.classList.remove('done');
  button.querySelector('.del-label').textContent = 'Delete';
  row.querySelector('.file-icon').style.visibility = '';
  row.hidden = false;
  updateCount();
}

function showToast(text) {
  toastText.textContent = text;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 5000);
}

undoButton.addEventListener('click', () => {
  if (!lastDeleted) return;
  const row = lastDeleted;
  lastDeleted = null;
  restoreRow(row);
  if (!reducedMotion) {
    row.animate([
      { opacity: 0, transform: 'translateY(-8px) scale(0.98)' },
      { opacity: 1, transform: 'none' },
    ], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
  toast.classList.remove('show');
  row.querySelector('.del').focus();
});

rows.forEach((row) => {
  row.querySelector('.del').addEventListener('click', () => deleteRow(row));
});

function reset() {
  rows.forEach(restoreRow);
  toast.classList.remove('show');
  flyLayer.replaceChildren();
}

/* ---------- Reel mode ---------- */

mountReel({
  eyebrow: 'UI animation #02',
  title: 'Delete File',
  accent: 'Button',
  demo: panel,
  demoScale: 1.75,
  file: 'delete-file-animation/script.js',
  code: `
// The lid swings open on its hinge...
lid.animate(
  [{ transform: 'none' },
   { transform: 'translate(1px, -3px) rotate(-40deg)' }],
  { duration: 260, fill: 'forwards' },
);
await flyIntoBin(row, can); // file arcs into the bin

// ...then slams shut with an overshoot bounce
lid.animate(
  [{ transform: 'rotate(-40deg)' }, { transform: 'none' }],
  { duration: 380, easing: 'cubic-bezier(.34, 1.8, .64, 1)' },
);`,
  reset,
  async play({ cursor, sleep, waitFor }) {
    const toastShown = () => toast.classList.contains('show');
    await cursor.click(rows[0].querySelector('.del'));
    await waitFor(toastShown);
    await sleep(500);
    await cursor.click(undoButton);
    await sleep(900);
    await cursor.click(rows[1].querySelector('.del'));
    await waitFor(toastShown);
    await sleep(1400);
  },
});
