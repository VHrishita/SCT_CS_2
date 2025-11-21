# Image Encryptor (Pixel Manipulation)

A small client-side tool for experimenting with image encryption via pixel operations.

## Features

- **XOR with a key** (byte-wise)
- **Add / Subtract a key** (mod 256)
- **Shuffle pixels** using a key-seeded permutation (reversible)
- Fully client-side: no uploads, all processing happens in your browser
- Supports PNG and JPG images

## How to Use

- Load an image (PNG or JPG).
- Choose the operation you want to perform.
- Enter a key (text or number).
- Click **Encrypt** to transform the image.
- Click **Download** to save the result.
- Use **Decrypt** with the same operation/key to restore the original image.

## Privacy

All processing runs locally in your browser — no image data is uploaded to any server.

## Tech Stack

- HTML, CSS, JavaScript
- Client-side image processing with Canvas API

## Author

Vempali Hrishita
All rights reseverd 2025

---

Feel free to ⭐ if the project was anyway helpful :)
