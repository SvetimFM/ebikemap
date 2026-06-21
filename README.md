# Seattle Metro Bike & E-Bike Atlas

An interactive cartographic atlas of bike & e-bike trails, routes, parks, and
access rules across the Seattle metro area — with a flat vector map and a
three-dimensional relief view.

**Live:** https://svetimfm.github.io/ebikemap/

## Views
- **Flat map** — Leaflet over a hand-built offline vector basemap (Natural Earth
  + OSM derived). 39 trails & destinations, 10 Link light-rail stations, e-bike
  legality filtering, detail panel.
- **3D relief** — a bespoke three.js terrain view with the trail network draped
  over the landscape, per-trail elevation profiles, and a fly-the-trail camera.

## Structure (buildless static site)
```
index.html             shell: header, view switch, panels
styles/tokens.css      design system tokens
styles/app.css         layout + components
data/trails.json       trail records (single source of truth)
data/stations.json     transit stops
data/basemap/*.geojson ocean / lakes / parks / roads
js/data.js             loads JSON → window.ATLAS
js/map-flat.js         Leaflet flat map
js/view-switch.js      flat ⇄ 3D
atlas-data.js          window.ATLAS loader for the 3D view
relief-3d.html         three.js relief (cinematic mode)
support.js             Design Component runtime (do not edit)
```

## Attribution
- Map data © OpenStreetMap contributors (ODbL); basemap also from Natural Earth.
- Leaflet (BSD-2). three.js (MIT). Fonts: Fraunces, Archivo, JetBrains Mono.
