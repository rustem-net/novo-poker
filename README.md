# Novo Poker

Offline poker practice game. Open `index.html` in a browser; no build step or server is required.

The home screen and game header show the release version (`v0.x`). Increment the `VERSION` constant in `index.html` before each push, including it in the release commit. Reuse the version when retrying a failed push.

Choose one, two, or three boxes when the app opens. The count stays fixed across rounds; refresh to choose again. All boxes share a deck, dealer, and bankroll. Tap an unfinished hand to activate its shared controls. The dealer reveals after every box has bet or folded, with individual results and a net round total.

Run `node verify-multibox.cjs` to check multi-box dealing, independent draws, funds checks, settlement, and round reset.

Hearts and diamonds are red; clubs and spades are black. Ace–King qualifies and pays 1:1. Exchanged cards and sixth cards stay hidden until all boxes have chosen an exchange, sixth card, bet, or fold; all replacements then reveal together before exchanged hands bet or fold.

Ace–King also pays an extra 1:1 alongside a stronger winning combination if at least one of the Ace or King cards is outside that main combination (kickers do not belong to the main combination). This applies to five- and six-card hands. A K 2 2 4 pays 2:1 in total but ranks as one pair; A K 3 3 3 pays 4:1 but ranks as three of a kind. A plain Ace–King hand pays only once. Both combinations pay only when the primary hand beats a qualifying dealer, and the combined payout determines the insurance maximum. Other types of second-combination payouts are not implemented.

Player hands automatically sort highest first after the initial deal animation and after exchanged or sixth cards are revealed. Cards keep their positions while exchanges are pending.

When the best hand is a five-high straight or straight flush, Ace displays low (5, 4, 3, 2, A). Otherwise Ace stays high, including A, K, Q, J, 10.

The dealer sorts after its full reveal. During pending exchanges, discarded cards remain visible and dimmed so players can refer to them while deciding on other boxes. The new sixth card remains face down until the shared reveal.

After all boxes finish their exchange decisions, replacement cards arrive one at a time, followed by a short pause and a smooth sort. Initial hands and the revealed dealer also slide into sorted order. Controls stay locked during animations; reduced-motion preferences skip dealing and sorting movement. With Playwright available, `node verify-animations.cjs` checks animation sequencing and control locks.

The game fits the dynamic viewport height, dividing the available table space evenly between the chosen boxes. Dealer and controls stay compact; rules open with the header's question-mark button. In short landscape viewports, controls move beside the table.

With Playwright available, run `node verify-layout.cjs` to check one, two, and three boxes at iPhone 12 Pro dimensions (390 × 844), shorter browser viewports, and landscape. It uses installed Chrome by default; set `LAYOUT_BROWSER=msedge` to use Edge.

Insurance is optional per box for Three of a Kind or better. Open Insurance, select an amount with the popup slider in Ante-sized steps, and confirm with OK. Cancel leaves the selection unchanged; Remove clears it. Stakes range from one Ante to half the potential Bet winnings, limited by funds remaining after the required Bet. Insurance is deducted together with Bet, cleared by a draw or fold, and reset each round. Dealer no game pays insurance 1:1; a loss or tie returns it; a win against a qualifying dealer loses it.

When the dealer reveals no game, each non-folded box may pay one Ante for a sixth dealer card or choose Keep No Game. There is no minimum player hand. All boxes decide before one shared card is drawn from the remaining deck; the dealer retains its five original cards and uses its best five out of six. Only purchasing boxes face the new hand; declining boxes keep the original no-game payout. The purchase fee is always lost, including on a tie or if the dealer still has no game. If it still has no game, the existing Ante 1:1 payout and Bet return apply. Insurance pays from the original no-game reveal, even if a purchase then qualifies the dealer. Folded boxes do not participate. Fees and results reset each round.

When the dealer reveals no game, each non-folded box may pay one Ante for a sixth dealer card or choose Keep No Game. There is no minimum player hand. All boxes decide before one shared card is drawn from the remaining deck; the dealer retains its five original cards and uses its best five out of six. Only purchasing boxes face the new hand; declining boxes keep the original no-game payout. The purchase fee is always lost, including on a tie or if the dealer still has no game. If it still has no game, the existing Ante 1:1 payout and Bet return apply. Insurance pays from the original no-game reveal, even if a purchase then qualifies the dealer. Folded boxes do not participate. Fees and results reset each round.
