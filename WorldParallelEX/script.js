// run: python -m http.server 8000,    python3 -m http.server 8000
// open: http://localhost:8000/
function unpack(rows, key) {
  return rows.map(function (row) {
    return row[key];
  });
}
// Matcha sidans grå look i själva plot-ytan också
const PLOT_BG = "#cfcfcf";
// Shared states for interaction between world map and parallel cooridnate and scatter plot
let rows_all = [];                 // raw csv rows
let map_rows = [];                 // same as map_rows
let current_map_metric = "Mean male height (cm)";
let current_scatter_metric = "Mean female height (cm)";
let current_bubble_metric = "Mean female BMI (kg/m_2)";
let parAllRows = [];               // all countries transformed for parcoords
let parRows = [];                  // filtered by map selection (lasso)
let code_to_par_index = {};        // Code -> index in parRows
let par_ready = false; // True when parcoords has been created 
let map_ready = false;
let scatter_ready = false;
let bubble_ready = false;
let hover_code = null; // Hover states
let selected_codes = null;  // Selection state (lasso on map)
let parallel_codes = null;   // Brush filter state
let suppress_par_restyle = false; // Prevent recursion in parcoords restyle
// Return the intersection of two Sets (or handle nulls as "no constraint")
function intersectSets(a, b) {
  if (!a) return b ? new Set(b) : null; // if a is null, result is b 
  if (!b) return a ? new Set(a) : null;
  const out = new Set();
  for (const v of a) if (b.has(v)) out.add(v);
  return out;
}
/**
 * Compute which country codes should be visible in the plots.
 *  selected_codes (lasso on map) and parallel_codes (brush on parcoords)
 */
function computeVisibleSet() {
  let vis = null;
  if (selected_codes) vis = new Set(selected_codes);
  if (parallel_codes) vis = intersectSets(vis, parallel_codes);
  return vis; // null => no filtering, show all
}
// If we are hovering a country that is no longer visible due to filters, clear the hover highlight
function ensureHoverStillValid() {
  const vis = computeVisibleSet(); // current visibility set
  if (hover_code && vis && !vis.has(hover_code)) { // hover exists but is not visible anymore
    clearHover();
  }
}

// hover sync with map, scatter and parcoords
// Set the hovered country code and update all three plots hover highlighting
function setHover(code) {
  hover_code = code || null;
  updateMapHoverOverlay();
  updateParcoordsHover();
  updateScatterHoverOverlay();
}
// Clear hover state and remove hover highlighting from all plots
function clearHover() {
  hover_code = null;
  updateMapHoverOverlay();
  updateParcoordsHover();
  updateScatterHoverOverlay();
}
// MAP filtering. selection values in the parallel coordinate plot, will filter/only show these countries on the map
function updateMapFilter() {
  if (!map_ready) return;
  const vis = computeVisibleSet(); // which codes are currently "visible" on the map
  // Build filtered arrays
  const filteredLocations = [];
  const filteredZ = [];
  const filteredText = [];

  for (let i = 0; i < map_rows.length; i++) { // Loop through all map rows
    const code = map_rows[i].Code;
    if (!code) continue;
    // If no filter, include everything. If filter, include only if code is in visibleSet
    if (!vis || vis.has(code)) {
      filteredLocations.push(code);
      filteredZ.push(Number(map_rows[i][current_map_metric]));
      filteredText.push(map_rows[i].Country);
    }
  }
  // Update map trace with the filtered data
  Plotly.restyle(
    "mapDiv",
    {
      locations: [filteredLocations],
      z: [filteredZ],
      text: [filteredText],
      selectedpoints: [null], //clear Plotly selection styling that makes countries look lighter

    },
    [0]
  );

  updateMapHoverOverlay();// update overlay trace
}
//Highlight overlay on top of the map. 
function updateMapHoverOverlay() {
  if (!map_ready) return; // map must exist
  const vis = computeVisibleSet(); // which codes are currently "visible" on the map
  if (!hover_code) {  // If nothing is hovered, clear the overlay trace
    Plotly.restyle("mapDiv", { locations: [[]], z: [[]], text: [[]] }, [1]);
    return;
  }
  // If the hovered country is filtered out, clear the overlay trace
  if (vis && !vis.has(hover_code)) {
    Plotly.restyle("mapDiv", { locations: [[]], z: [[]], text: [[]] }, [1]);
    return;
  }
  const row = map_rows.find((r) => r.Code === hover_code);
  if (!row) {
    Plotly.restyle("mapDiv", { locations: [[]], z: [[]], text: [[]] }, [1]);
    return;
  }
  // Set overlay trace to only the hovered country (z=1 maps to red in overlay colorscale)
  Plotly.restyle(
    "mapDiv",
    {
      locations: [[hover_code]],
      z: [[1]],
      text: [[row.Country]],
    },
    [1]
  );
}

// scatter draw and hover overlay
function drawScatter() {
  if (!map_rows.length) return;

  const vis = computeVisibleSet(); // null or Set of visible codes
  const filtered = []; 
  for (const r of map_rows) { // Filter rows according to selection/brush
    const code = r.Code;
    if (!code) continue;
    if (!vis || vis.has(code)) filtered.push(r);
  }
  // Build scatter arrays from filtered rows
  const xValues = filtered.map((r) => Number(r[current_map_metric]));
  const yValues = filtered.map((r) => Number(r[current_scatter_metric]));
  const codes = filtered.map((r) => r.Code);
  const countries = filtered.map((r) => r.Country);

  const scatterData = [
    // Base points
    {
      type: "scatter",
      mode: "markers",
      x: xValues,
      y: yValues,
      text: countries,
      customdata: codes,
      marker: { size: 6, opacity: 0.8 },
      hovertemplate:
        "<b>%{text}</b><br>" +
        "X: %{x}<br>" +
        "Y: %{y}<br>" +
        "Code: %{customdata}" +
        "<extra></extra>",
      name: "Countries",
      showlegend: false,
    },
    // Hover overlay point (styling when highlighted)
    {
      type: "scatter",
      mode: "markers",
      x: [],
      y: [],
      text: [],
      customdata: [],
      marker: {
        size: 14,
        symbol: "diamond", //change here from diamond?? when hovering 
        opacity: 1,
        line: { width: 2 },
      },
      hoverinfo: "skip",
      name: "Hover",
      showlegend: false,
    },
  ];

  const scatterLayout = {
    title: { text: "Y: " + current_scatter_metric + " / X: " + current_map_metric, font: { size: 14 } },
    xaxis: { title: current_map_metric },
    yaxis: { title: current_scatter_metric },
    margin: { t: 50, r: 30, b: 40, l: 50 },
    paper_bgcolor: PLOT_BG,
    plot_bgcolor: PLOT_BG,
  };

  Plotly.react("scatterDiv", scatterData, scatterLayout, { responsive: true }).then(() => {
    scatter_ready = true;
    bindScatterHoverHandlers();  // call hover listeners
    updateScatterHoverOverlay(); // update overlay marker if hover_code already exists
  });
}
// Update the scatter hover overlay based on hover_code
function updateScatterHoverOverlay() {
  if (!scatter_ready) return;  // scatter must exist
  if (!hover_code) {  // If nothing is hovered, clear overlay trace
    Plotly.restyle("scatterDiv", { x: [[]], y: [[]], text: [[]], customdata: [[]] }, [1]);
    return;
  }
  const gd = document.getElementById("scatterDiv"); // scatter graph div
  const base = gd?.data?.[0];
  if (!base || !base.customdata) return;
  // Find the index of the point that matches hover_code
  const idx = base.customdata.findIndex((c) => c === hover_code);
  if (idx === -1) {
    Plotly.restyle("scatterDiv", { x: [[]], y: [[]], text: [[]], customdata: [[]] }, [1]);
    return;
  }
  // Update overlay trace to the matching point
  Plotly.restyle(
    "scatterDiv",
    {
      x: [[base.x[idx]]],
      y: [[base.y[idx]]],
      text: [[base.text[idx]]],
      customdata: [[base.customdata[idx]]],
    },
    [1]
  );
}

function scaleBubbleSize(value) {
  return Math.sqrt(value) * 2;
}

// Bubble Chart
function drawBubble() {
  if (!map_rows.length) return;
  
  const vis = computeVisibleSet();
  const filtered = [];
  for (const r of map_rows) {
    const code = r.Code;
    if (!code) continue;
    if (!vis || vis.has(code)) filtered.push(r);
  }
  const xValues = filtered.map(r => Number(r[current_map_metric]));
  const yValues = filtered.map(r => Number(r[current_scatter_metric]));
  const zValues = filtered.map(r => Number(r[current_bubble_metric]));
  
  const size = zValues.map(v => scaleBubbleSize(v));

  const codes = filtered.map(r => r.Code);
  const countries = filtered.map(r => r.Country);

  const bubbleData = [{
    type: "scatter",
    mode: "markers",
    x: xValues,
    y: yValues,
    text: countries,
    customdata: codes,
    marker: { size: size, sizemode: "diameter", opacity: 0.8},
    hovertemplate:
      "<b>%{text}</b><br>" + "X: %{x}<br>" + "Y: %{y}<br>" + "Size: %{marker.size}<extra></extra>",
    showlegend: false
    }
  ];

  const bubbleLayout = {
    title: {text: "Y: " + current_scatter_metric + " / X: " + current_map_metric, font: {size: 12}},
    xaxis: {title: current_map_metric},
    yaxis: {title: current_scatter_metric},
    paper_bgcolor: PLOT_BG,
    plot_bgcolor: PLOT_BG
  };

  Plotly.react("bubbleDiv", bubbleData, bubbleLayout, {responsive: true}).then(() => {});
}




// Country,Code,Mean male height (cm),Mean female height (cm),Mean male BMI (kg/m_2),Mean female BMI (kg/m_2),Life expectancy at birth (years),Road traffic mortality rate (per 100 000 population),Mortality rate due to homicide (per 100 000 population),Total alcohol per capita (more 15 years of age) consumption (litres of pure alcohol),Density of medical doctors (per 10 000 population),Age-standardized prevalence of tobacco use among persons 15 years and older  (%),Happiness - Life evaluation (3-year average),Cost of Living Index,Price To Income Ratio

// parallel coordinate, draw, hover and brush filter
// [""] är den texten som är i csv filen
function buildParRowsFromAll() {
  parAllRows = rows_all.map((r) => ({
    Entity: r["Country"],
    Code: r["Code"],
    male_h: r["Mean male height (cm)"],
    female_h: r["Mean female height (cm)"],
    male_bmi: r["Mean male BMI (kg/m_2)"],
    female_bmi: r["Mean female BMI (kg/m_2)"],
    life: r["Life expectancy at birth (years)"],
    traffic: r["Road traffic mortality rate (per 100 000 population)"],
         //lägg till flera
    mortality: r["Mortality rate due to homicide (per 100 000 population)"],
    alcohol: r["Total alcohol per capita (more 15 years of age) consumption (litres of pure alcohol)"],
    doctors: r["Density of medical doctors (per 10 000 population)"],
    tobacco: r["Age-standardized prevalence of tobacco use among persons 15 years and older  (%)"],
    happines: r["Happiness - Life evaluation (3-year average)"],
    costofliving: r["Cost of Living Index"],
    incomeRatio: r["Price To Income Ratio"],
  }));
    // värden får inte vara null
   // keep only rows that have at least one numeric value for the parcoords dimensions
   parAllRows = parAllRows.filter((d) =>
    [
      d.male_h, d.female_h, d.male_bmi, d.female_bmi, d.life, d.traffic,
      d.mortality, d.alcohol, d.doctors, d.tobacco, d.happines, d.costofliving, d.incomeRatio
    ].some((x) => x !== null)
  );
}
// Apply map lasso selection to parAllRows, producing parRows, and rebuild Code->index mapping
function applyMapSelectionToParRows() {
  const vis = selected_codes ? new Set(selected_codes) : null; // visible codes from map selection
  parRows = !vis ? [...parAllRows] : parAllRows.filter((d) => d.Code && vis.has(d.Code));
  code_to_par_index = {};
  parRows.forEach((d, i) => { // rebuild mapping
    if (d.Code) code_to_par_index[d.Code] = i;
  });
}
// Draw the parallel coordinates plot
function drawParcoords() {
  
  function parVal(v) {  // for paracoords, turn NaNs into nulls (looks like it's treated as 0's but doesn't adjust axes at least)
    return Number.isFinite(v) ? v : null;
  }

  applyMapSelectionToParRows();
  const initColors = new Array(parRows.length).fill(0); // default blue color on the lines
  const parData = [
    {
      type: "parcoords",
      line: {
        color: initColors,
        cmin: 0,
        cmax: 1,
        colorscale: [
          [0, "rgba(95, 145, 239, 0.55)"],  // default blå
          [0.5, "rgba(255,0,0,1.0)"], // HOVER (röd)
          [1, "rgba(255,0,0,1.0)"],         //
        ],
        showscale: false,
      },
      dimensions: [
        { label: "Male height (cm)", values: parRows.map((d) => parVal(d.male_h)) },
        { label: "Female height (cm)", values: parRows.map((d) => parVal(d.female_h)) },
        { label: "Male BMI", values: parRows.map((d) => parVal(d.male_bmi)) },
        { label: "Female BMI", values: parRows.map((d) => parVal(d.female_bmi)) },
        { label: "Life exp (years)", values: parRows.map((d) => parVal(d.life)) }, 
        { label: "Traffic /100k", values: parRows.map((d) => parVal(d.traffic)) },
        //lägg till flera
        { label: "Homicide /100k", values: parRows.map((d) => parVal(d.mortality)) },
        { label: "Alcohol /capita", values: parRows.map((d) => parVal(d.alcohol)) },
        { label: "Doctors /10k", values: parRows.map((d) => parVal(d.doctors)) },
        { label: "Tobacco (%)", values: parRows.map((d) => parVal(d.tobacco)) },
        { label: "Happiness rate", values: parRows.map((d) => parVal(d.happines)) },
        { label: "Cost of Living", values: parRows.map((d) => parVal(d.costofliving)) },
        { label: "Income ratio", values: parRows.map((d) => parVal( d.incomeRatio))},
      ],
    },
  ];

  const parLayout = {
    margin: { t: 60, r: 30, b: 30, l: 42 },
    paper_bgcolor: PLOT_BG,
    plot_bgcolor: PLOT_BG,
    font: {
      size: 7   // smaller label size
    }
  };

  Plotly.react("parDiv", parData, parLayout, { responsive: true }).then(() => {
    par_ready = true;
    bindParcoordsHoverHandlers(); // call hover listeners
    bindParcoordsBrushHandler(); // call brush listeners
    updateParcoordsHover();  // call hover highlight if hover_code is already set
  });
}

  // Update parcoords line colors based on hover_code
  function updateParcoordsHover() {
    if (!par_ready) return;
    const colors = new Array(parRows.length).fill(0); // default for all lines blue
    if (hover_code) {   // If a country is hovered, set its line color value to 0.5 (mapped to highlight color)
      const idx = code_to_par_index[hover_code];
      if (idx !== undefined) colors[idx] = 0.5; // hover value, change color for the line 
    }
    suppress_par_restyle = true;
    Plotly.restyle("parDiv", { "line.color": [colors] }).then(() => {
      setTimeout(() => (suppress_par_restyle = false), 0);
    });
  }
  // Read parallel coordinates selection, the ranges, so its shown in the map with the filtering values
  function codesPassingParcoords() {
    const gd = document.getElementById("parDiv"); //the parcoords graph div
    if (!gd?.data?.[0]?.dimensions) return null;
  
    const dims = gd.data[0].dimensions;// dims is the array of parcoords dimensions
    // For each dimension, build a predicate function if constraintrange exists.
    //If no constraintrange, dimension not filtered 
    const predicates = dims.map((dim) => {
      const cr = dim.constraintrange;
      if (!cr) return null;
      const ranges = Array.isArray(cr[0]) ? cr : [cr]; // the ranges of the brushes
      // Return a function that checks if v is inside any selected range
      return (v) => {
        if (v === null || v === undefined || Number.isNaN(v)) return false;
        for (const [a, b] of ranges) {
          const lo = Math.min(a, b);
          const hi = Math.max(a, b);
          if (v >= lo && v <= hi) return true;
        }
        return false;
      };
    });
    const hasAnyConstraint = predicates.some((p) => p); // If no dimension has a predicate, then no brush is active
    if (!hasAnyConstraint) return null; // no filtering is happeing 
    const passed = [];
    for (let i = 0; i < parRows.length; i++) {
      let ok = true;
      for (let d = 0; d < dims.length; d++) {
        const pred = predicates[d];
        if (!pred) continue;
        const v = dims[d].values[i];
        if (!pred(v)) {
          ok = false;
          break;
        }
      }
      if (ok && parRows[i].Code) passed.push(parRows[i].Code); // If row passes all constraints, keep its code
    }
    return passed;
  }
  // show only filterd countries based on the selections in parallel coordinate
  function bindParcoordsBrushHandler() {
    const parEl = document.getElementById("parDiv"); //the parcoords graph div 
    if (!parEl) return;
    // Remove old handlers if we redraw
    if (parEl.removeAllListeners) parEl.removeAllListeners("plotly_restyle");
    parEl.on("plotly_restyle", () => { //restyle when brushing changes
      if (suppress_par_restyle) return;
  
      const codes = codesPassingParcoords();//current passing codes
      parallel_codes = codes === null ? null : new Set(codes); // no filtering in parallel coordinate, update filter set in map and scatter
      ensureHoverStillValid();
      updateMapFilter();
      drawScatter();
    });
  }
  // Plotly interaction handlers for the map (hover + lasso selection + double-click clear)
  function bindMapHandlers() {
    const mapDiv = document.getElementById("mapDiv");
    if (!mapDiv) return;
    // Remove old handlers
    if (mapDiv.removeAllListeners) {
      mapDiv.removeAllListeners("plotly_hover");
      mapDiv.removeAllListeners("plotly_unhover");
      mapDiv.removeAllListeners("plotly_selected");
      mapDiv.removeAllListeners("plotly_doubleclick");
    }
    //Hovering on a country in the map, setHover(code) to highlight in all plots
    mapDiv.on("plotly_hover", (ev) => {
      const code = ev?.points?.[0]?.location;
      if (code) setHover(code); // sync hover highlight
    });
    // Leaving hover on the map, clear hover highlight everywhere
    mapDiv.on("plotly_unhover", () => {
      clearHover();
    });
    // Lasso selection on the map, set selected_codes and redraw/filter everything
    mapDiv.on("plotly_selected", (ev) => {
      const pts = ev?.points || []; // selected points/countries
      const codes = new Set();
      for (const p of pts) {
        if (p?.location) codes.add(p.location);  // add each selected country code
      }
  
      selected_codes = codes.size ? codes : null;
  
      // When map selection changes, we reset par brush filter
      parallel_codes = null;
  
      // Rebuild parcoords & update map/scatter
      ensureHoverStillValid();
      updateMapFilter(); // update map
      drawScatter(); // update scatter 
      drawParcoords(); // update parallel coordinate 
    });
  
    // Double click to clear selection filter, go back to orginal map
    mapDiv.on("plotly_doubleclick", () => {
      selected_codes = null;
      parallel_codes = null;
      clearHover();
      Plotly.restyle("mapDiv", { selectedpoints: [null] }, [0]); // ensure selection fade is fully cleared
      updateMapFilter();
      drawScatter();
      drawParcoords();
    });
  }
  // hover handlers for the scatter plot (hover: sync highlight, unhover: clear highlight)
  function bindScatterHoverHandlers() {
    const scDiv = document.getElementById("scatterDiv");
    if (!scDiv) return;
    // Remove old listeners to avoid duplicates
    if (scDiv.removeAllListeners) {
      scDiv.removeAllListeners("plotly_hover");
      scDiv.removeAllListeners("plotly_unhover");
    }
  
    // Hovering a point in scatter -> read its customdata (Code) and sync hover
    scDiv.on("plotly_hover", (ev) => {
      const code = ev?.points?.[0]?.customdata;
      if (code) setHover(code);
    });
    // Leaving hover on scatter: clear hover highlight
    scDiv.on("plotly_unhover", () => {
      clearHover();
    });
  }
  // hover handlers for parcoords
  function bindParcoordsHoverHandlers() {
    const parEl = document.getElementById("parDiv");
    if (!parEl) return;
  
    if (parEl.removeAllListeners) {
      parEl.removeAllListeners("plotly_hover");
      parEl.removeAllListeners("plotly_unhover");
    }
  
    // HOVER: parcoords -> map + scatter
    parEl.on("plotly_hover", (ev) => {
      const idx = ev?.points?.[0]?.pointNumber;
      if (idx === undefined || idx === null) return;
      const code = parRows?.[idx]?.Code;
      if (code) setHover(code);
    });
    // Leaving hover on parcoords: clear hover highlight
    parEl.on("plotly_unhover", () => {
      clearHover();
    });
  }
   //färgkod i choropleth map, en för varje attribut
   const colorScales = {
    "Mean male height (cm)": [
      [0, "rgb(5, 10, 172)"],
      [0.5, "rgb(70, 100, 245)"],
      [1, "rgb(220, 220, 220)"],
    ],
  
    "Mean female height (cm)": [
      [0, "rgb(0, 100, 0)"],
      [0.5, "rgb(60, 179, 113)"],
      [1, "rgb(220, 220, 220)"],
    ],
  
    "Mean male BMI (kg/m_2)": [
      [0, "rgb(103, 66, 134)"],
      [0.5, "rgb(211, 174, 224)"],
      [1, "rgb(220, 220, 220)"],
    ],
  
    "Mean female BMI (kg/m_2)": [
      [0, "rgb(158, 86, 122)"],
      [0.5, "rgb(255, 170, 212)"],
      [1, "rgb(220, 220, 220)"],
    ],
  
    "Life expectancy at birth (years)": [
      [0, "rgb(1, 146, 124)"],
      [0.5, "rgb(0, 255, 217)"],
      [1, "rgb(220, 220, 220)"],
    ],
  
    "Road traffic mortality rate (per 100 000 population)": [
      [0, "rgb(219, 120, 0)"],
      [0.5, "rgb(255, 166, 0)"],
      [1, "rgb(220, 220, 220)"],
    ],

    "Mortality rate due to homicide (per 100 000 population)": [
      [0,   "rgb(120, 0, 20)"],
      [0.5, "rgb(220, 60, 80)"],
      [1,   "rgb(220, 220, 220)"],
    ],

    "Total alcohol per capita (more 15 years of age) consumption (litres of pure alcohol)": [
      [0,   "rgb(55, 20, 90)"],
      [0.5, "rgb(160, 110, 220)"],
      [1,   "rgb(220, 220, 220)"],
    ],

    "Density of medical doctors (per 10 000 population)": [
      [0,   "rgb(10, 60, 160)"],
      [0.5, "rgb(90, 170, 255)"],
      [1,   "rgb(220, 220, 220)"],
    ],

    "Age-standardized prevalence of tobacco use among persons 15 years and older  (%)": [
      [0,   "rgb(90, 55, 25)"],
      [0.5, "rgb(200, 160, 95)"],
      [1,   "rgb(220, 220, 220)"],
    ],

    "Happiness - Life evaluation (3-year average)": [
      [0,   "rgb(0, 90, 85)"],
      [0.5, "rgb(120, 220, 200)"],
      [1,   "rgb(220, 220, 220)"],
    ],

    "Cost of Living Index": [
      [0,   "rgb(110, 0, 110)"],
      [0.5, "rgb(220, 110, 220)"],
      [1,   "rgb(220, 220, 220)"],
    ],

    "Price To Income Ratio": [
      [0,   "rgb(60, 85, 0)"],
      [0.5, "rgb(170, 210, 80)"],
      [1,   "rgb(220, 220, 220)"],
    ],
  };
  
  //Draw map
  function drawMap(metric) {
    current_map_metric = metric; // Store current metric so updateMapFilter can read correct z-value
    const zValues = unpack(map_rows, metric).map(Number);
  
    const mapData = [
      {
        type: "choropleth",
        locations: unpack(map_rows, "Code"),
        z: zValues,
        text: unpack(map_rows, "Country"), // country, first in the csv file
        colorscale: colorScales[metric],
        autocolorscale: false,
        reversescale: true,
        selectedpoints: null, //disable Plotly "fade unselected" effect
        selected:   { marker: { opacity: 1 } },
        unselected: { marker: { opacity: 1 } },
        marker: { line: { color: "rgb(180,180,180)", width: 0.5 } },
        hovertemplate:
          "<b>%{text}</b><br>" +
          "Value: %{z}<br>" +
          "Code: %{location}" +
          "<extra></extra>",
      },
      // Hover overlay, red highlight on hovered country 
      {
        type: "choropleth",
        locations: [],
        z: [],
        text: [],
        zmin: 0,
        zmax: 1,
        colorscale: [
          [0, "rgba(255,0,0,0.0)"],
          [1, "rgba(255,0,0,0.85)"],
        ],
        showscale: false,
        marker: { line: { color: "rgba(255,0,0,1)", width: 2 } },
        hoverinfo: "skip",
      },
    ];
  
    const mapLayout = {
      title: { text: metric, x: 0.5 },
      margin: { t: 60, r: 0, b: 0, l: 0 },
      paper_bgcolor: PLOT_BG,
      plot_bgcolor: PLOT_BG,
      dragmode: "lasso",     // Enable lasso selection on the map
      geo: {
        domain: { x: [0, 1], y: [0, 1] },
        scope: "world",
        projection: { type: "natural earth", scale: 1.55 },
        lonaxis: { range: [-180, 180] },
        lataxis: { range: [-60, 90] },
        showframe: false,
        showcoastlines: false,
        showcountries: true,
        bgcolor: PLOT_BG,
      },
    };
  
    Plotly.react("mapDiv", mapData, mapLayout, { responsive: true }).then(() => {
      map_ready = true;
      bindMapHandlers(); //calling
      updateMapFilter(); 
    });
  }
  
  //  CSV load
  d3.csv("mean_data_full.csv", function (err, rows) { //ändrade dataset
    if (err) {
      console.error("CSV load error:", err);
      return;
    }

    // cLean numeric values, convert empty to NaN
    rows.forEach(function (r) {
      Object.keys(r).forEach(function (key) {
        if (key === "Country" || key === "Code") return;  //skip, not numeric
        var raw = r[key];
        if (raw === "" ) {
          r[key] = NaN;                                 //set empty values to NaN
        } else {
          var v = Number(raw);
          r[key] = isNaN(v) ? NaN : v;
        }
      });
    });

    rows_all = rows;
    map_rows = rows;
    // Build parcoords base data once
    buildParRowsFromAll();

  
        //For eventlisteners
    const mapSelect = document.getElementById("mapMetric");
    const scatterSelect = document.getElementById("scatterMetric");
    const bubbleSelect = document.getElementById("bubbleMetric");
    // Get the selected metrics or defaults
    function getSelections() {
      current_map_metric = mapSelect ? mapSelect.value : current_map_metric;
      current_scatter_metric = scatterSelect ? scatterSelect.value : current_scatter_metric;
      current_bubble_metric = bubbleSelect ? bubbleSelect.value : current_bubble_metric;

      console.log("Valda attribut: ", current_map_metric, current_scatter_metric, current_bubble_metric);
    }
  
    // Initial draw
    getSelections();
    drawMap(current_map_metric);
    drawScatter();
    drawBubble();
    drawParcoords();
  
    // Dropdown changes
    if (mapSelect) {
      mapSelect.addEventListener("change", () => {
        getSelections();
        clearHover();
        // Map metric affects map + scatter X
        drawMap(current_map_metric);
        drawScatter();
        drawBubble();
      });
    }
  
    if (scatterSelect) {
      scatterSelect.addEventListener("change", () => {
        getSelections();
        clearHover();
        drawScatter();
        drawBubble();
      });
    }

    if (bubbleSelect) {
      bubbleSelect.addEventListener("change", () => {
        getSelections();
        clearHover();
        drawBubble();
      })
    }
  });  

  // Country,Code,Mean male height (cm),Mean female height (cm),Mean male BMI (kg/m_2),Mean female BMI (kg/m_2),Life expectancy at birth (years),Road traffic mortality rate (per 100 000 population),Mortality rate due to homicide (per 100 000 population),Total alcohol per capita (more 15 years of age) consumption (litres of pure alcohol),Density of medical doctors (per 10 000 population),Age-standardized prevalence of tobacco use among persons 15 years and older  (%),Happiness - Life evaluation (3-year average),Cost of Living Index,Price To Income Ratio
