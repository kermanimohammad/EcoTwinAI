import * as data from './data.js';
import { setTreeMode, placeTree } from './tree.js';

function addGeoJsonToMap(jsonData, map) {
    const center = turf.center(jsonData).geometry.coordinates;
    map.flyTo({ center, zoom: 16 });

    data.setBuildingData({ type: 'FeatureCollection', features: [] });
    data.setTreeTrunkData({ type: 'FeatureCollection', features: [] });
    data.setTreeCanopyData({ type: 'FeatureCollection', features: [] });

    for (const feature of jsonData.features) {
        if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
            if (feature.properties.isCanopy) {
                data.treeCanopyData.features.push(feature);
            } else if (feature.properties.isTrunk) {
                data.treeTrunkData.features.push(feature);
            } else {
                data.buildingData.features.push(feature);
            }
        } else if (feature.geometry.type === 'Point') {
            placeTree(feature.geometry.coordinates, feature.properties.height, map);
        }
    }

    map.getSource('geojson-data').setData(data.buildingData);
    map.getSource('tree-trunks-source').setData(data.treeTrunkData);
    map.getSource('tree-canopies-source').setData(data.treeCanopyData);
}


export function initializeUI(map) {
    document.getElementById('load-geojson').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });

    document.getElementById('file-input').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                addGeoJsonToMap(jsonData, map);
            } catch (error) {
                alert("Error parsing GeoJSON file: " + error.message);
            }
        };
        reader.readAsText(file);
    });

    document.getElementById('save-geojson').addEventListener('click', () => {
        const buildings = data.buildingData.features;
        const trunks = data.treeTrunkData.features;
        const canopies = data.treeCanopyData.features;

        if (buildings.length || trunks.length) {
            const combinedData = {
                type: 'FeatureCollection',
                features: [...buildings, ...trunks, ...canopies]
            };
            const dataStr = JSON.stringify(combinedData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'data-with-trees.geojson';
            a.click();
            URL.revokeObjectURL(url);
        } else {
            alert("No data to save.");
        }
    });

    document.getElementById('reset').addEventListener('click', () => {
        data.setBuildingData({ type: 'FeatureCollection', features: [] });
        data.setTreeTrunkData({ type: 'FeatureCollection', features: [] });
        data.setTreeCanopyData({ type: 'FeatureCollection', features: [] });
        map.getSource('geojson-data').setData(data.buildingData);
        map.getSource('tree-trunks-source').setData(data.treeTrunkData);
        map.getSource('tree-canopies-source').setData(data.treeCanopyData);
        data.resetTreeCounter();
        document.getElementById('file-input').value = '';
        setTreeMode(null, map);
    });
}
