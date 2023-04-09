const apiKey = 'pk.eyJ1IjoiYWxmcmVkMjAxNiIsImEiOiJja2RoMHkyd2wwdnZjMnJ0MTJwbnVmeng5In0.E4QbAFjiWLY8k3AFhDtErA';

const mymap = L.map('map').setView([41.831391, -71.415804], 13);


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

// maybe fetch the info about the data so I can add it to the map


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

// Define a function to calculate the color based on the value
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



function makeChart(data) {

  // Extract the datetime, co2_corrected, and temp values from the data array
  const datetime = data.map(d => d.datetime);
  const co2_corrected = data.map(d => d.co2_corrected);
  // Create a trace for the CO2 values
  const co2Trace = {
    x: datetime,
    y: co2_corrected,
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
    },
    height: 350,
    xaxis: {
      showline: true,
      tickformat: '%H:%M:%S'
    },
    margin: {
      t: 5,
      l: 55, 
      r: 50, 
    },

};

  // Combine the traces and layout and plot the chart
  const datas = [co2Trace];
  Plotly.newPlot('chart', datas,layout,{staticPlot: true});


}


function getData(nodeData,timeLine) {

    // for the certain period extract the dates that would make it a week, day, month, year



    // call back the python script that would get that data for that period of time 

    // get that data, send it back 




  // given a node, we want to go and request the data from that node and then plot it on the map

  const data = [
    {"datetime":"2023-03-16 10:00:00","co2_corrected":500.0,"temp":11.2841673333,"Sensor ID":"Bs192202","Node ID":272,"Location":"Rock Spot","Latitude":41.81509,"Longitude":-71.42216},
    {"datetime":"2023-03-16 09:00:00","co2_corrected":550.0,"temp":6.432641,"Sensor ID":"Bs192202","Node ID":272,"Location":"Rock Spot","Latitude":41.81509,"Longitude":-71.42216},
    {"datetime":"2023-03-16 08:00:00","co2_corrected":484.0,"temp":3.3512651667,"Sensor ID":"Bs192202","Node ID":272,"Location":"Rock Spot","Latitude":41.81509,"Longitude":-71.42216},
    {"datetime":"2023-03-16 07:00:00","co2_corrected":481.0,"temp":2.7500756667,"Sensor ID":"Bs192202","Node ID":272,"Location":"Rock Spot","Latitude":41.81509,"Longitude":-71.42216},
    {"datetime":"2023-03-16 06:00:00","co2_corrected":480.0,"temp":2.7136075,"Sensor ID":"Bs192202","Node ID":272,"Location":"Rock Spot","Latitude":41.81509,"Longitude":-71.42216},
    {"datetime":"2023-03-16 05:00:00","co2_corrected":400.0,"temp":2.9801903333,"Sensor ID":"Bs192202","Node ID":272,"Location":"Rock Spot","Latitude":41.81509,"Longitude":-71.42216},
    {"datetime":"2023-03-16 04:00:00","co2_corrected":479.0,"temp":3.029575,"Sensor ID":"Bs192202","Node ID":272,"Location":"Rock Spot","Latitude":41.81509,"Longitude":-71.42216}
  ];
  
  return data;
}

// fake data 



// side bar infos
var sidebar = document.getElementById('sidebar');
var closeButton = document.getElementById('close-button');
var MonitorName = document.getElementById("monitorName");
var MonitorTimeStart = document.getElementById("monitorTime");
var MonitorTimeEnd = document.getElementById("monitorTime2");
var pollValue = document.getElementById("pollValue");
var pollMarker = document.getElementById("pollMarker");
var timelineSelect = document.getElementById('Timeline');

fetch("coords.json")
  .then(response => response.json())
  .then(coordinates => {
    for (let i = 0; i < coordinates.length; i++) {
        const lat = coordinates[i]["Latitude"];
        const lon = coordinates[i]["Longitude"];
        let color = getColor(coordinates[i]["co2_corrected"]);


      console.log(coordinates[i]["datetime"])
      console.log(CurrentDate)
      const date = coordinates[i]["datetime"];
     

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

          
          MonitorTimeStart.innerHTML = '<p> From: September 7, 2022 </p>';
          MonitorTimeEnd.innerHTML = '<p> From: March 21, 2023 </p>';

          //add monitor data
          pollValue.innerHTML = '<p>' + coordinates[i]["co2_corrected"] + ' (ppm) </p>';

          //creating circle image with html

          pollMarker.innerHTML = "<span class='dot' style='background-color: " + color + ";'></span>";


          //add a listener on the select element, that will change the timeline depending on it 
          const timeLine = " "

          timelineSelect.addEventListener('change', function() {
            timeLine = timelineSelect.value;
          });
  

          makeChart(getData(coordinates[i]["Node ID"],timeLine));
          console.log("this is working");
        }
      });
        
    }
    
  });


closeButton.addEventListener('click', function(event) {
  // Hide the sidebar
  sidebar.style.display = 'none';
});


