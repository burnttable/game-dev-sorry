# Sorry! (simplified, 2 players)

A two-player browser board game based on Hasbro's Sorry!, shortened to fit a 5–15 minute game.

## How to open
Open `index.html` in a web browser (double-click it, or choose File > Open). No install needed. Keep `index.html`, `style.css`, `script.js`, and the `images/` folder together. (Path in my repo: `FILL IN, e.g. game/index.html`)

## Controls
- **Roll die:** rolls one 6-sided die for the current player.
- **Click one of your pawns:** moves it by the number rolled. The glowing pawns belong to the current player.
- **Reset:** starts a new game.
- **Fullscreen:** fills your screen (click again, or press Esc, to exit). The board also resizes to fit the browser window.
- Two players share one screen and take turns: Red first, then Blue.

## Rules
- Each player has 2 pawns, which start in Start.
- A pawn needs a **1 or 6** to leave Start and land on your color's Start square.
- On the track, a pawn moves forward by the number rolled.
- Landing on an opponent's pawn sends it back to Start ("Sorry!"). You can't land on your own pawn.
- A pawn must reach Home with an **exact count**.
- If a roll gives you no legal move, your turn passes.
- **Win:** the first player with both pawns Home. After 150 turns the game ends: more pawns Home wins, then more progress; equal is a tie.
- Simplified from the original: a die instead of the card deck, no Sorry! card, no slides, no safety zone, no backward moves, no extra turn on a 6.

## Known bugs / limits
- Student 1 from testing wanted to have it be bigger on the screen and not awkwardly near the top
- Student 2 from testing wanted a physical die to be in there so it's a more visual roll

## Credits
- Rules: Hasbro's Sorry! https://www.hasbro.com/common/instruct/sorry.pdf
- Code written with help from Claude (Anthropic), then tested and edited by me
- Die is drawn with CSS (no outside art).
