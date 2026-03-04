// run: python -m http.server 8000,    python3 -m http.server 8000
// open: http://localhost:8000/
function unpack(rows, key) {
  return rows.map(function (row) {
    return row[key];
  });
}
// Matcha sidans grå look i själva plot-ytan också
const PLOT_BG = "#cfcfcf";

// world map + scatter using mean_data.csv
d3.csv(
  "mean_data.csv", 
  function (err, rows) {
    if (err) {
      console.error("CSV load error:", err);
      return;
    }
  
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
};

  function drawMap(metric) {
    var zValues = unpack(rows, metric).map(Number);

    var mapData = [
      {
        type: "choropleth",
        locations: unpack(rows, "Code"),
        z: zValues,
        text: unpack(rows, "Country"),
        colorscale: colorScales[metric],
        autocolorscale: false,
        reversescale: true,
        marker: { line: { color: "rgb(180,180,180)", width: 0.5 } },
        colorbar: {
          title: { text: metric },
        },
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
        bgcolor: PLOT_BG,
      },
    };

    Plotly.react("mapDiv", mapData, mapLayout, { responsive: true });
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

// parallel coordinates code from plotly
//parallel coordinate plot
d3.csv( "mean_data.csv", function (err, rows) {
  if (err) {
    console.error("CSV load error:", err);
    return;
  }

// Normalize and convert fields
// [""] är den texten som är i csv filen
const data = rows.map((r) => ({
  Entity: r["Country"],
  Code: r["Code"],

  male_h: (r["Mean male height (cm)"]),
  female_h: (r["Mean female height (cm)"]),

  male_bmi: (
    r["Mean male BMI (kg/m_2)"]
  ),
  Female_bmi: (r["Mean female BMI (kg/m_2)"]),

  life: (r["Life expectancy at birth (years)"]),
  traffic: (r["Road traffic mortality rate (per 100 000 population)"]),

  // Lägg till flera sen
}));
const parRows = data.filter(d =>
  d.male_h !== null ||
  d.female_h !== null ||
  d.male_bmi !== null ||
  d.Female_bmi !== null ||
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
      { label: "Female BMI", values: parRows.map(d => d.Female_bmi) },
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