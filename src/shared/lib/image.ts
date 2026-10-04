// 사진 남기기(F-17): 촬영 사진을 캔버스로 다시 그려 JPEG로 저장한다.
// 캔버스 출력에는 EXIF(GPS·기기 정보)가 들어가지 않으므로 메타데이터가 모두 지워진다.
// 브라우저가 EXIF 방향을 반영해 그리므로 사진이 눕지 않는다 (image-orientation: from-image 기본값).

export interface PreparedImage {
  blob: Blob;
  width: number;
  height: number;
}

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  close(): void;
}

async function decode(file: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bmp,
        width: bmp.width,
        height: bmp.height,
        close: () => {
          bmp.close();
        },
      };
    } catch {
      /* 옵션 미지원 브라우저는 <img> 로 */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      close: () => {
        URL.revokeObjectURL(url);
      },
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

export async function prepareUploadImage(
  file: Blob,
  maxPx = 1600,
  quality = 0.85,
): Promise<PreparedImage> {
  const img = await decode(file);
  try {
    const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d 미지원");
    ctx.drawImage(img.source, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error("JPEG 변환 실패"));
        },
        "image/jpeg",
        quality,
      );
    });
    if (await hasExif(blob)) throw new Error("EXIF 제거 실패");
    return { blob, width, height };
  } finally {
    img.close();
  }
}

/** JPEG 앞부분에 EXIF(APP1 'Exif') 블록이 있는지 검사 — 검수용 */
export async function hasExif(blob: Blob): Promise<boolean> {
  const buf = new Uint8Array(await blob.slice(0, 65536).arrayBuffer());
  for (let i = 0; i < buf.length - 8; i++) {
    if (
      buf[i] === 0xff &&
      buf[i + 1] === 0xe1 &&
      buf[i + 4] === 0x45 &&
      buf[i + 5] === 0x78 &&
      buf[i + 6] === 0x69 &&
      buf[i + 7] === 0x66
    ) {
      return true;
    }
  }
  return false;
}
