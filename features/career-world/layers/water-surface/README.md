# Water surface

Owns the continuous open-ocean material and the water side of the canonical
coastline. The renderer consumes the accepted world and directional albedo
rasters, macro/micro height fields, canonical coast geometry, and the
terrain-derived coast material field.

`WaterSurfaceState` controls ocean animation speed, strength, density, weather,
opacity, detail contribution, and wind direction. The world raster provides
the distant color structure; the directional raster contributes local line
contrast; procedural displacement drives normals, specular crests, and sparse
foam without resizing either raster.

Inland rivers, tarns, waterfalls, banks, mist, and regional flow fields are not
part of this baseline. A replacement inland system must compose with this
ocean material through one explicit route rather than introduce another global
body mask or alter the accepted ocean assets.
