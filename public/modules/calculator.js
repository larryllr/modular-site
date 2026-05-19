export default {
  id: "calculator",
  name: "计算器",
  icon: "CA",
  category: "tools",
  description: "基础四则运算和常用百分比计算。",
  defaultEnabled: false,
  mount() {
    const el = document.createElement("div");
    el.className = "tool-module calculator-tool";

    const display = document.createElement("input");
    display.className = "input tool-display";
    display.value = "0";
    display.inputMode = "decimal";
    display.ariaLabel = "计算表达式";

    const result = document.createElement("p");
    result.className = "form-hint";
    result.textContent = "输入表达式或点击按钮计算。";

    const keys = [
      "7", "8", "9", "/", "C",
      "4", "5", "6", "*", "%",
      "1", "2", "3", "-", "√",
      "0", ".", "(", ")", "+",
      "←", "=", "×2", "/2", "复制"
    ];
    const pad = document.createElement("div");
    pad.className = "tool-keypad";

    const safeEval = () => {
      try {
        const expression = display.value.replace(/×/g, "*").replace(/÷/g, "/");
        if (!/^[\d+\-*/().%\s]+$/.test(expression)) {
          throw new Error("只能计算数字表达式。");
        }

        const value = Function(`"use strict"; return (${expression})`)();
        if (!Number.isFinite(value)) {
          throw new Error("结果不是有效数字。");
        }

        display.value = String(Math.round(value * 1e10) / 1e10);
        result.textContent = "已计算。";
      } catch (error) {
        result.textContent = error.message;
      }
    };

    for (const key of keys) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = key === "=" ? "button primary" : "button";
      btn.textContent = key;
      btn.addEventListener("click", async () => {
        if (key === "C") {
          display.value = "0";
        } else if (key === "←") {
          display.value = display.value.slice(0, -1) || "0";
        } else if (key === "=") {
          safeEval();
        } else if (key === "√") {
          display.value = String(Math.sqrt(Number(display.value) || 0));
        } else if (key === "×2") {
          display.value = String((Number(display.value) || 0) * 2);
        } else if (key === "/2") {
          display.value = String((Number(display.value) || 0) / 2);
        } else if (key === "复制") {
          await navigator.clipboard?.writeText(display.value);
          result.textContent = "已复制结果。";
        } else {
          display.value = display.value === "0" ? key : `${display.value}${key}`;
        }
      });
      pad.append(btn);
    }

    display.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        safeEval();
      }
    });

    el.append(display, pad, result);
    return el;
  }
};
