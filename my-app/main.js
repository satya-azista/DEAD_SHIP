
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { DragAndDrop, defaults as defaultInteractions } from 'ol/interaction.js';
import { GPX, GeoJSON, IGC, KML, TopoJSON } from 'ol/format.js';
import { ImageStatic, OSM, Vector as VectorSource } from 'ol/source.js';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer.js';
import { Overlay } from 'ol';
import ImageLayer from 'ol/layer/Image';
import Static from 'ol/source/ImageStatic.js';


const zip = new JSZip();

function getKMLData(buffer) {
    let kmlData;
    const data = zip.load(buffer);
    console.log(data);
    const kmlFile = zip.file(/\.kml$/i)[0];
    console.log(kmlFile);
    // sendDataToServer(kmlFile);
    if (kmlFile) {
        kmlData = kmlFile.asText();
    }
    return kmlData;
}

class KMZ extends KML {
    constructor(opt_options) {
        const options = opt_options || {};
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

        parseKML(kmlData);
        return super.readFeatures(kmlData, options);
    }
}

const dragAndDropInteraction = new DragAndDrop({
    formatConstructors: [KMZ, GPX, GeoJSON, IGC, KML, TopoJSON],
});

const map = new Map({
    interactions: defaultInteractions().extend([dragAndDropInteraction]),
    layers: [
        new TileLayer({
            source: new OSM(),
        }),
    ],
    target: 'map',
    view: new View({
        center: [0, 0],
        zoom: 2,
    }),
});

var vectorData;

dragAndDropInteraction.on('addfeatures', function (event) {
    console.log(event.features);
    vectorData = event.features;
    console.log(event.file);
    const vectorSource = new VectorSource({
        features: event.features,
    });
    map.addLayer(
        new VectorLayer({
            source: vectorSource,
        })
    );
    map.getView().fit(vectorSource.getExtent());
});

function parseKML(kmlData) {
    try {
        const parser = new DOMParser();
        const kmlDoc = parser.parseFromString(kmlData, 'text/xml');
        const groundOverlays = kmlDoc.querySelectorAll('GroundOverlay');

        groundOverlays.forEach(groundOverlay => {
            const imageUrl = groundOverlay.querySelector('href').textContent;
            const latLonBox = groundOverlay.querySelector('LatLonBox');
            const north = parseFloat(latLonBox.querySelector('north').textContent);
            const south = parseFloat(latLonBox.querySelector('south').textContent);
            const east = parseFloat(latLonBox.querySelector('east').textContent);
            const west = parseFloat(latLonBox.querySelector('west').textContent);

            addImageOverlayFromHref(imageUrl, west, south, east, north);
        });
    } catch (error) {
        console.error('Error parsing KML and adding image overlay:', error);
    }
}
function addImageOverlayFromHref(href, west, south, east, north) {
    const url = "./kmzImages/";
    const newPath = url + href;
    const imageOverlay = new ImageLayer({
        source: new ImageStatic({
            url: newPath,
            projection: 'EPSG:4326',
            imageExtent: [west, south, east, north]
        })
    });
    map.addLayer(imageOverlay);
}

// const infoElement = document.getElementById('info');

map.on('click', function (evt) {
    const pixel = map.getEventPixel(evt.originalEvent);
    const feature = map.forEachFeatureAtPixel(pixel, function (feature) {
        return feature;
    });
    if (feature) {
        console.log(feature);
        // showPopupForFeature(feature);
        const properties = feature.getProperties();
        let info = '';
        Object.keys(properties).forEach(key => {
            info += `${key}: ${properties[key]}<br>`;
        });
        infoElement.innerHTML = info;

        // Populate the edit form when a feature is clicked
        // populateEditForm(feature, properties['name'], vectorData);
    } else {
        // infoElement.innerHTML = '';
        console.log('hi');
    }
});


