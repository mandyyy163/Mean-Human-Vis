// run: python -m http.server 8000
// open: http://localhost:8000/
function unpack(rows, key) {
  return rows.map(function (row) {
    return row[key];
  });
}
// Matcha sidans grå look i själva plot-ytan också
const PLOT_BG = "#cfcfcf";

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