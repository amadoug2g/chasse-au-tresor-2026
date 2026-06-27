/* ===== QR SCANNER ===== */

let scanStream    = null;
let scanAnimFrame = null;

function openScanner() {
  const overlay = document.getElementById('scannerOverlay');
  overlay.classList.add('active');
  startCamera();
}

function closeScanner() {
  document.getElementById('scannerOverlay').classList.remove('active');
  stopCamera();
}

async function startCamera() {
  try {
    const video  = document.getElementById('scanVideo');
    scanStream   = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = scanStream;
    await video.play();
    scanFrame();
  } catch(e) {
    let msg = 'Caméra non disponible.';
    if (!window.isSecureContext) {
      msg = 'La caméra nécessite une connexion HTTPS sécurisée.';
    } else if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
      msg = 'Permission caméra refusée. Autorise l\'accès dans les réglages de ton navigateur, puis recharge la page.';
    } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
      msg = 'Aucune caméra détectée sur cet appareil.';
    } else if (e.name === 'NotReadableError') {
      msg = 'La caméra est déjà utilisée par une autre application. Ferme-la et réessaie.';
    }
    const videoContainer = document.querySelector('#scannerOverlay .scanner-video-container');
    if (videoContainer) {
      videoContainer.innerHTML =
        '<div style="text-align:center;padding:32px 24px;color:#fff">' +
        '<div style="font-size:52px;margin-bottom:16px">📷</div>' +
        '<div style="font-size:15px;line-height:1.5;margin-bottom:28px">' + escHTML(msg) + '</div>' +
        '<button class="btn btn-secondary" style="background:#fff;color:#111;max-width:260px" onclick="closeScanner();showHelpPanel()">' +
        'Demander de l\'aide aux organisateurs</button>' +
        '</div>';
    }
  }
}

function stopCamera() {
  if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
  if (scanAnimFrame) { cancelAnimationFrame(scanAnimFrame); scanAnimFrame = null; }
}

// Hook de test E2E (page.evaluate attend le resolve pour savoir que la validation est finie)
window.__injectQR = async function(code) {
  closeScanner();
  await validateQR(normQR(code));
};

function scanFrame() {
  const video  = document.getElementById('scanVideo');
  const canvas = document.getElementById('scanCanvas');
  if (!video || !canvas) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
    if (code && code.data) {
      closeScanner();
      validateQR(normQR(code.data));
      return;
    }
  }
  scanAnimFrame = requestAnimationFrame(scanFrame);
}
