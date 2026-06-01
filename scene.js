// Set up the canvas and engine globally
var canvas = document.getElementById("renderCanvas");
var engine = new BABYLON.Engine(canvas, true);

engine.setHardwareScalingLevel(1.0 / window.devicePixelRatio);

document.getElementById("start-btn").addEventListener("click", () => {
    document.getElementById("html-screen").style.display = "none";
    canvas.style.display = "block";
    engine.resize();

    var activeScene = createScene();

    engine.runRenderLoop(function () {
        activeScene.render();
    });
});

var createScene = function () {

    // --- First Scene (unchanged) ---
    var firstScene = new BABYLON.Scene(engine);
    firstScene.clearColor = new BABYLON.Color3(0.55, 0.03, 0.55);
    var firstSceneCamera = new BABYLON.ArcRotateCamera("firstSceneCamera", 0, 0, 10, new BABYLON.Vector3(0, 0, 0), firstScene);
    firstSceneCamera.attachControl(canvas, true);
    var firstSceneLight = new BABYLON.PointLight("firstSceneLight", new BABYLON.Vector3(5, 5, -5));
    firstSceneLight.intensity = 0.75;
    firstSceneLight.specular = new BABYLON.Color3(0.95, 0.95, 0.81);
    var firstSceneObject = BABYLON.MeshBuilder.CreateTorusKnot("scene0Object", { radius: 3, tube: 1 }, firstScene);

    // --- Second Scene (point cloud version) ---
    var Secondscene = new BABYLON.Scene(engine);

    var camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 10, BABYLON.Vector3.Zero(), Secondscene);
    camera.attachControl(canvas, true);

    Secondscene.ambientColor = new BABYLON.Color3(0.55, 0.3, 0.3); 
    Secondscene.clearColor = new BABYLON.Color3(0.12, 0.12, 0.5); // blue background

    // No fog needed for point cloud aesthetic, but keep if you like:
    Secondscene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
    Secondscene.fogStart = 20.0;
    Secondscene.fogEnd = 60.0;

    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), Secondscene);

    // Store PCS reference so we can animate it
    var pcs = null;

    BABYLON.ImportMeshAsync("room(1).glb", Secondscene).then(function ({ meshes }) {
        meshes[0].position = new BABYLON.Vector3(0, 0, 0);

        // --- Point Cloud Setup ---
        // Particle size (2nd arg): smaller = finer dot cloud, larger = chunkier
        pcs = new BABYLON.PointsCloudSystem("pcs", 0.0001, Secondscene);

        // Loop over all loaded meshes and sample points from each surface
        // 50000 total points — raise for denser cloud, lower for better perf
        const pointsPerMesh = Math.floor(150000 / Math.max(meshes.length, 1));

        for (let i = 0; i < meshes.length; i++) {
            const m = meshes[i];
            if (m.getTotalVertices() > 0) {
                // BABYLON.PointColor.Color = use the mesh's own texture/vertex colours
                // BABYLON.PointColor.Random = random colours per point (p5.js style)
                // BABYLON.PointColor.Stated = use a single colour you pass in
                pcs.addSurfacePoints(m, pointsPerMesh, BABYLON.PointColor.Color);
            }
        }

        // Build the point cloud mesh, then hide the original geometry
        pcs.buildMeshAsync().then(() => {
            // Hide all original meshes — only the point cloud remains
            for (let i = 0; i < meshes.length; i++) {
                meshes[i].isVisible = false;
            }

            // Optional: give the point cloud mesh a slight emissive glow
            if (pcs.mesh && pcs.mesh.material) {
                pcs.mesh.material.emissiveColor = new BABYLON.Color3(1, 1, 1);
                pcs.mesh.material.pointsCloud = true; // ensure rendered as points
                pcs.mesh.material.pointSize = 2;      // GPU-level point size (if supported)
            }
        });
    });

    // --- Optional: subtle floating drift animation ---
    // Each point drifts slightly on each frame, like the p5.js reference
    var time = 0;
    Secondscene.registerBeforeRender(function () {
        if (!pcs || !pcs.mesh) return;
        time += 0.005;

        pcs.updateParticle = function (particle) {
            // Gentle sine-wave drift in Y based on particle index
            // Gives a "breathing" / floating feel without losing the shape
            particle.position.y += Math.sin(time + particle.idx * 0.01) * 0.0005;
            particle.position.x += Math.cos(time + particle.idx * 0.013) * 0.0002;
        };

        pcs.setParticles();
    });

    return Secondscene;
};

window.addEventListener("resize", function () {
    engine.resize();
});