**Prototype run (2026-09-02, `mask-grow.mjs`, reach 48, growth only through
opaque land the classifier calls water, plus the cut feather):** the five
accepted cells grow by `0 / 0 / 103 / 9 / 0` opaque px (quarry, saddle,
coast, gorge, moor) — their masks were complete, nothing changes; the 3,1
candidate grows by `3,248` opaque px (2.3% of its mask), exactly the pool's
west shore and the tarn's south edge the gate flagged, and its rings fall
from `4.90% / 2.49%` to `0.73% / 0.82%` — a pass. The misty chasm-floor
stream (`sat < .25`) is not absorbed. Map:
`review/regen-c3-1-cand3-maskgrow.png` (blue delivered, red grown).

