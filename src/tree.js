import * as data from './data.js';

let currentTreeMode = null;
let isDragging = false;
let lastTreePosition = null;

function setTreeMode(mode, map) {
    if (currentTreeMode === mode) {
        currentTreeMode = null;
    } else {
        currentTreeMode = mode;
    }

    const treeCreatorBtns = [document.getElementById('tree-mode-multi'), document.getElementById('tree-mode-delete')];
    treeCreatorBtns.forEach(btn => {
        const btnMode = btn.id.split('-')[2];
        if (btnMode === currentTreeMode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    map.getCanvas().style.cursor = currentTreeMode ? 'crosshair' : '';
}

function placeTree(lngLat, legacyHeight, map) {
    const totalHeight = legacyHeight || (() => {
        const min = Number(document.getElementById('tree-min-height').value);
        const max = Number(document.getElementById('tree-max-height').value);
        return Math.random() * (max - min) + min;
    })();

    const trunkHeight = totalHeight * 0.4;
    const canopyHeight = totalHeight * 0.6;
    const trunkRadius = 0.4;
    const canopyRadius = 2.5;
    const treeId = data.getTreeId();
    data.incrementTreeId();

    const pointCoords = Array.isArray(lngLat) ? lngLat : [lngLat.lng, lngLat.lat];
    const point = turf.point(pointCoords);

    const trunkBuffer = turf.buffer(point, trunkRadius, { units: 'meters' });
    const trunkFeature = {
        ...trunkBuffer,
        properties: { id: treeId, isTrunk: true, height: trunkHeight, base: 0 }
    };
    data.treeTrunkData.features.push(trunkFeature);

    const canopyBuffer = turf.buffer(point, canopyRadius, { units: 'meters' });
    const canopyFeature = {
        ...canopyBuffer,
        properties: { id: treeId, isCanopy: true, height: canopyHeight, base: trunkHeight }
    };
    data.treeCanopyData.features.push(canopyFeature);

    map.getSource('tree-trunks-source').setData(data.treeTrunkData);
    map.getSource('tree-canopies-source').setData(data.treeCanopyData);
}

function deleteTreesAtPoint(point, map) {
    const features = map.queryRenderedFeatures(point, { layers: ['tree-trunks-layer', 'tree-canopies-layer'] });
    if (!features.length) return;

    const idToDelete = features[0].properties.id;
    data.treeTrunkData.features = data.treeTrunkData.features.filter(f => f.properties.id !== idToDelete);
    data.treeCanopyData.features = data.treeCanopyData.features.filter(f => f.properties.id !== idToDelete);

    map.getSource('tree-trunks-source').setData(data.treeTrunkData);
    map.getSource('tree-canopies-source').setData(data.treeCanopyData);
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

export function initializeTreeCreator(map) {
    const treeModeMultiBtn = document.getElementById('tree-mode-multi');
    const treeModeDeleteBtn = document.getElementById('tree-mode-delete');

    treeModeMultiBtn.addEventListener('click', () => setTreeMode('multi', map));
    treeModeDeleteBtn.addEventListener('click', () => setTreeMode('delete', map));

    map.on('click', (e) => {
        if (currentTreeMode === 'delete') {
            deleteTreesAtPoint(e.point, map);
        }
    });

    map.on('mousedown', (e) => {
        if (e.originalEvent.button !== 0) return;
        if (currentTreeMode) e.preventDefault();

        if (currentTreeMode === 'multi') {
            isDragging = true;
            map.dragPan.disable();
            placeTree(e.lngLat, null, map);
            lastTreePosition = e.lngLat;
        } else if (currentTreeMode === 'delete') {
            isDragging = true;
            map.dragPan.disable();
            deleteTreesAtPoint(e.point, map);
        }
    });

    map.on('mousemove', throttle((e) => {
        if (!isDragging) return;
        if (currentTreeMode === 'multi') {
            const distance = turf.distance(
                [lastTreePosition.lng, lastTreePosition.lat],
                [e.lngLat.lng, e.lngLat.lat],
                { units: 'meters' }
            );
            const minDistance = document.getElementById('tree-distance').value;
            if (distance > minDistance) {
                placeTree(e.lngLat, null, map);
                lastTreePosition = e.lngLat;
            }
        } else if (currentTreeMode === 'delete') {
            deleteTreesAtPoint(e.point, map);
        }
    }, 100));

    map.on('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            lastTreePosition = null;
            if (!currentTreeMode) {
                map.dragPan.enable();
            }
        }
        if (currentTreeMode !== 'multi' && currentTreeMode !== 'delete') {
            map.dragPan.enable();
        }
    });
}

export function isTreeModeActive() {
    return currentTreeMode !== null;
}

// Exporting for legacy support in addGeoJsonToMap
export { placeTree, setTreeMode };
