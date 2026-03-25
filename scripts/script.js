// Initialize Three.js Scene
let canvas, scene, camera, renderer, cube;

function initThreeJS() {
    canvas = document.getElementById('canvas3d');
    if (!canvas) return;
    
    // Scene setup
    scene = new THREE.Scene();
    scene.background = null;
    
    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 3;
    
    // Renderer setup
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Create rotating cube with cyberpunk styling
    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const material = new THREE.MeshPhongMaterial({
        color: 0x00ffff,
        emissive: 0x00aaaa,
        shininess: 100,
        wireframe: false
    });
    
    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    
    // Add edges for cyberpunk effect
    const edges = new THREE.EdgesGeometry(geometry);
    const wireframe = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xff006e }));
    cube.add(wireframe);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0x00ffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);
    
    const pointLight2 = new THREE.PointLight(0xff006e, 0.8);
    pointLight2.position.set(-5, -5, 5);
    scene.add(pointLight2);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Start animation loop
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    
    if (cube) {
        // Rotate cube
        cube.rotation.x += 0.005;
        cube.rotation.y += 0.008;
        
        // Pulse effect
        const scale = 1 + Math.sin(Date.now() * 0.001) * 0.1;
        cube.scale.set(scale, scale, scale);
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Initialize Three.js when window loads
window.addEventListener('load', initThreeJS);

// Initialize tsparticles
tsParticles.load("particles-js", {
    particles: {
        number: {
            value: 100,
            density: {
                enable: true,
                value_area: 800
            }
        },
        color: {
            value: "#00ffff"
        },
        shape: {
            type: "circle"
        },
        opacity: {
            value: 0.6,
            random: true,
            anim: {
                enable: true,
                speed: 1,
                opacity_min: 0.1,
                sync: false
            }
        },
        size: {
            value: 2,
            random: true,
            anim: {
                enable: true,
                speed: 2,
                size_min: 0.5,
                sync: false
            }
        },
        line_linked: {
            enable: true,
            distance: 150,
            color: "#00ffff",
            opacity: 0.4,
            width: 1.5
        },
        move: {
            enable: true,
            speed: 2,
            direction: "none",
            random: false,
            straight: false,
            out_mode: "out",
            bounce: false,
            attract: {
                enable: false,
                rotateX: 600,
                rotateY: 1200
            }
        }
    },
    interactivity: {
        detect_on: "canvas",
        events: {
            onhover: {
                enable: true,
                mode: "grab"
            },
            onclick: {
                enable: true,
                mode: "push"
            },
            resize: true
        },
        modes: {
            grab: {
                distance: 200,
                line_linked: {
                    opacity: 0.8
                }
            },
            push: {
                particles_nb: 4
            },
            remove: {
                particles_nb: 2
            }
        }
    },
    retina_detect: true,
    background: {
        color: "transparent"
    }
});
