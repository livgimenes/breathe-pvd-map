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
          <div style="display:inline-block; width: 20px; height: 120px; background: linear-gradient(to bottom, #001F66, #0036B1, #004EFF,#3371FF, #6694FF, #99B8FF, #DBE6FF, #E5EDFF);"></div>
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
function getColor(value) {
  if (value >= 400 && value < 425) {
    return "#E5EDFF";
  } else if (value >= 425 && value < 450){
    return "#DBE6FF";
  }else if (value >= 450 && value < 475) {
    return "#99B8FF";
  } else if (value >= 475 && value < 500) {
    return "#6694FF";
  } else if (value >= 500 && value < 525) {
    return "#3371FF";
  } else if (value >= 525 && value < 550) {
    return "#004EFF";
  } else if (value >= 550 && value < 575) {
    return "#0036B1";
  } else if (value >= 575 && value <= 600) {
    return "#001F66";
  } else {
    return "#808080";
  }
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

