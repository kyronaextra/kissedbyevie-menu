/* Spin the Wheel — edit WHEEL_PRIZES to change slices.
   Short labels are drawn on the wheel. Full text is the result and the Telegram claim. */
(function () {
  "use strict";

  var WHEEL_PRIZES = [
    { label: "Spank · count 20", full: "Spank hard, and slowly. Count to 20." },
    { label: "Play with my tits", full: "Play with my tits 😩" },
    { label: "Bend over, spread", full: "Bend over, spread" },
    { label: "Bend over, shake", full: "Bend over, shake" },
    { label: "Pick the dildo", full: "Pick what dildo I f myself with" }
  ];

  var TELEGRAM = "https://t.me/m/M0AMf5LDMGFh";
  var canvas = document.getElementById("wheelCanvas");
  var spinButton = document.getElementById("wheelSpin");
  var againButton = document.getElementById("wheelAgain");
  var claimLink = document.getElementById("wheelClaim");
  var readout = document.getElementById("wheelReadout");
  var prizeNode = document.getElementById("wheelPrize");
  var actions = document.getElementById("wheelActions");
  var statusNode = document.getElementById("wheelStatus");
  var pointer = document.getElementById("wheelPointer");
  var section = document.getElementById("spin-wheel");
  if (!canvas || !spinButton || !section) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ctx = canvas.getContext("2d", { alpha: true });
  var cssSize = 320;
  var dpr = 1;
  var rot = -Math.PI / WHEEL_PRIZES.length;
  var spinning = false;
  var raf = 0;
  var lastSlice = -1;
  var landed = -1;

  function sliceAngle() {
    return (Math.PI * 2) / WHEEL_PRIZES.length;
  }

  function sliceIndex(angle) {
    var n = WHEEL_PRIZES.length;
    var norm = ((-angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    return Math.floor(norm / sliceAngle()) % n;
  }

  function targetFor(index, from) {
    var slice = sliceAngle();
    var base = -index * slice - slice / 2;
    var min = from + (reduced ? 0 : (6 + Math.random() * 1.5) * Math.PI * 2);
    var k = Math.ceil((min - base) / (Math.PI * 2));
    if (k < 0) k = 0;
    return base + k * Math.PI * 2;
  }

  function chrome(x0, y0, x1, y1) {
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.2, "#9aebff");
    g.addColorStop(0.42, "#ff4d8d");
    g.addColorStop(0.58, "#ffffff");
    g.addColorStop(0.78, "#7ad8ff");
    g.addColorStop(1, "#ffd0ea");
    return g;
  }

  function wrapLabel(label, maxWidth) {
    if (ctx.measureText(label).width <= maxWidth) return [label];
    var words = label.split(" ");
    var lines = [];
    var current = "";
    words.forEach(function (word) {
      var next = current ? current + " " + word : word;
      if (ctx.measureText(next).width <= maxWidth) current = next;
      else {
        if (current) lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);
    return lines.slice(0, 3);
  }

  function resize() {
    var stage = spinButton.parentElement;
    var next = Math.max(240, Math.min(stage ? stage.clientWidth : 320, 520));
    cssSize = next;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssSize * dpr);
    canvas.height = Math.round(cssSize * dpr);
    canvas.style.width = cssSize + "px";
    canvas.style.height = cssSize + "px";
    draw(0);
  }

  function drawWheel(angle, alpha, withLabels) {
    var slice = sliceAngle();
    var radius = cssSize * 0.4;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cssSize / 2, cssSize / 2);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    var face = ctx.createRadialGradient(-radius * 0.2, -radius * 0.25, radius * 0.1, 0, 0, radius);
    face.addColorStop(0, "#241820");
    face.addColorStop(0.55, "#100c10");
    face.addColorStop(1, "#07060a");
    ctx.fillStyle = face;
    ctx.fill();

    ctx.lineWidth = Math.max(2, cssSize * 0.008);
    ctx.font = "700 " + Math.max(10, cssSize * 0.03) + "px Outfit, 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    var i;
    for (i = 0; i < WHEEL_PRIZES.length; i++) {
      var a0 = -Math.PI / 2 + i * slice;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a0) * radius, Math.sin(a0) * radius);
      ctx.strokeStyle = chrome(-radius, -radius, radius, radius);
      ctx.stroke();
      if (!withLabels) continue;
      var mid = a0 + slice / 2;
      ctx.save();
      ctx.rotate(mid);
      ctx.translate(radius * 0.8, 0);
      ctx.rotate(-(mid + angle));
      ctx.fillStyle = "#fff7fb";
      ctx.shadowColor = "rgba(0,0,0,.65)";
      ctx.shadowBlur = 4;
      var lines = wrapLabel(WHEEL_PRIZES[i].label, radius * 0.34);
      var lineH = Math.max(12, cssSize * 0.042);
      var startY = -((lines.length - 1) * lineH) / 2;
      lines.forEach(function (line, lineIndex) {
        ctx.fillText(line, 0, startY + lineIndex * lineH);
      });
      ctx.restore();
    }
    ctx.restore();
  }

  function drawRimAndHub() {
    var radius = cssSize * 0.4;
    var cx = cssSize / 2;
    var cy = cssSize / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.arc(0, 0, radius + cssSize * 0.012, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(10, cssSize * 0.045);
    ctx.strokeStyle = "#ff2d86";
    ctx.shadowColor = "#ff4d8d";
    ctx.shadowBlur = cssSize * 0.06;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 0, radius + cssSize * 0.04, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(2, cssSize * 0.008);
    ctx.strokeStyle = chrome(-radius, -radius, radius, radius);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, radius - ctx.lineWidth, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,.45)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    var hub = cssSize * 0.075;
    var gloss = ctx.createRadialGradient(-hub * 0.3, -hub * 0.35, hub * 0.1, 0, 0, hub);
    gloss.addColorStop(0, "#ffffff");
    gloss.addColorStop(0.35, "#b7f4ff");
    gloss.addColorStop(0.62, "#ff4d8d");
    gloss.addColorStop(1, "#6d5b78");
    ctx.beginPath();
    ctx.arc(0, 0, hub, 0, Math.PI * 2);
    ctx.fillStyle = gloss;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,.8)";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, hub * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = "#09070b";
    ctx.fill();
    ctx.restore();
  }

  function draw(speed) {
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssSize, cssSize);
    if (!reduced && speed > 0.04) {
      drawWheel(rot - speed * 3.4, 0.28, false);
      drawWheel(rot - speed * 1.7, 0.45, false);
    }
    drawWheel(rot, 1, true);
    drawRimAndHub();
  }

  function flick(index) {
    if (!pointer || reduced || index === lastSlice) return;
    lastSlice = index;
    pointer.classList.remove("is-flick");
    void pointer.offsetWidth;
    pointer.classList.add("is-flick");
  }

  function hideResult() {
    landed = -1;
    if (readout) readout.hidden = true;
    if (actions) actions.hidden = true;
    if (prizeNode) prizeNode.textContent = "";
    if (claimLink) delete claimLink.dataset.prize;
    section.classList.remove("is-result");
  }

  function showResult(index) {
    var prize = WHEEL_PRIZES[index];
    landed = index;
    if (prizeNode) prizeNode.textContent = prize.full;
    if (readout) readout.hidden = false;
    if (actions) actions.hidden = false;
    if (claimLink) claimLink.dataset.prize = prize.full;
    section.classList.add("is-result");
    var joiner = /[.!?]$/u.test(prize.full) ? " " : ". ";
    if (statusNode) statusNode.textContent = "Your pick: " + prize.full + joiner + "This is a preview. Claim opens Telegram so you can paste it.";
    spinButton.setAttribute("aria-label", "Spin the wheel again");
  }

  function finish(index) {
    spinning = false;
    var slice = sliceAngle();
    var base = -index * slice - slice / 2;
    var k = Math.round((rot - base) / (Math.PI * 2));
    rot = base + k * Math.PI * 2;
    draw(0);
    lastSlice = index;
    showResult(index);
    spinButton.disabled = false;
    spinButton.removeAttribute("aria-busy");
  }

  function spin() {
    if (spinning) return;
    spinning = true;
    hideResult();
    spinButton.disabled = true;
    spinButton.setAttribute("aria-busy", "true");
    if (statusNode) statusNode.textContent = reduced ? "Picking a slice." : "Spinning.";
    var index = Math.floor(Math.random() * WHEEL_PRIZES.length);
    var from = rot;
    var target = targetFor(index, from);
    if (reduced) {
      rot = target;
      finish(index);
      return;
    }
    var start = performance.now();
    var dur = 4600;
    var prev = from;
    function frame(now) {
      var t = Math.min(1, (now - start) / dur);
      var eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      rot = from + (target - from) * eased;
      var speed = Math.abs(rot - prev);
      prev = rot;
      draw(speed);
      flick(sliceIndex(rot));
      if (t < 1) raf = requestAnimationFrame(frame);
      else finish(index);
    }
    raf = requestAnimationFrame(frame);
  }

  function claimMessage(full) {
    return "Hey Evie — Spin the Wheel preview.\n\nMy pick: " + full + "\n\nI know the wheel on the site is a demo. The real spin is a 200-token tip on Stripchat (@kissedbyevie). Please confirm before anything is booked.\n\nI confirm I am 18+.";
  }

  function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(value);
    return new Promise(function (resolve, reject) {
      var area = document.createElement("textarea");
      area.value = value;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      var ok = document.execCommand("copy");
      area.remove();
      if (ok) resolve();
      else reject(new Error("copy"));
    });
  }

  spinButton.addEventListener("click", function () {
    spin();
  });
  if (againButton) againButton.addEventListener("click", function () {
    spin();
  });
  if (claimLink) {
    claimLink.addEventListener("click", function (event) {
      var full = claimLink.dataset.prize;
      if (!full) return;
      event.preventDefault();
      var message = claimMessage(full);
      copyText(message).then(function () {
        if (statusNode) statusNode.textContent = "Copied your pick. Paste it into Telegram. Evie confirms before anything is booked.";
        window.location.assign(TELEGRAM);
      }).catch(function () {
        if (statusNode) statusNode.textContent = message;
        window.location.assign(TELEGRAM);
      });
    });
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden || !spinning) return;
    cancelAnimationFrame(raf);
    var index = sliceIndex(rot);
    finish(index);
  });

  window.addEventListener("resize", resize, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { draw(0); });
  resize();

  window.EvieWheel = {
    prizes: WHEEL_PRIZES,
    claimMessage: claimMessage,
    telegram: TELEGRAM,
    spin: spin,
    sliceIndex: function () { return sliceIndex(rot); }
  };
})();
