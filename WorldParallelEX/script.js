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

//flyttade upp denna så att vi inte behöver skriva den igen för varje plot
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

  // Lägg till flera sen
}));

//world map
const mapRows = data.filter((d) => d.Code);

const mapTrace = {
  type: "choropleth",
  locations: mapRows.map((d) => d.Code), 
  z: mapRows.map((d) => d.life),         // mapen filtreras just nu på life expectancy, ÄNDRA SEDAN ATT Z VÄRDET ÄR FRÅN DROPDOWN, så att de kan vara alla attirbut
  text: mapRows.map((d) => d.Entity),
  hovertemplate:
    "<b>%{text}</b><br>" +
    "Life expectancy: %{z:.1f} years<br>" +
    "Code: %{location}<extra></extra>",
  // color scale Red (low), Yellow,  Green (high) for life expectancy. CANGE DEPENDING OF ATTRIBUTE?
colorscale: [
  [0.0, "#b2182b"],  
  [0.5, "#fddbc7"],  
  [1.0, "#1a9641"] 
],

colorbar: {
  title: { text: "Life expectancy (years)" }
},

marker: {
  line: { color: "rgb(180,180,180)", width: 0.5 }
}
};

const mapLayout = {
  margin: { t: 0, r: 0, b: 0, l: 0 },
  paper_bgcolor: PLOT_BG,
  plot_bgcolor: PLOT_BG,

  geo: {
    domain: { x: [0, 1], y: [0, 1] },
    scope: "world",

    projection: { type: "equirectangular", scale: 1.05 },

    lonaxis: { range: [-180, 180] },
    lataxis: { range: [-60, 90] },

    showframe: false,
    showcoastlines: false,
    showcountries: true,
    countrycolor: "rgb(180,180,180)",
    bgcolor: PLOT_BG,
  }
};

Plotly.newPlot("mapDiv", [mapTrace], mapLayout, { responsive: true });





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

//parallel coordinate plot
const parRows = data.filter(d =>
  d.male_h !== null ||
  d.female_h !== null ||
  d.male_bmi !== null ||
  d.mean_bmi !== null ||
  d.life !== null ||
  d.traffic !== null
);

const parData = [
  {
    type: "parcoords",  // ENDAST BLÅ LINJER just nu
    dimensions: [
      { label: "Male height (cm)", values: parRows.map(d => d.male_h) },
      { label: "Female height (cm)", values: parRows.map(d => d.female_h) },
      { label: "Male BMI", values: parRows.map(d => d.male_bmi) },
      { label: "Mean BMI", values: parRows.map(d => d.mean_bmi) },
      { label: "Life exp (years)", values: parRows.map(d => d.life) },
      { label: "Traffic /100k", values: parRows.map(d => d.traffic) },
      //Lägg till flera sen
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