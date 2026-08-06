import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.min.js';

// Sci-fi radar based on the work of gmunk for Oblivion
// http://work.gmunk.com/OBLIVION-GFX
//
// Ported from a Shadertoy/GLSL fragment into a Three.js full-screen quad,
// matching the renderer conventions of testScript.js (alpha:true, transparent
// clear, capped pixel ratio, antialias off — iGPU friendly).
//
// Fusion contract (for _config.yml background_mode:"both"): the radar draws
// on a pure-black background and outputs alpha 1.0. Under the page's CSS
// `mix-blend-mode: screen` (gated on body.bg-mode-both #bg-shader) the black
// areas become transparent so the video shows through, and the bright radar
// strokes glow over it. In shader-only mode the canvas is a self-contained
// black background. The radar starts centered and recenters to wherever the
// user clicks/taps (smooth easing), in the spirit of testScript.js's mouse
// reactivity.

export function initThreeScene() {
  // Get and style the canvas to fill the entire viewport.
  const canvas = document.getElementById('bg-shader');
  if (!canvas) {
    console.error("Canvas element with id 'bg-shader' not found!");
    return;
  }
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.margin = '0';
  canvas.style.padding = '0';

  // alpha:true + transparent clear lets the canvas composite over the video.
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1)); // cap DPR — big win on HiDPI / integrated GPUs
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0); // fully transparent backdrop

  // Create scene.
  const scene = new THREE.Scene();

  // Use an orthographic camera to cover the full screen.
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // Full-screen quad geometry.
  const geometry = new THREE.PlaneGeometry(2, 2);

  // ShaderMaterial. Shadertoy's iTime/iResolution are mapped to u_time/u_resolution.
  // The radar works in raw pixel space (gl_FragCoord.xy), so the disc is a fixed
  // pixel size centered on screen — same as the original Shadertoy.
  const material = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      // Radar center in pixel space (bottom-left origin, matching gl_FragCoord).
      // Starts at screen center; eases toward wherever the user clicks.
      u_center: { value: new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2) }
    },
    vertexShader: `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_center;

      // Sci-fi radar based on the work of gmunk for Oblivion
      // http://work.gmunk.com/OBLIVION-GFX

      #define SMOOTH(r,R) (1.0-smoothstep(R-1.0,R+1.0, r))
      #define RANGE(a,b,x) ( step(a,x)*(1.0-step(b,x)) )
      #define RS(a,b,x) ( smoothstep(a-1.0,a+1.0,x)*(1.0-smoothstep(b-1.0,b+1.0,x)) )
      #define M_PI 3.1415926535897932384626433832795

      #define blue1 vec3(0.74,0.95,1.00)
      #define blue2 vec3(0.87,0.98,1.00)
      #define blue3 vec3(0.35,0.76,0.83)
      #define blue4 vec3(0.953,0.969,0.89)
      #define red   vec3(1.00,0.38,0.227)

      #define MOV(a,b,c,d,t) (vec2(a*cos(t)+b*cos(0.1*(t)), c*sin(t)+d*cos(0.1*(t))))

      float movingLine(vec2 uv, vec2 center, float radius)
      {
          //angle of the line
          float theta0 = 90.0 * u_time;
          vec2 d = uv - center;
          float r = sqrt( dot( d, d ) );
          if(r<radius)
          {
              //compute the distance to the line theta=theta0
              vec2 p = radius*vec2(cos(theta0*M_PI/180.0),
                                  -sin(theta0*M_PI/180.0));
              float l = length( d - p*clamp( dot(d,p)/dot(p,p), 0.0, 1.0) );
              d = normalize(d);
              //compute gradient based on angle difference to theta0
              float theta = mod(180.0*atan(d.y,d.x)/M_PI+theta0,360.0);
              float gradient = clamp(1.0-theta/90.0,0.0,1.0);
              return SMOOTH(l,1.0)+0.5*gradient;
          }
          else return 0.0;
      }

      float circle(vec2 uv, vec2 center, float radius, float width)
      {
          float r = length(uv - center);
          return SMOOTH(r-width/2.0,radius)-SMOOTH(r+width/2.0,radius);
      }

      float circle2(vec2 uv, vec2 center, float radius, float width, float opening)
      {
          vec2 d = uv - center;
          float r = sqrt( dot( d, d ) );
          d = normalize(d);
          if( abs(d.y) > opening )
              return SMOOTH(r-width/2.0,radius)-SMOOTH(r+width/2.0,radius);
          else
              return 0.0;
      }
      float circle3(vec2 uv, vec2 center, float radius, float width)
      {
          vec2 d = uv - center;
          float r = sqrt( dot( d, d ) );
          d = normalize(d);
          float theta = 180.0*(atan(d.y,d.x)/M_PI);
          return smoothstep(2.0, 2.1, abs(mod(theta+2.0,45.0)-2.0)) *
              mix( 0.5, 1.0, step(45.0, abs(mod(theta, 180.0)-90.0)) ) *
              (SMOOTH(r-width/2.0,radius)-SMOOTH(r+width/2.0,radius));
      }

      float triangles(vec2 uv, vec2 center, float radius)
      {
          vec2 d = uv - center;
          return RS(-8.0, 0.0, d.x-radius) * (1.0-smoothstep( 7.0+d.x-radius,9.0+d.x-radius, abs(d.y)))
               + RS( 0.0, 8.0, d.x+radius) * (1.0-smoothstep( 7.0-d.x-radius,9.0-d.x-radius, abs(d.y)))
               + RS(-8.0, 0.0, d.y-radius) * (1.0-smoothstep( 7.0+d.y-radius,9.0+d.y-radius, abs(d.x)))
               + RS( 0.0, 8.0, d.y+radius) * (1.0-smoothstep( 7.0-d.y-radius,9.0-d.y-radius, abs(d.x)));
      }

      float _cross(vec2 uv, vec2 center, float radius)
      {
          vec2 d = uv - center;
          int x = int(d.x);
          int y = int(d.y);
          float r = sqrt( dot( d, d ) );
          if( (r<radius) && ( (x==y) || (x==-y) ) )
              return 1.0;
          else return 0.0;
      }
      float dots(vec2 uv, vec2 center, float radius)
      {
          vec2 d = uv - center;
          float r = sqrt( dot( d, d ) );
          if( r <= 2.5 )
              return 1.0;
          if( ( r<= radius) && ( (abs(d.y+0.5)<=1.0) && ( mod(d.x+1.0, 50.0) < 2.0 ) ) )
              return 1.0;
          else if ( (abs(d.y+0.5)<=1.0) && ( r >= 50.0 ) && ( r < 115.0 ) )
              return 0.5;
          else
              return 0.0;
      }
      float bip1(vec2 uv, vec2 center)
      {
          return SMOOTH(length(uv - center),3.0);
      }
      float bip2(vec2 uv, vec2 center)
      {
          float r = length(uv - center);
          float R = 8.0+mod(87.0*u_time, 80.0);
          return (0.5-0.5*cos(30.0*u_time)) * SMOOTH(r,5.0)
              + SMOOTH(6.0,r)-SMOOTH(8.0,r)
              + smoothstep(max(8.0,R-20.0),R,r)-SMOOTH(R,r);
      }
      void mainImage( out vec4 fragColor, in vec2 fragCoord )
      {
          vec3 finalColor;
          vec2 uv = fragCoord.xy;
          //center of the image
          vec2 c = u_center;
          finalColor = vec3( 0.3*_cross(uv, c, 240.0) );
          finalColor += ( circle(uv, c, 100.0, 1.0)
                        + circle(uv, c, 165.0, 1.0) ) * blue1;
          finalColor += (circle(uv, c, 240.0, 2.0) );//+ dots(uv,c,240.0)) * blue4;
          finalColor += circle3(uv, c, 313.0, 4.0) * blue1;
          finalColor += triangles(uv, c, 315.0 + 30.0*sin(u_time)) * blue2;
          finalColor += movingLine(uv, c, 240.0) * blue3;
          finalColor += circle(uv, c, 10.0, 1.0) * blue3;
          finalColor += 0.7 * circle2(uv, c, 262.0, 1.0, 0.5+0.2*cos(u_time)) * blue3;
          if( length(uv-c) < 240.0 )
          {
              //animate some bips with random movements
              vec2 p = 130.0*MOV(1.3,1.0,1.0,1.4,3.0+0.1*u_time);
              finalColor += bip1(uv, c+p) * vec3(1,1,1);
              p = 130.0*MOV(0.9,-1.1,1.7,0.8,-2.0+sin(0.1*u_time)+0.15*u_time);
              finalColor += bip1(uv, c+p) * vec3(1,1,1);
              p = 50.0*MOV(1.54,1.7,1.37,1.8,sin(0.1*u_time+7.0)+0.2*u_time);
              finalColor += bip2(uv,c+p) * red;
          }

          fragColor = vec4( finalColor, 1.0 );
      }

      void main() {
          mainImage(gl_FragColor, gl_FragCoord.xy);
      }
    `
  });

  const quad = new THREE.Mesh(geometry, material);
  scene.add(quad);

  // Resize handler.
  function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    material.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onWindowResize);

  // Click-to-recenter: each click (or tap) picks a new radar center.
  // We keep a separate target and ease u_center toward it in the loop for a
  // smooth glide instead of an instant snap. Y is flipped because gl_FragCoord
  // origin is bottom-left while pointer events are top-left.
  const targetCenter = new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2);
  window.addEventListener('pointerdown', (event) => {
    targetCenter.set(event.clientX, window.innerHeight - event.clientY);
  });

  // Animation loop.
  function animate(time) {
    requestAnimationFrame(animate);
    material.uniforms.u_time.value = time * 0.001; // seconds
    // Ease the radar toward the last click position.
    material.uniforms.u_center.value.lerp(targetCenter, 0.08);
    renderer.render(scene, camera);
  }
  animate();
}

document.addEventListener('DOMContentLoaded', initThreeScene);
