/* ============================================================
   Invitation Link Generator — script
   Semua proses berjalan di browser (tanpa backend).
   ============================================================ */

(function () {
  "use strict";

  // URL dasar undangan — JANGAN diubah.
  const BASE_URL = "https://efra3106.github.io/Undanga-Grazinia/";
  const STORAGE_KEY = "invitationGenerator.lastGuestName";
  const TOAST_DURATION = 2000;

  // ---------- Elemen ----------
  const guestForm = document.getElementById("guestForm");
  const guestNameInput = document.getElementById("guestName");
  const createLinkButton = document.getElementById("createLinkButton");
  const errorMessage = document.getElementById("errorMessage");
  const resultSection = document.getElementById("resultSection");
  const guestPreview = document.getElementById("guestPreview");
  const invitationUrlInput = document.getElementById("invitationUrl");
  const copyLinkButton = document.getElementById("copyLinkButton");
  const whatsappTextarea = document.getElementById("whatsappMessage");
  const copyTextButton = document.getElementById("copyTextButton");
  const shareWhatsappButton = document.getElementById("shareWhatsappButton");
  const resetButton = document.getElementById("resetButton");
  const toast = document.getElementById("toast");

  let toastTimer = null;
  let isCreating = false;

  // ---------- Validasi ----------
  function validateGuestName(rawValue) {
    const name = String(rawValue || "").trim();
    if (!name) {
      return { valid: false, name: "", error: "Silakan masukkan nama tamu terlebih dahulu." };
    }
    return { valid: true, name: name, error: "" };
  }

  function showError(message) {
    errorMessage.textContent = message;
    guestNameInput.classList.add("is-invalid");
    guestNameInput.setAttribute("aria-invalid", "true");
    guestNameInput.focus();
  }

  function clearError() {
    errorMessage.textContent = "";
    guestNameInput.classList.remove("is-invalid");
    guestNameInput.removeAttribute("aria-invalid");
  }

  // ---------- Pembuatan URL & pesan ----------
  function buildInvitationUrl(guestName) {
    // encodeURIComponent hanya untuk nilai parameter; #splash tidak di-encode.
    return BASE_URL + "?to=" + encodeURIComponent(guestName) + "#splash";
  }

  function generateWhatsappMessage(name, url) {
    return `Salam Sejahtera 🙏

Dengan penuh sukacita, kami mengundang:

*Bapak/Ibu/Saudara/i*
*${name}*

untuk hadir dan turut berbagi kebahagiaan dalam acara syukuran Baptisan dan
ulang tahun ke-5 putri kami,

*Grazinia Tiffani Angkol*

Untuk melihat informasi lengkap mengenai acara, waktu, lokasi,
dan detail lainnya, silakan kunjungi undangan digital kami melalui
link berikut:

🔗 ${url}

Merupakan suatu kebahagiaan bagi kami apabila
Bapak/Ibu/Saudara/i berkenan hadir dan turut memberikan
doa serta ucapan terbaik untuk Grazinia.

Atas perhatian, doa, dan kehadirannya, kami mengucapkan
terima kasih.

Salam hangat,
*Keluarga Grazinia Tiffani Angkol* 🙏`;
  }

  function createInvitationLink() {
    if (isCreating) return; // cegah pembuatan ganda
    isCreating = true;
    createLinkButton.disabled = true;

    try {
      const result = validateGuestName(guestNameInput.value);

      if (!result.valid) {
        showError(result.error);
        return;
      }

      clearError();

      const guestName = result.name;
      const invitationUrl = buildInvitationUrl(guestName);
      const whatsappMessage = generateWhatsappMessage(guestName, invitationUrl);

      // Tampilkan hasil — selalu via textContent / value (aman dari HTML injection).
      guestPreview.textContent = guestName;
      invitationUrlInput.value = invitationUrl;
      whatsappTextarea.value = whatsappMessage;

      resultSection.classList.remove("hidden");
      saveLastGuestName(guestName);

      // Di HP, gulir ke hasil agar tombol SHARE langsung terlihat.
      requestAnimationFrame(function () {
        resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } finally {
      // Lepas kunci setelah frame singkat agar ketukan ganda tidak diproses dua kali.
      setTimeout(function () {
        isCreating = false;
        createLinkButton.disabled = false;
      }, 300);
    }
  }

  // ---------- Clipboard ----------
  function fallbackCopy(text) {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.top = "-9999px";
    helper.style.left = "-9999px";
    helper.style.opacity = "0";
    document.body.appendChild(helper);

    const selection = document.getSelection();
    const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    helper.select();
    helper.setSelectionRange(0, text.length);

    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {
      ok = false;
    }

    document.body.removeChild(helper);
    if (previousRange && selection) {
      selection.removeAllRanges();
      selection.addRange(previousRange);
    }
    return ok;
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return fallbackCopy(text); }
      );
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function copyLink() {
    const url = invitationUrlInput.value;
    if (!url) {
      showToast("Buat link terlebih dahulu.", true);
      return;
    }
    copyToClipboard(url).then(function (ok) {
      if (ok) {
        showToast("Link berhasil disalin");
      } else {
        invitationUrlInput.focus();
        invitationUrlInput.select();
        showToast("Gagal menyalin. Silakan salin link secara manual.", true);
      }
    });
  }

  function copyWhatsappMessage() {
    const message = whatsappTextarea.value;
    if (!message.trim()) {
      showToast("Pesan masih kosong.", true);
      return;
    }
    copyToClipboard(message).then(function (ok) {
      if (ok) {
        showToast("Pesan berhasil disalin");
      } else {
        whatsappTextarea.focus();
        whatsappTextarea.select();
        showToast("Gagal menyalin. Silakan salin pesan secara manual.", true);
      }
    });
  }

  // ---------- WhatsApp ----------
  function shareToWhatsapp() {
    // Selalu ambil dari textarea, sehingga hasil edit admin ikut terkirim.
    const whatsappMessage = whatsappTextarea.value;
    if (!whatsappMessage.trim()) {
      showToast("Pesan masih kosong.", true);
      return;
    }

    // encodeURIComponent hanya SATU KALI pada seluruh pesan.
    const whatsappUrl = "https://wa.me/?text=" + encodeURIComponent(whatsappMessage);

    let newWindow = null;
    try {
      newWindow = window.open(whatsappUrl, "_blank");
    } catch (e) {
      newWindow = null;
    }

    if (!newWindow) {
      showToast("WhatsApp tidak dapat dibuka otomatis. Silakan gunakan tombol COPY TEXT.", true);
      return;
    }

    try {
      newWindow.opener = null;
    } catch (e) {
      /* abaikan */
    }
  }

  // ---------- Reset ----------
  function resetForm() {
    guestNameInput.value = "";
    guestPreview.textContent = "";
    invitationUrlInput.value = "";
    whatsappTextarea.value = "";
    resultSection.classList.add("hidden");
    clearError();
    saveLastGuestName("");

    window.scrollTo({ top: 0, behavior: "smooth" });
    guestNameInput.focus();
    showToast("Form telah direset");
  }

  // ---------- Toast ----------
  function showToast(message, isError) {
    toast.textContent = message;
    toast.classList.toggle("toast-error", Boolean(isError));
    toast.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("show");
    }, isError ? TOAST_DURATION + 1500 : TOAST_DURATION);
  }

  // ---------- localStorage (opsional: hanya nama tamu terakhir) ----------
  function saveLastGuestName(name) {
    try {
      if (name) {
        localStorage.setItem(STORAGE_KEY, name);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      /* storage tidak tersedia — abaikan */
    }
  }

  function loadLastGuestName() {
    try {
      return localStorage.getItem(STORAGE_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  // ---------- Event ----------
  // Form submit menangani klik CREATE LINK dan tombol Enter pada input.
  guestForm.addEventListener("submit", function (event) {
    event.preventDefault();
    createInvitationLink();
  });

  guestNameInput.addEventListener("input", function () {
    if (errorMessage.textContent) clearError();
  });

  copyLinkButton.addEventListener("click", copyLink);
  copyTextButton.addEventListener("click", copyWhatsappMessage);
  shareWhatsappButton.addEventListener("click", shareToWhatsapp);
  resetButton.addEventListener("click", resetForm);

  // Isi otomatis nama terakhir (tanpa membuat link otomatis).
  const lastName = loadLastGuestName();
  if (lastName) {
    guestNameInput.value = lastName;
  }
})();
