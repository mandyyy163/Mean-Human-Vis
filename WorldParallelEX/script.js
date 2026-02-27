// run: python -m http.server 8000
// open: http://localhost:8000/
function unpack(rows, key) {
  return rows.map(function (row) {
    return row[key];
  });
}
// Matcha sidans grå look i själva plot-ytan också
const PLOT_BG = "#cfcfcf";

// Shared states for interaction between world map and parallel cooridnate
let parRows = [];
let code_to_par_index = {};
let par_ready = false;
let current_selected_code = null;
let map_rows = [];
let map_ready = false;
let current_map_metric = "Mean male height (cm)";
let selected_code = new Set(); // used to FILTER the map
let parallel_codes = null;          // no filtering in the parallel coordinate plot, all countries shown
let one_code = null;          // selection of country in the map
let highlight_code = null;       // country to highlight


// MAP filtering. selection values in the parallel coordinate plot, will filter/only show these countries on the map
function updateMapFilter() {
  if (!map_ready) return;
  // Decide which codes are currently "visible" on the map
  let visibleSet = null;

  if (parallel_codes!== null) { // based on if filtering is in the parallel coordinate plot
    visibleSet = parallel_codes;
  }
  // Build filtered arrays for trace 0 the base choropleth
  const filteredLocations = [];
  const filteredZ = [];
  const filteredText = [];

  for (let i = 0; i < map_rows.length; i++) {
    const code = map_rows[i].Code;
    if (!code) continue;

    if (!visibleSet || visibleSet.has(code)) {
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
    },
    [0]
  );
}

// Read parallel coordinates selection, the ranges, so its shown in the map with the filtering values
function codesPassingParcoords() {
  const gd = document.getElementById("parDiv");
  if (!gd?.data?.[0]?.dimensions) return null;

  const dims = gd.data[0].dimensions;

  const predicates = dims.map((dim) => {
    const cr = dim.constraintrange;
    if (!cr) return null;

    const ranges = Array.isArray(cr[0]) ? cr : [cr];

    return (v) => {
      if (v === null || v === undefined) return false;
      for (const [a, b] of ranges) {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        if (v >= lo && v <= hi) return true;
      }
      return false;
    };
  });

  const hasAnyConstraint = predicates.some((p) => p);
  if (!hasAnyConstraint) return null; // no filtering is happening

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
    if (ok && parRows[i].Code) passed.push(parRows[i].Code);
  }
  return passed;
}
// show only filterd countries based on the selections in parallel coordinate
function parCoordsSelection() {
  const parEl = document.getElementById("parDiv");
  if (!parEl) return;

  if (parEl.removeAllListeners) {
    parEl.removeAllListeners("plotly_restyle");
  }

  parEl.on("plotly_restyle", () => {
    const codes = codesPassingParcoords();

    // no filtering in parallel coordinate 
    parallel_codes = codes === null ? null : new Set(codes);

    updateMapFilter();
  });
}

// world map + scatter using mean_data.csv
d3.csv(
  "mean_data.csv", 
  function (err, rows) {
    if (err) {
      console.error("CSV load error:", err);
      return;
    }
  map_rows = rows;
    //For eventlisteners
  var mapSelect = document.getElementById("mapMetric");
  var scatterSelect = document.getElementById("scatterMetric");

  // Get the selected metrics or defaults
  function getSelections() {
    return {
      mapMetric: mapSelect ? mapSelect.value : "Mean male height (cm)",
      scatterMetric: scatterSelect ? scatterSelect.value : "Mean female height (cm)",
    };
  }

  function drawMap(metric) {
    current_map_metric = metric;
    var zValues = unpack(rows, metric).map(Number);

    var mapData = [
      {
        type: "choropleth",
        locations: unpack(rows, "Code"),
        z: zValues,
        text: unpack(rows, "Country"),
        colorscale: [
          [0, "rgb(5, 10, 172)"],
          [0.35, "rgb(40, 60, 190)"],
          [0.5, "rgb(70, 100, 245)"],
          [0.6, "rgb(90, 120, 245)"],
          [0.7, "rgb(106, 137, 247)"],
          [1, "rgb(220, 220, 220)"],
        ],
        autocolorscale: false,
        reversescale: true,
        marker: { line: { color: "rgb(180,180,180)", width: 0.5 } },
        hovertemplate:
        "<b>%{text}</b><br>" +
        "Value: %{z}<br>" +
        "Code: %{location}" +
        "<extra></extra>",
      },
];

    var mapLayout = {
      title: {
        text: metric,
        x: 0.5,
      },
      margin: { t: 60, r: 0, b: 0, l: 0 },
      paper_bgcolor: PLOT_BG,
      plot_bgcolor: PLOT_BG,
      geo: {
        domain: { x: [0, 1], y: [0, 1] },
        scope: "world",
        projection: {
        type: "natural earth",
        scale: 1.55
        },
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
      updateMapFilter(); // apply current selection
    });
  }

  function drawScatter(xMetric, yMetric) {
    var xValues = unpack(rows, xMetric).map(Number);
    var yValues = unpack(rows, yMetric).map(Number);

    var scatterData = [
      {
        type: "scatter",
        mode: "markers",
        x: xValues,
        y: yValues,
        text: unpack(rows, "Country"),
        marker: {
          size: 6,
          opacity: 0.8,
        },
      },
    ];

    var scatterLayout = {
      title: {
        text: "Y:" + yMetric + "/ X:" +xMetric,
        font: { size: 14 },
      },
      xaxis: { title: xMetric },
      yaxis: { title: yMetric },
      margin: { t: 50, r: 30, b: 40, l: 50 },
      paper_bgcolor: PLOT_BG,
      plot_bgcolor: PLOT_BG,
    };

    Plotly.react("scatterDiv", scatterData, scatterLayout, { responsive: true });
  }

  drawMap(getSelections().mapMetric);
  drawScatter(getSelections().mapMetric, getSelections().scatterMetric);

  if (mapSelect) {
    mapSelect.addEventListener("change", function () {
      drawMap(getSelections().mapMetric);
      drawScatter(getSelections().mapMetric, getSelections().scatterMetric);
    });
  }

  if (scatterSelect) {
    scatterSelect.addEventListener("change", function () {
      drawScatter(getSelections().mapMetric, getSelections().scatterMetric);
    });
  }
});


//parallel coordinate plot
d3.csv( "mean_data.csv", function (err, rows) {
  if (err) {
    console.error("CSV load error:", err);
    return;
  }


// [""] är den texten som är i csv filen
  const data = rows.map((r) => ({
    Entity: r["Country"],
    Code: r["Code"],
    male_h: r["Mean male height (cm)"],
    female_h: r["Mean female height (cm)"],
    male_bmi: r["Mean male BMI (kg/m_2)"],
    female_bmi: r["Mean female BMI (kg/m_2)"],
    life: r["Life expectancy at birth (years)"],
    traffic: r["Road traffic mortality rate (per 100 000 population)"],
  }));
  // värden får inte vara null
  parRows = data.filter((d) =>
    [d.male_h, d.female_h, d.male_bmi, d.female_bmi, d.life, d.traffic].some(
      (x) => x !== null
    )
  );
  const parData = [
    {
      type: "parcoords",
      line: {
        colorscale: [
          ["rgba(95, 145, 239, 0.6)"],
        ],
        showscale: false,
      },
      dimensions: [
        { label: "Male height (cm)", values: parRows.map((d) => d.male_h) },
        { label: "Female height (cm)", values: parRows.map((d) => d.female_h) },
        { label: "Male BMI", values: parRows.map((d) => d.male_bmi) },
        { label: "Female BMI", values: parRows.map((d) => d.female_bmi) },
        { label: "Life exp (years)", values: parRows.map((d) => d.life) },
        { label: "Traffic /100k", values: parRows.map((d) => d.traffic) },
      ],
    },
  ];

  const parLayout = {
    margin: { t: 60, r: 30, b: 30, l: 42 },
    paper_bgcolor: PLOT_BG,
    plot_bgcolor: PLOT_BG,
  };

  Plotly.newPlot("parDiv", parData, parLayout, { responsive: true }).then(() => {
    par_ready = true;
    parCoordsSelection(); // show only filterd countries based on the selections in parallel coordinate
  });
});