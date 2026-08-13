# Coastline motion

Owns persistent water-side shoreline response: wet contact, swash, breakers,
and foam derived from the registered coast geometry and material fields.

The current validation pass is intentionally bounded. It adds broken advancing
and receding swash, a narrow irregular wet contact, and slightly stronger
close-tier foam so beach ramps and cliff contacts can be evaluated with motion.
Open-water color, wave scale, directional texture, and world clock remain
unchanged.

Static beach, cliff, and shelf geometry stays in `terrain/authority`.
One-off crash accents and particles remain deferred to `actors-effects`.
