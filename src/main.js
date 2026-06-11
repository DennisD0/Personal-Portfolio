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

// ----- Hero shader background (charcoal clouds + white comets) -----
// Adapted from "Animated Shader Hero" (shader by Matthias Hurrle, @atzedent),
// recolored to monochrome and stripped of the unused pointer uniforms.
// Renders a single static frame for prefers-reduced-motion instead of
// being skipped entirely, so the background is never just a blank void.
const heroShaderCanvas = document.getElementById('hero-shader')

if (heroShaderCanvas) {
  const gl = heroShaderCanvas.getContext('webgl2')

  if (gl) {
    const vertexSrc = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`

    const fragmentSrc = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform float time;
#define FC gl_FragCoord.xy
#define T time
#define R resolution
#define MN min(R.x,R.y)
float rnd(vec2 p){p=fract(p*vec2(12.9898,78.233));p+=dot(p,p+34.56);return fract(p.x*p.y);}
float noise(in vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);float a=rnd(i),b=rnd(i+vec2(1,0)),c=rnd(i+vec2(0,1)),d=rnd(i+1.);return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);}
float fbm(vec2 p){float t=.0,a=1.;mat2 m=mat2(1.,-.5,.2,1.2);for(int i=0;i<5;i++){t+=a*noise(p);p*=2.*m;a*=.5;}return t;}
float clouds(vec2 p){float d=1.,t=.0;for(float i=.0;i<3.;i++){float a=d*fbm(i*10.+p.x*.2+.2*(1.+i)*p.y+d+i*i+p);t=mix(t,d,a);d=a;p*=2./(i+1.);}return t;}
void main(void){
  vec2 uv=(FC-.5*R)/MN,st=uv*vec2(2,1);
  vec3 col=vec3(0);
  float bg=clouds(vec2(st.x+T*.5,-st.y));
  uv*=1.-.3*(sin(T*.2)*.5+.5);
  for(float i=1.;i<12.;i++){
    uv+=.1*cos(i*vec2(.1+.01*i,.8)+i*i+T*.5+.1*uv.x);
    vec2 p=uv;
    float d=length(p);
    col+=.00125/d*vec3(2);
    float b=noise(i+p+bg*1.731);
    col+=.002*b/length(max(p,vec2(b*p.x*.02,p.y)));
    col=mix(col,vec3(bg*.05),clamp(d,0.,1.));
  }
  O=vec4(col,1);
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
      const uResolution = gl.getUniformLocation(program, 'resolution')
      const uTime = gl.getUniformLocation(program, 'time')

      const resizeShader = () => {
        const dpr = Math.max(1, 0.5 * window.devicePixelRatio)
        heroShaderCanvas.width = heroShaderCanvas.clientWidth * dpr
        heroShaderCanvas.height = heroShaderCanvas.clientHeight * dpr
        gl.viewport(0, 0, heroShaderCanvas.width, heroShaderCanvas.height)
      }
      resizeShader()
      window.addEventListener('resize', resizeShader)

      const drawFrame = (time) => {
        gl.uniform2f(uResolution, heroShaderCanvas.width, heroShaderCanvas.height)
        gl.uniform1f(uTime, time)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      }

      if (prefersReducedMotion) {
        // Draw a single static frame instead of skipping the background entirely
        drawFrame(0)
      } else {
        let shaderFrame = null
        const renderShader = (now) => {
          drawFrame(now * 1e-3)
          shaderFrame = requestAnimationFrame(renderShader)
        }

        // Only render while the hero is on screen
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
