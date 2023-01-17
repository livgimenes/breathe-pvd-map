const apiKey = 'pk.eyJ1IjoiYWxmcmVkMjAxNiIsImEiOiJja2RoMHkyd2wwdnZjMnJ0MTJwbnVmeng5In0.E4QbAFjiWLY8k3AFhDtErA';

const mymap = L.map('map').setView([41.831391, -71.415804], 13);

//TODO: Make this come with the json
let date = '2022-12-15';
let time = "5 AM"

L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    maxZoom: 18,
    id: 'mapbox/streets-v11',
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
          <div style="display:inline-block; width: 15px; height: 15px; background-color: grey;"></div> Not Available
          <br>
          <div style="display:inline-block; width: 15px; height: 15px; background-color: green;"></div> < 400 ppm
          <br>
          <div style="display:inline-block; width: 15px; height: 15px; background-color: gold;"></div> 400-500 ppm 
          <br>
          <div style="display:inline-block; width: 15px; height: 15px; background-color: darkorange;"></div> 500-650 ppm
          <br>
          <div style="display:inline-block; width: 15px; height: 15px; background-color: red;"></div> > 650 ppm
      </div>
  `;
      return div;
  }
}

const legendControl = new LegendControl();

// Add the custom control to the map
mymap.addControl(legendControl);


fetch("./coords.json")
  .then(response => response.json())
  .then(coordinates => {
    for (let i = 0; i < coordinates.length; i++) {
        const lat = coordinates[i]["Latitude"];
        const lon = coordinates[i]["Longitude"];
        let color = "";
        if (coordinates[i]["co2_corrected"] <= 400 && coordinates[i]["co2_corrected"] > 0) {
            color = 'green';
        } else if (coordinates[i]["co2_corrected"] <= 500 && coordinates[i]["co2_corrected"] > 400) {
            color = 'gold';
        } else if (coordinates[i]["co2_corrected"] <= 650 && coordinates[i]["co2_corrected"] > 500) {
            color = 'darkorange';
        } else if (coordinates[i]["co2_corrected"] > 650){
            color = 'red';
        }else{
          color = 'grey';
        }

      let circleMarker = L.circleMarker([lat, lon], {
        radius: 8,
        color: 'white',
        weight: 1,
        fillColor: color,
        fillOpacity: 0.8
    });
      
      if(coordinates[i]["co2_corrected"] == -999.000000){
        circleMarker.bindPopup("Location: " + coordinates[i]["Location"] + "<br>" + "CO2 Level: Not Available");
      }else{
        circleMarker.bindPopup("Location: " + coordinates[i]["Location"] + "<br>" + "CO2 Level: " + coordinates[i]["co2_corrected"] + " (ppm)");
      }
      circleMarker.addTo(mymap);
        
    }
  });

