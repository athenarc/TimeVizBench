import ImageSSIM, { IImage } from "image-ssim";

export const compare = (pathData1: string, pathData2: string, width: number, height: number): ImageSSIM.IResult => {
  const firstImage = renderSVGPathToCanvas(pathData1, width, height);
  const secondImage = renderSVGPathToCanvas(pathData2, width, height);

  const firstImageData = getImageData(firstImage);
  const secondImageData = getImageData(secondImage);

  const img1: IImage = {width: firstImage.width, height: firstImage.height, data: Array.from(firstImageData.data), channels: 1}
  const img2: IImage = {width: secondImage.width, height: secondImage.height, data: Array.from(secondImageData.data), channels: 1}

  // Calculate SSIM result
  const result = ImageSSIM.compare(img1, img2, width, 0.01, 0.03, false);
  
  return result;
}

const renderSVGPathToCanvas = (pathData: string, width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Canvas rendering context not supported");

  // Convert path data to canvas Path2D
  const path = new Path2D(pathData);

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "black"; // Set color
  ctx.lineWidth = 2;
  ctx.stroke(path);

  return canvas;
}

const getImageData = (canvasElement: HTMLCanvasElement): ImageData => {
  const ctx = canvasElement.getContext('2d');
  return ctx!.getImageData(0, 0, canvasElement.width, canvasElement.height);
}
