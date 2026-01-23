<script setup lang="ts">
import InputNumber from "primevue/inputnumber";
import ToggleSwitch from "primevue/toggleswitch";

import type { TorSettings } from "@/types";

const settings = defineModel<TorSettings>("settings", { required: true });
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="text-lg font-semibold">Configuration</div>

    <div class="flex items-center justify-between">
      <label for="auto-start" class="text-surface-300">
        Auto-start on launch
      </label>
      <ToggleSwitch id="auto-start" v-model="settings.autoStart" />
    </div>

    <div class="flex items-center justify-between">
      <label for="auto-update" class="text-surface-300">
        Check for updates automatically
      </label>
      <ToggleSwitch id="auto-update" v-model="settings.autoCheckUpdates" />
    </div>

    <div class="flex items-center justify-between">
      <label for="port" class="text-surface-300">SOCKS Port</label>
      <InputNumber
        id="port"
        v-model="settings.port"
        :min="1"
        :max="65535"
        :use-grouping="false"
        :pt="{
          input: { class: 'text-right' },
        }"
      />
    </div>
  </div>
</template>
