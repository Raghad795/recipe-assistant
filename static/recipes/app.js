(() => {
  const $ = (selector) => document.querySelector(selector);
  const form = $("#searchForm");
  const input = $("#ingredientInput");
  const threshold = $("#threshold");
  const grid = $("#recipeGrid");
  const welcome = $("#welcomeState");
  const empty = $("#emptyState");
  const loading = $("#loadingState");
  const dialog = $("#recipeDialog");
  const arabicNames = {
    "Chicken and Rice":"دجاج مع الأرز", "Chicken Pilaf":"كبسة دجاج مبسطة", "Tomato Garlic Pasta":"معكرونة بالطماطم والثوم",
    "Vegetable Omelet":"عجة بالخضار", "Red Lentil Soup":"شوربة العدس الأحمر", "Greek Salad":"سلطة يونانية",
    "Vegetable Fried Rice":"أرز مقلي بالخضار", "Shakshuka":"شكشوكة", "Chickpea Curry":"كاري الحمص",
    "Creamy Potato Soup":"شوربة البطاطس الكريمية", "Tuna Salad":"سلطة التونة", "Beef and Broccoli Stir-Fry":"لحم مع البروكلي",
    "Classic Pancakes":"بان كيك كلاسيكي", "Roasted Vegetables":"خضار مشوية", "Spinach Cream Pasta":"معكرونة بالكريمة والسبانخ",
    "Tomato Basil Soup":"شوربة الطماطم والريحان", "Grilled Chicken Salad":"سلطة الدجاج المشوي", "Black Bean Chili":"يخنة الفاصوليا السوداء",
    "Egg Fried Noodles":"نودلز بالبيض", "Cucumber Yogurt Salad":"سلطة الخيار باللبن",
  };
  const ingredientNames = {
    chicken:"دجاج", rice:"أرز", onion:"بصل", tomato:"طماطم", garlic:"ثوم", "olive oil":"زيت زيتون", basil:"ريحان",
    egg:"بيض", "bell pepper":"فلفل رومي", milk:"حليب", butter:"زبدة", "red lentils":"عدس أحمر", carrot:"جزر",
    cumin:"كمون", "vegetable stock":"مرق خضار", cucumber:"خيار", "feta cheese":"جبنة فيتا", olives:"زيتون",
    "red onion":"بصل أحمر", peas:"بازلاء", "soy sauce":"صلصة الصويا", "spring onion":"بصل أخضر", paprika:"بابريكا",
    chickpeas:"حمص", "coconut milk":"حليب جوز الهند", "curry powder":"بهارات كاري", potato:"بطاطس", parsley:"بقدونس",
    tuna:"تونة", lettuce:"خس", lemon:"ليمون", beef:"لحم بقري", broccoli:"بروكلي", ginger:"زنجبيل", flour:"دقيق",
    "baking powder":"بايكنج باودر", sugar:"سكر", zucchini:"كوسا", thyme:"زعتر", pasta:"معكرونة", spinach:"سبانخ",
    cream:"كريمة", parmesan:"بارميزان", "black beans":"فاصوليا سوداء", corn:"ذرة", "chili powder":"فلفل حار",
    noodles:"نودلز", "sesame oil":"زيت سمسم", yogurt:"لبن", mint:"نعناع", stock:"مرق",
  };
  const aliases = {
    "دجاج":"chicken", "أرز":"rice", "رز":"rice", "بصل":"onion", "طماطم":"tomato", "بندورة":"tomato", "ثوم":"garlic",
    "زيت زيتون":"olive oil", "بيض":"egg", "بيضة":"egg", "فلفل رومي":"bell pepper", "فلفل حلو":"bell pepper", "حليب":"milk",
    "زبدة":"butter", "عدس":"red lentils", "عدس أحمر":"red lentils", "جزر":"carrot", "كمون":"cumin", "مرق خضار":"vegetable stock",
    "خيار":"cucumber", "فيتا":"feta cheese", "جبنة فيتا":"feta cheese", "زيتون":"olives", "بصل أخضر":"spring onion",
    "بازلاء":"peas", "صلصة الصويا":"soy sauce", "صويا":"soy sauce", "بابريكا":"paprika", "حمص":"chickpeas", "حليب جوز الهند":"coconut milk",
    "كاري":"curry powder", "بطاطس":"potato", "بطاطا":"potato", "بقدونس":"parsley", "تونة":"tuna", "خس":"lettuce", "ليمون":"lemon",
    "لحم":"beef", "لحم بقري":"beef", "بروكلي":"broccoli", "زنجبيل":"ginger", "دقيق":"flour", "طحين":"flour", "سكر":"sugar",
    "كوسا":"zucchini", "زعتر":"thyme", "معكرونة":"pasta", "مكرونة":"pasta", "سبانخ":"spinach", "كريمة":"cream", "ذرة":"corn",
    "نودلز":"noodles", "لبن":"yogurt", "زبادي":"yogurt", "نعناع":"mint", "فاصوليا":"black beans", "فاصوليا سوداء":"black beans",
  };
  const emojis = {"chicken-rice":"🍗", "chicken-pilaf":"🍛", "tomato-pasta":"🍝", "vegetable-omelet":"🍳", "lentil-soup":"🍲", "greek-salad":"🥗", "fried-rice":"🍚", shakshuka:"🍳", "chickpea-curry":"🍛", "potato-soup":"🥣", "tuna-salad":"🥗", "beef-stir-fry":"🥘", pancakes:"🥞", "roasted-vegetables":"🥕", "spinach-pasta":"🍝", "tomato-soup":"🍅", "chicken-salad":"🥗", "bean-chili":"🫘", "egg-fried-noodles":"🍜", "cucumber-yogurt":"🥒"};
  let lastResults = [];
  let onlySaved = false;
  let saved = new Set(JSON.parse(localStorage.getItem("mazaq-saved") || "[]"));
  let toastTimer;

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[char]));
  }
  function translateName(name) { return arabicNames[name] || name; }
  function translateIngredient(name) { return ingredientNames[name.toLowerCase()] || name; }
  function parseIngredients(raw) {
    const values = raw.split(/[,،\n؛;]/).map((item) => item.trim()).filter(Boolean);
    return [...new Set(values.map((value) => aliases[value.toLowerCase()] || value.toLowerCase()))];
  }
  function showToast(message) {
    const toast = $("#toast"); toast.textContent = message; toast.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }
  function updateSavedCount() { $("#savedCount").textContent = saved.size; }
  function cardMarkup(item, index) {
    const recipe = item.recipe;
    const matched = item.matched_ingredients || [];
    const missing = item.missing_ingredients || [];
    const tones = ["", "tone-peach", "tone-yellow", "tone-lilac", "tone-blue"];
    const ingredientTags = [
      ...matched.slice(0, 3).map((name) => `<span class="ingredient-tag">${escapeHTML(translateIngredient(name))}</span>`),
      ...missing.slice(0, 2).map((name) => `<span class="ingredient-tag missing">ناقص: ${escapeHTML(translateIngredient(name))}</span>`),
    ].join("");
    return `<article class="recipe-card" style="animation-delay:${Math.min(index * 45, 300)}ms">
      <div class="card-image ${tones[index % tones.length]}"><span class="match-badge">${item.match_percentage}% تطابق</span><button class="card-heart ${saved.has(recipe.id) ? "saved" : ""}" type="button" data-save="${escapeHTML(recipe.id)}" aria-label="${saved.has(recipe.id) ? "إزالة من" : "إضافة إلى"} المحفوظات">${saved.has(recipe.id) ? "♥" : "♡"}</button><span class="card-emoji">${emojis[recipe.id] || "🍽️"}</span></div>
      <div class="card-body"><div class="card-title-row"><h3 class="card-title">${escapeHTML(translateName(recipe.name))}</h3><span class="difficulty">${recipe.difficulty === "easy" ? "سهل" : recipe.difficulty === "medium" ? "متوسط" : "متقدم"}</span></div><p class="card-desc">${escapeHTML(recipe.description)}</p><div class="match-track"><div class="match-fill" style="width:${item.match_percentage}%"></div></div><div class="match-label"><span>المكونات المتوفرة ${matched.length}</span><span>المجموع ${matched.length + missing.length}</span></div><div class="ingredient-preview">${ingredientTags || `<span class="ingredient-tag">كل المكونات متوفرة!</span>`}</div><div class="card-footer"><span class="recipe-time">◷ ${recipe.preparation_time_minutes + recipe.cooking_time_minutes} دقيقة</span><button class="detail-link" type="button" data-detail="${escapeHTML(recipe.id)}">شوفي الوصفة ←</button></div></div>
    </article>`;
  }
  function renderResults() {
    const visible = onlySaved ? lastResults.filter((item) => saved.has(item.recipe.id)) : lastResults;
    grid.innerHTML = visible.map(cardMarkup).join("");
    welcome.classList.add("hidden");
    empty.classList.toggle("hidden", visible.length > 0);
    grid.classList.toggle("hidden", visible.length === 0);
    $("#resultsMeta").textContent = visible.length ? `${visible.length} وصفة مقترحة` : "";
    $("#resultsTitle").textContent = onlySaved ? "وصفاتك المحفوظة" : "وصفات تناسب يومك";
    if (onlySaved && !visible.length && lastResults.length) {
      empty.querySelector("h3").textContent = "ما حفظت وصفات من هذي النتائج";
      empty.querySelector("p").textContent = "اضغط على القلب في أي وصفة عشان تحفظها هنا.";
      $("#lowerThreshold").classList.add("hidden");
    } else {
      empty.querySelector("h3").textContent = "ما لقينا وصفة مناسبة للحين";
      empty.querySelector("p").textContent = "جرّب تضيف مكونات أكثر، أو قلّل نسبة التطابق المطلوبة.";
      $("#lowerThreshold").classList.remove("hidden");
    }
  }
  async function search() {
    const ingredients = parseIngredients(input.value);
    if (!ingredients.length) { input.focus(); showToast("اكتب مكوّناً واحداً على الأقل"); return; }
    onlySaved = false;
    loading.classList.remove("hidden"); welcome.classList.add("hidden"); empty.classList.add("hidden"); grid.classList.add("hidden");
    try {
      const response = await fetch("/api/recipes/search/", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ingredients, min_match_percentage:Number(threshold.value), limit:20})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "تعذّر البحث عن الوصفات.");
      lastResults = data.results || [];
      $("#resultsMeta").textContent = data.count ? `${data.count} وصفة مقترحة` : "";
      renderResults();
      if (!lastResults.length) showToast("جرّب مكونات أكثر أو نسبة تطابق أقل");
    } catch (error) { showToast(error.message || "تعذّر الاتصال بالخادم"); welcome.classList.remove("hidden"); }
    finally { loading.classList.add("hidden"); }
  }
  function toggleSaved(recipeId) {
    if (saved.has(recipeId)) saved.delete(recipeId); else saved.add(recipeId);
    localStorage.setItem("mazaq-saved", JSON.stringify([...saved])); updateSavedCount();
    if (lastResults.length) renderResults();
    showToast(saved.has(recipeId) ? "انحفظت الوصفة في قائمتك" : "انحذفت من الوصفات المحفوظة");
  }
  async function showDetails(recipeId) {
    const button = document.querySelector(`[data-detail="${CSS.escape(recipeId)}"]`);
    if (button) button.disabled = true;
    try {
      const response = await fetch(`/api/recipes/${encodeURIComponent(recipeId)}/`);
      const recipe = await response.json();
      if (!response.ok) throw new Error(recipe.message || "تعذّر تحميل تفاصيل الوصفة.");
      const matched = lastResults.find((item) => item.recipe.id === recipeId);
      const matchedSet = new Set(matched ? matched.matched_ingredients.map((name) => name.toLowerCase()) : []);
      const ingredients = recipe.ingredients.map((item) => {
        const hasIt = !matched || item.optional || matchedSet.has(item.name.toLowerCase());
        const quantity = `${item.quantity} ${item.unit}`;
        return `<li class="${hasIt ? "" : "is-missing"}">${escapeHTML(translateIngredient(item.name))}<small>${escapeHTML(quantity)}${item.optional ? " · اختياري" : hasIt ? " · متوفر" : " · تحتاجينه"}</small></li>`;
      }).join("");
      const steps = recipe.instructions.map((step) => `<li>${escapeHTML(step)}</li>`).join("");
      $("#dialogContent").innerHTML = `<div class="detail-hero">${emojis[recipe.id] || "🍽️"}</div><div class="detail-content"><span class="section-kicker">وصفة منزلية</span><h2>${escapeHTML(translateName(recipe.name))}</h2><p class="detail-description">${escapeHTML(recipe.description)}</p><div class="detail-stats"><span class="detail-stat">◷ تحضير ${recipe.preparation_time_minutes} د</span><span class="detail-stat">♨ طبخ ${recipe.cooking_time_minutes} د</span><span class="detail-stat">♧ تكفي ${recipe.servings} أشخاص</span><span class="detail-stat">${recipe.difficulty === "easy" ? "سهلة" : recipe.difficulty === "medium" ? "متوسطة" : "متقدمة"}</span></div><h3>المكونات</h3><ul class="detail-ingredients">${ingredients}</ul><h3>طريقة التحضير</h3><ol class="detail-steps">${steps}</ol></div>`;
      dialog.showModal();
    } catch (error) { showToast(error.message || "تعذّر تحميل الوصفة"); }
    finally { if (button) button.disabled = false; }
  }

  form.addEventListener("submit", (event) => { event.preventDefault(); search(); });
  threshold.addEventListener("input", () => { $("#thresholdValue").textContent = `${threshold.value}%`; });
  document.querySelectorAll(".quick-chip").forEach((button) => button.addEventListener("click", () => { input.value = button.dataset.value; search(); }));
  grid.addEventListener("click", (event) => {
    const saveButton = event.target.closest("[data-save]");
    const detailButton = event.target.closest("[data-detail]");
    if (saveButton) toggleSaved(saveButton.dataset.save);
    if (detailButton) showDetails(detailButton.dataset.detail);
  });
  $("#savedToggle").addEventListener("click", () => {
    if (!lastResults.length) { showToast("ابحث عن وصفات أولاً لتشوف المحفوظة بينها"); return; }
    onlySaved = !onlySaved; renderResults();
    document.querySelector("#results").scrollIntoView({behavior:"smooth", block:"start"});
  });
  $("#lowerThreshold").addEventListener("click", () => { threshold.value = Math.max(0, Number(threshold.value) - 15); $("#thresholdValue").textContent = `${threshold.value}%`; search(); });
  $("#dialogClose").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  updateSavedCount();
})();
