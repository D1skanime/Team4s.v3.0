// Screenshot image types for episode release gallery

export interface ScreenshotImage {
  id: number
  url: string
  thumbnail_url: string
  width: number
  height: number
  caption?: string | null
  display_order: number
}

export interface ScreenshotImagesResponse {
  images: ScreenshotImage[]
  cursor: string | null
}

export interface ScreenshotGalleryProps {
  releaseId: number
}
