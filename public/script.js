import { getColor, processData,getInfoHelper, organizeDataByNodeId, updatePollutant} from './utils/helpers.js';


const apiKey = 'pk.eyJ1IjoiYWxmcmVkMjAxNiIsImEiOiJja2RoMHkyd2wwdnZjMnJ0MTJwbnVmeng5In0.E4QbAFjiWLY8k3AFhDtErA';

const mymap = L.map('map').setView([41.831392, -71.417804], 12.5);


// Constants
const date_obj = new Date();
date_obj.setHours(date_obj.getHours() - 2);

const currentYear = date_obj.getFullYear().toString();
const currentMonth = (date_obj.getMonth() + 1).toString().padStart(2, '0');
const currentDate = date_obj.getDate().toString().padStart(2, '0');
const currentHour = date_obj.getHours().toString().padStart(2, '0');




var date = currentYear + '-' + currentMonth + '-' + currentDate;
var time = currentHour + ':00:00';
time  = currentHour + ':00:00';
if (currentHour.length === 1) {
  currentHour = '0' + currentHour;
}



// //Variable later used for filtering
var CurrentDate = date + ' ' + time;


// Buttons 
var sidebar = document.getElementById('sidebar');
var closeButton = document.getElementById('close-button');
var MonitorName = document.getElementById("monitorName");
var MonitorTimeStart = document.getElementById("monitorTime");
var MonitorTimeEnd = document.getElementById("monitorTime2");
var pollValue = document.getElementById("pollValue");
var pollMarker = document.getElementById("pollMarker");
var pollName = document.getElementById("pollName");
var timelineSelect = document.getElementById('timeline-select');
var loader = document.getElementById('loader');
var noChart = document.getElementById('noChart');
var chart = document.getElementById('chart');
var NetworkName = document.getElementById('NetworkName');
var ChartTitle = document.getElementById("LevelTitle");
var centralLoader = document.getElementById('central-loader');


L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    maxZoom: 18,
    id: 'mapbox/light-v10',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: apiKey
}).addTo(mymap);





async function makeChart(data,timeRange,pollutant) {

  //variable for functions
  let filteredData, datetime, pollutant_corrected,roundPollutantBy;
  
  // variablesfor styling and chart
  let textTitle, textTitleMeasure, chartColor,adjustRange,measurement;


  // setting variables based on pollutant
  if (pollutant == 'co2') {
    filteredData = await data.filter(d => d.co2_corrected !== -1);
    datetime = await filteredData.map(d => d.datetime);
    pollutant_corrected = await filteredData.map(d => d.co2_corrected);
    measurement = ' (ppm) </p>';
    roundPollutantBy = 0;

    textTitle = 'CO<sub>2</sub>';
    textTitleMeasure = 'CO<sub>2</sub> (ppm)';
    chartColor = 'DarkBlue';
    adjustRange = 10;


  }else if (pollutant == 'co') {
    filteredData = await data.filter(d => d.co_wrk_aux !== -1);
    datetime = await filteredData.map(d => d.datetime);
    pollutant_corrected = await filteredData.map(d => d.co_wrk_aux);

    measurement = ' (V) </p>';
    roundPollutantBy = 3;
    textTitle = 'CO';
    textTitleMeasure = 'CO (V)';
    chartColor = 'DarkGreen';
    adjustRange = 0.01;
    

  }


  // Accounting for null data + styling
  if (pollutant_corrected.length === 0) {
    pollValue.innerHTML = '<p>Not Available</p>';
    let color = getColor(0,pollutant);
    pollMarker.innerHTML = "<span class='dot' style='background-color: " + color + ";'></span>";
    //make chart display nothing
    chart.style.display = 'none';
    noChart.innerHTML = '<p> No data available for this time period. </p>';
    return;
  } else{
    chart.style.display = 'block';
    noChart.innerHTML = '';
    let sum = pollutant_corrected.reduce((a, b) => a + b, 0);
    let avg = sum / pollutant_corrected.length;
    avg = (avg * 10) / 10;
    avg = avg.toFixed(roundPollutantBy);
    let stringAvg = avg.toString();
    pollValue.innerHTML = '<p>' + stringAvg + measurement;

    // generate color based the average for that node
    let color = getColor(avg,pollutant);

    pollMarker.innerHTML = "<span class='dot' style='background-color: " + color + ";'></span>";
  }

  let processedDatetime = datetime;
  let processedPollutant = pollutant_corrected;
  let xaxisTik = ''


  
  if (timeRange == 'day') {
    pollName.innerHTML = `<p>${textTitle} Daily</p>`;
  } else if (timeRange == 'week') {
    pollName.innerHTML = `<p>${textTitle} Weekly</p>`;
  } else if (timeRange == 'month') {
    pollName.innerHTML = `<p>${textTitle} Monthly</p>`;
  } else if (timeRange == 'all') {
    pollName.innerHTML = `<p>${textTitle} All</p>`;
  }


  //Styling the chart display
  if (timeRange == 'day') {
    xaxisTik = '%m/%d %H:%M';
  } else if (timeRange == 'week' || timeRange == 'month') { 
    xaxisTik = '%m-%d';
  } else if (timeRange == 'all') { 
    xaxisTik = '%Y-%m-%d';
  }

// condensing datapoints
if (pollutant_corrected.length > 120) {
      let chunkSize = 8;
      if (pollutant_corrected.length> 400){
        chunkSize = 40;
      }
      
      if (pollutant_corrected.length > 1000) {
        chunkSize = 200;
      }

      const { processedDatetime: pd, processedPollutant: pc } = processData(datetime,pollutant_corrected, chunkSize);
      processedDatetime = pd;
      processedPollutant = pc;
    
    }



  // Create a trace for the Pollutant values
  const pollutantTrace = {
    x: processedDatetime,
    y: processedPollutant,
    type: 'scatter',
    mode: 'lines+markers',
    name: textTitleMeasure,
    yaxis: 'y',
    line: {
      color: chartColor,
      width: 3
    },
    hoverinfo: 'none'
  };

  // creating bounds and ranges for the axis 
  yLowBound = Math.min(...processedPollutant) - adjustRange;
  yHighBound = Math.max(...processedPollutant) + adjustRange;


  // Define the layout with two y-axes
  var layout = {
    showlegend: false,
    yaxis: {
      range: [yLowBound, yHighBound],
      showline: true,
      zeroline: true,
      fixedrange: true,
      title: {
        text: textTitleMeasure,
        font: {
          size: 10},
      },
      tickfont:{
        size: 10,

      }
    },
    height: 350,
    xaxis: {
      showline: true,
      tickformat: xaxisTik,
      tickfont: {
        size: 9,      
      }
    },
    
    margin: {
      t: 5,
      l: 55, 
      r: 50, 
    },

  };

  // Combine the traces and layout and plot the chart
  const datas = [pollutantTrace];
  Plotly.newPlot('chart', datas, layout, {staticPlot: true});

}


//Defining the standard pollutant
let selectedPollutant = 'co2';


async function getTimeSeriesData(node, timeLine, pollutant) {
    const response = await axios.get('/timeseries', {
      params: {
        nodeId: node,
        date: timeLine,
        pollutant: pollutant
      }
    });
    return response.data;
}


async function updateMainData(pollutant) {
  //maybe add a trigger for new data here
  const response = await axios.get('/main_data', {
    params: {
      pollutant_type: pollutant
    }
  });
  return response.data;

}


// Global variables for pollutants
let co2Array = [];
let coArray = [];
let complimentaryPollutant = "";




class LegendControl extends L.Control {
  // Define the onAdd method
  onAdd() {
      const div = L.DomUtil.create('div', 'legend');
      div.style.backgroundColor = "white";
      div.style.padding = "6px";
      div.style.borderRadius = "6px";
      div.style.width = "141.28px";
      div.style.height = "317.29px";
      div.style.position = "absolute";
      div.style.right = "610px";
      div.style.top = "450px";
      div.style.fontSize = "14px";
      div.innerHTML =  `
      <div>
        <b>Legend</b>
        <br>
        Date: ${date}
        <br>
        Time: ${time}
        <br>
        <b>Pollutants:</b>
        <ul style="list-style: none; margin: 0; padding: 0"">
          <li>
            <input type="radio" id="co-option" name="selector" onchange="updatePollutant(this.parentElement.parentElement.parentElement)">
            <label for="f-option">CO</label>
          </li>
          <li>
            <input type="radio" id="co2-option" name="selector" checked="checked" onchange="updatePollutant(this.parentElement.parentElement.parentElement)">
            <label for="s-option">CO<sub>2</sub></label>
          </li>
        </ul>
          <div id="concentration-tag"><b>Concentration (ppm):</b> </div>
          <br>
          <div style="display: inline-block; vertical-align: top; margin-top: -20px;">
          <div id="max-value" style="height: 20px;">600 ppm </div>
          <div id="gradient-div" style="display:inline-block; width: 20px; height: 120px; background: linear-gradient(to bottom, rgb(0, 31, 102), rgb(39, 74, 146), rgb(77, 117, 190), rgb(115, 160, 234), rgb(153, 187, 244), rgb(191, 213, 253), rgb(214, 226, 255), rgb(229, 237, 255));;"></div>
          <br>
          <div id="min-value" style="height: 20px;">350 ppm </div>
          </div>
          </div>
      </div>`;

    


      return div;
  }
}

const legendControl = new LegendControl();

// Add the custom control to the map
mymap.addControl(legendControl);




//GLOBAL VARIABLES
var markerArray = [];


//plot markers helper
function plotMarkers(coordinates, pollutant) {


  // marker array not empty then loop throuh and remove all of the markers
  if (markerArray.length > 0) {
    for (let i = 0; i < markerArray.length; i++) {
      mymap.removeLayer(markerArray[i].marker);
    }
  }

  //setting names
  let pollutantName, measurement,measurementName,roundPollutantBy;

  if (pollutant == "co2") {
    pollutantName = "co2_corrected";
    measurement = " (ppm)";
    measurementName = "CO<sub>2</sub>";
    roundPollutantBy = 0;

  } else if (pollutant == "co") {
    pollutantName = "co_wrk_aux";
    measurement = " (V)";
    measurementName = "CO";
    roundPollutantBy = 3;
  }


  for (let i = 0; i < coordinates.length; i++) {
    const lat = coordinates[i]["Latitude"];
    const lon = coordinates[i]["Longitude"];
    let color = getColor(coordinates[i][pollutantName], pollutant);


  let circleMarker = L.circleMarker([lat, lon], {
    radius: 8,
    color: 'black',
    weight: 1,
    fillColor: color,
    fillOpacity: 0.8
    });

  

  // if the marker is not  already in the array, add it
  if (!markerArray.includes(circleMarker)){
    markerArray.push({ marker: circleMarker, nodeId:coordinates[i]["Node ID"] });
  }

  
  let roundedPollutant = coordinates[i][pollutantName].toFixed(roundPollutantBy);


  // TODO: Revise this part
  if(coordinates[i][pollutantName] == -1) {
    //TODO: Change this include other things about the pollutant
    circleMarker.bindPopup("Location: " + coordinates[i]["Location"] + "<br>" + measurementName + " Level: Not Available");
  }else{
    circleMarker.bindPopup("Location: " + coordinates[i]["Location"] + "<br>" + measurementName + " Level: " + roundedPollutant + measurement);
  }
  circleMarker.addTo(mymap);

}

centralLoader.style.display = 'none';


return markerArray;


}

async function DisplayTimeseries(event, nodeId,coordinates, pollutant) {
    timeLine = timelineSelect.value;
    if (timeLine == "day") {
      makeChart(coordinates.filter(dataPoint => dataPoint["Node ID"] == nodeId), "day", pollutant);
    } else if (timeLine == "week") {

      //activate loading
      loader.style.display = 'block';
      chart.style.display = 'none';

      //TODO: Rething this part
      if (nodeId == -1) {
        noChart.innerHTML = ''
      }

      getTimeSeriesData(nodeId, "week",pollutant).then(function(weekData) {
        makeChart(weekData, "week", pollutant);
        loader.style.display = 'none';
      });

    } else if (timeLine == "month") {

      // // activate loading
      loader.style.display = 'block';
      chart.style.display = 'none';

      getTimeSeriesData(nodeId, "month",pollutant).then(function(monthData) {
        makeChart(monthData, "month", pollutant);
        loader.style.display = 'none';
      });

    } else if (timeLine == "all") {

      // activate loading
      loader.style.display = 'block';
      chart.style.display = 'none';

      getTimeSeriesData(nodeId, "all",pollutant).then(function(allData) {
        makeChart(allData, "all", pollutant);
        loader.style.display = 'none';
      });

    }

  }
 




async function DisplaySidebar(event, nodeId,coordinates, pollutant) {

  // extracting general information about the node
  const generalNodeInfo = await getInfoHelper();
  const generalByNodeId = organizeDataByNodeId(generalNodeInfo);

  // getting information for a specific pollutant
  let pollutantNameHTML, pollutantNameJSON;
  if (pollutant == 'co2') {
    pollutantNameHTML = '<p>CO<sub>2</sub> Daily</p>';
    pollutantNameJSON = 'co2_corrected';
  } else if (pollutant == 'co') {
    pollutantNameHTML = '<p>CO Daily</p>';
    pollutantNameJSON = 'co_wrk_aux';
  }

  // event listener reference
  const timelineSelectHandler = (event) => DisplayTimeseries(event, nodeId, coordinates, pollutant);



    if (sidebar) {
      // make it visable 
      sidebar.style.display = 'block';

      // add the names
      MonitorName.innerHTML = '<p>' + generalByNodeId[nodeId]["Location"] + '</p>';

      const installationDate = generalByNodeId[nodeId]["Installation Date"]; 
      const startDate = new Date(installationDate);
      const endDate = new Date();

      const options = { year: 'numeric', month: 'long', day: 'numeric' };

      MonitorTimeStart.innerHTML = `<p>Installed from: ${startDate.toLocaleDateString('en-US', options)}</p>`;
      MonitorTimeEnd.innerHTML = `<p>To: ${endDate.toLocaleDateString('en-US', options)}</p>`;

      pollName.innerHTML = pollutantNameHTML;

      //make Timeselect default to day 
      timelineSelect.value = "day";

      loader.style.display = 'none';


      // display this since day is the default
      makeChart(coordinates.filter(dataPoint => dataPoint["Node ID"] == generalByNodeId[nodeId]["Node ID"]), "day", selectedPollutant);
    

      // add the event listener for the timeseries
      timelineSelect.addEventListener('change',timelineSelectHandler);

    }
  
    closeButton.addEventListener('click', function(event) {
      // Hide the sidebar
      sidebar.style.display = 'none';
      // remove the event listener
      timelineSelect.removeEventListener('change', timelineSelectHandler);
    });
    
    

}




//make the pollutant be passed in 
async function makeMap(coordinates,pollutant) { 


  var markerArray = plotMarkers(coordinates, pollutant);

 
  // get last date that was emitted
  const filteredCoordinates = coordinates.filter(obj => obj.datetime !== -1);
 


  for (const item of markerArray) {
    const circleMarker = item.marker;
    const nodeId = item.nodeId;
    circleMarker.on('click', (event) => DisplaySidebar(event,nodeId, coordinates, pollutant));
  }
  
  
}


//make a function that deals with initializing the map 
async function initMap(){

  centralLoader.style.display = 'block';

  // ask for the pollutant data and make co2 the default
  co2Array = await updateMainData(selectedPollutant);
  
  // call the map function and make the map
  makeMap(co2Array, selectedPollutant);

  if (selectedPollutant == 'co2') {
    complimentaryPollutant = 'co';
  } else if (selectedPollutant == 'co') {
    complimentaryPollutant = 'co2';
  }

}


initMap().then( async function() {
  console.log("Processing fetch of data for CO  ...");
  coArray = await updateMainData(complimentaryPollutant);
  console.log("Data fetch complete!");
});

// asynchronous fetching for after call 
async function updateMap(pollutant) {
  if (pollutant == "co") {
    coArray = await updateMainData("co");
    makeMap(coArray, pollutant).then(function() {
      co2Array = updateMainData("co2");
    });
  } else if (pollutant == "co2"){
    co2Array = await updateMainData("co2");
    makeMap(co2Array, pollutant).then(function() {
      coArray = updateMainData("co");
    });
  }

}



// Function to calculate the time until the next straight hour
function timeUntilNextHour() {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0); 
  const nextTime = nextHour.getTime() - now.getTime()
  console.log("Time until the next hour:", nextTime, "milliseconds");
  return nextTime;
}


function scheduleDataUpdate() {
  const delay = 10000; 
  const timeUntilNext = timeUntilNextHour();
  
  console.log("Scheduling update in", timeUntilNext + delay, "milliseconds");
  

  //TODO come back to this
  setTimeout(() => {
    updateMap(selectedPollutant);
    setInterval(processData, 3600000); // Schedule subsequent updates every hour
    console.log("Update successful!");
  }, timeUntilNext + delay);
}


// Call the initial scheduling function
scheduleDataUpdate();








