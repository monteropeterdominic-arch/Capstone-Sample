// ===== Web map settings =====
// Mapbox public token (pk.*). Restrict it to your GitHub Pages URL at account.mapbox.com.
// GitHub push protection flags Mapbox tokens: allow it via the link GitHub shows when pushing.
window.MAPBOX_TOKEN = ''; // paste pk.* token here (or open the site with ?mapbox=pk.xxx). Empty = MapLibre + free terrain.

// Image overlay corners [west, north, east, south] (EPSG:4326), from QGIS export
window.OVERLAYS = {
  hotspot:   [124.39602, 7.63829, 125.25602, 6.77229],
  elevation: [124.39602, 7.63829, 125.25522, 6.77189]
};

// ===== OLS results =====
// PLACEHOLDER: these are the reference values from Idris et al. (2023),
// Pertanika J. Sci. & Technol. 31(5), Johor, Malaysia.
// Replace with the North Cotabato capstone results once the model is run.
window.MODEL_RESULTS = {
  source: 'Reference values: Idris et al. (2023), Johor. Replace with capstone results.',
  diagnostics: {
    r2: 0.788745, adjR2: 0.619741,
    jointF: 4.667013, jointFp: 0.013233,
    koenker: 2.441167, koenkerP: 0.964418,
    vifMax: 2.805546, vifCutoff: 7.5
  },
  variables: ['Temperature', 'Humidity', 'Wind', 'Rainfall', 'Road', 'River', 'Irrigation', 'Elevation'],
  vif: [2.065216, 1.560448, 2.107248, 1.335430, 2.805546, 1.511604, 2.595937, 2.787380],
  model1: { // dependent: % area affected (severity)
    coef: [5.218971, 3.695793, 1.379807, 0.321554, 0.671931, -1.044560, -0.920625, -0.007164],
    p:    [0.429871, 0.417459, 0.162885, 0.650636, 0.001013, 0.017625, 0.028763, 0.989871]
  },
  model2: { // dependent: frequency of incidence (cases)
    coef: [8.159650, 7.626628, 1.098949, -1.677950, 0.035788, -0.408323, 0.178177, -0.764875],
    p:    [0.143433, 0.056618, 0.169393, 0.013192, 0.769370, 0.200894, 0.555655, 0.116985]
  }
};
