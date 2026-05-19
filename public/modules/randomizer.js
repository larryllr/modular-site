export default {
  id: "randomizer",
  name: "随机抽取",
  icon: "RD",
  category: "tools",
  description: "从名单里随机抽人、抽选项或生成随机数。",
  defaultEnabled: false,
  mount() {
    const el = document.createElement("div");
    el.className = "tool-module";
    const textarea = document.createElement("textarea");
    textarea.className = "textarea";
    textarea.placeholder = "每行一个选项，例如名字、任务、地点...";
    const count = document.createElement("input");
    count.className = "input";
    count.type = "number";
    count.min = "1";
    count.value = "1";
    const result = document.createElement("div");
    result.className = "tool-result";

    const pick = () => {
      const items = textarea.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
      const amount = Math.max(1, Math.min(items.length || 1, Number(count.value) || 1));
      const shuffled = [...items].sort(() => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 - 0.5);
      result.textContent = shuffled.length ? shuffled.slice(0, amount).join("、") : "先输入候选项。";
    };

    const randomNumber = () => {
      const value = crypto.getRandomValues(new Uint32Array(1))[0] % 10000;
      result.textContent = `随机数：${value}`;
    };

    const row = document.createElement("div");
    row.className = "tool-grid";
    row.append(count);
    const actions = document.createElement("div");
    actions.className = "module-actions";
    const pickButton = document.createElement("button");
    pickButton.className = "button primary";
    pickButton.type = "button";
    pickButton.textContent = "随机抽取";
    pickButton.addEventListener("click", pick);
    const numberButton = document.createElement("button");
    numberButton.className = "button";
    numberButton.type = "button";
    numberButton.textContent = "随机数";
    numberButton.addEventListener("click", randomNumber);
    actions.append(pickButton, numberButton);
    el.append(textarea, row, actions, result);
    return el;
  }
};
