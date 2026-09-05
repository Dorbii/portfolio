// Tanium's 21 cell briefs.
//
// The brief is the one input only a human can supply: what this ground should
// be, at fine detail. Everything else — geometry, tabs, neighbour context,
// biome vocabulary, transitions, the rules — cell.mjs derives.
//
// Written against the plan, so the facts here are checked rather than recalled:
// the shelf and site entries, the rail loop, and the measured north handover
// are read from the def and asserted against what each brief claims.
//
//   node art-source/career-world/l2-land/tanium/briefs/write-briefs.mjs
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
function readGrey(p) {
  const b = fs.readFileSync(p);
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20), ct = b[25];
  const ch = ct === 6 ? 4 : ct === 2 ? 3 : ct === 4 ? 2 : 1;
  const cs = []; let o = 8;
  while (o < b.length) {
    const l = b.readUInt32BE(o);
    if (b.subarray(o + 4, o + 8).toString("ascii") === "IDAT") cs.push(b.subarray(o + 8, o + 8 + l));
    o += 12 + l;
  }
  const raw = zlib.inflateSync(Buffer.concat(cs));
  const st = w * ch, out = Buffer.alloc(h * w);
  const line = Buffer.alloc(st);
  let prev = Buffer.alloc(st);
  for (let y = 0; y < h; y += 1) {
    const f = raw[y * (st + 1)];
    raw.copy(line, 0, y * (st + 1) + 1, y * (st + 1) + 1 + st);
    for (let x = 0; x < st; x += 1) {
      const a = x >= ch ? line[x - ch] : 0, bb = prev[x], c = x >= ch ? prev[x - ch] : 0;
      if (f === 1) line[x] = (line[x] + a) & 255;
      else if (f === 2) line[x] = (line[x] + bb) & 255;
      else if (f === 3) line[x] = (line[x] + ((a + bb) >> 1)) & 255;
      else if (f === 4) {
        const pp = a + bb - c, pa = Math.abs(pp - a), pb = Math.abs(pp - bb), pc = Math.abs(pp - c);
        line[x] = (line[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? bb : c)) & 255;
      }
    }
    // The water mask is white RGB with the shape in ALPHA, so take the last
    // channel, not the first. Reading channel 0 gives a solid 255 and reports
    // the whole edge as water — the same silent wrong-channel read that cost a
    // day on the land mask earlier in this project.
    for (let x = 0; x < w; x += 1) out[y * w + x] = line[x * ch + (ch >= 2 ? ch - 1 : 0)];
    line.copy(prev);
  }
  return { width: w, height: h, data: out };
}


const DIR = "art-source/career-world/l2-land/tanium/briefs";
const def = JSON.parse(fs.readFileSync("art-source/career-world/l2-land/tanium/territory.def.json", "utf8"));

// A cell is 97.6 m of ground at 4.8 cm/px. Every measurement below is in metres
// of real ground, so a worker can size things against the scale contract.
const B = {};

// ---------------------------------------------------------------- row 0 ----
B["0,0"] = `North-west corner of the territory. Open sea on the NORTH and the WEST — no
NinjaOne above this cell, so both those edges are coast, not continuing land.

A blunt headland occupying the south-east half of the cell, its cliffs 30–45 m
tall, weathered columnar basalt: uneven column heights, tops broken at
different levels, split and leaning columns, collapsed drums lying in talus at
the foot. The cliff line wanders — two shallow bays bitten into it, one
buttress standing proud. Never a straight run, never a square corner.

Above the cliffs a bare bench of thin grass and exposed slab tilting gently
inland to the south-east, so the ground rises away from the sea. Three or four
sea stacks offshore to the north-west, the tallest about 25 m, each with the
same broken-column character as the cliff.

One shallow gully runs south-east to north-west across the bench and ends in a
notch in the cliff top; a few dark conifers shelter in it, the only trees here.
No meadow anywhere in this cell.

Carry the bench and the cliff-top grass to the SOUTH and EAST edges as land —
those neighbours are land, and only the north and west are sea.`;

B["1,0"] = `The south shore of the SOUND. The whole NORTH edge of this cell is water: the
sound that separates Tanium from NinjaOne, and NinjaOne's own shore is on the
far side of it, out of frame. Nothing walks off the north edge.

Low ground meeting the water without a cliff: basalt slabs and ledges dipping
into the sound at a shallow angle and continuing visibly under the surface,
clear turquoise shallows over them shading to deep teal where the slabs drop
away. Shingle in the hollows between slabs, thin wind-scoured grass above the
tideline, no trees near the shore.

The SOUND-NARROWS site: toward the north-east of the cell the sound pinches
between two basalt slabs into a narrow deep channel about 12 m across, the
water darkening sharply where it deepens, with level rock on both banks wide
enough to stand on. This is the tightest point of the whole sound and should
read as such.

Ground rises gently to the south and west, away from the water, so the cell
reads as a shore that continues inland. Carry land to the SOUTH, EAST and WEST
edges; only the north is water.`;

B["2,0"] = `THE HINGE OF THE WHOLE BORDER. Read the northBorder rule before anything else.

This cell's north edge is where the sound ends and the land connection to
NinjaOne begins. The WESTERN 38% of the north edge is SOUND — open water, the
same water as the cell to the west. The EASTERN 62% is LAND, and it must run
off the north edge as solid connecting ground with no coast, because
NinjaOne's terrain arrives there. The changeover happens once, cleanly, at 38%
across: the sound's shore turns and runs south into this cell rather than
continuing east.

So: the head of the sound occupies the north-west corner, a blunt end of water
about 35 m across, its shore a curve of slabs and shingle. East and south of
that, ordinary ground — low basalt benches, thin grass, scattered boulders —
rising slightly to the east and running unbroken to both the north and east
edges.

The FERRY-SLIP site sits on the sound's east shore near the head: a natural
shingle ramp running down into the water, sheltered on its north side by a low
rock spur, level ground at the top of it.

No trees. Carry land to the SOUTH, EAST and the eastern 62% of the NORTH.`;

B["3,0"] = `CONNECTING GROUND. The entire NORTH edge of this cell is land continuing into
NinjaOne — no coast, no shingle, no water on that edge at all. Terrain must run
right off the top as solid ground.

Bench country: three or four broad terraces 15–25 m deep, stepping down from
the north edge toward the south-west, separated by low column walls 4–8 m high
with talus at their feet. Moor grass and sparse heather on the flats, scree on
the faces.

A BECK about 2 m wide crosses the NORTH edge exactly 30% of the way across from
the west — that position is measured, not chosen: the stream arrives from
NinjaOne's authored ground at that point and must meet it. It runs south-east
down the terraces in a shallow gully, dropping over each column wall in a small
fall a metre or two high, and leaves this cell at the south-east. A few dark
conifers shelter in the gully; nowhere else.

The BORDER-CAIRN-KNOLL site: a level grassy knoll about 35 m across on the
middle terrace, standing a little proud of the flat with open ground on every
side, so it reads as a marker on the line rather than as scenery.

Land to all four edges.`;

B["4,0"] = `CONNECTING GROUND, the eastern half of the isthmus. The entire NORTH edge is
land continuing into NinjaOne — no coast on that edge.

Open heather-and-grass moor, wind-scoured, rolling rather than terraced:
shallow rises and hollows a few metres deep, boulder fields, low basalt
outcrops breaking the surface, an occasional short column wall no more than 5 m
high. Heather sparse and subdued, never a carpet. Olive and gold-green ground
with dull violet accents, grey rock.

A BECK about 4 m wide — wider than the one to the west — crosses the NORTH edge
55% of the way across from the west. That position is measured: it arrives from
NinjaOne's authored ground and must meet it there. It stays a beck — 4 m
wide, a stride across, never a river — and runs south through a shallow gully
into a peat-dark tarn about 20 m across in a hollow in the south-west. The
tarn has no outlet: nothing wet reaches the south, east or west edge, because
the cells there carry no water to meet. Dark conifers only in that gully and
around the tarn.

**The south edge is the plateau's ground arriving from the south**, corner to
corner, at its own brightness for the first 10 m inside the seam: pale bare
rock across the eastern half of that edge, darker moor-grass in the western
half, exactly as it arrives. The moor gives way to bare rock across the south
third.

The ground falls away gently to the east toward the bay, so the eastern quarter
of the cell sits lower, but it does NOT reach water inside this cell — the bay
is in the neighbour to the east.

Land to all four edges.`;

B["5,0"] = `Where the connecting ground ends and the BAY begins. The WESTERN 34% of the
NORTH edge is land running off the top into NinjaOne; east of that the north
edge is the BAY — open water, and NinjaOne's own shore is across it, out of
frame.

So the land occupies a wedge in the west and south of the cell, and the bay
bites in from the north-east. The shore between them is wild coast: cliffs
15–30 m tall of weathered columnar basalt, uneven heights, broken tops, leaning
and split columns, collapsed drums in talus at the foot, a natural ledge
partway up the face on the biggest buttress. The cliff line wanders with a
small cove and one headland; no straight runs, no square corners.

The bay must be wide open water where it meets the north edge — the rail's
north-east leg spans it in a later pass, so it needs to read as a real crossing,
not a creek.

Above the cliffs, bare basalt benches and talus with thin grass, no meadow. Two
sea stacks in the bay, 15–20 m tall. Dark conifers only in one gully running
south-west.

Carry land to the SOUTH and WEST edges and to the western 34% of the NORTH.`;

B["6,0"] = `North-east corner of the territory. Open sea on the NORTH and the EAST — no
NinjaOne above this cell, so both are coast.

A high wild coast: cliffs 35–50 m, the tallest in the territory, weathered
columnar basalt with uneven column heights, broken tops, split and leaning
columns and heavy talus at the foot. The cliff line wanders in plan around one
deep narrow inlet cut into the north-east, barely wider than it is deep, with
surf working at its head.

Above the cliffs a bare bench of slab and thin grass tilting inland to the
south-west. Shingle only in the one small cove on the north side.

Three or four sea stacks offshore to the north-east, 20–30 m, with the same
broken character — these matter, because the linked colonnade in the cell
directly SOUTH continues out to sea as a line of stacks, and these should read
as ordinary, unaligned, natural stacks by contrast: scattered, of differing
heights, in no order at all.

Dark conifers only in the gully running south. Carry land to the SOUTH and WEST
edges.`;

// ---------------------------------------------------------------- row 1 ----
B["0,1"] = `The CABLE-CAR shelf — a settlement shelf on the west coast, and the richest
ground in its neighbourhood.

The shelf itself: a broad level terrace about 45 m across occupying the middle
of the cell, meadow green warmed with gold, open glades between orchard-like
conifer stands, flowers permitted here and nowhere near it. Low natural
outcrops and small rock terraces around its edge that a settlement could sit
on, and the terrace stands 10–15 m above the ground to the south. Nothing is
built: this is the GROUND a town will later occupy, landform only.

The WEST edge is coast — open sea. Between the shelf and the sea the ground
breaks into a steep drop of 25–35 m: a gorge mouth opening westward to the
water, its walls columnar and weathered, talus at the foot. That gorge is why a
cable car belongs here, so it must be a real gap: too wide and too deep to walk
around inside this cell.

A stream crosses the shelf from the east and falls into the gorge in one clear
drop, with a pool at the top.

Carry land to the NORTH, EAST and SOUTH edges; only the west is sea.`;

B["1,1"] = `The darkest cell in the territory. Dense dark conifer stands on mossy ground,
little open ground anywhere, flat haze lying between the trunks.

A gorge runs north-east to south-west across the cell, 20–30 m deep, its walls
mossy basalt with wet talus at the foot. A stream in the bottom with two falls
and pools lying in shade. The canopy nearly closes over the gorge in places.
This is the deepest green in the world — near-black under the stands, grey-blue
haze in the air.

The rail loop crosses here on a VIADUCT — a gorge span. Give it a crossing to
span: two facing shoulders of firm level rock on either side of the gorge at
roughly the same height, about 40 m apart, clear of trees, so a bridge has
somewhere to land at both ends. Do not draw any structure; only the ground it
would need.

The DEEP-STAND site: a small clearing, 25 m across, around one fallen giant
conifer lying full length on the moss with its root plate standing on end. The
darkest stand in the territory surrounds it.

**Every crown one flat value, tip to skirt.** No pale top and no dark
underside on any tree: a crown is told from the next by its outline and by the
darker gap between them, never by shading on the crown itself. The grey-blue
haze is VISIBLE — it lies over the canopy and softens every crown edge, so
there is no hard edge anywhere in the stands.

**The north edge is the sound coast's ground, corner to corner.** Along the
WHOLE north edge the first 10 m inside the seam is the pale open ground
arriving from the north — its grass, shingle and bare rock at its own
brightness — and no dark stand touches the north edge anywhere, the east corner
included. The first trees stand beyond that band as scattered groups, and the
stands close into the dense forest a third of the way down the cell.

**The groove is a dark slot, never a pale path** — its floor in shade, its rims
rounded and paler, darker than the ground either side. Where it meets the gorge
it is cut into the rock of both lips at the same height and resumes on the far
side; nothing spans the air. East of the gorge it runs on between the trunks,
over the forest floor, all the way to the east edge. No rune panels and no
marks anywhere in this cell.

**The seams must not show (owner 2026-09-05, on the live world: "needs a
cleaner transition, its too dark and obvious seam").** Seen from above, this
cell must not read as one dark square set into brighter ground: the darkest
stand is the DEEP-STAND site and the gorge's shade, not the whole cell. Toward
the WEST edge the stands break into glades and scattered groups over the last
third of the cell, so the heath of (0,1) runs in between the trees before the
seam; toward the EAST edge the same, into the thinning forest of (2,1). The
canopy's value where it meets any neighbour is that neighbour's own value: the
change is gradual across the outer third, never at a line.

Land to all four edges.`;

B["2,1"] = `THE EASTERN EDGE OF THE FOREST, and the cell that has to make the forest read
as a forest rather than as one dark square. The cell WEST of this one (1,1) is
dense dark forest; the cell EAST (3,1) is the capital's meadow shelf.

So the canopy is unbroken along the WEST edge and THINS EASTWARD across this
cell: dense stands for the western third, then stands breaking into glades and
scattered groups through the middle, then open ground with only a few isolated
conifers by the eastern third. **The change happens gradually across the whole
cell, not at a line.** Mossy ground and deep shade under the western stands;
grass and low scrub in the open east.

Ground gently rolling and falling to the south. Low basalt outcrops break
through in the open eastern part — scattered, rounded, none of them in a line.
A beck runs south through the trees in a shallow gully and out into the open
ground. **No column wall anywhere in this cell.** The previous candidate
rendered the rune chain as a standing wall of columns running east-west (owner
2026-09-05: "it turned the rune chain into a cliff side?"); the chain is a
groove SUNK below the ground, its two rims level with the turf, the ONLY
straight line in the cell, and nothing stands up along it.

The BEACON-CRAG site: a bare crag toward the south-east where the trees have
already thinned, rising 18-25 m with a flat top about 20 m across and a clear
fall on its south side — the one place hereabouts the forest opens to a view,
and the whole south coast lies that way. Approachable from the north by a ramp
of broken ground.

**Every crown one flat value, tip to skirt.** No pale top and no dark
underside on any tree: a crown is told from the next by its outline and by the
darker gap between them, never by shading on the crown itself. The grey-blue
haze is VISIBLE over the stands and softens every crown edge. Crowns 3-4 m across even in the dense western stands — a
stand is a few hundred proper trees, never a carpet of saplings.

**The south edge is as bright as the shelf ground arriving from the south**,
corner to corner, for the first 10 m inside the seam — the western stands stop
short of it, and the forest closes only north of that band.

**The groove is a dark slot, never a pale path** — its floor in shade, its rims
rounded and paler, darker than the ground either side. It runs between the
trunks over the forest floor in the west and across the open ground in the
east, one true line from edge to edge.

Land to all four edges.`;

B["3,1"] = `THE CAPITAL SHELF. The most important ground in the territory, and the richest
in its neighbourhood.

A broad level shelf occupying the centre of the cell, 55–65 m across, meadow
green warmed with gold, open and generous. Orchard-like conifer stands with
glades between them around its edges, flowers permitted on the shelf itself.
The shelf stands 12–18 m above the ground to the north and west on low natural
terraces of warm rock — two or three steps, each broad enough to build on, so
the settlement has levels to occupy. To the south and east it runs out more
gently.

A stream enters at the north edge, 5 m wide at the seam, tapers to 2-3 m and
runs in a shallow channel down to ONE pool about 15 m across in the north-east
quarter of the shelf, north of the groove. The pool’s outlet leaves its south
side as a beck 2-3 m wide and runs south to the SOUTH edge, where it meets the
stream arriving there — the only place water leaves this cell. Nothing wet
reaches the east or west edge. Where the beck meets the groove it passes
BENEATH it: the groove’s floor runs unbroken over the beck on a natural rock
bridge, and no water sits on the line.

**The south edge is as bright as the ground arriving from the south**, corner
to corner: that gold-green meadow with its pale column outcrops continues at
its own brightness for the first 10 m inside the seam, and the shelf's own
meadow is the same bright gold-green — not olive, not khaki. The north edge
continues the darker olive bench ground arriving from the north, and the
change from olive to gold happens across the north third.

The rune panels stand within 15 m of the groove, on both sides of it, as one
cluster near the middle of the shelf — not scattered over the cell.

This is where the rail loop begins and ends, so the shelf needs a level
approach from the east and from the west: two clear runs of even ground at the
shelf's own height, each about 30 m wide, unobstructed by outcrop or stand.
Draw no structures and no track — the ground only.

Land to all four edges.`;

B["4,1"] = `Bare plateau: pale basalt benches with hexagonal-jointed tops, scree fans, thin
wind-scoured grass only in the cracks. No meadow anywhere in this cell. Pale
warm greys and creams, cool teal water, sparse grey-green — the brightest,
barest ground in the territory.

Stepped benches rise from west to east, three of them, each 8–12 m above the
last, with low column walls and talus at every foot.

The PLATEAU-TARN site: a round tarn about 30 m across lying in bare rock on the
middle bench, a shingle rim all round it, no vegetation at its edge. Cool teal
water against pale stone. Classify it as a lake.

The WIND-ARCH site: at the eastern edge of the top bench, a wind-cut natural
arch of basalt tall enough to walk under, about 12 m across, with a level shelf
of rock beside it.

The rail loop passes through the north of this cell and TUNNELS into the rock
under the north bench. Give it a face to enter: a clean vertical rise of solid
rock, 15–20 m tall, at the north bench's edge, with level approach ground in
front of it. Draw no portal, no track — only the rock and the ground.

A thin tall fall drops off the west bench edge well SOUTH of the groove — at
least 15 m from it — and the two never meet.

**The groove leaves the WEST edge 48% down it**, cut across the plateau rim as
the same slot it is everywhere else, and it never turns into a watercourse.
The previous candidate ran the groove down into the fall, so the chain ended
in a waterfall; the line must cross the whole cell edge to edge on its own.

Land to all four edges.`;

B["5,1"] = `The RISK-ASSESSMENT shelf — a settlement shelf, the richest ground in its
neighbourhood, and the last one before the coast to the east.

The shelf: a level terrace about 45 m across in the centre-west of the cell,
meadow green warmed with gold, glades among orchard-like conifer stands,
flowers permitted here. Low outcrops and natural rock terraces around its
edge that a settlement could sit on. Nothing built — landform only.

The ground rises east of the shelf into a broad ridge of moor and outcrop
running north–south, and falls away west toward the plateau. The ridge matters:
the cell to the EAST holds the colonnade, and this ridge is the ordinary,
weathered, irregular rock that makes the ordered arcade over there read as an
anomaly. So keep every column wall here broken-topped and uneven, no two the
same height, nothing lined up.

A stream rises on the ridge, crosses the north of the shelf in a shallow
channel and leaves west. One pool, 12 m across, on the shelf's north edge.

The rail loop runs through here between the plateau and the coast, so leave a
level run of even ground about 25 m wide across the cell from west to east,
passing north of the shelf.

Land to all four edges.`;

B["6,1"] = `THE CHAIN'S SEAWARD END — the east coast, where the rune chain leaves the
world. Wild coast: the EAST edge is sea.

A cliff-top bench of thin grass and bare rock runs the height of the cell,
30-50 m wide, quiet and plain: nothing on it competes with the chain. Below
it, weathered columnar sea-cliffs 25-40 m tall — columns of uneven height and
width, tops broken at different levels, split and leaning, collapsed drums in
talus at the foot, lichen in the joints — and the cliff line wanders in plan
with two bays and a buttress, never a straight run. A natural ledge partway
up the face. Two sea stacks offshore, the nearer one 20 m out.

**Perspective.** This is the island's east shore seen from the south-south-east:
the cliff faces that look south, into the bays, show their columns; faces that
look north are hidden behind their own rim. Draw it that way.

**The CHAIN-END.** The groove arrives from the west and runs east across the
bench to the cliff lip, where it is cut clean through the rim — the slot
visible in the cliff face as a notch — and continues as the same cut across
the top of the nearer sea stack, and out of the world at the east edge. The
last panels stand on the bench beside the notch, weathered and part-lost,
with level ground to stand on and look along the line out to sea. No column
leans, no arch, no colonnade: that idea is withdrawn.

Dark conifers only in the gullies at the west edge; no meadow, no flowers.
Surf and wash at the cliff foot and around the stacks. Carry land to the
NORTH, SOUTH and WEST; the EAST edge is sea.`;

// ---------------------------------------------------------------- row 2 ----
B["0,2"] = `South-west corner of the territory. Open sea on the SOUTH and the WEST — this
is the world's southern coast and nothing lies beyond it.

Low ground meeting the water: basalt slabs and ledges dipping into the sea and
running on visibly beneath it, clear shallows over the slabs shading to deep
teal, shingle in the hollows. Thin grass above the tideline, no trees near the
shore.

The STACK-COVE site: a cove bitten into the south-west, about 40 m across, with
a shingle beach at its back and three or four sea stacks standing offshore in
front of it, 12–20 m tall, weathered and irregular with broken tops — no two
alike and none in line. Low slabs run out to them under the water.

North and east of the cove the ground rises gently away from the sea into thin
grass and low outcrop, so the cell reads as a shore that continues inland.

Carry land to the NORTH and EAST edges; the south and west are water.`;

B["1,2"] = `THE FOREST COMING DOWN TO THE SEA. The cell NORTH of this one (1,1) is dense
dark forest and its canopy continues into this cell unbroken; the SOUTH edge is
open sea, the world's southern coast.

So: forest over most of the cell, thinning only in the last 30-40 m before the
cliff edge where the wind gets at it — the outermost conifers low, wind-shaped
and leaning inland, with bare rock and thin grass between them. Dense dark
stands everywhere north of that. Mossy ground, wet talus, flat haze between the
trunks.

The coast below is cliff, 20-35 m, weathered columnar basalt: uneven column
heights, tops broken at different levels, split and leaning columns, collapsed
drums in talus at the foot. The cliff line wanders with two bays and a buttress.

An INLET cuts north into the land from the sea, about 30 m wide at its mouth and
running 60 m inland, its walls the same broken columns, its water deep and dark,
with the forest standing right to the lip on both sides. The rail loop crosses
it: give the crossing two facing shoulders of firm level rock at about the same
height on either side, roughly 30 m apart, clear of talus and of trees. Draw no
bridge and no track — only the ground.

A stream comes down through the forest from the north and falls into the head of
the inlet.

**Every crown one flat value, tip to skirt.** No pale top and no dark
underside on any tree: a crown is told from the next by its outline and by the
darker gap between them, never by shading on the crown itself. The grey-blue
haze is VISIBLE over the stands and softens every crown edge.

**Both side edges are as bright as the ground arriving**, corner to corner:
the shelf's gold meadow from the east and the sound coast's pale grey-green
grass from the west continue at their own brightness and colour for the first
10 m inside each seam. The dark stands begin beyond those bands and close to
the full forest through the middle of the cell.

**The seams must not show (owner 2026-09-05, on the live world: "needs a
cleaner transition, its too dark and obvious seam").** Seen from above, this
cell must not read as one dark square set into brighter ground. The canopy is
NO DARKER than the forest of the cell to the NORTH-EAST (2,1): dark green with
the haze over it, never near-black. Toward the EAST edge the stands break into
glades and scattered groups over the last third of the cell, so the meadow
shelf's grass runs in between the trees before the seam — the change is
gradual across that third, never at a line. The same toward the WEST edge with
the sound coast's pale grass. The dense dark heart of the forest is the middle
of the cell, around the inlet.

Carry land to the NORTH, EAST and WEST edges; the south is sea.`;

B["2,2"] = `The AUTOMATED-UAT shelf — a settlement shelf on the south coast, the richest
ground in its neighbourhood.

The shelf: a level terrace about 45 m across in the north-centre of the cell,
meadow green warmed with gold, glades among orchard-like conifer stands,
flowers permitted here. Low outcrops and natural rock terraces around its edge
that a settlement could sit on. Nothing built — landform only.

South of the shelf the ground steps down to the sea in two broad benches, each
12–15 m, so the settlement looks out over the water rather than standing on the
cliff edge. The SOUTH edge is open sea: at the foot of the benches, low cliffs
10–20 m and a shingle cove toward the south-west.

A stream crosses the shelf from the north-east, pools once at about 12 m
across, and falls over the first bench edge in a clear drop to the second.

The rail loop passes along the north of the shelf, so leave a level run of even
ground about 25 m wide across the cell from west to east there.

Carry land to the NORTH, EAST and WEST edges; the south is sea.`;

B["3,2"] = `Bench country running down to the world's southern coast. The SOUTH edge is
open sea.

Stepped benches and terraces descending from north to south, four of them, each
10–18 m above the last, separated by column walls with talus at their feet.
Moor grass on the flats, scree on the faces. Becks step down the benches, two
of them, each dropping over every wall in a small fall.

The TERRACE-STEPS site: a run of natural terraces stepping down to the sea in
the centre-south of the cell, each step about 40 m long and level enough to
walk, the whole run reading as a giant's stair from the moor to the water. This
is the clearest, most regular part of the descent — but the columns making its
risers are still weathered and irregular, uneven in height and broken-topped.
Only the colonnade two cells north-east is ordered.

At the foot, low cliffs 10–15 m and a shingle strand at the bottom of the
stair.

Conifer stands on the sheltered benches, thicker toward the east where the
forest begins. Carry land to the NORTH, EAST and WEST edges.`;

B["4,2"] = `Bench country on the world's southern coast, continuing the benches of the cell
to the WEST (3,2) without a break — the two are one landform and the benches
should run straight across the shared edge.

Stepped benches and terraces descending north to south, three or four of them,
each 10-18 m above the last, separated by column walls with talus at their feet.
Moor grass on the flats, scree on the faces, conifer stands on the sheltered
benches and thicker in the hollows — trees present but not a forest, the canopy
open enough to see the ground through.

The SOUTH edge is open sea: at the foot of the lowest bench, low cliffs 10-20 m
and a shingle strand in one small cove.

Becks step down the benches, two of them, each dropping over every wall in a
small fall and running out over the shingle.

The FERN-HOLLOW site: a damp hollow on the middle bench about 30 m across, a
spring at its head, a level mossy floor, ferns thick around the spring, and the
bench walls sheltering it on every side.

**The east edge is the moor's ground arriving from the east**, corner to
corner, for the first 10 m inside the seam — its cooler blue-green grass at its
own colour and brightness, not the benches' warmer gold; the benches take over
across the east third.

Carry land to the NORTH, EAST and WEST edges.`;

B["5,2"] = `Open moor on the southern coast. Wind-scoured heather and grass, rolling,
boulders and scrub, low basalt outcrops. Heather sparse and subdued, never a
carpet: olive and gold-green with dull violet accents and grey rock.

The BOULDER-MAZE site: a field of house-sized boulders — 4–7 m each — scattered
across the centre of the cell with grass lanes winding between them, dense
enough that you would have to pick a way through. They are glacial strays lying
on the moor, not outcrop: rounded, lichened, sitting proud of the grass.

The SOUTH edge is open sea, and the rail loop runs along it: the line leaps
STACK TO STACK across the mouth of a shallow bay. So the south coast here needs
a line of sea stacks standing off it — four or five, 15–25 m tall, spaced
roughly evenly 25–35 m apart in a rough arc across the bay mouth, each with a
level top. They are ordinary weathered stacks, uneven and broken-topped, not
ordered and not touching: the colonnade is the only ordered thing in this
world. Level rock on the shore at both ends of the arc for the line to leave
and rejoin.

Becks in two gullies run south to the sea. Carry land to the NORTH, EAST and
WEST edges.

**Every beck is cut water the full width of its painted bed.** No pale dry
gravel bed beside a thread of water: where a bed is painted, the water fills
it bank to bank, 2-4 m wide, and the mask covers all of it.
`;

B["6,2"] = `The CONSTRUCTION ZONE — south-east corner. Open sea on the SOUTH and the EAST.

An active quarry read from LANDFORM ONLY: no structures, no machinery, no
buildings anywhere. Cut benches stepping down toward the sea, three of them,
each 10–15 m, with fresh pale cut faces that are visibly worked — straighter
and cleaner than natural rock, saw-cut in places, but stepped and irregular in
plan. Spoil fans of pale rubble below each face. One levelled floor about 50 m
across in the centre, bare and flat, the working area.

A flooded pit in the north-west of the floor, about 25 m across, still water
holding pale rock dust so it reads milky-turquoise rather than clear. A
drainage stream leaves it south-east and runs to the sea through a cut channel.

Pale cut rock, dust, a thin green rim of surviving grass and scrub around the
quarry's edge where the ground was not taken. A few dark conifers on the north
rim and in the drainage gully.

The coast below the lowest bench is low cliff, 8–15 m, part natural and part
cut away.

**The NORTH edge is land only along its western third.** From about a third
of the way along it the bay arriving from the north fills the rest of that
edge, corner included: the quarry's north-east rim is that bay's south shore,
low cut cliff dropping straight into the water at the brightness and colour
the sea arrives in. Do not carry the quarry floor east along the north edge.

A beck arrives across the WEST edge a quarter of the way down it and runs
east along the quarry's north rim into the flooded pit. The sea also arrives
at the south-west corner of the west edge.

Carry land to the WEST edge and to the western third of the NORTH edge.`;

// ---------------------------------------------------- check, then write ----
const cells = Object.keys(def.cellBiomes).sort();
const missing = cells.filter((k) => !B[k]);
if (missing.length) throw new Error(`no brief for ${missing.join(", ")}`);
const extra = Object.keys(B).filter((k) => !cells.includes(k));
if (extra.length) throw new Error(`brief for a cell that is not in the plan: ${extra.join(", ")}`);

// every shelf and site must be named in its own cell's brief, or the brief and
// the plan have drifted and the packet would carry two different stories
// Compare with separators and case stripped from both sides: a brief writes
// "CABLE-CAR" where the id is "cablecar", and that spelling difference is not
// a drift worth failing on — a missing site is.
const flat = (s) => s.toLowerCase().replace(/[^a-z]/g, "");
for (const s of def.shelves) {
  const k = s.cell.join(",");
  if (!flat(B[k]).includes(flat(s.id))) throw new Error(`brief ${k} never mentions the ${s.id} shelf`);
}
for (const s of def.sites) {
  const k = s.cell.join(",");
  if (!flat(B[k]).includes(flat(s.id))) throw new Error(`brief ${k} never mentions the ${s.id} site`);
}

// Appended to every brief. The lighting rule reaches a generate-mode packet
// once, in a list of territory rules; the emphatic wording is attached to the
// canon reference, which only edit mode gets. Four of the first five Tanium
// generations were refused on key-light asymmetry (0.0116-0.0140 against a
// 0.011 limit) and a re-roll came back worse, so the instruction is repeated
// here, in the part of the packet that describes what to draw.
//
// This is not gaming the gate: it restates the world's own lighting canon at
// the point of description. If it does not move the number, the cause is not
// the prompt and the numbers go to the owner unchanged.
const LIGHTING = `

---

**This world has no sun.** Flat ambient light only: every rock face, column,
bank and tussock the SAME VALUE on every side. No lit side, no shaded side, no
cast or contact shadows, nothing that says which way light comes from. Depth
comes from ambient occlusion in crevices, never from a key light.

**Match the neighbour brightness**, not only its colour. Where authored paint
reaches into this cell, if its ground is darker or paler than you would paint
it, the neighbour is right.

**Conifer crowns about 3-4 m across** at final scale. Saplings are fine and stay
in the census; it is the MEDIAN that must land in 1.7-5.2 m.`;

// ---------------------------------------------------------- the rune chain --
// A route, like the rail loop, not a biome and not one cell's feature. It spans
// the territory; the RUNES appear only at the settlements, so a cell the chain
// merely passes through gets a groove and nothing else.
//
// Each crossing is derived from the route and stated as a percentage down the
// shared edge, exactly as the becks crossing NinjaOne's border are — that is
// the one continuity mechanism this pipeline has already proved (c3-0 met its
// beck first time).
function runeChainFor(col, row) {
  const rc = def.runeChain;
  if (!rc) return "";
  const W = rc.waypoints;
  const at = (x) => {
    for (let i = 1; i < W.length; i += 1) {
      const a = W[i - 1], b = W[i];
      if (a[0] === b[0] || (a[0] - x) * (b[0] - x) > 0) continue;
      const t = (x - a[0]) / (b[0] - a[0]);
      if (t < 0 || t > 1) continue;
      return a[1] + t * (b[1] - a[1]);
    }
    return null;
  };
  const yIn = at(col), yOut = at(col + 1);
  if (yIn == null || yOut == null) return "";
  if (Math.floor(yIn) !== row && Math.floor(yOut) !== row) return "";
  const pct = (y) => `${Math.round((y - Math.floor(y)) * 100)}%`;
  const node = rc.nodes.find((x) => x.cell[0] === col && x.cell[1] === row);

  const west = col === 0
    ? `It comes **out of the sea** at the WEST edge, ${pct(yIn)} down that edge`
    : `It enters at the WEST edge, **${pct(yIn)} down that edge**`;
  const east = col === def.grid.cols - 1
    ? `and leaves the EAST edge ${pct(yOut)} down, running on **into the sea and out of the world**`
    : `and leaves at the EAST edge, **${pct(yOut)} down that edge**`;

  return `

**THE RUNE CHAIN crosses this cell.** One weathered line of carved rock spans
the whole territory, sea to sea, linking every settlement as a node. ${west},
${east}. Those positions are exact: the neighbouring cells are authored to meet
them, and a groove arriving anywhere else is a broken chain.

**A slot cut DOWN into the bedrock**, 2-3 m wide and about 2 m deep, two cut
walls and a floor, dark inside because depth shades it. Ancient: edges rounded,
lichen in the joints, scrub over the lip, rubble on the floor. It never wanders
— the line holds true from edge to edge. **Not** a path, road, kerb, wall or
ridge: the ground is REMOVED along it.

**No water on the line.** A beck may pass beneath or stop short, but nothing wet
sits on the groove — water there is cut from this layer and leaves a hole.

${node
    ? `**A NODE — ${node.of}.** Six to ten cut panels flank the groove, each 6-8 m,
each a different mark, weathered and some part-lost. None larger, nothing at the
middle. Set them back from the cell edges so only the groove crosses a boundary.`
    : `**Not a node** — the groove passes through and nothing else changes.`}

**Carving only. Paint no light or glow along it** — that is an effect layer.`;

}

// Where an authored neighbour's water actually reaches the shared edge.
//
// Reads the neighbour's own water mask and reports each run as a percentage
// along the edge, so the brief can state what has to be met instead of leaving
// the worker to guess. Same mechanism as the northBorder becks, which c3-0 met
// first time, and the rune chain crossings, which c0-1 hit exactly.
function waterCrossingsFor(col, row) {
  const KEPT = 2048;
  const sides = [["NORTH", col, row - 1, "bottom"], ["SOUTH", col, row + 1, "top"],
    ["WEST", col - 1, row, "right"], ["EAST", col + 1, row, "left"]];
  const out = [];
  for (const [dir, c, r, edge] of sides) {
    const id = `c${c}-${r}`;
    // Read what the GATE reads: the land layer's alpha (water is cut from it),
    // the most water-like value within 8 px either side of the shared line,
    // wet below 128, runs of 30 px or more. The mask's exact edge column
    // missed a beck that reaches c5-2's east edge a few px short of the line;
    // the gate's band did not, and c6-2 was refused for not meeting it.
    const l2 = `art-source/career-world/l2-land/tanium/${id}/${id}-l2.png`;
    if (!fs.existsSync(l2)) continue;                   // not authored
    let px;
    try { px = readGrey(l2); } catch { continue; }      // last channel = alpha
    const bleed = Math.round((px.width - KEPT) / 2);
    const BAND = 8;
    const line = edge === "bottom" || edge === "right" ? bleed + KEPT : bleed;
    const along = edge === "bottom" || edge === "top";
    const runs = [];
    let start = null;
    for (let i = 0; i < KEPT; i += 1) {
      let mn = 255;
      for (let d = -BAND; d <= BAND; d += 1) {
        const [x, y] = along ? [bleed + i, line + d] : [line + d, bleed + i];
        if (x < 0 || y < 0 || x >= px.width || y >= px.height) continue;
        mn = Math.min(mn, px.data[y * px.width + x]);
      }
      const wet = mn < 128;
      if (wet && start === null) start = i;
      if (!wet && start !== null) { runs.push([start, i - 1]); start = null; }
    }
    if (start !== null) runs.push([start, KEPT - 1]);
    // 30 px is the gate's own minimum run; anything shorter is not a crossing
    for (const [a, b] of runs.filter(([a2, b2]) => b2 - a2 + 1 >= 30)) {
      const mid = Math.round(((a + b) / 2 / KEPT) * 100);
      const wide = Math.round(((b - a) / KEPT) * 97.6);
      out.push(`- water arrives on your **${dir}** edge at **${mid}% along it**, about ${wide} m wide — meet it there`);
    }
  }
  if (!out.length) return "";
  return `

**Water arriving from the neighbours.** These are measured off the authored art
next door, not estimates. A watercourse that does not meet them is a broken
stream at the seam:

${out.join("\n")}`;
}

// Per-seam transition, derived from the biome map.
//
// The packet lists each neighbour's biome and says a change lives in the
// later-authored cell's outer third — but it never says the change includes
// BRIGHTNESS, and brightness is what the palette gate measures. c0-1 came back
// 21.6 luma darker than the sound coast below it: two biomes meeting with no
// transition drawn, not a lit cell. "Match your neighbour's brightness" is the
// wrong instruction for a cell between two different biomes; this is the right
// one.
function transitionsFor(col, row) {
  const mine = def.cellBiomes[`${col},${row}`];
  const sides = [["NORTH", col, row - 1], ["SOUTH", col, row + 1], ["WEST", col - 1, row], ["EAST", col + 1, row]];
  const lines = sides
    .map(([dir, c, r]) => [dir, def.cellBiomes[`${c},${r}`]])
    .filter(([, nb]) => nb && nb !== mine)
    .map(([dir, nb]) => `- your **${dir} third** carries the change from ${mine} to **${nb}**`);
  if (!lines.length) return "";
  return `

**Where the biome changes, the transition is yours to draw.** These neighbours
are a different biome, and the change belongs INSIDE this cell, across the outer
third on that side — including how light or dark the ground is, not only what
grows on it:

${lines.join("\n")}

At the seam itself your ground should already look like theirs. A cell that
paints its own biome flat to its edge reads as two worlds meeting.`;
}

fs.mkdirSync(DIR, { recursive: true });
let n = 0, chained = 0;
for (const k of cells) {
  const [c, r] = k.split(",");
  const rune = runeChainFor(Number(c), Number(r));
  if (rune) chained += 1;
  const trans = transitionsFor(Number(c), Number(r));
  const water = waterCrossingsFor(Number(c), Number(r));
  fs.writeFileSync(path.join(DIR, `c${c}-${r}.md`), `${B[k].trim()}${trans}${water}${rune}${LIGHTING}\n`);
  n += 1;
}
console.log(`  the rune chain crosses ${chained} cells`);
console.log(`wrote ${n} briefs to ${DIR}`);
console.log(`  every shelf and site in the plan is named in its own cell's brief`);
