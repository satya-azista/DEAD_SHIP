
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import {
  DragAndDrop,
  defaults as defaultInteractions,
} from 'ol/interaction.js';
import ImageLayer from 'ol/layer/Image';
import { GPX, GeoJSON, IGC, KML, TopoJSON } from 'ol/format.js';
import { ImageStatic, OSM, Vector as VectorSource } from 'ol/source.js';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer.js';
import Static from 'ol/source/ImageStatic.js';
import JSZip from 'jszip';

const fileInput = document.getElementById('fileInput');
const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
  ],
  view: new View({
    center: [0, 0],
    zoom: 2,
  }),
});
fileInput.addEventListener('change', function (event) {
  const files = event.target.files;
  console.log(files);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(file);
    const reader = new FileReader();
    reader.onload = function (event) {
      const buffer = event.target.result;
      JSZip.loadAsync(buffer).then(function (zip) {
        zip.file(/\.kml$/i)[0].async('text').then(function (kmlData) {
          parseKML(kmlData);
        });
      });
    };
    reader.readAsArrayBuffer(file);
  }
});
function fetchDataFromPython() {
  fetch('/get_data')  // Make a GET request to the Flask server
      .then(response => response.json())  // Parse the JSON response
      .then(data => {
          console.log(data);  // Log the data returned from Python
          // Use the data in your JavaScript code as needed
      })
      .catch(error => console.error('Error fetching data:', error));
}

// Call the function to fetch data from Python
fetchDataFromPython();
