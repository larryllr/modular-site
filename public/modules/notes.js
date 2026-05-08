const storageKey = "cloudflare-modular-site.notes";

export default {
  id: "notes",
  name: "便签",
  icon: "NT",
  category: "tools",
  description: "保存本地草稿、灵感和待办片段。",
  defaultEnabled: true,
  mount() {
    const el = document.createElement("div");
    const value = localStorage.getItem(storageKey) || "";

    el.innerHTML = `
      <textarea class="textarea" aria-label="便签内容" placeholder="写点什么..." spellcheck="false">${value}</textarea>
      <div class="module-actions">
        <button class="button primary" type="button">保存</button>
        <button class="button" type="button">清空</button>
      </div>
    `;

    const textarea = el.querySelector("textarea");
    const [saveButton, clearButton] = el.querySelectorAll("button");

    saveButton.addEventListener("click", () => {
      localStorage.setItem(storageKey, textarea.value);
      saveButton.textContent = "已保存";
      window.setTimeout(() => {
        saveButton.textContent = "保存";
      }, 1000);
    });

    clearButton.addEventListener("click", () => {
      textarea.value = "";
      localStorage.removeItem(storageKey);
    });

    return el;
  }
};
