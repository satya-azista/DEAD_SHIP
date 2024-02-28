
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import ImageLayer from 'ol/layer/Image';
import { GeoJSON, KML } from 'ol/format.js';
import { ImageStatic, OSM, Vector as VectorSource } from 'ol/source.js';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer.js';
import JSZip from 'jszip';
import MousePosition from 'ol/control/MousePosition.js';
import { Style, Fill, Stroke, Circle } from 'ol/style';
const zip = new JSZip();

let main_kml = undefined
let main_csv = undefined
let verify_ais_csv=undefined
function getKMLData(buffer) {
    let kmlData;
    zip.load(buffer);
    const kmlFile = zip.file(/\.kml$/i)[0];
    if (kmlFile) {
        kmlData = kmlFile.asText();
    }
    return kmlData;
}

function getKMLImage(href) {
    const index = window.location.href.lastIndexOf('/');
    if (index !== -1) {
        const kmlFile = zip.file(href.slice(index + 1));
        if (kmlFile) {

            return URL.createObjectURL(new Blob([kmlFile.asArrayBuffer()]));

        }
    }
    return href;
}

class KMZ extends KML {
    constructor(opt_options) {
        const options = opt_options || {};
        options.iconUrlFunction = getKMLImage;
        super(options);
    }

    getType() {
        return 'arraybuffer';
    }

    readFeature(source, options) {
        const kmlData = getKMLData(source);
        return super.readFeature(kmlData, options);
    }

    readFeatures(source, options) {
        const kmlData = getKMLData(source);
        parseKML(kmlData);
        return super.readFeatures(kmlData, options);
    }
}


const mousePositionControl = new MousePosition({
    projection: 'EPSG:4326',
    className: 'custom-mouse-position',
    target: document.getElementById('mouse-position'),
})


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
const csv_Input = document.getElementById('csv_Input');
csv_Input.addEventListener('change', function (event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function (event) {
        const csv = event.target.result;
        const parsedData = parseCSV(csv);
        const table = createTable(parsedData);
        const tableContainer = document.getElementById('table-container');
        tableContainer.innerHTML = ''; // Clear previous table
        tableContainer.appendChild(table);
    };
    reader.readAsText(file);
    sendDataToServer(file)
 
})
fileInput.addEventListener('change', function (event) {
    const files = event.target.files;
    sendForImages(files[0])
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
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
function parseKML(kmlData) {
    sendXmlDataToServer(kmlData)
    main_kml = kmlData
    try {
        const parser = new DOMParser();
        const kmlDoc = parser.parseFromString(kmlData, 'text/xml');
        const groundOverlays = kmlDoc.querySelectorAll('GroundOverlay');

        groundOverlays.forEach(groundOverlay => {
            const imageUrl = groundOverlay.querySelector('Icon href').textContent;
            const latLonBox = groundOverlay.querySelector('LatLonBox');
            const north = parseFloat(latLonBox.querySelector('north').textContent);
            const south = parseFloat(latLonBox.querySelector('south').textContent);
            const east = parseFloat(latLonBox.querySelector('east').textContent);
            const west = parseFloat(latLonBox.querySelector('west').textContent);

            addImageOverlayFromHref(imageUrl, west, south, east, north);
        });
        const vectorSource = new VectorSource({
            features: new KML().readFeatures(kmlData, {
                dataProjection: 'EPSG:4326',  // Projection of the KML data
                featureProjection: 'EPSG:3857'  // Projection for the features
            })
        });
        const vectorLayer = new VectorLayer({
            source: vectorSource
        });
        map.addLayer(vectorLayer);
    } catch (error) {
        console.error('Error parsing KML and adding image overlay:', error);
    }
}
function addImageOverlayFromHref(href, west, south, east, north) {
    const url = "./";
    const newPath = url + href;
    const newPathUrl = newPath.replace(/\s/g, "");
    const imageOverlay = new ImageLayer({
        source: new ImageStatic({
            url: newPathUrl,
            projection: 'EPSG:4326',
            imageExtent: [west, south, east, north]
        })
    });
    map.addLayer(imageOverlay);
}
const sendXmlDataToServer = (file1) => {
    const endpointUrl = 'http://127.0.0.1:5000/process_xml';
    fetch(endpointUrl, {
        method: 'POST',
        body: file1,
        headers: {
            'Content-Type': 'application/xml'
        }
    })
        .then(response => {
            if (response.ok) {
                return response.text(); // Assuming server responds with JSON
            }
            throw new Error('Failed to send KML data to server');
        })
        .then(data => {
            // console.log('Response from server:', data);
        })
        .catch(error => {
            console.error('Error:', error);
        });
};
function sendDataToServer(main_csv) {
    const formData = new FormData();
    var post_data = {}
    formData.append('csvData', main_csv);
    formData.forEach(function (value, key) {
        post_data[key] = value;
    });
    const headers = new Headers();
    headers.append('Content-Type', 'text/csv'); // for CSV
    fetch('http://127.0.0.1:5000/process_csv', {
        method: 'POST',
        body: main_csv,
        headers: headers
    })
        .then(response => {
            if (response.ok) {
                return response.json(); // Assuming server responds with JSON
            }
            throw new Error('Failed to send data to server');
        })
        .then(data => {
            const { ais_point, point, line, buffer, ship_point,verify_ais} = data;
            // Call functions to handle each JSON object as needed
            overlayJson(buffer, 'skyblue');
            overlayJson(ais_point, 'blue'); //Blue
            overlayJson(ship_point, 'red') //Red
            overlayJson(point, 'green');  //Green
            verify_ais_csv=verify_ais
        })
        .catch(error => {
            console.error('Error:', error);
        });
}
function overlayJson(featureData, color) {
    const vectorSourceJson = new VectorSource({
        features: new GeoJSON().readFeatures(featureData, {
            featureProjection: 'EPSG:3857' // Assuming your map is in EPSG:3857
        })
    });
    const vectorLayer = new VectorLayer({
        source: vectorSourceJson,

        style: new Style({
            fill: new Fill({
                color: color // Set color dynamically
            }),
            stroke: new Stroke({
                color: '#319FD3',
                width: 1
            }),
            image: new Circle({
                radius: 5,
                fill: new Fill({
                    color: color // Set color dynamically
                }),
                stroke: new Stroke({
                    color: '#319FD3',
                    width: 1
                })
            })
        })
    });
    map.addLayer(vectorLayer);
    console.log("added successfully");
}
function sendForImages(file) {

    fetch('http://127.0.0.1:5000/images', {
        method: 'POST',
        body: file,
    })
        .then(response => {
            if (response.ok) {
                return response; // Assuming server responds with JSON
            }
            throw new Error('Failed to send data to server');
        })
        .then(data => {
            console.log('Response from server:', data[0]);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}
const infoElement = document.getElementById('aisInfo');

map.on('click', function (evt) {
    const pixel = map.getEventPixel(evt.originalEvent);
    const feature = map.forEachFeatureAtPixel(pixel, function (feature) {
        return feature;
    });
    if (feature) {
        const properties = feature.getProperties();
        let info = '<table>';
        Object.keys(properties).forEach(key => {
            info += `<tr><td>${key}</td><td>${properties[key]}</td></tr>`;
        });
        info += '</table>';
        infoElement.innerHTML = info;
    } else {
        infoElement.innerHTML = '';
    }
});


function parseCSV(csv) {
    const lines = csv.split('\n');
    const data = [];
    let headers = [];
    let headerFound = false;
 
    for (let i = 0; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (!headerFound) {
            // Find the header row
            headers = values.map(value => value.trim());
            headerFound = true;
        } else if (values.length === headers.length) {
            // Process data rows
            const obj = {};
            for (let j = 0; j < headers.length; j++) {
 
                obj[headers[j]] = values[j];
 
            }
            data.push(obj);
        }
    }
    return data;
}
// Function to create HTML table
function createTable(data) {
    const table = document.createElement('table');

    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const key in data[0]) {
        const th = document.createElement('th');
        th.textContent = key;
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');
    data.forEach(rowData => {
        const row = document.createElement('tr');
        for (const key in rowData) {
            const cell = document.createElement('td');
            cell.textContent = rowData[key];
            row.appendChild(cell);
        }
        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    return table;
}


function csvToTable(csvData) 
{
    var tableContainer = document.getElementById('popup_content');

    var lines = csvData.trim().split('\n'); // Trim to remove leading/trailing whitespace
    var tableHTML = '<table>';
    for (var i = 0; i < lines.length; i++) {
        var cells = lines[i].split(',');
        tableHTML += '<tr>';
        for (var j = 0; j < cells.length; j++) {
            tableHTML += '<td>' + cells[j] + '</td>';
        }
        tableHTML += '</tr>';
    }
    tableHTML += '</table>';
    tableContainer.innerHTML = tableHTML;

        return tableHTML;
    }
    
    
    document.getElementById("verify_ais_table").addEventListener("click", function(){
        document.getElementById("popup").style.display = "block";
        csvToTable(verify_ais_csv);
    });
    
    // Function to close the popup
    document.getElementById("close_button").addEventListener("click", function(){
        document.getElementById("popup").style.display = "none";
    });
   
