// script.js
// Image encryptor — pixel manipulation: XOR, ADD, Shuffle (permute pixels)
// All processing client-side

// Utilities
function textToSeed(s){
  // simple seed from string (32-bit)
  let h = 2166136261 >>> 0;
  for (let i=0;i<s.length;i++){
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

// xorshift32 PRNG using seed
function makePRNG(seed){
  let x = seed >>> 0;
  return function(){
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x;
  }
}

// Fisher-Yates shuffle permutation generator (returns array of indices)
function permutation(n, seed){
  const rnd = makePRNG(seed);
  const arr = new Uint32Array(n);
  for(let i=0;i<n;i++) arr[i]=i;
  for(let i=n-1;i>0;i--){
    const r = rnd() % (i+1);
    const tmp = arr[i];
    arr[i] = arr[r];
    arr[r] = tmp;
  }
  return arr;
}

// inverse permutation
function inversePerm(perm){
  const n = perm.length;
  const inv = new Uint32Array(n);
  for(let i=0;i<n;i++) inv[perm[i]] = i;
  return inv;
}

// DOM
const fileInput = document.getElementById('fileInput');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const operationEl = document.getElementById('operation');
const keyInput = document.getElementById('keyInput');
const encryptBtn = document.getElementById('encryptBtn');
const decryptBtn = document.getElementById('decryptBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const infoText = document.getElementById('infoText');
const applyToAlpha = document.getElementById('applyToAlpha');
const previewStretch = document.getElementById('previewStretch');

let originalImage = null;
let lastResultBlob = null;

function updateInfo(msg){ infoText.textContent = msg; }

fileInput.addEventListener('change', async (e)=>{
  const f = e.target.files[0];
  if(!f) return;
  const url = URL.createObjectURL(f);
  const img = new Image();
  img.onload = ()=>{
    originalImage = img;
    // set canvas size to image natural size (but scale down visually via CSS if needed)
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    updateInfo(`Loaded: ${f.name} — ${img.naturalWidth}×${img.naturalHeight}`);
    downloadBtn.disabled = true;
    lastResultBlob = null;
    URL.revokeObjectURL(url);
  };
  img.onerror = ()=> updateInfo('Failed to load image');
  img.src = url;
});

// Core pixel processors
function processImage({mode='encrypt'}){
  if(!originalImage){
    updateInfo('No image loaded');
    return;
  }
  const op = operationEl.value;
  const keyRaw = keyInput.value || '';
  if(op === 'shuffle' && keyRaw === ''){
    updateInfo('Please enter a key for shuffle');
    return;
  }

  // draw original onto an offscreen canvas to get ImageData
  const w = originalImage.naturalWidth;
  const h = originalImage.naturalHeight;
  // create temp canvas
  const temp = document.createElement('canvas');
  temp.width = w; temp.height = h;
  const tctx = temp.getContext('2d');
  tctx.drawImage(originalImage,0,0);
  let id = tctx.getImageData(0,0,w,h);
  const data = id.data; // Uint8ClampedArray bytes RGBA

  const preserveAlpha = applyToAlpha.checked;
  // XOR / ADD operate per color byte
  if(op === 'xor' || op === 'add'){
    // derive numeric key (0..255)
    let seedNum = 0;
    if(keyRaw.match(/^-?\d+$/)) seedNum = Math.abs(parseInt(keyRaw,10));
    else seedNum = textToSeed(keyRaw);
    const k = seedNum & 0xFF;
    // if decrypting ADD, subtract; if decrypting XOR, same op
    const addMode = (op === 'add');
    const encrypting = mode === 'encrypt';
    for(let i=0;i<data.length;i+=4){
      for(let c=0;c<3;c++){
        const idx = i+c;
        if(op === 'xor'){
          data[idx] = data[idx] ^ k;
        } else { // add
          if(encrypting) data[idx] = (data[idx] + k) & 0xFF;
          else data[idx] = (data[idx] - k + 256) & 0xFF;
        }
      }
      if(preserveAlpha){
        const idxA = i+3;
        if(op === 'xor') data[idxA] = data[idxA] ^ k;
        else {
          if(encrypting) data[idxA] = (data[idxA] + k) & 0xFF;
          else data[idxA] = (data[idxA] - k + 256) & 0xFF;
        }
      }
    }
  }
  else if(op === 'shuffle'){
    // shuffle pixels using permutation with seed derived from keyRaw
    const seed = textToSeed(keyRaw);
    const pixelCount = w * h;
    const perm = permutation(pixelCount, seed);
    const inv = inversePerm(perm);
    const usePerm = (mode === 'encrypt') ? perm : inv;

    // create new Uint8ClampedArray for rearranged pixels
    const newBytes = new Uint8ClampedArray(data.length);
    // for each dest pixel index j, copy pixel from source index i = usePerm[j]
    // here usePerm maps positions (0..pixelCount-1) -> source index for that destination.
    for(let dest=0; dest<pixelCount; dest++){
      const srcIndex = usePerm[dest];
      const srcPos = srcIndex * 4;
      const destPos = dest * 4;
      // copy RGBA
      newBytes[destPos] = data[srcPos];
      newBytes[destPos+1] = data[srcPos+1];
      newBytes[destPos+2] = data[srcPos+2];
      newBytes[destPos+3] = preserveAlpha ? data[srcPos+3] : data[srcPos+3]; // alpha preserved by default
    }
    // replace data
    for(let i=0;i<data.length;i++) data[i] = newBytes[i];
  }

  // put image data back, show on canvas
  tctx.putImageData(id, 0, 0);
  // draw to visible canvas (canvas already sized to natural width/height)
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(temp,0,0);

  // make downloadable blob
  canvas.toBlob((blob)=>{
    lastResultBlob = blob;
    downloadBtn.disabled = false;
    updateInfo(`Processed: operation=${op} mode=${mode} key="${keyRaw}"`);
  }, 'image/png');
}

// Buttons
encryptBtn.addEventListener('click', ()=> processImage({mode:'encrypt'}));
decryptBtn.addEventListener('click', ()=> processImage({mode:'decrypt'}));
resetBtn.addEventListener('click', ()=>{
  if(!originalImage) return;
  canvas.width = originalImage.naturalWidth;
  canvas.height = originalImage.naturalHeight;
  ctx.drawImage(originalImage,0,0);
  lastResultBlob = null;
  downloadBtn.disabled = true;
  updateInfo('Reset to original image');
});

downloadBtn.addEventListener('click', ()=>{
  if(!lastResultBlob) return;
  const url = URL.createObjectURL(lastResultBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'result.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});


canvas.width = 640;
canvas.height = 360;
ctx.fillStyle = '#0b0f13';
ctx.fillRect(0,0,canvas.width,canvas.height);
updateInfo('No image loaded');
