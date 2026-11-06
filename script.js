// ---------- Constants (simplified Sorry!, now with a real die) ----------
const TRACK_LEN = 60;            // squares around the outside edge
const HOME = 60;                 // progress value that means "in Home"
const MAX_TURNS = 150;           // turn limit (75 each) is a backstop so a game can't run forever
const LOCK_MS = 200;             // quick-click guard after each accepted move
const ROLL_MS = 700;             // how long the die "rolls" on screen
const DIE_SIDES = 6;             // one 6-sided die
const LEAVE_START_ROLLS = [1, 6]; // RULE: a pawn leaves Start only on one of these rolls
const COLORS = ["red", "blue"];
const START_INDEX = { red: 0, blue: 30 };   // track square where each color enters

// Pip positions (0-8 in a 3x3 grid) for each die face
const PIPS = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]
};

// ---------- Game state: stored here ----------
// pawns[color][i] is that pawn's progress:
//   -1 = in Start, 0..59 = steps taken along the track, 60 = in Home
let pawns;
let currentPlayer;   // "red" or "blue"
let drawnCard;       // die roll for this turn, or null if not rolled yet
let lastCard;        // last roll (kept on screen)
let lastCardBy;      // who rolled it
let turnNumber;      // 1..MAX_TURNS
let gameOver;
let rolling = false; // true while the die animation plays
let locked = false;  // true for a moment after each accepted move
let lockTimer = null, rollTimer = null, faceTimer = null;

// Track square k -> [row, col] on the 16x16 grid
function buildCoords() {
  const c = [];
  for (let col = 0; col < 16; col++) c.push([0, col]);
  for (let row = 1; row < 16; row++) c.push([row, 15]);
  for (let col = 14; col >= 0; col--) c.push([15, col]);
  for (let row = 14; row >= 1; row--) c.push([row, 0]);
  return c;
}
const COORDS = buildCoords();

function trackIndex(color, progress) {
  return (START_INDEX[color] + progress) % TRACK_LEN;
}
function otherColor(color) {
  return color === "red" ? "blue" : "red";
}
function name(color) {
  return color === "red" ? "Red" : "Blue";
}

// ---------- Visual die ----------
function buildDie() {
  const die = document.getElementById("die");
  die.innerHTML = "";
  for (let i = 0; i < 9; i++) {
    const pip = document.createElement("span");
    pip.className = "pip off";
    die.appendChild(pip);
  }
}
function showFace(n) {                 // n = 1..6, or null for a blank die
  const pips = document.getElementById("die").children;
  for (let i = 0; i < 9; i++) {
    const on = n !== null && PIPS[n].includes(i);
    pips[i].className = "pip" + (on ? "" : " off");
  }
}

// ---------- Quick-click guard ----------
function lockInput() {
  locked = true;
  clearTimeout(lockTimer);
  lockTimer = setTimeout(() => { locked = false; }, LOCK_MS);
}

// ---------- Setup / reset ----------
function resetGame() {
  clearTimeout(lockTimer);
  clearTimeout(rollTimer);
  clearInterval(faceTimer);
  locked = false;
  rolling = false;
  document.getElementById("die").classList.remove("rolling");
  pawns = { red: [-1, -1], blue: [-1, -1] };
  currentPlayer = "red";
  drawnCard = null;
  lastCard = null;
  lastCardBy = null;
  turnNumber = 1;
  gameOver = false;
  showFace(null);
  setMessage("Red: roll the die.");
  render();
}

// ---------- Score / progress ----------
function score(color) {
  let home = 0, steps = 0;
  pawns[color].forEach(p => {
    if (p === HOME) home++;
    if (p > 0) steps += p;
  });
  return { home: home, steps: steps };
}

// ---------- Rolling the die (a turn starts here) ----------
function rollDie() {
  if (gameOver) { setMessage("The game is over. Press Reset to play again."); return; }
  if (rolling || locked) return;                  // quick-click guard
  if (drawnCard !== null) {
    setMessage("You already rolled a " + drawnCard + ". Click one of your pawns.");
    return;
  }
  rolling = true;
  const value = 1 + Math.floor(Math.random() * DIE_SIDES);
  const die = document.getElementById("die");
  die.classList.add("rolling");
  faceTimer = setInterval(() => showFace(1 + Math.floor(Math.random() * DIE_SIDES)), 80);
  setMessage(name(currentPlayer) + " is rolling...");
  rollTimer = setTimeout(() => finishRoll(value), ROLL_MS);
}

function finishRoll(value) {
  clearInterval(faceTimer);
  document.getElementById("die").classList.remove("rolling");
  rolling = false;
  showFace(value);
  drawnCard = value;
  lastCard = value;
  lastCardBy = currentPlayer;
  if (!anyLegalMove(currentPlayer, value)) {
    const who = name(currentPlayer);
    const ended = finishTurn();                   // turn passes: no legal move
    if (!ended) setMessage(who + " rolled " + value + ": no legal move. " + name(currentPlayer) + "'s turn - roll the die.");
  } else {
    setMessage(name(currentPlayer) + " rolled " + value + ". Click one of your pawns to move it.");
  }
  render();
}

// ---------- Is this move legal? ----------
function checkMove(color, i, roll) {
  const p = pawns[color][i];
  let target;
  if (p === HOME) return { ok: false, reason: "that pawn is already Home." };
  if (p === -1) {
    if (!LEAVE_START_ROLLS.includes(roll)) {
      return { ok: false, reason: "a pawn needs a " + LEAVE_START_ROLLS.join(" or ") + " to leave Start." };
    }
    target = 0;
  } else {
    target = p + roll;
    if (target > HOME) return { ok: false, reason: "that would go past Home (needs an exact count)." };
  }
  const ownBlocking = pawns[color].some((q, j) => j !== i && q >= 0 && q < HOME && q === target);
  if (target < HOME && ownBlocking) return { ok: false, reason: "your own pawn is on that square." };
  return { ok: true, target: target };
}

function anyLegalMove(color, roll) {
  return pawns[color].some((_, i) => checkMove(color, i, roll).ok);
}

// ---------- The move: click a pawn (the action completes here) ----------
function clickPawn(color, i) {
  if (gameOver) { setMessage("The game is over. Press Reset to play again."); return; }
  if (rolling || locked) return;
  if (drawnCard === null) { setMessage("Roll the die first."); return; }
  if (color !== currentPlayer) { setMessage("Illegal move: that is not your pawn."); return; }
  const result = checkMove(color, i, drawnCard);
  if (!result.ok) { setMessage("Illegal move: " + result.reason); return; }

  lockInput();
  pawns[color][i] = result.target;               // changes the board
  let note = "";
  if (result.target < HOME) {                    // landing on an opponent bumps it back to Start
    const idx = trackIndex(color, result.target);
    const opp = otherColor(color);
    pawns[opp].forEach((q, j) => {
      if (q >= 0 && q < HOME && trackIndex(opp, q) === idx) {
        pawns[opp][j] = -1;
        note = " Sorry! Bumped a " + opp + " pawn back to Start.";
      }
    });
  }
  if (pawns[color].every(q => q === HOME)) {     // ending: both pawns Home
    endGame(color, name(color) + " wins - both pawns are Home!");
  } else {
    const who = name(color);
    const ended = finishTurn();                  // changes the turn
    if (!ended) setMessage(who + " moved." + note + " " + name(currentPlayer) + "'s turn - roll the die.");
  }
  render();
}

// ---------- Passing the turn and ending the game ----------
// Returns true if this ended the game (turn limit reached).
function finishTurn() {
  drawnCard = null;
  currentPlayer = otherColor(currentPlayer);
  turnNumber++;
  if (turnNumber > MAX_TURNS) {
    decideByTurnLimit();
    return true;
  }
  return false;
}

function decideByTurnLimit() {
  const r = score("red"), b = score("blue");
  let winner = null;
  if (r.home !== b.home) winner = r.home > b.home ? "red" : "blue";
  else if (r.steps !== b.steps) winner = r.steps > b.steps ? "red" : "blue";
  if (winner) endGame(winner, "Turn limit reached. " + name(winner) + " wins on progress!");
  else endGame(null, "Turn limit reached. It's a tie!");
}

function endGame(winner, text) {
  gameOver = true;
  drawnCard = null;
  setMessage(text + " Press Reset to play again.");
}

// ---------- Drawing the page from the state ----------
function setMessage(text) {
  document.getElementById("message").textContent = text;
}

function makePawn(color, i) {
  const b = document.createElement("button");
  b.className = "pawn " + color + (color === currentPlayer && !gameOver ? " active" : "");
  b.title = name(color) + " pawn " + (i + 1);
  b.addEventListener("click", () => clickPawn(color, i));
  return b;
}

function render() {
  document.getElementById("turn").textContent =
    gameOver ? "Game over" : "Current player: " + name(currentPlayer);
  document.getElementById("turncount").textContent =
    "Turn " + Math.min(turnNumber, MAX_TURNS) + " of " + MAX_TURNS;
  document.getElementById("rolltext").textContent =
    lastCard === null ? "Roll: (none yet)" : "Roll: " + lastCard + " (" + name(lastCardBy) + ")";
  const r = score("red"), b = score("blue");
  document.getElementById("scoreboard").textContent =
    "Red: " + r.home + "/2 Home, progress " + r.steps + "/120  |  Blue: " + b.home + "/2 Home, progress " + b.steps + "/120";

  const board = document.getElementById("board");
  board.querySelectorAll(".sq").forEach(el => el.remove());
  for (let k = 0; k < TRACK_LEN; k++) {
    const sq = document.createElement("div");
    sq.className = "sq";
    if (k === START_INDEX.red) sq.classList.add("start-red");
    if (k === START_INDEX.blue) sq.classList.add("start-blue");
    sq.style.gridRow = COORDS[k][0] + 1;
    sq.style.gridColumn = COORDS[k][1] + 1;
    COLORS.forEach(color => {
      pawns[color].forEach((p, i) => {
        if (p >= 0 && p < HOME && trackIndex(color, p) === k) sq.appendChild(makePawn(color, i));
      });
    });
    board.appendChild(sq);
  }

  COLORS.forEach(color => {
    const start = document.getElementById("start-" + color);
    const home = document.getElementById("home-" + color);
    start.innerHTML = "";
    home.innerHTML = "";
    pawns[color].forEach((p, i) => {
      if (p === -1) start.appendChild(makePawn(color, i));
      if (p === HOME) {
        const d = makePawn(color, i);
        d.classList.add("homed");
        home.appendChild(d);
      }
    });
  });
}

// ---------- Fullscreen button ----------
const fsButton = document.getElementById("fullscreen");
if (!document.documentElement || !document.documentElement.requestFullscreen) {
  fsButton.style.display = "none";               // browser can't do fullscreen
}
fsButton.addEventListener("click", () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen().catch(() => {});
  }
});
document.addEventListener("fullscreenchange", () => {
  fsButton.textContent = document.fullscreenElement ? "Exit fullscreen" : "Fullscreen";
});

document.getElementById("roll").addEventListener("click", rollDie);
document.getElementById("reset").addEventListener("click", resetGame);
buildDie();
resetGame();
