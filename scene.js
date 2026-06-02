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
    var scene = new BABYLON.Scene(engine);

    var camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 10, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);

    scene.ambientColor = new BABYLON.Color3(0.55, 0.3, 0.3);
    scene.clearColor   = new BABYLON.Color3(0.12, 0.12, 0.5);
    scene.fogMode  = BABYLON.Scene.FOGMODE_LINEAR;
    scene.fogStart = 20.0;
    scene.fogEnd   = 60.0;
    new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

    // ─── Scroll driver ───────────────────────────────────────────────────────
    var scrollProgress = 0;
    var FORMED_THRESHOLD = 0.98; // scroll fraction at which we consider the room "done"

    var scroller = document.createElement("div");
    scroller.id = "scroll-driver";
    scroller.style.cssText = [
        "position:fixed", "top:0", "left:0",
        "width:100%", "height:100%",
        "overflow-y:scroll",
        "z-index:10",
        "pointer-events:auto",
    ].join(";");

    var inner = document.createElement("div");
    inner.style.cssText = "height:400vh;width:100%;";

    var hint = document.createElement("div");
    hint.innerText = "↓ scroll to form the room";
    hint.style.cssText = [
        "position:sticky", "top:20px",
        "text-align:center",
        "color:rgba(255,255,255,0.55)",
        "font-family:sans-serif", "font-size:14px",
        "letter-spacing:0.08em",
        "pointer-events:none", "user-select:none",
        "padding-top:20px",
        "transition:opacity 0.4s",
    ].join(";");

    // "drag to orbit" hint shown once room is formed
    var orbitHint = document.createElement("div");
    orbitHint.innerText = "drag to orbit · scroll up to scatter";
    orbitHint.style.cssText = [
        "position:fixed", "bottom:24px", "left:0", "right:0",
        "text-align:center",
        "color:rgba(255,255,255,0.45)",
        "font-family:sans-serif", "font-size:13px",
        "letter-spacing:0.08em",
        "pointer-events:none", "user-select:none",
        "opacity:0", "transition:opacity 0.6s",
        "z-index:20",
    ].join(";");

    inner.appendChild(hint);
    scroller.appendChild(inner);
    document.body.appendChild(scroller);
    document.body.appendChild(orbitHint);

    canvas.style.cssText += ";position:fixed;top:0;left:0;width:100%;height:100%;z-index:1;";
    document.body.style.overflow = "hidden";
    document.body.style.margin   = "0";

    // ─── Mode switching ───────────────────────────────────────────────────────
    // "scroll" mode  → scroller captures all pointer events, camera is detached
    // "orbit"  mode  → canvas captures pointer events, camera is attached
    var mode = "scroll";

    function enterOrbitMode() {
        if (mode === "orbit") return;
        mode = "orbit";
        // Let pointer events pass straight through to the canvas
        scroller.style.pointerEvents = "none";
        camera.attachControl(canvas, true);
        orbitHint.style.opacity = "1";
        hint.style.opacity = "0";
    }

    function enterScrollMode() {
        if (mode === "scroll") return;
        mode = "scroll";
        scroller.style.pointerEvents = "auto";
        camera.detachControl();
        orbitHint.style.opacity = "0";
    }

    // While in orbit mode we still want the mouse-wheel to scroll the hidden
    // scroller so the user can scroll back up to scatter the room.
    canvas.addEventListener("wheel", function (e) {
        if (mode !== "orbit") return;
        // If scrolling up, hand control back to the scroller
        if (e.deltaY < 0) {
            enterScrollMode();
            // Nudge the scroller slightly so the scroll event registers
            scroller.scrollTop = Math.max(0, scroller.scrollTop - 80);
        }
    }, { passive: true });

    scroller.addEventListener("scroll", function () {
        var maxScroll = scroller.scrollHeight - scroller.clientHeight;
        scrollProgress = maxScroll > 0 ? scroller.scrollTop / maxScroll : 0;

        if (scrollProgress > 0.02) hint.style.opacity = "0";
        else hint.style.opacity = "1";

        // Hand off to orbit mode once room is fully formed
        if (scrollProgress >= FORMED_THRESHOLD) {
            enterOrbitMode();
        } else {
            // If the user scrolls back up from orbit mode, re-enter scroll mode
            if (mode === "orbit") enterScrollMode();
        }
    }, { passive: true });

    // ─── Easing ───────────────────────────────────────────────────────────────
    function easeOutCubic(t) { var u = 1 - t; return 1 - u * u * u; }

    // ─── Point cloud ─────────────────────────────────────────────────────────
    var pcs           = null;
    var homePositions = [];
    var offsets       = [];
    var DISPERSE_RADIUS = 18;
    var ready = false;

    BABYLON.ImportMeshAsync("room(1).glb", scene).then(function ({ meshes }) {
        meshes[0].position = new BABYLON.Vector3(0, 0, 0);

        pcs = new BABYLON.PointsCloudSystem("pcs", 0.0001, scene);
        const pointsPerMesh = Math.floor(150000 / Math.max(meshes.length, 1));

        for (let i = 0; i < meshes.length; i++) {
            if (meshes[i].getTotalVertices() > 0) {
                pcs.addSurfacePoints(meshes[i], pointsPerMesh, BABYLON.PointColor.Color);
            }
        }

        pcs.buildMeshAsync().then(() => {
            for (let i = 0; i < meshes.length; i++) meshes[i].isVisible = false;

            if (pcs.mesh && pcs.mesh.material) {
                pcs.mesh.material.emissiveColor = new BABYLON.Color3(1, 1, 1);
                pcs.mesh.material.pointsCloud   = true;
                pcs.mesh.material.pointSize     = 2;
            }

            for (let i = 0; i < pcs.particles.length; i++) {
                homePositions[i] = pcs.particles[i].position.clone();
                const theta = Math.random() * Math.PI * 2;
                const phi   = Math.acos(2 * Math.random() - 1);
                offsets[i] = new BABYLON.Vector3(
                    Math.sin(phi) * Math.cos(theta) * DISPERSE_RADIUS,
                    Math.sin(phi) * Math.sin(theta) * DISPERSE_RADIUS,
                    Math.cos(phi)                   * DISPERSE_RADIUS
                );
                pcs.particles[i].position.addInPlace(offsets[i]);
            }
            pcs.setParticles();
            ready = true;
        });
    });

    var time = 0;

    scene.registerBeforeRender(function () {
        if (!ready) return;
        time += 0.005;

        var ease = easeOutCubic(Math.min(scrollProgress, 1));

        // Once fully formed and in orbit mode, skip particle updates entirely
        // so we don't waste GPU cycles every frame
        if (mode === "orbit" && scrollProgress >= 1) return;

        pcs.updateParticle = function (particle) {
            var home  = homePositions[particle.idx];
            var off   = offsets[particle.idx];
            var drift = (1 - ease) * 0.04;
            particle.position.x = home.x + off.x * (1 - ease) + Math.cos(time + particle.idx * 0.013) * drift;
            particle.position.y = home.y + off.y * (1 - ease) + Math.sin(time + particle.idx * 0.010) * drift;
            particle.position.z = home.z + off.z * (1 - ease);
        };
        pcs.setParticles();
    });

    return scene;
};

window.addEventListener("resize", function () { engine.resize(); });