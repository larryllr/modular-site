export default {
  id: "text-tools",
  name: "文本工具",
  icon: "TT",
  category: "tools",
  description: "统计字数、清理空行、大小写转换和复制文本。",
  defaultEnabled: false,
  mount() {
    const el = document.createElement("div");
    el.className = "tool-module";
    const textarea = document.createElement("textarea");
    textarea.className = "textarea";
    textarea.placeholder = "粘贴或输入文本...";
    const stats = document.createElement("p");
    stats.className = "form-hint";

    const update = () => {
      const text = textarea.value;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      stats.textContent = `字符 ${text.length} · 非空字符 ${text.replace(/\s/g, "").length} · 词/片段 ${words} · 行 ${text ? text.split(/\r?\n/).length : 0}`;
    };
    const transform = (kind) => {
      if (kind === "trim-lines") {
        textarea.value = textarea.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).join("\n");
      } else if (kind === "upper") {
        textarea.value = textarea.value.toUpperCase();
      } else if (kind === "lower") {
        textarea.value = textarea.value.toLowerCase();
      } else if (kind === "spaces") {
        textarea.value = textarea.value.replace(/[ \t]+/g, " ");
      }
      update();
    };

    textarea.addEventListener("input", update);
    const actions = document.createElement("div");
    actions.className = "module-actions";
    for (const [label, kind] of [
      ["清理空行", "trim-lines"],
      ["转大写", "upper"],
      ["转小写", "lower"],
      ["压缩空格", "spaces"]
    ]) {
      const button = document.createElement("button");
      button.className = "button";
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", () => transform(kind));
      actions.append(button);
    }
    const copy = document.createElement("button");
    copy.className = "button primary";
    copy.type = "button";
    copy.textContent = "复制";
    copy.addEventListener("click", async () => {
      await navigator.clipboard?.writeText(textarea.value);
      copy.textContent = "已复制";
      window.setTimeout(() => {
        copy.textContent = "复制";
      }, 1000);
    });
    actions.append(copy);
    el.append(textarea, actions, stats);
    update();
    return el;
  }
};
