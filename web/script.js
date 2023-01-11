const apiKey = 'pk.eyJ1IjoiYWxmcmVkMjAxNiIsImEiOiJja2RoMHkyd2wwdnZjMnJ0MTJwbnVmeng5In0.E4QbAFjiWLY8k3AFhDtErA';

const mymap = L.map('map').setView([41.831391, -71.415804], 13);

L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    maxZoom: 18,
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: apiKey
}).addTo(mymap);


//Add a legend + show case somewhere the date and also add the measurement


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

        //Add a pop up for the name 
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

