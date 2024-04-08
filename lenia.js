AFRAME.registerComponent('random-spheres', {
    schema: {
        count: {type: 'int', default: 10}, // Number of spheres to generate
        grid: {type: 'vec3', default: {x: 1, y: 1, z: 1}} // Size of the grid
    },
    init: function() {
        // Object to hold occupied positions to ensure spheres do not overlap
        let occupiedPositions = {};

        for (let i = 0; i < this.data.count; i++) {
            // Generate random positions within the grid
            let x = Math.random() * this.data.grid.x - this.data.grid.x / 2;
            let y = Math.random() * this.data.grid.y - this.data.grid.y / 2;
            let z = Math.random() * this.data.grid.z - this.data.grid.z / 2;
            let positionKey = `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`;

            // Check if the position is already occupied
            if (!occupiedPositions[positionKey]) {
                occupiedPositions[positionKey] = true;

                // Create a sphere entity
                let sphere = document.createElement('a-sphere');
                sphere.setAttribute('position', {x: x, y: y, z: z});
                sphere.setAttribute('radius', this.data.grid.x*0.15); // Set a fixed radius for visibility
                sphere.setAttribute('color', '#FF0000'); // Set a bright color for visibility

                // Attach the sphere to the scene
                this.el.appendChild(sphere);
            }
        }
    }
});

// lenia.js

// Gaussian kernel function
function gaussianKernel(r, kernelRadius) {
  const sigma = kernelRadius / 3;
  return Math.exp(-Math.pow(r, 2) / (2 * sigma * sigma));
}

// Gaussian-based growth mapping function
function gaussianGrowth(u, mu, sigma) {
  const exponent = -Math.pow(u - mu, 2) / (2 * sigma * sigma);
  return 1 - Math.exp(exponent);
}

// Calculate convolution for a sphere using the kernel
function calculateConvolution(sphere, spheres, kernelRadius) {
  let totalInfluence = 0;
  const spherePosition = new THREE.Vector3().copy(sphere.object3D.position);

  spheres.forEach((neighbor) => {
    const neighborPosition = new THREE.Vector3().copy(neighbor.object3D.position);
    const distance = spherePosition.distanceTo(neighborPosition);
    totalInfluence += gaussianKernel(distance, kernelRadius);
  });

  return totalInfluence;
}

// Update the state and visual appearance of a sphere
function updateSphereState(sphere, state) {
  const intensity = Math.floor(state * 255);
  const color = `rgb(${intensity}, ${intensity}, ${intensity})`;
  sphere.setAttribute('material', 'color', color);
  sphere.setAttribute('material', 'opacity', state);
  sphere.object3D.visible = state > 0.01;
}

// Update states for all spheres based on the Lenia rules
function updateStates(spheres, kernelRadius, mu, sigma) {
  const newStates = spheres.map((sphere) => {
    const convolutionResult = calculateConvolution(sphere, spheres, kernelRadius);
    return gaussianGrowth(convolutionResult, mu, sigma);
  });

  spheres.forEach((sphere, index) => {
    updateSphereState(sphere, newStates[index]);
  });
}

// A-Frame component for the Lenia simulation
AFRAME.registerComponent('lenia-spheres', {
  schema: {
    kernelRadius: { type: 'number', default: 2 }, // Assuming average distance is around 2 units
    mu: { type: 'number', default: 0.3 }, // Slightly off the center to induce dynamics
    sigma: { type: 'number', default: 0.1 }, // For a sharper growth curve
    count: { type: 'int', default: 10 },
    grid: { type: 'vec3', default: { x: 10, y: 10, z: 10 } } // Adjust grid size as needed
  },

  init: function () {
    this.spheres = [];
    this.generateSpheres();
    // Initialize state for each sphere
    this.states = new Array(this.data.count).fill(0.5); // Start with a mid-range state
  },

  tick: function (time, timeDelta) {
    // Perform updates at a controlled rate
    updateStates(this.spheres, this.states, this.data.kernelRadius, this.data.mu, this.data.sigma);
  },

  generateSpheres: function () {
    const grid = this.data.grid;
    for (let i = 0; i < this.data.count; i++) {
      const x = (Math.random() * grid.x) - (grid.x / 2);
      const y = (Math.random() * grid.y) - (grid.y / 2);
      const z = (Math.random() * grid.z) - (grid.z / 2);

      const sphere = document.createElement('a-sphere');
      sphere.setAttribute('position', { x: x, y: y, z: z });
      sphere.setAttribute('radius', grid.x * 0.15); // Adjust size as needed
      sphere.setAttribute('color', '#FFFFFF'); // Default color

      this.el.sceneEl.appendChild(sphere);
      this.spheres.push(sphere);
    }
  }
});

function updateStates(spheres, states, kernelRadius, mu, sigma) {
  const newStates = spheres.map((sphere, index) => {
    const state = states[index];
    const convolutionResult = calculateConvolution(sphere, spheres, kernelRadius, states);
    return gaussianGrowth(convolutionResult, mu, sigma); // directly set new state
  });

  // Update spheres with the new states
  spheres.forEach((sphere, index) => {
    const newState = Math.max(0, Math.min(newStates[index], 1)); // Clamp new state between 0 and 1
    if (states[index] !== newState) {
      updateSphereState(sphere, newState);
      states[index] = newState; // Save new state
    }
  });
}

function calculateConvolution(sphere, spheres, kernelRadius, states) {
  let totalInfluence = 0;
  const spherePosition = sphere.object3D.position;

  spheres.forEach((neighbor, index) => {
    if (neighbor !== sphere) {
      const neighborState = states[index];
      const neighborPosition = neighbor.object3D.position;
      const distance = spherePosition.distanceTo(neighborPosition);
      totalInfluence += neighborState * gaussianKernel(distance, kernelRadius);
    }
  });

  return totalInfluence; // Do not normalize here, as it could dampen the effect of the convolution
}
