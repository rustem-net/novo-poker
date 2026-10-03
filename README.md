# Novo Poker

Offline poker practice game. Open `index.html` in a browser; no build step or server is required.

Choose one, two, or three boxes when the app opens. The count stays fixed across rounds; refresh to choose again. All boxes share a deck, dealer, and bankroll. Tap an unfinished hand to activate its shared controls. The dealer reveals after every box has bet or folded, with individual results and a net round total.

Run `node verify-multibox.cjs` to check multi-box dealing, independent draws, funds checks, settlement, and round reset.
