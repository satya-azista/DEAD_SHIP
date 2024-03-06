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
// import { text } from 'stream/consumers';
const zip = new JSZip();
 
let main_kml = undefined
let main_csv = undefined
let verify_ais_csv = undefined
let cstext=undefined;
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
 

// function addImageOverlayFromHref(href, west, south, east, north, buttonId) {
//     const url = "./";
//     const newPath = url + href;
//     const newPathUrl = newPath.replace(/\s/g, "");
//     const imageOverlay = new ImageLayer({
//         source: new ImageStatic({
//             url: newPathUrl,
//             projection: 'EPSG:4326',
//             imageExtent: [west, south, east, north]
//         })
//     });
//     map.addLayer(imageOverlay);
 
// }
function sendDataToServer(variable1,variable2) {
    if(variable1==undefined)
    {
        alert("Enter KMZ")
    }
    else if (variable2==undefined)
    {
        alert("Enter Csv")
    }
    else if(variable1==undefined && variable2==undefined)
    {
        alert("select KMZ and CSV")
    }
    else
    {
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
            // let overlays = map.getOverlays().getArray();
            // console.log(overlays)

            // Iterate over each overlay and remove it
            // overlays.forEach(function(overlay) {
            //     map.removeOverlay(overlay);
            // });
            map.getLayers().forEach(function (layer) {
                if (layer instanceof VectorLayer) {
                    map.removeLayer(layer);
                }
            });
            const ais_point = data.ais_point;
            const point = data.point;
            const line = data.line;
            const buffer = data.buffer;
            const ship_point= data.ship_point;
            const verify_ais = data.verify_ais;
            // const { ais_point, point, line, ais_point, ship_point, verify_ais } = data;

            const correlateAis = document.getElementById("correlateAis")
            correlateAis.addEventListener('click', function(){
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
                else{

                map.getLayers().forEach(function (layer) {
                    if (layer instanceof VectorLayer) {
                        map.removeLayer(layer);
                    }
                });
                overlayJson(ship_point, 'red')
                        overlayJson(point, 'green'); //Blue
            }
            })
            verify_ais_csv = verify_ais;
            csvToTable(verify_ais_csv);
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }
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
    // console.log("added successfully");
}
 
// // function sendForImages(file) {
// //     fetch('http://127.0.0.1:5000/images', {
// //         method: 'POST',
// //         body: file,
// //     })
// //         .then(response => {
// //             if (response.ok) {
// //                 return response; // Assuming server responds with JSON
// //             }
// //             throw new Error('Failed to send data to server');
// //         })
// //         .then(data => {
// //             console.log('Response from server:', data[0]);
// //         })
// //         .catch(error => {
// //             console.error('Error:', error);
// //         });
// // }
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

document.getElementById('measureLength').addEventListener('click', activateMeasureLength);

/////////////////////////
//   GET COORDINATES   ///
/////////////////////////

let coordinatesOverlay; // Variable to hold the overlay for coordinates display

        function toggleCoordinateDisplay() {
            if (coordinatesOverlay) {
                // Remove the overlay if it exists
                map.removeOverlay(coordinatesOverlay);
                coordinatesOverlay = undefined;
                return; // Exit the function
            }

            // Create an overlay to display coordinates
            coordinatesOverlay = new ol.Overlay({
                element: document.getElementById('coordinates-display'),
                positioning: 'bottom-center',
            });

            // Add the overlay to the map
            map.addOverlay(coordinatesOverlay);

            // Listen to mousemove event on the map
            map.on('pointermove', function (evt) {
                if (evt.dragging) {
                    return;
                }
                const coordinate = evt.coordinate;
                const coords = ol.coordinate.toStringHDMS(ol.proj.transform(coordinate, 'EPSG:3857', 'EPSG:4326'));
                document.getElementById('coordinates').innerText = 'Coordinates: ' + coords;
                coordinatesOverlay.setPosition(coordinate);
            });
        }

        document.getElementById('get_cords').addEventListener('click', toggleCoordinateDisplay);




const kmlFileInput = document.getElementById('fileInput');
const kmlContainer = document.getElementById('kmlContainer');
// Function to handle file upload
kmlFileInput.addEventListener('change', handleKmlFileUpload);

function handleKmlFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        // Check for duplicates
        const isDuplicate = Array.from(kmlContainer.children).some(element => element.dataset.fileName === file.name);
        if (!isDuplicate) {
            // Create a new KML element
            const kmlElement = document.createElement('div');
            kmlElement.classList.add('kml-element');
            
            // Display the name box
            const nameBox = document.createElement('div');
            nameBox.classList.add('kml-name-box');
            nameBox.textContent = file.name.slice(0, 32);
            kmlElement.appendChild(nameBox);
            
            // Add eye icon
            const eyeIcon = document.createElement('span');
            eyeIcon.textContent = '👁️';
            eyeIcon.classList.add('highlight-icon');
            eyeIcon.addEventListener('click', () => highlightKML(file));
            kmlElement.appendChild(eyeIcon);

            // Add trash icon
            const trashIcon = document.createElement('span');
            trashIcon.textContent = '🗑️';
            trashIcon.classList.add('remove-icon');
            trashIcon.addEventListener('click', () => removeKML(kmlElement, file));
            kmlElement.appendChild(trashIcon);

            // Set data attribute with file name
            kmlElement.dataset.fileName = file.name;

            // Append the KML element to the container
            kmlContainer.appendChild(kmlElement);
        } else {
            alert('File already exists.');
        }
    }
}

// Function to highlight KML
function highlightKML(file) {
    main_kml =file;
    parseKml(file);
    // Implement highlighting logic
    const kmlElements = Array.from(kmlContainer.children);
    kmlElements.forEach(element => {
        if (element.dataset.fileName === file.name) {
            element.querySelector('.kml-name-box').style.backgroundColor = 'violet';
            element.classList.add('highlighted');
        } else {
            element.querySelector('.kml-name-box').style.backgroundColor = '';
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



const csvFileInput = document.getElementById('csv_Input');
const csvContainer = document.getElementById('csvContainer');
// Function to handle file upload
csvFileInput.addEventListener('change', handleCsvFileUpload);
function handleCsvFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        // Check for duplicates
        const isDuplicate = Array.from(csvContainer.children).some(element => element.dataset.fileName === file.name);
        if (!isDuplicate) {
            // Create a new KML element
            const csvElement = document.createElement('div');
            csvElement.classList.add('csv-element');
            
            // Display the name box
            const nameBox = document.createElement('div');
            nameBox.classList.add('csv-name-box');
            nameBox.textContent = file.name.slice(0, 32);
            csvElement.appendChild(nameBox);
            
            // Add eye icon
            const eyeIcon = document.createElement('span');
            eyeIcon.textContent = '👁️';
            eyeIcon.classList.add('highlight-icon');
            eyeIcon.addEventListener('click', () => highlightCSV(file));
            csvElement.appendChild(eyeIcon);

            // Add trash icon
            const trashIcon = document.createElement('span');
            trashIcon.textContent = '🗑️';
            trashIcon.classList.add('remove-icon');
            trashIcon.addEventListener('click', () => removeCSV(csvElement, file));
            csvElement.appendChild(trashIcon);

            // Set data attribute with file name
            csvElement.dataset.fileName = file.name;

            // Append the KML element to the container
            csvContainer.appendChild(csvElement);
        } else {
            alert('File already exists.');
        }
    }
}

function convertFileToText(file) {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function(event) {
        const text = event.target.result;
        // console.log('CSV Text:', text);
        // Now you can use the CSV text as needed
    };
    reader.onerror = function(event) {
        console.error('Error converting CSV to text:', event.target.error);
    };
}

function highlightCSV(file) {
    main_csv = file;
    parseCSV(file);
    const csvElements = Array.from(csvContainer.children);
    csvElements.forEach(element => {
        if (element.dataset.fileName === file.name) {
            element.querySelector('.csv-name-box').style.backgroundColor = 'violet';
            element.classList.add('highlighted');
        } else {
            element.querySelector('.csv-name-box').style.backgroundColor = '';
            element.classList.remove('highlighted');
        }
    });
}

// Function to remove KML
function removeCSV(csvElement, file) {
    if (main_csv === file) {
        main_csv = undefined;
    }
    // Implement removal logic
    main_csv=undefined;
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
                else{
    sendDataToServer(main_kml,cstext);
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