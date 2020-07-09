import { from, range, forkJoin } from 'rxjs';
import { map, flatMap } from 'rxjs/operators';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf-worker.js"

type PdfDocument = any;
type PdfPage = any;

const $$ = (selector): HTMLElement => {
  return document.querySelector(selector)
}

const createCanvas = (id): HTMLCanvasElement => {
  const canvas = document.createElement("canvas")
  canvas.id = id
  return canvas;
}

// Prepare canvas using PDF page dimensions.
const getCanvasContext = (selector, props) => {
  const canvas = $$(selector) as HTMLCanvasElement;
  const context = canvas.getContext('2d');
  canvas.height = props.height;
  canvas.width = props.width;
  return context
}

const renderPage = async (pdf: PdfDocument, pageNumber, scale) => {
  const page: PdfPage = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale: scale, });

  const context = getCanvasContext(`#pdf-canvas-${pageNumber}`, {
    height: viewport.height,
    width: viewport.width,
  })

  page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise

  return page
}

const renderPdfPage$ = (document: PdfDocument) =>
  forkJoin(range(0, document.numPages).pipe(
    map((x) => {
      console.info("Building Canvases")
      const viewer = $$("#pdf-viewer");
      const canvasEl = createCanvas(`pdf-canvas-${x + 1}`);
      viewer.appendChild(canvasEl)
      return x;
    }),
    flatMap((idx: number) => renderPage(document, idx + 1, 1.5))
  ));

const getPdfDocument$ = (pdfUrl: string) =>
  from(pdfjsLib.getDocument(pdfUrl).promise)
    .pipe(
      map((x) => {
        $$("#pdf-viewer").innerHTML = ""
        console.info("Clearing PdfViewer")
        return x;
      }),
      flatMap((document: PdfDocument) => renderPdfPage$(document)),
      map(x => {
        console.info("Figuring Anchor Points")
        return Array.from(document.querySelectorAll("canvas")).map((c: HTMLCanvasElement) => c.offsetTop)
      })
    );



export const getPdfPage = async (pdfUrl: string, pageNumber?: number) => {
  console.log(pdfUrl, pageNumber)
  return getPdfDocument$(pdfUrl)
    .subscribe(
      (document) => {
        console.log(document)
      },
      (error) => {
        console.error(error)
      }
    )
}

getPdfPage("sample-large.pdf");