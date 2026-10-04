# Novo Poker

Offline poker practice game. Open `index.html` in a browser; no build step or server is required.

The home screen and game header show the release version (`v0.x`). Increment the `VERSION` constant in `index.html` before each push, including it in the release commit. Reuse the version when retrying a failed push.

Choose one, two, or three boxes when the app opens. The count stays fixed across rounds; refresh to choose again. All boxes share a deck, dealer, and bankroll. Tap an unfinished hand to activate its shared controls. The dealer reveals after every box has bet or folded, with individual results and a net round total.

Run `node verify-multibox.cjs` to check multi-box dealing, independent draws, funds checks, settlement, and round reset.

Hearts and diamonds are red; clubs and spades are black. Ace–King qualifies and pays 1:1. Exchanged cards and sixth cards stay hidden until all boxes have chosen an exchange, sixth card, bet, or fold; all replacements then reveal together before exchanged hands bet or fold.

Player hands automatically sort highest first after the initial deal animation and after exchanged or sixth cards are revealed. Cards keep their positions while exchanges are pending.

When the best hand is a five-high straight or straight flush, Ace displays low (5, 4, 3, 2, A). Otherwise Ace stays high, including A, K, Q, J, 10.

The game fits the dynamic viewport height, dividing the available table space evenly between the chosen boxes. Dealer and controls stay compact; rules open with the header's question-mark button. In short landscape viewports, controls move beside the table.

With Playwright available, run `node verify-layout.cjs` to check one, two, and three boxes at iPhone 12 Pro dimensions (390 × 844), shorter browser viewports, and landscape. It uses installed Chrome by default; set `LAYOUT_BROWSER=msedge` to use Edge.
