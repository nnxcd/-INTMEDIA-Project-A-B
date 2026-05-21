// Set up the canvas and engine globally
var canvas = document.getElementById("renderCanvas");
var engine = new BABYLON.Engine(canvas, true);

// FIX #1: Enable sharp rendering on Retina / High-DPI displays
engine.setHardwareScalingLevel(1.0 / window.devicePixelRatio);

// Start button event listener
document.getElementById("start-btn").addEventListener("click", () => {
    // 1. Hide the HTML menu
    document.getElementById("html-screen").style.display = "none";
    
    // 2. Show the 3D canvas
    canvas.style.display = "block";

    // FIX #2: Force Babylon to recalculate the resolution now that the canvas is visible
    engine.resize();

    // 3. Generate the scene
    var activeScene = createScene(); 

    // 4. Start the render loop
    engine.runRenderLoop(function () {
        activeScene.render();
    });
});

// starting the scene, LEAVE THIS ALONE
var createScene = function () {
    
    //first scene
    var firstScene = new BABYLON.Scene(engine);
    firstScene.clearColor = new BABYLON.Color3(0.55, 0.03, 0.55);
    var firstSceneCamera = new BABYLON.ArcRotateCamera("firstSceneCamera", 0, 0, 10, new BABYLON.Vector3(0,0, -0), firstScene);
    firstSceneCamera.attachControl(canvas, true);
    var firstSceneLight = new BABYLON.PointLight("firstSceneLight", new BABYLON.Vector3(5, 5, -5));
    firstSceneLight.intensity = 0.75;
    firstSceneLight.specular = new BABYLON.Color3(0.95, 0.95, 0.81);
    
    var firstSceneObject = BABYLON.MeshBuilder.CreateTorusKnot("scene0Object", {radius: 3, tube: 1}, firstScene);
    
    //second scene
    var Secondscene = new BABYLON.Scene(engine);

    var camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 10, BABYLON.Vector3.Zero(), Secondscene);
    camera.attachControl(canvas, true);
    
    //this is to change background color
    Secondscene.ambientColor = new BABYLON.Color3(0.55, 0.3, 0.3);
    Secondscene.clearColor = new BABYLON.Color3(0.2, 0.2, 0.9);
    //this is to add fog
    Secondscene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
    Secondscene.fogStart = 20.0;
    Secondscene.fogEnd = 60.0;

    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), Secondscene);

    BABYLON.ImportMeshAsync("room(1).glb", Secondscene).then(function({meshes}) {
        meshes[0].position = new BABYLON.Vector3(0, 0, 0);
    });

    return Secondscene;
    
};

// Ensure the canvas resizes correctly if the user adjusts their browser window
window.addEventListener("resize", function () {
    engine.resize();
});