/*
 * SPDX-FileCopyrightText: 2024 Siemens AG
 *
 * SPDX-License-Identifier: MIT
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { themeSwitcher } from "@siemens/ix";
import "@siemens/ix/dist/siemens-ix/siemens-ix-core.css";
import "@siemens/ix/dist/siemens-ix/theme/classic-dark.css";
import "@siemens/ix/dist/siemens-ix/theme/classic-light.css";
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./index.css";
import "./styles/theme-mapping.css";

function optionalTheme() {
  if (import.meta.env.VITE_THEME) {
    const css = `${import.meta.env.BASE_URL}theme/dist/css/brand-theme.css`;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = css;
    document.head.appendChild(link);

    const loader = `${import.meta.env.BASE_URL}theme/dist/index.js`;
    const script = document.createElement("script");
    script.src = loader;
    script.type = "module";
    document.head.appendChild(script);

    themeSwitcher.setTheme("brand");
  }
}

optionalTheme();

const app = createApp(App);
app.use(router);
app.mount("#app");
