// run: python -m http.server 8000
// open: http://localhost:8000/

function unpack(rows, key) {
    return rows.map(function (row) {
      return row[key];
    });
  }
  
  // world map code from plotly
  d3.csv(
    "https://raw.githubusercontent.com/plotly/datasets/master/2014_world_gdp_with_codes.csv", // ÄNDRA TILL VÅRT DATA!!
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
            '2014 Global GDP<br>Source: <a href="https://www.cia.gov/library/publications/the-world-factbook/fields/2195.html">CIA World Factbook</a>',
        },
        geo: {
          showframe: false,
          showcoastlines: false,
          projection: { type: "mercator" },
        },
        margin: { t: 60, r: 0, b: 0, l: 0 },
      };
  
      Plotly.newPlot("mapDiv", mapData, mapLayout, { responsive: true });
    }
  );

  var scatterData = [{              //ÄNDRA TILL VÅR DATA
    x: [0, 1, 2, 3, 4],
    y: [0, 1, 4, 9, 16],
    mode: "markers",
    type: "scatter",
    marker: {size: 10},
  },
];

Plotly.newPlot("scatterDiv", scatterData, scatterLayout, {responsive: true});
  
  // parallel coordinates code from plotly
  d3.csv("https://raw.githubusercontent.com/bcdunbar/datasets/master/iris.csv", function (err, rows) { // ÄNDRA TILL VÅRT DATA!!
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
      margin: { t: 30, r: 30, b: 30, l: 30 },
    };
  
    Plotly.newPlot("parDiv", parData, parLayout, { responsive: true });
  });