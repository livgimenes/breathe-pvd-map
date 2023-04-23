
const apiKey = 'pk.eyJ1IjoiYWxmcmVkMjAxNiIsImEiOiJja2RoMHkyd2wwdnZjMnJ0MTJwbnVmeng5In0.E4QbAFjiWLY8k3AFhDtErA';

const mymap = L.map('map').setView([41.831391, -71.415804], 13);


// Constants

const date_obj = new Date();
const currentYear = date_obj.getFullYear().toString();
const currentMonth = (date_obj.getMonth() + 1).toString().padStart(2, '0');
const currentDate = date_obj.getDate().toString().padStart(2, '0');
const currentHour = date_obj.getHours().toString().padStart(2, '0');


var date = currentYear + '-' + currentMonth + '-' + currentDate;
var time = currentHour + ':00:00';


//Variable later used for filtering
var CurrentDate = date + " " + time;

console.log(CurrentDate);

// side bar infos
var sidebar = document.getElementById('sidebar');
var closeButton = document.getElementById('close-button');
var MonitorName = document.getElementById("monitorName");
var MonitorTimeStart = document.getElementById("monitorTime");
var MonitorTimeEnd = document.getElementById("monitorTime2");
var pollValue = document.getElementById("pollValue");
var pollMarker = document.getElementById("pollMarker");
var timelineSelect = document.getElementById('Timeline');


L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    maxZoom: 18,
    id: 'mapbox/light-v10',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: apiKey
}).addTo(mymap);

class LegendControl extends L.Control {
  // Define the onAdd method
  onAdd() {
      const div = L.DomUtil.create('div', 'legend');
      div.style.backgroundColor = "white";
      div.style.padding = "6px";
      div.style.borderRadius = "6px";
      div.style.width = "max-content";
      div.style.position = "absolute";
      div.style.right = "650px";
      div.style.top = "520px";
      div.style.fontSize = "14px";
      div.innerHTML =  `
      <div>
          <b>CO2 Levels</b>
          <br>
          Date: ${date}
          <br>
          Time:  ${time}
          <br>
          <b>Legend</b>
          <br>
          <div style="height: 20px;">600 ppm </div>
          <div style="display:inline-block; width: 20px; height: 120px; background: linear-gradient(to bottom, rgb(0, 31, 102), rgb(39, 74, 146), rgb(77, 117, 190), rgb(115, 160, 234), rgb(153, 187, 244), rgb(191, 213, 253), rgb(214, 226, 255), rgb(229, 237, 255));;"></div>
          <br>
          <div style="height: 20px;">400 ppm </div>
          </div>
      </div>`;
      return div;
  }
}

const legendControl = new LegendControl();

// Add the custom control to the map
mymap.addControl(legendControl);



//// Non-Data Handling Helpers


function getColor(co2Value) {
  // Define the two RGB colors to interpolate between
  const color1 = [0, 31, 102];  // dark blue
  const color2 = [229, 237, 255];  // light blue

  if(co2Value == -1) {
    return `#DCDCDC`};

  // Calculate the percentage of the CO2 value between 400 and 600
  const percent = 1 - (co2Value - 400) / 200;

  // Interpolate between the two colors based on the percentage
  const color = [
    Math.round(color1[0] + (color2[0] - color1[0]) * percent),
    Math.round(color1[1] + (color2[1] - color1[1]) * percent),
    Math.round(color1[2] + (color2[2] - color1[2]) * percent)
  ];

  // Convert the RGB color to a CSS color string and return it
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

// condenses the data by calculating the average
function processData(datetime, co2_corrected, chunkSize) {

  const dates = datetime.map(date => new Date(date));
  const data = dates.map((date, i) => ({ date, co2: co2_corrected[i] }));

  data.sort((a, b) => a.date - b.date);

  const chunkedData = _.chunk(data, chunkSize);
 

  const processedData = chunkedData.map(chunk => {
    const avgCO2 = _.meanBy(chunk, 'co2');
    const avgDate = chunk[Math.floor(chunk.length / 2)].date;
    const pcDate = avgDate.toISOString().slice(0, 19).replace('T', ' ');
    return { date: pcDate, co2: avgCO2 };
  });
  
  let processedDatetime = processedData.map(d => d.date);
  const processedCO2 = processedData.map(d => d.co2);
  return { processedDatetime, processedCO2 };
}


// Async Helpers

async function makeChart(data) {

  // change so that the inner html value is also changed here since all of the data is gonna come here

  console.log("this is the data being presented to the chart");
  console.log(data);

  const filteredData = await data.filter(d => d.co2_corrected !== -1);
  const datetime = await filteredData.map(d => d.datetime);
  const co2_corrected = await filteredData.map(d => d.co2_corrected);

  console.log("this is the co2");
  console.log(co2_corrected);
  console.log("this is the datetime");
  console.log(datetime);

  if (co2_corrected.includes(-1)) {
    pollValue.innerHTML = '<p>Not Available</p>';
  } else{
    let sum = co2_corrected.reduce((a, b) => a + b, 0);
    let avg = sum / co2_corrected.length;
    avg = Math.round(avg * 10) / 10;
    avg = avg.toString();
    pollValue.innerHTML = '<p>' + avg + ' (ppm) </p>';
  }

  let processedDatetime = datetime;
  let processedCo2 = co2_corrected;
  let xaxisTik = ''

  // scaling fer amounts of data
  if (co2_corrected.length > 24) { 
      xaxisTik = '%m-%d'; 
    if (co2_corrected.length > 710) {

      let chunkSize = 40;
      
      if (co2_corrected.length > 1000) {
        chunkSize = 200;
      }

      const { processedDatetime: pd, processedCO2: pc } = processData(datetime, co2_corrected, chunkSize);
      processedDatetime = pd;
      processedCo2 = pc;

      console.log(processedDatetime);
    
    }
  } else {
    xaxisTik = '%H:%M:%S';
  }

  console.log("This is the processed co2");
  console.log(processedCo2);
  console.log("This is the processed datetime");
  console.log(processedDatetime);


  // Create a trace for the CO2 values
  const co2Trace = {
    x: processedDatetime,
    y: processedCo2,
    type: 'scatter',
    mode: 'lines+markers',
    name: 'CO2',
    yaxis: 'y',
    line: {
      color: 'darkblue',
      width: 3
    },
    hoverinfo: 'none'
  };

  // Define the layout with two y-axes
  var layout = {
    showlegend: false,
    yaxis: {
      // range: [450, 600],
      showline: true,
      zeroline: true,
      fixedrange: true,
      //TODO: check in about this 
      // title: {
      //   text: 'CO2 (ppm)',
      //   font: {
      //     size: 12},
      // }
    },
    height: 350,
    xaxis: {
      showline: true,
      tickformat: xaxisTik,
    },
    margin: {
      t: 5,
      l: 55, 
      r: 50, 
    },

  };


  // Combine the traces and layout and plot the chart
  const datas = [co2Trace];
  Plotly.newPlot('chart', datas, layout, {staticPlot: true});

}


// should this be an async function?
async function getData(node, timeLine) {
  try {
    const response = await axios.get('/api/data', {
      params: {
        nodeId: node,
        date: timeLine
      }
    });
    console.log("this is the response from the backend");
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.log("whoops!");
    console.error(error);
    throw error;
  }
}



fetch("coords.json")
  .then(response => response.json())
  .then(coordinates => {
    let fullData = coordinates;
    for (let i = 0; i < coordinates.length; i++) {
        const lat = coordinates[i]["Latitude"];
        const lon = coordinates[i]["Longitude"];
        let color = getColor(coordinates[i]["co2_corrected"]);


      console.log(coordinates[i]["datetime"])
      console.log(CurrentDate);
     

      let circleMarker = L.circleMarker([lat, lon], {
        radius: 8,
        color: 'black',
        weight: 1,
        fillColor: color,
        fillOpacity: 0.8
    });
      
      if(coordinates[i]["co2_corrected"] == -1){
        circleMarker.bindPopup("Location: " + coordinates[i]["Location"] + "<br>" + "CO2 Level: Not Available");
      }else{
        circleMarker.bindPopup("Location: " + coordinates[i]["Location"] + "<br>" + "CO2 Level: " + coordinates[i]["co2_corrected"] + " (ppm) ");
      }
      circleMarker.addTo(mymap);
      

      circleMarker.on('click', function(event) {
        if (sidebar) {
          // make it visable 
          sidebar.style.display = 'block';

          // add the names
          MonitorName.innerHTML = '<p>' + coordinates[i]["Location"] + '</p>';

          const installationDate = coordinates[i]["Installation Date"]; 
          const startDate = new Date(installationDate);
          const endDate = new Date();

          const options = { year: 'numeric', month: 'long', day: 'numeric' };

          MonitorTimeStart.innerHTML = `<p>From: ${startDate.toLocaleDateString('en-US', options)}</p>`;
          MonitorTimeEnd.innerHTML = `<p>To: ${endDate.toLocaleDateString('en-US', options)}</p>`;

          //creating circle image with html
          pollMarker.innerHTML = "<span class='dot' style='background-color: " + color + ";'></span>";

          //make Timeselect default to day 
          timelineSelect.value = "day";


          // display this since day is the default
          console.log("This is the full data");
          console.log(fullData);
          console.log("this is the inputed data");
       
          console.log(fullData.filter(dataPoint => dataPoint["Node ID"] == coordinates[i]["Node ID"]));
          makeChart(fullData.filter(dataPoint => dataPoint["Node ID"] == coordinates[i]["Node ID"]));

          // TODO: could simplify this by just passing in the timeline variable
          timelineSelect.addEventListener('change', function() {
            timeLine = timelineSelect.value;
            if (timeLine == "day") {
              makeChart(fullData.filter(dataPoint => dataPoint["Node ID"] == coordinates[i]["Node ID"]));
            } else if (timeLine == "week") {
              getData(coordinates[i]["Node ID"], "week").then(function(weekData) {
                makeChart(weekData);
              });
            } else if (timeLine == "month") {
              getData(coordinates[i]["Node ID"], "month").then(function(monthData) {
                makeChart(monthData);
              });
            } else if (timeLine == "all") {
              getData(coordinates[i]["Node ID"], "all").then(function(allData) {
                makeChart(allData);
              });
      
            }
          });
          

        }
      });
        
    }
    
  });


closeButton.addEventListener('click', function(event) {
  // Hide the sidebar
  sidebar.style.display = 'none';
});


