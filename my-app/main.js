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
const zip = new JSZip();
 
let main_kml = undefined
// let main_csv = undefined
let verify_ais_csv = undefined
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
const map = new Map({
    controls: defaultControls().extend([mousePositionControl]),
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
 
 
 
const buttonContainerCsv = document.getElementById('csvButton');
const uploadedCsvFiles = {};
const csvFileObject = {};
const csvDataObject = {}
const csvLayerVisibility = {};
const csv_Input = document.getElementById('csv_Input');
csv_Input.addEventListener('change', function (event) {
    const files = event.target.files;
    const fileCsv = event.target.files[0];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(file);
        const csvFileName = file.name;
        csvFileObject[csvFileName] = file;
        console.log(csvFileObject[csvFileName]); // to store tile
        if (uploadedCsvFiles[csvFileName]) {
            continue;
        }
        const reader = new FileReader();
        reader.onload = function (event) {
            const csv = event.target.result;
            csvDataObject[csvFileName] = csv
            createCsvButton(csvFileName, csvFileObject[csvFileName], csvDataObject[csvFileName]);
            console.log(csvFileObject);
            uploadedCsvFiles[csvFileName] = true;
        };
        reader.readAsText(file);
       
    }
})
 
function createCsvButton(name, csvFile, csvData) {
    console.log(csvFile);
    console.log(name);
    const csvButtonContainer = document.createElement('div');
    const buttonCsv = document.createElement('button');
    buttonCsv.textContent = name;
    const viewButton = document.createElement('button');
    viewButton.innerHTML = '&#128065;';
    const closeButton = document.createElement('button');
    closeButton.textContent = 'X';
    const br = document.createElement('br');
    // const buttonId = buttonName;
    buttonCsv.style.width = "150px";
    buttonCsv.style.overflow = "hidden";
    buttonCsv.style.textOverflow = "ellipsis";
    buttonCsv.style.whiteSpace = "nowrap";
    buttonCsv.style.backgroundColor = 'cadetblue';
    buttonCsv.style.marginBottom = '3px';
    viewButton.style.marginLeft = '5px'; // Add some spacing between buttons
    closeButton.style.marginLeft = '5px'; // Add some spacing between buttons
    csvButtonContainer.appendChild(buttonCsv);
    csvButtonContainer.appendChild(viewButton);
    csvButtonContainer.appendChild(closeButton);
    csvButtonContainer.appendChild(br);
 
    buttonContainerCsv.appendChild(csvButtonContainer);
    let additionalButtonsCreated = false;
 
    buttonCsv.addEventListener('click', function () {
        if (!additionalButtonsCreated) {
            createAdditionalButtons(csvButtonContainer);
            additionalButtonsCreated = true;
        }
        const parsedData = parseCSV(csvData);
            const table = createTable(parsedData);
            const tableContainer = document.getElementById('table-container');
            tableContainer.innerHTML = '';
            tableContainer.appendChild(table);
            sendDataToServer(csvFile)
    });
 
    // Function to create additional buttons
    function createAdditionalButtons(container) {
        const additionalButtons = document.createElement('div');
        additionalButtons.setAttribute('class', 'additionalButtons');
        // Create and append point buttons
        const pointButtons = document.createElement('div');
        const pointButton = document.createElement('button');
        pointButton.textContent = 'Point';
        pointButtons.appendChild(pointButton);
        pointButtons.appendChild(viewButton.cloneNode(true));
        pointButtons.appendChild(closeButton.cloneNode(true));
        pointButton.setAttribute('id', 'point');
        // Create and append line buttons
        const lineButtons = document.createElement('div');
        const lineButton = document.createElement('button');
        lineButton.textContent = 'Line';
        lineButtons.appendChild(lineButton);
        lineButtons.appendChild(viewButton.cloneNode(true));
        lineButtons.appendChild(closeButton.cloneNode(true));
        lineButton.setAttribute('id', 'line');
        // Create and append buffer buttons
        const bufferButtons = document.createElement('div');
        const bufferButton = document.createElement('button');
        bufferButton.textContent = 'Buffer';
        bufferButtons.appendChild(bufferButton);
        bufferButtons.appendChild(viewButton.cloneNode(true));
        bufferButtons.appendChild(closeButton.cloneNode(true));
        bufferButtons.setAttribute('id', 'buffer');
        // Append point, line, and buffer buttons to additional buttons container
        additionalButtons.appendChild(pointButtons);
        additionalButtons.appendChild(lineButtons);
        additionalButtons.appendChild(bufferButtons);
        additionalButtons.appendChild(document.createElement('br'));
        // Append additional buttons container to the main container
        container.appendChild(additionalButtons);
    }
 
}
const kmlButtonContainer = document.getElementById('kmlButton')
var kmlDataObject = {};
let kmlLayerVisibility = {};
const uploadedFiles = {};
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', function (event) {
    const files = event.target.files;
    sendForImages(files[0])
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = file.name;
        if (uploadedFiles[fileName]) {
            continue;
        }
        const reader = new FileReader();
        reader.onload = function (event) {
            const buffer = event.target.result;
            JSZip.loadAsync(buffer).then(function (zip) {
                zip.file(/\.kml$/i)[0].async('text').then(function (kmlData) {
                    createKMLButton(fileName, kmlData);
                    uploadedFiles[fileName] = true; // Mark the file as uploaded
                });
            });
        };
        reader.readAsArrayBuffer(file);
    }
});
 
function createKMLButton(buttonName, kmlData) {
    const buttonContainer = document.createElement('div');
    const button = document.createElement('button');
    button.textContent = buttonName;
    const viewButton = document.createElement('button');
    viewButton.innerHTML = '&#128065;';
    const closeButton = document.createElement('button');
    closeButton.textContent = 'X';
    const br = document.createElement('br');
    const buttonId = buttonName;
    button.style.width = "150px";
    button.style.overflow = "hidden";
    button.style.textOverflow = "ellipsis";
    button.style.whiteSpace = "nowrap";
    button.style.backgroundColor = 'cadetblue';
    button.style.marginBottom = '3px';
    viewButton.style.marginLeft = '5px';
    closeButton.style.marginLeft = '5px';
    buttonContainer.appendChild(button);
    buttonContainer.appendChild(viewButton);
    buttonContainer.appendChild(closeButton);
    buttonContainer.appendChild(br);
    kmlButtonContainer.appendChild(buttonContainer);
    viewButton.addEventListener('click', function () {
        parseKML(kmlData, buttonId);
    });
 
    closeButton.addEventListener('click', function () {
        delete kmlDataObject[buttonId];
        const layerToRemove = kmlLayerVisibility[buttonId];
        if (layerToRemove) {
            map.removeLayer(layerToRemove);
            delete kmlLayerVisibility[buttonId];
        }
    });
 
    kmlDataObject[buttonId] = kmlData;
    kmlLayerVisibility[buttonId] = false;
}
 
function parseKML(kmlData, buttonId) {
    // sendXmlDataToServer(kmlData);
    main_kml = kmlData;
    sendXmlDataToServer(main_kml);
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
            addImageOverlayFromHref(imageUrl, west, south, east, north, buttonId);
        });
        for (const layerId in kmlLayerVisibility) {
            if (kmlLayerVisibility[layerId] && layerId !== buttonId) {
                map.removeLayer(kmlLayerVisibility[layerId]);
                kmlLayerVisibility[layerId] = null;
            }
        }
        const vectorSource = new VectorSource({
            features: new KML().readFeatures(kmlData, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
            })
        });
        const vectorLayer = new VectorLayer({
            source: vectorSource
        });
        if (!kmlLayerVisibility[buttonId]) {
            map.addLayer(vectorLayer);
            kmlLayerVisibility[buttonId] = vectorLayer;
        }
 
    } catch (error) {
        console.error('Error parsing KML and adding image overlay:', error);
    }
}
function addImageOverlayFromHref(href, west, south, east, north, buttonId) {
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
            const { ais_point, point, line, buffer, ship_point, verify_ais } = data;
            document.getElementById('point').addEventListener("click",function()
            {
                overlayJson(ais_point, 'blue')
               
            })
            document.getElementById('line').addEventListener("click",function()
            {
                overlayJson(line, '#006666')
               
            })
            document.getElementById('buffer').addEventListener("click",function()
            {
                overlayJson(buffer, 'lightyellow');
               
            })
            const correlateAis = document.getElementById("correlateAis")
correlateAis.addEventListener('click', function(){
    overlayJson(ship_point, 'red')
            overlayJson(point, 'green'); //Blue
})
 
           
            verify_ais_csv = verify_ais;
            csvToTable(verify_ais_csv);
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
                    // opacity: 0.5
                }),
                stroke: new Stroke({
                    color: color,
                    // opacity: 0.5,
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
 
// Function to close the popup
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
 
        // Add Edit and Save buttons to each row
        // tableHTML += '<td><button class="edit-button">Edit</button></td>';
        // tableHTML += '<td><button class="save-button">Save</button></td>';
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
            for_image(properties[key]);
            info += '<div id="imageContainer"></div>';
            info += `<tr><td>${key}</td><td>${properties[key]}</td></tr>`;
        });
        info += '</table>';
        infoElement.innerHTML = info;
    } else {
        infoElement.innerHTML = '';
    }
});
 
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
        if(data)
        {
        const imageUrl = URL.createObjectURL(data);
        const img = document.createElement('img');
        img.src = imageUrl;
        document.getElementById('imageContainer').appendChild(img);
        }
        else{
            const img = document.createElement('img');
        img.src = "./no_image";
        document.getElementById('imageContainer').appendChild(img);
        }
    })
    // .catch(error => {
    //     console.error('Error fetching image:', error);
    //     // const imageUrl = URL.createObjectURL(data);
    //     // const img = document.createElement('img');
    //     // img.src = "./no_image";
    //     // document.getElementById('imageContainer').appendChild(img);
    // });
}
 
// for_image(imo_num);
