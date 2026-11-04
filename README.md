# Nangka Guard · North Cotabato (sample web map)

A **sample** 3D web map for a capstone study on jackfruit dieback (*Erwinia carotovora*) and abiotic factors in North Cotabato (Cotabato Province). The layout follows the method of Idris et al. (2023), with a game-style HUD.

**Live map:** https://monteropeterdominic-arch.github.io/Capstone-Sample/

> ⚠️ **Sample data.** The disease points, climate values and OLS numbers are placeholders. The OLS values come from Idris et al. (2023), Johor, Malaysia. Replace them with the capstone's real data before presenting.

## What's on the map

| Layer | Source | Processing (QGIS) |
|---|---|---|
| Province + 18 municipalities | PSGC boundaries ([faeldon/philippines-json-maps](https://github.com/faeldon/philippines-json-maps)) | fix geometry, dissolve, simplify |
| Rivers | HOTOSM Philippines waterways (`waterway=river`) | clip to province |
| Irrigation | HOTOSM waterways (`canal`, `ditch`) | clip to province |
| Roads | OpenStreetMap trunk/primary/secondary/tertiary | clip to province |
| Elevation | ALOS AW3D30 | clip, colour relief |
| Hotspot | Kernel density of sample points, 8 km radius, weighted by frequency | heatmap, EPSG:32651 → 4326 |
| Disease points (SAMPLE) | 64 generated points | distance to road/river/irrigation (Near), elevation sampled from DEM |

3D terrain and satellite imagery come from Mapbox.

## Two models shown

- **M1 · Severity**: % of area affected (tower height = severity)
- **M2 · Frequency**: number of cases (tower height = cases)

Both models use maximum temperature, relative humidity, wind speed, rainfall, distance to road, distance to river, distance to irrigation, and elevation. The panel shows the coefficient direction, p-values (significant at p < 0.05), R², adjusted R², VIF, joint F and Koenker (BP).

## Replacing the sample data

1. **Disease points.** Export the real records from QGIS as GeoJSON in EPSG:4326 to `data/disease_points.geojson`. Keep these fields: `id, municipality, year, severity_pct, frequency, tmax_c, rh_pct, wind_ms, rain_mm, dist_road_m, dist_river_m, dist_irrig_m, elev_m`.
2. **OLS results.** Edit `MODEL_RESULTS` in `js/config.js`.
3. **Hotspot.** Re-run kernel density, export a PNG, and update the `OVERLAYS.hotspot` corners in `js/config.js`.

## Run locally

Browsers block `fetch()` from `file://`, so serve the folder first:

```bash
python -m http.server 8000
# open http://localhost:8000
```

## Mapbox token

`js/config.js` holds a public `pk.` token. Restrict it to this site's URL at account.mapbox.com → Tokens → URL restrictions.

## Reference

Idris, N. H., Mohd Hata, E., Adnan, N., Saupi Teri, S., Osman, M. J., Md Din, A. H., & Ishak, M. H. I. (2023). The influence of abiotic factors on the occurrence of jackfruit dieback disease. *Pertanika J. Sci. & Technol., 31*(5), 2487–2503. https://doi.org/10.47836/pjst.31.5.24
