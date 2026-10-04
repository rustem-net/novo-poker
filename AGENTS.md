# Release version

The user requires a visible `v0.x` version that increments with each push.

Before pushing application changes, increment `x` in the `VERSION` constant in `index.html` and include that change in the pushed commit. Check the version on the remote branch first: if the local version is already higher (for example, an unpushed release or a failed push retry), reuse that version instead of incrementing again. The first versioned release is `v0.1`.

Keep the version visible on both the box-selection home screen and the game header. Run `node verify-multibox.cjs` before pushing; run `node verify-layout.cjs` when changing layout if Playwright is available.
