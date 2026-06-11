// scene.js — Three.js point cloud, colours preserved from GLB materials

document.getElementById("start-btn").addEventListener("click", () => {
    document.getElementById("html-screen").style.display = "none";
    initScene();
});

function initScene() {
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x020202);
    renderer.domElement.style.cssText =
        "position:fixed;top:0;left:0;width:100%;height:100%;z-index:1;";
    document.body.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enabled = false;

    // ── Text overlay ──────────────────────────────────────────────────────────
    const TEXT = "If given the chance to look at all possibilities in your life, what would you pick? If you could retrieve every single memory and feeling you've had with absolutely clarity, would you want that? Would you love something to keep it with you forever, or let it wither against the throes of time. ";

    // Backdrop — full-screen dark wash, click anywhere on it to dismiss
    const textOverlay = document.createElement("div");
    textOverlay.style.cssText = [
        "position:fixed","top:0","left:0","width:100%","height:100%",
        "z-index:15",
        "display:flex","align-items:center","justify-content:center",
        "padding:60px 40px",
        "pointer-events:none",
        "opacity:0",
        "transition:opacity 1.5s ease",
        "background:rgba(2,2,2,0)",
        "cursor:pointer"
    ].join(";");

    // Paragraph — stops click from bubbling so tapping the text itself doesn't dismiss
    const textPara = document.createElement("p");
    textPara.style.cssText = [
        "max-width:560px",
        "font-family:Georgia,serif",
        "font-size:16px",
        "line-height:2",
        "color:#e8e0d8",
        "text-align:left",
        "cursor:default",
        "user-select:none"
    ].join(";");

    TEXT.split(" ").forEach(w => {
        if (!w.trim()) return;
        const span = document.createElement("span");
        span.className = "word";
        span.textContent = w;
        span.style.cssText = "display:inline-block;position:relative;will-change:transform;margin-right:0.28em;";
        textPara.appendChild(span);
    });

    textOverlay.appendChild(textPara);
    document.body.appendChild(textOverlay);

    // ── Start Again button ────────────────────────────────────────────────────
    const startAgainBtn = document.createElement("button");
    startAgainBtn.innerText = "start again";
    startAgainBtn.style.cssText = [
        "position:fixed","top:28px","left:32px",
        "z-index:20",
        "font-family:'Miss Fajardose', cursive",
        "font-size:1.5rem",
        "letter-spacing:0.1em",
        "color:rgba(232,224,216,0.75)",
        "background:none",
        "border:none",
        "padding:0",
        "cursor:pointer",
        "pointer-events:none",
        "opacity:0",
        "transition:opacity 1.5s ease, color 0.3s"
    ].join(";");

    startAgainBtn.addEventListener("mouseenter", () => {
        startAgainBtn.style.color = "rgba(232,224,216,1)";
    });
    startAgainBtn.addEventListener("mouseleave", () => {
        startAgainBtn.style.color = "rgba(232,224,216,0.75)";
    });
    startAgainBtn.addEventListener("click", () => {
        window.location.href = "index.html";
    });

    document.body.appendChild(startAgainBtn);

    // ── Text state ────────────────────────────────────────────────────────────
    let textVisible   = false;
    let textTimerSet  = false;   // true once the 4 s timer has been started
    let roomFormedAt  = null;    // timestamp when room first hit FORMED_THRESHOLD
    const TEXT_DELAY_MS = 4000;  // wait 4 s after room forms before fading text in

    function showText() {
        if (textVisible) return;
        textVisible = true;
        textOverlay.style.pointerEvents = "auto";
        // Slight dark wash so Georgia type is legible over the point cloud
        textOverlay.style.background    = "rgba(2,2,2,0.38)";
        textOverlay.style.opacity       = "1";
        // Show the Start Again button — it stays visible even after text is dismissed
        startAgainBtn.style.opacity       = "1";
        startAgainBtn.style.pointerEvents = "auto";
    }

    function hideText() {
        if (!textVisible) return;
        textVisible  = false;
        textTimerSet = false;   // allow it to reappear if user scrolls away and back
        roomFormedAt = null;
        textOverlay.style.pointerEvents = "none";
        textOverlay.style.background    = "rgba(2,2,2,0)";
        textOverlay.style.opacity       = "0";
        // Reset word positions
        textPara.querySelectorAll(".word").forEach(w => {
            w.style.transform  = "translate(0,0)";
            w.style.transition = "transform 0.6s cubic-bezier(0.23,1,0.32,1)";
        });
        // startAgainBtn stays visible — intentionally not hidden here
    }

    // Click backdrop (outside the paragraph) → dismiss
    textOverlay.addEventListener("click", e => {
        if (e.target !== textPara && !textPara.contains(e.target)) {
            hideText();
        }
    });

    // Stop paragraph clicks from reaching the backdrop
    textPara.addEventListener("click", e => e.stopPropagation());

    // ── Word repulsion ────────────────────────────────────────────────────────
    const RADIUS   = 90;
    const STRENGTH = 28;

    textOverlay.addEventListener("mousemove", e => {
        if (!textVisible) return;
        const rect = textOverlay.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        textPara.querySelectorAll(".word").forEach(word => {
            const wr = word.getBoundingClientRect();
            const wx = wr.left + wr.width  / 2 - rect.left;
            const wy = wr.top  + wr.height / 2 - rect.top;
            const dx = wx - mx;
            const dy = wy - my;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < RADIUS) {
                const force = 1 - dist / RADIUS;
                const tx = (dx / dist) * force * STRENGTH;
                const ty = (dy / dist) * force * STRENGTH;
                word.style.transform  = `translate(${tx}px,${ty}px)`;
                word.style.transition = "transform 0.15s ease-out";
            } else {
                word.style.transform  = "translate(0,0)";
                word.style.transition = "transform 0.6s cubic-bezier(0.23,1,0.32,1)";
            }
        });
    });

    textOverlay.addEventListener("mouseleave", () => {
        textPara.querySelectorAll(".word").forEach(word => {
            word.style.transform  = "translate(0,0)";
            word.style.transition = "transform 0.8s cubic-bezier(0.23,1,0.32,1)";
        });
    });

    // ── Scroll driver ─────────────────────────────────────────────────────────
    let scrollProgress = 0;
    let mode = "scroll";
    const FORMED_THRESHOLD = 0.98;
    const DISPERSE_RADIUS  = 5;

    const scroller = document.createElement("div");
    scroller.style.cssText = [
        "position:fixed","top:0","left:0","width:100%","height:100%",
        "overflow-y:scroll","z-index:10","pointer-events:auto"
    ].join(";");
    const inner = document.createElement("div");
    inner.style.cssText = "height:400vh;width:100%;";

    const hint = document.createElement("div");
    hint.innerText = "↓ Scroll to form your room";
    hint.style.cssText = [
        "position:sticky","top:20px","text-align:center",
        "color:rgba(255,255,255,0.55)","font-family:Georgia,serif",
        "font-size:15px","letter-spacing:0.08em",
        "pointer-events:none","user-select:none",
        "padding-top:20px","transition:opacity 0.4s"
    ].join(";");

    const orbitHint = document.createElement("div");
    orbitHint.innerText = "Drag to orbit your view";
    orbitHint.style.cssText = [
        "position:fixed","bottom:24px","left:0","right:0",
        "text-align:center","color:rgba(255,255,255,0.45)",
        "font-family:Georgia,serif","font-size:20px","letter-spacing:0.08em",
        "pointer-events:none","user-select:none",
        "opacity:0","transition:opacity 0.6s","z-index:20"
    ].join(";");

    inner.appendChild(hint);
    scroller.appendChild(inner);
    document.body.appendChild(scroller);
    document.body.appendChild(orbitHint);
    document.body.style.overflow = "hidden";
    document.body.style.margin   = "0";

    renderer.domElement.addEventListener("wheel", e => {
        e.preventDefault();
        e.stopImmediatePropagation();
    }, { passive: false });

    function enterOrbitMode() {
        if (mode === "orbit") return;
        mode = "orbit";
        if (scroller.parentNode) scroller.parentNode.removeChild(scroller);
        controls.enabled = true;
        orbitHint.style.opacity = "1";
        hint.style.opacity = "0";
        renderer.domElement.addEventListener("wheel", function onWheel(e) {
            e.preventDefault();
            if (e.deltaY < 0) {
                enterScrollMode();
                renderer.domElement.removeEventListener("wheel", onWheel);
            }
        }, { passive: false });
    }

    function enterScrollMode() {
        if (mode === "scroll") return;
        mode = "scroll";
        controls.enabled = false;
        orbitHint.style.opacity = "0";
        scrollProgress = 0.95;
        hideText();   // dismiss text when user scrolls back to reform mode
        const ns = document.createElement("div");
        ns.style.cssText = scroller.style.cssText;
        const ni = document.createElement("div");
        ni.style.cssText = "height:400vh;width:100%;";
        ns.appendChild(ni);
        document.body.appendChild(ns);
        ns.scrollTop = (ns.scrollHeight - ns.clientHeight) * 0.95;
        ns.addEventListener("scroll", () => {
            const max = ns.scrollHeight - ns.clientHeight;
            scrollProgress = max > 0 ? ns.scrollTop / max : 0;
            hint.style.opacity = scrollProgress > 0.02 ? "0" : "1";
            if (scrollProgress >= FORMED_THRESHOLD) enterOrbitMode();
        }, { passive: true });
    }

    scroller.addEventListener("scroll", () => {
        const max = scroller.scrollHeight - scroller.clientHeight;
        scrollProgress = max > 0 ? scroller.scrollTop / max : 0;
        hint.style.opacity = scrollProgress > 0.02 ? "0" : "1";
        if (scrollProgress >= FORMED_THRESHOLD) enterOrbitMode();
    }, { passive: true });

    // ── Room-formed timer: called from the render loop ────────────────────────
    function tickTextTimer() {
        if (textTimerSet || textVisible) return;
        if (mode !== "orbit") return;   // only start timing once in orbit mode
        if (roomFormedAt === null) {
            roomFormedAt = performance.now();
            return;
        }
        if (performance.now() - roomFormedAt >= TEXT_DELAY_MS) {
            textTimerSet = true;
            showText();
        }
    }

    function easeOutCubic(t) { const u = 1 - t; return 1 - u * u * u; }

    // ── Colour helpers ────────────────────────────────────────────────────────
    function getMaterialColor(mesh) {
        const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        if (!mat) return [1, 1, 1];
        if (mat.color) return [mat.color.r, mat.color.g, mat.color.b];
        return [1, 1, 1];
    }

    const texCache = new Map();
    function getTexCtx(texture) {
        if (texCache.has(texture.uuid)) return texCache.get(texture.uuid);
        const img = texture.image;
        if (!img || (!img.width && !img.videoWidth)) return null;
        const w = img.naturalWidth  || img.width       || img.videoWidth  || 1;
        const h = img.naturalHeight || img.height      || img.videoHeight || 1;
        const cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        const ctx = cv.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        texCache.set(texture.uuid, { ctx, w, h });
        return { ctx, w, h };
    }

    function sampleTexture(texture, u, v) {
        const tc = getTexCtx(texture);
        if (!tc) return null;
        u = ((u % 1) + 1) % 1;
        v = ((v % 1) + 1) % 1;
        const px = Math.floor(u * tc.w);
        const py = Math.floor((1 - v) * tc.h);
        try {
            const d = tc.ctx.getImageData(px, py, 1, 1).data;
            return [d[0] / 255, d[1] / 255, d[2] / 255];
        } catch(e) { return null; }
    }

    // ── Point cloud state ─────────────────────────────────────────────────────
    let pointMesh = null;
    let homePos   = null;
    let offsetPos = null;
    let ready     = false;
    let time      = 0;

    // ── Load GLB ──────────────────────────────────────────────────────────────
    const loader = new THREE.GLTFLoader();
    loader.load("room(1).glb", (gltf) => {

        const positionArrays = [];
        const colorArrays    = [];
        let totalVerts = 0;

        gltf.scene.traverse((child) => {
            if (!child.isMesh) return;
            const geo = child.geometry;
            if (!geo.attributes.position) return;

            child.updateWorldMatrix(true, false);
            const posAttr = geo.attributes.position;
            const uvAttr  = geo.attributes.uv;
            const colAttr = geo.attributes.color;
            const count   = posAttr.count;

            const worldPos = new Float32Array(count * 3);
            const tmpVec   = new THREE.Vector3();
            for (let i = 0; i < count; i++) {
                tmpVec.fromBufferAttribute(posAttr, i).applyMatrix4(child.matrixWorld);
                worldPos[i * 3]     = tmpVec.x;
                worldPos[i * 3 + 1] = tmpVec.y;
                worldPos[i * 3 + 2] = tmpVec.z;
            }
            positionArrays.push(worldPos);

            const meshCol   = new Float32Array(count * 3);
            const mat       = Array.isArray(child.material) ? child.material[0] : child.material;
            const map       = mat && mat.map ? mat.map : null;
            const baseColor = getMaterialColor(child);

            for (let i = 0; i < count; i++) {
                let r, g, b;
                if (colAttr) {
                    r = colAttr.getX(i); g = colAttr.getY(i); b = colAttr.getZ(i);
                } else if (map && uvAttr) {
                    const u = uvAttr.getX(i);
                    const v = uvAttr.getY(i);
                    const sampled = sampleTexture(map, u, v);
                    if (sampled) {
                        r = sampled[0] * baseColor[0];
                        g = sampled[1] * baseColor[1];
                        b = sampled[2] * baseColor[2];
                    } else {
                        r = baseColor[0]; g = baseColor[1]; b = baseColor[2];
                    }
                } else {
                    r = baseColor[0]; g = baseColor[1]; b = baseColor[2];
                }
                meshCol[i * 3] = r; meshCol[i * 3 + 1] = g; meshCol[i * 3 + 2] = b;
            }

            colorArrays.push(meshCol);
            totalVerts += count;
        });

        const MAX_PTS = 150000;
        const step    = Math.max(1, Math.floor(totalVerts / MAX_PTS));

        const allPos = new Float32Array(totalVerts * 3);
        const allCol = new Float32Array(totalVerts * 3);
        let ptr = 0;
        for (let a = 0; a < positionArrays.length; a++) {
            allPos.set(positionArrays[a], ptr);
            allCol.set(colorArrays[a],    ptr);
            ptr += positionArrays[a].length;
        }

        const usedCount  = Math.ceil(totalVerts / step);
        const sampledPos = new Float32Array(usedCount * 3);
        const sampledCol = new Float32Array(usedCount * 3);
        for (let i = 0, o = 0; i < totalVerts; i += step, o++) {
            sampledPos[o * 3]     = allPos[i * 3];
            sampledPos[o * 3 + 1] = allPos[i * 3 + 1];
            sampledPos[o * 3 + 2] = allPos[i * 3 + 2];
            sampledCol[o * 3]     = allCol[i * 3];
            sampledCol[o * 3 + 1] = allCol[i * 3 + 1];
            sampledCol[o * 3 + 2] = allCol[i * 3 + 2];
        }

        let cx = 0, cy = 0, cz = 0;
        for (let i = 0; i < usedCount; i++) {
            cx += sampledPos[i * 3];
            cy += sampledPos[i * 3 + 1];
            cz += sampledPos[i * 3 + 2];
        }
        cx /= usedCount; cy /= usedCount; cz /= usedCount;
        for (let i = 0; i < usedCount; i++) {
            sampledPos[i * 3]     -= cx;
            sampledPos[i * 3 + 1] -= cy;
            sampledPos[i * 3 + 2] -= cz;
        }

        homePos   = sampledPos.slice();
        offsetPos = new Float32Array(usedCount * 3);
        for (let i = 0; i < usedCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi   = Math.acos(2 * Math.random() - 1);
            offsetPos[i * 3]     = Math.sin(phi) * Math.cos(theta) * DISPERSE_RADIUS;
            offsetPos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * DISPERSE_RADIUS;
            offsetPos[i * 3 + 2] = Math.cos(phi)                   * DISPERSE_RADIUS;
        }

        const geo = new THREE.BufferGeometry();
        const posAttrBuf = new THREE.BufferAttribute(sampledPos.slice(), 3);
        posAttrBuf.setUsage(THREE.DynamicDrawUsage);
        geo.setAttribute("position", posAttrBuf);
        geo.setAttribute("color",    new THREE.BufferAttribute(sampledCol, 3));

        const mat = new THREE.PointsMaterial({
            size:            0.02,
            vertexColors:    true,
            sizeAttenuation: true,
        });

        pointMesh = new THREE.Points(geo, mat);
        scene.add(pointMesh);

        for (let i = 0; i < usedCount; i++) {
            posAttrBuf.array[i * 3]     = homePos[i * 3]     + offsetPos[i * 3];
            posAttrBuf.array[i * 3 + 1] = homePos[i * 3 + 1] + offsetPos[i * 3 + 1];
            posAttrBuf.array[i * 3 + 2] = homePos[i * 3 + 2] + offsetPos[i * 3 + 2];
        }
        posAttrBuf.needsUpdate = true;
        ready = true;
    },
    undefined,
    (err) => console.error("GLB load error:", err));

    // ── Render loop ───────────────────────────────────────────────────────────
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        tickTextTimer();

        if (ready && pointMesh) {
            time += 0.005;
            const ease = easeOutCubic(Math.min(scrollProgress, 1));

            if (!(mode === "orbit" && scrollProgress >= 1)) {
                const pos = pointMesh.geometry.attributes.position;
                const n   = pos.count;
                for (let i = 0; i < n; i++) {
                    const drift = (1 - ease) * 0.03;
                    pos.array[i * 3]     = homePos[i * 3]     + offsetPos[i * 3]     * (1 - ease) + Math.cos(time + i * 0.013) * drift;
                    pos.array[i * 3 + 1] = homePos[i * 3 + 1] + offsetPos[i * 3 + 1] * (1 - ease) + Math.sin(time + i * 0.010) * drift;
                    pos.array[i * 3 + 2] = homePos[i * 3 + 2] + offsetPos[i * 3 + 2] * (1 - ease);
                }
                pos.needsUpdate = true;
            }
        }

        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}