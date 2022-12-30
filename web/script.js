const apiKey = 'pk.eyJ1IjoiYWxmcmVkMjAxNiIsImEiOiJja2RoMHkyd2wwdnZjMnJ0MTJwbnVmeng5In0.E4QbAFjiWLY8k3AFhDtErA';

const mymap = L.map('map').setView([41.831391, -71.415804], 13);

L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    maxZoom: 18,
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: apiKey
}).addTo(mymap);


//Todo not make this hard coded
fetch('coordinates.json')
  .then(response => response.json())
  .then(coordinates => {
    for (let i = 0; i < coordinates.length; i++) {
      const x = coordinates[i][0];
      const y = coordinates[i][1];
      const marker = L.marker([x, y]).addTo(mymap);
    }
  });


