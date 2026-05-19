const converters = {
  length: {
    label: "长度",
    units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, inch: 0.0254, ft: 0.3048 }
  },
  weight: {
    label: "重量",
    units: { g: 0.001, kg: 1, t: 1000, lb: 0.45359237, oz: 0.0283495231 }
  },
  data: {
    label: "数据",
    units: { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 }
  }
};

export default {
  id: "unit-converter",
  name: "单位换算",
  icon: "UC",
  category: "tools",
  description: "长度、重量和数据容量快速换算。",
  defaultEnabled: false,
  mount() {
    const el = document.createElement("div");
    el.className = "tool-module";
    const type = document.createElement("select");
    const from = document.createElement("select");
    const to = document.createElement("select");
    const input = document.createElement("input");
    const output = document.createElement("input");

    for (const [key, config] of Object.entries(converters)) {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = config.label;
      type.append(option);
    }

    for (const control of [type, from, to, input, output]) {
      control.className = "input";
    }
    input.type = "number";
    input.placeholder = "输入数值";
    output.readOnly = true;

    const fillUnits = () => {
      const units = Object.keys(converters[type.value].units);
      from.replaceChildren(...units.map((unit) => new Option(unit, unit)));
      to.replaceChildren(...units.map((unit) => new Option(unit, unit)));
      to.selectedIndex = Math.min(1, units.length - 1);
      convert();
    };

    const convert = () => {
      const amount = Number(input.value);
      if (!Number.isFinite(amount)) {
        output.value = "";
        return;
      }
      const units = converters[type.value].units;
      const base = amount * units[from.value];
      output.value = String(Math.round((base / units[to.value]) * 1e8) / 1e8);
    };

    type.addEventListener("change", fillUnits);
    from.addEventListener("change", convert);
    to.addEventListener("change", convert);
    input.addEventListener("input", convert);

    const row = document.createElement("div");
    row.className = "tool-grid";
    row.append(type, input, from, output, to);
    el.append(row);
    fillUnits();
    return el;
  }
};
