import { useEffect, useState } from 'react';
import './App.css'
import Carousel from './Carousel/Carousel'

const IMAGE_URL = 'https://picsum.photos'; // needs to accept query parameters `page` and `limit`
const HORIZONTAL_MARGIN = 60; // the left and right margin of the carousel to the screen edges.
const MAX_IMAGES = 40; // used only if is larger than `prerenderWidth`
const LOAD_BATCH = 10;
const PRERENDER_FACTOR = 3; // load 3 times the images that would fill the visible carousel viewport
const GAP = 16;
// how much hidden width of images show we allow before starting to load more images on both sides
const LOAD_MORE_TRESHOLD_DISTANCE = 100;

function App() {
  const [screenWidth, setScreenWidth] = useState<number>(() =>
    typeof window === "undefined" ? 0 : window.innerWidth
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onResize = () => {
      setScreenWidth(window.innerWidth);
    };

    onResize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);
  
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 16 }}>Infinite linked-list backed carousel</h1>
      <Carousel 
        url={IMAGE_URL}
        width={screenWidth}
        horizontalMargin={HORIZONTAL_MARGIN}
        maxImages={MAX_IMAGES}
        imageGap={GAP}
        loadBatch={LOAD_BATCH}
        prerenderFactor={PRERENDER_FACTOR}
        loadMoreTresholdDistancePx={LOAD_MORE_TRESHOLD_DISTANCE}
      />
    </main>
  )
}

export default App
