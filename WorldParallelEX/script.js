// run: python -m http.server 8000
// open: http://localhost:8000/
function unpack(rows, key) {
  return rows.map(function (row) {
    return row[key];
  });
}
// Matcha sidans grå look i själva plot-ytan också
const PLOT_BG = "#cfcfcf";

// parse number or return null
function num(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (s === "" || s === "NA" || s === "NaN") return null;
  const x = Number(s);
  return Number.isFinite(x) ? x : null;
}


  // world map code from plotly
d3.csv(
  "https://raw.githubusercontent.com/plotly/datasets/master/2014_world_gdp_with_codes.csv",
  function (err, rows) {
    if (err) {
      console.error("CSV load error:", err);
      return;
    }

    var mapData = [
      {
        type: "choropleth",
        locations: unpack(rows, "CODE"),
        z: unpack(rows, "GDP (BILLIONS)"),
        text: unpack(rows, "COUNTRY"),
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
        colorbar: {
          autotick: false,
          tickprefix: "$",
          title: { text: "GDP<br>Billions US$" },
        },
      },
    ];

    var mapLayout = {
      title: {
        text:
          '2014 Global GDP',
        x: 0.5
      },
    
      margin: { t: 60, r: 0, b: 0, l: 0 },
    
      paper_bgcolor: PLOT_BG,
      plot_bgcolor: PLOT_BG,
    
      geo: {
        domain: { x: [0, 1], y: [0, 1] },  // 🔥 fill 100% of div
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
      bgcolor: PLOT_BG
}
    };

    Plotly.newPlot("mapDiv", mapData, mapLayout, { responsive: true });
  }
);

// scatter plot code from plotly
var trace1 = {
  x: [1, 2, 3, 4],
  y: [10, 15, 13, 17],
  mode: "markers",
  type: "scatter",
};

var trace2 = {
  x: [2, 3, 4, 5],
  y: [16, 5, 11, 9],
  mode: "lines",
  type: "scatter",
};

var trace3 = {
  x: [1, 2, 3, 4],
  y: [12, 9, 15, 12],
  mode: "lines+markers",
  type: "scatter",
};

var scatterLayout = {
  title: { 
    text: "Scatter Plot",
    font: { size: 14 }
  },
  margin: { t: 50, r: 30, b: 40, l: 50 },
  paper_bgcolor: PLOT_BG,
  plot_bgcolor: PLOT_BG,
};

Plotly.newPlot("scatterDiv", [trace1, trace2, trace3], scatterLayout, { responsive: true });

// parallel coordinates code from plotly
d3.csv( "mean_data.csv", function (err, rows) {
    if (err) {
      console.error("CSV load error:", err);
      return;
    }

  // Normalize and convert fields
  // [""] är den texten som är i csv filen
  const data = rows.map((r) => ({
    Entity: r["Entity"],
    Code: r["Code"],

    male_h: num(r["Mean male height (cm)"]),
    female_h: num(r["Mean female height (cm)"]),

    male_bmi: num(
      r["Mean BMI (kg/m) (age-standardized estimate) - Sex: male - Age group: 18+  years of age"]
    ),
    mean_bmi: num(r["Mean BMI (kg/m)"]),

    life: num(r["Life expectancy at birth (years)"]),
    traffic: num(r["Road traffic mortality rate (per 100 000 population)"]),
  }));

// parallel coordinates code from plotly
const parRows = data.filter(d =>
  d.male_h !== null ||
  d.female_h !== null ||
  d.male_bmi !== null ||
  d.mean_bmi !== null ||
  d.life !== null ||
  d.traffic !== null
);

const parColor = parRows.map(d => d.life); //om färgen ska vara liknande som  life expectancy mape

const parData = [
  {
    type: "parcoords",  //om färgen ska vara liknande som life expectancy mapen, annars kan  den vara helt blå
    line: {
      color: parColor,
      colorscale: [
        [0.0, "#b2182b"], 
        [0.5, "#fddbc7"],  
        [1.0, "#1a9641"], 
      ],
      cmin: 50,
      cmax: 85,
    },
    dimensions: [
      { label: "Male height (cm)", values: parRows.map(d => d.male_h) },
      { label: "Female height (cm)", values: parRows.map(d => d.female_h) },
      { label: "Male BMI", values: parRows.map(d => d.male_bmi) },
      { label: "Mean BMI", values: parRows.map(d => d.mean_bmi) },
      { label: "Life exp (years)", values: parRows.map(d => d.life) },
      { label: "Traffic /100k", values: parRows.map(d => d.traffic) },
    ],
  },
];

const parLayout = {
  margin: { t: 60, r: 30, b: 30, l: 42 },
  paper_bgcolor: PLOT_BG,
  plot_bgcolor: PLOT_BG,
};

Plotly.newPlot("parDiv", parData, parLayout, { responsive: true });
});