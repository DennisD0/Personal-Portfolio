import './style.css'

// ----- Always start from the top on load/refresh -----
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}
if (window.location.hash) {
  history.replaceState(null, '', window.location.pathname + window.location.search)
}
window.scrollTo(0, 0)

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ----- Footer year -----
const yearEl = document.getElementById('year')
if (yearEl) yearEl.textContent = String(new Date().getFullYear())

// ----- Header scroll state -----
const header = document.getElementById('site-header')
const heroSection = document.getElementById('home')

function updateHeader() {
  if (window.scrollY > heroSection.offsetHeight - 96) {
    header.classList.add('scrolled')
  } else {
    header.classList.remove('scrolled')
  }
}
window.addEventListener('scroll', updateHeader, { passive: true })
updateHeader()

// ----- Mobile menu -----
const menuToggle = document.getElementById('menu-toggle')
const mobileMenu = document.getElementById('mobile-menu')
const menuIconOpen = `<line x1="4" x2="20" y1="7" y2="7" /><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="17" y2="17" />`
const menuIconClose = `<path d="M18 6 6 18" /><path d="m6 6 12 12" />`
let menuOpen = false

function setMenu(open) {
  menuOpen = open
  mobileMenu.classList.toggle('menu-open', open)
  document.body.classList.toggle('overflow-hidden', open)
  menuToggle.setAttribute('aria-expanded', String(open))
  menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu')
  menuToggle.querySelector('svg').innerHTML = open ? menuIconClose : menuIconOpen
}

menuToggle.addEventListener('click', () => setMenu(!menuOpen))
mobileMenu.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => setMenu(false))
})

// ----- Hero dot-matrix shader (canvas reveal effect) -----
const heroShaderCanvas = document.getElementById('hero-shader')

if (heroShaderCanvas) {
  const gl = heroShaderCanvas.getContext('webgl2')

  if (gl) {
    const vertexSrc = `#version 300 es
precision mediump float;
in vec2 position;
uniform vec2 u_resolution;
out vec2 fragCoord;
void main(){
  gl_Position = vec4(position, 0.0, 1.0);
  fragCoord = (position + vec2(1.0)) * 0.5 * u_resolution;
  fragCoord.y = u_resolution.y - fragCoord.y;
}`

    const fragmentSrc = `#version 300 es
precision mediump float;

in vec2 fragCoord;
uniform float u_time;
uniform float u_opacities[10];
uniform vec3 u_colors[6];
uniform float u_total_size;
uniform float u_dot_size;
uniform vec2 u_resolution;

out vec4 fragColor;

float PHI = 1.61803398874989484820459;
float random(vec2 xy){
  return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
}

void main(){
  vec2 st = fragCoord.xy;
  st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));
  st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));

  float opacity = step(0.0, st.x) * step(0.0, st.y);
  vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));

  float frequency = 5.0;
  float show_offset = random(st2);
  float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency));
  opacity *= u_opacities[int(rand * 10.0)];
  opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
  opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));

  vec3 color = u_colors[int(show_offset * 6.0)];

  // Reveal from center outward
  float animation_speed_factor = 0.5;
  vec2 center_grid = u_resolution / 2.0 / u_total_size;
  float dist_from_center = distance(center_grid, st2);
  float timing_offset = dist_from_center * 0.01 + (random(st2) * 0.15);

  opacity *= step(timing_offset, u_time * animation_speed_factor);
  opacity *= clamp((1.0 - step(timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);

  fragColor = vec4(color, opacity);
  fragColor.rgb *= fragColor.a;
}`

    const compileShader = (type, source) => {
      const shader = gl.createShader(type)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Hero shader compile error:', gl.getShaderInfoLog(shader))
      }
      return shader
    }

    const program = gl.createProgram()
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexSrc))
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentSrc))
    gl.linkProgram(program)

    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]), gl.STATIC_DRAW)
      gl.useProgram(program)

      const position = gl.getAttribLocation(program, 'position')
      gl.enableVertexAttribArray(position)
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

      const uTime       = gl.getUniformLocation(program, 'u_time')
      const uResolution = gl.getUniformLocation(program, 'u_resolution')
      const uOpacities  = gl.getUniformLocation(program, 'u_opacities')
      const uColors     = gl.getUniformLocation(program, 'u_colors')
      const uTotalSize  = gl.getUniformLocation(program, 'u_total_size')
      const uDotSize    = gl.getUniformLocation(program, 'u_dot_size')

      // Additive blending so dots layer over the dark background
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE)

      // Static uniforms — set once
      gl.uniform1fv(uOpacities, [0.12, 0.12, 0.12, 0.2, 0.2, 0.2, 0.32, 0.32, 0.32, 0.4])
      // Six white-ink color slots (matches --color-ink #f4f3f1)
      gl.uniform3fv(uColors, [
        0.957, 0.953, 0.945,
        0.957, 0.953, 0.945,
        0.957, 0.953, 0.945,
        0.957, 0.953, 0.945,
        0.957, 0.953, 0.945,
        0.957, 0.953, 0.945,
      ])
      gl.uniform1f(uTotalSize, 20.0)
      gl.uniform1f(uDotSize, 3.0)

      const resizeShader = () => {
        const dpr = Math.max(1, 0.5 * window.devicePixelRatio)
        heroShaderCanvas.width  = heroShaderCanvas.clientWidth  * dpr
        heroShaderCanvas.height = heroShaderCanvas.clientHeight * dpr
        gl.viewport(0, 0, heroShaderCanvas.width, heroShaderCanvas.height)
        gl.uniform2f(uResolution, heroShaderCanvas.width, heroShaderCanvas.height)
      }
      resizeShader()
      window.addEventListener('resize', resizeShader)

      const drawFrame = (time) => {
        gl.uniform1f(uTime, time)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      }

      if (prefersReducedMotion) {
        drawFrame(2.0) // draw fully-revealed static frame
      } else {
        let shaderFrame = null
        const renderShader = (now) => {
          drawFrame(now * 1e-3)
          shaderFrame = requestAnimationFrame(renderShader)
        }

        new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            if (shaderFrame === null) shaderFrame = requestAnimationFrame(renderShader)
          } else if (shaderFrame !== null) {
            cancelAnimationFrame(shaderFrame)
            shaderFrame = null
          }
        }).observe(heroShaderCanvas)
      }
    } else {
      console.error('Hero shader program link error:', gl.getProgramInfoLog(program))
    }
  }
}

// ----- Scroll reveal -----
const revealEls = document.querySelectorAll('[data-reveal]')

if (prefersReducedMotion) {
  revealEls.forEach((el) => el.classList.add('in-view'))
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view')
          revealObserver.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
  )

  revealEls.forEach((el) => revealObserver.observe(el))
}

// ----- Active nav link on scroll -----
const sections = document.querySelectorAll('main section[id]')
const navLinks = document.querySelectorAll('#site-header nav a[href^="#"]')

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      const id = entry.target.getAttribute('id')
      navLinks.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`)
      })
    })
  },
  { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
)

sections.forEach((section) => sectionObserver.observe(section))

// ----- Experience timeline flow animation -----
const timeline = document.getElementById('experience-timeline')
const timelineProgress = document.getElementById('timeline-progress')
const timelineMarkers = document.querySelectorAll('.timeline-marker')

if (timeline && timelineProgress) {
  if (prefersReducedMotion) {
    timelineProgress.style.height = '100%'
    timelineMarkers.forEach((marker) => marker.classList.add('is-active'))
  } else {
    let ticking = false
    const updateTimeline = () => {
      const rect = timeline.getBoundingClientRect()
      const ref = window.innerHeight * 0.65
      const progress = Math.min(Math.max((ref - rect.top) / rect.height, 0), 1)

      timelineProgress.style.height = `${progress * 100}%`

      timelineMarkers.forEach((marker) => {
        const markerRect = marker.getBoundingClientRect()
        marker.classList.toggle('is-active', markerRect.top + markerRect.height / 2 <= ref)
      })

      ticking = false
    }

    updateTimeline()
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateTimeline)
        ticking = true
      }
    }, { passive: true })
    window.addEventListener('resize', updateTimeline)
  }
}

// ----- Copy email -----
const copyButton = document.getElementById('copy-email')
const copyFeedback = document.getElementById('copy-feedback')
let copyTimeout

copyButton?.addEventListener('click', async () => {
  const email = copyButton.dataset.email
  try {
    await navigator.clipboard.writeText(email)
  } catch {
    // Clipboard API unavailable; selection-based fallback isn't needed for a plain-text email.
  }

  copyFeedback.style.opacity = '1'
  clearTimeout(copyTimeout)
  copyTimeout = setTimeout(() => {
    copyFeedback.style.opacity = '0'
  }, 2000)
})
