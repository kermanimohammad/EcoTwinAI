import * as data from './data.js';
import { updateSunPosition } from './sun.js';

export function initializeMap() {
    mapboxgl.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN';

    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/standard',
        center: [-74.5, 40],
        zoom: 9,
        pitch: 60,
        antialias: true,
        config: {
            basemap: {
                show3dObjects: false
            }
        }
    });

    map.addControl(new mapboxgl.NavigationControl());

    map.on('load', () => {
        // Add source for buildings
        map.addSource('geojson-data', {
            type: 'geojson',
            data: data.buildingData
        });

        // Add sources for tree parts
        map.addSource('tree-trunks-source', {
            type: 'geojson',
            data: data.treeTrunkData
        });
        map.addSource('tree-canopies-source', {
            type: 'geojson',
            data: data.treeCanopyData
        });

        // Add layer for buildings
        map.addLayer({
            'id': 'geojson-layer',
            'type': 'fill-extrusion',
            'source': 'geojson-data',
            'paint': {
                'fill-extrusion-color': [
                    'interpolate', ['linear'], ['get', 'TotalEnergy'],
                    50, 'green', 100, 'yellow', 150, 'red'
                ],
                'fill-extrusion-height': ['*', ['get', 'Height'], 0.3048],
                'fill-extrusion-opacity': 1.0,
                'fill-extrusion-base': 0
            }
        });

        // Add layer for tree trunks
        map.addLayer({
            'id': 'tree-trunks-layer',
            'type': 'fill-extrusion',
            'source': 'tree-trunks-source',
            'paint': {
                'fill-extrusion-color': '#8B4513', // Brown
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-base': ['get', 'base']
            }
        });

        // Add layer for tree canopies
        map.addLayer({
            'id': 'tree-canopies-layer',
            'type': 'fill-extrusion',
            'source': 'tree-canopies-source',
            'paint': {
                'fill-extrusion-color': '#008000', // Green
                'fill-extrusion-height': ['+', ['get', 'base'], ['get', 'height']],
                'fill-extrusion-base': ['get', 'base']
            }
        });

        // Set up lighting and initial sun position
        updateSunPosition(map);
    });

    return map;
}
