# Water surface

Owns open-water motion, hydrology, and the water side of the coastline
interface. The renderer consumes one continuous geometry field derived from the
land mask. The world albedo and coast field load first; territory albedo and
the registered 4x coast field load before territory detail begins blending.
The packed substrate channel continues land tone beneath shallow water, while
the generated hydrology field differentiates sheltered water without changing
geography.

It does not import Phase 7 crash-accent nodes or resolve camera thresholds.
