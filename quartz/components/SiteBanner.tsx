import { QuartzComponent, QuartzComponentProps } from "./types"

const SiteBanner: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  if (fileData.slug === "index") return null

  return (
    <div class="site-banner" aria-hidden="true">
      <canvas width="560" height="70" data-source="/static/site-banner-base.png"></canvas>
    </div>
  )
}

SiteBanner.css = `
.site-banner {
  position: relative;
  width: 100%;
  max-width: none;
  align-self: stretch;
  justify-self: stretch;
  grid-column: 1 / -1;
  aspect-ratio: 8 / 1;
  box-sizing: border-box;
  margin: 0;
  padding: 2px;
  overflow: hidden;
  border: 2px solid var(--secondary);
  border-radius: 0;
  background: var(--light);
}

body:not([data-slug="index"]) .page-header {
  margin-top: 0 !important;
}

.site-banner > canvas {
  display: block;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
}

@media all and (max-width: 600px) {
  .site-banner {
    margin-bottom: 0;
  }
}

`

SiteBanner.afterDOMLoaded = `
(() => {
  const initialized = new WeakSet()

  const setupBanner = (canvas) => {
    if (!(canvas instanceof HTMLCanvasElement) || initialized.has(canvas)) return

    const context = canvas.getContext("2d")
    if (!context) return
    initialized.add(canvas)

    const image = new Image()
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const themedImages = { dark: undefined, light: undefined }

    const hexToRgb = (hex) => {
      const value = Number.parseInt(hex.slice(1), 16)
      return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
    }

    const buildThemedImage = (dark) => {
      const themed = document.createElement("canvas")
      const water = document.createElement("canvas")
      const foliage = document.createElement("canvas")
      themed.width = canvas.width
      themed.height = canvas.height
      water.width = canvas.width
      water.height = canvas.height
      foliage.width = canvas.width
      foliage.height = canvas.height
      const themedContext = themed.getContext("2d")
      const waterContext = water.getContext("2d")
      const foliageContext = foliage.getContext("2d")
      if (!themedContext || !waterContext || !foliageContext) {
        return { scene: themed, water, foliage }
      }

      themedContext.imageSmoothingEnabled = false
      themedContext.drawImage(image, 0, 0, themed.width, themed.height)
      const pixels = themedContext.getImageData(0, 0, themed.width, themed.height)
      const waterPixels = waterContext.createImageData(water.width, water.height)
      const foliagePixels = foliageContext.createImageData(foliage.width, foliage.height)
      const palette = (dark
        ? ["#07182d", "#2e527c", "#d9eaff"]
        : ["#315675", "#80aadd", "#f8f8ff"]
      ).map(hexToRgb)
      const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

      for (let index = 0; index < pixels.data.length; index += 4) {
        const red = pixels.data[index]
        const green = pixels.data[index + 1]
        const blue = pixels.data[index + 2]
        const greenish = green > red * 1.06 && green > blue * 0.72
        let tone = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255
        if (greenish) tone *= 0.78
        tone = Math.max(0, Math.min(1, (tone - 0.5) * 1.35 + 0.5))

        const pixel = index / 4
        const x = pixel % themed.width
        const y = Math.floor(pixel / themed.width)
        const ditherX = Math.floor(x / 2)
        const ditherY = Math.floor(y / 2)
        const threshold = (bayer[(ditherX % 4) + (ditherY % 4) * 4] + 0.5) / 16
        const scaled = tone * 2
        const base = Math.min(1, Math.floor(scaled))
        const level = Math.min(2, base + (scaled - base > threshold ? 1 : 0))
        const color = palette[level]
        pixels.data[index] = color[0]
        pixels.data[index + 1] = color[1]
        pixels.data[index + 2] = color[2]

        const saturation = Math.max(red, green, blue) - Math.min(red, green, blue)
        const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722
        const isWater = y > themed.height * 0.12 && luminance > 105 && saturation < 105
        if (isWater) {
          waterPixels.data[index] = color[0]
          waterPixels.data[index + 1] = color[1]
          waterPixels.data[index + 2] = color[2]
          waterPixels.data[index + 3] = 190
        }

        const isFoliage = y < themed.height * 0.82 && greenish
        if (isFoliage) {
          foliagePixels.data[index] = color[0]
          foliagePixels.data[index + 1] = color[1]
          foliagePixels.data[index + 2] = color[2]
          foliagePixels.data[index + 3] = 170
        }
      }

      themedContext.putImageData(pixels, 0, 0)
      waterContext.putImageData(waterPixels, 0, 0)
      foliageContext.putImageData(foliagePixels, 0, 0)
      return { scene: themed, water, foliage }
    }

    let animationFrame
    let previousFrame = 0

    const draw = (time = 0) => {
      if (!canvas.isConnected) return
      context.imageSmoothingEnabled = false
      context.clearRect(0, 0, canvas.width, canvas.height)
      const dark = document.documentElement.getAttribute("saved-theme") === "dark"
      const themeKey = dark ? "dark" : "light"
      themedImages[themeKey] ??= buildThemedImage(dark)
      const themedImage = themedImages[themeKey]
      context.drawImage(themedImage.scene, 0, 0)

      if (!reducedMotion.matches) {
        const swayX = Math.sin(time * 0.0007) * 1.1 + Math.sin(time * 0.0011) * 0.35
        context.drawImage(themedImage.foliage, Math.round(swayX), 0)
      }

      context.save()
      context.globalAlpha = 0.62
      for (let row = 8; row < canvas.height; row += 2) {
        const flow = ((time * 0.006 + row * 0.37) % 4) - 2
        const ripple = Math.sin(time * 0.0018 + row * 0.41) * 0.7
        context.drawImage(
          themedImage.water,
          0,
          row,
          canvas.width,
          2,
          Math.round(ripple),
          Math.round(row + flow),
          canvas.width,
          2,
        )
      }
      context.restore()
    }

    const animate = (time) => {
      if (!canvas.isConnected) {
        return
      }
      if (time - previousFrame >= 33) {
        draw(time)
        previousFrame = time
      }
      animationFrame = window.requestAnimationFrame(animate)
    }

    const restart = () => {
      if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame)
      animationFrame = undefined
      if (!image.complete) return
      if (reducedMotion.matches) draw(0)
      else animationFrame = window.requestAnimationFrame(animate)
    }

    image.addEventListener("load", restart, { once: true })
    image.src = canvas.dataset.source ?? "/static/site-banner-base.png"
    reducedMotion.addEventListener("change", restart)
    document.addEventListener("themechange", () => draw(previousFrame))
  }

  const setupBanners = () => {
    document.querySelectorAll(".site-banner > canvas").forEach(setupBanner)
  }

  const bannerObserver = new MutationObserver(setupBanners)
  bannerObserver.observe(document.body, { childList: true, subtree: true })
  document.addEventListener("nav", setupBanners)
  setupBanners()
})()
`

export default SiteBanner
