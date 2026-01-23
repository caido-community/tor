import { Classic } from "@caido/primevue";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import { createApp, defineComponent } from "vue";

import { Footer } from "./components/Footer";
import { Settings } from "./components/Settings";
import { SDKPlugin } from "./plugins/sdk";
import { useSettingsStore, useTorStore } from "./stores";
import "./styles/index.css";
import type { FrontendSDK } from "./types";

export const init = (sdk: FrontendSDK) => {
  const app = createApp(defineComponent({}));
  const pinia = createPinia();

  app.use(PrimeVue, {
    unstyled: true,
    pt: Classic,
  });
  app.use(pinia);
  app.use(SDKPlugin, sdk);

  const settingsStore = useSettingsStore(pinia);
  const torStore = useTorStore(pinia);

  settingsStore.initialize(sdk);
  torStore.initialize(sdk);

  sdk.settings.addToSlot("plugins-section", {
    type: "Custom",
    name: "Tor",
    definition: { component: Settings },
  });
  sdk.footer.addToSlot("footer-primary", {
    type: "Custom",
    definition: { component: Footer },
  });
};
