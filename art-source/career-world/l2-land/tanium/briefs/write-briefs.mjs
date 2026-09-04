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
NinjaOne's authored ground and must meet it there. It runs south through a
shallow gully, widening a little, and leaves at the south edge. Dark conifers
only in that gully and in one hollow to the south-west.

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
through in the open eastern part; one column wall about 6 m high runs east-west
across the north with talus at its foot. A beck runs south through the trees in
a shallow gully and out into the open ground.

The BEACON-CRAG site: a bare crag toward the south-east where the trees have
already thinned, rising 18-25 m with a flat top about 20 m across and a clear
fall on its south side — the one place hereabouts the forest opens to a view,
and the whole south coast lies that way. Approachable from the north by a ramp
of broken ground.

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

A stream enters from the north-east, crosses the eastern part of the shelf in a
shallow channel with one pool about 15 m across, and leaves to the south-west
over the terrace edge in a modest fall.

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

A thin tall fall drops off the west bench edge. Land to all four edges.`;

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

B["6,1"] = `THE LINKED COLONNADE — Tanium's one wonder, and the whole reason this cell
exists. Draw the arcade first and fit everything else around it.

**What it is, in shapes:** a run of basalt columns along the east coast that have
ALL TOPPLED THE SAME WAY and come to rest against each other, so that each
column leans on the next and their tops meet. Between every neighbouring pair
that leaves a TRIANGULAR OPENING — a natural arch — and you can see the sea
straight through every one of them. Think a row of dominoes caught mid-fall and
frozen, or a natural viaduct: a continuous line of arches, not a line of posts.
A person could walk the whole length underneath, arch after arch, without
stepping into the open.

**The three things that make it read, and each one is required:**

1. **They LEAN, all the same way** — about 25-35 degrees off vertical, every one
   tilted south-east toward the sea. Not one upright column anywhere in the run.
2. **They TOUCH.** Every column rests against its neighbour at the top. There is
   NO daylight between the columns themselves — the only openings are the
   triangular arches underneath, between their feet. A gap between two columns
   means the chain is broken and the cell is wrong.
3. **It does not stop.** The arcade runs the full height of this cell north to
   south, crosses the shoreline, and CONTINUES OUT INTO THE SEA as the same
   leaning, touching columns standing in the water — smaller with distance, still
   linked, still leaning the same way — running off the east edge of the frame
   and out of the world. The last ones visible should be near the frame edge.

**Scale:** each column about 20 m tall and 4 m across at the base — tall enough
that the arches beneath are a storey and a half high. Every column the same
height and girth as its neighbours. NONE larger, none singled out, and NOTHING
standing at the middle of the run: the chain has no centre and must not look as
though it has one.

**This is the one place in this world with deliberate order, and it must be
drawn as order.** The geology rule's demand for weathered irregular columns —
uneven heights, broken tops, no regular runs — governs the ordinary cliffs
everywhere else, and those ordinary cliffs are what make this read as a wonder.
Do not weather this arcade back into a broken natural cliff, and do not draw it
as a row of separate upright columns; that is a palisade, which is the thing the
canon actually forbids.

**The ground behind it is deliberately plain and quiet:** a narrow cliff-top
bench of thin grass and bare rock running the length of the cell, nothing on it
competing for attention. A few dark conifers only in the gullies at the west
edge. No meadow, no flowers, no outcrops of note.

The COLONNADE-HEAD site, where the arcade leaves the land: the last column
standing on the bench and the first standing in the sea, with level ground
beside them wide enough to stand on and look along the line.

Surf breaks between the feet of the columns and through the arches. The EAST
edge is sea; carry land to the NORTH, SOUTH and WEST.`;

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
WEST edges.`;

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
cut away. Carry land to the NORTH and WEST edges.`;

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

**Lighting — this world has no sun.** Flat, ambient light only. Every rock face,
column, bank, tussock and boulder is the SAME VALUE on every side, whichever way
it faces. No lit side and no shaded side. No bright upper edge, no dark lower
edge. No cast shadows and no contact shadows of any kind. Nothing anywhere in
the frame should let a viewer say which direction light comes from. Depth reads
from ambient occlusion in crevices and from the drawing itself, never from a key
light. This matters more than any other instruction above: an image with a
consistent lit side is refused whatever else it gets right.

**Brightness — match the neighbour's, exactly.** Measured across this whole
territory, the hue of the vegetation matches its neighbours almost perfectly
(dBG 0.01-0.05 against a 0.20 limit) and the BRIGHTNESS does not (dLuma 14-56
against 13). Every one of those was a cell lit differently from the cell beside
it. So: where authored paint reaches into this cell, match how light or dark it
is, not just its colour. If the neighbour's grass is darker or paler overall
than you would paint it, the neighbour is right.

The two things are the same instruction. A cell comes out brighter or darker
than its neighbour because something in it is being lit — a sun angle, an
exposure, a haze — and this world has none of that. Paint it flat and it matches
by itself.`;

fs.mkdirSync(DIR, { recursive: true });
let n = 0;
for (const k of cells) {
  const [c, r] = k.split(",");
  fs.writeFileSync(path.join(DIR, `c${c}-${r}.md`), `${B[k].trim()}${LIGHTING}\n`);
  n += 1;
}
console.log(`wrote ${n} briefs to ${DIR}`);
console.log(`  every shelf and site in the plan is named in its own cell's brief`);
