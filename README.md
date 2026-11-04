# Jackfruit Tree Health Map · North Cotabato (sample web map)

A **sample**, kid-friendly 3D web map (pixel-game style) for a capstone study on jackfruit dieback (*Erwinia carotovora*) and abiotic factors in North Cotabato (Cotabato Province). It follows the method of Idris et al. (2023). Each farm is a pixel tree whose look shows its health (healthy → a little sick → sick → very sick), and hearts show overall farm health.

**Live map:** https://monteropeterdominic-arch.github.io/Capstone-Sample/

> ⚠️ **Sample data.** The farm points, climate values and OLS numbers are placeholders. The OLS values come from Idris et al. (2023), Johor, Malaysia. Replace them with the capstone's real data before presenting.

## What's on the map

| Layer | Source | Processing (QGIS) |
|---|---|---|
| Province + 18 municipalities | PSGC boundaries ([faeldon/philippines-json-maps](https://github.com/faeldon/philippines-json-maps)) | fix geometry, dissolve, simplify |
| Rivers | HOTOSM Philippines waterways (`waterway=river`) | clip to province |
| Irrigation | HOTOSM waterways (`canal`, `ditch`) | clip to province |
| Roads | OpenStreetMap trunk/primary/secondary/tertiary | clip to province |
| Elevation | ALOS AW3D30 | clip, colour relief |
| Hotspot | Kernel density of sample points, 8 km radius, weighted by frequency | heatmap, EPSG:32651 → 4326 |
| Farms (SAMPLE) | 64 sick + 40 healthy generated points | distance to road/river/irrigation (Near), elevation sampled from DEM |

3D terrain and satellite imagery come from Mapbox when a token is set, otherwise from MapLibre with AWS Terrain Tiles and Esri World Imagery. The look is an original pixel-art style inspired by sandbox games; it uses no game assets.

## Two models shown

- **How sick? (Model 1, severity)**: % of area affected. The tree picture changes with severity.
- **How often? (Model 2, frequency)**: number of cases. Trees that got sick more often are bigger and labelled ×N.

Both models use maximum temperature, relative humidity, wind speed, rainfall, distance to road, distance to river, distance to irrigation, and elevation. The panel explains significant factors in plain words; "For grown-ups" shows the coefficients, p-values (significant at p < 0.05), R², adjusted R², VIF, joint F and Koenker (BP).

## Replacing the sample data

1. **Farms.** Export the real records from QGIS as GeoJSON in EPSG:4326 to `data/farms.geojson`. Keep these fields: `id, municipality, year, severity_pct, frequency, tmax_c, rh_pct, wind_ms, rain_mm, dist_road_m, dist_river_m, dist_irrig_m, elev_m`. Healthy farms use `severity_pct = 0`.
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
