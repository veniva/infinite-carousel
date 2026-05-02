This repository and its contents may not be used for training, fine-tuning, or
improving machine learning or AI models without explicit permission. See the [LICENSE](LICENSE) for details.

# LL Infinite Carousel

A linked list backed infinite `Carousel`.

## Implementation
It uses `https://picsum.photos` for getting random images of different sizes, and displays them in the form of `carousel` which:
- is scrolled by mouse wheel only
- is loading more image metadata into the linked-list as the scrolling progresses until certain number is reached
- when all the image metadata is loaded, the linked list is closed, and the carousel loops
- a treshold of pre-rendered hidden images (slots) are prepared on both sides of the carousel's viewport
- as the user scrolls and reaches a treshold size in px before the end of the pre-loaded images on that side, more images are loaded from the backing linked-list.
- on the oposite side, images are removed to maintain the pre-rendered treshold size
- the images themselves are loaded when rendered on the UI via the `src` parameter.
- no images are stored in the JS memory, those are downloaded/cashed and managed by the browser

## Architecture
To achieve encapsulation, maintainability and re-usability, the logic is split into classes outside ReactJS and is framework agnostic. Aditionally, a dedicated React component manages the UI layer.

## Run instructions
- clone locally and install with `npm ci`
- run `npm run test` to run the tests
- run `npm run dev` to start in dev mode
- run `npm run build && npm run preview` to build & preview a production build