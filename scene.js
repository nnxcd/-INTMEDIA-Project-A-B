var canvas = document.getElementById("renderCanvas");
var engine = new BABYLON.Engine(canvas, true);

var createScene = function () {
    var scene = new BABYLON.Scene(engine);

    var camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 10, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    
    //this is to change background color
    scene.ambientColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    scene.clearColor = new BABYLON.Color3(0.5, 0.8, 0.5);
    //this is to add fog
    scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
    scene.fogStart = 20.0;
    scene.fogEnd = 60.0;




    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

    BABYLON.ImportMeshAsync("room(1).glb", scene).then(function({meshes}) {
        meshes[0].position = new BABYLON.Vector3(0, 0, 0);
    });

    return scene;
};

var scene = createScene();

engine.runRenderLoop(function () {
    scene.render();
});

window.addEventListener("resize", function () {
    engine.resize();
});