import Map from 'ol/Map.js';
import View from 'ol/View.js';
import ImageLayer from 'ol/layer/Image';
import { GeoJSON, KML } from 'ol/format.js';
import { ImageStatic, OSM, Vector as VectorSource } from 'ol/source.js';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer.js';
import JSZip from 'jszip';
import MousePosition from 'ol/control/MousePosition.js';
import { defaults as defaultControls } from 'ol/control.js';
import { Style, Fill, Stroke, Circle } from 'ol/style';
import { getLength } from 'ol/sphere.js';
import { Draw } from 'ol/interaction.js';
import Overlay from 'ol/Overlay';
import { XYZ } from 'ol/source';
const zip = new JSZip();
let main_kml = undefined;
let main_csv = undefined;
let verify_ais_csv = undefined;
let cstext=undefined;
let csv_name=undefined;
let point_data=undefined;
let line_data=undefined;
let buffer_data=undefined;
let imo_ship=undefined;
let dead_ship=undefined;
let two_point=undefined;
let image_overlay=undefined;
let v_l=undefined;
const mousePositionControl = new MousePosition({
    projection: 'EPSG:4326',
    className: 'custom-mouse-position',
    target: document.getElementById('mouse-position'),
});

const arcgisTileLayer = new TileLayer({
    source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attributions: [
            '&copy; <a href="https://www.arcgis.com/">Esri</a>',
            'Tiles &copy; <a href="https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer">ArcGIS</a>',
            'Tiles &copy; <a href="https://www.esri.com/en-us/home">Esri</a>'
        ],
    }),
});
const osmLayer = new TileLayer({
  source: new OSM(),
  visible: true
});
const satelliteLayer = new TileLayer({
  source: new XYZ({
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
  }),
});
    const map = new Map({
        controls: defaultControls().extend([mousePositionControl]),
        target: 'map',
        layers: [satelliteLayer],
        view: new View({
            center: [0, 0],
            zoom: 2,
        }),
    });
function sendDataToServer(variable1,variable2) {
    const data = {
        xmldata: variable1,
        csvData: variable2
    };
    fetch('http://127.0.0.1:5000/get', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (response.ok) {
                return response.json(); // Assuming server responds with JSON
            }
            throw new Error('Failed to send data to server');
        })
        .then(data => {
            const ais_point = data.ais_point;
            const point = data.point;
            const line = data.line;
            const buffer = data.buffer;
            const ship_point= data.ship_point;
            const verify_ais = data.verify_ais;
            const AIS=data.AIS;
            buffer_data=data.buffer;
            line_data=data.line;
            point_data=data.ais_point;
            imo_ship=data.point;
            dead_ship=data.ship_point;
            two_point=data.AIS;
            const correlateAis = document.getElementById("correlateAis")
            correlateAis.addEventListener('click', function()
            {
                overlayJson(dead_ship, 'red');
                overlayJson(imo_ship, 'green');
            })
            ais_points.addEventListener('click', function()
            {
                overlayJson(point_data, 'blue');
            })
            ais_line.addEventListener('click', function()
            {
                overlayJson(line_data, '#006666');
            })
            ais_buffer.addEventListener('click', function()
            {
                overlayJson(buffer_data, 'rgba(173, 216, 230, 0.2)');
            })
            overlayJson(two_point,'yellow');
            verify_ais_csv = verify_ais;
            csvToTable(verify_ais_csv);
    })
        .catch(error => {
            console.error('Error:', error);
        });
    }
// }
function overlayJson(featureData, color) {
    const vectorSourceJson = new VectorSource({
        features: new GeoJSON().readFeatures(featureData, {
            featureProjection: 'EPSG:3857'
        })
    });
    const vectorLayer = new VectorLayer({
        source: vectorSourceJson,
        style: new Style({
            fill: new Fill({
                color: color,
                opacity: 0.5
            }),
            stroke: new Stroke({
                color: color,
                width: 1
            }),
            image: new Circle({
                radius: 4,
                fill: new Fill({
                    color: color,
                }),
                stroke: new Stroke({
                    color: color,
                    width: 1
                })
            })
        })
    });
    map.addLayer(vectorLayer);
}
 
function sendForImages(file) {
    fetch('http://127.0.0.1:5000/images', {
        method: 'POST',
        body: file,
    })
        .then(response => {
            if (response.ok) {
                return response;
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
//Function to create HTML table
function createTable(data) {
    const table = document.createElement('table');
    //  table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const key in data[0]) {
        const th = document.createElement('th');
        th.textContent = key;
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);
    // table body
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
 
document.getElementById("verify_ais_table").addEventListener("click", function () {
    document.getElementById("popup").style.display = "block";
 
});
 
//Function to close the popup
document.getElementById("close_button").addEventListener("click", function () {
    document.getElementById("popup").style.display = "none";
});
 
 
// Variables to store the mouse position and the popup element
var offsetX, offsetY;
var popup = document.getElementById('popup');
 
// Function to handle mouse down event on the popup header
document.querySelector('.popup-header').addEventListener('mousedown', function (event) {
    // Get the initial mouse position relative to the popup's position
    offsetX = event.clientX - popup.offsetLeft;
    offsetY = event.clientY - popup.offsetTop;
 
    // Add event listener for mouse move
    document.addEventListener('mousemove', movePopup);
 
    // Add event listener for mouse up
    document.addEventListener('mouseup', function () {
        // Remove event listeners for mouse move and mouse up
        document.removeEventListener('mousemove', movePopup);
        // document.removeEventListener('mouseup', arguments.callee);
    });
});
 
// Function to move the popup
function movePopup(event) {
    // Calculate the new position of the popup
    var newX = event.clientX - offsetX;
    var newY = event.clientY - offsetY;
 
    // Set the new position of the popup
    popup.style.left = newX + 'px';
    popup.style.top = newY + 'px';
}

function csvToTable(ais) {
    var tableContainer = document.getElementById('popup_content');
    var lines = ais.trim().split('\n'); // Trim to remove leading/trailing whitespace
    var tableHTML = '<table>';
 
    for (var i = 0; i < lines.length; i++) {
        var cells = lines[i].split(',');
        tableHTML += '<tr>';
 
        for (var j = 0; j < cells.length; j++) {
            var cellContent = cells[j].trim();
            var cellStyle = '';
 
            if (j === 2) { // Check if the current cell is in the third column (index 2)
                cellStyle = (cellContent === 'YES') ? 'background-color: lightgreen;' : (cellContent === 'NO') ? 'background-color: orange;' : '';
            }
 
            tableHTML += '<td style="' + cellStyle + '">' + cellContent + '</td>';
        }
        tableHTML += '</tr>';
    }
 
    tableHTML += '</table>';
    tableContainer.innerHTML = tableHTML;
 
    // Add event listeners for Edit and Save buttons
    var editButtons = document.querySelectorAll('.edit-button');
    var saveButtons = document.querySelectorAll('.save-button');
 
    editButtons.forEach(function (button) {
        button.addEventListener('click', function (event) {
            var row = event.target.closest('tr');
            enableEdit(row);
        });
    });
 
    saveButtons.forEach(function (button) {
        button.addEventListener('click', function (event) {
            var row = event.target.closest('tr');
            saveRow(row);
        });
    });
}

// ///////////////////////////
// /////  CORELATE AIS  //////
// ///////////////////////////

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
            // for_image(properties[key]);
            // info += '<div id="imageContainer"></div>';
            if(key!=='geometry') info += `<tr><td>${key}</td><td>${properties[key]}</td></tr>`;
        });
        info += '</table>';
        infoElement.innerHTML = info;
    } else {
        infoElement.innerHTML = '';
    }
});

// ////////////////////////////////////////
// ////  IMAGE OF SHIP BY IMO NUMBER   ////
// ////////////////////////////////////////
 
function for_image(imo_num) {
    fetch('http://127.0.0.1:5000/get_image', {
        method: 'POST',
        body: imo_num,
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch image');
        }
        return response.blob();
    })
    .then(data => {
        const imageUrl = URL.createObjectURL(data);
        const img = document.createElement('img');
        img.src = imageUrl;
        document.getElementById('imageContainer').appendChild(img);
    })
    .catch(error => {
        console.error('Error fetching image:', error);
    });
}

/////////////////////////
// MEASURE LENGTH    ////
/////////////////////////

function activateMeasureLength() {
    // Remove existing vector layer if present
    map.getLayers().forEach(function (layer) {
        if (layer instanceof VectorLayer) {
            map.removeLayer(layer);
        }
    });

    const source = new VectorSource();
    const vector = new VectorLayer({
        source: source,
        style: new Style({
            stroke: new Stroke({
                color: 'blue',
                width: 2,
            }),
        }),
    });
    map.addLayer(vector);

    const draw = new Draw({
        source: source,
        type: 'LineString',
    });

    draw.on('drawend', function (event) {
        const geometry = event.feature.getGeometry();
        const length = getLength(geometry, {
            projection: map.getView().getProjection(),
        });
        console.log('Length: ' + length.toFixed(2) + ' meters');
        map.removeInteraction(draw);
    });

    map.addInteraction(draw);
}

// document.getElementById('measureLength').addEventListener('click', activateMeasureLength);

/////////////////////////
///  GET COORDINATES  ///
/////////////////////////

let isGetCoordsActive = false;

// Event listener for the "Get Coordinates" button
const getCoordsButton = document.getElementById('get_cords');
getCoordsButton.addEventListener('click', () => {
    // Toggle the state of the button
    isGetCoordsActive = !isGetCoordsActive;

    if (isGetCoordsActive) {
        // Add a click event listener to the map
        map.on('click', handleMapClick);
        getCoordsButton.textContent = 'Stop Getting Coordinates'; // Change button text
    } else {
        // Remove the click event listener from the map
        map.un('click', handleMapClick);
        const stop_display = document.getElementById("coord-display");
        stop_display.innerHTML ='';
        getCoordsButton.textContent = 'Get Coordinates'; // Change button text back
    }
});

// Event handler for map click events
function handleMapClick(event) {
    const coords = event.coordinate;
    const coord_display = document.getElementById("coord-display");
    coord_display.innerHTML = 'Coordinates: ' + coords[0] + ', ' + coords[1];
}

/////////////////////////
////    KML DATA     ////
/////////////////////////


const kmlFileInput = document.getElementById('fileInput');
const kmlContainer = document.getElementById('kmlContainer');
const kmlElements = Array.from(kmlContainer.children);
// Function to handle file upload
kmlFileInput.addEventListener('change', handleKmlFileUpload);
function handleKmlFileUpload(event) {
    const file = event.target.files[0];
    if (file) 
    {
        // Check if array has no elements
        if (kmlElements.length === 0) {
            appendKmlFile(file);
        } else {
            // Check for duplicates only if array has elements
            const isDuplicate = kmlElements.some(element => element.dataset.fileName === file.name);
            if (!isDuplicate) 
            {
                appendKmlFile(file);
            } else {
                alert('File already exists.');
            }
        }
    }
}

function appendKmlFile(file) {
    // Create a new KML element
    const kmlElement = document.createElement('div');
    kmlElement.classList.add('kml-element');
    // Display the name box
    const nameButton = document.createElement('button');
    nameButton.classList.add('kml-name-button');
    nameButton.textContent = file.name.slice(0, 32);
    kmlElements.push(nameButton);
    kmlElement.appendChild(nameButton);
    // Add eye icon
    const eyeIcon = document.createElement('span');
    eyeIcon.textContent = '👁️';
    eyeIcon.classList.add('highlight-icon');
    eyeIcon.addEventListener('click', () => highlightKML(file));
    kmlElement.appendChild(eyeIcon);
    const trashIcon = document.createElement('span');
    trashIcon.classList.add('remove-icon');
    trashIcon.addEventListener('click', () => removeKML(kmlElement, file));
    // Create an <img> element for the SVG icon
    const imgElement = document.createElement('img');
    imgElement.src = '/close.svg'; // Set the src attribute to the SVG file path
    // Append the <img> element to the trashIcon span
    trashIcon.appendChild(imgElement);
    // Append the trashIcon to the kmlElement
    kmlElement.appendChild(trashIcon);
    // Set data attribute with file name
    kmlElement.dataset.fileName = file.name;
    // Append the KML element to the container
    kmlContainer.appendChild(kmlElement);
}

// Function to highlight KML
function highlightKML(file) {
    map.getLayers().forEach(function (layer) {
                if (layer instanceof VectorLayer) {
                    map.removeLayer(layer);
                }
            });
if(image_overlay!=undefined)
{
    map.removeLayer(image_overlay);
}
if(v_l!=undefined)
{
    map.removeLayer(v_l);
}
    main_kml =file;
    sendForImages(file);
    parseKml(file);
const reader = new FileReader();
reader.onload = function (event) {
    const buffer = event.target.result;
    JSZip.loadAsync(buffer).then(function (zip) {
        // Extract and parse KML
        const kmlFile = zip.file(/\.kml$/i)[0];
        if (kmlFile) {
            kmlFile.async('text').then(function (kmlData) {
                parse_KML(kmlData);
            });
        }

        // Extract images
        zip.forEach(function (relativePath, zipEntry) {
            if (relativePath.match(/\.(jpg|jpeg|png)$/i)) {
                zipEntry.async('base64').then(function (data) {
                    // Convert base64 image data to GeoJSON format
                    const featureData = {
                        type: 'FeatureCollection',
                        features: [{
                            type: 'Feature',
                            geometry: {
                                type: 'Point',
                                coordinates: [0, 0] // Set coordinates appropriately
                            },
                            properties: {
                                base64ImageData: data // Attach base64 image data to properties
                            }
                        }]
                    };
                });
            }
        });
    });
};
reader.readAsArrayBuffer(file);
    // Implement highlighting logic
    const kmlElements = Array.from(kmlContainer.children);
    kmlElements.forEach(element => {
        if (element.dataset.fileName === file.name) {
            element.querySelector('.kml-name-button').style.backgroundColor = 'violet';
            element.classList.add('highlighted');
        } else {
            element.querySelector('.kml-name-button').style.backgroundColor = '';
            element.classList.remove('highlighted');
        }
    });
    console.log(`Highlighting KML: ${file.name}`);
}

// Function to remove KML
function removeKML(kmlElement, file) {
    if (main_kml === file) {
        main_kml = undefined;
    }
    // Implement removal logic
    kmlElement.remove();
    main_kml=undefined;
    // console.log(`Removed KML: ${file.name}`);
}

/////////////////////////
////    CSV DATA     ////
/////////////////////////

const csvFileInput = document.getElementById('csv_Input');
const csvContainer = document.getElementById('csvContainer');
const csvElements = Array.from(csvContainer.children);
// Function to handle file upload
csvFileInput.addEventListener('change', handleCsvFileUpload);
function handleCsvFileUpload(event) 
{
    const file = event.target.files[0];
    if (file) 
    {
        const csvElements=Array.from(csvContainer.children)
        // Check if array has no elements
        if(csvElements.length==0)
        {
            appendCsvFile(file);
        }
        else
        {
            const isDuplicate =csvElements.some(element => element.dataset.fileName === file.name);
            if (!isDuplicate) 
            {
                appendCsvFile(file);
            }
            else 
            {
                alert('File already exists.');
            }
        }
    }
}

function appendCsvFile(file) {
    // Create a new CSV element
    const csvElement = document.createElement('div');
    csvElement.classList.add('csv-element');
    
    // Display the name box as a button
    const nameButton = document.createElement('button');
    nameButton.classList.add('csv-name-button');
    nameButton.textContent = file.name.slice(0, 32);
   csvElements.push(nameButton);
    csvElement.appendChild(nameButton);

    // Add eye icon
    const eyeIcon = document.createElement('span');
    eyeIcon.textContent = '👁️';
    eyeIcon.classList.add('highlight-icon');
    eyeIcon.addEventListener('click', () => highlightCSV(file,nameButton.textContent));
    csvElement.appendChild(eyeIcon);

    // Add trash icon
    const trashIcon = document.createElement('span');
    trashIcon.classList.add('remove-icon');
    trashIcon.addEventListener('click', () => removeCSV(csvElement, file));

    // Create an <img> element for the SVG icon
    const imgElement = document.createElement('img');
    imgElement.src = '/close.svg'; // Set the src attribute to the SVG file path
    trashIcon.appendChild(imgElement);
    csvElement.appendChild(trashIcon);
    // Set data attribute with file name
    csvElement.dataset.fileName = file.name;

    // Append the CSV element to the container
    csvContainer.appendChild(csvElement);
}
function toggleCSVOptions(csvElement) {
    const existingOptions = csvElement.querySelector('.csv-options');
    if (existingOptions) {
        existingOptions.remove();
    } else {
        const optionsDiv = document.createElement('div');
        optionsDiv.classList.add('csv-options');
        
        // Add point option
        const pointButton = createOptionButton('Point', () => selectCSVOption('point'));
        pointButton.classList.add('context-point');
        pointButton.id = csv_name+'pointButton'; // Set ID for point button
        optionsDiv.appendChild(pointButton);

        // Add line option
        const lineButton = createOptionButton('Line', () => selectCSVOption('line'));
        lineButton.classList.add('context-line');
        lineButton.id = csv_name+'lineButton'; // Set ID for line button
        optionsDiv.appendChild(lineButton);

        // Add buffer option
        const bufferButton = createOptionButton('Buffer', () => selectCSVOption('buffer'));
        bufferButton.classList.add('context-buffer');
        bufferButton.id = csv_name+'bufferButton'; // Set ID for buffer button
        optionsDiv.appendChild(bufferButton);

        csvElement.appendChild(optionsDiv);
    }
}


function createOptionButton(text, onClickHandler) {
    const button = document.createElement('button');
    button.textContent = text;
    button.addEventListener('click', onClickHandler);
    return button;
}


function selectCSVOption(option) {
    // Implement the logic to handle the selected option (e.g., point, line, buffer)
    console.log(`Selected CSV option: ${option}`);
}


function highlightCSV(file,name) {
    csv_name=name;
    main_csv = file;
    parseCSV(file);
    const csvElements = Array.from(csvContainer.children);
    csvElements.forEach(element => {
        if (element.dataset.fileName === file.name) {
            element.querySelector('.csv-name-button').style.backgroundColor = 'violet';
            element.classList.add('highlighted');
        } else {
            element.querySelector('.csv-name-button').style.backgroundColor = '';
            element.classList.remove('highlighted');
        }
    });
}
function removeCSV(csvElement, file) {
    if (main_csv === file) {
        main_csv = undefined;
    }
    
    // Remove the associated options
    const optionsDiv = csvElement.querySelector('.csv-options');
    if (optionsDiv) {
        optionsDiv.remove();
    }
    
    // Remove the CSV element
    csvElement.remove();
    
    console.log(`Removed CSV: ${file.name}`);
}

function parseCSV(file) {
    if (!file || !FileReader) {
        return;
    }

    var reader = new FileReader();

    reader.onload = function (e) {
        toTable(e.target.result);
    };

    reader.readAsText(file);
}
 function toTable(text)
 {
    cstext=text;
    // console.log(mainKml);
    sendDataToServer(main_kml,cstext);
    const parsedData = make_tab(cstext);
    const table = createTable(parsedData);
    const tableContainer = document.getElementById('table-container');
    tableContainer.innerHTML = '';
    tableContainer.appendChild(table);
    if(main_kml==undefined)
                {
                    alert("Select KMZ");
                }
                else if(cstext==undefined)
                {
                    alert("Select CSV")
                }
                else if(main_kml==undefined && cstext==undefined)
                {
                    alert("select KMZ and CSV")
                }
 }


 function make_tab(csv) {
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


function parseKml(file) {
    if (!file || !FileReader) {
        return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
        const buffer = event.target.result;
        JSZip.loadAsync(buffer).then(function (zip) {
            const kmlFile = Object.values(zip.files).find(file => /\.kml$/i.test(file.name));
            if (kmlFile) {
                kmlFile.async('text').then(function (kmlData) {
                    mainKml(kmlData);
                }).catch(function (error) {
                    console.error('Error reading KML file:', error);
                });
            } else {
                console.error('No KML file found in KMZ.');
            }
        }).catch(function (error) {
            console.error('Error loading KMZ file:', error);
        });
    };
    reader.readAsArrayBuffer(file);
}

function mainKml(kmlData) {
    // Store or process the KML data as needed
    main_kml = kmlData;
}

function mainkml(kmlData)
{
    console.log(kmlData);
    main_kml=kmlData;
}


function parse_KML(kmlData) {
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
            dataProjection: 'EPSG:4326', 
            featureProjection: 'EPSG:3857' 
          })
        });
        vectorSource.getFeatures().forEach(feature =>{
            feature.setStyle(null);
        });
        const vectorLayer = new VectorLayer({
            source: vectorSource
        });
        v_l=vectorLayer;
        map.addLayer(v_l);
    } catch (error) {
        console.error('Error parsing KML and adding image overlay:', error);
    }
}

function addImageOverlayFromHref(href, west, south, east, north) 
{
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
    image_overlay=imageOverlay;
    map.addLayer(image_overlay);
}
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
    console.log(href)
    const index = window.location.href.lastIndexOf('/');
    if (index !== -1) {
        const kmlFile = zip.file(href.slice(index + 1));
        console.log(kmlFile);
        if (kmlFile) {
            
            return URL.createObjectURL(new Blob([kmlFile.asArrayBuffer()]));
            
        }
    }
    console.log(href);
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
        console.log(kmlData);
        parse_KML(kmlData);
        return super.readFeatures(kmlData, options);
    }
}
