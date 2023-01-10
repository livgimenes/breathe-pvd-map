const apiKey = 'pk.eyJ1IjoiYWxmcmVkMjAxNiIsImEiOiJja2RoMHkyd2wwdnZjMnJ0MTJwbnVmeng5In0.E4QbAFjiWLY8k3AFhDtErA';

const mymap = L.map('map').setView([41.831391, -71.415804], 13);

L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    maxZoom: 18,
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: apiKey
}).addTo(mymap);


//bins are: green  x < 400, yellow 400 - 550, orange 550-650, red x > 650



//Todo not make this hard coded
fetch("./coords.json")
  .then(response => response.json())
  .then(coordinates => {
    for (let i = 0; i < coordinates.length; i++) {
        const lat = coordinates[i]["Latitude"];
        const lon = coordinates[i]["Longitude"];
        let color = "";
        if (coordinates[i]["co2_corrected"] <= 400) {
            color = 'green';
        } else if (coordinates[i]["co2_corrected"] <= 500 && coordinates[i]["co2_corrected"] > 400) {
            color = 'gold';
        } else if (coordinates[i]["co2_corrected"] <= 650 && coordinates[i]["co2_corrected"] > 500) {
            color = 'orange';
        } else {
            color = 'red';
        }

        //Add a pop up for the name 
        var marker  = L.marker([lat, lon], {icon: new L.Icon({
          iconUrl: `https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
          iconSize: [20, 28] 
          })})
        
        marker.bindPopup("Location: " + coordinates[i]["Location"] + "<br>" + "CO2 Level: " + coordinates[i]["co2_corrected"]);
        marker.addTo(mymap);
        
    }
  });

