/* SUPER REMATES ACOBAMBA - lógica: catálogo, carrito, administración y Supabase */
const CFG = window.SUPABASE_CONFIG;
const LOCAL = CFG.url.startsWith("PEGA"),
  LOCAL_PASS = "admin123";
const $ = (s, r = document) => r.querySelector(s),
  $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (n) => "S/ " + Number(n).toFixed(2),
  J = (k, d) => {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? d;
    } catch {
      return d;
    }
  };
const DEMO = [
  ["Audífonos Bluetooth", 59.9, 79.9, "🎧"],
  ["Smartwatch Deportivo", 89.9, 119.9, "⌚"],
  ["Lámpara LED", 45, 55, "💡"],
  ["Mouse Inalámbrico", 39.9, null, "🖱️"],
];
const S = {
  cats: LOCAL
    ? J("v5c", [
        { id: "tec", name: "Tecnología", icon: "💻" },
        { id: "hogar", name: "Hogar", icon: "🏠" },
      ])
    : [],
  prods: LOCAL
    ? J(
        "v5p",
        DEMO.map((d, i) => ({
          id: "d" + i,
          name: d[0],
          cat: i == 2 ? "hogar" : "tec",
          price: d[1],
          old: d[2],
          stock: 10,
          image: "",
          desc: "Producto de calidad disponible en la tienda.",
          featured: i < 2,
        })),
      )
    : [],
  cart: J("v5cart", []),
  loading: !LOCAL,
  cat: "all",
  cfg: { name: "SUPER REMATES", wa: "51900725974", ...J("v5cfg", {}) },
  authed: false,
};
let cloud = null;
const P = (id) => S.prods.find((p) => p.id === String(id)),
  C = (id) => S.cats.find((c) => c.id === String(id));
const imgH = (p, c = "ph") =>
  p.image
    ? `<img class="${c}" loading="lazy" src="${esc(p.image)}" alt="${esc(p.name)}">`
    : `<div class="${c}">🛍️</div>`;
let tm;
const toast = (m) => {
  const t = $("#toast");
  t.textContent = m;
  t.classList.add("on");
  clearTimeout(tm);
  tm = setTimeout(() => t.classList.remove("on"), 2200);
};
const saveL = () => {
  if (!LOCAL) return;
  localStorage.v5c = JSON.stringify(S.cats);
  localStorage.v5p = JSON.stringify(S.prods);
  localStorage.v5cfg = JSON.stringify(S.cfg);
};
const saveCart = () => localStorage.setItem("v5cart", JSON.stringify(S.cart));

// ===== Catálogo =====
function render() {
  const q = $("#q").value.toLowerCase().trim(),
    so = $("#sort").value;
  $("#chips").innerHTML = [{ id: "all", name: "Todos", icon: "🛍️" }, ...S.cats]
    .map(
      (c) =>
        `<button class="chip ${S.cat == c.id ? "on" : ""}" data-act="cat" data-id="${esc(c.id)}">${esc(c.icon || "📁")} ${esc(c.name)}</button>`,
    )
    .join("");
  let l = S.prods.filter(
    (p) =>
      (S.cat == "all" || p.cat == S.cat) &&
      (p.name + " " + p.desc).toLowerCase().includes(q),
  );
  l.sort(
    so == "a"
      ? (a, b) => a.price - b.price
      : so == "d"
        ? (a, b) => b.price - a.price
        : so == "n"
          ? (a, b) => a.name.localeCompare(b.name)
          : (a, b) => (b.featured | 0) - (a.featured | 0),
  );
  $("#grid").innerHTML = l.length
    ? l
        .map(
          (p) =>
            `<article class="card" data-act="open" data-id="${esc(p.id)}">${p.old > p.price ? '<span class="badge">OFERTA</span>' : ""}${imgH(p)}<div class="cb"><span class="tag">${esc(C(p.cat)?.name || "")}</span><h3>${esc(p.name)}</h3><div class="price">${money(p.price)}${p.old > p.price ? `<span class="old">${money(p.old)}</span>` : ""}</div><button class="add" data-act="add" data-id="${esc(p.id)}" ${p.stock < 1 ? "disabled" : ""}>${p.stock < 1 ? "Agotado" : "🛒 Agregar"}</button></div></article>`,
        )
        .join("")
    : S.loading
      ? '<div class="card sk"></div>'.repeat(6)
      : `<div class="empty">No hay productos todavía.</div>`;
  renderCart();
}
let pq = 1; // cantidad elegida en la ficha del producto
function pBar(p) {
  $("#pQty").textContent = pq;
  $("#pAdd").innerHTML =
    `<span class="n">${pq}</span><span>Agregar</span><b>${money(p.price * pq)}</b><i>›</i>`;
}
function openProd(id) {
  const p = P(id);
  if (!p) return;
  pq = 1;
  const off = p.old > p.price ? `<span class="old">${money(p.old)}</span>` : "";
  $("#pBody").innerHTML = `
    <div class="pd-head"><h2>${esc(p.name)}</h2></div>
    <div class="pd-grid">
      ${imgH(p, "big")}
      <div class="pd-info">
        <span class="tag">${esc(C(p.cat)?.name || "")}</span>
        <p class="pd-desc">${esc(p.desc)}</p>
        <div class="dprice">${money(p.price)}${off}</div>
        <div class="meta"><span>${p.stock > 0 ? `📦 Stock: ${p.stock}` : "❌ Agotado"}</span></div>
        <button class="link" data-act="share" data-id="${esc(p.id)}">🔗 Compartir producto</button>
      </div>
    </div>
    <div class="pd-foot">
      <div class="stp lg">
        <button data-act="pminus" data-id="${esc(p.id)}" aria-label="Menos">−</button>
        <b id="pQty">1</b>
        <button data-act="pplus" data-id="${esc(p.id)}" aria-label="Más">+</button>
      </div>
      <button class="bar" id="pAdd" data-act="addq" data-id="${esc(p.id)}" ${p.stock < 1 ? "disabled" : ""}></button>
    </div>`;
  pBar(p);
  history.replaceState(null, "", "#p=" + encodeURIComponent(p.id));
  $("#dProd").showModal();
}
function addQ(id) {
  const p = P(id);
  if (!p || p.stock < 1) return;
  const it = S.cart.find((i) => i.id == id);
  const total = Math.min(p.stock, (it ? it.qty : 0) + pq);
  it ? (it.qty = total) : S.cart.push({ id: p.id, qty: total });
  saveCart();
  renderCart();
  $("#dProd").close();
  const b = $("#cartBtn");
  b.classList.remove("bump");
  void b.offsetWidth;
  b.classList.add("bump");
  toast(`✅ ${p.name} agregado`);
}

// ===== Carrito =====
function add(id, btn) {
  const p = P(id);
  if (!p || p.stock < 1) return;
  let it = S.cart.find((i) => i.id == id);
  if (it && it.qty >= p.stock)
    return toast("Ya agregaste todo el stock disponible");
  it ? it.qty++ : S.cart.push({ id: p.id, qty: 1 });
  saveCart();
  renderCart();
  const b = $("#cartBtn");
  b.classList.remove("bump");
  void b.offsetWidth;
  b.classList.add("bump");
  toast(`✅ ${p.name} agregado`);
}
function renderCart() {
  S.cart = S.cart.filter((i) => P(i.id));
  let t = 0;
  $("#cItems").innerHTML = S.cart.length
    ? S.cart
        .map((i) => {
          const p = P(i.id);
          t += p.price * i.qty;
          return `<div class="line">${imgH(p)}<div class="li"><b class="nm">${esc(p.name)}</b><small class="ds">${esc(p.desc)}</small><div class="lr"><b class="pr">${money(p.price * i.qty)}</b><div class="stp"><button data-act="minus" data-id="${esc(p.id)}" aria-label="Menos">−</button><b>${i.qty}</b><button data-act="plus" data-id="${esc(p.id)}" aria-label="Más">+</button></div></div></div></div>`;
        })
        .join("")
    : `<div class="empty">Tu carrito está vacío 🛒</div>`;
  $("#cTot").textContent = money(t);
  $("#cNum").textContent = S.cart.reduce((n, i) => n + i.qty, 0);
  $("#cnt").textContent = S.cart.reduce((s, i) => s + i.qty, 0);
  saveCart();
}
function qty(id, d) {
  const i = S.cart.find((x) => x.id == id),
    p = P(id);
  if (!i || !p) return;
  i.qty += d;
  if (i.qty < 1) S.cart = S.cart.filter((x) => x !== i);
  else if (i.qty > p.stock) {
    i.qty = p.stock;
    toast("No hay más unidades");
  }
  renderCart();
}
// ===== WhatsApp: varios números y enlace compatible con emojis =====
const IS_MOBILE = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);
// En computadora se usa WhatsApp Web: la app de Windows rompe los emojis de wa.me.
const waUrl = (num, text) =>
  `https://${IS_MOBILE ? "wa.me/" + num + "?" : "web.whatsapp.com/send?phone=" + num + "&"}text=${encodeURIComponent(text)}`;
const waList = () => {
  const l = (S.cfg.waList || []).filter((w) => w && w.num);
  return l.length
    ? l
    : [{ id: "w0", label: "Principal", num: S.cfg.wa, use: "both" }];
};
const waFor = (kind) => {
  const l = waList().filter((w) => w.use === "both" || w.use === kind);
  return l.length ? l : waList();
};
function waRow(w = {}) {
  const o = (v, t) =>
    `<option value="${v}" ${w.use === v ? "selected" : ""}>${t}</option>`;
  return `<div class="warow"><input class="w-l" placeholder="Nombre (ej. Ventas)" value="${esc(w.label || "")}"><input class="w-n" inputmode="numeric" placeholder="51900725974" value="${esc(w.num || "")}"><select class="w-u">${o("both", "Consultas y pedidos")}${o("info", "Solo consultas")}${o("orders", "Solo pedidos")}</select><button type="button" class="del" data-act="delWa" aria-label="Eliminar">✕</button></div>`;
}
function renderWaAdmin() {
  $("#waAdmin").innerHTML = waList().map(waRow).join("");
}
function readWaAdmin() {
  return $$("#waAdmin .warow")
    .map((r, i) => ({
      id: "w" + i,
      label: $(".w-l", r).value.trim() || "WhatsApp " + (i + 1),
      num: $(".w-n", r).value.replace(/\D/g, ""),
      use: $(".w-u", r).value,
    }))
    .filter((w) => w.num);
}
function order() {
  if (!S.cart.length) return toast("Agrega productos al carrito");
  const name = $("#cName").value.trim();
  if (!name)
    return ($("#cName").focus(), toast("Escribe tu nombre para el pedido"));
  localStorage.v5name = name;
  const note = $("#cNote").value.trim();
  const items = S.cart
    .map((i) => {
      const p = P(i.id);
      return `• ${p.name} (x${i.qty}) — ${money(p.price * i.qty)}`;
    })
    .join("\n");
  const total = S.cart.reduce((s, i) => s + P(i.id).price * i.qty, 0);
  const msg = [
    `🛒 *NUEVO PEDIDO - ${S.cfg.name.toUpperCase()}*`,
    "",
    `👤 *Cliente:* ${name}`,
    `🚚 *Entrega:* ${$("#cMode").value}`,
    ...(note ? [`📝 *Nota:* ${note}`] : []),
    "",
    "📋 *Detalle de la compra:*",
    items,
    "",
    `💰 *Total a pagar: ${money(total)}*`,
    "",
    "¡Quedo a la espera de la confirmación! 🙌",
  ].join("\n");
  const dest = waFor("orders");
  const num = dest.length > 1 ? $("#cWa").value : dest[0].num;
  window.open(waUrl(num, msg), "_blank");
}
const WA_INFO =
  "¡Hola, Super Remates Acobamba! 👋 Quisiera más información sobre los productos y las ofertas que tienen disponibles. ¡Muchas gracias!";
function applyCfg() {
  $("#sName").textContent = S.cfg.name;
  const info = waFor("info"),
    multi = info.length > 1,
    f = $("#waF"),
    ff = $("#waFoot");
  [f, ff].forEach((a) => {
    a.href = multi ? "#" : waUrl(info[0].num, WA_INFO);
    multi
      ? a.setAttribute("data-act", "waMenu")
      : a.removeAttribute("data-act");
    multi ? a.removeAttribute("target") : a.setAttribute("target", "_blank");
  });
  $("#waMenu").innerHTML = info
    .map(
      (w) =>
        `<a href="${esc(waUrl(w.num, WA_INFO))}" target="_blank" rel="noopener">💬 ${esc(w.label)}<small>${esc(w.num.replace(/^51/, ""))}</small></a>`,
    )
    .join("");
  const ord = waFor("orders");
  $("#cWa").innerHTML = ord
    .map(
      (w) =>
        `<option value="${esc(w.num)}">Enviar pedido a: ${esc(w.label)}</option>`,
    )
    .join("");
  $("#cWa").classList.toggle("hidden", ord.length < 2);
  const main = waList()[0].num,
    t = $("#tel");
  t.textContent = main.replace(/^51/, "");
  t.href = "tel:+" + main;
  $("#hor").textContent = S.cfg.hor || "";
  $("#horRow").classList.toggle("hidden", !S.cfg.hor);
  const safe = (u) => (/^https?:\/\//i.test(u || "") ? esc(u) : "");
  $("#social").innerHTML = [
    ["Facebook", safe(S.cfg.fb)],
    ["TikTok", safe(S.cfg.tt)],
  ]
    .filter((x) => x[1])
    .map((x) => `<a href="${x[1]}" target="_blank" rel="noopener">${x[0]}</a>`)
    .join("");
  $("#yr").textContent = new Date().getFullYear();
  document.title = S.cfg.name + " Acobamba";
}

// ===== Administración =====
async function put(kind, o, id) {
  const a = kind == "products" ? S.prods : S.cats,
    i = a.findIndex((x) => x.id == o.id);
  if (kind != "settings") {
    i < 0 ? a.push(o) : (a[i] = o);
  } else S.cfg = { ...S.cfg, ...o };
  saveL();
  render();
  applyCfg();
  adminLists();
  try {
    if (cloud) await cloud.set(kind, o, id || o.id);
    toast(cloud ? "✅ Guardado en la nube" : "✅ Guardado (modo local)");
  } catch (e) {
    alert("No se pudo guardar: " + e.message);
  }
}
async function del(kind, id) {
  const a = kind == "products" ? "prods" : "cats";
  S[a] = S[a].filter((x) => x.id != id);
  saveL();
  render();
  adminLists();
  try {
    if (cloud) await cloud.del(kind, id);
  } catch (e) {
    alert("No se pudo eliminar: " + e.message);
  }
}
function adminLists() {
  $("#selCat").innerHTML = S.cats
    .map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`)
    .join("");
  $("#lP").innerHTML = S.prods
    .map(
      (p) =>
        `<div class="row"><div><b>${esc(p.name)}</b><small>${money(p.price)} · stock ${p.stock}</small></div><button data-act="editP" data-id="${esc(p.id)}">Editar</button><button class="del" data-act="delP" data-id="${esc(p.id)}">✕</button></div>`,
    )
    .join("");
  $("#lC").innerHTML = S.cats
    .map(
      (c) =>
        `<div class="row"><div><b>${esc(c.icon || "📁")} ${esc(c.name)}</b><small>${S.prods.filter((p) => p.cat == c.id).length} productos</small></div><button data-act="editC" data-id="${esc(c.id)}">Editar</button><button class="del" data-act="delC" data-id="${esc(c.id)}">✕</button></div>`,
    )
    .join("");
  const f = $("#fS");
  f.name.value = S.cfg.name;
  renderWaAdmin();
  f.hor.value = S.cfg.hor || "";
  f.fb.value = S.cfg.fb || "";
  f.tt.value = S.cfg.tt || "";
}
function view() {
  $("#login").classList.toggle("hidden", S.authed);
  $("#panel").classList.toggle("hidden", !S.authed);
  $("#admBtn").classList.toggle("hidden", !S.authed);
  document.body.classList.toggle("admin-on", S.authed);
  if (S.authed) adminLists();
  $("#em").classList.toggle("hidden", LOCAL);
  $("#lmsg").textContent = LOCAL
    ? "Modo local de prueba. Contraseña inicial: " + LOCAL_PASS
    : "";
}
const formObj = (f) => Object.fromEntries(new FormData(f));
function compress(file, max = 600, qual = 0.7) {
  return new Promise((ok, no) => {
    const im = new Image(),
      u = URL.createObjectURL(file);
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)),
        c = document.createElement("canvas");
      c.width = im.width * k;
      c.height = im.height * k;
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      ok(c.toDataURL("image/jpeg", qual));
    };
    im.onerror = no;
    im.src = u;
  });
}
const resetP = () => {
  $("#fP").reset();
  $("#fP").id.value = "";
  $("#fP").image.value = "";
  $("#prev").style.display = "none";
};
const resetC = () => {
  $("#fC").reset();
  $("#fC").id.value = "";
};

// ===== Enlaces directos y acceso oculto al administrador =====
function deepLink() {
  const m = location.hash.match(/^#p=(.+)$/);
  if (m && P(decodeURIComponent(m[1])) && !$("#dProd").open)
    openProd(decodeURIComponent(m[1]));
}
function adminHash() {
  if (location.hash !== "#admin") return;
  history.replaceState(null, "", location.pathname);
  view();
  $("#dAdmin").showModal();
}
let taps = 0,
  tapTimer;
$(".brand").addEventListener("click", () => {
  clearTimeout(tapTimer);
  tapTimer = setTimeout(() => (taps = 0), 1500);
  if (++taps >= 5) {
    taps = 0;
    view();
    $("#dAdmin").showModal();
  }
});
$("#dProd").addEventListener("close", () => {
  if (location.hash.startsWith("#p="))
    history.replaceState(null, "", location.pathname);
});
window.addEventListener("hashchange", () => {
  adminHash();
  deepLink();
});

const ACT = {
  addWa() {
    $("#waAdmin").insertAdjacentHTML("beforeend", waRow({ use: "both" }));
  },
  delWa(_, b) {
    if ($$("#waAdmin .warow").length < 2)
      return toast("Debe quedar al menos un WhatsApp");
    b.closest(".warow").remove();
  },
  waMenu() {
    $("#waMenu").classList.toggle("hidden");
  },
  ofertas() {
    S.cat = "all";
    $("#sort").value = "";
    $("#q").value = "";
    render();
    $("#catalogo").scrollIntoView({ behavior: "smooth" });
  },
  pplus(id) {
    const p = P(id);
    if (pq < p.stock) pq++;
    else toast("No hay más unidades");
    pBar(p);
  },
  pminus(id) {
    if (pq > 1) pq--;
    pBar(P(id));
  },
  addq: addQ,
  async share(id) {
    const url =
      location.origin + location.pathname + "#p=" + encodeURIComponent(id);
    try {
      if (navigator.share) await navigator.share({ title: P(id).name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("🔗 Enlace copiado");
      }
    } catch {}
  },
  backup() {
    const blob = new Blob(
      [JSON.stringify({ cats: S.cats, prods: S.prods, cfg: S.cfg }, null, 1)],
      { type: "application/json" },
    );
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download:
        "copia-tienda-" + new Date().toISOString().slice(0, 10) + ".json",
    });
    a.click();
    URL.revokeObjectURL(a.href);
  },
  // En modo admin, tocar un producto abre su formulario de edición.
  open(id) {
    if (!S.authed) return openProd(id);
    const d = $("#dAdmin");
    if (!d.open) d.showModal();
    ACT.tab("tP");
    ACT.editP(id);
  },
  add,
  cart() {
    renderCart();
    $("#dCart").showModal();
  },
  plus: (id) => qty(id, 1),
  minus: (id) => qty(id, -1),
  rm(id) {
    S.cart = S.cart.filter((i) => i.id != id);
    renderCart();
  },
  clear() {
    if (S.cart.length && confirm("¿Vaciar el carrito?")) {
      S.cart = [];
      renderCart();
    }
  },
  wa: order,
  cat(id) {
    S.cat = id;
    render();
  },
  close(_, b) {
    b.closest("dialog").close();
  },
  admin() {
    view();
    $("#dAdmin").showModal();
  },
  tab(id) {
    $$("#panel .tabs .chip").forEach((b) =>
      b.classList.toggle("on", b.dataset.id == id),
    );
    ["tP", "tC", "tS"].forEach((t) =>
      $("#" + t).classList.toggle("hidden", t != id),
    );
  },
  editP(id) {
    const p = P(id),
      f = $("#fP");
    if (!p) return;
    f.id.value = p.id;
    f.name.value = p.name;
    f.cat.value = p.cat;
    f.price.value = p.price;
    f.old.value = p.old || "";
    f.stock.value = p.stock;
    f.desc.value = p.desc;
    f.featured.checked = !!p.featured;
    f.image.value = p.image || "";
    $("#prev").src = p.image || "";
    $("#prev").style.display = p.image ? "block" : "none";
    f.scrollIntoView({ behavior: "smooth" });
  },
  delP(id) {
    if (confirm("¿Eliminar este producto?")) del("products", id);
  },
  editC(id) {
    const c = C(id),
      f = $("#fC");
    if (c) {
      f.id.value = c.id;
      f.name.value = c.name;
      f.icon.value = c.icon || "";
    }
  },
  delC(id) {
    if (S.prods.some((p) => p.cat == id))
      return alert(
        "Esta categoría tiene productos. Cámbialos de categoría primero.",
      );
    if (confirm("¿Eliminar categoría?")) del("categories", id);
  },
  logout() {
    S.authed = false;
    cloud?.logout();
    view();
  },
  resetP,
  resetC,
};
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-act]");
  if (t && ACT[t.dataset.act]) {
    e.preventDefault();
    ACT[t.dataset.act](t.dataset.id, t);
  } else if (e.target.tagName == "DIALOG") e.target.close();
  if (!e.target.closest("#waMenu, #waF, #waFoot"))
    $("#waMenu").classList.add("hidden");
});
$("#q").addEventListener("input", render);
$("#sort").addEventListener("change", render);
$("#file").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const d = await compress(f);
    $("#fP").image.value = d;
    $("#prev").src = d;
    $("#prev").style.display = "block";
  } catch {
    alert("No se pudo leer la imagen");
  }
});
$("#fP").addEventListener("submit", async (e) => {
  e.preventDefault();
  const d = formObj(e.target);
  if (!d.cat) return alert("Primero crea una categoría.");
  let image = d.image || "";
  try {
    if (cloud && image.startsWith("data:")) image = await cloud.upload(image);
  } catch (err) {
    return alert("No se pudo subir la foto: " + err.message);
  }
  put("products", {
    id: d.id || "p" + Date.now(),
    name: d.name.trim(),
    cat: d.cat,
    price: +d.price,
    old: d.old ? +d.old : null,
    stock: +d.stock,
    image,
    desc: d.desc.trim() || "Producto de calidad.",
    featured: !!d.featured,
  });
  resetP();
});
$("#fC").addEventListener("submit", (e) => {
  e.preventDefault();
  const d = formObj(e.target);
  put("categories", {
    id: d.id || "c" + Date.now(),
    name: d.name.trim(),
    icon: d.icon.trim() || "📁",
  });
  resetC();
});
$("#fS").addEventListener("submit", (e) => {
  e.preventDefault();
  const d = formObj(e.target);
  put(
    "settings",
    {
      name: d.name.trim() || "SUPER REMATES",
      waList: readWaAdmin().length ? readWaAdmin() : waList(),
      wa: (readWaAdmin()[0] || waList()[0]).num,
      hor: d.hor.trim(),
      fb: d.fb.trim(),
      tt: d.tt.trim(),
    },
    "store",
  );
});
$("#login").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    if (LOCAL) {
      if ($("#pw").value !== LOCAL_PASS) throw 0;
      S.authed = true;
    } else await cloud.login($("#em").value.trim(), $("#pw").value);
    $("#pw").value = "";
    view();
  } catch {
    alert("Correo o contraseña incorrectos.");
  }
});

// ===== Supabase (gratis): datos, login de admin y fotos =====
async function initCloud() {
  if (LOCAL) return;
  const { createClient } = await import(
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"
  );
  const sb = createClient(CFG.url, CFG.anonKey);
  const ok = (r) => {
    if (r.error) throw r.error;
    return r;
  };
  cloud = {
    set: async (k, o, id) =>
      ok(await sb.from(k).upsert({ id: String(id), data: o })),
    del: async (k, id) => ok(await sb.from(k).delete().eq("id", String(id))),
    login: async (e, p) =>
      ok(await sb.auth.signInWithPassword({ email: e, password: p })),
    logout: () => sb.auth.signOut(),
    upload: async (dataUrl) => {
      const blob = await (await fetch(dataUrl)).blob(),
        path = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ".jpg";
      ok(
        await sb.storage
          .from("productos")
          .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" }),
      );
      return sb.storage.from("productos").getPublicUrl(path).data.publicUrl;
    },
  };
  sb.auth.onAuthStateChange((_e, ses) => {
    S.authed = !!ses;
    view();
  });
  const load = async () => {
    const [p, c, st] = await Promise.all([
      sb.from("products").select("data"),
      sb.from("categories").select("data"),
      sb.from("settings").select("data").eq("id", "store"),
    ]);
    if (!p.error) S.prods = p.data.map((r) => r.data);
    if (!c.error) S.cats = c.data.map((r) => r.data);
    if (st.data?.[0]) {
      S.cfg = { ...S.cfg, ...st.data[0].data };
      applyCfg();
    }
    S.loading = false;
    render();
    deepLink();
    adminLists();
  };
  await load();
  let t;
  sb.channel("tienda")
    .on("postgres_changes", { event: "*", schema: "public" }, () => {
      clearTimeout(t);
      t = setTimeout(load, 300);
    })
    .subscribe();
}
$("#restore").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  e.target.value = "";
  if (
    !f ||
    !confirm(
      "¿Restaurar esta copia? Se agregarán o actualizarán sus productos y categorías.",
    )
  )
    return;
  try {
    const d = JSON.parse(await f.text());
    for (const c of d.cats || []) await put("categories", c);
    for (const p of d.prods || []) await put("products", p);
    toast("✅ Copia restaurada");
  } catch {
    alert("El archivo no es una copia válida.");
  }
});
$("#cName").value = localStorage.v5name || "";
setTimeout(() => {
  if (S.loading) {
    S.loading = false;
    render();
  }
}, 8000);
applyCfg();
render();
view();
adminHash();
deepLink();
initCloud().catch((e) => {
  console.error(e);
  toast("No se pudo conectar a la nube");
});
