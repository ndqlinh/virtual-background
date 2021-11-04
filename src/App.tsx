import React, { useEffect, useRef, useState } from 'react';

import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import { Camera } from '@mediapipe/camera_utils';

import background from './assets/alo.jpg';
import './App.css';

const App = () => {
  const vidRef: any = useRef(null);
  const canvasRef: any = useRef(null);
  const resultRef: any = useRef(null);
  const imageRef: any = useRef(null);
  const selectedEffect: any = useRef(null);
  let canvasCtx: any = useRef(null);

  const blurIntensityMax = 100;
  const defaultBlurIntensity = 25;
  const blurIntensity = 10;
  const brightnessMax = blurIntensityMax + defaultBlurIntensity;

  useEffect(() => {
    attachWebcam();
  }, []);

  useEffect(() => {
    if (canvasRef?.current) {
      canvasCtx.current = canvasRef?.current?.getContext('2d');
      onLoadMediapipe();
    }
  }, [canvasRef]);

  useEffect(() => {
    onLoadMediapipe(selectedEffect);
  }, [selectedEffect])

  const attachWebcam = () => {
    if (navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          vidRef.current.srcObject = stream;
        })
        .catch(error => {
          vidRef.current.srcObject = null;
        });
    }
  };

  const onLoadMediapipe = (effect?: any) => {
    selectedEffect.current = effect;
    const selfieSegmentation = new SelfieSegmentation({locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
    }});
    selfieSegmentation.setOptions({
      selfieMode: true,
      modelSelection: 1,
    });
    selfieSegmentation.onResults(onResults);
    const camera = new Camera(vidRef?.current, {
      onFrame: async () => {
        await selfieSegmentation.send({image: vidRef?.current});
      },
      width: 480,
      height: 320
    });
    camera.start();
    generateStream();
  };

  const onResults = (results: any) => {
    clearCanvas();

    if (selectedEffect.current) {
      canvasCtx.current.filter = `blur(${blurIntensity}px)`;
      drawSegmentationMask(results.segmentationMask);
      canvasCtx.current.globalCompositeOperation = "source-in";
      canvasCtx.current.filter = "none";
    }

    canvasCtx.current.drawImage(results.image, 0, 0, canvasRef?.current?.width, canvasRef?.current?.height);

    switch (selectedEffect.current) {
      case 'blur':
        onChangeVirtualBg(true, results.image);
        break;
      case 'virtual':
        onChangeVirtualBg(false, imageRef?.current);
        break;
      default:
        onChangeVirtualBg(false, results.image);
    }

    canvasCtx.current.restore();
  };

  const onChangeVirtualBg = (isBlur?: boolean, image?: HTMLImageElement) => {
    const blurAmount = isBlur ? blurIntensity : 0;
    canvasCtx.current.globalCompositeOperation = 'destination-over';
    canvasCtx.current.filter = `blur(${blurAmount}px)`;
    canvasCtx.current.drawImage(
      image,
      0,
      0,
      canvasRef?.current?.width,
      canvasRef?.current?.height
    );
  };

  const drawSegmentationMask = (segmentation: any) => {
    canvasCtx?.current?.drawImage(segmentation, 0, 0, canvasRef?.current?.width, canvasRef?.current?.height);
  };

  const clearCanvas = () => {
    canvasCtx?.current?.clearRect(0, 0, canvasRef?.current?.width, canvasRef?.current?.height);
  };

  const generateStream = () => {
    const stream = canvasRef?.current?.captureStream();
    resultRef.current.srcObject = stream;
  };

  return (
    <div className="App">
      <div className="video-container">
        <video
          id="video-result"
          className="video-result"
          ref={ resultRef }
          width="480"
          height="320"
          autoPlay
          playsInline
        ></video>
        <canvas
          className="output-canvas"
          ref={ canvasRef }
          width="480px"
          height="320px"
        ></canvas>
        <video
          id="video"
          className="video"
          ref={ vidRef }
          width="480"
          height="320"
          autoPlay
          playsInline
        ></video>
      </div>
      <img ref={ imageRef } src={ background } alt="bg" />
      <div className="btn-group">
        <button className="btn"onClick={ () => onLoadMediapipe('blur') }>Blur</button>
        <button className="btn"onClick={ () => onLoadMediapipe('virtual') }>Image</button>
        <button className="btn"onClick={ () => onLoadMediapipe(null)  }>Clear</button>
      </div>
    </div>
  );
}

export default App;
