export default {
  id: "timer",
  name: "倒计时和秒表",
  icon: "TM",
  category: "tools",
  description: "适合学习、练习和活动计时。",
  defaultEnabled: false,
  mount() {
    const el = document.createElement("div");
    el.className = "tool-module timer-tool";
    let mode = "stopwatch";
    let seconds = 0;
    let running = false;
    let tick = 0;

    const display = document.createElement("div");
    display.className = "timer-display";
    const minutes = document.createElement("input");
    minutes.className = "input";
    minutes.type = "number";
    minutes.min = "0";
    minutes.placeholder = "倒计时分钟";
    const modeSelect = document.createElement("select");
    modeSelect.className = "input";
    modeSelect.append(new Option("秒表", "stopwatch"), new Option("倒计时", "countdown"));

    const format = (value) => {
      const h = Math.floor(value / 3600);
      const m = Math.floor((value % 3600) / 60);
      const s = value % 60;
      return [h, m, s].map((part) => String(part).padStart(2, "0")).join(":");
    };
    const render = () => {
      display.textContent = format(seconds);
    };
    const stop = () => {
      running = false;
      window.clearInterval(tick);
    };
    const start = () => {
      if (running) return;
      running = true;
      if (mode === "countdown" && seconds <= 0) {
        seconds = Math.max(0, Math.round(Number(minutes.value || 0) * 60));
      }
      tick = window.setInterval(() => {
        if (mode === "countdown") {
          seconds = Math.max(0, seconds - 1);
          if (seconds === 0) stop();
        } else {
          seconds += 1;
        }
        render();
      }, 1000);
    };

    modeSelect.addEventListener("change", () => {
      stop();
      mode = modeSelect.value;
      seconds = 0;
      render();
    });

    const startButton = document.createElement("button");
    startButton.className = "button primary";
    startButton.type = "button";
    startButton.textContent = "开始";
    startButton.addEventListener("click", start);
    const pauseButton = document.createElement("button");
    pauseButton.className = "button";
    pauseButton.type = "button";
    pauseButton.textContent = "暂停";
    pauseButton.addEventListener("click", stop);
    const resetButton = document.createElement("button");
    resetButton.className = "button";
    resetButton.type = "button";
    resetButton.textContent = "重置";
    resetButton.addEventListener("click", () => {
      stop();
      seconds = 0;
      render();
    });

    const row = document.createElement("div");
    row.className = "tool-grid";
    row.append(modeSelect, minutes);
    const actions = document.createElement("div");
    actions.className = "module-actions";
    actions.append(startButton, pauseButton, resetButton);
    el.append(row, display, actions);
    render();
    return el;
  }
};
