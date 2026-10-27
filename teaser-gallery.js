/* Kissed by Evie — free, members-only photo teasers.
   Teaser files are PRE-CENSORED, stored separately from paid media.
   Image links are short-lived; Supabase metadata/storage RLS enforces member access.
   There is no OnlyFans verification or VIP entitlement check here. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const grid = $("teaserGrid");
  const viewer = $("teaserViewer");
  const bucket = "evie-account-teasers";
  let client = null;
  let signedIn = false;
  let generation = 0;
  let tiles = [];
  let currentIndex = 0;

  function status(s) { $("teaserFeedback").textContent = s || ""; }
  function clear() {
    generation++;
    signedIn = false;
    client = null;
    tiles = [];
    grid.replaceChildren();
    if (viewer.open) viewer.close();
    $("teaserLargePhoto").removeAttribute("src");
    $("teaserSection").hidden = true;
    status("");
  }
  function empty(message) {
    const p = document.createElement("p");
    p.className = "teaser-empty";
    p.textContent = message;
    grid.replaceChildren(p);
  }
  function showPhoto(index) {
    const p = tiles[index];
    if (!p || !signedIn) return;
    currentIndex = index;
    const pic = $("teaserLargePhoto");
    pic.src = p.url;
    pic.alt = p.alt_text || "A censored Secret Tease photo";
    $("teaserCaption").textContent = p.caption || "Just a little peek ♡";
    const multi = tiles.length > 1;
    $("teaserPrevious").hidden = !multi;
    $("teaserNext").hidden = !multi;
    if (!viewer.open) viewer.showModal();
  }
  async function refresh() {
    if (!signedIn || !client) return;
    const run = ++generation;
    empty("Loading your secret photos…");
    status("");
    const btn = $("teaserRefresh");
    btn.disabled = true;
    try {
      const auth = await client.auth.getUser();
      if (auth.error || !auth.data?.user || auth.data.user.is_anonymous) throw new Error("Sign in to see the gallery");
      const result = await client.from("evie_teaser_photos")
        .select("id,storage_path,caption,alt_text")
        .eq("published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(72);
      if (result.error) throw result.error;
      if (!signedIn || run !== generation) return;
      const records = (result.data || []).filter(x => x.storage_path?.startsWith("teasers/"));
      if (!records.length) {
        tiles = [];
        empty("New censored photo teasers are coming soon ♡");
        return;
      }
      const paths = records.map(p => p.storage_path);
      const links = await client.storage.from(bucket).createSignedUrls(paths, 180);
      if (links.error) throw links.error;
      if (!signedIn || run !== generation) return;
      const urls = new Map((links.data || []).filter(x => x.signedUrl).map(x => [x.path, x.signedUrl]));
      tiles = records.map(p => ({ ...p, url: urls.get(p.storage_path) })).filter(p => p.url);
      if (!tiles.length) {
        empty("The teasers aren't available right now. Please refresh later.");
        return;
      }
      grid.replaceChildren();
      for (let index = 0; index < tiles.length; index++) {
        const item = tiles[index];
        const button = document.createElement("button");
        button.type = "button";
        button.className = "teaser-tile";
        button.setAttribute("aria-label", "Open photo " + (index + 1));
        const image = document.createElement("img");
        image.loading = "lazy";
        image.decoding = "async";
        image.src = item.url;
        image.alt = item.alt_text || "Censored photo preview";
        const info = document.createElement("span");
        info.textContent = item.caption || "A little peek ♡";
        button.append(image, info);
        button.addEventListener("click", () => showPhoto(index));
        grid.append(button);
      }
      status(tiles.length + " private photo" + (tiles.length === 1 ? "" : "s") + " for signed-in accounts.");
    } catch (error) {
      if (!signedIn || run !== generation) return;
      empty("Your photo previews couldn't load just yet.");
      status("Please refresh or sign in again.");
      console.warn("Teaser gallery unavailable:", error?.message || error);
    } finally {
      if (run === generation) btn.disabled = false;
    }
  }
  function activate(newClient, user) {
    if (!newClient || !user || user.is_anonymous) return clear();
    if (client === newClient && signedIn) return;
    client = newClient;
    signedIn = true;
    $("teaserSection").hidden = false;
    refresh();
  }
  $("teaserRefresh").addEventListener("click", refresh);
  $("teaserClose").addEventListener("click", () => viewer.close());
  $("teaserPrevious").addEventListener("click", () => showPhoto((currentIndex + tiles.length - 1) % tiles.length));
  $("teaserNext").addEventListener("click", () => showPhoto((currentIndex + 1) % tiles.length));
  viewer.addEventListener("click", event => { if (event.target === viewer) viewer.close(); });
  viewer.addEventListener("close", () => $("teaserLargePhoto").removeAttribute("src"));
  window.EvieTeaserGallery = Object.freeze({ activate, deactivate: clear, refresh });
})();