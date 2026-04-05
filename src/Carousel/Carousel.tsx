import React, { useEffect, useMemo, useRef, useState } from "react";
import "./Carousel.css";
import { CarouselController } from "./CarouselController";
import { clamp } from "../helpers";
import type { SlotsLayout, CarouselSlot } from "./types";

type Props = {
  url: string;
  width: number;
  maxHight?: number;
  wheelSpeed?: number;
  horizontalMargin?: number;
  maxImages?: number;
  imageGap?: number;
  loadBatch?: number;
  prerenderFactor?: number;
  loadMoreTresholdDistancePx?: number;
};

const EMPTY_LAYOUT: SlotsLayout = {
  scrollOffset: 0,
  slots: [],
};

function cloneLayout(layout: SlotsLayout): SlotsLayout {
  return {
    scrollOffset: layout.scrollOffset,
    slots: [...layout.slots],
  };
}

/**
 * Scale the carousel height to 40% of its width
 */
function getCarouselHeight(containerWidth: number, maxRowHeight: number): number {
  return clamp(containerWidth * 0.4, 220, maxRowHeight);
}

function getRenderedImageWidth(
  slot: CarouselSlot,
  rowHeight: number,
): number {
  const image = slot.node.data;
  return Math.max(1, Math.round((image.width / image.height) * rowHeight));
}

export default function Carousel({
  url,
  width,
  maxHight = 320,
  wheelSpeed = 1.1,
  horizontalMargin = 30,
  maxImages = 40,
  imageGap = 16,
  loadBatch = 5,
  prerenderFactor = 3,
  loadMoreTresholdDistancePx = 100,
}: Props) {
  const [layout, setLayout] = useState<SlotsLayout>(EMPTY_LAYOUT);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pendingDeltaRef = useRef(0);
  const wheelBusyRef = useRef(false);

  const controller = useMemo(() => {
    return new CarouselController(
      url,
      horizontalMargin,
      maxImages,
      imageGap,
      loadBatch,
      prerenderFactor,
      loadMoreTresholdDistancePx,
    );
  }, [
    url,
    horizontalMargin,
    maxImages,
    imageGap,
    loadBatch,
    prerenderFactor,
    loadMoreTresholdDistancePx,
  ]);

  const availableWidth = useMemo(() => {
    return Math.max(0, width - 2 * horizontalMargin);
  }, [width, horizontalMargin]);

  const carouselHeight = useMemo(() => {
    return getCarouselHeight(availableWidth || width, maxHight);
  }, [availableWidth, width, maxHight]);

  useEffect(() => {
    let cancelled = false;

    async function syncCarousel() {
      if (width <= 0) return;

      setError(null);
      setIsLoading(true);

      try {
        controller.setViewport(width, carouselHeight);
        const nextLayout = await controller.ensureSlots();

        if (!cancelled) {
          setLayout(cloneLayout(nextLayout));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load carousel");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void syncCarousel();

    return () => {
      cancelled = true;
    };
  }, [controller, width, carouselHeight]);

  const flushWheel = async () => {
    if (wheelBusyRef.current) return;

    wheelBusyRef.current = true;

    try {
      while (pendingDeltaRef.current !== 0) {
        const scrollChange = pendingDeltaRef.current;
        pendingDeltaRef.current = 0;

        const nextLayout = await controller.scrollBy(scrollChange);
        setLayout(cloneLayout(nextLayout));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scroll carousel");
    } finally {
      wheelBusyRef.current = false;
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const delta =
      Math.abs(event.deltaY) >= Math.abs(event.deltaX)
        ? event.deltaY
        : event.deltaX;

    pendingDeltaRef.current -= delta * wheelSpeed;
    void flushWheel();
  };

  const positionedSlots = useMemo(() => {
    let left = 0;

    return layout.slots.map((slot, index) => {
      const currentLeft = left;
      const widthPx = getRenderedImageWidth(slot, carouselHeight);
      left += widthPx + (index < layout.slots.length - 1 ? imageGap : 0);

      return {
        slot,
        left: currentLeft,
        width: widthPx,
      };
    });
  }, [layout.slots, carouselHeight, imageGap]);

  return (
    <section
      className="carousel-wrapper"
      style={
        {
          width: availableWidth || "100%",
          "--carousel-card-height": `${carouselHeight}px`,
        } as React.CSSProperties
      }
    >
      <div
        className="carousel-viewport"
        onWheel={handleWheel}
        aria-label="Infinite linked-list image carousel"
      >
        {error ? (
          <div className="carousel-loading">{error}</div>
        ) : isLoading && layout.slots.length === 0 ? (
          <div className="carousel-loading">Loading carousel…</div>
        ) : layout.slots.length === 0 ? (
          <div className="carousel-loading">Preparing carousel…</div>
        ) : (
          <div
            className="carousel-track"
            style={{ height: carouselHeight }}
          >
            {positionedSlots.map(({ slot, left, width }) => {
              const image = slot.node.data;

              return (
                <article
                  key={slot.slotId}
                  className="carousel-card"
                  style={{
                    width,
                    height: carouselHeight,
                    transform: `translate3d(${left + layout.scrollOffset}px, 0, 0)`,
                  }}
                >
                  <img
                    src={image.download_url}
                    alt={`Photo by ${image.author}`}
                    loading="lazy"
                    decoding="async"
                    width={image.width}
                    height={image.height}
                    className="carousel-image"
                    draggable={false}
                  />

                  <div className="carousel-caption">
                    <span className="carousel-author">{image.author}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}