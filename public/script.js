const apiKey = 'pk.eyJ1IjoiYWxmcmVkMjAxNiIsImEiOiJja2RoMHkyd2wwdnZjMnJ0MTJwbnVmeng5In0.E4QbAFjiWLY8k3AFhDtErA';

const mymap = L.map('map').setView([41.831391, -71.415804], 13);

//Change it so that it gets the datetime and that is the one displayed

const date_obj = new Date();
const currentYear = date_obj.getFullYear().toString();
const currentMonth = (date_obj.getMonth() + 1).toString().padStart(2, '0');
const currentDate = date_obj.getDate().toString().padStart(2, '0');
const currentHour = date_obj.getHours().toString().padStart(2, '0');


const date = currentYear + '-' + currentMonth + '-' + currentDate;
const time = currentHour + ':00:00';



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
      div.style.right = "6px";
      div.style.top = "6px";
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

fetch("./coords.json")
  .then(response => response.json())
  .then(coordinates => {
    for (let i = 0; i < coordinates.length; i++) {
        const lat = coordinates[i]["Latitude"];
        const lon = coordinates[i]["Longitude"];
        let color = getColor(coordinates[i]["co2_corrected"])

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
        circleMarker.bindPopup("Location: " + coordinates[i]["Location"] + "<br>" + "CO2 Level: " + coordinates[i]["co2_corrected"] + " (ppm)");
      }
      circleMarker.addTo(mymap);
        
    }
  });

