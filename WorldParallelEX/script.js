// run: python -m http.server 8000
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

  function drawMap(metric) {
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
d3.csv("https://raw.githubusercontent.com/bcdunbar/datasets/master/iris.csv", function (err, rows) {
  if (err) {
    console.error("CSV load error:", err);
    return;
  }

  var parData = [
    {
      type: "parcoords",
      line: {
        color: unpack(rows, "species_id").map(Number),
        colorscale: [
          [0, "red"],
          [0.5, "green"],
          [1, "blue"],
        ],
      },
      dimensions: [
        {
          range: [2, 4.5],
          label: "sepal_width",
          values: unpack(rows, "sepal_width").map(Number),
        },
        {
          constraintrange: [5, 6],
          range: [4, 8],
          label: "sepal_length",
          values: unpack(rows, "sepal_length").map(Number),
        },
        {
          label: "petal_width",
          range: [0, 2.5],
          values: unpack(rows, "petal_width").map(Number),
        },
        {
          label: "petal_length",
          range: [1, 7],
          values: unpack(rows, "petal_length").map(Number),
        },
      ],
    },
  ];

  var parLayout = {
    title: { 
      text: "Parallel Coordinates",
      font: { size: 14 } 
    },
    margin: { t: 50, r: 30, b: 30, l: 30 },
    paper_bgcolor: PLOT_BG,
    plot_bgcolor: PLOT_BG,
  };

  Plotly.newPlot("parDiv", parData, parLayout, { responsive: true });
});