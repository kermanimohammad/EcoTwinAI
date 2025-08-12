export let buildingData = { type: 'FeatureCollection', features: [] };
export let treeTrunkData = { type: 'FeatureCollection', features: [] };
export let treeCanopyData = { type: 'FeatureCollection', features: [] };
export let treeIdCounter = 0;

// Since we are exporting the variables themselves, other modules can import and modify their properties (like .features).
// However, reassigning the whole object (e.g. `buildingData = ...`) won't work from another module.
// So, we provide setter functions for reassignment, which is needed in reset().

export function setBuildingData(data) {
    buildingData = data;
}

export function setTreeTrunkData(data) {
    treeTrunkData = data;
}

export function setTreeCanopyData(data) {
    treeCanopyData = data;
}

export function incrementTreeId() {
    treeIdCounter++;
}

export function getTreeId() {
    return `tree-${treeIdCounter}`;
}

export function resetTreeCounter() {
    treeIdCounter = 0;
}
