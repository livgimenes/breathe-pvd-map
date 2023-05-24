

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
// subtract an hour from the time
time  = (currentHour - 2) + ':00:00';



// //Variable later used for filtering
var CurrentDate = date + ' ' + time;


// side bar infos
var sidebar = document.getElementById('sidebar');
var closeButton = document.getElementById('close-button');
var MonitorName = document.getElementById("monitorName");
var MonitorTimeStart = document.getElementById("monitorTime");
var MonitorTimeEnd = document.getElementById("monitorTime2");
var pollValue = document.getElementById("pollValue");
var pollMarker = document.getElementById("pollMarker");
var pollName = document.getElementById("pollName");
var timelineSelect = document.getElementById('Timeline');
var loader = document.getElementById('loader');
var noChart = document.getElementById('noChart');
var chart = document.getElementById('chart');


L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    maxZoom: 18,
    id: 'mapbox/light-v10',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: apiKey
}).addTo(mymap);

// Adding the legend 

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
          <b>CO<sub>2</sub> Levels</b>
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


  const percent = 1 - (co2Value - 400) / 200;


  const color = [
    Math.round(color1[0] + (color2[0] - color1[0]) * percent),
    Math.round(color1[1] + (color2[1] - color1[1]) * percent),
    Math.round(color1[2] + (color2[2] - color1[2]) * percent)
  ];


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

async function makeChart(data,timeRange) {



  const filteredData = await data.filter(d => d.co2_corrected !== -1);
  const datetime = await filteredData.map(d => d.datetime);
  const co2_corrected = await filteredData.map(d => d.co2_corrected);



  // Need to retructure this
  if (co2_corrected.length === 0) {
    pollValue.innerHTML = '<p>Not Available</p>';
    let color = getColor(0);
    pollMarker.innerHTML = "<span class='dot' style='background-color: " + color + ";'></span>";
    //make chart display nothing
    chart.style.display = 'none';
    noChart.innerHTML = '<p> No data available for this time period. </p>';
    return;
  } else{
    chart.style.display = 'block';
    noChart.innerHTML = '';
    let sum = co2_corrected.reduce((a, b) => a + b, 0);
    let avg = sum / co2_corrected.length;
    avg = Math.round(avg * 10) / 10;
    let stringAvg = avg.toString();
    pollValue.innerHTML = '<p>' + stringAvg + ' (ppm) </p>';

    // generate color based the average for that node
    let color = getColor(avg);

    pollMarker.innerHTML = "<span class='dot' style='background-color: " + color + ";'></span>";
  }

  let processedDatetime = datetime;
  let processedCo2 = co2_corrected;
  let xaxisTik = ''


  if(timeRange == 'day') {
    pollName.innerHTML = '<p>CO<sub>2</sub> Daily</p>';
  } else if (timeRange == 'week'){
    pollName.innerHTML = '<p>CO<sub>2</sub> Weekly</p>';
  }
  else if (timeRange == 'month') {
    pollName.innerHTML = '<p>CO<sub>2</sub> Monthly</p>';

  } else if (timeRange == 'all') {
    pollName.innerHTML = '<p>CO<sub>2</sub> All</p>';
  }

  // display the data based on type

  //TODO: this is not working
  if (timeRange == 'day') {
    xaxisTik = '%H:%M';
  } else if (timeRange == 'week' || timeRange == 'month') { 
    xaxisTik = '%m-%d';
  } else if (timeRange == 'all') { 
    xaxisTik = '%Y-%m-%d';
  }


  // scaling fer amounts of data
    if (co2_corrected.length > 120) {
      let chunkSize = 8;
      if (co2_corrected.length> 400){
        chunkSize = 40;
      }
      
      if (co2_corrected.length > 1000) {
        chunkSize = 200;
      }

      const { processedDatetime: pd, processedCO2: pc } = processData(datetime, co2_corrected, chunkSize);
      processedDatetime = pd;
      processedCo2 = pc;
    
    }

  // Create a trace for the CO2 values
  const co2Trace = {
    x: processedDatetime,
    y: processedCo2,
    type: 'scatter',
    mode: 'lines+markers',
    name: 'CO<sub>2</sub>',
    yaxis: 'y',
    line: {
      color: 'darkblue',
      width: 3
    },
    hoverinfo: 'none'
  };

  // make the bound be the largest value of y + 10 and the largest value of y - 10
  yLowBound = Math.min(...processedCo2) - 10;
  yHighBound = Math.max(...processedCo2) + 10;


  // Define the layout with two y-axes
  var layout = {
    showlegend: false,
    yaxis: {
      range: [yLowBound, yHighBound],
      showline: true,
      zeroline: true,
      fixedrange: true,
      title: {
        text: 'CO<sub>2</sub> (ppm)',
        font: {
          size: 10},
      }
    },
    height: 350,
    xaxis: {
      showline: true,
      tickformat: '%d %H:%M',
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


async function getData(node, timeLine) {
  console.log('this is the node id');
  console.log(node);
    const response = await axios.get('/api/data', {
      params: {
        nodeId: node,
        date: timeLine
      }
    });
    console.log("this is the response from the backend");
    console.log(response.data);
    return response.data;
}


fetch("coords.json")
  .then(response => response.json())
  .then(coordinates => {
    let fullData = coordinates;
 
    // get last date that was emitted
    const filteredCoordinates = coordinates.filter(obj => obj.datetime !== -1);
    maxDatetime = filteredCoordinates.reduce((max, obj) => obj.datetime > max ? obj.datetime : max, "");
    console.log("The latest datetime is:", maxDatetime);

    for (let i = 0; i < coordinates.length; i++) {
        const lat = coordinates[i]["Latitude"];
        const lon = coordinates[i]["Longitude"];
        let color = getColor(coordinates[i]["co2_corrected"]);
     

      let circleMarker = L.circleMarker([lat, lon], {
        radius: 8,
        color: 'black',
        weight: 1,
        fillColor: color,
        fillOpacity: 0.8
      });

    

    // For debugging remove later
    if (coordinates[i]["co2_corrected"] != maxDatetime){
      // get the time 
      console.log("this is the time for the node: " + coordinates[i]["Location"] + " " + coordinates[i]["datetime"]);
      console.log(coordinates[i]["co2_corrected"]);
      
    }
      
      // TODO: Revise this part
      if(coordinates[i]["co2_corrected"] == -1) {
        circleMarker.bindPopup("Location: " + coordinates[i]["Location"] + "<br>" + "CO<sub>2</sub> Level: Not Available");
      }else{
        circleMarker.bindPopup("Location: " + coordinates[i]["Location"] + "<br>" + "CO<sub>2</sub> Level: " + coordinates[i]["co2_corrected"] + " (ppm) ");
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

          MonitorTimeStart.innerHTML = `<p>Installed from: ${startDate.toLocaleDateString('en-US', options)}</p>`;
          MonitorTimeEnd.innerHTML = `<p>To: ${endDate.toLocaleDateString('en-US', options)}</p>`;

          //creating circle image with html
          pollMarker.innerHTML = "<span class='dot' style='background-color: " + color + ";'></span>";

          // seeting the text to daily for default
          pollName.innerHTML = '<p>CO<sub>2</sub> Daily</p>';

          //make Timeselect default to day 
          timelineSelect.value = "day";

          loader.style.display = 'none';


          // display this since day is the default
          makeChart(fullData.filter(dataPoint => dataPoint["Node ID"] == coordinates[i]["Node ID"]));

          
          // timelineSelect.addEventListener('change', function() {
          //   timeLine = timelineSelect.value;
          //   if (timeLine == "day") {
          //     makeChart(fullData.filter(dataPoint => dataPoint["Node ID"] == coordinates[i]["Node ID"]), "day");
          //   } else if (timeLine == "week") {

          //     //activate loading
          //     loader.style.display = 'block';
          //     chart.style.display = 'none';
          //     if (coordinates[i]["Node ID"] == -1) {
          //       noChart.innerHTML = ''
          //     }

        
          //     getData(coordinates[i]["Node ID"], "week").then(function(weekData) {
          //       makeChart(weekData, "week");
          //       loader.style.display = 'none';
          //     });
              
          //   } else if (timeLine == "month") {

          //     // // activate loading
          //     loader.style.display = 'block';
          //     chart.style.display = 'none';

          //     getData(coordinates[i]["Node ID"], "month").then(function(monthData) {
          //       makeChart(monthData, "month");
          //       loader.style.display = 'none';
          //     });

          //   } else if (timeLine == "all") {

          //     // activate loading
          //     loader.style.display = 'block';
          //     chart.style.display = 'none';

          //     getData(coordinates[i]["Node ID"], "all").then(function(allData) {
          //       makeChart(allData, "all");
          //       loader.style.display = 'none';
          //     });
        
          //   }
          // });
          

        }
      });
        
    }
    
  });




closeButton.addEventListener('click', function(event) {
  // Hide the sidebar
  sidebar.style.display = 'none';
});


