import './style.css'

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
const timelineGlowPath = document.getElementById('timeline-glow-path')
const timelineMarkers = document.querySelectorAll('.timeline-marker')

if (timeline && timelineGlowPath) {
  if (prefersReducedMotion) {
    timelineGlowPath.style.strokeDasharray = 'none'
    timelineMarkers.forEach((marker) => marker.classList.add('is-active'))
  } else {
    const pathLength = timelineGlowPath.getTotalLength()
    timelineGlowPath.style.strokeDasharray = String(pathLength)

    let ticking = false
    const updateTimeline = () => {
      const rect = timeline.getBoundingClientRect()
      const ref = window.innerHeight * 0.65
      const progress = Math.min(Math.max((ref - rect.top) / rect.height, 0), 1)

      timelineGlowPath.style.strokeDashoffset = String(pathLength * (1 - progress))

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
