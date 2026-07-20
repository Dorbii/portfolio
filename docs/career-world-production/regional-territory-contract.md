# Career World regional territory contract

Status: layout authority for the regional-layout phase  
Scope stop: five standalone territories with local node placement  
Out of scope: final world stitching, runtime registry migration, camera travel between territories, and public deployment

## Authority resolution

The latest direction replaces the existing global land map as a layout source. The current 1600 x 900 world image, its employer anchors, its zone rectangles, and its scene-composition coordinates are implementation history only. They must not be copied into these regional layouts or treated as constraints on the later stitch.

This is a narrow supersession. The following contracts remain authoritative:

- five employer identities and project ownership;
- evidence status and evidence trace ownership;
- employer-local skill instances rather than global shared skill nodes;
- canonical art identity and the accepted concept-review decisions;
- exact orthographic true-isometric projection for production art;
- capital > project > skill visual hierarchy;
- identity-only restrictions for ACE Hardware and Column Technologies;
- no invented performance, business, security, customer, or architecture claims.

The new authority chain for geography is:

1. this contract;
2. `design/career-world/territories/territory-layouts.json`;
3. the five generated regional SVG/PNG previews;
4. a future, separately approved stitching contract.

The existing global map and global coordinates are explicitly absent from that chain.

## Art decisions used by the layouts

- The 36 explicitly locked tournament selections remain locked.
- Tanium, CableCar, Vendy VM Platform, AI, Java, OpenAPI, and React receive two directed replacement candidates each. The art director selects one per asset without another ten-concept tournament.
- Career World Portfolio, Context Compression, Python, and Cargo Boat use their completed review result rather than an arbitrary new batch. Python remains Python-specific. TypeScript remains locked to its TypeScript selection.
- City Shuttle, Commuter Car, Delivery Van, Cargo Boat, Harbor Ferry, Service Truck, and Work Skiff form a mixed transport pool. They are environmental variants, not single-winner landmarks.
- Existing ambient variant kits remain mixed pools.
- `skill/safe-writes@v1` and `skill/manifest-v3@v1` are excluded from these layouts.

## Territory sizing

Territory size is based on approved layout load, using one capital weight of 4, each project weight of 2, and each local skill weight of 1. This is a composition budget, not a ranking of employers or work quality.

| Territory | Capital | Projects | Skills | Layout weight | Local canvas |
| --- | ---: | ---: | ---: | ---: | ---: |
| NinjaOne | 1 | 3 | 16 | 26 | 1280 x 880 |
| Tanium | 1 | 5 | 9 | 23 | 1160 x 820 |
| Independent | 1 | 2 | 6 | 14 | 920 x 680 |
| Column Technologies | 1 | 3 | 3 | 13 | 860 x 640 |
| ACE Hardware | 1 | 3 | 1 | 11 | 780 x 600 |

Canvas dimensions are intentionally not normalized to one common rectangle. One local unit has the same intended stitch-scale across territories, so a later compositor can preserve these size differences instead of squeezing all nodes into equal zones.

## Shared local-coordinate rules

- Origin is the upper-left corner of each territory canvas.
- Positions identify the center of the reserved node footprint.
- Reserved planning footprints are 176 x 112 for capitals, 92 x 60 for projects, and 52 x 36 for skills.
- A node must remain inside the safe land inset and must not overlap another reserved footprint.
- Capital-to-project routes express navigation hierarchy. Project-to-skill routes are allowed only for evidence-backed links in the registry.
- ACE Hardware and Column Technologies may have circulation routes, but their project nodes must not be connected to skills as if a technical relationship were verified.
- Mixed transport, foliage, rock, pier, buoy, roof-equipment, and street-furniture assets are terrain dressing. They do not consume canonical node IDs.

## Regional topography and circulation

### NinjaOne — relay plateau

The largest territory is a sheltered, concentric service plateau with a protected southwest maintenance basin. The capital owns the center. Three project districts form a broad operational ring; their shared skills occupy junctions and the outer service loop. The shape is radial without copying the existing landmass.

### Tanium — inspection escarpment

A long diagonal ridge is divided into controlled terraces and narrow passes. Projects follow a sequential ridge route rather than a radial campus. The new T-shaped capital anchors the middle terrace; a narrow inspection channel and hard quay define the southeast boundary.

### Independent — maker peninsula

An irregular rocky peninsula rises around a triangular review cut. ContextForge occupies the research/workshop side, Career World Portfolio the public delivery side, and the capital mediates between them. A diagonal discovery-to-delivery promenade replaces corporate symmetry.

### Column Technologies — engineered breakwater

A rectilinear harbor territory uses straight seawalls, protected basins, and long structural terraces. The circulation is formal and service-oriented. This is visual organization only; it does not claim unverified project architecture or skill links.

### ACE Hardware — workshop cove

The smallest territory is a compact low island around a working cove, repair apron, and modest civic rise. Branching service lanes connect the capital and three named project landmarks. This is entertainment topography, not a depiction of a real campus or business workflow.

## Completion gate

This phase is complete only when:

- exactly five standalone layout records and five rendered regional previews exist;
- the node counts are 20, 15, 9, 7, and 5 respectively, for 56 total;
- every node ID is unique and employer-local;
- the two excluded skills are absent;
- all nodes pass bounds and overlap checks;
- no ACE Hardware or Column Technologies project-to-skill link is drawn;
- the layouts contain no inherited global coordinates;
- the final stitched map has not been created.
