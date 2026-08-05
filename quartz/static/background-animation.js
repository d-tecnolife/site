;(() => {
  if (window.__portfolioParticles) return
  window.__portfolioParticles = true

  const canvas = document.querySelector("#particles-background canvas")
  if (!(canvas instanceof HTMLCanvasElement)) return
  const context = canvas.getContext("2d")
  if (!context) return

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
  const particleCount = () => (width <= 800 ? 14 : 38)
  const connectionDistance = 300
  const pauseStorageKey = "particles-paused"
  const storedPausePreference = window.localStorage.getItem(pauseStorageKey)
  let particles = []
  let animationFrame
  let width = 0
  let height = 0
  let hasExplicitMotionPreference = storedPausePreference !== null
  let paused = hasExplicitMotionPreference ? storedPausePreference === "true" : reducedMotion.matches

  const syncPauseControls = () => {
    document.documentElement.toggleAttribute("data-particles-paused", paused)
    for (const button of document.querySelectorAll(".particle-toggle")) {
      button.setAttribute("aria-pressed", String(paused))
      button.setAttribute("aria-label", paused ? "Resume particles" : "Pause particles")
      button.setAttribute("title", paused ? "Resume particles" : "Pause particles")
    }
  }

  const onPauseToggle = (event) => {
    const target = event.target
    if (!(target instanceof Element) || !target.closest(".particle-toggle")) return
    hasExplicitMotionPreference = true
    paused = !paused
    window.localStorage.setItem(pauseStorageKey, String(paused))
    syncPauseControls()
    restart()
  }

  const particleAppearance = () => {
    const theme = document.documentElement.getAttribute("saved-theme") ?? "light"
    return theme === "light"
      ? {
          color: "40, 75, 99",
          opacityScale: 1,
          particleOpacity: null,
          connectionOpacity: 0.42,
          connectionFloor: 0.08,
          radiusScale: 1.45,
          lineWidth: 1.5,
        }
      : {
          color: "255, 255, 255",
          opacityScale: 1.65,
          particleOpacity: null,
          connectionOpacity: 0.42,
          connectionFloor: 0.08,
          radiusScale: 1,
          lineWidth: 1.5,
        }
  }

  const createParticle = () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: 1 + Math.random() * 2.4,
    vx: (Math.random() - 0.5) * 0.2,
    vy: (Math.random() - 0.5) * 0.2,
    opacity: 0.18 + Math.random() * 0.24,
  })

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    width = window.innerWidth
    height = window.innerHeight
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    context.setTransform(ratio, 0, 0, ratio, 0, 0)

    const desiredParticleCount = particleCount()
    particles = particles.slice(0, desiredParticleCount)
    while (particles.length < desiredParticleCount) particles.push(createParticle())
  }

  const draw = (advance = true) => {
    context.clearRect(0, 0, width, height)
    const {
      color,
      opacityScale,
      particleOpacity,
      connectionOpacity,
      connectionFloor,
      radiusScale,
      lineWidth,
    } = particleAppearance()

    for (let index = 0; index < particles.length; index++) {
      const particle = particles[index]

      if (advance) {
        particle.x += particle.vx
        particle.y += particle.vy

        if (particle.x < -5) particle.x = width + 5
        if (particle.x > width + 5) particle.x = -5
        if (particle.y < -5) particle.y = height + 5
        if (particle.y > height + 5) particle.y = -5
      }

      context.beginPath()
      context.arc(particle.x, particle.y, particle.radius * radiusScale, 0, Math.PI * 2)
      context.fillStyle = `rgba(${color}, ${particleOpacity ?? particle.opacity * opacityScale})`
      context.fill()

      for (let otherIndex = index + 1; otherIndex < particles.length; otherIndex++) {
        const other = particles[otherIndex]
        const xDistance = particle.x - other.x
        const yDistance = particle.y - other.y
        const distance = Math.hypot(xDistance, yDistance)

        if (distance < connectionDistance) {
          context.beginPath()
          context.moveTo(particle.x, particle.y)
          context.lineTo(other.x, other.y)
          const proximity = 1 - distance / connectionDistance
          const connectionAlpha =
            connectionFloor + (connectionOpacity - connectionFloor) * proximity
          context.strokeStyle = `rgba(${color}, ${connectionAlpha})`
          context.lineWidth = lineWidth
          context.stroke()
        }
      }
    }
  }

  const animate = () => {
    draw(true)
    animationFrame = window.requestAnimationFrame(animate)
  }

  const restart = () => {
    if (animationFrame !== undefined) {
      window.cancelAnimationFrame(animationFrame)
      animationFrame = undefined
    }
    resize()
    syncPauseControls()
    if (paused) {
      draw(false)
    } else {
      animate()
    }
  }

  window.addEventListener("resize", resize)
  document.addEventListener("click", onPauseToggle)
  reducedMotion.addEventListener("change", () => {
    if (!hasExplicitMotionPreference) paused = reducedMotion.matches
    restart()
  })
  document.addEventListener("themechange", () => draw(false))
  document.addEventListener("nav", restart)
  restart()
})()
